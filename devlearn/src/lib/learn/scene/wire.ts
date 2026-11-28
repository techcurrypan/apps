// 線の形（learn-standard.md 16.2 LS3-K4・16.4 M2）。物の外枠の手前で止め、線の上を点が流れる。
// 点の位置は周の位置 p（player.ts の flowAt。描く時刻だけで決まる）から求める純粋な関数
import type { Tone } from '../../ui/scene/kit/paint.ts';

export type Pt = { x: number; y: number };
/** ref は変数から物への参照の矢印（memory の型。第 17 章 var・list） */
export type WireKind = 'data' | 'ack' | 'watch' | 'ref';
/** 線の種類 → 点の色 */
export const WIRE_TONE: Record<WireKind, Tone> = {
	data: 'blue',
	ack: 'green',
	watch: 'purple',
	ref: 'yellow'
};
/** ACK・watch の戻りは点線 */
export const DASHED: ReadonlySet<WireKind> = new Set(['ack', 'watch']);

/** a→b の線を、a の側は ia、b の側は ib だけ手前で止める */
export function trim(a: Pt, b: Pt, ia: number, ib: number): { a: Pt; b: Pt; len: number } {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const L = Math.hypot(dx, dy);
	if (L === 0 || ia + ib >= L) {
		const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
		return { a: m, b: { ...m }, len: 0 };
	}
	const ux = dx / L;
	const uy = dy / L;
	return {
		a: { x: a.x + ux * ia, y: a.y + uy * ia },
		b: { x: b.x - ux * ib, y: b.y - uy * ib },
		len: L - ia - ib
	};
}

/** 周の位置 p（0〜1）の点。both は行き来（戻りの点を逆向きに足す）。p が null なら点を出さない */
export function dotsAt(t: { a: Pt; b: Pt }, p: number | null, both = false): Pt[] {
	if (p === null) return [];
	const at = (k: number) => ({ x: t.a.x + (t.b.x - t.a.x) * k, y: t.a.y + (t.b.y - t.a.y) * k });
	return both ? [at(p), at(1 - p)] : [at(p)];
}

/** 四角い物（半幅 hw・半高 hh）の中心から、向き (dx, dy) に進んで外枠に着くまでの長さ（段 panel の線を辺で止める） */
export function rectReach(hw: number, hh: number, dx: number, dy: number): number {
	const L = Math.hypot(dx, dy) || 1;
	const ux = Math.abs(dx / L);
	const uy = Math.abs(dy / L);
	return Math.min(ux > 1e-9 ? hw / ux : Infinity, uy > 1e-9 ? hh / uy : Infinity);
}
