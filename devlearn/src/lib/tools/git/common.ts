// 模擬の git の命令が共に使う部品：リポジトリを探す・設定を読む・無視の規則・状態の見せ方・
// tree を作業ツリーへ書き出す。
import { isDir, mkdir, parentOf, readFile, remove, writeFile, type Fs } from '../fs.ts';
import { fail, type CmdResult, type ShellState } from '../shell/run.ts';
import type { GitObject, Sig } from './objects.ts';
import { reachable } from './history.ts';
import {
	branchName,
	commitTree,
	flatten,
	headCommit,
	store,
	worktree,
	type GitExt,
	type IndexEntry,
	type Repo
} from './repo.ts';

export type S = ShellState<GitExt>;
export type R = CmdResult<GitExt>;
export type Ctx = { s: S; root: string; repo: Repo; now: number };

export const NOT_REPO = 'fatal: not a git repository (or any of the parent directories): .git\n';

export function unsupported(s: S, what: string): R {
	return fail(s, `（模擬の git は「${what}」を扱わない。このレッスンで使う形で打つ）\n`, 1);
}

export function findRoot(s: S): string | null {
	let p = s.cwd;
	for (;;) {
		const r = s.ext.repos[p];
		if (r && !r.bare) return p;
		if (p === '/') return null;
		p = p.slice(0, p.lastIndexOf('/')) || '/';
	}
}

export const withRepo = (s: S, root: string, repo: Repo): S => ({
	...s,
	ext: { ...s.ext, repos: { ...s.ext.repos, [root]: repo } }
});

// ~/.gitconfig の値（[section] key = value の形だけ読む）
export function config(fs: Fs, home: string, key: string): string | null {
	const text = readFile(fs, `${home}/.gitconfig`);
	if (!text) return null;
	const [sec, name] = key.split('.');
	let cur = '';
	for (const line of text.split('\n')) {
		const h = /^\s*\[([^\]]+)\]\s*$/.exec(line);
		if (h) cur = h[1].trim();
		const kv = /^\s*([A-Za-z]+)\s*=\s*(.*)$/.exec(line);
		if (kv && cur.toLowerCase() === sec.toLowerCase() && kv[1].toLowerCase() === name.toLowerCase())
			return kv[2].trim();
	}
	return null;
}

export function sig(s: S, now: number): Sig {
	return {
		name: config(s.fs, s.home, 'user.name') ?? s.user,
		email: config(s.fs, s.home, 'user.email') ?? `${s.user}@localhost`,
		time: now,
		tz: '+0900'
	};
}

// リポジトリの根からの道を、今いる場所からの道にする
export function rel(root: string, cwd: string, path: string): string {
	if (!cwd.startsWith(root) || cwd === root) return path;
	const from = cwd.slice(root.length + 1).split('/');
	const to = path.split('/');
	let i = 0;
	while (i < from.length && i < to.length - 1 && from[i] === to[i]) i++;
	return [...from.slice(i).map(() => '..'), ...to.slice(i)].join('/');
}

export const blobData = (repo: Repo, e: IndexEntry | undefined): string => {
	const o: GitObject | undefined = e ? repo.objects[e.id] : undefined;
	return o?.type === 'blob' ? o.data : '';
};

// ---- 無視の規則（根の .gitignore だけ） ----

type Rule = { line: number; pattern: string; dirOnly: boolean; anchored: boolean; re: RegExp };

function globToRe(glob: string): string {
	let re = '';
	for (const ch of glob) {
		if (ch === '*') re += '[^/]*';
		else if (ch === '?') re += '[^/]';
		else re += ch.replace(/[.+^${}()|[\]\\]/g, (m) => `\\${m}`);
	}
	return re;
}

export function ignoreRules(fs: Fs, root: string): Rule[] {
	const text = readFile(fs, `${root}/.gitignore`);
	if (text === null) return [];
	const rules: Rule[] = [];
	text.split('\n').forEach((raw, i) => {
		const pattern = raw.replace(/\s+$/, '');
		if (pattern === '' || pattern.startsWith('#')) return;
		let p = pattern;
		const dirOnly = p.endsWith('/');
		if (dirOnly) p = p.slice(0, -1);
		const anchored = p.includes('/');
		if (p.startsWith('/')) p = p.slice(1);
		rules.push({ line: i + 1, pattern, dirOnly, anchored, re: new RegExp(`^${globToRe(p)}$`) });
	});
	return rules;
}

