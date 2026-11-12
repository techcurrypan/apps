// 実戦の舞台に描く、道具の状態の絵（git 以外）。状態だけから作る純粋な関数（どの時点も、その時点から描ける）。
// 列ごとに行を並べ、打つ前と後で現れた・替わった行に印を付ける（screen-design.md 3.4、git の GitStage と同じ見せ方）。
import type { DockerExt } from '../tools/docker/state.ts';
import type { Result } from '../tools/session.ts';
import type { ShellState } from '../tools/shell/run.ts';
import { WORK } from '../tools/shell/world.ts';
import { filesPicture } from './files-picture.ts';

export type BoardRow = { key: string; text: string; tag?: string };
export type BoardCol = { key: string; title: string; sub: string; rows: BoardRow[] };
export type Board = { cols: BoardCol[] };

const lines = (s: string) =>
	s
		.replace(/\n$/, '')
		.split('\n')
		.filter((l, i, a) => l || a.length > 1);

/** シェル：作業場所の木と、今いる場所 */
export function shellBoard<X>(s: ShellState<X>): Board {
	const p = filesPicture(s);
	const here = p.cwd;
	const rows: BoardRow[] = p.rows.map((r) => ({
		key: `f:${r.path}`,
		text: '  '.repeat(r.depth) + r.name + (r.kind === 'dir' ? '/' : ''),
		tag: [r.path === here ? '▶ 今いる所' : '', r.kind === 'file' ? `${r.size} B` : '']
			.filter(Boolean)
			.join(' ・ ')
	}));
	return {
		cols: [
			{ key: 'tree', title: '作業場所', sub: WORK, rows },
			{
				key: 'where',
				title: '端末',
				sub: '今いる場所',
				rows: [{ key: 'cwd', text: s.cwd }]
			}
		]
	};
}

/** docker：イメージとコンテナ（名前・元のイメージ・状態・公開した口） */
export function dockerBoard(s: ShellState<DockerExt>): Board {
	const d = s.ext;
	return {
		cols: [
			{
				key: 'img',
				title: 'イメージ',
				sub: 'docker images',
				rows: d.images.flatMap((i) =>
					i.tags.map((t) => ({ key: `i:${t}`, text: t, tag: i.id.slice(0, 12) }))
				)
			},
			{
				key: 'ctr',
				title: 'コンテナ',
				sub: 'docker ps -a',
				rows: d.containers.map((c) => ({
					key: `c:${c.id}`,
					text: `${c.name}（${c.image}）`,
					tag:
						(c.status === 'running'
							? '動いている'
							: c.status === 'exited'
								? `止まった（${c.exitCode}）`
								: '作っただけ') +
						(c.publish.length
							? ` ・ ${c.publish.map((p) => `${p.host}→${p.port}`).join(', ')}`
							: '')
				}))
			}
		]
	};
}

/** js・sql：最後に返ってきた物（出力とエラー） */
export function outputBoard(last: Result | null, title: string, sub: string): Board {
	const out = last ? lines(last.out) : [];
	const err = last ? lines(last.err) : [];
	return {
		cols: [
			{
				key: 'out',
				title,
				sub,
				rows: [
					...out.map((t, i) => ({ key: `o:${i}:${t}`, text: t })),
					...err.map((t, i) => ({ key: `e:${i}:${t}`, text: t, tag: 'エラー' }))
				]
			}
		]
	};
}

/** 前の絵と後の絵で、現れた・替わった行の鍵 */
export function boardChanged(a: Board, b: Board): Set<string> {
	const sig = (x: Board) =>
		new Map(
			x.cols.flatMap((c) => c.rows.map((r) => [`${c.key}/${r.key}`, `${r.text}|${r.tag ?? ''}`]))
		);
	const before = sig(a);
	const out = new Set<string>();
	for (const [k, v] of sig(b)) if (before.get(k) !== v) out.add(k);
	return out;
}
