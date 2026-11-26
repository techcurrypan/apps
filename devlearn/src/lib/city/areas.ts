// 空き地から（game-design.md 15.12・D-27 の 1）。地形と東の入口の道を除く、町の中の動かない物
// （道・歩道・白線・木・街灯・灯りの輪・岸壁の小物）を 20 m の升に分け、升ごとの番号を頂点の id に入れる。
// 描画は升ごとに高さ（rise）を 0 にして隠し、建った物の近くの升だけを立ち上げる。状態は変えない（見た目だけ）

/** 升の番号の始まり（建物 〜4000・区画の建物 4000〜・仕組みの建物 5000〜・業者の箱 5100〜 の後） */
export const AREA_BASE = 6000;
export const CELL = 20;
const X0 = -300,
	X1 = 300,
	Z0 = -300,
	Z1 = 360;
const NX = (X1 - X0) / CELL,
	NZ = (Z1 - Z0) / CELL;
export const AREA_COUNT = NX * NZ;
/** 北と西へ出る道（町の端の升が見えると見せる） */
export const FAR_N = AREA_BASE + AREA_COUNT;
export const FAR_W = FAR_N + 1;
/** 外へ出る道の付け根の升（ここが見えると、その道を見せる） */
export const FAR_ROOT: [number, number, number][] = [
	[FAR_N, 0, -240],
	[FAR_W, -240, 0]
];
/** 建った物から、この距離（m）以内に中心がある升を見せる */
export const REVEAL_M = 60;

export function areaOf(x: number, z: number): number | null {
	if (x < X0 || x >= X1 || z < Z0 || z >= Z1) return null;
	const i = Math.floor((x - X0) / CELL),
		j = Math.floor((z - Z0) / CELL);
	return AREA_BASE + j * NX + i;
}

export function areaCenter(id: number): { x: number; z: number } {
	const k = id - AREA_BASE;
	return { x: X0 + ((k % NX) + 0.5) * CELL, z: Z0 + (Math.floor(k / NX) + 0.5) * CELL };
}

/** 頂点 from〜to（3 の倍数の範囲）の三角形のうち、id 0 の物に重心の升の番号を入れる */
export function tagAreas(a: Float32Array, from: number, to: number) {
	for (let v = from; v + 2 < to; v += 3) {
		const o = v * 12;
		if (a[o + 10] !== 0 || a[o + 22] !== 0 || a[o + 34] !== 0) continue;
		const id = areaOf((a[o] + a[o + 12] + a[o + 24]) / 3, (a[o + 2] + a[o + 14] + a[o + 26]) / 3);
		if (id === null) continue;
		a[o + 10] = a[o + 22] = a[o + 34] = id;
	}
}

/** 建った物（建ち始めを含む）の真ん中から、見せる升の集まり */
export function revealedAreas(pts: readonly { x: number; z: number }[]): Set<number> {
	const out = new Set<number>();
	if (!pts.length) return out;
	for (let k = 0; k < AREA_COUNT; k++) {
		const c = areaCenter(AREA_BASE + k);
		for (const p of pts)
			if (Math.hypot(c.x - p.x, c.z - p.z) <= REVEAL_M) {
				out.add(AREA_BASE + k);
				break;
			}
	}
	return out;
}
