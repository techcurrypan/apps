// シェルの実戦の舞台に描く物：作業場所（/home/learner/demo）の木。状態だけから作る純粋な関数。
// 打つ前と打った後を並べ、増えた・消えた・変わった物に印を付ける（screen-design.md 3.4・U-2）。
import { listDir, stat } from '../tools/fs.ts';
import type { ShellState } from '../tools/shell/run.ts';
import { WORK } from '../tools/shell/world.ts';
import { utf8 } from '../tools/sha1.ts';

export type FileRow = {
	path: string; // 作業場所からの道
	name: string;
	depth: number;
	kind: 'file' | 'dir';
	mode: string; // rwxr-xr-x の 9 字
	size: number | null; // ファイルのバイト数（ディレクトリは null）
	text: string | null; // ファイルの中身（ディレクトリは null）
};

export type FilesPicture = { root: string; cwd: string | null; rows: FileRow[] };

const rwx = (mode: number) =>
	[6, 3, 0]
		.map((sh) => {
			const b = (mode >> sh) & 7;
			return (b & 4 ? 'r' : '-') + (b & 2 ? 'w' : '-') + (b & 1 ? 'x' : '-');
		})
		.join('');

export function filesPicture<X>(s: ShellState<X>, root = WORK): FilesPicture {
	const rows: FileRow[] = [];
	const walk = (dir: string, rel: string, depth: number) => {
		for (const name of listDir(s.fs, dir)) {
			// 道具の中身（.git）は木に出さない。git の実戦は自分の図を持つ
			if (name === '.git') continue;
			const abs = `${dir}/${name}`;
			const n = stat(s.fs, abs);
			if (!n) continue;
			const path = rel ? `${rel}/${name}` : name;
			rows.push({
				path,
				name,
				depth,
				kind: n.kind,
				mode: rwx(n.mode),
				size: n.kind === 'file' ? utf8(n.data).length : null,
				text: n.kind === 'file' ? n.data : null
			});
			if (n.kind === 'dir') walk(abs, path, depth + 1);
		}
	};
	walk(root, '', 0);
	const cwd =
		s.cwd === root ? '' : s.cwd.startsWith(`${root}/`) ? s.cwd.slice(root.length + 1) : null;
	return { root, cwd, rows };
}

export type FilesDiff = { added: string[]; removed: string[]; changed: string[] };

export function filesDiff(before: FilesPicture, after: FilesPicture): FilesDiff {
	const b = new Map(before.rows.map((r) => [r.path, r]));
	const a = new Map(after.rows.map((r) => [r.path, r]));
	return {
		added: after.rows.filter((r) => !b.has(r.path)).map((r) => r.path),
		removed: before.rows.filter((r) => !a.has(r.path)).map((r) => r.path),
		changed: after.rows
			.filter((r) => {
				const o = b.get(r.path);
				return o && (o.kind !== r.kind || o.mode !== r.mode || o.text !== r.text);
			})
			.map((r) => r.path)
	};
}
