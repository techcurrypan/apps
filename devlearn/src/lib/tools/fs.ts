// 模擬のファイルの木。道（絶対パス）→ 物 の表で、値として扱う（書き換えずに新しい木を返す）。

export type FileNode = { kind: 'file'; data: string; mode: number; mtime: number };
export type DirNode = { kind: 'dir'; mode: number; mtime: number };
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
	return { ...fs, [path]: { kind: 'file', data, mode: mode ?? old?.mode ?? 0o644, mtime } };
}

export function mkdir(fs: Fs, path: string, mtime: number, mode = 0o755): Fs {
	if (!isDir(fs, parentOf(path))) throw new Error(`no parent: ${path}`);
	if (fs[path]) throw new Error(`exists: ${path}`);
	return { ...fs, [path]: { kind: 'dir', mode, mtime } };
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

// 下の物も全て消す
export function remove(fs: Fs, path: string): Fs {
	const out: Record<string, FsNode> = {};
	for (const [p, n] of Object.entries(fs)) {
		if (p === path || p.startsWith(`${path}/`)) continue;
		out[p] = n;
	}
	return out;
}

// path の下の全てのファイル（道の順）
export function walkFiles(fs: Fs, dir: string): string[] {
	const prefix = dir === '/' ? '/' : `${dir}/`;
	return Object.keys(fs)
		.filter((p) => p.startsWith(prefix) && fs[p].kind === 'file')
		.sort(byteOrder);
}
