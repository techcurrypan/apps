// 街の状態の全部（game-design.md 15.11）。時計・街づくり・要望（desk.ts）・建物ごとの満足度・仕組みの建物と箱・町の格・章を
// 1 つにまとめ、applyTown（手を 1 つ当てる）と tickTown（時計を進める）だけで変える。DOM・WebGL・実時間を知らない。
// 手の記録から任意の時点を作り直す replayTown（15.9）。
import {
	clockOf,
	MIN_PER_DAY,
	slotsLeft,
	START_MINUTE,
	tick,
	workFrom,
	type ClockEvent
} from './clock.ts';
import {
	bulldoze,
	demand as demandOf,
	hourly,
	income as incomeOf,
	incomeParts as incomePartsOf,
	isDone,
	pay,
	placeLot,
	pop,
	road,
	startBuild,
	type BuildState,
	type Pt,
	type SnapPt,
	type ZoneKind
} from './build.ts';
import {
	CLIENTS,
	closeDay,
	groupOf,
	morning,
	nextDesk,
	playMove,
	startDesk,
	type Change,
	type Chapter,
	type DeskAction,
	type DeskCtx,
	type DeskState,
	type Grade
} from './desk.ts';
import {
	addNear,
	baseHappy,
	CLIENT_R,
	happyOf,
	parkBonus,
	type SatDelta,
	type Spot
} from './happy.ts';
import type { FeatKey, TownMap } from './map.ts';

export const START_MONEY = 600;
/** 町の格（15.7）。人口がこの数に届くと上がる */
export const RANKS = [2450, 2600, 2800];
export const RANK_NAMES = ['小さな港町', '港町', 'にぎわう港町', '港の市'];
export const RANK_REWARD = 300;
export const BOX_MAX = 3;

export type SystemB = { field: string; builtAt: number; links: FeatKey[] };
export type Box = { client: FeatKey; count: number; at: number };
export type ChapterLog = {
	chapter: Chapter;
	freeRound: number;
	sat: number;
	grade: Grade | null;
	result: 'passed' | 'failed';
};

export type TownState = {
	version: 1;
	seed: number;
	minute: number;
	/** その章の 1 日目 8:00 */
	chapterStart: number;
	build: BuildState;
	desk: DeskState;
	/** 建物ごとの満足度の「要望」の項（15.5） */
	satDelta: SatDelta;
	systems: SystemB[];
	boxes: Box[];
	rank: number;
	chapters: ChapterLog[];
};

export type TownAction =
	| { type: 'zone'; lot: number; kind: ZoneKind }
	| { type: 'park'; lot: number }
	| { type: 'road'; a: SnapPt; b: Pt }
	| { type: 'bulldoze'; id: number }
	| DeskAction;

export type TownEvent =
	| ClockEvent
	| { type: 'desk'; from: 'morning' | 'close' | 'move'; changes: Change[]; at: number }
	| { type: 'grown'; ids: number[]; at: number }
	| { type: 'rank'; rank: number; at: number }
	| { type: 'system'; field: string; at: number }
	| { type: 'link'; field: string; client: FeatKey; at: number }
	| { type: 'box'; client: FeatKey; at: number }
	| { type: 'chapter'; chapter: Chapter; freeRound: number; at: number };

/** 保存する物：種と、打てた手の記録と、時計の今（15.9） */
export type TownSave = {
	version: 1;
	seed: number;
	now: number;
	actions: { at: number; action: TownAction }[];
};

export type ApplyResult = {
	ok: boolean;
	why: string;
	state: TownState;
	events: TownEvent[];
	opened?: number;
};

// ---------------- 数える物 ----------------

export const chapterDay = (s: TownState) =>
	Math.floor((s.minute - s.chapterStart) / MIN_PER_DAY) + 1;

