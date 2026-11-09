// 記録の辿り方と、git log --graph の線の描き方。
// 本物（git 2.56）の振る舞いのうち、レッスンで出る形（2 本の枝・1 つの合流）を再現する。
import type { Commit, GitObject } from './objects.ts';
import { branchName, type Repo } from './repo.ts';

const commitOf = (repo: Repo, id: string): Commit | null => {
	const o: GitObject | undefined = repo.objects[id];
	return o?.type === 'commit' ? o : null;
};

// from から辿れる commit の全て
export function reachable(repo: Repo, from: string[]): Set<string> {
	const seen = new Set<string>();
	const stack = [...from];
	while (stack.length > 0) {
		const id = stack.pop() as string;
		if (seen.has(id)) continue;
		seen.add(id);
		stack.push(...(commitOf(repo, id)?.parents ?? []));
	}
	return seen;
}

// 日時の順（新しい順）。git log の既定
export function dateOrder(repo: Repo, tips: string[]): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	let queue = tips.filter((t, i) => tips.indexOf(t) === i);
	queue.forEach((t) => seen.add(t));
	while (queue.length > 0) {
		let best = 0;
		for (let i = 1; i < queue.length; i++) {
			const a = commitOf(repo, queue[i])?.committer.time ?? 0;
			const b = commitOf(repo, queue[best])?.committer.time ?? 0;
			if (a > b) best = i;
		}
		const id = queue[best];
		queue = queue.filter((_, i) => i !== best);
		out.push(id);
		for (const p of commitOf(repo, id)?.parents ?? []) {
			if (!seen.has(p)) {
				seen.add(p);
				queue.push(p);
			}
		}
	}
	return out;
}

// 位相の順（--graph のとき）。子を全て出してから親。後の親から先に辿る（git の LIFO と同じ）
export function topoOrder(repo: Repo, tips: string[]): string[] {
	const all = dateOrder(repo, tips);
	const indegree = new Map<string, number>(all.map((id) => [id, 0]));
	for (const id of all) {
		for (const p of commitOf(repo, id)?.parents ?? []) indegree.set(p, (indegree.get(p) ?? 0) + 1);
	}
	// 初めの積み：子の無い物を、日時の順の初めの物が先に出るように
	const stack = all.filter((id) => indegree.get(id) === 0).reverse();
	const out: string[] = [];
	while (stack.length > 0) {
		const id = stack.pop() as string;
		out.push(id);
		for (const p of commitOf(repo, id)?.parents ?? []) {
			const d = (indegree.get(p) ?? 0) - 1;
			indegree.set(p, d);
			if (d === 0) stack.push(p);
		}
	}
	return out;
}

// HEAD と参照の飾り。参照の名前の逆の順で、今の枝を先頭に「HEAD -> 枝」と置く
export function decoration(
	repo: Repo,
	id: string,
	symbolicRemoteHeads: Record<string, string> = {}
): string {
	const names: string[] = [];
	const refs = Object.keys(repo.refs)
		.filter((r) => repo.refs[r] === id)
		.sort()
		.reverse();
	const headHere = repo.refs[repo.head] === id;
	if (headHere) names.push(`HEAD -> ${branchName(repo.head)}`);
	const extra = Object.entries(symbolicRemoteHeads)
		.filter(([, target]) => repo.refs[target] === id)
		.map(([name]) => name);
	const all = [...refs, ...extra].sort().reverse();
	for (const r of all) {
		if (r === repo.head) continue;
		if (r.startsWith('refs/heads/')) names.push(branchName(r));
		else if (r.startsWith('refs/remotes/')) names.push(r.slice('refs/remotes/'.length));
		else if (r.startsWith('refs/tags/')) names.push(`tag: ${r.slice('refs/tags/'.length)}`);
	}
	return names.length > 0 ? ` (${names.join(', ')})` : '';
}

// --graph の線。commit ごとに、その commit の行の前置きと、後に続く線の行を返す
export function graphLines(repo: Repo, order: string[]): { prefix: string; after: string[] }[] {
	let columns: string[] = [];
	const result: { prefix: string; after: string[] }[] = [];
	for (const id of order) {
		let idx = columns.indexOf(id);
		if (idx < 0) {
			columns = [...columns, id];
			idx = columns.length - 1;
		}
		const parents = commitOf(repo, id)?.parents ?? [];
		// 次の列：commit の所に親を入れ、同じ物を指す列は 1 つにまとめる
		const next: string[] = [];
		const mapping: number[] = [];
		columns.forEach((c, j) => {
			if (j === idx) {
				const first = mapping.length;
				parents.forEach((p) => {
					if (!next.includes(p)) next.push(p);
				});
				mapping.push(parents.length > 0 ? next.indexOf(parents[0]) : first);
			} else {
				const at = next.indexOf(c);
				if (at >= 0) mapping.push(at);
				else {
					next.push(c);
					mapping.push(next.length - 1);
				}
			}
		});
		const merge = parents.length > 1;
		const width = 2 * Math.max(columns.length, merge ? next.length : columns.length);
		const pad = (s: string) => s.padEnd(width);
		const line = columns.map((_, j) => (j === idx ? '*' : '|')).join(' ');
		const after: string[] = [];
		if (merge) {
			// 合流：commit の列から右下へ「\」
			const parts = columns.map((_, j) => (j < idx ? '| ' : j === idx ? '|\\' : ' \\'));
			after.push(pad(parts.join('')));
		}
		// まとまる列があれば「/」で寄せる
		const collapse = mapping.some((m, j) => m < j);
		if (collapse) {
			// 残る列は 2j に「|」、寄る列は 2j-1 に「/」
			const chars = Array.from({ length: width }, () => ' ');
			columns.forEach((_, j) => {
				if (mapping[j] < j) chars[2 * j - 1] = '/';
				else chars[2 * j] = '|';
			});
			after.push(chars.join(''));
		}
		result.push({ prefix: pad(line), after });
		columns = next;
	}
	return result;
}
