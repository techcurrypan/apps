// stateAt(lesson, n)：ステップ n の全ての表し方の中身を、純粋に返す。
import { describe, expect, it } from 'vitest';
import { stateAt } from './state.ts';
import { clone, validLesson } from './testing/fixture.ts';
import type { Lesson } from './types.ts';

function deepFreeze<T>(v: T): T {
	if (v !== null && typeof v === 'object') {
		for (const x of Object.values(v)) deepFreeze(x);
		Object.freeze(v);
	}
	return v;
}

// 物が増え、値が変わり、運ばれ、消える見本
function scenario(): Lesson {
	const l = clone(validLesson());
	l.explain[1].scene = [
		{ op: 'appear', id: 'b', label: '箱 B', sub: '受け手', at: [2, 0] },
		{ op: 'change', id: 'a', k: '値', v: '20' }
	];
	l.explain[2].scene = [
		{ op: 'highlight', id: 'a' },
		{ op: 'move', from: 'a', to: 'b', payload: '20', kind: 'send' }
	];
	l.explain[3].scene = [
		{ op: 'change', id: 'b', k: '値', v: '20' },
		{ op: 'change', id: 'a', k: '値', v: '40' }
	];
	l.explain[4].scene = [{ op: 'vanish', id: 'a' }];
	return deepFreeze(l);
}

describe('stateAt', () => {
	it('同じ n で同じ結果', () => {
		const l = scenario();
		for (let n = 1; n <= 5; n++) expect(stateAt(l, n)).toEqual(stateAt(l, n));
	});

	it('n に飛んでも、順に進めても、戻っても同じ結果', () => {
		const l = scenario();
		const jumped = [1, 2, 3, 4, 5].map((n) => stateAt(l, 5 - 5 + n));
		const forward: ReturnType<typeof stateAt>[] = [];
		for (let n = 1; n <= 5; n++) forward.push(stateAt(l, n));
		const backward: ReturnType<typeof stateAt>[] = [];
		for (let n = 5; n >= 1; n--) backward.unshift(stateAt(l, n));
		const zigzag = [4, 1, 5, 2, 3].map((n) => [n, stateAt(l, n)] as const);
		expect(forward).toEqual(jumped);
		expect(backward).toEqual(jumped);
		for (const [n, s] of zigzag) expect(s).toEqual(jumped[n - 1]);
	});

	it('レッスンのデータを書き換えない', () => {
		const l = scenario();
		expect(() => stateAt(l, 5)).not.toThrow();
	});

	it('返した物を書き換えても、次の結果に響かない', () => {
		const l = scenario();
		const s = stateAt(l, 3);
		s.scene.after.nodes.length = 0;
		s.log.rows.length = 0;
		expect(stateAt(l, 3).scene.after.nodes.length).toBe(2);
		expect(stateAt(l, 3).log.rows.length).toBe(3);
	});

	it('全ての表し方が同じステップを指す', () => {
		const l = scenario();
		for (let n = 1; n <= 5; n++) {
			const s = stateAt(l, n);
			expect(s.n).toBe(n);
			expect(s.text.n).toBe(n);
			expect(s.facts.n).toBe(n);
			expect(s.scene.n).toBe(n);
			expect(s.log.n).toBe(n);
			expect(s.log.rows.at(-1)?.n).toBe(n);
			expect(s.progress.n).toBe(n);
			expect(s.progress.steps.filter((x) => x.state === 'current').map((x) => x.n)).toEqual([n]);
			expect(s.text.title).toBe(l.explain[n - 1].title);
			expect(s.facts.rows).toEqual(l.explain[n - 1].facts);
		}
	});

	it('ステップ 1 の前の図は空', () => {
		expect(stateAt(scenario(), 1).scene.before.nodes).toEqual([]);
	});

	it('ステップ n の前の図は、ステップ n-1 の後の図と同じ（強調は除く）', () => {
		const l = scenario();
		for (let n = 2; n <= 5; n++) {
			const prevAfter = stateAt(l, n - 1).scene.after.nodes.map((x) => ({
				...x,
				highlighted: false
			}));
			expect(stateAt(l, n).scene.before.nodes).toEqual(prevAfter);
		}
	});

	it('appear で物が増え、vanish で消える', () => {
		const l = scenario();
		expect(stateAt(l, 1).scene.after.nodes.map((x) => x.id)).toEqual(['a']);
		expect(stateAt(l, 2).scene.after.nodes.map((x) => x.id)).toEqual(['a', 'b']);
		expect(stateAt(l, 5).scene.before.nodes.map((x) => x.id)).toEqual(['a', 'b']);
		expect(stateAt(l, 5).scene.after.nodes.map((x) => x.id)).toEqual(['b']);
	});

	it('change の動きは、変わる前と後の値を持つ', () => {
		const s = stateAt(scenario(), 4);
		expect(s.scene.motion).toEqual([
			{ op: 'change', id: 'b', k: '値', before: null, after: '20' },
			{ op: 'change', id: 'a', k: '値', before: '20', after: '40' }
		]);
		const a = s.scene.after.nodes.find((x) => x.id === 'a');
		expect(a?.props).toEqual([{ k: '値', v: '40' }]);
	});

	it('move は動きに出て、図の物は増えない', () => {
		const s = stateAt(scenario(), 3);
		expect(s.scene.motion).toContainEqual({
			op: 'move',
			from: 'a',
			to: 'b',
			payload: '20',
			kind: 'send'
		});
		expect(s.scene.after.nodes.map((x) => x.id)).toEqual(['a', 'b']);
	});

	it('highlight はそのステップの後の図だけで光る', () => {
		const l = scenario();
		expect(stateAt(l, 3).scene.after.nodes.find((x) => x.id === 'a')?.highlighted).toBe(true);
		expect(stateAt(l, 4).scene.after.nodes.find((x) => x.id === 'a')?.highlighted).toBe(false);
	});

	it('vanish の動きは消える物の名前を持つ', () => {
		expect(stateAt(scenario(), 5).scene.motion).toEqual([{ op: 'vanish', id: 'a', label: '箱 A' }]);
	});

	it('進んだ所までしか見せない', () => {
		const l = scenario();
		const s = stateAt(l, 2);
		expect(s.log.rows.map((r) => r.n)).toEqual([1, 2]);
		expect(s.progress.steps.map((x) => x.state)).toEqual([
			'done',
			'current',
			'ahead',
			'ahead',
			'ahead'
		]);
		expect(s.progress.steps.map((x) => x.title)).toEqual([
			l.explain[0].title,
			l.explain[1].title,
			null,
			null,
			null
		]);
		expect(s.progress.total).toBe(5);
	});

	it('範囲の外の n は RangeError', () => {
		const l = scenario();
		expect(() => stateAt(l, 0)).toThrow(RangeError);
		expect(() => stateAt(l, 6)).toThrow(RangeError);
		expect(() => stateAt(l, 1.5)).toThrow(RangeError);
	});
});
