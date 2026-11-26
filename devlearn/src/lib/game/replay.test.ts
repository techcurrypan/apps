import { describe, expect, it } from 'vitest';
import { START_MINUTE } from './clock.ts';
import { MOVES } from './data.ts';
import { townMap } from './map.ts';
import {
	applyTown,
	replayTown,
	SAVE_VERSION,
	startTown,
	tickTown,
	type TownAction,
	type TownSave,
	type TownState
} from './town.ts';

const map = townMap();
const T = START_MINUTE;
const DAY = 24 * 60;

// 空き地から（15.12）：1 日目の 8:00 にレッスン 38 本に合格して人口 800 を超え、2 日目の朝に届く要望 3 件に、決まった遊び方で応える
const GROWN: { at: number; action: TownAction }[] = [...new Set(MOVES.map((m) => m.lesson))]
	.slice(0, 38)
	.map((lesson) => ({ at: T, action: { type: 'learn', lesson } }));
const D2 = T + DAY;
let grown = startTown(1, map);
for (const g of GROWN) grown = applyTown(grown, g.action, map, null).state;
const first = tickTown(grown, D2, map).state.desk.requests;
const hit = MOVES.find((m) => m.tests.includes(first[0].truth))!;
const other = MOVES.find(
	(m) => m.lesson !== hit.lesson && m.tests.some((c) => first[1].candidates.includes(c))
)!;
/** 修了したレッスン：1 件目の原因を調べられる手だけ */
const LEARNED = new Set([hit.lesson]);

/** 決まった遊び方：時刻と手の並び。打てた手だけを記録に残す（画面の act と同じ） */
const PLAN: { at: number; action: TownAction }[] = [
	...GROWN,
	{ at: D2 + 5, action: { type: 'zone', lot: 0, kind: 'home' } },
	{ at: D2 + 5, action: { type: 'zone', lot: 1, kind: 'shop' } },
	{ at: D2 + 30, action: { type: 'test', move: other.lesson, request: first[1].id } }, // 学んでいないので打てない
	{ at: D2 + 30, action: { type: 'test', move: hit.lesson, request: first[0].id } },
	{ at: D2 + 200, action: { type: 'ask', request: first[1].id } },
	{ at: D2 + 300, action: { type: 'park', lot: 2 } },
	{ at: D2 + 300, action: { type: 'outsource', request: first[2].id } },
	{ at: D2 + DAY + 90, action: { type: 'ask', request: first[1].id } }
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
	const save: TownSave = { version: SAVE_VERSION, seed, now: until, actions };
	return { state: s, save, states };
}

describe('手の記録から作り直す（game-design.md 15.9・15.11 の replay）', () => {
	it('記録には打てた手だけが入る', () => {
		const { save } = play(1, D2 + 2 * DAY);
		expect(save.actions).toHaveLength(GROWN.length + 7);
		expect(
			save.actions.some((a) => a.action.type === 'test' && a.action.move === other.lesson)
		).toBe(false);
	});

	it('記録から作り直すと、遊んだ後と同じ状態になる', () => {
		const { state, save } = play(1, D2 + 2 * DAY);
		expect(replayTown(save, map).state).toEqual(state);
	});

	it('同じ種と同じ記録から 2 回流して同じ状態（A-11）', () => {
		const { save } = play(3, D2 + 3 * DAY);
		expect(replayTown(save, map).state).toEqual(replayTown(save, map).state);
	});

	it('文字にして戻しても同じ（localStorage に置ける形）', () => {
		const { state, save } = play(1, D2 + 2 * DAY);
		const back = JSON.parse(JSON.stringify(save)) as TownSave;
		expect(replayTown(back, map).state).toEqual(state);
	});

	it('手ごとの状態を返す。k 番目は、k 番目の手を当てた直後の状態', () => {
		const { save, states } = play(1, D2 + 2 * DAY);
		const r = replayTown(save, map);
		expect(r.states).toHaveLength(save.actions.length);
		r.states.forEach((s, k) => expect(s).toEqual(states[k]));
	});

	it('任意の時点：記録を途中で切ると、その時点の状態になる', () => {
		const full = play(1, D2 + 2 * DAY);
		const mid = play(1, D2 + 300);
		const cut: TownSave = {
			...full.save,
			now: D2 + 300,
			actions: full.save.actions.filter((a) => a.at <= D2 + 300)
		};
		expect(replayTown(cut, map).state).toEqual(mid.state);
	});

	it('時の流れの知らせ（届いた・育った）も作り直せる', () => {
		const { save } = play(1, D2 + 2 * DAY);
		const ev = replayTown(save, map).events;
		const morning2 = ev.find((e) => e.type === 'desk' && e.from === 'morning' && e.at === D2 + DAY);
		expect(morning2).toBeDefined();
		expect(ev.some((e) => e.type === 'grown')).toBe(true);
		expect(ev.some((e) => e.type === 'box')).toBe(true);
		for (let i = 1; i < ev.length; i++) expect(ev[i].at).toBeGreaterThanOrEqual(ev[i - 1].at);
	});

	it('当て直しでは、学んだ手の可否を問わずに当てる（記録した手は打てた手）', () => {
		const save: TownSave = {
			version: SAVE_VERSION,
			seed: 1,
			now: D2 + 300,
			actions: [
				...GROWN,
				{ at: D2 + 30, action: { type: 'test', move: other.lesson, request: first[1].id } }
			]
		};
		const s = replayTown(save, map).state;
		const r = s.desk.requests.find((x) => x.id === first[1].id)!;
		expect(r.notes.length).toBe(1);
	});
});
