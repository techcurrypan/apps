// 模擬の git の命令。出力とエラーは本物の記録（tools-real/recorded/git-*.json）と一字ずつ合わせる。
// 扱う範囲は docs/tools.md 3.1。範囲の外は「模擬では扱わない」とはっきり返す。
import { isDir, mkdir, remove, resolvePath, stat, writeFile } from '../fs.ts';
import { basicCommands } from '../shell/basic.ts';
import { fail, ok, type Cmd, type Commands } from '../shell/run.ts';
import { branchCmd, mergeCmd, rebaseCmd, revertCmd, switchCmd } from './branch.ts';
import {
	blobData,
	config,
	findRoot,
	ignoreRules,
	ignoredBy,
	longStatus,
	NOT_REPO,
	shortStatus,
	sig,
	unsupported,
	withRepo,
	type Ctx,
	type R,
	type S
} from './common.ts';
import { dateOrder, decoration, graphLines, topoOrder } from './history.ts';
import { cleanMessage, logDate, pretty, type Commit, type GitObject } from './objects.ts';
import { diffStat, filePatch, summaryLine, type FileChange } from './patch.ts';
import { cloneCmd, fetchCmd, pullCmd, pushCmd, remoteCmd } from './remote.ts';
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

export { unsupported };

export const AMBIGUOUS = (spec: string) =>
	`fatal: ambiguous argument '${spec}': unknown revision or path not in the working tree.\nUse '--' to separate paths from revisions, like this:\n'git <command> [<revision>...] -- [<file>...]'\n`;

// ---- 差分の材料 ----

type Side = Map<string, { entry: IndexEntry; data: string }>;

function sideOfTree(repo: Repo, tree: string | null): Side {
	const m: Side = new Map();
	for (const [p, e] of flatten(repo, tree)) m.set(p, { entry: e, data: blobData(repo, e) });
	return m;
}

function sideOfIndex(repo: Repo): Side {
	const m: Side = new Map();
	for (const [p, e] of Object.entries(repo.index)) m.set(p, { entry: e, data: blobData(repo, e) });
	return m;
}

// 作業ツリー（索引にある物だけ。追跡していない物は差分に出ない）
function sideOfWorktree(ctx: Ctx): Side {
	const m: Side = new Map();
	const wt = worktree(ctx.s.fs, ctx.root);
	for (const p of Object.keys(ctx.repo.index)) {
		const w = wt.get(p);
		if (!w) continue;
		const [, id] = store(ctx.repo, { type: 'blob', data: w.data });
		m.set(p, { entry: { id, mode: w.mode }, data: w.data });
	}
	return m;
}

export function changes(a: Side, b: Side, paths?: string[]): FileChange[] {
	const all = [...new Set([...a.keys(), ...b.keys()])].sort();
	const within = (p: string) =>
		!paths || paths.length === 0 || paths.some((q) => p === q || p.startsWith(`${q}/`));
	return all
		.filter(within)
		.map((p) => ({ path: p, a: a.get(p) ?? null, b: b.get(p) ?? null }))
		.filter(
			(c) => !(c.a && c.b && c.a.entry.id === c.b.entry.id && c.a.entry.mode === c.b.entry.mode)
		);
}

export const patchOf = (cs: FileChange[]) => cs.map((c) => filePatch(c.path, c.a, c.b)).join('');

export function treeChanges(repo: Repo, from: string | null, to: string | null, paths?: string[]) {
	return changes(sideOfTree(repo, from), sideOfTree(repo, to), paths);
}

export const createModes = (cs: FileChange[]) =>
	cs
		.map((ch) =>
			!ch.a && ch.b
				? ` create mode ${ch.b.entry.mode} ${ch.path}\n`
				: ch.a && !ch.b
					? ` delete mode ${ch.a.entry.mode} ${ch.path}\n`
					: ch.a && ch.b && ch.a.entry.mode !== ch.b.entry.mode
						? ` mode change ${ch.a.entry.mode} => ${ch.b.entry.mode} ${ch.path}\n`
						: ''
		)
		.join('');

// 変更の統計の最後の行と、作った・消したファイルの行
export function statSummary(cs: FileChange[]): string {
	const stat = diffStat(cs);
	const last = stat.trimEnd().split('\n').at(-1) ?? '';
	return (cs.length > 0 ? `${last}\n` : summaryLine(0, 0, 0)) + createModes(cs);
}

