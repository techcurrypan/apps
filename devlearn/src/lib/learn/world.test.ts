import { describe, expect, it } from 'vitest';
import { clone, validLesson } from '../lesson/testing/fixture.ts';
import type { Lesson, World } from '../lesson/types.ts';
import { geometryOf } from './geometry.ts';
import { freshOf, worldAt, worldSize } from './world.ts';

const chain = (n: number): World => ({
	kind: 'chain',
	near: 'a',
	items: Array.from({ length: n }, (_, i) => ({
		id: `c${i}`,
		text: `記録 ${i + 1}`,
		...(i === n - 1 ? { tag: 'main' } : {})
	}))
});
function withWorld(): Lesson {
	const l = clone(validLesson());
	l.explain[0].world = chain(1);
	l.explain[2].world = chain(2);
	return l;
}

describe('世界の状態（LS-D8）', () => {
	it('ステップ n の後の世界は、n 以前で最後に書かれた物。書く前は無い', () => {
		const l = withWorld();
		expect(worldAt(l, 0)).toBeNull();
		expect(worldAt(l, 1)?.kind).toBe('chain');
		const w2 = worldAt(l, 2);
		expect(w2?.kind === 'chain' && w2.items.length).toBe(1);
		const w3 = worldAt(l, 3);
		expect(w3?.kind === 'chain' && w3.items.length).toBe(2);
	});
	it('前の世界に無かった物に「増えた」の印', () => {
		expect([...freshOf(chain(1), chain(2))]).toEqual(['c1']);
		expect([...freshOf(null, chain(1))]).toEqual([]);
	});
	it('大きさは中身の数で決まる', () => {
		expect(worldSize(chain(3)).w).toBeGreaterThan(worldSize(chain(1)).w);
	});
	it('図の枠は世界の箱を含み、置き場は機械の下で、ほかの機械に重ならない', () => {
		const l = withWorld();
		const g = geometryOf(l);
		const r = g.worlds.get('a');
		expect(r).toBeDefined();
		if (!r) return;
		const a = g.nodes.find((n) => n.id === 'a');
		expect(r.y).toBeGreaterThanOrEqual((a?.boxes.all.y ?? 0) + (a?.boxes.all.h ?? 0));
		expect(r.x).toBeGreaterThanOrEqual(g.bounds.x);
		expect(r.y + r.h).toBeLessThanOrEqual(g.bounds.y + g.bounds.h);
	});
});
