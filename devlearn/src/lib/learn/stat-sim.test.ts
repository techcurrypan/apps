import { describe, expect, it } from 'vitest';
import { SIGMA, hist, pdf, phi, sim } from './stat-sim';

// 標本平均の分布（sta-019）の模型。種つきの擬似乱数で、同じ種から同じ結果（CLAUDE.md 第 8 章）
describe('標本平均の模型（sim）', () => {
	it('同じ種・同じ値なら同じ平均の並び', () => {
		expect(sim(30, 50, 0).means).toEqual(sim(30, 50, 0).means);
		expect(sim(30, 50, 0, 8).means).not.toEqual(sim(30, 50, 0, 7).means);
	});
	it('どの形も母平均は 4 分。平均の散らばりは σ / √n に近い（2,000 日・5% 以内）', () => {
		for (const shape of [0, 1, 2] as const) {
			const r = sim(30, 2000, shape);
			expect(Math.abs(r.mm - 4), `形 ${shape}`).toBeLessThan(0.1);
			const se = SIGMA[shape] / Math.sqrt(30);
			expect(Math.abs(r.sd - se) / se, `形 ${shape}`).toBeLessThan(0.05);
		}
	});
	it('n を 4 倍にすると、平均の散らばりは半分に近い', () => {
		const a = sim(30, 2000, 0).sd;
		const b = sim(120, 2000, 0).sd;
		expect(Math.abs(b / a - 0.5)).toBeLessThan(0.05);
	});
	it('同じ日の人どうしが相関 ρ = 0.1 なら、平均の散らばりは √(1 + 29ρ) ≈ 1.97 倍', () => {
		const a = sim(30, 3000, 0).sd;
		const b = sim(30, 3000, 0, 7, 0.1).sd;
		expect(Math.abs(b / a - Math.sqrt(1 + 29 * 0.1))).toBeLessThan(0.12);
	});
	it('最初の 40 日は、1 人ずつの値を持つ（標本の粒を描く）', () => {
		const r = sim(30, 50, 0);
		expect(r.firsts.length).toBe(40);
		expect(r.firsts[0].length).toBe(30);
		const m0 = r.firsts[0].reduce((a, b) => a + b, 0) / 30;
		expect(m0).toBeCloseTo(r.means[0], 10);
	});
});

describe('ヒストグラムと密度', () => {
	it('hist は区切りごとに数え、範囲の外は数えない', () => {
		expect(hist([0.1, 0.15, 0.5, 20], 0.2, 1)).toEqual([2, 0, 1, 0, 0]);
	});
	it('母集団の密度：指数は 0 で 1/4、一様は 0〜8 で 1/8', () => {
		expect(pdf(0, 0)).toBeCloseTo(0.25, 10);
		expect(pdf(4, 1)).toBeCloseTo(0.125, 10);
		expect(pdf(9, 1)).toBe(0);
	});
	it('標準正規の累積：Φ(1.96) ≈ 0.975、Φ(0.82) ≈ 0.794', () => {
		expect(phi(1.96)).toBeCloseTo(0.975, 3);
		expect(phi(0.8216)).toBeCloseTo(0.7943, 3);
	});
});
