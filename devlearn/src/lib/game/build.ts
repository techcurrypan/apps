// 街づくりの状態：資金・出入り・区画・指定・建てた物・道路（段 8-2b）。
// 試作 docs/prototype/src/game.js の placeOnLot・spawn・bulldoze・roadPlan・addRoad・onHour・demand・incomeParts を、
// DOM・WebGL・実時間を知らない純粋な関数に移した。元の状態は書き換えず、新しい状態を返す。
// 試作が擬似乱数で決めていた物（区画に建つ物の色と形、建つかどうか）は、種と区画の番号と時からの式（mix32）にした。
// 数は試作のまま。8-2c で game-design.md 第 15 章の数にする。
import { clockOf } from './clock.ts';
import { mix32 } from './mix.ts';
import type { MapLot, TownMap } from './map.ts';

export const COST = { zone: 20, park: 80, roadPerM: 2 };
/** 建ち始めてから建ち終えるまでのゲーム内の分（game-design.md 15.6） */
export const BUILD_MIN = 60;
/** 道の幅（試作と同じ） */
export const RW = 11;

export type ZoneKind = 'home' | 'shop';
export type Lot = MapLot & { y0?: number; zone?: ZoneKind; taken: boolean };
export type PlacedKind = 'house' | 'shop' | 'park';
export type Placed = {
	id: number;
	lot: number;
	kind: PlacedKind;
	x0: number;
	z0: number;
	x1: number;
	z1: number;
	h: number;
	floors: number;
	residents: number;
	jobs: number;
	startedAt: number;
	/** 色と形を選ぶ数（種と区画の番号と建ち始めた分から決める） */
	look: number;
};
export type Pt = { x: number; z: number };
export type Road = { a: Pt; b: Pt; L: number };
export type LedgerRow = { t: string; text: string; v: number };
export type BuildState = {
	money: number;
	lots: Lot[];
	placed: Placed[];
	roads: Road[];
	nextId: number;
	ledger: LedgerRow[];
};
export type Result = { ok: boolean; why: string; state: BuildState };

export function startBuild(map: TownMap, money: number): BuildState {
	return {
		money,
		lots: map.lots.map((l) => ({ ...l, taken: false })),
		placed: [],
		roads: [],
		nextId: 4000,
		ledger: []
	};
}

function ledger(s: BuildState, minute: number, text: string, v: number): LedgerRow[] {
	return [{ t: clockOf(minute).text, text, v }, ...s.ledger].slice(0, 12);
}

export const isDone = (p: Placed, minute: number) => minute >= p.startedAt + BUILD_MIN;

export function pop(s: BuildState, map: TownMap, minute: number): number {
	let n = 0;
	for (const b of map.buildings) n += b.residents;
	for (const p of s.placed) if (isDone(p, minute)) n += p.residents;
	return n;
}
export function jobs(s: BuildState, map: TownMap, minute: number): number {
	let n = 0;
	for (const b of map.buildings) n += b.jobs;
	for (const p of s.placed) if (isDone(p, minute)) n += p.jobs;
	return n;
}

/** 需要（試作の式）。sat は町の満足度（0〜1） */
export function demand(s: BuildState, map: TownMap, sat: number, minute: number) {
	const nH = s.placed.filter((b) => b.kind === 'house').length,
		nS = s.placed.filter((b) => b.kind === 'shop').length;
	const p = pop(s, map, minute);
	const cl = (v: number) => Math.round(Math.max(5, Math.min(95, v)));
	return {
		res: cl(50 + (sat - 0.6) * 120 + nS * 5 - nH * 3),
		com: cl(30 + nH * 4 - nS * 9 + p / 300),
		job: cl(40 + p / 300 - jobs(s, map, minute) / 200)
	};
}

/** 1 時間ごとの収支の内訳（試作の式）。outs は業者に任せた数 */
export function incomeParts(
	s: BuildState,
	map: TownMap,
	outs: number,
	minute: number
): [string, number][] {
	const roadLen = s.roads.reduce((a, r) => a + r.L, 0);
	const parts: [string, number][] = [
		['住民税（人口 × 0.018）', pop(s, map, minute) * 0.018],
		['店と会社の税（働く場所 × 0.012）', jobs(s, map, minute) * 0.012],
		['町の施設の維持費', -14],
		['引いた道路の維持費（1 km あたり 8）', (-roadLen / 1000) * 8],
		['業者に任せた仕組みの使用料（1 件 3）', -outs * 3]
	];
	return parts.filter((x) => Math.abs(x[1]) > 0.01);
}
export function income(s: BuildState, map: TownMap, outs: number, minute: number): number {
	return Math.round(incomeParts(s, map, outs, minute).reduce((a, x) => a + x[1], 0));
}

