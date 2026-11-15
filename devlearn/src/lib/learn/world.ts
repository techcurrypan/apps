// 図の上に描く世界の状態（LS-D8）。Git の記録の箱の列と枝の札・棟ごとの部屋・点と線。
// 状態はステップのデータ（Step.world）だけから決まる。描く場所は geometry.ts が near の機械の下に決める。
import type { Lesson, World } from '../lesson/types.ts';

/** ステップ n の後の世界（n 以前で最後に書かれた物）。n = 0 は始まりの前 */
export function worldAt(lesson: Lesson, n: number): World | null {
	for (let i = Math.min(n, lesson.explain.length); i >= 1; i--) {
		const w = lesson.explain[i - 1].world;
		if (w) return w;
	}
	return null;
}

const keysOf = (w: World): string[] =>
	w.kind === 'chain'
		? w.items.map((x) => x.id)
		: w.kind === 'slots'
			? w.groups.flatMap((g) => g.items.map((x) => `${g.name}/${x.text}/${x.state}`))
			: w.points.map((p) => p.join(','));

/** 前の世界に無かった物（増えた・状態が変わった）の鍵。前が無ければ印を付けない */
export function freshOf(before: World | null, after: World | null): Set<string> {
	if (!before || !after) return new Set();
	const old = new Set(keysOf(before));
	return new Set(keysOf(after).filter((k) => !old.has(k)));
}
export const keyOfSlot = (g: string, x: { text: string; state: string }) =>
	`${g}/${x.text}/${x.state}`;

export const CHAIN = { w: 104, h: 46, gap: 22, head: 26 };
export const SLOTS = { w: 150, row: 26, head: 30, gap: 12 };
export const PLOT = { w: 260, h: 170 };

/** 世界の箱の大きさ（図の座標） */
export function worldSize(w: World): { w: number; h: number } {
	switch (w.kind) {
		case 'chain':
			return {
				w: w.items.length * CHAIN.w + (w.items.length - 1) * CHAIN.gap + 16,
				h: CHAIN.head + CHAIN.h + 16
			};
		case 'slots': {
			const rows = Math.max(1, ...w.groups.map((g) => g.items.length));
			return {
				w: w.groups.length * SLOTS.w + (w.groups.length - 1) * SLOTS.gap + 16,
				h: SLOTS.head + rows * SLOTS.row + 16 + (w.note ? 22 : 0)
			};
		}
		case 'plot':
			return { w: PLOT.w, h: PLOT.h + (w.note ? 22 : 0) };
	}
}