// commit の後に出す要約（[main abc1234] 題 と変更の数）
export function commitSummary(
	repo: Repo,
	id: string,
	opts: { root?: boolean; showDate?: boolean; stat?: boolean } = {}
): string {
	const c = repo.objects[id] as Commit;
	const subject = c.message.split('\n')[0];
	let out = `[${branchName(repo.head)}${opts.root ? ' (root-commit)' : ''} ${abbrev(id)}] ${subject}\n`;
	if (opts.showDate) out += ` Date: ${logDate(c.author)}\n`;
	if (opts.stat === false) return out;
	return out + statSummary(treeChanges(repo, commitTree(repo, c.parents[0] ?? null), c.tree));
}

export function makeCommit(
	ctx: Ctx,
	repo: Repo,
	tree: string,
	parents: string[],
	message: string,
	author = sig(ctx.s, ctx.now)
): [Repo, string] {
	const c: Commit = {
		type: 'commit',
		tree,
		parents,
		author,
		committer: sig(ctx.s, ctx.now),
		message
	};
	return store(repo, c);
}

// ---- 命令 ----

const init = (s: S, args: string[], now: number): R => {
	let branch: string | null = null;
	let dir: string | null = null;
	let bare = false;
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '-b' || a === '--initial-branch') branch = args[++i] ?? null;
		else if (a.startsWith('--initial-branch=')) branch = a.slice('--initial-branch='.length);
		else if (a === '--bare') bare = true;
		else if (a === '-q' || a === '--quiet') continue;
		else if (a.startsWith('-')) return unsupported(s, `git init ${a}`);
		else dir = a;
	}
	const root = dir ? resolvePath(s.cwd, dir, s.home) : s.cwd;
	let fs = s.fs;
	if (!stat(fs, root)) {
		if (!isDir(fs, root.slice(0, root.lastIndexOf('/')) || '/'))
			return unsupported(s, '深い場所への git init');
		fs = mkdir(fs, root, now);
	}
	const gitDir = bare ? root : `${root}/.git`;
	if (s.ext.repos[root]) return ok(s, `Reinitialized existing Git repository in ${gitDir}/\n`);
	if (!bare && !stat(fs, gitDir)) fs = mkdir(fs, gitDir, now);
	const b = branch ?? config(s.fs, s.home, 'init.defaultBranch') ?? 'master';
	const next = withRepo({ ...s, fs }, root, emptyRepo(b, bare));
	return ok(next, `Initialized empty Git repository in ${gitDir}/\n`);
};

const status = (ctx: Ctx, args: string[]): R => {
	const short = args.includes('-s') || args.includes('--short');
	const unknown = args.find((a) => !['-s', '--short'].includes(a));
	if (unknown) return unsupported(ctx.s, `git status ${unknown}`);
	return ok(
		ctx.s,
		short ? shortStatus(ctx.s, ctx.root, ctx.repo) : longStatus(ctx.s, ctx.root, ctx.repo, false)
	);
};

export const relOf = (ctx: Ctx, spec: string): string | null => {
	const abs = resolvePath(ctx.s.cwd, spec, ctx.s.home);
	if (abs === ctx.root) return '';
	return abs.startsWith(`${ctx.root}/`) ? abs.slice(ctx.root.length + 1) : null;
};

const under = (rel: string) => (p: string) => rel === '' || p === rel || p.startsWith(`${rel}/`);

