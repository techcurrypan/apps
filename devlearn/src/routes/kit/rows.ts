// 部品集の頁（/kit）の段の並べ方。隣どうしの台が重ならないように、台の横幅から置き場を決める（26 回目の判定 A・B）
import { ISO } from '#lib/ui/scene/iso.ts';
import { FOOT } from '#lib/ui/scene/kit/paint.ts';

export type Slot = { kind: keyof typeof FOOT; x: number; s: number };

/** 台（Base の Pad：(w + 46)·s × (d + 46)·s の菱形）の、画面での横の半幅 */
export const padHalf = (kind: keyof typeof FOOT, s: number) =>
	((FOOT[kind][0] + FOOT[kind][1] + 92) * ISO.ax * s) / 2;

/** 1 段目：laptop・func（青）・func（橙）・block・block（置き場の印） */
export const ROW1: Slot[] = [
	{ kind: 'laptop', x: 60, s: 0.82 },
	{ kind: 'func', x: 312, s: 0.82 },
	{ kind: 'func', x: 562, s: 0.82 },
	{ kind: 'block', x: 818, s: 0.82 },
	{ kind: 'block', x: 1050, s: 0.62 }
];

/** 一番下の段：強めた func（青・橙）と、実行の文脈の残り 2 色（赤・灰） */
export const ROW_HL: Slot[] = [
	{ kind: 'func', x: 180, s: 1 },
	{ kind: 'func', x: 480, s: 1 },
	{ kind: 'func', x: 760, s: 0.8 },
	{ kind: 'func', x: 1005, s: 0.8 }
];
