// 模擬の git：枝を作る・移る・合わせる・積み直す・打ち消す。
import { writeFile } from '../fs.ts';
import { fail, ok } from '../shell/run.ts';
import { checkout, computeStatus, unsupported, withRepo, type Ctx, type R } from './common.ts';
import { commitSummary, makeCommit, statSummary, treeChanges } from './git.ts';
import { reachable } from './history.ts';
import { mergeBase, mergeTrees, type TreeMerge } from './merge.ts';
import type { Commit } from './objects.ts';
import { diffStat } from './patch.ts';
import {
	abbrev,
	branchName,
	commitTree,
	flatten,
	headCommit,
	resolveRev,
	store,
	writeTree,
	type IndexEntry,
	type Repo,
	type Unmerged
} from './repo.ts';

const branches = (repo: Repo) =>
	Object.keys(repo.refs)
		.filter((r) => r.startsWith('refs/heads/'))
		.sort();

export const branchCmd = (ctx: Ctx, args: string[]): R => {
	const { s, root, repo } = ctx;
	const verbose = args.includes('-v') || args.includes('--verbose');
	const del = args.includes('-d') || args.includes('--delete');
	const flag = args.find(
		(a) => a.startsWith('-') && !['-v', '--verbose', '-d', '--delete'].includes(a)
	);
	if (flag) return unsupported(s, `git branch ${flag}`);
	const names = args.filter((a) => !a.startsWith('-'));
	if (del) {
		const [name] = names;
		const ref = `refs/heads/${name}`;
		if (!repo.refs[ref]) return fail(s, `error: branch '${name}' not found\n`, 1);
		if (ref === repo.head)
			return fail(s, `error: cannot delete branch '${name}' used by worktree at '${root}'\n`, 1);
		const { [ref]: was, ...refs } = repo.refs;
		return ok(
			withRepo(s, root, { ...repo, refs }),
			`Deleted branch ${name} (was ${abbrev(was)}).\n`
		);
	}
	if (names.length === 0) {
		const list = branches(repo);
		const w = Math.max(0, ...list.map((r) => branchName(r).length));
		const out = list
			.map((r) => {
				const mark = r === repo.head ? '* ' : '  ';
				if (!verbose) return `${mark}${branchName(r)}\n`;
				const id = repo.refs[r];
				const c = repo.objects[id] as Commit;
				return `${mark}${branchName(r).padEnd(w)} ${abbrev(id)} ${c.message.split('\n')[0]}\n`;
			})
			.join('');
		return ok(s, out);
	}
	const [name, start] = names;
	if (repo.refs[`refs/heads/${name}`])
		return fail(s, `fatal: a branch named '${name}' already exists\n`, 128);
	const at = start ? resolveRev(repo, start) : headCommit(repo);
	if (!at) return fail(s, `fatal: not a valid object name: '${start ?? 'HEAD'}'\n`, 128);
	return ok(withRepo(s, root, { ...repo, refs: { ...repo.refs, [`refs/heads/${name}`]: at } }));
};

// 枝へ移る。作業ツリーと索引で、2 つの tree の違う所だけを替える（手元の変更は残す）
function moveTo(ctx: Ctx, repo: Repo, toRef: string): { fs: Ctx['s']['fs']; repo: Repo } | string {
	const fromTree = commitTree(repo, headCommit(repo));
	const toTree = commitTree(repo, repo.refs[toRef] ?? null);
	const st = computeStatus(ctx.s, ctx.root, repo);
	const touched = new Set([...st.staged, ...st.unstaged].map((c) => c.path));
	const changed = treeChanges(repo, fromTree, toTree).map((c) => c.path);
	const clash = changed.filter((p) => touched.has(p));
	if (clash.length > 0) {
		return `error: Your local changes to the following files would be overwritten by checkout:\n${clash.map((p) => `\t${p}\n`).join('')}Please commit your changes or stash them before you switch branches.\nAborting\n`;
	}
	const { fs } = checkout(ctx.s.fs, ctx.root, repo, fromTree, toTree, ctx.now);
	const to = flatten(repo, toTree);
	const index: Record<string, IndexEntry> = { ...repo.index };
	for (const p of changed) {
		const e = to.get(p);
		if (e) index[p] = e;
		else delete index[p];
	}
	return { fs, repo: { ...repo, index, head: toRef } };
}

