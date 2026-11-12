// 段 10：書いたレッスンが curriculum.md 第 5 章の表と合い、game-design.md 第 8 章の手と対応している。
// 知識グラフは、表の推奨前提・関連・次のうち、書いてあるレッスンだけを持つ（全て書けば表と同じになる）。
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MOVES } from '../game/data.ts';
import { parseCurriculum, practiceKey } from './curriculum-parse.ts';
import { lessons } from './lessons.ts';

const rows = parseCurriculum(readFileSync('docs/curriculum.md', 'utf8'));
const written = new Set(lessons.map((l) => l.id));
const only = (ids: string[]) => ids.filter((x) => written.has(x));

describe('カリキュラムの表', () => {
	it('163 本ある', () => {
		expect(rows).toHaveLength(163);
	});
});

describe('書いたレッスンが表と合う', () => {
	for (const l of lessons) {
		const r = rows.find((x) => x.id === l.id);
		it(`${l.id}：表にあり、難易度・題・到達目標・実戦の形が同じ`, () => {
			expect(r, l.id).toBeDefined();
			expect({
				level: l.level,
				title: l.title,
				goal: l.goal,
				practice: practiceKey(l.practice)
			}).toEqual({
				level: r?.level,
				title: r?.title,
				goal: r?.goal,
				practice: r?.practice
			});
		});
		it(`${l.id}：推奨前提・関連・次が表と同じ（書いてある物だけ）`, () => {
			expect({ prereq: l.prereq, related: l.related, next: l.next }).toEqual({
				prereq: only(r?.prereq ?? []),
				related: only(r?.related ?? []),
				next: only(r?.next ?? [])
			});
		});
		it(`${l.id}：ゲームの手（game-design.md 第 8 章）がある`, () => {
			expect(MOVES.some((m) => m.lesson === l.id)).toBe(true);
		});
	}
});
