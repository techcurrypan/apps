import { describe, expect, it } from 'vitest';
import { lessons } from '../content/lessons.ts';

// LS-C2：図の名札・台本の「町では」・中身の板の見出しで、IT の物と町の物が 1 対 1 で対応する
describe('町の呼び名は IT の物と 1 対 1（LS-C2）', () => {
	const withMap = lessons.filter((l) => l.map);
	it('図を持つレッスンがある', () => {
		expect(withMap.length).toBeGreaterThan(0);
	});
	for (const l of withMap)
		it(`${l.id}：町の呼び名が機械ごとに違い、全ての機械に呼び名がある`, () => {
			const towns = Object.values(l.map?.nodes ?? {}).map((n) => n.town);
			expect(towns.every((t) => t.trim() !== '')).toBe(true);
			expect(new Set(towns).size).toBe(towns.length);
		});
});
