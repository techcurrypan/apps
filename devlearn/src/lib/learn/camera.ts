// 図の視点（viewBox）の計算（LS-D9・D10）。純粋な関数。
import type { Pt, Rect } from './geometry.ts';

export type View = Rect;

/** 枠 r を、縦横比 aspect（幅 / 高さ）の画面にちょうど入れる視点 */
export function fit(r: Rect, aspect: number): View {
	const a = Math.max(0.1, aspect);
	if (r.w / r.h < a) {
		const w = r.h * a;
		return { x: r.x - (w - r.w) / 2, y: r.y, w, h: r.h };
	}
	const h = r.w / a;
	return { x: r.x, y: r.y - (h - r.h) / 2, w: r.w, h };
}

export const MIN_W = 160;
export const MAX_W = 6000;

/** 点 p（図の座標）を中心に k 倍に寄る（k > 1 で大きく見える） */
export function zoomAt(v: View, k: number, p: Pt): View {
	const w = Math.min(MAX_W, Math.max(MIN_W, v.w / k));
	const s = w / v.w;
	const h = v.h * s;
	return { x: p.x - (p.x - v.x) * s, y: p.y - (p.y - v.y) * s, w, h };
}

/** 画面の dx, dy ピクセルだけ動かす（px は画面の幅のピクセル） */
export function pan(v: View, dx: number, dy: number, px: number): View {
	const k = v.w / Math.max(1, px);
	return { ...v, x: v.x - dx * k, y: v.y - dy * k };
}

/** 全体を見たときと比べた倍率（%） */
export const percent = (v: View, all: View) => Math.round((all.w / v.w) * 100);

/** 画面の点を図の座標に */
export function toWorld(v: View, px: number, py: number, w: number, h: number): Pt {
	return { x: v.x + (px / w) * v.w, y: v.y + (py / h) * v.h };
}

/** 2 つの視点のあいだ（t は 0〜1） */
export const lerpView = (a: View, b: View, t: number): View => ({
	x: a.x + (b.x - a.x) * t,
	y: a.y + (b.y - a.y) * t,
	w: a.w + (b.w - a.w) * t,
	h: a.h + (b.h - a.h) * t
});
