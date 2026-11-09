// 再生の操作：進む・戻る・飛ぶ・自動・速さ・もう一度。
import { describe, expect, it } from 'vitest';
import { initial, reduce, type PlayerState } from './control.ts';

const s0 = (): PlayerState => initial(5);

describe('操作', () => {
	it('最初はステップ 1、自動でない、速さ ×1', () => {
		expect(s0()).toEqual({ n: 1, total: 5, auto: false, speed: 1, run: 0 });
	});
	it('次へ・前へ。端では止まる', () => {
		let s = reduce(s0(), { type: 'next' });
		expect(s.n).toBe(2);
		s = reduce(reduce(s, { type: 'prev' }), { type: 'prev' });
		expect(s.n).toBe(1);
		s = reduce({ ...s, n: 5 }, { type: 'next' });
		expect(s.n).toBe(5);
	});
	it('ステップが替わると、動きを 1 から再生する', () => {
		expect(reduce(s0(), { type: 'next' }).run).toBe(1);
	});
	it('端で押しても、ステップが替わらなければ再生し直さない', () => {
		expect(reduce(s0(), { type: 'prev' }).run).toBe(0);
	});
	it('任意のステップへ飛ぶ。範囲の外は無視', () => {
		expect(reduce(s0(), { type: 'go', n: 4 }).n).toBe(4);
		expect(reduce(s0(), { type: 'go', n: 9 }).n).toBe(1);
		expect(reduce(s0(), { type: 'go', n: 0 }).n).toBe(1);
		expect(reduce(s0(), { type: 'first' }).n).toBe(1);
		expect(reduce(s0(), { type: 'last' }).n).toBe(5);
	});
	it('もう一度は、同じステップのまま再生し直す。何度でも', () => {
		let s = reduce(s0(), { type: 'go', n: 3 });
		const run = s.run;
		s = reduce(s, { type: 'replay' });
		s = reduce(s, { type: 'replay' });
		expect(s.n).toBe(3);
		expect(s.run).toBe(run + 2);
	});
	it('自動：動きが終わるたびに次へ。最後で止まる', () => {
		let s = reduce(s0(), { type: 'toggleAuto' });
		expect(s.auto).toBe(true);
		s = reduce({ ...s, n: 4 }, { type: 'autoAdvance' });
		expect(s.n).toBe(5);
		s = reduce(s, { type: 'autoAdvance' });
		expect(s.auto).toBe(false);
		expect(s.n).toBe(5);
	});
	it('最後のステップで自動を始めると、最初から流す', () => {
		const s = reduce({ ...s0(), n: 5 }, { type: 'toggleAuto' });
		expect(s.auto).toBe(true);
		expect(s.n).toBe(1);
	});
	it('自動でないときの autoAdvance は何もしない', () => {
		expect(reduce(s0(), { type: 'autoAdvance' })).toEqual(s0());
	});
	it('自分で動かすと自動は止まる', () => {
		const s = reduce(reduce(s0(), { type: 'toggleAuto' }), { type: 'prev' });
		expect(s.auto).toBe(false);
	});
	it('速さは ×0.5 / ×1 / ×2 の 3 段', () => {
		let s = reduce(s0(), { type: 'faster' });
		expect(s.speed).toBe(2);
		s = reduce(s, { type: 'faster' });
		expect(s.speed).toBe(2);
		s = reduce(reduce(s, { type: 'slower' }), { type: 'slower' });
		expect(s.speed).toBe(0.5);
		s = reduce(s, { type: 'slower' });
		expect(s.speed).toBe(0.5);
	});
});
