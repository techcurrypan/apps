// 構図と移り変わり（learn-standard.md 第 16.1 LS3-S2・S5・S6。試作 learn11 の SCN・sceneTo・scnPos）。
// ステップごとの構図 Layout（物の ID → 図の座標と縮尺）から、ある時刻の物の位置・縮尺・透明度を求める純粋な関数。
// 「どの時点の画面も、その時点の状態から描ける」（CLAUDE.md 第 8 章）：(今の構図, 前の構図, 経過時間) だけで決まる。

/** 物の ID → [x, y, 縮尺]。図の座標は 1000×600 の固定の画面 */
export type Layout = Record<string, [number, number] | [number, number, number]>;
export type Place = { x: number; y: number; s: number; op: number };

/** 移り変わりの長さ（LS3-S5） */
export const MOVE_MS = 900;
/** 現れる物：少し下（20）から、縮んだ形（0.85）で */
const RISE = 20;
const SHRINK = 0.85;

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (v: number) => (v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function placeOf(v: Layout[string]): Place {
	return { x: v[0], y: v[1], s: v[2] ?? 1, op: 1 };
}

/** 今の構図 now、前の構図 prev（最初のステップは null）、ステップに入ってからの時間 t（ms）での物の置き場 */
export function sceneAt(
	now: Layout,
	prev: Layout | null,
	t: number,
	o: { reduce?: boolean } = {}
): Record<string, Place> {
	const k = o.reduce ? 1 : ease(clamp01(t / MOVE_MS));
	const out: Record<string, Place> = {};
	for (const [id, v] of Object.entries(now)) {
		const to = placeOf(v);
		const p = prev?.[id];
		const from = p ? placeOf(p) : { x: to.x, y: to.y + RISE, s: to.s * SHRINK, op: 0 };
		out[id] = {
			x: lerp(from.x, to.x, k),
			y: lerp(from.y, to.y, k),
			s: lerp(from.s, to.s, k),
			op: lerp(from.op, to.op, k)
		};
	}
	if (prev && k < 1)
		for (const [id, v] of Object.entries(prev)) {
			if (id in now) continue;
			const from = placeOf(v);
			out[id] = { ...from, op: 1 - k };
		}
	return out;
}
