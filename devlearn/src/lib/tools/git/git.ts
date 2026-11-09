// 模擬の git の命令。出力とエラーは本物の記録（tools-real/recorded/git-*.json）と一字ずつ合わせる。
// 扱う範囲は docs/tools.md 3.1。範囲の外は「模擬では扱わない」とはっきり返す。
import { isDir, mkdir, readFile, resolvePath, stat, type Fs } from '../fs.ts';
import { basicCommands } from '../shell/basic.ts';
import {
	fail,
	ok,
	type Cmd,
	type CmdResult,
	type Commands,
	type ShellState
} from '../shell/run.ts';
import { countChanges } from './diff.ts';
import { cleanMessage, logDate, pretty, type Commit, type GitObject, type Sig } from './objects.ts';
import {
	abbrev,
	branchName,
	commitTree,
	emptyRepo,
	flatten,
	headCommit,
	resolveRev,
	store,
	worktree,
	writeTree,
	type GitExt,
	type IndexEntry,
	type Repo
} from './repo.ts';

type S = ShellState<GitExt>;
type R = CmdResult<GitExt>;

const NOT_REPO = 'fatal: not a git repository (or any of the parent directories): .git\n';

export function unsupported(s: S, what: string): R {
	return fail(s, `（模擬の git は「${what}」を扱わない。このレッスンで使う形で打つ）\n`, 1);
}

function findRoot(s: S): string | null {
	let p = s.cwd;
	for (;;) {
		if (s.ext.repos[p]) return p;
		if (p === '/') return null;
		p = p.slice(0, p.lastIndexOf('/')) || '/';
	}
}

const withRepo = (s: S, root: string, repo: Repo): S => ({
	...s,
	ext: { ...s.ext, repos: { ...s.ext.repos, [root]: repo } }
});

