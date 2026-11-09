import { describe, expect, it } from 'vitest';
import { clone, validLesson } from '../../src/lib/lesson/testing/fixture.ts';
import { report } from './content-report.ts';

describe('content:check の報告', () => {
	it('落ちた物が無ければ ok で、本数を伝える', () => {
		const r = report([validLesson('tst-001'), validLesson('tst-002')]);
		expect(r.ok).toBe(true);
		expect(r.lines.join('\n')).toContain('2 本');
	});
	it('落ちた物があれば ok でなく、レッスン・項目・場所を 1 行ずつ出す', () => {
		const l = clone(validLesson());
		l.explain[1].facts = [];
		const r = report([l]);
		expect(r.ok).toBe(false);
		const line = r.lines.find((x) => x.includes('tst-001'));
		expect(line).toContain('検査 2');
		expect(line).toContain('ステップ 2');
	});
	it('レッスンが 0 本なら落とす', () => {
		expect(report([]).ok).toBe(false);
	});
});
