// 道具の履歴と巻き戻し（docs/tools.md 1 章）。
// 道具は 状態 → 状態 の関数。履歴は「打った物・結果・打った後の状態」の並びで、
// 巻き戻すとは k 件目の状態に戻り、その先を捨てること。

export type Result = { out: string; err: string; code: number };

export type Tool<S> = {
	run(state: S, line: string): Result & { state: S };
};

export type Entry<S> = Result & { line: string; state: S };

export type Session<S> = {
	tool: Tool<S>;
	initial: S;
	entries: Entry<S>[];
};

export function start<S>(tool: Tool<S>, initial: S): Session<S> {
	return { tool, initial, entries: [] };
}

export function current<S>(s: Session<S>): S {
	return s.entries.at(-1)?.state ?? s.initial;
}

export function typeLine<S>(s: Session<S>, line: string): Session<S> {
	const r = s.tool.run(current(s), line);
	const entry: Entry<S> = { line, out: r.out, err: r.err, code: r.code, state: r.state };
	return { ...s, entries: [...s.entries, entry] };
}

// k 件目まで戻す（0 は初めの状態）
export function rewind<S>(s: Session<S>, k: number): Session<S> {
	const n = Math.max(0, Math.min(s.entries.length, Math.trunc(k)));
	return { ...s, entries: s.entries.slice(0, n) };
}

// 本物の道具の中には、答えが後から返る物がある（JavaScript の Promise）。形は同じで、打つ所だけ待つ
export type AsyncTool<S> = {
	run(state: S, line: string): Promise<Result & { state: S }>;
};

export type AsyncSession<S> = {
	tool: AsyncTool<S>;
	initial: S;
	entries: Entry<S>[];
};

export function startAsync<S>(tool: AsyncTool<S>, initial: S): AsyncSession<S> {
	return { tool, initial, entries: [] };
}

export async function typeAsync<S>(s: AsyncSession<S>, line: string): Promise<AsyncSession<S>> {
	const prev = s.entries.at(-1)?.state ?? s.initial;
	const r = await s.tool.run(prev, line);
	const entry: Entry<S> = { line, out: r.out, err: r.err, code: r.code, state: r.state };
	return { ...s, entries: [...s.entries, entry] };
}

export function rewindAsync<S>(s: AsyncSession<S>, k: number): AsyncSession<S> {
	const n = Math.max(0, Math.min(s.entries.length, Math.trunc(k)));
	return { ...s, entries: s.entries.slice(0, n) };
}
