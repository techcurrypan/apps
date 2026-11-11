import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGameData } from './data-parse.ts';
import { CAUSES, GROUPS, MOVES, TITLES } from './data.ts';

const doc = parseGameData(
	readFileSync('docs/game-design.md', 'utf8'),
	readFileSync('docs/curriculum.md', 'utf8')
);

describe('ゲームの決まったデータ（game-design.md 第 8・9 章）', () => {
	it('文書の表と一字も違わない（違えば npx tsx scripts/game-data.ts で書き直す）', () => {
		expect(MOVES).toEqual(doc.moves);
		expect(CAUSES).toEqual(doc.causes);
		expect(GROUPS).toEqual(doc.groups);
		expect(TITLES).toEqual(doc.titles);
	});

	it('手は 163 本で、どのレッスンにも題がある', () => {
		expect(MOVES).toHaveLength(163);
		for (const m of MOVES) expect(TITLES[m.lesson], m.lesson).toBeTruthy();
	});

	it('症状は 34 で、章 1〜4 に分かれ、どの症状の原因も 4 つ以上あり、全て 9.1 にある', () => {
		expect(GROUPS).toHaveLength(34);
		const ids = new Set(CAUSES.map((c) => c.id));
		for (const g of GROUPS) {
			expect([1, 2, 3, 4]).toContain(g.week);
			expect(g.causes.length).toBeGreaterThanOrEqual(4);
			for (const c of g.causes) expect(ids.has(c), `${g.id} ${c}`).toBe(true);
		}
	});

	it('手の調べる・直す原因は、全て 9.1 にある', () => {
		const ids = new Set(CAUSES.map((c) => c.id));
		for (const m of MOVES)
			for (const c of [...m.tests, ...m.fixes]) expect(ids.has(c), `${m.lesson} ${c}`).toBe(true);
	});
});