const add = (ctx: Ctx, args: string[]): R => {
	const { s, root, repo } = ctx;
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
	const rules = ignoreRules(s.fs, root);
	const index: Record<string, IndexEntry> = { ...repo.index };
	const unmerged = { ...repo.unmerged };
	let r = repo;
	const targets = all && specs.length === 0 ? ['.'] : specs;
	const matched = new Set<string>();
	const ignored: string[] = [];
	const tracked = (p: string) => p in repo.index || p in repo.unmerged;
	for (const spec of targets) {
		const rp = relOf(ctx, spec);
		if (rp === null) return unsupported(s, 'リポジトリの外の道');
		const hits = [...wt.keys(), ...Object.keys(repo.index), ...Object.keys(repo.unmerged)].filter(
			under(rp)
		);
		const usable = hits.filter((p) => tracked(p) || !ignoredBy(rules, p));
		if (usable.length === 0) {
			if (hits.length > 0) {
				ignored.push(spec);
				continue;
			}
			return fail(s, `fatal: pathspec '${spec}' did not match any files\n`, 128);
		}
		usable.forEach((h) => matched.add(h));
	}
	for (const p of matched) {
		const w = wt.get(p);
		if (w) {
			const [r2, id] = store(r, { type: 'blob', data: w.data });
			r = r2;
			index[p] = { id, mode: w.mode };
		} else delete index[p];
		delete unmerged[p];
	}
	const next = withRepo(s, root, { ...r, index, unmerged });
	if (ignored.length > 0) {
		return fail(
			next,
			`The following paths are ignored by one of your .gitignore files:\n${ignored.join('\n')}\nhint: Use -f if you really want to add them.\nhint: Disable this message with "git config set advice.addIgnoredFile false"\n`,
			1
		);
	}
	return ok(next);
};

// 短い旗の束（-am）をほどく。値を取る旗の値が無ければ、その旗の名前を返す
function parseFlags(
	args: string[],
	withValue: string[]
): { flags: Map<string, string[]>; rest: string[] } | string {
	const flags = new Map<string, string[]>();
	const rest: string[] = [];
	const put = (k: string, v: string) => flags.set(k, [...(flags.get(k) ?? []), v]);
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a.startsWith('--')) {
			const eq = a.indexOf('=');
			const k = eq >= 0 ? a.slice(0, eq) : a;
			if (withValue.includes(k)) {
				if (eq >= 0) put(k, a.slice(eq + 1));
				else if (i + 1 < args.length) put(k, args[++i]);
				else return k;
			} else put(k, '');
		} else if (a.startsWith('-') && a.length > 1) {
			for (let j = 1; j < a.length; j++) {
				const k = `-${a[j]}`;
				if (withValue.includes(k)) {
					const inline = a.slice(j + 1);
					if (inline) put(k, inline);
					else if (i + 1 < args.length) put(k, args[++i]);
					else return k;
					break;
				}
				put(k, '');
			}
		} else rest.push(a);
	}
	return { flags, rest };
}

const commit = (ctx: Ctx, args: string[]): R => {
	const { s, root } = ctx;
	let repo = ctx.repo;
	const parsed = parseFlags(args, ['-m', '--message']);
	if (typeof parsed === 'string')
		return fail(s, `error: switch \`${parsed.replace(/^-+/, '')}' requires a value\n`, 129);
	const known = ['-m', '--message', '-a', '--all'];
	const other = [...parsed.flags.keys()].find((k) => !known.includes(k));
	if (other || parsed.rest.length > 0)
		return unsupported(s, `git commit ${other ?? parsed.rest[0]}`);
	if (Object.keys(repo.unmerged).length > 0) {
		const list = Object.keys(repo.unmerged)
			.sort()
			.map((p) => `U\t${p}\n`)
			.join('');
		return fail(
			s,
			"error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.\n",
			128,
			list
		);
	}
	const msgs = [...(parsed.flags.get('-m') ?? []), ...(parsed.flags.get('--message') ?? [])];
	if (msgs.length === 0 && !repo.merging)
		return unsupported(s, '説明文の無い git commit（エディタを開く形）');
	if (parsed.flags.has('-a') || parsed.flags.has('--all')) {
		const wt = worktree(s.fs, root);
		const index = { ...repo.index };
		for (const p of Object.keys(index)) {
			const w = wt.get(p);
			if (!w) delete index[p];
			else {
				const [r2, id] = store(repo, { type: 'blob', data: w.data });
				repo = r2;
				index[p] = { id, mode: w.mode };
			}
		}
		repo = { ...repo, index };
	}
	const parent = headCommit(repo);
	const [r1, tree] = writeTree(repo);
	const nothing =
		!repo.merging &&
		(tree === commitTree(repo, parent) ||
			(parent === null && Object.keys(repo.index).length === 0));
	if (nothing) {
		const st = withRepo(s, root, repo);
		return fail(st, '', 1, longStatus(st, root, repo, true));
	}
	const message = msgs.length > 0 ? cleanMessage(msgs.join('\n\n')) : (repo.merging?.message ?? '');
	const parents = [...(parent ? [parent] : []), ...(repo.merging ? [repo.merging.head] : [])];
	const [r2, id] = makeCommit(ctx, r1, tree, parents, message);
	const r3: Repo = { ...r2, refs: { ...r2.refs, [repo.head]: id }, merging: null };
	const summary = commitSummary(r3, id, { root: parent === null, stat: parents.length < 2 });
	return ok(withRepo(s, root, r3), summary);
};

