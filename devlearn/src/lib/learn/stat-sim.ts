// 標本平均の分布（sta-019。見せ方の型 chart）の模型。窓口の待ち時間（分）を母集団にし、n 人の標本の平均を日ごとに出す。
// 値は種つきの擬似乱数（mulberry32）で決まる。同じ種・同じ値なら同じ結果（CLAUDE.md 第 8 章。Math.random は使わない）。
// 母集団の形（平均はどれも 4 分）：0 指数（右に長い。σ = 4）・1 一様 0〜8 分（σ = 8 / √12 ≈ 2.31）・
// 2 二山（1.5 分 σ 0.6 と 6.5 分 σ 0.8 を半分ずつ。σ = √6.75 ≈ 2.60）。σ の値は分布の定義から計算した
export type Shape = 0 | 1 | 2;
export const SHAPES = ['指数（右に長い）', '一様（0〜8 分）', '二山'] as const;
export const SIGMA: Record<Shape, number> = {
	0: 4,
	1: 8 / Math.sqrt(12),
	2: Math.sqrt(0.5 * (0.36 + 6.25) + 0.5 * (0.64 + 6.25))
};
/** 横の軸の右の端（分） */
export const XMAX = 16;

type Rng = () => number;
function mulberry(a: number): Rng {
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function draw1(r: Rng, shape: Shape): number {
	if (shape === 0) return -4 * Math.log(1 - r());
	if (shape === 1) return 8 * r();
	const u = r();
	const v = r();
	const z = Math.sqrt(-2 * Math.log(1 - u)) * Math.cos(2 * Math.PI * v);
	return r() < 0.5 ? 1.5 + 0.6 * z : 6.5 + 0.8 * z;
}

export type Sim = {
	n: number;
	shape: Shape;
	means: number[];
	firsts: number[][];
	mm: number;
	sd: number;
};
const cache = new Map<string, Sim>();

/** n 人の標本を days 日取り、日ごとの平均を出す。最初の 40 日は 1 人ずつの値も持つ。
 * rho は同じ日の人どうしの相関（独立でない標本）：v' = 4 + √(1 − ρ)(v − 4) + d、d は日ごとに 1 つの N(0, √ρ σ)。
 * 1 人の平均と σ は変えず、同じ日の 2 人の相関が ρ になる */
export function sim(n: number, days: number, shape: Shape, seed = 7, rho = 0): Sim {
	const key = `${n}|${days}|${shape}|${seed}|${rho}`;
	const hit = cache.get(key);
	if (hit) return hit;
	const r = mulberry(seed * 1000 + n * 7 + shape);
	const means: number[] = [];
	const firsts: number[][] = [];
	const keep = Math.sqrt(1 - rho);
	for (let k = 0; k < days; k++) {
		let s = 0;
		const row: number[] = [];
		let d = 0;
		if (rho > 0) {
			const u = r();
			const w = r();
			d =
				Math.sqrt(rho) * SIGMA[shape] * Math.sqrt(-2 * Math.log(1 - u)) * Math.cos(2 * Math.PI * w);
		}
		for (let i = 0; i < n; i++) {
			const v = rho > 0 ? 4 + keep * (draw1(r, shape) - 4) + d : draw1(r, shape);
			s += v;
			if (k < 40) row.push(v);
		}
		means.push(s / n);
		if (k < 40) firsts.push(row);
	}
	const mm = means.reduce((a, b) => a + b, 0) / days;
	const sd = Math.sqrt(means.reduce((a, b) => a + (b - mm) ** 2, 0) / days);
	const out = { n, shape, means, firsts, mm, sd };
	cache.set(key, out);
	return out;
}

/** 幅 bw の区切りで 0〜xmax を数える（範囲の外は数えない） */
export function hist(vals: readonly number[], bw: number, xmax: number): number[] {
	const nb = Math.round(xmax / bw);
	const h = new Array<number>(nb).fill(0);
	for (const v of vals) {
		const b = Math.floor(v / bw);
		if (b >= 0 && b < nb) h[b]++;
	}
	return h;
}

const nd = (x: number, m: number, s: number) =>
	Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
/** 母集団の密度 */
export function pdf(x: number, shape: Shape): number {
	if (shape === 0) return x < 0 ? 0 : Math.exp(-x / 4) / 4;
	if (shape === 1) return x >= 0 && x <= 8 ? 1 / 8 : 0;
	return 0.5 * nd(x, 1.5, 0.6) + 0.5 * nd(x, 6.5, 0.8);
}
/** 正規分布の密度 */
export const normPdf = nd;

/** 誤差関数（Abramowitz–Stegun 7.1.26。誤差 1.5e-7 以下） */
function erf(x: number): number {
	const s = Math.sign(x);
	const a = Math.abs(x);
	const t = 1 / (1 + 0.3275911 * a);
	const y =
		1 -
		((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
			t *
			Math.exp(-a * a);
	return s * y;
}
/** 標準正規の累積 Φ(z) */
export const phi = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));
