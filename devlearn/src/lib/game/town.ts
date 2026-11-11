// 街の状態の全部（段 8-2b）。時計・街づくり・建物ごとの満足度・要望を 1 つにまとめ、
// apply（手を 1 つ当てる）と tickTown（時計を進める）だけで変える。DOM・WebGL・実時間を知らない。
// 規則は試作のまま。試作が実時間（setTimeout）で決めていた要望の届く時を、ゲーム内の分に直した
// （町内会長は始まりから 20 分後、商店街は町内会長に応えてから 90 分後。試作の 1.8 秒・9 秒を速さ 1 で読み替えた）。
// 8-2c で game-design.md 第 15 章の仕組みにする。
import { clockOf, tick, START_MINUTE, type ClockEvent } from './clock.ts';
import {
	bulldoze,
	hourly,
	pay,
	placeLot,
	road,
	startBuild,
	type BuildState,
	type Pt,
	type SnapPt,
	type ZoneKind
} from './build.ts';
import { bumpNear, DEFAULT_HAPPY, initHappy, type Happy, type Spot } from './happy.ts';
import type { TownMap } from './map.ts';
import { REQ } from './requests.ts';

export type Answer = 'learned' | 'out';
export type OpenReq = { id: string; dayIn: number; due: number };
export type TownState = {
	version: 1;
	seed: number;
	minute: number;
	build: BuildState;
	happy: Happy;
	requests: OpenReq[];
	answered: Record<string, Answer>;
	learned: Record<string, true>;
	/** これから届く要望（ゲーム内の分） */
	arrivals: { id: string; at: number }[];
};

export type TownAction =
	| { type: 'zone'; lot: number; kind: ZoneKind }
	| { type: 'park'; lot: number }
	| { type: 'road'; a: SnapPt; b: Pt }
	| { type: 'bulldoze'; id: number }
	| { type: 'answer'; id: string; how: Answer }
	| { type: 'learn'; lesson: string };

export type TownEvent =
	| ClockEvent
	| { type: 'arrive'; id: string; at: number }
	| { type: 'expire'; id: string; at: number }
	| { type: 'grown'; ids: number[]; at: number };

/** 保存する物：種と、打てた手の記録と、時計の今（game-design.md 15.9） */
export type TownSave = {
	version: 1;
	seed: number;
	now: number;
	actions: { at: number; action: TownAction }[];
};

export type ApplyResult = { ok: boolean; why: string; state: TownState; opened?: number };

const spots = (map: TownMap): Spot[] =>
	map.buildings.map((b) => ({ id: b.id, x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2 }));

export function startTown(seed: number, map: TownMap): TownState {
	return {
		version: 1,
		seed,
		minute: START_MINUTE,
		build: startBuild(map, 5000),
		happy: initHappy(spots(map), seed),
		requests: [],
		answered: {},
		learned: {},
		arrivals: [{ id: 'board', at: START_MINUTE + 20 }]
	};
}

/** 見えている建物（隠れた仕組みの建物は、その要望に応えると見える） */
export function visibleIds(s: TownState, map: TownMap): number[] {
	const shown = new Set<number>();
	for (const id of Object.keys(s.answered)) {
		const b = REQ[id].builds;
		if (b) shown.add(map.feat[b].id);
	}
	const ids = map.buildings.filter((b) => !b.hidden || shown.has(b.id)).map((b) => b.id);
	for (const p of s.build.placed) ids.push(p.id);
	return ids;
}

export function avgHappy(s: TownState, map: TownMap): number {
	const ids = visibleIds(s, map);
	let t = 0;
	for (const id of ids) t += s.happy[id] || DEFAULT_HAPPY;
	return t / ids.length;
}

const outs = (s: TownState) => Object.values(s.answered).filter((v) => v === 'out').length;

function addRequest(s: TownState, id: string, at: number, ev: TownEvent[]): TownState {
	if (s.requests.some((r) => r.id === id) || s.answered[id]) return s;
	const day = clockOf(at).day;
	ev.push({ type: 'arrive', id, at });
	return { ...s, requests: [...s.requests, { id, dayIn: day, due: day + REQ[id].due }] };
}

function onNewDay(s: TownState, map: TownMap, at: number, ev: TownEvent[]): TownState {
	const day = clockOf(at).day;
	let st = s;
	if (day === 11 && !st.answered.school) st = addRequest(st, 'school', at, ev);
	if (day === 12 && !st.answered.clinic) st = addRequest(st, 'clinic', at, ev);
	if (day === 13 && !st.answered.harbor) st = addRequest(st, 'harbor', at, ev);
	let happy = st.happy;
	const requests = st.requests.map((r) => {
		if (r.due >= day) return r;
		ev.push({ type: 'expire', id: r.id, at });
		const c = map.feat[REQ[r.id].at];
		happy = bumpNear(happy, spots(map), c.x, c.z, 90, -0.08, 0.2, 1);
		return { ...r, due: day + 2 };
	});
	return { ...st, happy, requests };
}

function onHour(s: TownState, map: TownMap, at: number, ev: TownEvent[]): TownState {
	const r = hourly(s.build, map, at, avgHappy(s, map), outs(s), s.seed);
	let happy = s.happy;
	if (r.grown.length) {
		happy = { ...happy };
		for (const p of r.grown) happy[p.id] = 0.7;
		ev.push({ type: 'grown', ids: r.grown.map((p) => p.id), at });
	}
	return { ...s, build: r.state, happy };
}

