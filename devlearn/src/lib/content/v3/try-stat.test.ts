import { describe, expect, it } from 'vitest';
import { startTry, tasksDone, typeLine, type TryState } from '../../learn/try3.ts';
import { TRY_STAT, statFig } from './try-stat.ts';

const type = (lines: string[], s: TryState = startTry(TRY_STAT)) =>
	lines.reduce((st, l) => typeLine(TRY_STAT, st, l), s);
const outs = (s: TryState) =>
	s.lines.filter((l) => l.kind !== 'cmd' && l.kind !== 'note').map((l) => l.text);

// やってみる（stat）：本物の JavaScript で、模擬の 30 人（waits）から平均・標準誤差・z 値・信頼区間を出す
describe('やってみる（stat・本物の JavaScript）', () => {
	it('標準誤差 4 / Math.sqrt(30) は本物の値', () => {
		expect(outs(type(['4 / Math.sqrt(30)']))).toEqual(['0.7302967433402214']);
	});
	it('waits(30, 20) は 20 日目の 30 人。平均は 4.64 分', () => {
		const s = type([
			'const x = waits(30, 20)',
			'x.length',
			'const m = x.reduce((a, b) => a + b, 0) / x.length',
			'm.toFixed(2)'
		]);
		expect(outs(s)).toEqual(['undefined', '30', 'undefined', "'4.64'"]);
	});
	it('やることが順に済む：標準誤差 → 標本 → 平均 → z 値 → 信頼区間', () => {
		const s = type([
			'const se = 4 / Math.sqrt(30)',
			'se',
			'const x = waits(30, 20)',
			'const m = x.reduce((a, b) => a + b, 0) / x.length',
			'm',
			'(m - 4) / se',
			'[m - 1.96 * se, m + 1.96 * se]'
		]);
		expect(tasksDone(TRY_STAT, s)).toEqual([true, true, true, true, true]);
		expect(statFig(s)).toMatchObject({ day: 20, mean: expect.closeTo(4.644, 3), ci: true });
	});
	it('済む前は図に印が無い', () => {
		expect(statFig(type(['1 + 1']))).toMatchObject({ day: null, mean: null, ci: false });
	});
});
