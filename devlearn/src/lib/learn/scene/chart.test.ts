import { describe, expect, it } from 'vitest';
import { chartGeom, type ChartSpec } from './chart';

// 見せ方の型 chart（learn-standard.md 第 17 章 panel・bar・sphere）：段の中のヒストグラム・粒・曲線・95% の帯・印。
// 形は (段の枠, 中身, 経過時間) だけで決まる純粋な関数（CLAUDE.md 第 8 章）
const BOX = { x: 30, y: 20, w: 940, h: 220 };
const geom = (s: ChartSpec, t = 60000) => chartGeom(s, BOX, t);

describe('chartGeom', () => {
	it('母集団：棒は枠の中。指数は左ほど高い。平均 4 分の線', () => {
		const g = geom({ kind: 'pop', shape: 0 });
		expect(g.bars.length).toBeGreaterThan(10);
		for (const b of g.bars) {
			expect(b.x).toBeGreaterThanOrEqual(BOX.x);
			expect(b.x + b.w).toBeLessThanOrEqual(BOX.x + BOX.w);
			expect(b.y - b.h).toBeGreaterThanOrEqual(BOX.y);
		}
		expect(g.bars[0].h).toBeGreaterThan(g.bars[10].h);
		expect(g.marks.map((m) => m.v)).toContain(4);
	});
	it('標本：n 個の粒が、時間とともに 1 つずつ出る。全部出ると平均の線', () => {
		const s: ChartSpec = { kind: 'sample', shape: 0, n: 30, day: 0, grow: true };
		expect(geom(s, 0).dots.length).toBe(0);
		expect(geom(s, 60000).dots.length).toBe(30);
		expect(geom(s, 600).marks.length).toBe(0);
		expect(geom(s, 60000).marks.length).toBe(1);
	});
	it('平均の分布：積む日が時間とともに増え、棒の合計は積んだ日の数', () => {
		const s: ChartSpec = { kind: 'means', shape: 0, n: 30, days: 400, grow: true };
		const sum = (t: number) => geom(s, t).count;
		expect(sum(0)).toBe(0);
		expect(sum(2000)).toBeGreaterThan(0);
		expect(sum(2000)).toBeLessThan(400);
		expect(sum(60000)).toBe(400);
	});
	it('95% の帯は 4 ± 1.96 σ/√n（n = 30 で 2.57〜5.43 分）。独立でない時は √(1 + (n − 1)ρ) 倍', () => {
		const g = geom({ kind: 'means', shape: 0, n: 30, days: 400, band: true });
		expect(g.band?.lo).toBeCloseTo(2.5686, 3);
		expect(g.band?.hi).toBeCloseTo(5.4314, 3);
		const h = geom({ kind: 'means', shape: 0, n: 30, days: 400, band: true, rho: 0.1 });
		expect(h.band?.hi).toBeCloseTo(4 + 1.96 * 0.7303 * 1.9748, 2);
	});
	it('曲線は枠の中の折れ線。印は値の所の縦の線', () => {
		const g = geom({ kind: 'means', shape: 0, n: 30, days: 400, curve: true, mark: 4.6 });
		expect(g.curve.length).toBeGreaterThan(20);
		for (const [x, y] of g.curve) {
			expect(x).toBeGreaterThanOrEqual(BOX.x);
			expect(y).toBeGreaterThanOrEqual(BOX.y);
		}
		expect(g.marks.some((m) => m.v === 4.6)).toBe(true);
	});
	it('積んでいる途中（grow）の曲線は、積んだ日数の尺（棒と同じ尺。途中で棒より高く出ない）', () => {
		const spec: ChartSpec = { kind: 'means', shape: 0, n: 30, days: 400, curve: true, grow: true };
		const half = geom(spec, 100 * 20);
		const full = geom(spec, 400 * 20);
		const top = (g: ReturnType<typeof geom>) => Math.min(...g.curve.map(([, y]) => y));
		const bottom = Math.max(...full.curve.map(([, y]) => y));
		// 100 日分の曲線の山の高さは、400 日分の 1/4
		expect((bottom - top(half)) / (bottom - top(full))).toBeCloseTo(0.25, 1);
	});
});
