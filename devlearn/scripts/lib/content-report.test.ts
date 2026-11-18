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

describe('第 2 版の材料（検査 34・38）', () => {
	it('一次情報の表は「## 6.」の節の URL だけを読む', async () => {
		const { primarySources } = await import('./content-report.ts');
		const md =
			'## 5. x\n| a | https://a.example/x |\n## 6. 一次情報\n| r | https://www.rfc-editor.org/rfc/rfc9293 |\n## 7. y\n| https://b.example |';
		expect([...primarySources(md)]).toEqual(['https://www.rfc-editor.org/rfc/rfc9293']);
	});
	it('査読の置き場が無ければ空', async () => {
		const { reviewsOf } = await import('./content-report.ts');
		expect(reviewsOf('/no/such/dir')).toEqual({});
	});
});