// ~/.gitconfig の値（[section] key = value の形だけ読む）
function config(fs: Fs, home: string, key: string): string | null {
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

function sig(s: S, now: number): Sig {
	return {
		name: config(s.fs, s.home, 'user.name') ?? s.user,
		email: config(s.fs, s.home, 'user.email') ?? `${s.user}@localhost`,
		time: now,
		tz: '+0900'
	};
}

// リポジトリの根からの道を、今いる場所からの道にする
function rel(root: string, cwd: string, path: string): string {
	const from = cwd === root ? [] : cwd.slice(root.length + 1).split('/');
	const to = path.split('/');
	let i = 0;
	while (i < from.length && i < to.length - 1 && from[i] === to[i]) i++;
	return [...from.slice(i).map(() => '..'), ...to.slice(i)].join('/');
}

// ---- status ----

type Change = { path: string; kind: 'new' | 'modified' | 'deleted' };
type Status = { staged: Change[]; unstaged: Change[]; untracked: string[] };

export function computeStatus(s: S, root: string, repo: Repo): Status {
	const head = flatten(repo, commitTree(repo, headCommit(repo)));
	const index = new Map(Object.entries(repo.index));
	const wt = worktree(s.fs, root);
	const staged: Change[] = [];
	const unstaged: Change[] = [];
	const paths = [...new Set([...head.keys(), ...index.keys()])].sort();
	for (const p of paths) {
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
	const shown = new Set<string>();
	for (const p of [...wt.keys()].sort()) {
		if (index.has(p)) continue;
		const parts = p.split('/');
		let label = p;
		for (let k = 1; k < parts.length; k++) {
			const dir = parts.slice(0, k).join('/') + '/';
			if (![...index.keys()].some((x) => x.startsWith(dir))) {
				label = dir;
				break;
			}
		}
		shown.add(label);
	}
	return { staged, unstaged, untracked: [...shown].sort() };
}

const LABEL: Record<Change['kind'], string> = {
	new: 'new file:   ',
	modified: 'modified:   ',
	deleted: 'deleted:    '
};

function longStatus(s: S, root: string, repo: Repo, forCommit: boolean): string {
	const st = computeStatus(s, root, repo);
	const unborn = headCommit(repo) === null;
	const r = (p: string) => rel(root, s.cwd, p);
	let out = `On branch ${branchName(repo.head)}\n`;
	if (unborn) out += forCommit ? '\nInitial commit\n\n' : '\nNo commits yet\n\n';
	if (st.staged.length > 0) {
		out += 'Changes to be committed:\n';
		out += unborn
			? '  (use "git rm --cached <file>..." to unstage)\n'
			: '  (use "git restore --staged <file>..." to unstage)\n';
		for (const c of st.staged) out += `\t${LABEL[c.kind]}${r(c.path)}\n`;
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
		if (st.unstaged.length > 0)
			out += 'no changes added to commit (use "git add" and/or "git commit -a")\n';
		else if (st.untracked.length > 0)
			out += 'nothing added to commit but untracked files present (use "git add" to track)\n';
		else if (unborn) out += 'nothing to commit (create/copy files and use "git add" to track)\n';
		else out += 'nothing to commit, working tree clean\n';
	}
	return out;
}

function shortStatus(s: S, root: string, repo: Repo): string {
	const st = computeStatus(s, root, repo);
	const code = new Map<string, [string, string]>();
	const X: Record<Change['kind'], string> = { new: 'A', modified: 'M', deleted: 'D' };
	for (const c of st.staged) code.set(c.path, [X[c.kind], ' ']);
	for (const c of st.unstaged) {
		const cur = code.get(c.path) ?? [' ', ' '];
		code.set(c.path, [cur[0], X[c.kind]]);
	}
	const lines = [...code]
		.sort(([a], [b]) => (a < b ? -1 : 1))
		.map(([p, [x, y]]) => `${x}${y} ${rel(root, s.cwd, p)}\n`);
	return lines.join('') + st.untracked.map((p) => `?? ${rel(root, s.cwd, p)}\n`).join('');
}

// ---- 命令 ----

const init = (s: S, args: string[]): R => {
	let branch: string | null = null;
	let dir: string | null = null;
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '-b' || a === '--initial-branch') branch = args[++i] ?? null;
		else if (a.startsWith('--initial-branch=')) branch = a.slice('--initial-branch='.length);
		else if (a === '-q' || a === '--quiet') continue;
		else if (a.startsWith('-')) return unsupported(s, `git init ${a}`);
		else dir = a;
	}
	const root = dir ? resolvePath(s.cwd, dir, s.home) : s.cwd;
	let fs = s.fs;
	if (!stat(fs, root)) {
		if (!isDir(fs, root.slice(0, root.lastIndexOf('/')) || '/'))
			return unsupported(s, '深い場所への git init');
		fs = mkdir(fs, root, s.tick);
	}
	if (s.ext.repos[root]) {
		return ok(s, `Reinitialized existing Git repository in ${root}/.git/\n`);
	}
	if (!stat(fs, `${root}/.git`)) fs = mkdir(fs, `${root}/.git`, s.tick);
	const b = branch ?? config(s.fs, s.home, 'init.defaultBranch') ?? 'master';
	const next = withRepo({ ...s, fs }, root, emptyRepo(b));
	return ok(next, `Initialized empty Git repository in ${root}/.git/\n`);
};

const status = (s: S, args: string[], root: string, repo: Repo): R => {
	const short = args.includes('-s') || args.includes('--short');
	const unknown = args.find((a) => !['-s', '--short'].includes(a));
	if (unknown) return unsupported(s, `git status ${unknown}`);
	return ok(s, short ? shortStatus(s, root, repo) : longStatus(s, root, repo, false));
};

