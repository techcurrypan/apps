// 模擬の git：遠くのリポジトリ。遠くは同じ機械の中の bare リポジトリ（作り物の遠く。docs/tools.md 3.1）。
import { isDir, mkdir, resolvePath, stat } from '../fs.ts';
import { fail, ok } from '../shell/run.ts';
import { checkout, findRoot, unsupported, withRepo, type Ctx, type R, type S } from './common.ts';
import { treeChanges } from './git.ts';
import { reachable } from './history.ts';
import { diffStat, summaryLine } from './patch.ts';
import { abbrev, branchName, commitTree, emptyRepo, headCommit, type Repo } from './repo.ts';

// 遠くの URL を、その機械の中の場所に解く
function remotePath(s: S, root: string, url: string): string {
	return resolvePath(root, url, s.home);
}

const fetchLabel = (url: string) => url.replace(/\.git$/, '');

// 物を写す（遠くと手元で、物の置き場を合わせる）
const withObjects = (to: Repo, from: Repo): Repo => ({
	...to,
	objects: { ...to.objects, ...from.objects }
});

const summaryCol = (s: string) => s.padEnd(17);

export const remoteCmd = (ctx: Ctx, args: string[]): R => {
	const { s, root, repo } = ctx;
	const [sub, ...rest] = args;
	if (sub === undefined)
		return ok(
			s,
			Object.keys(repo.remotes)
				.sort()
				.map((n) => `${n}\n`)
				.join('')
		);
	if (sub === '-v') {
		const out = Object.keys(repo.remotes)
			.sort()
			.map((n) => `${n}\t${repo.remotes[n]} (fetch)\n${n}\t${repo.remotes[n]} (push)\n`)
			.join('');
		return ok(s, out);
	}
	if (sub === 'add') {
		const [name, url] = rest;
		if (!name || !url) return unsupported(s, 'git remote add の形');
		if (repo.remotes[name]) return fail(s, `error: remote ${name} already exists.\n`, 3);
		return ok(withRepo(s, root, { ...repo, remotes: { ...repo.remotes, [name]: url } }));
	}
	return unsupported(s, `git remote ${sub}`);
};

export const pushCmd = (ctx: Ctx, args: string[]): R => {
	const { s, root } = ctx;
	let repo = ctx.repo;
	const setUp = args.includes('-u') || args.includes('--set-upstream');
	const flag = args.find((a) => a.startsWith('-') && !['-u', '--set-upstream'].includes(a));
	if (flag) return unsupported(s, `git push ${flag}`);
	const pos = args.filter((a) => !a.startsWith('-'));
	const cur = branchName(repo.head);
	const up = repo.upstream[cur];
	const remote = pos[0] ?? up?.remote;
	const branch = pos[1] ?? (up ? up.branch : cur);
	if (!remote) return unsupported(s, '追う枝の無い枝での引数の無い git push');
	const url = repo.remotes[remote];
	if (!url) return unsupported(s, `登録していない遠く ${remote}`);
	const rpath = remotePath(s, root, url);
	const target = s.ext.repos[rpath];
	if (!target) return unsupported(s, `遠くのリポジトリ ${url} が無い`);
	const local = repo.refs[`refs/heads/${branch}`];
	if (!local)
		return fail(
			s,
			`error: src refspec ${branch} does not match any\nerror: failed to push some refs to '${url}'\n`,
			1
		);
	const old = target.refs[`refs/heads/${branch}`];
	let out = '';
	if (setUp && repo.upstream[branch]?.remote !== remote) {
		repo = { ...repo, upstream: { ...repo.upstream, [branch]: { remote, branch } } };
		out = `branch '${branch}' set up to track '${remote}/${branch}'.\n`;
	}
	if (old === local) {
		return fail(withRepo(s, root, repo), 'Everything up-to-date\n', 0, out);
	}
	if (old && !reachable(repo, [local]).has(old)) return unsupported(s, '早送りにならない git push');
	const nextTarget: Repo = withObjects(
		{ ...target, refs: { ...target.refs, [`refs/heads/${branch}`]: local } },
		repo
	);
	repo = { ...repo, refs: { ...repo.refs, [`refs/remotes/${remote}/${branch}`]: local } };
	const line = old
		? `   ${summaryCol(`${abbrev(old)}..${abbrev(local)}`)} ${branch} -> ${branch}\n`
		: ` * ${summaryCol('[new branch]')} ${branch} -> ${branch}\n`;
	let next = withRepo(s, root, repo);
	next = withRepo(next, rpath, nextTarget);
	return fail(next, `To ${url}\n${line}`, 0, out);
};