type LogOpts = {
	oneline: boolean;
	graph: boolean;
	all: boolean;
	patch: boolean;
	stat: boolean;
	max: number;
	revs: string[];
	paths: string[];
};

function parseLog(args: string[]): LogOpts | string {
	const o: LogOpts = {
		oneline: false,
		graph: false,
		all: false,
		patch: false,
		stat: false,
		max: Infinity,
		revs: [],
		paths: []
	};
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '--') {
			o.paths = args.slice(i + 1);
			break;
		}
		if (a === '--oneline') o.oneline = true;
		else if (a === '--graph') o.graph = true;
		else if (a === '--all') o.all = true;
		else if (a === '-p' || a === '--patch') o.patch = true;
		else if (a === '--stat') o.stat = true;
		else if (a === '-n') o.max = Number(args[++i]);
		else if (/^-n\d+$/.test(a)) o.max = Number(a.slice(2));
		else if (/^-\d+$/.test(a)) o.max = Number(a.slice(1));
		else if (a.startsWith('-')) return a;
		else o.revs.push(a);
	}
	return o;
}

export function medium(repo: Repo, id: string, deco: string): string {
	const c = repo.objects[id] as Commit;
	const body = c.message
		.replace(/\n$/, '')
		.split('\n')
		.map((l) => `    ${l}`)
		.join('\n');
	const merge = c.parents.length > 1 ? `Merge: ${c.parents.map(abbrev).join(' ')}\n` : '';
	return `commit ${id}${deco}\n${merge}Author: ${c.author.name} <${c.author.email}>\nDate:   ${logDate(c.author)}\n\n${body}\n`;
}

const log = (ctx: Ctx, args: string[]): R => {
	const { s, repo } = ctx;
	const o = parseLog(args);
	if (typeof o === 'string') return unsupported(s, `git log ${o}`);
	if (o.graph && !o.oneline) return unsupported(s, 'git log --graph（--oneline を付けない形）');
	const tips: string[] = [];
	for (const r of o.revs) {
		const id = resolveRev(repo, r);
		if (!id) return fail(s, AMBIGUOUS(r), 128);
		tips.push(id);
	}
	if (o.all) {
		const h = headCommit(repo);
		if (h) tips.push(h);
		tips.push(...Object.values(repo.refs));
	}
	if (tips.length === 0) {
		const h = headCommit(repo);
		if (!h)
			return fail(
				s,
				`fatal: your current branch '${branchName(repo.head)}' does not have any commits yet\n`,
				128
			);
		tips.push(h);
	}
	const uniq = tips.filter((t, i) => tips.indexOf(t) === i);
	let order = o.graph ? topoOrder(repo, uniq) : dateOrder(repo, uniq);
	const changeOf = (id: string) => {
		const c = repo.objects[id] as Commit;
		return treeChanges(repo, commitTree(repo, c.parents[0] ?? null), c.tree, o.paths);
	};
	if (o.paths.length > 0) order = order.filter((id) => changeOf(id).length > 0);
	order = order.slice(0, o.max);
	const graph = o.graph ? graphLines(repo, order) : null;
	const parts = order.map((id, k) => {
		const c = repo.objects[id] as Commit;
		const deco = decoration(repo, id, repo.symrefs);
		let text = o.oneline
			? `${abbrev(id)}${deco} ${c.message.split('\n')[0]}\n`
			: medium(repo, id, deco);
		const extra = o.patch ? patchOf(changeOf(id)) : o.stat ? diffStat(changeOf(id)) : '';
		if (extra) text += (o.oneline ? '' : '\n') + extra;
		if (graph) text = graph[k].prefix + text + graph[k].after.map((l) => `${l}\n`).join('');
		return text;
	});
	return ok(s, o.oneline ? parts.join('') : parts.join('\n'));
};

