// 模擬のシェル。1 行（または台本）を読み、展開し、パイプ・リダイレクト・つなぎ・if の通りに命令を打つ。
// 命令は道具ごとに表で渡す（shell・git・docker で、要る物だけを入れる）。
// 命令の探し方は本物の bash と同じ：組み込み → PATH の前から（実行できるファイル、または /usr/bin の命令）。
import {
	isDir,
	ownerOf,
	parentOf,
	readFile,
	resolvePath,
	stat,
	writeFile,
	type Fs
} from '../fs.ts';
import type { Result, Tool } from '../session.ts';
import type { Command, ListItem, Word } from './parse.ts';
import type { SysState } from './procs.ts';
import type { NetState } from './networld.ts';
import { parseScript, type Node } from './script.ts';

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
	net?: NetState; // 作り物の網（網の実戦だけ。tools-real/worlds/net.json）
	sys?: SysState; // 動いているプロセス・世界の利用者・サービス（tools-real/worlds/procs.json・service.json）
};

export type Io<X = unknown> = {
	stdin: string;
	tty: boolean; // 標準出力が端末か（ls の並べ方などが変わる）
	now: number; // UNIX 時刻（作り物の時計）
	prefix: string; // シェルが出す言い方の頭（端末では「bash: 」、台本では「名前: line N: 」）
	interactive: boolean; // 端末で打った行か（台本・bash -c ではない）
	commands: Commands<X>;
	builtin?: boolean; // シェルの組み込みとして呼ばれたか（kill は組み込みと /usr/bin/kill で言い方が違う）
};

export type CmdResult<X> = {
	state: ShellState<X>;
	out: string;
	err: string;
	code: number;
	exit?: boolean; // exit を打った（台本を終える）
};
export type Cmd<X> = (state: ShellState<X>, args: string[], io: Io<X>) => CmdResult<X>;
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

// シェルが自分で持つ命令（PATH を探さない）。type で見える組み込みのうち、模擬に要る物
export const BUILTINS: ReadonlySet<string> = new Set([
	'cd',
	'pwd',
	'echo',
	'printf',
	'export',
	'unset',
	'exit',
	'true',
	'false',
	'[',
	'test',
	'kill'
]);
// 組み込みにしか無い物（/usr/bin に同じ名前の物が無い）
export const BUILTIN_ONLY: ReadonlySet<string> = new Set(['cd', 'export', 'unset', 'exit']);
// 模擬の命令が置いてある場所（/bin は /usr/bin を指す）
export const SYSTEM_DIRS = ['/usr/bin', '/bin'];
export const NULL_DEVICE = '/dev/null';

// 利用者が入っている組（模擬の世界の利用者は learner と root だけ。learner は sudo の組にいる）
export const GROUPS: Readonly<Record<string, readonly string[]>> = {
	learner: ['learner', 'sudo'],
	root: ['root']
};

// 持ち主・組・他の人のどれとして見るかで、権限の 3 桁のどれを使うかが決まる。root は読み書きを全てできる
function allowed(fs: Fs, path: string, user: string, bit: 4 | 2 | 1): boolean {
	const n = stat(fs, path);
	if (!n) return false;
	if (user === 'root') return bit !== 1 || (n.mode & 0o111) !== 0 || n.kind === 'dir';
	const owner = ownerOf(fs, path);
	const shift = owner === user ? 6 : (GROUPS[user] ?? []).includes(owner) ? 3 : 0;
	return ((n.mode >> shift) & bit) !== 0;
}
export const canRead = (fs: Fs, path: string, user = 'learner') => allowed(fs, path, user, 4);
export const canWrite = (fs: Fs, path: string, user = 'learner') => allowed(fs, path, user, 2);
export const canExec = (fs: Fs, path: string, user = 'learner') => allowed(fs, path, user, 1);

export function pathDirs<X>(s: ShellState<X>): string[] {
	return (s.vars.PATH ?? '').split(':').map((d) => (d === '' ? s.cwd : d));
}

// 名前が PATH のどこで見つかるか。all なら全て
export type Found = { kind: 'file'; path: string } | { kind: 'system'; path: string; name: string };
export function lookPath<X>(
	s: ShellState<X>,
	name: string,
	commands: Commands<X>,
	all = false
): Found[] {
	const out: Found[] = [];
	for (const dir of pathDirs(s)) {
		const p = `${dir === '/' ? '' : dir}/${name}`;
		const n = stat(s.fs, p);
		if (n?.kind === 'file' && canExec(s.fs, p, s.user)) out.push({ kind: 'file', path: p });
		else if (!n && SYSTEM_DIRS.includes(dir) && commands[name] && !BUILTIN_ONLY.has(name))
			out.push({ kind: 'system', path: p, name });
		if (out.length > 0 && !all) break;
	}
	return out;
}

