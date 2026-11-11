import { describe, expect, it } from 'vitest';
import { mix32 } from './mix.ts';
import { average, bumpNear, initHappy, type Spot } from './happy.ts';

describe('mix32（種と番号からの整数の混ぜ合わせ）', () => {
	it('同じ入力で同じ値。32 ビットの符号なし整数', () => {
		expect(mix32(1, 2, 3)).toBe(mix32(1, 2, 3));
		const v = mix32(7, 99);
		expect(Number.isInteger(v) && v >= 0 && v < 2 ** 32).toBe(true);
	});
	it('入力が 1 つ違えば値が変わり、並びの順にもよる', () => {
		expect(mix32(1, 2)).not.toBe(mix32(1, 3));
		expect(mix32(1, 2)).not.toBe(mix32(2, 1));
	});
	it('mod 1000 が偏らない（1 万個で各 10 区間に 800〜1200 個）', () => {
		const bins = new Array<number>(10).fill(0);
		for (let i = 0; i < 10000; i++) bins[Math.floor((mix32(1, i) % 1000) / 100)]++;
		for (const b of bins) {
			expect(b).toBeGreaterThan(800);
			expect(b).toBeLessThan(1200);
		}
	});
});

const spots: Spot[] = [
	{ id: 1, x: 0, z: 0 },
	{ id: 2, x: 50, z: 0 },
	{ id: 3, x: 200, z: 0 }
];

describe('建物ごとの満足度', () => {
	it('始まりは種と建物の番号だけで決まり、0.55〜0.80（試作の幅）', () => {
		const a = initHappy(spots, 1);
		expect(initHappy(spots, 1)).toEqual(a);
		for (const s of spots) {
			expect(a[s.id]).toBeGreaterThanOrEqual(0.55);
			expect(a[s.id]).toBeLessThan(0.8);
		}
		expect(initHappy(spots, 2)).not.toEqual(a);
	});
	it('近くの建物だけが動き、上限と下限で止まる。元の値は変えない', () => {
		const h = { 1: 0.95, 2: 0.6, 3: 0.6 };
		const up = bumpNear(h, spots, 0, 0, 60, 0.12, 0, 1);
		expect(up).toEqual({ 1: 1, 2: 0.72, 3: 0.6 });
		expect(h).toEqual({ 1: 0.95, 2: 0.6, 3: 0.6 });
		const down = bumpNear(h, spots, 0, 0, 60, -0.5, 0.2, 1);
		expect(down[1]).toBeCloseTo(0.45);
		expect(down[2]).toBe(0.2);
	});
	it('値の無い建物は 0.6 として数える（試作と同じ）', () => {
		expect(bumpNear({}, spots, 200, 0, 10, 0.1, 0, 1)).toEqual({ 3: 0.7 });
		expect(average({ 1: 0.8 }, [1, 2])).toBeCloseTo(0.7);
	});
});
