// シェルの台本（複数の行）を読む。1 行の読み方は parse.ts。ここでは行をまたぐ形
// （if / then / elif / else / fi）を組み立てる。扱わない形（for・while・case・関数）は、要るレッスンが無い。
import { parseLine, type ListItem } from './parse.ts';

// && と || でつないだ 1 まとまり（先頭の op は null）
export type AndOr = { items: ListItem[]; line: number };
export type Arm = { cond: Node[]; body: Node[] };
export type Node = { t: 'cmd'; list: AndOr } | { t: 'if'; arms: Arm[]; orElse: Node[] | null };
export type ScriptError = { line: number; message: string; offending: string | null };
export type Script = { nodes: Node[]; error: ScriptError | null };

const RESERVED = ['if', 'then', 'elif', 'else', 'fi'] as const;
type Kw = (typeof RESERVED)[number];
type Unit = { kw: Kw; line: number; text: string } | { cmd: AndOr };

function firstWord(list: AndOr): string | null {
	const w = list.items[0]?.pipeline.commands[0]?.words[0];
	if (!w || w.length !== 1) return null;
	const seg = w[0];
	return 'lit' in seg ? seg.lit : null;
}

// 先頭の語（予約語）を除いた残り。何も残らなければ null
function dropFirst(list: AndOr): AndOr | null {
	const [head, ...rest] = list.items;
	const [cmd, ...cmds] = head.pipeline.commands;
	const words = cmd.words.slice(1);
	if (words.length === 0 && cmd.redirects.length === 0 && cmds.length === 0) {
		if (rest.length === 0) return null;
		return { items: [{ ...rest[0], op: null }, ...rest.slice(1)], line: list.line };
	}
	return {
		items: [{ op: null, pipeline: { commands: [{ ...cmd, words }, ...cmds] } }, ...rest],
		line: list.line
	};
}

class Fail extends Error {
	constructor(readonly info: ScriptError) {
		super(info.message);
	}
}

// 行を「予約語」と「命令のまとまり」の並びにする。読めない行があれば、そこで止めてその誤りを返す
function units(text: string): { units: Unit[]; eofLine: number; lineError: ScriptError | null } {
	const lines = text.split('\n');
	const eofLine = lines.length;
	if (lines.at(-1) === '') lines.pop();
	const out: Unit[] = [];
	for (let i = 0; i < lines.length; i++) {
		const raw = lines[i];
		const line = i + 1;
		const parsed = parseLine(raw);
		if ('error' in parsed) {
			const near = parsed.error.startsWith('syntax error near');
			const lineError = { line, message: parsed.error, offending: near ? raw : null };
			return { units: out, eofLine, lineError };
		}
		const lists: AndOr[] = [];
		for (const item of parsed.items) {
			if (item.op === null || item.op === ';') lists.push({ items: [{ ...item, op: null }], line });
			else lists.at(-1)?.items.push(item);
		}
		for (const list of lists) {
			const kw = RESERVED.find((k) => k === firstWord(list));
			if (!kw) {
				out.push({ cmd: list });
				continue;
			}
			out.push({ kw, line, text: raw });
			const rest = dropFirst(list);
			if (rest) out.push({ cmd: rest });
		}
	}
	return { units: out, eofLine, lineError: null };
}

export function parseScript(text: string): Script {
	const { units: us, eofLine, lineError } = units(text);
	let i = 0;
	const unexpected = (u: { kw: Kw; line: number; text: string }) =>
		new Fail({
			line: u.line,
			message: `syntax error near unexpected token \`${u.kw}'`,
			offending: u.text
		});
	const eof = () =>
		lineError
			? new Fail(lineError)
			: new Fail({
					line: eofLine,
					message: 'syntax error: unexpected end of file',
					offending: null
				});
	const kwAt = (): { kw: Kw; line: number; text: string } => {
		const u = us[i];
		if (!u) throw eof();
		if ('cmd' in u) throw new Error('kw expected');
		return u;
	};

	// until の予約語が来るまでの並び（until は読まずに残す）
	const list = (until: readonly Kw[]): Node[] => {
		const out: Node[] = [];
		while (i < us.length) {
			const u = us[i];
			if ('cmd' in u) {
				out.push({ t: 'cmd', list: u.cmd });
				i++;
			} else if (until.includes(u.kw)) return out;
			else if (u.kw === 'if') {
				i++;
				out.push(ifNode());
			} else throw unexpected(u);
		}
		throw eof();
	};
	const ifNode = (): Node => {
		const arms: Arm[] = [];
		for (;;) {
			const cond = list(['then', 'elif', 'else', 'fi']);
			const then = kwAt();
			if (then.kw !== 'then' || cond.length === 0) throw unexpected(then);
			i++;
			const body = list(['elif', 'else', 'fi']);
			const next = kwAt();
			if (body.length === 0) throw unexpected(next);
			i++;
			arms.push({ cond, body });
			if (next.kw === 'elif') continue;
			if (next.kw === 'fi') return { t: 'if', arms, orElse: null };
			const orElse = list(['fi']);
			const fi = kwAt();
			if (orElse.length === 0) throw unexpected(fi);
			i++;
			return { t: 'if', arms, orElse };
		}
	};

	const nodes: Node[] = [];
	try {
		while (i < us.length) {
			const u = us[i];
			if ('cmd' in u) {
				nodes.push({ t: 'cmd', list: u.cmd });
				i++;
			} else if (u.kw === 'if') {
				i++;
				nodes.push(ifNode());
			} else throw unexpected(u);
		}
	} catch (e) {
		if (!(e instanceof Fail)) throw e;
		return { nodes, error: e.info };
	}
	return { nodes, error: lineError };
}