/** 区画に建つ物の形（試作の spawn と同じ大きさ） */
function shape(L: Lot, kind: PlacedKind) {
	if (kind === 'park')
		return {
			x0: L.x0 + 0.6,
			z0: L.z0 + 0.6,
			x1: L.x1 - 0.6,
			z1: L.z1 - 0.6,
			h: 7,
			floors: 0,
			residents: 0,
			jobs: 0
		};
	const pad = 3.5;
	const w = L.x1 - L.x0,
		d = L.z1 - L.z0;
	const sw = Math.min(w, d) - 2 * pad,
		sd = Math.max(8, Math.min(11, Math.max(w, d) - 2 * pad));
	const x0 = (L.x0 + L.x1) / 2 - (w < d ? sw : sd) / 2,
		z0 = (L.z0 + L.z1) / 2 - (w < d ? sd : sw) / 2;
	return {
		x0,
		z0,
		x1: x0 + (w < d ? sw : sd),
		z1: z0 + (w < d ? sd : sw),
		floors: 2,
		h: kind === 'house' ? 9.5 : 8,
		residents: kind === 'house' ? 5 : 2,
		jobs: kind === 'shop' ? 6 : 0
	};
}

function spawn(
	s: BuildState,
	lot: number,
	kind: PlacedKind,
	minute: number,
	seed: number
): BuildState {
	const lots = s.lots.slice();
	lots[lot] = { ...lots[lot], taken: true };
	const p: Placed = {
		id: s.nextId,
		lot,
		kind,
		...shape(s.lots[lot], kind),
		startedAt: minute,
		look: mix32(seed, lot, minute)
	};
	return { ...s, lots, placed: [...s.placed, p], nextId: s.nextId + 1 };
}

/** 空き区画を押した：住宅地・商業地の指定、または公園 */
export function placeLot(
	s: BuildState,
	_map: TownMap,
	lot: number,
	tool: ZoneKind | 'park',
	minute: number,
	seed: number
): Result {
	const L = s.lots[lot];
	if (!L || L.taken) return { ok: false, why: 'そこは空き区画ではない', state: s };
	if (tool === 'park') {
		if (s.money < COST.park)
			return { ok: false, why: '資金が足りない（必要 ¥' + COST.park + '）', state: s };
		const t = {
			...s,
			money: s.money - COST.park,
			ledger: ledger(s, minute, '公園を作った', -COST.park)
		};
		return { ok: true, why: '', state: spawn(t, lot, 'park', minute, seed) };
	}
	if (L.zone)
		return {
			ok: false,
			why: (L.zone === 'home' ? '住宅地' : '商業地') + 'に指定してある。需要があると建物が建つ',
			state: s
		};
	if (s.money < COST.zone)
		return { ok: false, why: '資金が足りない（必要 ¥' + COST.zone + '）', state: s };
	const lots = s.lots.slice();
	lots[lot] = { ...L, zone: tool };
	return {
		ok: true,
		why: '',
		state: {
			...s,
			lots,
			money: s.money - COST.zone,
			ledger: ledger(s, minute, (tool === 'home' ? '住宅地' : '商業地') + 'に指定した', -COST.zone)
		}
	};
}

export function bulldoze(s: BuildState, id: number, minute: number): Result {
	const p = s.placed.find((x) => x.id === id);
	if (!p) return { ok: false, why: '自分で建てた建物だけ取り壊せる', state: s };
	const lots = s.lots.slice();
	lots[p.lot] = { ...lots[p.lot], taken: false };
	return {
		ok: true,
		why: '',
		state: {
			...s,
			lots,
			placed: s.placed.filter((x) => x !== p),
			money: s.money + 30,
			ledger: ledger(s, minute, '取り壊して資材を売った', 30)
		}
	};
}

export type HourResult = { state: BuildState; income: number; grown: Placed[] };