export const switchCmd = (ctx: Ctx, args: string[]): R => {
	const { s, root, repo } = ctx;
	const create = args.includes('-c') || args.includes('--create');
	const flag = args.find((a) => a.startsWith('-') && !['-c', '--create'].includes(a));
	if (flag) return unsupported(s, `git switch ${flag}`);
	const [name] = args.filter((a) => !a.startsWith('-'));
	if (!name) return unsupported(s, '枝の名前の無い git switch');
	const ref = `refs/heads/${name}`;
	if (create) {
		if (repo.refs[ref]) return fail(s, `fatal: a branch named '${name}' already exists\n`, 128);
		const h = headCommit(repo);
		const next: Repo = { ...repo, head: ref, refs: h ? { ...repo.refs, [ref]: h } : repo.refs };
		return fail(withRepo(s, root, next), `Switched to a new branch '${name}'\n`, 0);
	}
	if (!repo.refs[ref]) return fail(s, `fatal: invalid reference: ${name}\n`, 128);
	if (ref === repo.head) return fail(s, `Already on '${name}'\n`, 0);
	const moved = moveTo(ctx, repo, ref);
	if (typeof moved === 'string') return fail(s, moved, 1);
	return fail(
		withRepo({ ...s, fs: moved.fs }, root, moved.repo),
		`Switched to branch '${name}'\n`,
		0
	);
};

// 合わせた結果を作業ツリーと索引に置く。衝突した所は印つきの中身と、解けていない印
function applyMerge(
	ctx: Ctx,
	repo0: Repo,
	m: TreeMerge
): { fs: Ctx['s']['fs']; repo: Repo; tree: string | null } {
	let repo = repo0;
	let fs = ctx.s.fs;
	const index: Record<string, IndexEntry> = {};
	for (const [p, e] of m.entries) {
		const text = m.blobs.get(p);
		if (text !== undefined) {
			const [r2, id] = store(repo, { type: 'blob', data: text });
			repo = r2;
			index[p] = { id, mode: e.mode };
		} else index[p] = e;
	}
	const unmerged: Record<string, Unmerged> = {};
	for (const [p, c] of m.conflicts) unmerged[p] = { base: c.base, ours: c.ours, theirs: c.theirs };
	const headTree = commitTree(repo, headCommit(repo));
	const before = flatten(repo, headTree);
	// 作業ツリー：替わった所だけ書く
	const tmp: Repo = { ...repo, index };
	const [r3, tree] = writeTree(tmp);
	repo = r3;
	const co = checkout(fs, ctx.root, repo, headTree, tree, ctx.now);
	fs = co.fs;
	for (const [p, c] of m.conflicts) fs = writeFile(fs, `${ctx.root}/${p}`, c.text, ctx.now);
	void before;
	return {
		fs,
		repo: { ...repo, index, unmerged },
		tree: m.conflicts.size === 0 ? tree : null
	};
}

const isAncestor = (repo: Repo, a: string, b: string) => reachable(repo, [b]).has(a);

export const mergeCmd = (ctx: Ctx, args: string[]): R => {
	const { s, root, repo } = ctx;
	const flag = args.find((a) => a.startsWith('-') && a !== '--no-edit');
	if (flag) return unsupported(s, `git merge ${flag}`);
	const [name] = args.filter((a) => !a.startsWith('-'));
	if (!name) return unsupported(s, '相手の無い git merge');
	const theirs = resolveRev(repo, name);
	if (!theirs) return fail(s, `merge: ${name} - not something we can merge\n`, 1);
	const ours = headCommit(repo);
	if (!ours) return unsupported(s, '記録の無い枝への git merge');
	if (isAncestor(repo, theirs, ours)) return ok(s, 'Already up to date.\n');
	const headTree = commitTree(repo, ours);
	if (isAncestor(repo, ours, theirs)) {
		const toTree = commitTree(repo, theirs);
		const cs = treeChanges(repo, headTree, toTree);
		const co = checkout(s.fs, root, repo, headTree, toTree, ctx.now);
		const next: Repo = { ...repo, index: co.index, refs: { ...repo.refs, [repo.head]: theirs } };
		const out = `Updating ${abbrev(ours)}..${abbrev(theirs)}\nFast-forward\n${diffStat(cs)}${statSummaryModes(cs)}`;
		return ok(withRepo({ ...s, fs: co.fs }, root, next), out);
	}
	const base = mergeBase(repo, ours, theirs);
	const m = mergeTrees(
		repo,
		commitTree(repo, base),
		headTree,
		commitTree(repo, theirs),
		'HEAD',
		name
	);
	const applied = applyMerge(ctx, repo, m);
	const into = branchName(repo.head);
	const message = `Merge branch '${name}'${into === 'main' || into === 'master' ? '' : ` into ${into}`}\n`;
	const msgs = m.messages.map((x) => `${x}\n`).join('');
	if (!applied.tree) {
		const next: Repo = { ...applied.repo, merging: { head: theirs, message } };
		return fail(
			withRepo({ ...s, fs: applied.fs }, root, next),
			'',
			1,
			`${msgs}Automatic merge failed; fix conflicts and then commit the result.\n`
		);
	}
	const [r2, id] = makeCommit(ctx, applied.repo, applied.tree, [ours, theirs], message);
	const next: Repo = { ...r2, refs: { ...r2.refs, [repo.head]: id } };
	const cs = treeChanges(next, headTree, applied.tree);
	const out = `${msgs}Merge made by the 'ort' strategy.\n${diffStat(cs)}${statSummaryModes(cs)}`;
	return ok(withRepo({ ...s, fs: applied.fs }, root, next), out);
};