// 道が無視されるか。当たった規則と、当たった道（場所ごと当たったときはその場所）を返す
export function ignoredBy(rules: Rule[], path: string): Rule | null {
	const parts = path.split('/');
	let hit: Rule | null = null;
	for (let k = 1; k <= parts.length; k++) {
		const sub = parts.slice(0, k).join('/');
		const isDirPart = k < parts.length;
		for (const r of rules) {
			if (r.dirOnly && !isDirPart) continue;
			const target = r.anchored ? sub : parts[k - 1];
			if (r.re.test(target)) hit = r;
		}
		if (hit && isDirPart) return hit;
	}
	return hit;
}

// 追う枝との差（git status の 2 行目）
export function aheadBehind(repo: Repo, a: string, b: string): [number, number] {
	const ra = reachable(repo, [a]);
	const rb = reachable(repo, [b]);
	return [[...ra].filter((x) => !rb.has(x)).length, [...rb].filter((x) => !ra.has(x)).length];
}

export function tracking(repo: Repo): string {
	const up = repo.upstream[branchName(repo.head)];
	const mine = headCommit(repo);
	if (!up || !mine) return '';
	const name = `${up.remote}/${up.branch}`;
	const theirs = repo.refs[`refs/remotes/${name}`];
	if (!theirs) return '';
	const [ahead, behind] = aheadBehind(repo, mine, theirs);
	const c = (n: number) => `${n} commit${n === 1 ? '' : 's'}`;
	if (ahead === 0 && behind === 0) return `Your branch is up to date with '${name}'.\n\n`;
	if (behind === 0)
		return `Your branch is ahead of '${name}' by ${c(ahead)}.\n  (use "git push" to publish your local commits)\n\n`;
	if (ahead === 0)
		return `Your branch is behind '${name}' by ${c(behind)}, and can be fast-forwarded.\n  (use "git pull" to update your local branch)\n\n`;
	return `Your branch and '${name}' have diverged,\nand have ${ahead} and ${behind} different commits each, respectively.\n  (use "git pull" if you want to integrate the remote branch with yours)\n\n`;
}

// ---- 状態 ----

export type Change = { path: string; kind: 'new' | 'modified' | 'deleted' };
export type Status = {
	staged: Change[];
	unstaged: Change[];
	unmerged: string[];
	untracked: string[];
};

export function computeStatus(s: S, root: string, repo: Repo): Status {
	const head = flatten(repo, commitTree(repo, headCommit(repo)));
	const index = new Map(Object.entries(repo.index));
	const unmerged = Object.keys(repo.unmerged).sort();
	const wt = worktree(s.fs, root);
	const staged: Change[] = [];
	const unstaged: Change[] = [];
	const paths = [...new Set([...head.keys(), ...index.keys()])].sort();
	for (const p of paths) {
		if (repo.unmerged[p]) continue;
		const h = head.get(p);
		const i = index.get(p);
		if (!h && i) staged.push({ path: p, kind: 'new' });
		else if (h && !i) staged.push({ path: p, kind: 'deleted' });
		else if (h && i && (h.id !== i.id || h.mode !== i.mode))
			staged.push({ path: p, kind: 'modified' });
	}
	for (const [p, i] of [...index].sort(([a], [b]) => (a < b ? -1 : 1))) {
		const w = wt.get(p);
		if (!w) unstaged.push({ path: p, kind: 'deleted' });
		else {
			const [, id] = store(repo, { type: 'blob', data: w.data });
			if (id !== i.id || w.mode !== i.mode) unstaged.push({ path: p, kind: 'modified' });
		}
	}
	// 追跡していないファイル。中に追跡している物が 1 つも無い場所は、場所ごと「dir/」で見せる
	const rules = ignoreRules(s.fs, root);
	const tracked = [...index.keys(), ...unmerged];
	const shown = new Set<string>();
	for (const p of [...wt.keys()].sort()) {
		if (index.has(p) || repo.unmerged[p] || ignoredBy(rules, p)) continue;
		const parts = p.split('/');
		let label = p;
		for (let k = 1; k < parts.length; k++) {
			const dir = parts.slice(0, k).join('/') + '/';
			if (!tracked.some((x) => x.startsWith(dir))) {
				label = dir;
				break;
			}
		}
		shown.add(label);
	}
	return { staged, unstaged, unmerged, untracked: [...shown].sort() };
}

const LABEL: Record<Change['kind'], string> = {
	new: 'new file:   ',
	modified: 'modified:   ',
	deleted: 'deleted:    '
};