/** 時（:00）の処理：収支を足す → 指定した区画が育つ（試作の onHour） */
export function hourly(
	s: BuildState,
	map: TownMap,
	minute: number,
	sat: number,
	outs: number,
	seed: number
): HourResult {
	const hr = Math.floor(minute / 60) % 24;
	const v = income(s, map, outs, minute);
	let st: BuildState = { ...s, money: s.money + v };
	if (hr % 6 === 0)
		st = {
			...st,
			ledger: ledger(
				st,
				minute,
				'6 時間ぶんの収支を受け取った（1 時間 ' + (v >= 0 ? '+' : '') + v + '）',
				v * 6
			)
		};
	const dm = demand(st, map, sat, minute);
	const grown: Placed[] = [];
	const absHour = Math.floor(minute / 60);
	for (let i = 0; i < st.lots.length && grown.length < 2; i++) {
		const L = st.lots[i];
		if (!L.zone || L.taken) continue;
		const d = L.zone === 'home' ? dm.res : dm.com;
		const p = (Math.max(0, d - 30) * 1000) / 120;
		if (mix32(seed, i, absHour) % 1000 < p) {
			st = spawn(st, i, L.zone === 'home' ? 'house' : 'shop', minute, seed);
			grown.push(st.placed[st.placed.length - 1]);
		}
	}
	return { state: st, income: v, grown };
}

// ---------------- 道路（試作の roadPlan・addRoad） ----------------
export type SnapPt = Pt & { node: boolean };
export type RoadPlan = { a: SnapPt; b: SnapPt; L: number; cost: number; ok: boolean; why: string };

function nodesOf(s: BuildState, map: TownMap): Pt[] {
	const ns: Pt[] = map.nodes.slice();
	const has = (p: Pt) => ns.some((n) => n.x === p.x && n.z === p.z);
	for (const r of s.roads) for (const p of [r.a, r.b]) if (!has(p)) ns.push(p);
	return ns;
}
function nearNode(ns: readonly Pt[], x: number, z: number, r: number): Pt | null {
	let best: Pt | null = null,
		bd = r;
	for (const n of ns) {
		const d = Math.hypot(n.x - x, n.z - z);
		if (d < bd) {
			bd = d;
			best = n;
		}
	}
	return best;
}

export function snapPoint(s: BuildState, map: TownMap, g: readonly number[]): SnapPt {
	const n = nearNode(nodesOf(s, map), g[0], g[1], 16);
	if (n) return { x: n.x, z: n.z, node: true };
	return { x: Math.round(g[0] / 10) * 10, z: Math.round(g[1] / 10) * 10, node: false };
}

export function roadPlan(s: BuildState, map: TownMap, a: SnapPt, p: Pt): RoadPlan {
	const TH = map.terrainH;
	const dx = p.x - a.x,
		dz = p.z - a.z;
	const b: SnapPt =
		Math.abs(dx) >= Math.abs(dz)
			? { x: a.x + Math.round(dx / 10) * 10, z: a.z, node: false }
			: { x: a.x, z: a.z + Math.round(dz / 10) * 10, node: false };
	const en = nearNode(nodesOf(s, map), b.x, b.z, 8);
	if (en && (en.x === a.x || en.z === a.z)) {
		b.x = en.x;
		b.z = en.z;
		b.node = true;
	}
	const L = Math.hypot(b.x - a.x, b.z - a.z);
	const res: RoadPlan = { a, b, L, cost: Math.round(L * COST.roadPerM), ok: true, why: '' };
	const no = (why: string) => ({ ...res, ok: false, why });
	if (L < 20) return no('短すぎる（20 m 以上）');
	if (L > 400) return no('長すぎる（400 m まで）');
	const ux = (b.x - a.x) / L,
		uz = (b.z - a.z) / L;
	for (let t = 0; t <= L; t += 5)
		for (const o of [-RW / 2, 0, RW / 2]) {
			const x = a.x + ux * t - uz * o,
				z = a.z + uz * t + ux * o;
			const nearEnd = (t < 10 && a.node) || (t > L - 10 && b.node);
			if (!nearEnd && x > -248 && x < 248 && z > -248 && z < 208)
				return no('街の中には引けない（今ある道の端から外へ伸ばす）');
			if (x > 249 && Math.abs(z - 30 * Math.sin((x - 249) * 0.005)) < 12)
				return no('町の外へ出る道と重なる');
			const h = TH(x, z);
			if (h < -0.5) return no('水の上には引けない');
			if (h > 3.5) return no('坂が急すぎる');
			for (const bd of [...map.buildings, ...s.placed])
				if (x > bd.x0 - 1 && x < bd.x1 + 1 && z > bd.z0 - 1 && z < bd.z1 + 1)
					return no('建物に当たる');
			for (const L2 of s.lots)
				if (L2.taken && x > L2.x0 && x < L2.x1 && z > L2.z0 && z < L2.z1)
					return no('建てた区画に当たる');
			for (const rd of s.roads) {
				const rx0 = Math.min(rd.a.x, rd.b.x) - RW / 2,
					rx1 = Math.max(rd.a.x, rd.b.x) + RW / 2,
					rz0 = Math.min(rd.a.z, rd.b.z) - RW / 2,
					rz1 = Math.max(rd.a.z, rd.b.z) + RW / 2;
				if (!nearEnd && t > 8 && t < L - 8 && x > rx0 && x < rx1 && z > rz0 && z < rz1)
					return no('引いた道と重なる');
			}
		}
	if (s.money < res.cost) return no('資金が足りない（¥' + res.cost + '）');
	return res;
}