const add = (s: S, args: string[], root: string, repo: Repo): R => {
	const specs = args.filter((a) => !a.startsWith('-'));
	const all = args.includes('-A') || args.includes('--all');
	const flag = args.find((a) => a.startsWith('-') && !['-A', '--all'].includes(a));
	if (flag) return unsupported(s, `git add ${flag}`);
	if (specs.length === 0 && !all) {
		return fail(
			s,
			'Nothing specified, nothing added.\nhint: Maybe you wanted to say \'git add .\'?\nhint: Disable this message with "git config set advice.addEmptyPathspec false"\n',
			0
		);
	}
	const wt = worktree(s.fs, root);
	const index: Record<string, IndexEntry> = { ...repo.index };
	let r = repo;
	const targets = all && specs.length === 0 ? ['.'] : specs;
	const matched = new Set<string>();
	for (const spec of targets) {
		const abs = resolvePath(s.cwd, spec, s.home);
		const relp = abs === root ? '' : abs.startsWith(`${root}/`) ? abs.slice(root.length + 1) : null;
		if (relp === null) return unsupported(s, 'リポジトリの外の道');
		const under = (p: string) => relp === '' || p === relp || p.startsWith(`${relp}/`);
		const hits = [...wt.keys(), ...Object.keys(repo.index)].filter(under);
		if (hits.length === 0)
			return fail(s, `fatal: pathspec '${spec}' did not match any files\n`, 128);
		hits.forEach((h) => matched.add(h));
	}
	for (const p of matched) {
		const w = wt.get(p);
		if (w) {
			const [r2, id] = store(r, { type: 'blob', data: w.data });
			r = r2;
			index[p] = { id, mode: w.mode };
		} else delete index[p];
	}
	return ok(withRepo(s, root, { ...r, index }));
};

function statLine(files: number, add: number, del: number): string {
	const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
	let line = ` ${pl(files, 'file changed', 'files changed')}`;
	if (add > 0 || del === 0) line += `, ${pl(add, 'insertion(+)', 'insertions(+)')}`;
	if (del > 0 || add === 0) line += `, ${pl(del, 'deletion(-)', 'deletions(-)')}`;
	return line + '\n';
}

const commit = (s: S, args: string[], root: string, repo: Repo, now: number): R => {
	const msgs: string[] = [];
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '-m' || a === '--message') {
			if (i + 1 >= args.length) return fail(s, "error: switch `m' requires a value\n", 129);
			msgs.push(args[++i]);
		} else if (a.startsWith('-m') && a.length > 2) msgs.push(a.slice(2));
		else return unsupported(s, `git commit ${a}`);
	}
	if (msgs.length === 0) return unsupported(s, '説明文の無い git commit（エディタを開く形）');
	const parent = headCommit(repo);
	const before = flatten(repo, commitTree(repo, parent));
	const [r1, tree] = writeTree(repo);
	if (
		tree === commitTree(repo, parent) ||
		(parent === null && Object.keys(repo.index).length === 0)
	) {
		return fail(s, '', 1, longStatus(s, root, repo, true));
	}
	const message = cleanMessage(msgs.join('\n\n'));
	const who = sig(s, now);
	const c: Commit = {
		type: 'commit',
		tree,
		parents: parent ? [parent] : [],
		author: who,
		committer: who,
		message
	};
	const [r2, id] = store(r1, c);
	const r3: Repo = { ...r2, refs: { ...r2.refs, [repo.head]: id } };
	// 変更の数
	const after = flatten(r3, tree);
	const paths = [...new Set([...before.keys(), ...after.keys()])].sort();
	let files = 0;
	let ins = 0;
	let dels = 0;
	const modes: string[] = [];
	const blob = (rp: Repo, e: IndexEntry | undefined) => {
		const o = e ? rp.objects[e.id] : undefined;
		return o?.type === 'blob' ? o.data : '';
	};
	for (const p of paths) {
		const a = before.get(p);
		const b = after.get(p);
		if (a && b && a.id === b.id && a.mode === b.mode) continue;
		files++;
		const n = countChanges(blob(r3, a), blob(r3, b));
		ins += n.add;
		dels += n.del;
		if (!a && b) modes.push(` create mode ${b.mode} ${p}\n`);
		else if (a && !b) modes.push(` delete mode ${a.mode} ${p}\n`);
		else if (a && b && a.mode !== b.mode) modes.push(` mode change ${a.mode} => ${b.mode} ${p}\n`);
	}
	const subject = message.split('\n')[0];
	const head = `[${branchName(repo.head)}${parent ? '' : ' (root-commit)'} ${abbrev(id)}] ${subject}\n`;
	return ok(withRepo(s, root, r3), head + statLine(files, ins, dels) + modes.join(''));
};