const catFile = (ctx: Ctx, args: string[]): R => {
	const { s, repo } = ctx;
	const [flag, spec] = args;
	if (!['-t', '-p', '-s'].includes(flag ?? '') || spec === undefined) {
		return unsupported(s, `git cat-file ${args.join(' ')}`);
	}
	const id = resolveRev(repo, spec);
	const o: GitObject | undefined = id ? repo.objects[id] : undefined;
	if (!id || !o) return fail(s, `fatal: Not a valid object name ${spec}\n`, 128);
	if (flag === '-t') return ok(s, `${o.type}\n`);
	if (flag === '-s') return ok(s, `${new TextEncoder().encode(pretty(o)).length}\n`);
	return ok(s, pretty(o));
};

const diff = (ctx: Ctx, args: string[]): R => {
	const { s, repo } = ctx;
	const staged = args.includes('--staged') || args.includes('--cached');
	const dash = args.indexOf('--');
	const paths = dash >= 0 ? args.slice(dash + 1) : [];
	const pos = (dash >= 0 ? args.slice(0, dash) : args).filter((a) => !a.startsWith('-'));
	const flag = args.find((a) => a.startsWith('-') && !['--staged', '--cached', '--'].includes(a));
	if (flag) return unsupported(s, `git diff ${flag}`);
	if (Object.keys(repo.unmerged).length > 0 && !staged && pos.length === 0)
		return unsupported(s, '衝突の途中の git diff');
	const ids: string[] = [];
	for (const p of pos) {
		const id = resolveRev(repo, p);
		if (!id) return fail(s, AMBIGUOUS(p), 128);
		ids.push(id);
	}
	let cs: FileChange[];
	if (ids.length === 2)
		cs = treeChanges(repo, commitTree(repo, ids[0]), commitTree(repo, ids[1]), paths);
	else if (ids.length === 1)
		cs = changes(sideOfTree(repo, commitTree(repo, ids[0])), sideOfWorktree(ctx), paths);
	else if (staged)
		cs = changes(sideOfTree(repo, commitTree(repo, headCommit(repo))), sideOfIndex(repo), paths);
	else cs = changes(sideOfIndex(repo), sideOfWorktree(ctx), paths);
	return ok(s, patchOf(cs));
};

const show = (ctx: Ctx, args: string[]): R => {
	const { s, repo } = ctx;
	const statOnly = args.includes('--stat');
	const flag = args.find((a) => a.startsWith('-') && a !== '--stat');
	if (flag) return unsupported(s, `git show ${flag}`);
	const spec = args.find((a) => !a.startsWith('-')) ?? 'HEAD';
	const colon = spec.indexOf(':');
	if (colon >= 0) {
		const id = resolveRev(repo, spec.slice(0, colon) || 'HEAD');
		const path = spec.slice(colon + 1);
		if (!id) return fail(s, AMBIGUOUS(spec), 128);
		const e = flatten(repo, commitTree(repo, id)).get(path);
		if (!e)
			return fail(s, `fatal: path '${path}' does not exist in '${spec.slice(0, colon)}'\n`, 128);
		return ok(s, blobData(repo, e));
	}
	const id = resolveRev(repo, spec);
	if (!id) return fail(s, AMBIGUOUS(spec), 128);
	const o: GitObject | undefined = repo.objects[id];
	if (o?.type !== 'commit') return ok(s, o ? pretty(o) : '');
	const cs = treeChanges(repo, commitTree(repo, o.parents[0] ?? null), o.tree);
	const extra = statOnly ? diffStat(cs) : patchOf(cs);
	return ok(s, medium(repo, id, decoration(repo, id, repo.symrefs)) + (extra ? `\n${extra}` : ''));
};

