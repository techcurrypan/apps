import { describe, expect, it } from 'vitest';
import { metricsUpTo, paraNow, stepDur, type StepLike } from './view3.ts';

const steps: StepLike[] = [
	{ metrics: { cwnd: '10 MSS', rtt: '30 ms' }, at: [0, 1500], dur: 4000 },
	{ metrics: { cwnd: '20 MSS' } },
	{}
];

describe('metricsUpTo（指標はそのステップまでの値を重ねる）', () => {
	it('前のステップの値を引き継ぎ、新しい値で上書きする', () => {
		expect(metricsUpTo(steps, 0)).toEqual({ cwnd: '10 MSS', rtt: '30 ms' });
		expect(metricsUpTo(steps, 2)).toEqual({ cwnd: '20 MSS', rtt: '30 ms' });
	});
});

describe('paraNow（今光る段落）', () => {
	it('時刻で段落が進む。時刻が無ければ最初の段落', () => {
		expect(paraNow(steps[0], 2, 0)).toBe(0);
		expect(paraNow(steps[0], 2, 1600)).toBe(1);
		expect(paraNow(steps[1], 3, 9000)).toBe(0);
	});
});

describe('stepDur（ステップの動きの長さ）', () => {
	it('書いた長さ、無ければ 4000', () => {
		expect(stepDur(steps[0])).toBe(4000);
		expect(stepDur(steps[2])).toBe(4000);
	});
});