/** 道を引く。a・b は試し引き（roadPlan）の端。引けないときは理由を返し、状態を変えない */
export function road(
	s: BuildState,
	map: TownMap,
	a: SnapPt,
	b: Pt,
	minute: number
): Result & { plan: RoadPlan; opened: number } {
	const plan = roadPlan(s, map, a, b);
	if (!plan.ok) return { ok: false, why: plan.why, state: s, plan, opened: 0 };
	const TH = map.terrainH;
	const pa = plan.a,
		pb = plan.b;
	const rd: Road = { a: { x: pa.x, z: pa.z }, b: { x: pb.x, z: pb.z }, L: plan.L };
	let st: BuildState = {
		...s,
		money: s.money - plan.cost,
		ledger: ledger(s, minute, '道路を引いた（' + Math.round(plan.L) + ' m）', -plan.cost)
	};
	st = { ...st, roads: [...st.roads, rd] };
	// 両側に空き区画を開く
	const ux = (pb.x - pa.x) / plan.L,
		uz = (pb.z - pa.z) / plan.L,
		px = -uz,
		pz = ux;
	const lots = st.lots.slice();
	let opened = 0;
	for (let t = 9; t + 14 <= plan.L - 8; t += 15)
		for (const side of [-1, 1]) {
			const c0 = [
					pa.x + ux * t + px * side * (RW / 2 + 2.5),
					pa.z + uz * t + pz * side * (RW / 2 + 2.5)
				],
				c1 = [
					pa.x + ux * (t + 14) + px * side * (RW / 2 + 24.5),
					pa.z + uz * (t + 14) + pz * side * (RW / 2 + 24.5)
				];
			const L = {
				x0: Math.min(c0[0], c1[0]),
				x1: Math.max(c0[0], c1[0]),
				z0: Math.min(c0[1], c1[1]),
				z1: Math.max(c0[1], c1[1])
			};
			let ok = true;
			const hs: number[] = [];
			for (const [x, z] of [
				[L.x0, L.z0],
				[L.x1, L.z0],
				[L.x0, L.z1],
				[L.x1, L.z1],
				[(L.x0 + L.x1) / 2, (L.z0 + L.z1) / 2]
			]) {
				const h = TH(x, z);
				hs.push(h);
				if (h < -0.5 || h > 3) ok = false;
				if (x > -248 && x < 248 && z > -248 && z < 208) ok = false;
			}
			if (!ok) continue;
			const hit = (o: { x0: number; x1: number; z0: number; z1: number }) =>
				!(o.x1 < L.x0 || o.x0 > L.x1 || o.z1 < L.z0 || o.z0 > L.z1);
			if (map.buildings.some(hit) || lots.some(hit)) continue;
			if (
				st.roads.some((r2) =>
					hit({
						x0: Math.min(r2.a.x, r2.b.x) - RW / 2 - 2,
						x1: Math.max(r2.a.x, r2.b.x) + RW / 2 + 2,
						z0: Math.min(r2.a.z, r2.b.z) - RW / 2 - 2,
						z1: Math.max(r2.a.z, r2.b.z) + RW / 2 + 2
					})
				)
			)
				continue;
			lots.push({
				...L,
				cx: (L.x0 + L.x1) / 2,
				cz: (L.z0 + L.z1) / 2,
				y0: Math.max(...hs, 0) + 0.25,
				taken: false
			});
			opened++;
		}
	return { ok: true, why: '', state: { ...st, lots }, plan, opened };
}

/** 資金を払う・受け取る（v が負なら払う）。出入りに残す */
export function pay(s: BuildState, minute: number, text: string, v: number): BuildState {
	return { ...s, money: s.money + v, ledger: ledger(s, minute, text, v) };
}