const restore = (ctx: Ctx, args: string[]): R => {
	const { s, root, repo } = ctx;
	const staged = args.includes('--staged') || args.includes('-S');
	const flag = args.find((a) => a.startsWith('-') && !['--staged', '-S'].includes(a));
	if (flag) return unsupported(s, `git restore ${flag}`);
	const specs = args.filter((a) => !a.startsWith('-'));
	if (specs.length === 0) return fail(s, 'fatal: you must specify path(s) to restore\n', 128);
	const head = flatten(repo, commitTree(repo, headCommit(repo)));
	const index: Record<string, IndexEntry> = { ...repo.index };
	let fs = s.fs;
	for (const spec of specs) {
		const rp = relOf(ctx, spec);
		if (rp === null) return unsupported(s, 'リポジトリの外の道');
		const known = staged
			? [...new Set([...head.keys(), ...Object.keys(index)])]
			: Object.keys(index);
		const hits = known.filter(under(rp));
		if (hits.length === 0)
			return fail(s, `error: pathspec '${spec}' did not match any file(s) known to git\n`, 1);
		for (const p of hits) {
			if (staged) {
				const h = head.get(p);
				if (h) index[p] = h;
				else delete index[p];
			} else {
				const e = index[p];
				fs = writeFile(
					fs,
					`${root}/${p}`,
					blobData(repo, e),
					ctx.now,
					e.mode === '100755' ? 0o755 : 0o644
				);
			}
		}
	}
	return ok(withRepo({ ...s, fs }, root, { ...repo, index }));
};

const rm = (ctx: Ctx, args: string[]): R => {
	const { s, root, repo } = ctx;
	const cached = args.includes('--cached');
	const flag = args.find((a) => a.startsWith('-') && a !== '--cached');
	if (flag) return unsupported(s, `git rm ${flag}`);
	const index = { ...repo.index };
	let fs = s.fs;
	let out = '';
	for (const spec of args.filter((a) => !a.startsWith('-'))) {
		const rp = relOf(ctx, spec);
		if (rp === null) return unsupported(s, 'リポジトリの外の道');
		const hits = Object.keys(index).filter(under(rp));
		if (hits.length === 0)
			return fail(s, `fatal: pathspec '${spec}' did not match any files\n`, 128);
		for (const p of hits) {
			delete index[p];
			if (!cached) fs = remove(fs, `${root}/${p}`);
			out += `rm '${p}'\n`;
		}
	}
	return ok(withRepo({ ...s, fs }, root, { ...repo, index }), out);
};

const checkIgnore = (ctx: Ctx, args: string[]): R => {
	const { s, root } = ctx;
	const verbose = args.includes('-v') || args.includes('--verbose');
	const flag = args.find((a) => a.startsWith('-') && !['-v', '--verbose'].includes(a));
	if (flag) return unsupported(s, `git check-ignore ${flag}`);
	const rules = ignoreRules(s.fs, root);
	let out = '';
	for (const spec of args.filter((a) => !a.startsWith('-'))) {
		const rp = relOf(ctx, spec);
		if (rp === null) return unsupported(s, 'リポジトリの外の道');
		const r = ignoredBy(rules, rp);
		if (r) out += verbose ? `.gitignore:${r.line}:${r.pattern}\t${spec}\n` : `${spec}\n`;
	}
	return { state: s, out, err: '', code: out ? 0 : 1 };
};

type Sub = (ctx: Ctx, args: string[]) => R;
// 呼ばれたときに作る（branch.ts・remote.ts と互いに読み込むため）
const subs = (): Record<string, Sub> => ({
	status,
	add,
	commit,
	log,
	'cat-file': catFile,
	diff,
	show,
	restore,
	rm,
	'check-ignore': checkIgnore,
	branch: branchCmd,
	switch: switchCmd,
	merge: mergeCmd,
	rebase: rebaseCmd,
	revert: revertCmd,
	remote: remoteCmd,
	push: pushCmd,
	fetch: fetchCmd,
	pull: pullCmd
});

const git: Cmd<GitExt> = (s, args, io) => {
	const [sub, ...rest] = args;
	if (sub === undefined) return unsupported(s, '引数の無い git');
	if (sub === 'init') return init(s, rest, io.now);
	if (sub === 'clone') return cloneCmd(s, rest, io.now);
	const root = findRoot(s);
	const fn = subs()[sub];
	if (!fn) return root === null ? fail(s, NOT_REPO, 128) : unsupported(s, `git ${sub}`);
	if (root === null) return fail(s, NOT_REPO, 128);
	return fn({ s, root, repo: s.ext.repos[root], now: io.now }, rest);
};

export function gitCommands(): Commands<GitExt> {
	return { ...basicCommands<GitExt>(), git };
}
