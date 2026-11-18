import { describe, expect, it } from 'vitest';
import { decodePng, diffRatio, encodePng } from './png.ts';

const img = (w: number, h: number, f: (x: number, y: number) => [number, number, number]) => {
	const px = new Uint8Array(w * h * 4);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const [r, g, b] = f(x, y);
			px.set([r, g, b, 255], (y * w + x) * 4);
		}
	return { width: w, height: h, data: px };
};

describe('PNG を読む（look-learn.ts --motion の画素の差）', () => {
	it('書いた物を読み戻すと同じ画素', () => {
		const a = img(7, 5, (x, y) => [x * 30, y * 40, (x + y) * 10]);
		for (const filter of [0, 1, 2, 3, 4] as const) {
			const b = decodePng(encodePng(a, filter));
			expect(b.width).toBe(7);
			expect(b.height).toBe(5);
			expect([...b.data]).toEqual([...a.data]);
		}
	});
	it('差の割合：同じなら 0、1 画素だけ違えば 1/画素の数', () => {
		const a = img(10, 10, () => [10, 10, 10]);
		const b = img(10, 10, (x, y) => (x === 3 && y === 4 ? [200, 10, 10] : [10, 10, 10]));
		expect(diffRatio(a, a)).toBe(0);
		expect(diffRatio(a, b)).toBeCloseTo(0.01);
	});
	it('わずかな色の揺れ（8 以下）は差に数えない', () => {
		const a = img(4, 4, () => [100, 100, 100]);
		const b = img(4, 4, () => [104, 100, 97]);
		expect(diffRatio(a, b)).toBe(0);
	});
});