/** 時計を to まで進める。時と日の処理、届く要望を、時刻の順に当てる */
export function tickTown(
	s: TownState,
	to: number,
	map: TownMap
): { state: TownState; events: TownEvent[] } {
	if (to <= s.minute) return { state: s, events: [] };
	const ev: TownEvent[] = [];
	const clock = tick(s.minute, to).events;
	const due = s.arrivals.filter((a) => a.at > s.minute && a.at <= to);
	type Step = { at: number; k: number; run: (x: TownState) => TownState };
	const steps: Step[] = [];
	for (const e of clock) {
		ev.push(e);
		steps.push({
			at: e.at,
			k: e.type === 'day' ? 0 : 1,
			run: (x) => (e.type === 'day' ? onNewDay(x, map, e.at, ev) : onHour(x, map, e.at, ev))
		});
	}
	for (const a of due) steps.push({ at: a.at, k: 2, run: (x) => addRequest(x, a.id, a.at, ev) });
	steps.sort((p, q) => p.at - q.at || p.k - q.k);
	let st: TownState = { ...s, arrivals: s.arrivals.filter((a) => !due.includes(a)) };
	const out: TownEvent[] = [];
	for (const step of steps) {
		st = step.run({ ...st, minute: step.at });
		// 知らせは時刻の順に並べ直す（時と日の知らせは先に積んである）
	}
	ev.sort((p, q) => p.at - q.at);
	out.push(...ev);
	return { state: { ...st, minute: to }, events: out };
}

/** 手を 1 つ当てる。打てないときは理由を返し、状態を変えない */
export function applyTown(
	s: TownState,
	a: TownAction,
	map: TownMap,
	opt: { replay?: boolean } = {}
): ApplyResult {
	const fail = (why: string): ApplyResult => ({ ok: false, why, state: s });
	switch (a.type) {
		case 'zone':
		case 'park': {
			const r = placeLot(
				s.build,
				map,
				a.lot,
				a.type === 'park' ? 'park' : a.kind,
				s.minute,
				s.seed
			);
			if (!r.ok) return fail(r.why);
			let happy = s.happy;
			if (a.type === 'park') {
				const p = r.state.placed[r.state.placed.length - 1];
				happy = bumpNear(
					{ ...happy, [p.id]: 0.7 },
					spots(map),
					(p.x0 + p.x1) / 2,
					(p.z0 + p.z1) / 2,
					60,
					0.06,
					0,
					1
				);
			}
			return { ok: true, why: '', state: { ...s, build: r.state, happy } };
		}
		case 'road': {
			const r = road(s.build, map, a.a, a.b, s.minute);
			if (!r.ok) return fail(r.why);
			return { ok: true, why: '', state: { ...s, build: r.state }, opened: r.opened };
		}
		case 'bulldoze': {
			const r = bulldoze(s.build, a.id, s.minute);
			if (!r.ok) return fail(r.why);
			return { ok: true, why: '', state: { ...s, build: r.state } };
		}
		case 'learn':
			return { ok: true, why: '', state: { ...s, learned: { ...s.learned, [a.lesson]: true } } };
		case 'answer': {
			const d = REQ[a.id];
			if (!d || !s.requests.some((r) => r.id === a.id)) return fail('届いていない要望');
			// 当て直しでは学んだ手の可否を問わない（記録にあるのは打てた手。15.9）
			if (a.how === 'learned' && !opt.replay) {
				if (!s.learned[d.lesson]) return fail('解説を受けると選べる');
				if (d.needs && s.answered[d.needs] !== 'learned') return fail('先に記録庫を建てると選べる');
			}
			const cost = a.how === 'learned' ? d.learnedOpt.cost : d.outOpt.cost;
			if (s.build.money < cost) return fail('資金が足りない（必要 ¥' + cost + '）');
			const build = pay(
				s.build,
				s.minute,
				'要望：' + (a.how === 'learned' ? d.learnedOpt.label : d.outOpt.label),
				-cost
			);
			let st: TownState = {
				...s,
				build,
				answered: { ...s.answered, [a.id]: a.how },
				requests: s.requests.filter((r) => r.id !== a.id)
			};
			// 応えると、依頼主の近くの見えている建物の満足度が上がる（学んだ手は広く大きく）
			const k = a.how === 'learned' ? 1 : 0.5;
			const vis = new Set(visibleIds(st, map));
			const c = map.feat[d.at];
			st = {
				...st,
				happy: bumpNear(
					st.happy,
					spots(map).filter((p) => vis.has(p.id)),
					c.x,
					c.z,
					a.how === 'learned' ? 110 : 70,
					0.12 * k,
					0,
					1
				)
			};
			if (a.id === 'board')
				st = { ...st, arrivals: [...st.arrivals, { id: 'shop', at: s.minute + 90 }] };
			return { ok: true, why: '', state: st };
		}
	}
}

/** 手の記録から作り直す。states[k] は k 番目の手を当てた直後の状態、state は now の状態（15.9・15.11） */
export function replayTown(
	save: TownSave,
	map: TownMap
): { state: TownState; states: TownState[]; events: TownEvent[] } {
	let s = startTown(save.seed, map);
	const states: TownState[] = [];
	const events: TownEvent[] = [];
	for (const { at, action } of save.actions) {
		const t = tickTown(s, at, map);
		events.push(...t.events);
		s = applyTown(t.state, action, map, { replay: true }).state;
		states.push(s);
	}
	const t = tickTown(s, save.now, map);
	events.push(...t.events);
	return { state: t.state, states, events };
}
