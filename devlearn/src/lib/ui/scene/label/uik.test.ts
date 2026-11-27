import { describe, expect, it } from 'vitest';
import { LABEL_PX, labelOk, uikOf, zoomView } from './uik';

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

describe('寄る・引く（16.3 の確かめ）', () => {
	it('zoomView：倍率 2 で中心を保って半分の範囲、0.5 で倍の範囲', () => {
		expect(zoomView(1000, 600, 2)).toEqual([250, 150, 500, 300]);
		expect(zoomView(1000, 600, 0.5)).toEqual([-500, -300, 2000, 1200]);
		expect(zoomView(1000, 600, 1)).toEqual([0, 0, 1000, 600]);
	});
	it('倍率を変えても、uik を掛けた字は画面の上で同じ px', () => {
		for (const z of [0.5, 1, 2]) {
			const [, , w, h] = zoomView(1000, 600, z);
			const k = uikOf(w, h, 940, 564);
			const scale = Math.min(940 / w, 564 / h);
			expect(LABEL_PX.name * k * scale).toBeCloseTo(14);
		}
	});
	it('labelOk：札の種類ごとの範囲（名前 13〜15・説明 12〜13・数 12〜14・線 12〜13）', () => {
		expect(labelOk('name', 14)).toBe(true);
		expect(labelOk('name', 12.9)).toBe(false);
		expect(labelOk('name', 15.2)).toBe(false);
		expect(labelOk('sub', 12.5)).toBe(true);
		expect(labelOk('num', 11.5)).toBe(false);
		expect(labelOk('line', 12.5)).toBe(true);
		expect(labelOk('note', 13)).toBe(true);
	});
});
