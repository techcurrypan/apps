import { describe, expect, it } from 'vitest';
import { frameSeconds } from './time.ts';

// 描画の 1 コマの長さ（秒）。描画の時刻は、組み立ての後に取った時刻より前のことがある（画面を行き来して街を開き直したとき）
describe('1 コマの長さ', () => {
	it('前のコマとの差を秒で返し、0.1 秒で頭打ち', () => {
		expect(frameSeconds(1016, 1000)).toBeCloseTo(0.016);
		expect(frameSeconds(5000, 1000)).toBe(0.1);
	});
	it('描画の時刻が前の時刻より前でも、負にならない', () => {
		expect(frameSeconds(990, 1000)).toBe(0);
	});
	it('数でない時刻は 0', () => {
		expect(frameSeconds(Number.NaN, 1000)).toBe(0);
	});
});
