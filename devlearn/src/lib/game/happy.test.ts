import { describe, expect, it } from 'vitest';
import { mix32 } from './mix.ts';
import { addNear, baseHappy, happyOf, parkBonus, type Spot } from './happy.ts';

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

describe('建物ごとの満足度（game-design.md 15.5）', () => {
	it('基礎は 55 + (mix32(種, 建物の番号) mod 11)。55〜65', () => {
		for (let id = 0; id < 300; id++) {
			const b = baseHappy(1, id);
			expect(b).toBe(55 + (mix32(1, id) % 11));
			expect(b).toBeGreaterThanOrEqual(55);
			expect(b).toBeLessThanOrEqual(65);
		}
	});
	it('公園：60 m 以内の公園 1 つにつき +6、+12 まで', () => {
		expect(parkBonus({ x: 0, z: 0 }, [])).toBe(0);
		expect(parkBonus({ x: 0, z: 0 }, [{ x: 59, z: 0 }])).toBe(6);
		expect(parkBonus({ x: 0, z: 0 }, [{ x: 61, z: 0 }])).toBe(0);
		const three = [
			{ x: 10, z: 0 },
			{ x: 0, z: 10 },
			{ x: -10, z: 0 }
		];
		expect(parkBonus({ x: 0, z: 0 }, three)).toBe(12);
	});
	it('要望の項：依頼主の建物から 100 m 以内に、依頼主の満足度と同じ動きを足す。元の表は変えない', () => {
		const d0 = {};
		const d1 = addNear(d0, spots, 0, 0, 100, 4);
		expect(d1).toEqual({ 1: 4, 2: 4 });
		expect(addNear(d1, spots, 0, 0, 100, -5)).toEqual({ 1: -1, 2: -1 });
		expect(d0).toEqual({});
	});
	it('建物の満足度は 基礎 + 公園 + 要望 を 0〜100 に収める', () => {
		expect(happyOf(60, 12, 40)).toBe(100);
		expect(happyOf(60, 0, -70)).toBe(0);
		expect(happyOf(57, 6, -3)).toBe(60);
	});
});
