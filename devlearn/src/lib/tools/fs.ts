// 模擬のファイルの木。道（絶対パス）→ 物 の表で、値として扱う（書き換えずに新しい木を返す）。

// 作る物の権限は、利用者ごとの組がある Ubuntu の既定の umask 002 から決まる（本物の記録と同じ）
export const UMASK = 0o002;
export const FILE_MODE = 0o666 & ~UMASK;
export const DIR_MODE = 0o777 & ~UMASK;

// owner が無い物は、家（/home/learner）の下なら learner、外なら root の物（組は持ち主と同じ名前）
export type FileNode = { kind: 'file'; data: string; mode: number; mtime: number; owner?: string };
export type DirNode = { kind: 'dir'; mode: number; mtime: number; owner?: string };
export type FsNode = FileNode | DirNode;
export type Fs = Readonly<Record<string, FsNode>>;

export function emptyFs(): Fs {
	return { '/': { kind: 'dir', mode: 0o755, mtime: 0 } };
}

export function resolvePath(cwd: string, p: string, home: string): string {
	let path = p;
	if (path === '~' || path.startsWith('~/')) path = home + path.slice(1);
	const parts = (path.startsWith('/') ? path : `${cwd}/${path}`).split('/');
	const out: string[] = [];
	for (const part of parts) {
		if (part === '' || part === '.') continue;
		if (part === '..') out.pop();
		else out.push(part);
	}
	return '/' + out.join('/');
}

export function parentOf(path: string): string {
	const i = path.lastIndexOf('/');
	return i <= 0 ? '/' : path.slice(0, i);
}

export function baseName(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1);
}

export function ownerOf(fs: Fs, path: string): string {
	const n = fs[path];
	if (n?.owner) return n.owner;
	return path === '/home/learner' || path.startsWith('/home/learner/') ? 'learner' : 'root';
}

export function stat(fs: Fs, path: string): FsNode | null {
	return fs[path] ?? null;
}

export function isDir(fs: Fs, path: string): boolean {
	return fs[path]?.kind === 'dir';
}

export function readFile(fs: Fs, path: string): string | null {
	const n = fs[path];
	return n?.kind === 'file' ? n.data : null;
}

export function writeFile(fs: Fs, path: string, data: string, mtime: number, mode?: number): Fs {
	if (!isDir(fs, parentOf(path))) throw new Error(`no parent: ${path}`);
	const old = fs[path];
	if (old?.kind === 'dir') throw new Error(`is a directory: ${path}`);
	const node: FileNode = { kind: 'file', data, mode: mode ?? old?.mode ?? FILE_MODE, mtime };
	const next: Fs = { ...fs, [path]: node };
	return old ? next : touchParent(next, path, mtime);
}

// 中の物が増えた・減ったとき、入れ物の時刻を変える（本物の OS と同じ）
function touchParent(fs: Fs, path: string, mtime: number): Fs {
	const p = parentOf(path);
	const dir = fs[p];
	return dir ? { ...fs, [p]: { ...dir, mtime } } : fs;
}

export function mkdir(fs: Fs, path: string, mtime: number, mode = DIR_MODE): Fs {
	if (!isDir(fs, parentOf(path))) throw new Error(`no parent: ${path}`);
	if (fs[path]) throw new Error(`exists: ${path}`);
	return touchParent({ ...fs, [path]: { kind: 'dir', mode, mtime } }, path, mtime);
}

// 名前の並びは、C.UTF-8 と同じバイトの順
const byteOrder = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function listDir(fs: Fs, dir: string): string[] {
	const prefix = dir === '/' ? '/' : `${dir}/`;
	return Object.keys(fs)
		.filter((p) => p !== '/' && p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
		.map((p) => p.slice(prefix.length))
		.sort(byteOrder);
}

// 下の物も全て消す。時刻を渡すと、親の時刻をその時刻にする
export function remove(fs: Fs, path: string, mtime?: number): Fs {
	const out: Record<string, FsNode> = {};
	for (const [p, n] of Object.entries(fs)) {
		if (p === path || p.startsWith(`${path}/`)) continue;
		out[p] = n;
	}
	return mtime === undefined ? out : touchParent(out, path, mtime);
}

// path の下の全てのファイル（道の順）
export function walkFiles(fs: Fs, dir: string): string[] {
	const prefix = dir === '/' ? '/' : `${dir}/`;
	return Object.keys(fs)
		.filter((p) => p.startsWith(prefix) && fs[p].kind === 'file')
		.sort(byteOrder);
}
