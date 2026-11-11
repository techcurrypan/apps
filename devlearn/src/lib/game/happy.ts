// 建物ごとの満足度（game-design.md 15.5）。s_b = clamp(基礎 + 公園 + 要望, 0, 100)。
// 基礎と公園は種と街の形から毎回数える。状態に持つのは「要望」の項（建物ごとの足し算）だけ。純粋な関数。
import { mix32 } from './mix.ts';

/** 建物の番号と、地面の上の中心 */
export type Spot = { id: number; x: number; z: number };
/** 建物ごとの「要望」の項 */
export type SatDelta = Record<number, number>;

export const PARK_R = 60;
export const PARK_EACH = 6;
export const PARK_MAX = 12;
/** 依頼主の満足度の動きが届く範囲（m） */
export const CLIENT_R = 100;

/** 基礎：55〜65 */
export const baseHappy = (seed: number, id: number) => 55 + (mix32(seed, id) % 11);

export function parkBonus(p: { x: number; z: number }, parks: readonly { x: number; z: number }[]) {
	let n = 0;
	for (const q of parks) if (Math.hypot(q.x - p.x, q.z - p.z) < PARK_R) n++;
	return Math.min(PARK_MAX, n * PARK_EACH);
}

/** (x, z) から r より近い建物の「要望」の項に v を足す。元の表は変えない */
export function addNear(
	d: SatDelta,
	spots: readonly Spot[],
	x: number,
	z: number,
	r: number,
	v: number
): SatDelta {
	const out: SatDelta = { ...d };
	for (const s of spots) if (Math.hypot(s.x - x, s.z - z) < r) out[s.id] = (out[s.id] ?? 0) + v;
	return out;
}

export const happyOf = (base: number, park: number, delta: number) =>
	Math.max(0, Math.min(100, base + park + delta));
