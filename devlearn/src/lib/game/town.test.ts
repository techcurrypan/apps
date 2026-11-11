import { describe, expect, it } from 'vitest';
import { MOVES } from './data.ts';
import { CLIENTS } from './desk.ts';
import { START_MINUTE } from './clock.ts';
import { townMap } from './map.ts';
import {
	applyTown,
	avgHappy,
	chapterDay,
	happyAt,
	startTown,
	tickTown,
	type TownState
} from './town.ts';

const map = townMap();
const T = START_MINUTE;
const DAY = 24 * 60;
const NONE = new Set<string>();
const ALL = new Set(MOVES.map((m) => m.lesson));
const s0 = () => startTown(1, map);
const run = (s: TownState, to: number) => tickTown(s, to, map);

describe('街の始まり（game-design.md 15.2・15.5）', () => {
	it('1 日目 8:00、朝の処理の後：資金 600・要望 3 件・依頼主の満足度 50・収支 +11', () => {
		const s = s0();
		expect(s.minute).toBe(T);
		expect(chapterDay(s)).toBe(1);
		expect(s.build.money).toBe(600);
		expect(s.desk.requests.map((r) => r.id)).toEqual(['w1-d1-k0', 'w1-d1-k1', 'w1-d1-k2']);
		expect(s.desk.clientSat).toBe(50);
		const h = run(s, T + 60).state;
		expect(h.build.money).toBe(611);
	});

	it('町の満足度は、見えている建物の 基礎 + 公園 + 要望 の平均（60 前後）', () => {
		const a = avgHappy(s0(), map);
		expect(a).toBeGreaterThan(58);
		expect(a).toBeLessThan(62);
	});
});

describe('手と勤務の時間（15.2）', () => {
	it('コマを使う手は 9:00 から始め、時計がコマ × 60 分進む', () => {
		const s = s0();
		const r = applyTown(s, { type: 'ask', request: 'w1-d1-k0' }, map, NONE);
		expect(r.ok).toBe(true);
		expect(r.state.minute).toBe(T + 120); // 9:00 から 1 時間
		const g = applyTown(r.state, { type: 'outsource', request: 'w1-d1-k1' }, map, NONE);
		expect(g.state.minute).toBe(T + 120); // 外に頼むのは 0 コマ
	});

	it('17:00 を越える手は打てない。理由は「明日 9:00 から」', () => {
		const s = run(s0(), T + 8 * 60 + 30).state; // 16:30
		const r = applyTown(s, { type: 'ask', request: 'w1-d1-k0' }, map, NONE);
		expect(r.ok).toBe(false);
		expect(r.why).toContain('明日 9:00 から');
		expect(r.state).toBe(s);
	});

	it('学んでいない手は打てない。理由にレッスンの名前', () => {
		const s = s0();
		const r = s.desk.requests[0];
		const m = MOVES.find((x) => x.tests.includes(r.truth))!;
		const no = applyTown(s, { type: 'test', move: m.lesson, request: r.id }, map, NONE);
		expect(no.ok).toBe(false);
		expect(no.why).toContain(m.lesson);
		expect(applyTown(s, { type: 'test', move: m.lesson, request: r.id }, map, ALL).ok).toBe(true);
	});

	it('依頼主の満足度が動くと、依頼主の建物から 100 m 以内の建物の満足度も同じだけ動く', () => {
		const s = s0();
		const r = s.desk.requests[0];
		const near = map.feat[CLIENTS[r.group].at].id;
		const a = applyTown(s, { type: 'outsource', request: r.id }, map, NONE).state;
		const b = run(a, T + DAY).state; // 次の朝に片付く（+1）
		expect(b.desk.clientSat).toBeGreaterThan(0);
		expect(b.satDelta[near]).toBeDefined();
		expect(happyAt(b, map, near)).not.toBe(happyAt(s, map, near));
	});

	it('学んだ手で直すと、その分野の仕組みの建物が建つ。2 件目からは 0 コマでつなぐ', () => {
		let s = s0();
		let built = 0;
		for (const r of s.desk.requests) {
			const t = MOVES.find((m) => m.tests.includes(r.truth))!;
			const f = MOVES.find((m) => m.fixes.includes(r.truth));
			if (!f) continue;
			s = applyTown(s, { type: 'test', move: t.lesson, request: r.id }, map, ALL).state;
			if (s.desk.requests.find((x) => x.id === r.id)!.doubt > 0)
				s = applyTown(s, { type: 'show', request: r.id }, map, ALL).state;
			const before = s.minute;
			const field = f.lesson.split('-')[0];
			const had = s.systems.some((x) => x.field === field);
			const x = applyTown(s, { type: 'fix', move: f.lesson, request: r.id }, map, ALL);
			expect(x.ok).toBe(true);
			s = x.state;
			const sys = s.systems.find((y) => y.field === field)!;
			expect(sys.links).toContain(CLIENTS[r.group].at);
			if (had) expect(s.minute).toBe(before);
			else built++;
		}
		expect(built).toBeGreaterThan(0);
	});

	it('外に頼むと、次の朝に依頼主の建物の隣に箱が建つ（3 段まで）', () => {
		let s = s0();
		for (const r of s.desk.requests)
			s = applyTown(s, { type: 'outsource', request: r.id }, map, NONE).state;
		expect(s.build.money).toBeLessThan(600);
		const m = run(s, T + DAY).state;
		const n = m.boxes.reduce((a, b) => a + b.count, 0);
		expect(n).toBeGreaterThan(0);
		for (const b of m.boxes) expect(b.count).toBeLessThanOrEqual(3);
	});
});

