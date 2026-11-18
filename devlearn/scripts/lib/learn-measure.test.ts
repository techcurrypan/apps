import { describe, expect, it } from 'vitest';
import { judgeLayout, type Layout } from './learn-measure.ts';

const base: Layout = {
	size: '1440x900',
	overflowX: 0,
	dia: { w: 980, h: 560, area: 45 },
	toc: { w: 56 },
	narr: { w: 380 },
	term: null,
	termFont: 0,
	termRows: 0,
	visible: {
		top: true,
		head: true,
		dia: true,
		metrics: true,
		legend: true,
		steps: true,
		title: true,
		para: true,
		next: true,
		insideHead: true
	},
	insideRows: 2,
	innerScroll: [],
	minFont: 11,
	minDia: 12,
	outside: [],
	overlaps: []
};

describe('配置の合否（look-learn.ts --layout）', () => {
	it('第 2 版の数を満たせば全て合格', () => {
		const r = judgeLayout(base, 'watch');
		expect(Object.values(r).every((v) => v === true)).toBe(true);
		expect(Object.keys(r)).toEqual(
			expect.arrayContaining(['LS-A1', 'LS-A2', 'LS-A3', 'LS-A4', 'LS-D1', 'LS-D6', 'LS-A7'])
		);
	});
	it('第 1 版の大きさ（440×230 の図・210px の目次）は落ちる', () => {
		const r = judgeLayout(
			{ ...base, dia: { w: 440, h: 230, area: 8 }, toc: { w: 210 }, minDia: 6.4 },
			'watch'
		);
		expect(r['LS-A1']).not.toBe(true);
		expect(r['LS-A2']).not.toBe(true);
		expect(r['LS-A7']).not.toBe(true);
	});
	it('やってみるの端末は 640×520・13.5〜14px・28 行', () => {
		const ok = judgeLayout(
			{ ...base, term: { w: 660, h: 560 }, termFont: 14, termRows: 30 },
			'try'
		);
		expect(ok['LS-P1']).toBe(true);
		expect(ok['LS-P2']).toBe(true);
		const ng = judgeLayout(
			{ ...base, term: { w: 400, h: 300 }, termFont: 12, termRows: 12 },
			'try'
		);
		expect(ng['LS-P1']).not.toBe(true);
		expect(ng['LS-P2']).not.toBe(true);
	});
	it('携帯の幅では横のはみ出しと図の高さ・図の字 11px', () => {
		const r = judgeLayout(
			{ ...base, size: '390x844', dia: { w: 390, h: 280, area: 33 }, minDia: 10 },
			'watch'
		);
		expect(r['LS-X1']).not.toBe(true);
		expect(r['LS-X2']).not.toBe(true);
	});
});
