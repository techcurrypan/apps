import { describe, expect, it } from 'vitest';
import { TIP_MAX_W, placeTip } from './tip';

// learn-standard.md 18.3 H1：吹き出しは最大 300px 幅で、図の枠から出ない
const box = { w: 940, h: 520 };
describe('吹き出しの置き場（placeTip）', () => {
	it('幅は 300px まで', () => {
		expect(TIP_MAX_W).toBe(300);
	});
	it('物の上の空いた所に、物の真ん中にそろえて置く', () => {
		const p = placeTip({ x: 400, y: 300, w: 100, h: 60 }, { w: 200, h: 80 }, box);
		expect(p).toEqual({ left: 350, top: 300 - 80 - 10, below: false });
	});
	it('上に入らない時は、物の下に置く', () => {
		const p = placeTip({ x: 400, y: 20, w: 100, h: 60 }, { w: 200, h: 80 }, box);
		expect(p.below).toBe(true);
		expect(p.top).toBe(20 + 60 + 10);
	});
	it('左右は枠の中に押し戻す（8px の余白）', () => {
		expect(placeTip({ x: 0, y: 300, w: 40, h: 40 }, { w: 200, h: 80 }, box).left).toBe(8);
		expect(placeTip({ x: 920, y: 300, w: 20, h: 40 }, { w: 200, h: 80 }, box).left).toBe(
			940 - 200 - 8
		);
	});
	it('上にも下にも入らない時は、枠の中に収める', () => {
		const p = placeTip({ x: 400, y: 10, w: 100, h: 500 }, { w: 200, h: 80 }, box);
		expect(p.top).toBeGreaterThanOrEqual(8);
		expect(p.top + 80).toBeLessThanOrEqual(520 - 8);
	});
});

describe('画面の上の外枠から、枠の中の外枠へ（localRect）', () => {
	it('枠の左上を引く', async () => {
		const { localRect } = await import('./tip');
		expect(
			localRect({ left: 130, top: 250, width: 40, height: 30 }, { left: 100, top: 200 })
		).toEqual({ x: 30, y: 50, w: 40, h: 30 });
	});
});