function systemName<X>(path: string, commands: Commands<X>): string | null {
	const dir = parentOf(path);
	const name = path.slice(dir.length + 1);
	return SYSTEM_DIRS.includes(dir) && commands[name] && !BUILTIN_ONLY.has(name) ? name : null;
}

function varValue<X>(name: string, s: ShellState<X>): string {
	if (name === '?') return String(s.lastCode);
	if (name === '#') return s.vars['#'] ?? '0';
	if (name === '0') return s.vars['0'] ?? 'bash';
	return s.vars[name] ?? '';
}

// 語を展開する。$( 命令 ) は子のシェルで打ち、標準出力の末尾の改行を落として入れる（ファイルの変化は残り、変数は残らない）。
// 引用符の外の $( ) の答えは空白で語に分ける。答えが空で語がそれだけなら、語は消える
type Expanded<X> = { fields: string[]; state: ShellState<X>; err: string };
function expandWord<X>(run: Run<X>, w: Word, state: ShellState<X>): Expanded<X> {
	let s = state;
	let err = '';
	const fields: string[] = [];
	let cur = '';
	let has = false;
	const assignment = w.length > 0 && 'lit' in w[0] && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0].lit);
	for (const seg of w) {
		if ('lit' in seg) {
			cur += seg.lit;
			has = true;
		} else if ('var' in seg) {
			cur += varValue(seg.var, s);
			has = true;
		} else {
			const r = runText({ ...run, where: run.where }, { ...s, lastCode: s.lastCode }, seg.sub);
			s = {
				...s,
				fs: r.state.fs,
				ext: r.state.ext,
				net: r.state.net,
				sys: r.state.sys,
				lastCode: r.code
			};
			err += r.err;
			const text = r.out.replace(/\n+$/, '');
			if (seg.quoted || assignment) {
				cur += text;
				has = true;
				continue;
			}
			const parts = text.split(/[ \t\n]+/);
			if (text.trim() === '') continue;
			if (/^[ \t\n]/.test(text)) parts.shift();
			parts.forEach((p, i) => {
				if (i > 0) {
					if (has) fields.push(cur);
					cur = '';
					has = false;
				}
				if (p !== '') {
					cur += p;
					has = true;
				}
			});
			if (/[ \t\n]$/.test(text)) {
				if (has) fields.push(cur);
				cur = '';
				has = false;
			}
		}
	}
	if (has) fields.push(cur);
	return { fields, state: s, err };
}

function expand<X>(run: Run<X>, w: Word, s: ShellState<X>): string {
	return expandWord(run, w, s).fields.join(' ');
}

// 子の bash に渡る変数（export した物）
export function exportedVars<X>(s: ShellState<X>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const k of Object.keys(s.vars)) if (s.exported.includes(k)) out[k] = s.vars[k];
	return out;
}

// どこで動いているか。端末・bash -c・台本ファイル
export type Where = { kind: 'tty' } | { kind: 'c' } | { kind: 'file'; name: string };
const prefixAt = (w: Where, line: number) =>
	w.kind === 'tty'
		? 'bash: '
		: w.kind === 'c'
			? `bash: line ${line}: `
			: `${w.name}: line ${line}: `;

type Run<X> = { commands: Commands<X>; now: number; where: Where };

// 台本ファイル・bash -c の中身を、子の bash として動かす。変数と今いる場所は親に戻らない
export function runChild<X>(
	commands: Commands<X>,
	state: ShellState<X>,
	text: string,
	where: Where,
	args: string[],
	now: number,
	extraEnv: Record<string, string> = {}
): CmdResult<X> {
	const env = { ...exportedVars(state), ...extraEnv };
	const positional: Record<string, string> = { '#': String(args.length - 1) };
	args.forEach((a, i) => (positional[String(i)] = a));
	const child: ShellState<X> = {
		...state,
		vars: { ...env, ...positional },
		exported: Object.keys(env),
		lastCode: 0
	};
	const r = runText({ commands, now, where }, child, text);
	return {
		state: { ...state, fs: r.state.fs, ext: r.state.ext, net: r.state.net, sys: r.state.sys },
		out: r.out,
		err: r.err,
		code: r.code
	};
}