// 遠くから手元の refs/remotes/<遠く>/ を新しくする。出力（標準エラー）と、新しいリポジトリ
function doFetch(
	s: S,
	root: string,
	repo0: Repo,
	remote: string
): { repo: Repo; err: string } | string {
	const url = repo0.remotes[remote];
	if (!url) return `fatal: '${remote}' does not appear to be a git repository\n`;
	const target = s.ext.repos[remotePath(s, root, url)];
	if (!target) return `fatal: '${url}' does not appear to be a git repository\n`;
	let repo = withObjects(repo0, target);
	const lines: string[] = [];
	for (const ref of Object.keys(target.refs)
		.filter((r) => r.startsWith('refs/heads/'))
		.sort()) {
		const b = branchName(ref);
		const mine = `refs/remotes/${remote}/${b}`;
		const old = repo.refs[mine];
		const now = target.refs[ref];
		if (old === now) continue;
		repo = { ...repo, refs: { ...repo.refs, [mine]: now } };
		const what = old
			? `   ${summaryCol(`${abbrev(old)}..${abbrev(now)}`)}`
			: ` * ${summaryCol('[new branch]')}`;
		lines.push(`${what} ${b.padEnd(10)} -> ${remote}/${b}\n`);
	}
	// 遠くの HEAD を指す <遠く>/HEAD が無ければ作る（git 2.48 からの既定 followRemoteHEAD=create）
	const symName = `refs/remotes/${remote}/HEAD`;
	if (!repo.symrefs[symName] && target.refs[target.head]) {
		repo = {
			...repo,
			symrefs: { ...repo.symrefs, [symName]: `refs/remotes/${remote}/${branchName(target.head)}` }
		};
	}
	const err = lines.length > 0 ? `From ${fetchLabel(url)}\n${lines.join('')}` : '';
	return { repo, err };
}

export const fetchCmd = (ctx: Ctx, args: string[]): R => {
	const { s, root, repo } = ctx;
	const flag = args.find((a) => a.startsWith('-'));
	if (flag) return unsupported(s, `git fetch ${flag}`);
	const remote = args[0] ?? repo.upstream[branchName(repo.head)]?.remote ?? 'origin';
	const r = doFetch(s, root, repo, remote);
	if (typeof r === 'string') return fail(s, r, 128);
	return fail(withRepo(s, root, r.repo), r.err, 0);
};

export const pullCmd = (ctx: Ctx, args: string[]): R => {
	const { s, root } = ctx;
	if (args.length > 0) return unsupported(s, `git pull ${args.join(' ')}`);
	const cur = branchName(ctx.repo.head);
	const up = ctx.repo.upstream[cur];
	if (!up) return unsupported(s, '追う枝の無い枝での git pull');
	const f = doFetch(s, root, ctx.repo, up.remote);
	if (typeof f === 'string') return fail(s, f, 128);
	const repo = f.repo;
	const theirs = repo.refs[`refs/remotes/${up.remote}/${up.branch}`];
	const ours = headCommit(repo);
	if (!theirs || !ours) return unsupported(s, '記録の無い枝での git pull');
	if (reachable(repo, [ours]).has(theirs)) {
		return fail(withRepo(s, root, repo), f.err, 0, 'Already up to date.\n');
	}
	if (!reachable(repo, [theirs]).has(ours)) return unsupported(s, '早送りにならない git pull');
	const fromTree = commitTree(repo, ours);
	const toTree = commitTree(repo, theirs);
	const cs = treeChanges(repo, fromTree, toTree);
	const co = checkout(s.fs, root, repo, fromTree, toTree, ctx.now);
	const next: Repo = { ...repo, index: co.index, refs: { ...repo.refs, [repo.head]: theirs } };
	const out = `Updating ${abbrev(ours)}..${abbrev(theirs)}\nFast-forward\n${cs.length > 0 ? diffStat(cs) : summaryLine(0, 0, 0)}`;
	return fail(withRepo({ ...s, fs: co.fs }, root, next), f.err, 0, out);
};

export const cloneCmd = (s: S, args: string[], now: number): R => {
	const flag = args.find((a) => a.startsWith('-'));
	if (flag) return unsupported(s, `git clone ${flag}`);
	const [url, dirArg] = args;
	if (!url) return unsupported(s, '引数の無い git clone');
	const src = s.ext.repos[resolvePath(s.cwd, url, s.home)];
	if (!src) return fail(s, `fatal: repository '${url}' does not exist\n`, 128);
	const name =
		dirArg ??
		url
			.replace(/\/$/, '')
			.split('/')
			.at(-1)
			?.replace(/\.git$/, '') ??
		'repo';
	const root = resolvePath(s.cwd, name, s.home);
	if (stat(s.fs, root))
		return fail(
			s,
			`fatal: destination path '${name}' already exists and is not an empty directory.\n`,
			128
		);
	if (!isDir(s.fs, root.slice(0, root.lastIndexOf('/')) || '/'))
		return unsupported(s, '深い場所への git clone');
	let fs = mkdir(s.fs, root, now);
	fs = mkdir(fs, `${root}/.git`, now);
	// 遠くの URL は、打った道を今いる場所に足した形で残す（本物と同じく ../ を畳まない）
	const stored = url.startsWith('/') ? url : `${s.cwd}/${url}`;
	const head = src.head;
	const b = branchName(head);
	let repo: Repo = { ...emptyRepo(b), objects: { ...src.objects }, remotes: { origin: stored } };
	const refs: Record<string, string> = {};
	for (const ref of Object.keys(src.refs).filter((r) => r.startsWith('refs/heads/')))
		refs[`refs/remotes/origin/${branchName(ref)}`] = src.refs[ref];
	const tip = src.refs[head];
	if (tip) refs[head] = tip;
	repo = {
		...repo,
		refs,
		symrefs: tip ? { 'refs/remotes/origin/HEAD': `refs/remotes/origin/${b}` } : {},
		upstream: tip ? { [b]: { remote: 'origin', branch: b } } : {}
	};
	const co = checkout(fs, root, repo, null, commitTree(repo, tip ?? null), now);
	repo = { ...repo, index: co.index };
	const next = withRepo({ ...s, fs: co.fs }, root, repo);
	return fail(next, `Cloning into '${name}'...\ndone.\n`, 0);
};

export { findRoot };