export function longStatus(s: S, root: string, repo: Repo, forCommit: boolean): string {
	const st = computeStatus(s, root, repo);
	const unborn = headCommit(repo) === null;
	const r = (p: string) => rel(root, s.cwd, p);
	let out = `On branch ${branchName(repo.head)}\n`;
	out += tracking(repo);
	if (unborn) out += forCommit ? '\nInitial commit\n\n' : '\nNo commits yet\n\n';
	if (repo.merging) {
		if (st.unmerged.length > 0) {
			out +=
				'You have unmerged paths.\n  (fix conflicts and run "git commit")\n  (use "git merge --abort" to abort the merge)\n\n';
		} else
			out +=
				'All conflicts fixed but you are still merging.\n  (use "git commit" to conclude merge)\n\n';
	}
	if (st.staged.length > 0) {
		out += 'Changes to be committed:\n';
		if (!repo.merging) {
			out += unborn
				? '  (use "git rm --cached <file>..." to unstage)\n'
				: '  (use "git restore --staged <file>..." to unstage)\n';
		}
		for (const c of st.staged) out += `\t${LABEL[c.kind]}${r(c.path)}\n`;
		out += '\n';
	}
	if (st.unmerged.length > 0) {
		out += 'Unmerged paths:\n  (use "git add <file>..." to mark resolution)\n';
		for (const p of st.unmerged) out += `\tboth modified:   ${r(p)}\n`;
		out += '\n';
	}
	if (st.unstaged.length > 0) {
		out += 'Changes not staged for commit:\n';
		out += st.unstaged.some((c) => c.kind === 'deleted')
			? '  (use "git add/rm <file>..." to update what will be committed)\n'
			: '  (use "git add <file>..." to update what will be committed)\n';
		out += '  (use "git restore <file>..." to discard changes in working directory)\n';
		for (const c of st.unstaged) out += `\t${LABEL[c.kind]}${r(c.path)}\n`;
		out += '\n';
	}
	if (st.untracked.length > 0) {
		out += 'Untracked files:\n  (use "git add <file>..." to include in what will be committed)\n';
		for (const p of st.untracked) out += `\t${r(p)}\n`;
		out += '\n';
	}
	if (st.staged.length === 0) {
		if (st.unstaged.length > 0 || st.unmerged.length > 0)
			out += 'no changes added to commit (use "git add" and/or "git commit -a")\n';
		else if (st.untracked.length > 0)
			out += 'nothing added to commit but untracked files present (use "git add" to track)\n';
		else if (unborn) out += 'nothing to commit (create/copy files and use "git add" to track)\n';
		else out += 'nothing to commit, working tree clean\n';
	}
	return out;
}

export function shortStatus(s: S, root: string, repo: Repo): string {
	const st = computeStatus(s, root, repo);
	const code = new Map<string, [string, string]>();
	const X: Record<Change['kind'], string> = { new: 'A', modified: 'M', deleted: 'D' };
	for (const c of st.staged) code.set(c.path, [X[c.kind], ' ']);
	for (const c of st.unstaged) {
		const cur = code.get(c.path) ?? [' ', ' '];
		code.set(c.path, [cur[0], X[c.kind]]);
	}
	for (const p of st.unmerged) code.set(p, ['U', 'U']);
	const lines = [...code]
		.sort(([a], [b]) => (a < b ? -1 : 1))
		.map(([p, [x, y]]) => `${x}${y} ${rel(root, s.cwd, p)}\n`);
	return lines.join('') + st.untracked.map((p) => `?? ${rel(root, s.cwd, p)}\n`).join('');
}

// tree の中身を作業ツリーと索引へ書き出す（switch・merge の早送り・clone）。
// 前の tree にあって次に無いファイルは消す。
export function checkout(
	fs0: Fs,
	root: string,
	repo: Repo,
	fromTree: string | null,
	toTree: string | null,
	now: number
): { fs: Fs; index: Record<string, IndexEntry> } {
	const from = flatten(repo, fromTree);
	const to = flatten(repo, toTree);
	let fs = fs0;
	for (const p of from.keys()) {
		if (!to.has(p)) {
			fs = remove(fs, `${root}/${p}`);
		}
	}
	for (const [p, e] of to) {
		const abs = `${root}/${p}`;
		const prev = from.get(p);
		if (prev && prev.id === e.id && readFile(fs, abs) !== null) continue;
		const parts = p.split('/');
		let dir = root;
		for (const part of parts.slice(0, -1)) {
			dir = `${dir}/${part}`;
			if (!isDir(fs, dir)) fs = mkdir(fs, dir, now);
		}
		if (!isDir(fs, parentOf(abs))) continue;
		fs = writeFile(fs, abs, blobData(repo, e), now, e.mode === '100755' ? 0o775 : 0o664);
	}
	return { fs, index: Object.fromEntries(to) };
}
