import { describe, expect, it } from 'vitest';
import { START_MINUTE } from './clock.ts';
import { MOVES } from './data.ts';
import { townMap } from './map.ts';
import {
	applyTown,
	replayTown,
	startTown,
	tickTown,
	type TownAction,
	type TownSave,
	type TownState
} from './town.ts';

const map = townMap();
const T = START_MINUTE;
const DAY = 24 * 60;

// 種 1 の 1 日目の要望 3 件に、決まった遊び方で応える
const first = startTown(1, map).desk.requests;
const hit = MOVES.find((m) => m.tests.includes(first[0].truth))!;
const other = MOVES.find(
	(m) => m.lesson !== hit.lesson && m.tests.some((c) => first[1].candidates.includes(c))
)!;
/** 修了したレッスン：1 件目の原因を調べられる手だけ */
const LEARNED = new Set([hit.lesson]);

/** 決まった遊び方：時刻と手の並び。打てた手だけを記録に残す（画面の act と同じ） */
const PLAN: { at: number; action: TownAction }[] = [
	{ at: T + 5, action: { type: 'zone', lot: 0, kind: 'home' } },
	{ at: T + 5, action: { type: 'zone', lot: 1, kind: 'shop' } },
	{ at: T + 30, action: { type: 'test', move: other.lesson, request: first[1].id } }, // 学んでいないので打てない
	{ at: T + 30, action: { type: 'test', move: hit.lesson, request: first[0].id } },
	{ at: T + 200, action: { type: 'ask', request: first[1].id } },
	{ at: T + 300, action: { type: 'park', lot: 2 } },
	{ at: T + 300, action: { type: 'outsource', request: first[2].id } },
	{ at: T + DAY + 90, action: { type: 'ask', request: first[1].id } }
];

function play(seed: number, until: number) {
	let s: TownState = startTown(seed, map);
	const actions: TownSave['actions'] = [];
	const states: TownState[] = [];
	for (const p of PLAN) {
		if (p.at > until) break;
		s = tickTown(s, p.at, map).state;
		const r = applyTown(s, p.action, map, LEARNED);
		if (r.ok) {
			s = r.state;
			actions.push({ at: p.at, action: p.action });
			states.push(s);
		}
	}
	s = tickTown(s, until, map).state;
	const save: TownSave = { version: 1, seed, now: until, actions };
	return { state: s, save, states };
}

describe('手の記録から作り直す（game-design.md 15.9・15.11 の replay）', () => {
	it('記録には打てた手だけが入る', () => {
		const { save } = play(1, T + 2 * 24 * 60);
		expect(save.actions).toHaveLength(7);
		expect(
			save.actions.some((a) => a.action.type === 'test' && a.action.move === other.lesson)
		).toBe(false);
	});

	it('記録から作り直すと、遊んだ後と同じ状態になる', () => {
		const { state, save } = play(1, T + 2 * 24 * 60);
		expect(replayTown(save, map).state).toEqual(state);
	});

	it('同じ種と同じ記録から 2 回流して同じ状態（A-11）', () => {
		const { save } = play(3, T + 3 * 24 * 60);
		expect(replayTown(save, map).state).toEqual(replayTown(save, map).state);
	});

	it('文字にして戻しても同じ（localStorage に置ける形）', () => {
		const { state, save } = play(1, T + 2 * 24 * 60);
		const back = JSON.parse(JSON.stringify(save)) as TownSave;
		expect(replayTown(back, map).state).toEqual(state);
	});

	it('手ごとの状態を返す。k 番目は、k 番目の手を当てた直後の状態', () => {
		const { save, states } = play(1, T + 2 * 24 * 60);
		const r = replayTown(save, map);
		expect(r.states).toHaveLength(save.actions.length);
		r.states.forEach((s, k) => expect(s).toEqual(states[k]));
	});

	it('任意の時点：記録を途中で切ると、その時点の状態になる', () => {
		const full = play(1, T + 2 * 24 * 60);
		const mid = play(1, T + 300);
		const cut: TownSave = {
			...full.save,
			now: T + 300,
			actions: full.save.actions.filter((a) => a.at <= T + 300)
		};
		expect(replayTown(cut, map).state).toEqual(mid.state);
	});

	it('時の流れの知らせ（届いた・育った）も作り直せる', () => {
		const { save } = play(1, T + 2 * 24 * 60);
		const ev = replayTown(save, map).events;
		const morning2 = ev.find((e) => e.type === 'desk' && e.from === 'morning' && e.at === T + DAY);
		expect(morning2).toBeDefined();
		expect(ev.some((e) => e.type === 'grown')).toBe(true);
		expect(ev.some((e) => e.type === 'box')).toBe(true);
		for (let i = 1; i < ev.length; i++) expect(ev[i].at).toBeGreaterThanOrEqual(ev[i - 1].at);
	});

	it('当て直しでは、学んだ手の可否を問わずに当てる（記録した手は打てた手）', () => {
		const save: TownSave = {
			version: 1,
			seed: 1,
			now: T + 300,
			actions: [{ at: T + 30, action: { type: 'test', move: other.lesson, request: first[1].id } }]
		};
		const s = replayTown(save, map).state;
		const r = s.desk.requests.find((x) => x.id === first[1].id)!;
		expect(r.notes.length).toBe(1);
	});
});
