// 3 方向の合わせ（merge・rebase・revert で使う）。
// 行ごとに、元（共通の祖先）・こちら・あちらを比べる。両方が同じ所を違うように変えたら衝突。
import { diffLines, splitLines } from './diff.ts';
import { dateOrder, reachable } from './history.ts';
import type { GitObject } from './objects.ts';
import { flatten, type IndexEntry, type Repo } from './repo.ts';

export function mergeBase(repo: Repo, a: string, b: string): string | null {
	const fromB = reachable(repo, [b]);
	for (const id of dateOrder(repo, [a])) if (fromB.has(id)) return id;
	return null;
}

// 元の行の番号 → 相手の行の番号（残った行だけ）
function keepMap(base: string[], other: string[]): Map<number, number> {
	const m = new Map<number, number>();
	let i = 0;
	let j = 0;
	for (const e of diffLines(base, other)) {
		if (e.op === 'keep') m.set(i++, j++);
		else if (e.op === 'del') i++;
		else j++;
	}
	return m;
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export function merge3(
	base: string,
	ours: string,
	theirs: string,
	oursLabel: string,
	theirsLabel: string
): { text: string; conflict: boolean } {
	const B = splitLines(base);
	const O = splitLines(ours);
	const T = splitLines(theirs);
	const mo = keepMap(B, O);
	const mt = keepMap(B, T);
	const out: string[] = [];
	let conflict = false;
	let bi = 0;
	let oi = 0;
	let ti = 0;
	const chunk = (bEnd: number, oEnd: number, tEnd: number) => {
		const b = B.slice(bi, bEnd);
		const o = O.slice(oi, oEnd);
		const t = T.slice(ti, tEnd);
		if (same(o, b)) out.push(...t);
		else if (same(t, b) || same(o, t)) out.push(...o);
		else {
			// 衝突。こちらとあちらで共通の頭と尻は印の外に出す
			let head = 0;
			while (head < o.length && head < t.length && o[head] === t[head]) head++;
			let tail = 0;
			while (
				tail < o.length - head &&
				tail < t.length - head &&
				o[o.length - 1 - tail] === t[t.length - 1 - tail]
			)
				tail++;
			conflict = true;
			out.push(
				...o.slice(0, head),
				`<<<<<<< ${oursLabel}`,
				...o.slice(head, o.length - tail),
				'=======',
				...t.slice(head, t.length - tail),
				`>>>>>>> ${theirsLabel}`,
				...o.slice(o.length - tail)
			);
		}
	};
	for (let s = 0; s < B.length; s++) {
		const os = mo.get(s);
		const ts = mt.get(s);
		if (os === undefined || ts === undefined || os < oi || ts < ti) continue;
		chunk(s, os, ts);
		out.push(B[s]);
		bi = s + 1;
		oi = os + 1;
		ti = ts + 1;
	}
	chunk(B.length, O.length, T.length);
	return { text: out.length > 0 ? out.join('\n') + '\n' : '', conflict };
}

export type TreeMerge = {
	entries: Map<string, IndexEntry>; // 合わせた結果（衝突の無い所）
	conflicts: Map<
		string,
		{ base?: IndexEntry; ours?: IndexEntry; theirs?: IndexEntry; text: string }
	>;
	blobs: Map<string, string>; // 合わせて新しくできた中身（道 → 中身）
	messages: string[];
};

const blobData = (repo: Repo, e: IndexEntry | undefined) => {
	const o: GitObject | undefined = e ? repo.objects[e.id] : undefined;
	return o?.type === 'blob' ? o.data : '';
};

const eq = (a?: IndexEntry, b?: IndexEntry) => a?.id === b?.id && a?.mode === b?.mode;

export function mergeTrees(
	repo: Repo,
	baseTree: string | null,
	oursTree: string | null,
	theirsTree: string | null,
	oursLabel: string,
	theirsLabel: string
): TreeMerge {
	const base = flatten(repo, baseTree);
	const ours = flatten(repo, oursTree);
	const theirs = flatten(repo, theirsTree);
	const result: TreeMerge = {
		entries: new Map(),
		conflicts: new Map(),
		blobs: new Map(),
		messages: []
	};
	const paths = [...new Set([...base.keys(), ...ours.keys(), ...theirs.keys()])].sort();
	for (const p of paths) {
		const b = base.get(p);
		const o = ours.get(p);
		const t = theirs.get(p);
		if (eq(o, t) || eq(t, b)) {
			if (o) result.entries.set(p, o);
		} else if (eq(o, b)) {
			if (t) result.entries.set(p, t);
		} else if (o && t) {
			result.messages.push(`Auto-merging ${p}`);
			const m = merge3(
				blobData(repo, b),
				blobData(repo, o),
				blobData(repo, t),
				oursLabel,
				theirsLabel
			);
			if (m.conflict) {
				result.messages.push(`CONFLICT (content): Merge conflict in ${p}`);
				result.conflicts.set(p, { base: b, ours: o, theirs: t, text: m.text });
			} else {
				result.blobs.set(p, m.text);
				result.entries.set(p, { id: '', mode: o.mode });
			}
		} else {
			// 片方が消し、片方が変えた：レッスンの範囲の外
			result.messages.push(`CONFLICT (modify/delete): ${p}`);
			result.conflicts.set(p, { base: b, ours: o, theirs: t, text: blobData(repo, o ?? t) });
		}
	}
	return result;
}
