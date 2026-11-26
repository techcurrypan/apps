// 空き地から始め、学ぶと育つ（game-design.md 15.12・D-27・T-9〜T-11）
import { describe, expect, it } from 'vitest';
import { START_MINUTE } from './clock.ts';
import { CLIENTS } from './desk.ts';
import { townMap } from './map.ts';
import { lotOrder, pop, roadPlan } from './build.ts';
import {
	applyTown,
	blueprintOrder,
	chapterDay,
	pendingLessons,
	standingRise,
	income,
	population,
	RANK_NAMES,
	replayTown,
	startTown,
	tickTown,
	type TownAction,
	type TownState
} from './town.ts';

const map = townMap();
const T = START_MINUTE;
const DAY = 24 * 60;
const run = (s: TownState, to: number) => tickTown(s, to, map).state;
const learn = (s: TownState, lesson: string) => applyTown(s, { type: 'learn', lesson }, map, null);

describe('始まりは空き地（T-9・G-13）', () => {
	it('建物 0・住民 0・要望 0・町の格は空き地', () => {
		const s = startTown(1, map);
		expect(s.build.standing).toEqual([]);
		expect(population(s, map)).toBe(0);
		expect(s.desk.requests).toEqual([]);
		expect(RANK_NAMES[s.rank]).toBe('空き地');
	});
	it('何もせず 30 日進めても、要望は届かず、章は失敗せず、資金は減らない', () => {
		const s = run(startTown(1, map), T + 30 * DAY);
		expect(s.desk.requests).toEqual([]);
		expect(s.desk.result).toBe('playing');
		expect(s.chapters).toEqual([]);
		expect(s.build.money).toBe(600);
		expect(income(s, map)).toBe(0);
	});
});

describe('学ぶと育つ（T-10・G-14）', () => {
	it('建つ順は広場の掲示板から近い順。仕組みの建物の場所は入らない', () => {
		const o = blueprintOrder(map);
		expect(o[0]).toBe(map.feat.board.id);
		const hidden = new Set(map.buildings.filter((b) => b.hidden).map((b) => b.id));
		expect(o.some((id) => hidden.has(id))).toBe(false);
		expect(o.length).toBe(map.buildings.length - hidden.size);
	});
	it('最初の合格で 3 棟（住む人のいる建物を含む）と、その分野の仕組みの建物が建つ。60 分で住民が来る', () => {
		const r = learn(startTown(1, map), 'net-101');
		expect(r.ok).toBe(true);
		const s = r.state;
		expect(s.passed).toEqual(['net-101']);
		expect(s.build.standing.length).toBe(3);
		expect(s.build.standing.every((x) => x.lesson === 'net-101' && x.startedAt === T)).toBe(true);
		const res = s.build.standing.map((x) => map.buildings.find((b) => b.id === x.id)!.residents);
		expect(res.some((n) => n > 0)).toBe(true);
		expect(s.systems.map((x) => x.field)).toEqual(['net']);
		expect(population(s, map)).toBe(0);
		const later = run(s, T + 60);
		expect(pop(later.build, map, later.minute)).toBeGreaterThan(0);
		expect(RANK_NAMES[later.rank]).not.toBe('空き地');
	});
	it('2 本目からは 2 棟ずつ。同じレッスンの 2 度目は打てない', () => {
		let s = learn(startTown(1, map), 'net-101').state;
		s = learn(s, 'net-102').state;
		expect(s.build.standing.length).toBe(5);
		expect(learn(s, 'net-101').ok).toBe(false);
	});
	it('最初の住民が来た次の朝に章 1 が始まり、建っている依頼主から要望が届く', () => {
		const s = learn(startTown(1, map), 'net-101').state;
		const m = run(s, T + DAY);
		expect(chapterDay(m)).toBe(1);
		expect(m.desk.requests.length).toBe(1);
		const standing = new Set(m.build.standing.map((x) => x.id));
		for (const r of m.desk.requests)
			expect(standing.has(map.feat[CLIENTS[r.group].at].id)).toBe(true);
	});
	it('合格を含む手の記録は、当て直しで同じ街になる（T-8）', () => {
		const actions: { at: number; action: TownAction }[] = [
			{ at: T + 60, action: { type: 'learn', lesson: 'net-101' } },
			{ at: T + 2 * DAY, action: { type: 'learn', lesson: 'git-101' } }
		];
		let live = startTown(1, map);
		for (const a of actions) live = applyTown(run(live, a.at), a.action, map, null).state;
		live = run(live, T + 5 * DAY);
		const re = replayTown({ version: 2, seed: 1, now: T + 5 * DAY, actions }, map).state;
		expect(re).toEqual(live);
	});
	it('完成図の区画は、合格 1 本ごとに広場から近い順に 1 つ開く。開く前は理由を返す', () => {
		const s = startTown(1, map);
		const order = lotOrder(map);
		const no = applyTown(s, { type: 'zone', lot: order[0], kind: 'home' }, map, null);
		expect(no.ok).toBe(false);
		expect(no.why).toContain('レッスンに合格');
		const one = run(learn(s, 'net-101').state, T + 60);
		expect(applyTown(one, { type: 'zone', lot: order[0], kind: 'home' }, map, null).ok).toBe(true);
		expect(applyTown(one, { type: 'zone', lot: order[1], kind: 'home' }, map, null).ok).toBe(false);
		const two = run(learn(one, 'net-102').state, T + 120);
		expect(applyTown(two, { type: 'zone', lot: order[1], kind: 'home' }, map, null).ok).toBe(true);
	});
});

describe('道は、建った物の近くの交差点からだけ引ける（15.12）', () => {
	it('空き地では町の端の交差点から引けない。理由を返す', () => {
		const s = startTown(1, map);
		const p = roadPlan(s.build, map, { x: 249, z: -80, node: true }, { x: 400, z: -80 });
		expect(p.ok).toBe(false);
		expect(p.why).toContain('建物が建つと');
	});
	it('完成図が全て建った街では引ける', () => {
		const s = startTown(1, map, 1, { full: true });
		expect(roadPlan(s.build, map, { x: 249, z: -80, node: true }, { x: 400, z: -80 }).ok).toBe(
			true
		);
	});
});

describe('学習の記録を街に映す（15.12）', () => {
	it('修了したレッスンのうち、街にまだ無い物を修了した順に返す', () => {
		const s = learn(startTown(1, map), 'git-101').state;
		expect(pendingLessons(s, ['net-101', 'git-101', 'db-101'])).toEqual(['net-101', 'db-101']);
		expect(pendingLessons(s, ['git-101'])).toEqual([]);
	});
	it('完成図の建物の高さ：建っていなければ 0、建ち始めから 60 分で 0 → 1', () => {
		const s = learn(startTown(1, map), 'net-101').state;
		const id = s.build.standing[0].id;
		const other = blueprintOrder(map).find((x) => !s.build.standing.some((y) => y.id === x))!;
		expect(standingRise(s.build, other, T + 30)).toBe(0);
		expect(standingRise(s.build, id, T)).toBe(0);
		expect(standingRise(s.build, id, T + 30)).toBeGreaterThan(0);
		expect(standingRise(s.build, id, T + 30)).toBeLessThan(1);
		expect(standingRise(s.build, id, T + 60)).toBe(1);
	});
});