// diffStat の後ろに付く、作った・消したファイルの行
function statSummaryModes(cs: ReturnType<typeof treeChanges>): string {
	const all = statSummary(cs);
	return all
		.split('\n')
		.filter((l) => / (create|delete) mode | mode change /.test(l))
		.map((l) => `${l}\n`)
		.join('');
}

export const rebaseCmd = (ctx: Ctx, args: string[]): R => {
	const { s, root, repo } = ctx;
	const flag = args.find((a) => a.startsWith('-'));
	if (flag) return unsupported(s, `git rebase ${flag}`);
	const [upName] = args;
	if (!upName) return unsupported(s, '土台の無い git rebase');
	const upstream = resolveRev(repo, upName);
	if (!upstream) return fail(s, `fatal: invalid upstream '${upName}'\n`, 128);
	const tip = headCommit(repo);
	if (!tip) return unsupported(s, '記録の無い枝の git rebase');
	const st = computeStatus(s, root, repo);
	if (st.staged.length + st.unstaged.length > 0)
		return unsupported(s, '手元に変更がある状態の git rebase');
	const ref = repo.head;
	if (isAncestor(repo, upstream, tip))
		return ok(s, `Current branch ${branchName(ref)} is up to date.\n`);
	// 積み直す commit：tip から辿れて upstream から辿れない物を、古い順に（最初の親の鎖）
	const fromUp = reachable(repo, [upstream]);
	const todo: string[] = [];
	for (let id: string | null = tip; id && !fromUp.has(id);) {
		todo.unshift(id);
		const c = repo.objects[id] as Commit;
		if (c.parents.length > 1) return unsupported(s, '合流を含む git rebase');
		id = c.parents[0] ?? null;
	}
	let r = repo;
	let cur = upstream;
	let progress = '';
	todo.forEach((id, k) => {
		const c = r.objects[id] as Commit;
		const m = mergeTrees(
			r,
			commitTree(r, c.parents[0] ?? null),
			commitTree(r, cur),
			c.tree,
			'HEAD',
			abbrev(id)
		);
		const index: Record<string, IndexEntry> = {};
		for (const [p, e] of m.entries) {
			const text = m.blobs.get(p);
			if (text !== undefined) {
				const [r2, bid] = store(r, { type: 'blob', data: text });
				r = r2;
				index[p] = { id: bid, mode: e.mode };
			} else index[p] = e;
		}
		const [r3, tree] = writeTree({ ...r, index });
		const [r4, nid] = makeCommit(ctx, r3, tree, [cur], c.message, c.author);
		r = r4;
		cur = nid;
		progress += `Rebasing (${k + 1}/${todo.length})\r`;
	});
	const oldTree = commitTree(repo, tip);
	const newTree = commitTree(r, cur);
	const co = checkout(s.fs, root, r, oldTree, newTree, ctx.now);
	const next: Repo = { ...r, index: co.index, refs: { ...r.refs, [ref]: cur } };
	return fail(
		withRepo({ ...s, fs: co.fs }, root, next),
		`${progress}Successfully rebased and updated ${ref}.\n`,
		0
	);
};

export const revertCmd = (ctx: Ctx, args: string[]): R => {
	const { s, root, repo } = ctx;
	const noEdit = args.includes('--no-edit');
	const flag = args.find((a) => a.startsWith('-') && a !== '--no-edit');
	if (flag) return unsupported(s, `git revert ${flag}`);
	if (!noEdit) return unsupported(s, '--no-edit を付けない git revert（エディタを開く形）');
	const [spec] = args.filter((a) => !a.startsWith('-'));
	const target = spec ? resolveRev(repo, spec) : null;
	if (!target) return fail(s, `fatal: bad revision '${spec ?? ''}'\n`, 128);
	const ours = headCommit(repo);
	if (!ours) return unsupported(s, '記録の無い枝の git revert');
	const c = repo.objects[target] as Commit;
	const m = mergeTrees(
		repo,
		c.tree,
		commitTree(repo, ours),
		commitTree(repo, c.parents[0] ?? null),
		'HEAD',
		`parent of ${abbrev(target)}`
	);
	if (m.conflicts.size > 0) return unsupported(s, '衝突する git revert');
	const applied = applyMerge(ctx, repo, m);
	const subject = c.message.split('\n')[0];
	const message = `Revert "${subject}"\n\nThis reverts commit ${target}.\n`;
	const [r2, id] = makeCommit(ctx, applied.repo, applied.tree as string, [ours], message);
	const next: Repo = { ...r2, refs: { ...r2.refs, [repo.head]: id } };
	return ok(
		withRepo({ ...s, fs: applied.fs }, root, next),
		commitSummary(next, id, { showDate: true })
	);
};
