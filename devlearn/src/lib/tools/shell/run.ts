// 模擬のシェル。1 行を読み、展開し、パイプ・リダイレクト・つなぎの通りに命令を打つ。
// 命令は道具ごとに表で渡す（shell・git・docker で、要る物だけを入れる）。
import { isDir, parentOf, readFile, resolvePath, stat, writeFile, type Fs } from '../fs.ts';
import type { Result, Tool } from '../session.ts';
import { parseLine, type Command, type Word } from './parse.ts';

// 作り物の時計：場面の始まり 2026-11-10T09:00:00+09:00。打った行ごとに 1 分進む（docs/tools.md 1 章）
export const CLOCK_BASE = 1794268800;
export const TZ_OFFSET = 9 * 3600;

export type ShellState<X> = {
	fs: Fs;
	cwd: string;
	home: string;
	user: string;
	vars: Readonly<Record<string, string>>;
	exported: readonly string[];
	lastCode: number;
	tick: number; // 打った行の数。時計はここから決まる
	ext: X; // 道具ごとの状態（git のリポジトリなど）
};

export type Io = {
	stdin: string;
	tty: boolean; // 標準出力が端末か（ls の並べ方などが変わる）
	now: number; // UNIX 時刻（作り物の時計）
};

export type CmdResult<X> = { state: ShellState<X>; out: string; err: string; code: number };
export type Cmd<X> = (state: ShellState<X>, args: string[], io: Io) => CmdResult<X>;
export type Commands<X> = Readonly<Record<string, Cmd<X>>>;

export const ok = <X>(state: ShellState<X>, out = ''): CmdResult<X> => ({
	state,
	out,
	err: '',
	code: 0
});
export const fail = <X>(state: ShellState<X>, err: string, code = 1, out = ''): CmdResult<X> => ({
	state,
	out,
	err,
	code
});

export const nowOf = (tick: number) => CLOCK_BASE + 60 * tick;
export const pathOf = <X>(s: ShellState<X>, p: string) => resolvePath(s.cwd, p, s.home);

function expand<X>(w: Word, s: ShellState<X>): string {
	return w
		.map((seg) => {
			if ('lit' in seg) return seg.lit;
			if (seg.var === '?') return String(s.lastCode);
			return s.vars[seg.var] ?? '';
		})
		.join('');
}

// 1 つの命令を打つ（リダイレクト込み）
function runCommand<X>(
	commands: Commands<X>,
	state: ShellState<X>,
	c: Command,
	stdin: string,
	piped: boolean,
	now: number
): CmdResult<X> {
	let s = state;
	const words = c.words.map((w) => expand(w, s));
	let input = stdin;
	type Sink = { path: string; append: boolean };
	let outSink: Sink | null = null;
	let errSink: Sink | null = null;
	let errToOut = false;
	// リダイレクトは命令より先に開く（> は中身を空にして作る）
	for (const r of c.redirects) {
		if (r.op === '>&') {
			errToOut = true;
			continue;
		}
		const name = expand(r.target, s);
		const path = pathOf(s, name);
		if (r.op === '<') {
			const data = readFile(s.fs, path);
			if (data === null) {
				const why = isDir(s.fs, path) ? 'Is a directory' : 'No such file or directory';
				return fail(s, `bash: ${name}: ${why}\n`);
			}
			input = data;
			continue;
		}
		if (isDir(s.fs, path)) return fail(s, `bash: ${name}: Is a directory\n`);
		if (!isDir(s.fs, parentOf(path))) return fail(s, `bash: ${name}: No such file or directory\n`);
		if (r.op === '>' || !stat(s.fs, path)) s = { ...s, fs: writeFile(s.fs, path, '', now) };
		const sink = { path, append: r.op === '>>' };
		if (r.fd === 2) errSink = sink;
		else outSink = sink;
	}

	let res: CmdResult<X>;
	if (words.length === 0) {
		res = ok(s);
	} else {
		const assign = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s.exec(words[0]);
		if (assign && words.length === 1) {
			res = ok({ ...s, vars: { ...s.vars, [assign[1]]: assign[2] } });
		} else {
			const cmd = commands[words[0]];
			res = cmd
				? cmd(s, words.slice(1), { stdin: input, tty: !piped && outSink === null, now })
				: fail(s, `bash: ${words[0]}: command not found\n`, 127);
		}
	}

	let { out, err } = res;
	let fs = res.state.fs;
	if (errToOut) {
		out += err;
		err = '';
	}
	const put = (sink: Sink, data: string) => {
		const before = sink.append ? (readFile(fs, sink.path) ?? '') : '';
		fs = writeFile(fs, sink.path, before + data, now);
	};
	if (outSink) {
		put(outSink, out);
		out = '';
	}
	if (errSink) {
		put(errSink, err);
		err = '';
	}
	return { ...res, state: { ...res.state, fs }, out, err };
}

export function runLine<X>(
	commands: Commands<X>,
	state: ShellState<X>,
	line: string
): CmdResult<X> {
	const now = nowOf(state.tick);
	const tick = { ...state, tick: state.tick + 1 };
	const parsed = parseLine(line);
	if ('error' in parsed) return fail({ ...tick, lastCode: 2 }, `bash: ${parsed.error}\n`, 2);
	let s: ShellState<X> = tick;
	let out = '';
	let err = '';
	let code = s.lastCode;
	for (const item of parsed.items) {
		if (item.op === '&&' && code !== 0) continue;
		if (item.op === '||' && code === 0) continue;
		let stdin = '';
		const cmds = item.pipeline.commands;
		cmds.forEach((c, i) => {
			const last = i === cmds.length - 1;
			const r = runCommand(commands, s, c, stdin, !last, now);
			s = r.state;
			err += r.err;
			if (last) out += r.out;
			else stdin = r.out;
			code = r.code;
		});
		s = { ...s, lastCode: code };
	}
	return { state: s, out, err, code };
}

export function shellTool<X>(commands: Commands<X>): Tool<ShellState<X>> {
	return {
		run(state, line): Result & { state: ShellState<X> } {
			return runLine(commands, state, line);
		}
	};
}
