// 建物ごとの満足度（段 8-2b：試作の 0〜1 の値をそのまま移した。8-2c で game-design.md 15.5 の式にする）。
// 純粋な関数。元の値を書き換えず、新しい表を返す。
import { mix32 } from './mix.ts';

/** 建物の番号と、地面の上の中心 */
export type Spot = { id: number; x: number; z: number };
export type Happy = Record<number, number>;

/** 値の無い建物の満足度（試作と同じ） */
export const DEFAULT_HAPPY = 0.6;

/** 始まりの満足度：0.55〜0.80。試作は擬似乱数を引いた順で決めていたのを、種と建物の番号の式にした */
export function initHappy(spots: readonly Spot[], seed: number): Happy {
	const h: Happy = {};
	for (const s of spots) h[s.id] = 0.55 + ((mix32(seed, s.id) % 1000) / 1000) * 0.25;
	return h;
}

/** (x, z) から r より近い建物の満足度に d を足し、lo〜hi に収める */
export function bumpNear(
	h: Happy,
	spots: readonly Spot[],
	x: number,
	z: number,
	r: number,
	d: number,
	lo: number,
	hi: number
): Happy {
	const out: Happy = { ...h };
	for (const s of spots)
		if (Math.hypot(s.x - x, s.z - z) < r)
			out[s.id] = Math.max(lo, Math.min(hi, (h[s.id] ?? DEFAULT_HAPPY) + d));
	return out;
}

export function average(h: Happy, ids: readonly number[]): number {
	let s = 0;
	for (const id of ids) s += h[id] ?? DEFAULT_HAPPY;
	return s / ids.length;
}