// HEAD と枝の飾り（端末に出すときの git log の既定）
function decoration(repo: Repo, id: string): string {
	const names: string[] = [];
	const heads = Object.keys(repo.refs)
		.filter((r) => r.startsWith('refs/heads/') && repo.refs[r] === id)
		.sort();
	if (repo.refs[repo.head] === id) names.push(`HEAD -> ${branchName(repo.head)}`);
	for (const h of heads) if (h !== repo.head) names.push(branchName(h));
	return names.length > 0 ? ` (${names.join(', ')})` : '';
}

const log = (s: S, args: string[], repo: Repo): R => {
	const oneline = args.includes('--oneline');
	const unknown = args.find((a) => a !== '--oneline');
	if (unknown) return unsupported(s, `git log ${unknown}`);
	let id = headCommit(repo);
	if (!id) {
		return fail(
			s,
			`fatal: your current branch '${branchName(repo.head)}' does not have any commits yet\n`,
			128
		);
	}
	const parts: string[] = [];
	while (id) {
		const c: GitObject | undefined = repo.objects[id];
		if (c?.type !== 'commit') break;
		const deco = decoration(repo, id);
		if (oneline) parts.push(`${abbrev(id)}${deco} ${c.message.split('\n')[0]}\n`);
		else {
			const body = c.message
				.replace(/\n$/, '')
				.split('\n')
				.map((l) => (l === '' ? '' : `    ${l}`))
				.join('\n');
			parts.push(
				`commit ${id}${deco}\nAuthor: ${c.author.name} <${c.author.email}>\nDate:   ${logDate(c.author)}\n\n${body}\n`
			);
		}
		id = c.parents[0] ?? null;
	}
	return ok(s, oneline ? parts.join('') : parts.join('\n'));
};

const catFile = (s: S, args: string[], repo: Repo): R => {
	const [flag, spec] = args;
	if (!['-t', '-p', '-s'].includes(flag ?? '') || spec === undefined) {
		return unsupported(s, `git cat-file ${args.join(' ')}`);
	}
	const id = resolveRev(repo, spec);
	const o = id ? repo.objects[id] : undefined;
	if (!id || !o) return fail(s, `fatal: Not a valid object name ${spec}\n`, 128);
	if (flag === '-t') return ok(s, `${o.type}\n`);
	if (flag === '-s') return ok(s, `${new TextEncoder().encode(pretty(o)).length}\n`);
	return ok(s, pretty(o));
};

const git: Cmd<GitExt> = (s, args, io) => {
	const [sub, ...rest] = args;
	if (sub === undefined) return unsupported(s, '引数の無い git');
	if (sub === 'init') return init(s, rest);
	const root = findRoot(s);
	const known = ['status', 'add', 'commit', 'log', 'cat-file'];
	if (!known.includes(sub)) {
		return root === null ? fail(s, NOT_REPO, 128) : unsupported(s, `git ${sub}`);
	}
	if (root === null) return fail(s, NOT_REPO, 128);
	const repo = s.ext.repos[root];
	switch (sub) {
		case 'status':
			return status(s, rest, root, repo);
		case 'add':
			return add(s, rest, root, repo);
		case 'commit':
			return commit(s, rest, root, repo, io.now);
		case 'log':
			return log(s, rest, repo);
		default:
			return catFile(s, rest, repo);
	}
};

export function gitCommands(): Commands<GitExt> {
	return { ...basicCommands<GitExt>(), git };
}