// 実行できるファイルを動かす（#! の bash として）
function runFile<X>(
	run: Run<X>,
	s: ShellState<X>,
	path: string,
	shown: string,
	args: string[],
	extraEnv: Record<string, string>
): CmdResult<X> {
	const text = readFile(s.fs, path) ?? '';
	const first = text.split('\n')[0];
	if (
		first.startsWith('#!') &&
		!/^#!\s*(\/usr)?\/bin\/(ba)?sh\b|^#!\s*\/usr\/bin\/env\s+bash\b/.test(first)
	)
		return fail(s, `（模擬では、${first.slice(2).trim()} で動く台本は扱わない）\n`, 126);
	return runChild(
		run.commands,
		s,
		text,
		{ kind: 'file', name: shown },
		[shown, ...args],
		run.now,
		extraEnv
	);
}

type Sink = { path: string; append: boolean } | { null: true };

// 1 つの命令を打つ（リダイレクト込み）
function runCommand<X>(
	run: Run<X>,
	state: ShellState<X>,
	c: Command,
	stdin: string,
	piped: boolean,
	line: number
): CmdResult<X> {
	const prefix = prefixAt(run.where, line);
	const now = run.now;
	let s = state;
	const words: string[] = [];
	let subErr = '';
	for (const w of c.words) {
		const e = expandWord(run, w, s);
		s = e.state;
		subErr += e.err;
		words.push(...e.fields);
	}
	let input = stdin;
	let outSink: Sink | null = null;
	let errSink: Sink | null = null;
	let errToOut = false;
	let outToErr = false;
	// リダイレクトは命令より先に開く（> は中身を空にして作る）
	for (const r of c.redirects) {
		if (r.op === '>&') {
			if (r.fd === 2) errToOut = true;
			else outToErr = true;
			continue;
		}
		const name = expand(run, r.target, s);
		const path = pathOf(s, name);
		if (path === NULL_DEVICE) {
			if (r.op === '<') input = '';
			else if (r.fd === 2) errSink = { null: true };
			else outSink = { null: true };
			continue;
		}
		if (r.op === '<') {
			const data = readFile(s.fs, path);
			if (data === null) {
				const why = isDir(s.fs, path) ? 'Is a directory' : 'No such file or directory';
				return fail(s, `${prefix}${name}: ${why}\n`);
			}
			if (!canRead(s.fs, path, s.user)) return fail(s, `${prefix}${name}: Permission denied\n`);
			input = data;
			continue;
		}
		if (isDir(s.fs, path)) return fail(s, `${prefix}${name}: Is a directory\n`);
		if (!isDir(s.fs, parentOf(path)))
			return fail(s, `${prefix}${name}: No such file or directory\n`);
		if (stat(s.fs, path) && !canWrite(s.fs, path, s.user))
			return fail(s, `${prefix}${name}: Permission denied\n`);
		if (!stat(s.fs, path) && !canWrite(s.fs, parentOf(path), s.user))
			return fail(s, `${prefix}${name}: Permission denied\n`);
		if (r.op === '>' || !stat(s.fs, path)) s = { ...s, fs: writeFile(s.fs, path, '', now) };
		const sink = { path, append: r.op === '>>' };
		if (r.fd === 2) errSink = sink;
		else outSink = sink;
	}

	// 頭の NAME=値 は、その命令の間だけの環境（命令が無ければ、シェルの変数に置く）
	let k = 0;
	const temp: Record<string, string> = {};
	for (; k < words.length; k++) {
		const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s.exec(words[k]);
		if (!m) break;
		temp[m[1]] = m[2];
	}
	const argv = words.slice(k);
	const io: Io<X> = {
		stdin: input,
		tty: !piped && outSink === null,
		now,
		prefix,
		interactive: run.where.kind === 'tty',
		commands: run.commands
	};

	let res: CmdResult<X>;
	if (argv.length === 0) {
		res = ok({ ...s, vars: { ...s.vars, ...temp } });
	} else {
		const [name, ...args] = argv;
		const withTemp = (fn: (st: ShellState<X>) => CmdResult<X>): CmdResult<X> => {
			if (k === 0) return fn(s);
			const r = fn({
				...s,
				vars: { ...s.vars, ...temp },
				exported: [...new Set([...s.exported, ...Object.keys(temp)])]
			});
			return { ...r, state: { ...r.state, vars: s.vars, exported: s.exported } };
		};
		const cmd = run.commands[name];
		if (name.includes('/')) {
			const path = pathOf(s, name);
			const node = stat(s.fs, path);
			const sys = node ? null : systemName(path, run.commands);
			if (sys) res = withTemp((st) => (run.commands[sys] as Cmd<X>)(st, args, io));
			else if (!node) res = fail(s, `${prefix}${name}: No such file or directory\n`, 127);
			else if (node.kind === 'dir') res = fail(s, `${prefix}${name}: Is a directory\n`, 126);
			else if (!canExec(s.fs, path, s.user))
				res = fail(s, `${prefix}${name}: Permission denied\n`, 126);
			else res = withTemp((st) => runFile(run, st, path, name, args, temp));
		} else if (cmd && BUILTINS.has(name)) {
			res = withTemp((st) => cmd(st, args, { ...io, builtin: true }));
		} else {
			const [found] = lookPath(s, name, run.commands);
			if (!found) res = fail(s, `${prefix}${name}: command not found\n`, 127);
			else if (found.kind === 'system')
				res = withTemp((st) => (run.commands[found.name] as Cmd<X>)(st, args, io));
			else res = withTemp((st) => runFile(run, st, found.path, found.path, args, temp));
		}
	}

	let { out, err } = res;
	let fs = res.state.fs;
	if (errToOut) {
		out += err;
		err = '';
	}
	if (outToErr) {
		err = out + err;
		out = '';
	}
	const put = (sink: Sink, data: string) => {
		if ('null' in sink) return;
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
	return { ...res, state: { ...res.state, fs }, out, err: subErr + err };
}

// && と || のまとまり 1 つ
function runAndOr<X>(
	run: Run<X>,
	state: ShellState<X>,
	items: ListItem[],
	line: number
): CmdResult<X> {
	let s = state;
	let out = '';
	let err = '';
	let code = s.lastCode;
	for (const item of items) {
		if (item.op === '&&' && code !== 0) continue;
		if (item.op === '||' && code === 0) continue;
		let stdin = '';
		const cmds = item.pipeline.commands;
		for (let i = 0; i < cmds.length; i++) {
			const last = i === cmds.length - 1;
			// パイプの中の命令は子で動く（exit しても外に及ばない。変数も戻らない）
			const r = runCommand(run, s, cmds[i], stdin, !last, line);
			if (cmds.length > 1) s = { ...s, fs: r.state.fs, ext: r.state.ext };
			else s = r.state;
			err += r.err;
			if (last) out += r.out;
			else stdin = r.out;
			code = r.code;
			if (r.exit && cmds.length === 1)
				return { state: { ...s, lastCode: code }, out, err, code, exit: true };
		}
		s = { ...s, lastCode: code };
	}
	return { state: s, out, err, code };
}

function runNodes<X>(run: Run<X>, state: ShellState<X>, nodes: Node[]): CmdResult<X> {
	let s = state;
	let out = '';
	let err = '';
	let code = s.lastCode;
	for (const n of nodes) {
		let r: CmdResult<X>;
		if (n.t === 'cmd') r = runAndOr(run, s, n.list.items, n.list.line);
		else {
			r = { state: { ...s, lastCode: 0 }, out: '', err: '', code: 0 };
			let taken = false;
			for (const arm of n.arms) {
				const c = runNodes(run, s, arm.cond);
				out += c.out;
				err += c.err;
				s = c.state;
				if (c.exit) return { ...c, out, err };
				if (c.code === 0) {
					r = runNodes(run, s, arm.body);
					taken = true;
					break;
				}
			}
			if (!taken && n.orElse) r = runNodes(run, s, n.orElse);
			else if (!taken) r = { state: { ...s, lastCode: 0 }, out: '', err: '', code: 0 };
		}
		out += r.out;
		err += r.err;
		s = r.state;
		code = r.code;
		if (r.exit) return { state: s, out, err, code, exit: true };
	}
	return { state: { ...s, lastCode: code }, out, err, code };
}

// 台本（1 行でも複数行でも）を読んで動かす。読めない所があれば、そこまでを動かしてから誤りを出す
function runText<X>(run: Run<X>, state: ShellState<X>, text: string): CmdResult<X> {
	const script = parseScript(text);
	const r = runNodes(run, state, script.nodes);
	if (r.exit || !script.error) return { ...r, exit: undefined };
	const e = script.error;
	const p = prefixAt(run.where, e.line);
	// 端末で打ったときは、読めなかった行を写さない（bash の対話の形）
	const echo = run.where.kind !== 'tty' && e.offending !== null ? `${p}\`${e.offending}'\n` : '';
	return {
		state: { ...r.state, lastCode: 2 },
		out: r.out,
		err: r.err + `${p}${e.message}\n` + echo,
		code: 2
	};
}

export function runLine<X>(
	commands: Commands<X>,
	state: ShellState<X>,
	line: string
): CmdResult<X> {
	const now = nowOf(state.tick);
	const s = { ...state, tick: state.tick + 1 };
	return runText({ commands, now, where: { kind: 'tty' } }, s, line);
}

export function shellTool<X>(commands: Commands<X>): Tool<ShellState<X>> {
	return {
		run(state, line): Result & { state: ShellState<X> } {
			const r = runLine(commands, state, line);
			return { state: r.state, out: r.out, err: r.err, code: r.code };
		}
	};
}