const center = (b: { x0: number; z0: number; x1: number; z1: number }) => ({
	x: (b.x0 + b.x1) / 2,
	z: (b.z0 + b.z1) / 2
});
function spots(s: TownState, map: TownMap): Spot[] {
	const out: Spot[] = map.buildings.map((b) => ({ id: b.id, ...center(b) }));
	for (const p of s.build.placed) if (p.kind !== 'park') out.push({ id: p.id, ...center(p) });
	return out;
}
const parks = (s: TownState) => s.build.placed.filter((p) => p.kind === 'park').map(center);

/** 建物の満足度（0〜100） */
export function happyAt(s: TownState, map: TownMap, id: number): number {
	const b = map.buildings.find((x) => x.id === id) ?? s.build.placed.find((x) => x.id === id);
	if (!b) return 60;
	return happyOf(baseHappy(s.seed, id), parkBonus(center(b), parks(s)), s.satDelta[id] ?? 0);
}

/** 満足度を数える建物（見えている物。建つ途中・隠れた仕組みの建物・公園を除く） */
export function countedIds(s: TownState, map: TownMap): number[] {
	const ids = map.buildings.filter((b) => !b.hidden).map((b) => b.id);
	for (const p of s.build.placed) if (p.kind !== 'park' && isDone(p, s.minute)) ids.push(p.id);
	return ids;
}

/** 町の満足度（0〜100。15.5） */
export function avgHappy(s: TownState, map: TownMap): number {
	const ps = parks(s);
	const byId = new Map<number, { x0: number; z0: number; x1: number; z1: number }>();
	for (const b of map.buildings) byId.set(b.id, b);
	for (const p of s.build.placed) byId.set(p.id, p);
	const ids = countedIds(s, map);
	let t = 0;
	for (const id of ids) {
		const b = byId.get(id);
		if (!b) continue;
		t += happyOf(baseHappy(s.seed, id), parkBonus(center(b), ps), s.satDelta[id] ?? 0);
	}
	return t / ids.length;
}

export const demand = (s: TownState, map: TownMap) =>
	demandOf(s.build, map, avgHappy(s, map), s.minute);
export const incomeParts = (s: TownState, map: TownMap) => incomePartsOf(s.build, map, s.minute);
export const income = (s: TownState, map: TownMap) => incomeOf(s.build, map, s.minute);
export const population = (s: TownState, map: TownMap) => pop(s.build, map, s.minute);

// ---------------- 始まり ----------------

/** 始まりの街。chapter は章から始める見積もり（15.8）のためだけに使う（画面は 1 章から） */
export function startTown(seed: number, map: TownMap, chapter: Chapter = 1): TownState {
	const s: TownState = {
		version: 1,
		seed,
		minute: START_MINUTE,
		chapterStart: START_MINUTE,
		build: startBuild(map, START_MONEY),
		desk: startDesk(seed, chapter, chapter === 'free' ? 1 : 0),
		satDelta: {},
		systems: [],
		boxes: [],
		rank: 0,
		chapters: []
	};
	return onMorning(s, map, START_MINUTE, []);
}

// ---------------- 依頼主の満足度の動きを、建物に映す ----------------

function spread(s: TownState, map: TownMap, changes: Change[]): SatDelta {
	let d = s.satDelta;
	for (const c of changes) {
		if (c.what !== 'clientSat' || !c.request) continue;
		const r = s.desk.requests.find((x) => x.id === c.request);
		if (!r) continue;
		const f = map.feat[CLIENTS[r.group].at];
		d = addNear(d, spots(s, map), f.x, f.z, CLIENT_R, c.after - c.before);
	}
	return d;
}

// ---------------- 時の処理 ----------------

