// 実戦の舞台に描く、git の状態の絵：作業ツリー・ステージ・リポジトリ。
// 状態だけから作る（どの時点も、その時点の状態から描ける）。
import { shortStatus } from '../tools/git/common.ts';
import { dateOrder, decoration } from '../tools/git/history.ts';
import type { Commit } from '../tools/git/objects.ts';
import { abbrev, branchName, headCommit, worktree, type GitExt } from '../tools/git/repo.ts';
import type { ShellState } from '../tools/shell/run.ts';
import { WORK } from '../tools/shell/world.ts';

export type GitPicture = {
	repo: boolean;
	branch: string;
	worktree: { key: string; name: string; mark: string }[];
	index: { key: string; name: string; id: string }[];
	commits: { key: string; id: string; subject: string; refs: string[] }[];
};

export function gitPicture(state: ShellState<GitExt>): GitPicture {
	const repo = state.ext.repos[WORK];
	const files = [...worktree(state.fs, WORK).keys()].sort();
	if (!repo) {
		return {
			repo: false,
			branch: '',
			worktree: files.map((name) => ({ key: `wt:${name}`, name, mark: '' })),
			index: [],
			commits: []
		};
	}
	const marks = new Map<string, string>();
	for (const line of shortStatus({ ...state, cwd: WORK }, WORK, repo).split('\n')) {
		if (line.length > 3) marks.set(line.slice(3), line.slice(0, 2));
	}
	const head = headCommit(repo);
	const commits = head
		? dateOrder(repo, [head]).map((id) => {
				const c = repo.objects[id] as Commit;
				const deco = decoration(repo, id, repo.symrefs);
				return {
					key: `c:${id}`,
					id: abbrev(id),
					subject: c.message.split('\n')[0],
					refs: deco ? deco.slice(2, -1).split(', ') : []
				};
			})
		: [];
	return {
		repo: true,
		branch: branchName(repo.head),
		worktree: files.map((name) => ({ key: `wt:${name}`, name, mark: marks.get(name) ?? '' })),
		index: Object.entries(repo.index)
			.sort(([a], [b]) => (a < b ? -1 : 1))
			.map(([name, e]) => ({ key: `ix:${name}`, name, id: abbrev(e.id) })),
		commits
	};
}

// 前の絵と後の絵で、現れた・替わった物の鍵
export function changedKeys(a: GitPicture, b: GitPicture): Set<string> {
	const sig = (p: GitPicture) =>
		new Map<string, string>([
			...p.worktree.map((x) => [x.key, x.mark] as [string, string]),
			...p.index.map((x) => [x.key, x.id] as [string, string]),
			...p.commits.map((x) => [x.key, x.refs.join(',')] as [string, string])
		]);
	const before = sig(a);
	const out = new Set<string>();
	for (const [k, v] of sig(b)) if (before.get(k) !== v) out.add(k);
	return out;
}
