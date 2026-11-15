import { describe, expect, it } from 'vitest';
import { MOVES } from '../game/data.ts';
import { growsOf } from './grow.ts';

describe('この学びで育つ物（LS-C1）', () => {
	it('第 8 章の手の名前と、効く要望が出る', () => {
		const m = MOVES[0];
		const g = growsOf(m.lesson, m.lesson.slice(0, 3));
		expect(g.moves).toContain(m.name);
		expect(g.requests.length).toBeGreaterThan(0);
		expect(g.system).toBe('工房');
	});
	it('手の無い ID なら、手も要望も空', () => {
		expect(growsOf('zzz-999', 'zzz')).toEqual({ moves: [], requests: [], more: 0, system: null });
	});
});
