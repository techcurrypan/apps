// 模擬の git のリポジトリ：物の置き場・索引（ステージ）・枝・HEAD。値として扱う。
import { readFile, walkFiles, type Fs } from '../fs.ts';
import { idOf, sortEntries, type GitObject, type Tree, type TreeEntry } from './objects.ts';

export type Mode = '100644' | '100755';
export type IndexEntry = { id: string; mode: Mode };
export type Repo = {
	objects: Readonly<Record<string, GitObject>>;
	index: Readonly<Record<string, IndexEntry>>; // リポジトリの根からの道
	head: string; // HEAD が指す枝（refs/heads/main など）
	refs: Readonly<Record<string, string>>;
};
export type GitExt = { repos: Readonly<Record<string, Repo>> };

export const emptyRepo = (branch: string): Repo => ({
	objects: {},
	index: {},
	head: `refs/heads/${branch}`,
	refs: {}
});

export function store(repo: Repo, o: GitObject): [Repo, string] {
	const id = idOf(o);
	if (repo.objects[id]) return [repo, id];
	return [{ ...repo, objects: { ...repo.objects, [id]: o } }, id];
}

export const branchName = (ref: string) => ref.replace(/^refs\/heads\//, '');

export function headCommit(repo: Repo): string | null {
	return repo.refs[repo.head] ?? null;
}

// 作業ツリーのファイル（.git の下を除く）。道 → 中身と種類
export function worktree(fs: Fs, root: string): Map<string, { data: string; mode: Mode }> {
	const out = new Map<string, { data: string; mode: Mode }>();
	const prefix = root === '/' ? '/' : `${root}/`;
	for (const p of walkFiles(fs, root)) {
		const rel = p.slice(prefix.length);
		if (rel === '.git' || rel.startsWith('.git/')) continue;
		const node = fs[p];
		if (node.kind !== 'file') continue;
		out.set(rel, { data: readFile(fs, p) ?? '', mode: node.mode & 0o111 ? '100755' : '100644' });
	}
	return out;
}

// tree を平らにする。道 → 索引の 1 件
export function flatten(repo: Repo, treeId: string | null, prefix = ''): Map<string, IndexEntry> {
	const out = new Map<string, IndexEntry>();
	if (!treeId) return out;
	const t = repo.objects[treeId];
	if (t?.type !== 'tree') return out;
	for (const e of t.entries) {
		const path = prefix + e.name;
		if (e.mode === '40000') for (const [k, v] of flatten(repo, e.id, `${path}/`)) out.set(k, v);
		else out.set(path, { id: e.id, mode: e.mode });
	}
	return out;
}

export function commitTree(repo: Repo, commitId: string | null): string | null {
	if (!commitId) return null;
	const c = repo.objects[commitId];
	return c?.type === 'commit' ? c.tree : null;
}

// 索引から tree を作って置く
export function writeTree(repo: Repo): [Repo, string] {
	type Dir = { files: TreeEntry[]; dirs: Map<string, Dir> };
	const rootDir: Dir = { files: [], dirs: new Map() };
	for (const [path, e] of Object.entries(repo.index)) {
		const parts = path.split('/');
		let d = rootDir;
		for (const part of parts.slice(0, -1)) {
			if (!d.dirs.has(part)) d.dirs.set(part, { files: [], dirs: new Map() });
			d = d.dirs.get(part) as Dir;
		}
		d.files.push({ mode: e.mode, name: parts.at(-1) ?? '', id: e.id });
	}
	let r = repo;
	const build = (d: Dir): string => {
		const entries: TreeEntry[] = [...d.files];
		for (const [name, sub] of d.dirs) entries.push({ mode: '40000', name, id: build(sub) });
		const tree: Tree = { type: 'tree', entries: sortEntries(entries) };
		const [r2, id] = store(r, tree);
		r = r2;
		return id;
	};
	const id = build(rootDir);
	return [r, id];
}

export const abbrev = (id: string) => id.slice(0, 7);

// 版の名前を ID に解く：HEAD・枝・ID（4 字以上の頭）・^ ~ ^{tree}
export function resolveRev(repo: Repo, spec: string): string | null {
	const m = /^(.*?)((?:\^\{tree\}|\^\d*|~\d*)*)$/.exec(spec);
	if (!m) return null;
	const [, baseSpec, suffix] = m;
	let id: string | null = null;
	if (baseSpec === 'HEAD' || baseSpec === '@') id = headCommit(repo);
	else if (repo.refs[`refs/heads/${baseSpec}`]) id = repo.refs[`refs/heads/${baseSpec}`];
	else if (repo.refs[baseSpec]) id = repo.refs[baseSpec];
	else if (repo.refs[`refs/remotes/${baseSpec}`]) id = repo.refs[`refs/remotes/${baseSpec}`];
	else if (/^[0-9a-f]{4,40}$/.test(baseSpec)) {
		const hits = Object.keys(repo.objects).filter((k) => k.startsWith(baseSpec));
		id = hits.length === 1 ? hits[0] : null;
	}
	if (!id) return null;
	for (const s of suffix.match(/\^\{tree\}|\^\d*|~\d*/g) ?? []) {
		if (s === '^{tree}') {
			const o: GitObject | undefined = repo.objects[id];
			id = o?.type === 'commit' ? o.tree : o?.type === 'tree' ? id : null;
		} else {
			const n = s.length > 1 ? Number(s.slice(1)) : 1;
			const steps = s.startsWith('~') ? n : 1;
			const nth = s.startsWith('^') ? n : 1;
			for (let i = 0; i < steps && id; i++) {
				const o: GitObject | undefined = repo.objects[id];
				id = o?.type === 'commit' ? (o.parents[nth - 1] ?? null) : null;
			}
		}
		if (!id) return null;
	}
	return id;
}