function onHour(s: TownState, map: TownMap, at: number, ev: TownEvent[]): TownState {
	const r = hourly(s.build, map, at, avgHappy(s, map), s.seed);
	if (r.grown.length) ev.push({ type: 'grown', ids: r.grown.map((p) => p.id), at });
	let st: TownState = { ...s, build: r.state };
	const p = pop(st.build, map, at);
	let rank = st.rank;
	while (rank < RANKS.length && p >= RANKS[rank]) rank++;
	for (let k = st.rank + 1; k <= rank; k++) {
		st = {
			...st,
			build: pay(st.build, at, `町の格が「${RANK_NAMES[k]}」に上がった（人口 ${p}）`, RANK_REWARD)
		};
		ev.push({ type: 'rank', rank: k, at });
	}
	return { ...st, rank };
}

function onMorning(s: TownState, map: TownMap, at: number, ev: TownEvent[]): TownState {
	let st = s;
	if (st.desk.result === 'passed') {
		st = {
			...st,
			desk: nextDesk(st.desk),
			chapterStart: at,
			minute: at
		};
		ev.push({ type: 'chapter', chapter: st.desk.chapter, freeRound: st.desk.freeRound, at });
	}
	const m = morning(st.desk, Math.floor((at - st.chapterStart) / MIN_PER_DAY) + 1);
	const satDelta = spread({ ...st, desk: m.desk }, map, m.changes);
	let boxes = st.boxes;
	for (const client of m.boxes) {
		const has = boxes.find((b) => b.client === client);
		boxes = has
			? boxes.map((b) => (b === has ? { ...b, count: Math.min(BOX_MAX, b.count + 1), at } : b))
			: [...boxes, { client, count: 1, at }];
		ev.push({ type: 'box', client, at });
	}
	ev.push({ type: 'desk', from: 'morning', changes: m.changes, at });
	return { ...st, desk: m.desk, satDelta, boxes };
}

function onClose(s: TownState, at: number, ev: TownEvent[]): TownState {
	const day = Math.floor((at - s.chapterStart) / MIN_PER_DAY) + 1;
	const c = closeDay(s.desk, day);
	if (!c.changes.length) return s;
	ev.push({ type: 'desk', from: 'close', changes: c.changes, at });
	let build = s.build;
	if (c.money) build = pay(build, at, `章の合格の報酬（${c.desk.grade}）`, c.money);
	const chapters =
		c.desk.result === 'playing'
			? s.chapters
			: [
					...s.chapters,
					{
						chapter: c.desk.chapter,
						freeRound: c.desk.freeRound,
						sat: c.desk.clientSat,
						grade: c.desk.grade,
						result: c.desk.result
					}
				];
	return { ...s, desk: c.desk, build, chapters };
}

/** 時計を to まで進める。毎時の処理、8:00 の朝、17:00 の締めを、時刻の順に当てる。章に失敗すると時計は止まる */
export function tickTown(
	s: TownState,
	to: number,
	map: TownMap
): { state: TownState; events: TownEvent[] } {
	if (to <= s.minute || s.desk.result === 'failed') return { state: s, events: [] };
	const ev: TownEvent[] = [];
	let st = s;
	for (const e of tick(s.minute, to).events) {
		st = { ...st, minute: e.at };
		ev.push(e);
		if (e.type !== 'hour') continue;
		st = onHour(st, map, e.at, ev);
		if (e.hour === 8) st = onMorning(st, map, e.at, ev);
		if (e.hour === 17) {
			st = onClose(st, e.at, ev);
			if (st.desk.result === 'failed') return { state: st, events: ev };
		}
	}
	return { state: { ...st, minute: to }, events: ev };
}

// ---------------- 手 ----------------

const isDesk = (a: TownAction): a is DeskAction =>
	a.type !== 'zone' && a.type !== 'park' && a.type !== 'road' && a.type !== 'bulldoze';

/** 要望の手を打つときに渡す物 */
export function deskCtx(s: TownState): DeskCtx {
	return {
		day: chapterDay(s),
		slots: slotsLeft(s.minute),
		money: s.build.money,
		systems: new Set(s.systems.map((x) => x.field))
	};
}