describe('朝と締めと章（15.2・15.7）', () => {
	it('毎朝 8:00 に要望が 3 件届く。何もしないと期限切れが重なり、5 日目の締めで失敗して時計が止まる', () => {
		const r = run(s0(), T + 10 * DAY);
		const s = r.state;
		expect(s.desk.result).toBe('failed');
		expect(chapterDay(s)).toBe(5);
		expect(s.minute).toBe(T + 4 * DAY + 9 * 60); // 5 日目 17:00
		expect(run(s, s.minute + DAY).state).toBe(s);
		expect(s.chapters).toEqual([
			{ chapter: 1, freeRound: 0, sat: s.desk.clientSat, grade: null, result: 'failed' }
		]);
	});

	it('学ばない遊び方（様子を聞く → 頼み込む → 手探り、残りは外に頼む）で 7 日目に合格し、次の章が始まる', () => {
		let s = s0();
		for (let d = 0; d < 7; d++) {
			s = run(s, T + d * DAY).state; // その日の 8:00
			s = playDay(s);
			s = run(s, T + d * DAY + 9 * 60).state; // その日の 17:00（締め）
		}
		expect(s.desk.result).toBe('passed');
		expect(s.desk.grade).not.toBeNull();
		const next = run(s, T + 7 * DAY).state;
		expect(next.desk.chapter).toBe(2);
		expect(next.desk.clientSat).toBe(50);
		expect(next.desk.requests.map((r) => r.id)).toEqual(['w2-d1-k0', 'w2-d1-k1', 'w2-d1-k2']);
		expect(chapterDay(next)).toBe(1);
		expect(next.chapters[0]).toMatchObject({ chapter: 1, result: 'passed' });
	});

	it('人口が 2,450 に届くと町の格が上がり、報酬 300', () => {
		let s = s0();
		s = { ...s, build: { ...s.build, money: 100000 } };
		// 住の需要は店で増え、家で減る（15.5）。家 2 つに店 1 つの割で指定する
		const kind = (i: number) => (i % 3 === 2 ? 'shop' : 'home');
		const r = applyTown(
			s,
			{ type: 'road', a: { x: 249, z: -80, node: true }, b: { x: 400, z: -80 } },
			map,
			NONE
		);
		s = r.state;
		for (let i = 0; i < s.build.lots.length; i++)
			s = applyTown(s, { type: 'zone', lot: i, kind: kind(i) }, map, NONE).state;
		const out = run(s, T + 4 * DAY); // 5 日目の締めより前
		expect(out.state.rank).toBe(1);
		const ev = out.events.find((e) => e.type === 'rank');
		expect(ev).toBeDefined();
		const row = out.state.build.ledger.find((l) => l.text.includes('町の格'));
		expect(row).toMatchObject({ v: 300 });
	});
});

/** その日の要望を、学ばない手で片付ける（期限の近い順。片付かない物は外に頼む） */
function playDay(s0: TownState): TownState {
	let s = s0;
	const open = () =>
		s.desk.requests.filter((r) => r.status === 'open').sort((a, b) => a.due - b.due);
	for (const r of open()) {
		const steps: ('ask' | 'plead' | 'grope')[] = [];
		const cur = () => s.desk.requests.find((x) => x.id === r.id)!;
		for (let k = 0; k < 3; k++) steps.push('ask');
		for (const t of steps) {
			if (cur().confirmed) break;
			const x = applyTown(s, { type: t, request: r.id }, map, NONE);
			if (!x.ok) break;
			s = x.state;
		}
		while (cur().confirmed && cur().doubt > 0) {
			const x = applyTown(s, { type: 'plead', request: r.id }, map, NONE);
			if (!x.ok) break;
			s = x.state;
		}
		if (cur().confirmed && cur().doubt === 0) {
			const x = applyTown(s, { type: 'grope', request: r.id }, map, NONE);
			if (x.ok) s = x.state;
		}
	}
	for (const r of open())
		if (r.due <= chapterDay(s)) {
			const x = applyTown(s, { type: 'outsource', request: r.id }, map, NONE);
			if (x.ok) s = x.state;
		}
	return s;
}
