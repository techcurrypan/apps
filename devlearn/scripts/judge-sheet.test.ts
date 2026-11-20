import { describe, expect, it } from 'vitest';
import { half, sheet } from './judge-sheet.ts';
import type { Img } from './lib/png.ts';

const solid = (w: number, h: number, v: number): Img => ({
	width: w,
	height: h,
	data: new Uint8Array(w * h * 4).fill(v)
});

describe('判定の一覧（judge-sheet）', () => {
	it('half は 2 × 2 の平均で半分にする', () => {
		const a = solid(4, 2, 0);
		a.data.set([200, 200, 200, 200], 0); // (0,0) だけ 200
		const b = half(a);
		expect([b.width, b.height]).toEqual([2, 1]);
		expect(b.data[0]).toBe(50);
		expect(b.data[4]).toBe(0);
	});
	it('sheet は 4 列 2 段に、間 8px で並べる', () => {
		const s = sheet(
			Array.from({ length: 8 }, (_, i) => solid(10, 6, i * 10)),
			4
		);
		expect([s.width, s.height]).toEqual([4 * 10 + 5 * 8, 2 * 6 + 3 * 8]);
		// 2 段目の 1 つ目のコマ（4 番）の左上
		const at = ((8 + 6 + 8) * s.width + 8) * 4;
		expect(s.data[at]).toBe(40);
		// 間は灰色
		expect(s.data[0]).toBe(128);
	});
});