/**
 * 手を 1 つ当てる。打てないときは理由を返し、状態を変えない。
 * learned は修了したレッスンの集まり。null は当て直し（学んだ手の可否を問わない。15.9）
 */
export function applyTown(
	s: TownState,
	a: TownAction,
	map: TownMap,
	learned: ReadonlySet<string> | null
): ApplyResult {
	const fail = (why: string): ApplyResult => ({ ok: false, why, state: s, events: [] });
	if (s.desk.result === 'failed')
		return fail('この章は終わった。章の初めか、選んだ時点からやり直す');
	if (isDesk(a)) return deskMove(s, a, map, learned);
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
			return { ok: true, why: '', state: { ...s, build: r.state }, events: [] };
		}
		case 'road': {
			const r = road(s.build, map, a.a, a.b, s.minute);
			if (!r.ok) return fail(r.why);
			return { ok: true, why: '', state: { ...s, build: r.state }, events: [], opened: r.opened };
		}
		case 'bulldoze': {
			const r = bulldoze(s.build, a.id);
			if (!r.ok) return fail(r.why);
			return { ok: true, why: '', state: { ...s, build: r.state }, events: [] };
		}
	}
}

function deskMove(
	s: TownState,
	a: DeskAction,
	map: TownMap,
	learned: ReadonlySet<string> | null
): ApplyResult {
	const fail = (why: string): ApplyResult => ({ ok: false, why, state: s, events: [] });
	// コマを使う手は 9:00 から始める。先に 9:00 まで時計を送ってから確かめる
	const ev: TownEvent[] = [];
	const first = playMove(s.desk, a, learned, deskCtx(s));
	if (!first.ok) return fail(first.why);
	let st = s;
	if (first.slots > 0 && workFrom(s.minute) > s.minute) {
		const t = tickTown(s, workFrom(s.minute), map);
		st = t.state;
		ev.push(...t.events);
	}
	const at = st.minute;
	const r = st === s ? first : playMove(st.desk, a, learned, deskCtx(st));
	if (!r.ok) return fail(r.why);
	const req = st.desk.requests.find((x) => x.id === a.request);
	const client = req ? CLIENTS[req.group].at : null;
	let build = st.build;
	if (r.money) build = pay(build, at, r.moneyWhy, r.money);
	let systems = st.systems;
	if (r.builds && client) {
		systems = [...systems, { field: r.builds, builtAt: at, links: [client] }];
		ev.push({ type: 'system', field: r.builds, at });
	}
	if (r.links && client) {
		systems = systems.map((x) =>
			x.field === r.links && !x.links.includes(client) ? { ...x, links: [...x.links, client] } : x
		);
		ev.push({ type: 'link', field: r.links, client, at });
	}
	const satDelta = spread({ ...st, desk: r.desk }, map, r.changes);
	ev.push({ type: 'desk', from: 'move', changes: r.changes, at });
	st = { ...st, desk: r.desk, build, systems, satDelta };
	if (r.slots > 0) {
		const t = tickTown(st, at + r.slots * 60, map);
		st = t.state;
		ev.push(...t.events);
	}
	return { ok: true, why: '', state: st, events: ev };
}

/** 依頼主と症状（板と知らせに出す） */
export function reqTitle(s: TownState, id: string): { who: string; symptom: string; at: FeatKey } {
	const r = s.desk.requests.find((x) => x.id === id);
	if (!r) return { who: '', symptom: '', at: 'hall' };
	const c = CLIENTS[r.group];
	return { who: c.who, symptom: groupOf(r.group).symptom, at: c.at };
}

export const timeText = (minute: number) => clockOf(minute).text;

// ---------------- 当て直し ----------------

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
		const r = applyTown(t.state, action, map, null);
		events.push(...r.events);
		s = r.state;
		states.push(s);
	}
	const t = tickTown(s, save.now, map);
	events.push(...t.events);
	return { state: t.state, states, events };
}
