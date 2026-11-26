// 空き地から（game-design.md 15.12・D-27 の 1）：道・歩道・木・街灯を 20 m の升に分け、建った物の近くの升だけを見せる
import { describe, expect, it } from 'vitest';
import {
	AREA_BASE,
	AREA_COUNT,
	areaCenter,
	areaOf,
	revealedAreas,
	tagAreas,
	REVEAL_M
} from './areas.ts';

/** 12 個の数で 1 頂点（gen.ts の Geo と同じ並び。10 番目が id） */
function tri(pts: number[][], id = 0): number[] {
	const out: number[] = [];
	for (const [x, z] of pts) out.push(x, 0, z, 0, 1, 0, 1, 1, 1, 0, id, 0);
	return out;
}

describe('升（20 m）', () => {
	it('町の中の点は升の番号、外は null', () => {
		const a = areaOf(0, 0);
		expect(a).not.toBeNull();
		expect(a!).toBeGreaterThanOrEqual(AREA_BASE);
		expect(a!).toBeLessThan(AREA_BASE + AREA_COUNT);
		expect(areaOf(5000, 0)).toBeNull();
		const c = areaCenter(a!);
		expect(Math.abs(c.x - 0)).toBeLessThanOrEqual(10);
		expect(Math.abs(c.z - 0)).toBeLessThanOrEqual(10);
	});
	it('升の番号は、建物の番号（〜4000）・区画の建物（4000〜）・仕組みの建物（5000〜）と重ならない', () => {
		expect(AREA_BASE).toBeGreaterThanOrEqual(6000);
		expect(AREA_BASE + AREA_COUNT).toBeLessThanOrEqual(128 * 128);
	});
});

describe('三角形に升の番号を付ける', () => {
	it('id 0 の三角形は、重心の升の番号になり、3 頂点とも同じ', () => {
		const a = new Float32Array([
			...tri([
				[0, 0],
				[30, 0],
				[0, 30]
			])
		]);
		tagAreas(a, 0, 3);
		const want = areaOf(10, 10);
		expect([a[10], a[22], a[34]]).toEqual([want, want, want]);
	});
	it('建物の id を持つ三角形と、町の外の三角形と、範囲の外は変えない', () => {
		const a = new Float32Array([
			...tri(
				[
					[0, 0],
					[1, 0],
					[0, 1]
				],
				42
			),
			...tri([
				[4000, 0],
				[4001, 0],
				[4000, 1]
			]),
			...tri([
				[0, 0],
				[1, 0],
				[0, 1]
			])
		]);
		tagAreas(a, 0, 6);
		expect(a[10]).toBe(42);
		expect(a[12 * 3 + 10]).toBe(0);
		expect(a[12 * 6 + 10]).toBe(0);
	});
});

describe('見せる升', () => {
	it('建った物が無ければ 0 個', () => {
		expect(revealedAreas([]).size).toBe(0);
	});
	it('建った物から REVEAL_M 以内に中心がある升だけ', () => {
		const s = revealedAreas([{ x: 0, z: 0 }]);
		expect(s.size).toBeGreaterThan(0);
		for (const id of s) {
			const c = areaCenter(id);
			expect(Math.hypot(c.x, c.z)).toBeLessThanOrEqual(REVEAL_M);
		}
		expect(s.has(areaOf(0, 0)!)).toBe(true);
		expect(s.has(areaOf(200, 0)!)).toBe(false);
	});
});
