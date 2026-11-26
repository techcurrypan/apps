import { describe, expect, it } from 'vitest';
import { LABEL_PX, uikOf } from './uik';

describe('UIK（learn-standard.md 16.3：字は画面の上で一定）', () => {
	it('図の 1 単位が画面の何 px か：図の枠に合わせて縮む向きの大きい方', () => {
		// 1000×600 の図を 940×520 の枠に入れる → 縦が決まる（600/520）
		expect(uikOf(1000, 600, 940, 520)).toBeCloseTo(600 / 520);
		expect(uikOf(1000, 600, 2000, 1200)).toBeCloseTo(0.5);
	});
	it('字の大きさ × UIK を図の単位で書くと、画面の上でいつも同じ px', () => {
		for (const [w, h] of [
			[940, 520],
			[1400, 840],
			[720, 432]
		]) {
			const k = uikOf(1000, 600, w, h);
			const scale = Math.min(w / 1000, h / 600); // 図が枠に収まる倍率
			expect(LABEL_PX.name * k * scale).toBeCloseTo(LABEL_PX.name);
		}
	});
	it('枠の大きさが 0 の時（まだ測れていない）は 1', () => {
		expect(uikOf(1000, 600, 0, 0)).toBe(1);
	});
	it('名前の札は 13〜15px、数の札は 12〜14px の中', () => {
		expect(LABEL_PX.name).toBeGreaterThanOrEqual(13);
		expect(LABEL_PX.name).toBeLessThanOrEqual(15);
		expect(LABEL_PX.num).toBeGreaterThanOrEqual(12);
		expect(LABEL_PX.num).toBeLessThanOrEqual(14);
		expect(LABEL_PX.line).toBeGreaterThanOrEqual(12);
	});
});
