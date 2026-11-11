import { describe, expect, it } from 'vitest';
import {
	BUILD_MIN,
	COST,
	demand,
	hourly,
	jobs,
	placeLot,
	pop,
	road,
	roadPlan,
	snapPoint,
	startBuild,
	bulldoze,
	pay,
	type BuildState
} from './build.ts';
import { townMap } from './map.ts';
import { START_MINUTE } from './clock.ts';

const map = townMap();
const T = START_MINUTE;
const fresh = (): BuildState => startBuild(map, 5000);

describe('街づくりの状態（段 8-2b：試作の規則を移した）', () => {
	it('始まりは試作の街のまま（人口 2,358、働く場所 3,441、空き区画 9）', () => {
		const s = fresh();
		expect(pop(s, map, T)).toBe(2358);
		expect(jobs(s, map, T)).toBe(3441);
		expect(s.lots.length).toBe(9);
		expect(s.money).toBe(5000);
	});

	it('住宅地の指定は資金 20。指定済みの区画と資金不足は理由を返し、状態を変えない', () => {
		const s = fresh();
		const r = placeLot(s, map, 0, 'home', T, 1);
		expect(r.ok).toBe(true);
		expect(r.state.money).toBe(5000 - COST.zone);
		expect(r.state.lots[0].zone).toBe('home');
		expect(r.state.ledger[0]).toMatchObject({ t: '15:30', text: '住宅地に指定した', v: -20 });
		expect(s.lots[0].zone).toBeUndefined();
		const again = placeLot(r.state, map, 0, 'shop', T, 1);
		expect(again.ok).toBe(false);
		expect(again.why).toContain('指定してある');
		expect(again.state).toBe(r.state);
		const poor = placeLot({ ...s, money: 10 }, map, 1, 'home', T, 1);
		expect(poor).toMatchObject({ ok: false, why: '資金が足りない（必要 ¥20）' });
	});

	it('公園はその区画に建ち、資金 80', () => {
		const r = placeLot(fresh(), map, 2, 'park', T, 1);
		expect(r.ok).toBe(true);
		expect(r.state.money).toBe(5000 - COST.park);
		expect(r.state.placed).toHaveLength(1);
		expect(r.state.placed[0]).toMatchObject({ kind: 'park', lot: 2, startedAt: T });
		expect(r.state.lots[2].taken).toBe(true);
	});

	it('指定した区画は、需要と種と時から決まる式で建ち、60 分で人口に入る', () => {
		let s = fresh();
		for (let i = 0; i < 9; i++) s = placeLot(s, map, i, 'home', T, 1).state;
		const grow = (st: BuildState, sat: number, seed: number) => {
			let x = st;
			for (let h = 1; h <= 24; h++) x = hourly(x, map, T + h * 60, sat, 0, seed).state;
			return x;
		};
		const a = grow(s, 0.8, 1);
		const b = grow(s, 0.8, 1);
		expect(b).toEqual(a);
		expect(a.placed.length).toBeGreaterThan(0);
		const first = a.placed[0];
		expect(pop(a, map, first.startedAt + BUILD_MIN - 1)).toBe(
			2358 +
				a.placed.filter((p) => p.startedAt + BUILD_MIN <= first.startedAt + BUILD_MIN - 1).length *
					5
		);
		expect(pop(a, map, first.startedAt + BUILD_MIN)).toBeGreaterThanOrEqual(2358 + 5);
		// 需要が 30 以下なら建たない
		const none = grow(s, 0.2, 1);
		expect(none.placed).toHaveLength(0);
	});

	it('需要の式は試作と同じ（始まりの満足度 0.68 で 住 60・商 38・職 31）', () => {
		expect(demand(fresh(), map, 0.68, T)).toEqual({ res: 60, com: 38, job: 31 });
	});

	it('毎時の収支を資金に足し、6 時ごとに出入りに残す', () => {
		const s = fresh();
		const r = hourly(s, map, T + 30, 0.6, 0, 1); // 16:00
		expect(r.income).toBe(70);
		expect(r.state.money).toBe(5070);
		const six = hourly(s, map, START_MINUTE + 150, 0.6, 0, 1); // 18:00
		expect(six.state.ledger[0]).toMatchObject({
			text: '6 時間ぶんの収支を受け取った（1 時間 +70）',
			v: 420
		});
	});

	it('道路は街の端の交差点から外へ。短い・長い・街の中・水の上は引けない理由を返す', () => {
		const s = fresh();
		const a = snapPoint(s, map, [249, -80]);
		expect(a.node).toBe(true);
		expect(roadPlan(s, map, a, { x: 245, z: -80 }).why).toBe('短すぎる（20 m 以上）');
		expect(roadPlan(s, map, a, { x: 700, z: -80 }).why).toBe('長すぎる（400 m まで）');
		expect(roadPlan(s, map, a, { x: 150, z: -80 }).why).toContain('街の中には引けない');
		const ok = roadPlan(s, map, a, { x: 400, z: -80 });
		expect(ok).toMatchObject({ ok: true, L: 160, cost: 320 });
		const r = road(s, map, ok.a, ok.b, T);
		expect(r.ok).toBe(true);
		expect(r.state.money).toBe(4680);
		expect(r.state.roads).toHaveLength(1);
		expect(r.opened).toBeGreaterThan(0);
		expect(r.state.lots.length).toBe(9 + r.opened);
		// 引いた道の端からも続けて引ける
		expect(snapPoint(r.state, map, [400, -80]).node).toBe(true);
	});

	it('取り壊せるのは自分で建てた物だけ。区画は空きに戻る', () => {
		const p = placeLot(fresh(), map, 3, 'park', T, 1).state;
		const id = p.placed[0].id;
		const r = bulldoze(p, id, T);
		expect(r.ok).toBe(true);
		expect(r.state.placed).toHaveLength(0);
		expect(r.state.lots[3].taken).toBe(false);
		expect(bulldoze(p, 1, T)).toMatchObject({ ok: false, why: '自分で建てた建物だけ取り壊せる' });
	});

	it('払うと資金が減り、出入りに残る（12 件まで）', () => {
		let s = fresh();
		for (let i = 0; i < 13; i++) s = pay(s, T, '要望：' + i, -100);
		expect(s.money).toBe(5000 - 1300);
		expect(s.ledger).toHaveLength(12);
		expect(s.ledger[0]).toEqual({ t: '15:30', text: '要望：12', v: -100 });
	});
});
