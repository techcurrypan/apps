// 見せ方の型 chart の段の中身（learn-standard.md 第 17 章 panel・bar・sphere。試作 learn11 の #stat）。
// 母集団の棒・標本の粒・平均の分布の棒・正規の曲線・95% の帯・印を、(段の枠, 中身, 経過時間 ms) だけから決める純粋な関数
import { SIGMA, XMAX, hist, normPdf, pdf, sim, type Shape } from '../stat-sim.ts';

export type ChartSpec = {
	kind: 'pop' | 'sample' | 'means';
	shape: Shape;
	/** 標本の人数 */
	n?: number;
	/** 平均の分布に積む日の数 */
	days?: number;
	/** 標本の段に出す日（0 から） */
	day?: number;
	/** 時間とともに粒・棒が増える */
	grow?: boolean;
	/** 正規の曲線（平均 4・σ/√n） */
	curve?: boolean;
	/** 95% の帯 */
	band?: boolean;
	/** 縦の印（今日の値など） */
	mark?: number;
	/** 同じ日の人どうしの相関（独立でない標本） */
	rho?: number;
};
export type Box = { x: number; y: number; w: number; h: number };
export type ChartBar = { x: number; y: number; w: number; h: number };
export type ChartMark = { v: number; x: number; label: string; tone: 'orange' | 'red' | 'gray' };
export type ChartGeom = {
	plot: { left: number; right: number; top: number; bottom: number };
	ticks: { x: number; label: string }[];
	bars: ChartBar[];
	dots: { x: number; y: number }[];
	curve: [number, number][];
	band: { lo: number; hi: number; x0: number; x1: number } | null;
	marks: ChartMark[];
	/** 積んだ日の数（平均の分布） */
	count: number;
};

/** 粒は 1 つ 60 ms ごと、平均の分布は 1 日 20 ms ごとに増える */
export const DOT_MS = 60;
export const DAY_MS = 20;
const POP_BW = 0.5;
const MEAN_BW = 0.2;

/** 平均の散らばりの目安（σ/√n。独立でない時は √(1 + (n − 1)ρ) 倍） */
export function seOf(shape: Shape, n: number, rho = 0): number {
	return (SIGMA[shape] / Math.sqrt(n)) * Math.sqrt(1 + (n - 1) * rho);
}

export function chartGeom(s: ChartSpec, box: Box, t: number): ChartGeom {
	const left = box.x + 40;
	const right = box.x + box.w - 46;
	const top = box.y + 46;
	const bottom = box.y + box.h - 30;
	const X = (v: number) => left + (Math.min(XMAX, Math.max(0, v)) / XMAX) * (right - left);
	const H = bottom - top;
	const ticks = [0, 2, 4, 6, 8, 10, 12, 14, 16].map((v) => ({ x: X(v), label: `${v}` }));
	const out: ChartGeom = {
		plot: { left, right, top, bottom },
		ticks,
		bars: [],
		dots: [],
		curve: [],
		band: null,
		marks: [],
		count: 0
	};
	const n = s.n ?? 30;
	const grow = (ms: number) => (s.grow ? Math.min(1, Math.max(0, t / ms)) : 1);
	if (s.kind === 'pop') {
		const nb = Math.round(XMAX / POP_BW);
		const ds = Array.from({ length: nb }, (_, i) => pdf((i + 0.5) * POP_BW, s.shape));
		const max = Math.max(...ds);
		const k = grow(900);
		ds.forEach((d, i) => {
			if (d <= 0) return;
			out.bars.push({
				x: X(i * POP_BW) + 1,
				y: bottom,
				w: X(POP_BW) - X(0) - 2,
				h: (d / max) * H * k
			});
		});
		out.marks.push({ v: 4, x: X(4), label: '平均 4 分', tone: 'gray' });
		return out;
	}
	if (s.kind === 'sample') {
		const day = s.day ?? 0;
		const r = sim(n, Math.max(40, day + 1), s.shape, 7, s.rho ?? 0);
		const row = r.firsts[day] ?? [];
		const shown = s.grow ? Math.min(row.length, Math.floor(t / DOT_MS)) : row.length;
		const stack = new Map<number, number>();
		const R = 6;
		// 粒が横に重ならない区切りの幅（狭い段では広げる）
		const bw = Math.max(0.4, ((R * 2 + 1) * XMAX) / (right - left));
		for (const v of row.slice(0, shown)) {
			const b = Math.floor(Math.min(XMAX - 0.01, v) / bw);
			const k = stack.get(b) ?? 0;
			stack.set(b, k + 1);
			out.dots.push({ x: X(b * bw + bw / 2), y: Math.max(top + R, bottom - R - k * (R * 2 + 1)) });
		}
		if (shown === row.length && row.length) {
			const m = row.reduce((a, b) => a + b, 0) / row.length;
			out.marks.push({ v: m, x: X(m), label: `この日の平均 ${m.toFixed(2)} 分`, tone: 'orange' });
		}
		return out;
	}
	const days = s.days ?? 400;
	const r = sim(n, days, s.shape, 7, s.rho ?? 0);
	const k = s.grow ? Math.min(days, Math.floor(t / DAY_MS)) : days;
	out.count = k;
	const full = hist(r.means, MEAN_BW, XMAX);
	const cur = hist(r.means.slice(0, k), MEAN_BW, XMAX);
	const se = seOf(s.shape, n, s.rho ?? 0);
	const peak = Math.max(...full, s.curve ? days * MEAN_BW * normPdf(4, 4, se) : 0, 1);
	cur.forEach((c, i) => {
		if (c > 0)
			out.bars.push({
				x: X(i * MEAN_BW) + 0.5,
				y: bottom,
				w: X(MEAN_BW) - X(0) - 1,
				h: (c / peak) * H
			});
	});
	if (s.curve)
		for (let i = 0; i <= 120; i++) {
			const v = (i / 120) * XMAX;
			// 曲線は積んだ日数（k）の尺。棒と一緒に育つ（途中で棒より高く出ない）
			out.curve.push([X(v), bottom - ((k * MEAN_BW * normPdf(v, 4, se)) / peak) * H]);
		}
	if (s.band) {
		const lo = 4 - 1.96 * se;
		const hi = 4 + 1.96 * se;
		out.band = { lo, hi, x0: X(lo), x1: X(hi) };
	}
	if (s.mark !== undefined)
		out.marks.push({ v: s.mark, x: X(s.mark), label: `今日 ${s.mark} 分`, tone: 'red' });
	return out;
}
