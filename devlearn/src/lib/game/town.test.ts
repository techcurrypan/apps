import { describe, expect, it } from 'vitest';
import { START_MINUTE } from './clock.ts';
import { townMap } from './map.ts';
import { applyTown, avgHappy, startTown, tickTown, type TownState } from './town.ts';

const map = townMap();
const T = START_MINUTE;
const s0 = () => startTown(1, map);
const run = (s: TownState, to: number) => tickTown(s, to, map);

describe('街の状態（段 8-2b：試作の要望の流れを、ゲーム内の時刻で移した）', () => {
	it('始まり：資金 5,000、要望はまだ無く、町内会長の要望が 20 分後に届く', () => {
		const s = s0();
		expect(s.minute).toBe(T);
		expect(s.build.money).toBe(5000);
		expect(s.requests).toEqual([]);
		const r = run(s, T + 20);
		expect(r.state.requests).toEqual([{ id: 'board', dayIn: 10, due: 13 }]);
		expect(r.events).toContainEqual({ type: 'arrive', id: 'board', at: T + 20 });
	});

	it('日が変わると、11 日に学校・12 日に診療所・13 日に港の要望が届く', () => {
		const r = run(s0(), T + 3 * 24 * 60);
		expect(r.state.requests.map((q) => q.id)).toEqual(['board', 'school', 'clinic', 'harbor']);
	});

	it('期限を過ぎると、依頼主の近くの満足度が下がり、期限が 2 日延びる', () => {
		const a = run(s0(), T + 20).state;
		const b = run(a, T + 4 * 24 * 60);
		const board = b.state.requests.find((q) => q.id === 'board');
		expect(board?.due).toBe(16);
		expect(b.events.some((e) => e.type === 'expire' && e.id === 'board')).toBe(true);
		const near = map.feat.board.id;
		expect(b.state.happy[near]).toBeLessThan(a.happy[near]);
	});

	it('学ばずに外に頼む：費用を払い、要望が片付き、近くの満足度が上がる。次の要望が 90 分後に届く', () => {
		const a = run(s0(), T + 20).state;
		const r = applyTown(a, { type: 'answer', id: 'board', how: 'out' }, map);
		expect(r.ok).toBe(true);
		expect(r.state.build.money).toBe(5000 - 900);
		expect(r.state.answered).toEqual({ board: 'out' });
		expect(r.state.requests).toEqual([]);
		expect(avgHappy(r.state, map)).toBeGreaterThan(avgHappy(a, map));
		const later = run(r.state, a.minute + 90);
		expect(later.state.requests.map((q) => q.id)).toEqual(['shop']);
	});

	it('学んだ手は、学ぶまで選べない（理由を返し、状態を変えない）', () => {
		const a = run(s0(), T + 20).state;
		const no = applyTown(a, { type: 'answer', id: 'board', how: 'learned' }, map);
		expect(no).toMatchObject({ ok: false, why: '解説を受けると選べる' });
		expect(no.state).toBe(a);
		const l = applyTown(a, { type: 'learn', lesson: 'git' }, map).state;
		const yes = applyTown(l, { type: 'answer', id: 'board', how: 'learned' }, map);
		expect(yes.ok).toBe(true);
		expect(yes.state.build.money).toBe(5000 - 200);
	});

	it('街づくりの操作も同じ apply で動く（指定・公園・道路・取り壊し）', () => {
		let s = s0();
		s = applyTown(s, { type: 'zone', lot: 0, kind: 'home' }, map).state;
		s = applyTown(s, { type: 'park', lot: 1 }, map).state;
		expect(s.build.money).toBe(5000 - 20 - 80);
		const park = s.build.placed[0];
		expect(s.happy[park.id]).toBe(0.7);
		s = applyTown(s, { type: 'bulldoze', id: park.id }, map).state;
		expect(s.build.placed).toHaveLength(0);
		const r = applyTown(
			s,
			{ type: 'road', a: { x: 240, z: -80, node: true }, b: { x: 400, z: -80 } },
			map
		);
		expect(r.ok).toBe(true);
		expect(r.state.build.roads).toHaveLength(1);
	});

	it('時計を一度に進めても、刻んで進めても同じ状態になる', () => {
		let s = applyTown(s0(), { type: 'zone', lot: 0, kind: 'home' }, map).state;
		s = applyTown(s, { type: 'zone', lot: 1, kind: 'shop' }, map).state;
		const once = run(s, T + 2000).state;
		let step = s;
		for (let m = T + 7; m < T + 2000; m += 13) step = run(step, m).state;
		step = run(step, T + 2000).state;
		expect(step).toEqual(once);
	});
});
