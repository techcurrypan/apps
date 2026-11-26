import { describe, expect, it } from 'vitest';
import {
	COUNT_MS,
	LOOP_GAP,
	countAt,
	flowAt,
	frameDt,
	start,
	tick,
	togglePlay,
	type Clock
} from './player';

describe('繰り返し再生（LS3-M1）', () => {
	it('ステップの動きが終わると 2.6 秒置いて最初から流し直す', () => {
		expect(LOOP_GAP).toBe(2600);
		let c: Clock = start();
		c = tick(c, 5000, 5000);
		expect(c.t).toBe(5000);
		c = tick(c, 2600, 5000);
		expect(c.t).toBe(7600);
		expect(c.loops).toBe(0);
		c = tick(c, 16, 5000);
		expect(c.t).toBe(0);
		expect(c.loops).toBe(1);
	});
	it('一時停止を押した時だけ止まる。止めた時は止めた形のまま', () => {
		let c = tick(start(), 1200, 5000);
		c = togglePlay(c);
		const stopped = tick(c, 3000, 5000);
		expect(stopped.t).toBe(1200);
		expect(tick(togglePlay(stopped), 100, 5000).t).toBe(1300);
	});
	it('速さを掛ける', () => {
		expect(tick({ ...start(), speed: 2 }, 100, 5000).t).toBe(200);
		expect(tick({ ...start(), speed: 0.5 }, 100, 5000).t).toBe(50);
	});
	it('1 コマが長くても（タブを隠した後など）60 ms までしか進めない', () => {
		expect(tick(start(), frameDt(5000), 99999).t).toBe(60);
		expect(frameDt(-5)).toBe(0);
	});
	it('動きを減らす設定では、動きを 6 倍速で終わらせる（止まった形を早く見せる）', () => {
		expect(tick(start(), 50, 5000, { reduce: true }).t).toBe(300);
	});
});

describe('数え上げ（LS3-M3）', () => {
	it('0.9 秒かけて前の値から新しい値へ', () => {
		expect(COUNT_MS).toBe(900);
		expect(countAt(0, 100, 0)).toBe(0);
		expect(countAt(0, 100, 450)).toBe(50);
		expect(countAt(0, 100, 900)).toBe(100);
		expect(countAt(0, 100, 5000)).toBe(100);
	});
	it('整数どうしは整数で数え上がる', () => {
		for (let t = 0; t <= 900; t += 37) expect(Number.isInteger(countAt(3, 17, t))).toBe(true);
	});
	it('小数は桁をそろえる（前と後の多い方の小数の桁）', () => {
		expect(countAt(0.5, 1.25, 900)).toBe(1.25);
		expect(String(countAt(0.5, 1.25, 300)).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
	});
});

describe('線の点の流れ（LS3-M2）', () => {
	it('描画の時刻で回り、一時停止とは関係なく流れる', () => {
		expect(flowAt(0)).toBe(0);
		expect(flowAt(800)).toBeCloseTo(0.5);
		expect(flowAt(1600)).toBeCloseTo(0);
	});
	it('動きを減らす設定では点を止める（null）', () => {
		expect(flowAt(800, { reduce: true })).toBeNull();
	});
});
