// みなと町：遊びの層（時刻と光、車・人・船、要望、建てる道具、地下の仕組みの表示、操作）。
// 試作 docs/prototype/src/game.js を TypeScript に移した物（段 8-2a）。
// 状態（時計・資金・区画・要望・満足度・仕組みの建物）は src/lib/game/ の純粋な関数だけで変わる（8-2b・8-2c）。
// ここは状態を読んで描き、手を applyTown に渡すだけ。見た目だけの動き（車・人・船・建つ様子）は種つきの擬似乱数と描画の時刻で動く。

import { createEngine, createNullEngine, type Engine, type Light, type Mat4 } from './engine.ts';
import { generateCity, GEN, type Bld, type Col, type RNode } from './gen.ts';
import { clockOf, MIN_PER_DAY, MORNING, slotsLeft } from '../game/clock.ts';
import {
	applyTown,
	avgHappy as avgHappyOf,
	chapterDay,
	deskCtx,
	happyAt,
	income as incomeOf,
	incomeParts as incomePartsOf,
	demand as demandOf,
	population,
	RANK_NAMES,
	RANKS,
	replayTown,
	startTown as startTownState,
	tickTown,
	type TownAction,
	type TownEvent,
	type TownSave,
	type TownState
} from '../game/town.ts';
import {
	causeLabel,
	CLIENTS,
	DAYS_PER_CHAPTER,
	groupOf,
	lessonsFor,
	movesFor,
	outCost,
	reward,
	SYSTEM_NAMES,
	type Change,
	type DeskAction,
	type Req
} from '../game/desk.ts';
import {
	BUILD_MIN,
	roadPlan as roadPlanOf,
	snapPoint as snapPointOf,
	type Placed,
	type RoadPlan,
	type SnapPt
} from '../game/build.ts';
import { mapOf, type FeatKey } from '../game/map.ts';
import { fieldName } from '../content/fields.ts';
import { loadProgress } from '../progress.ts';
import {
	BOX_ID,
	BOX_SPOT,
	CLIENT_LOOK,
	FIELD_COLOR,
	SYSTEM_FEAT,
	SYSTEM_ID,
	SYSTEM_SPOT,
	type Rect
} from './systems.ts';

/** 遊びの記録を置く所（game-design.md 15.9） */
export const TOWN_KEY = 'devlearn.town';

/** 種の既定（game-design.md 7.1） */
const SEED = 1;

type City = ReturnType<typeof generateCity>;

// ---------------- 板に出す物（Svelte が描く） ----------------
export type ToastKind = '' | 'req' | 'learn' | 'warn';
export type ToastAction = { label: string; pri: boolean; run: () => void };
export type Toast = {
	id: number;
	title: string;
	body: string;
	kind: ToastKind;
	actions: ToastAction[];
	out: boolean;
};
export type ReqRow = {
	id: string;
	icon: string;
	color: string;
	title: string;
	who: string;
	left: number;
	doubt: number;
};
export type DoneRow = { id: string; title: string; how: string };
export type InfoView = {
	name: string;
	residents: number;
	jobs: number;
	happy: number;
	voice: string;
	player: boolean;
};
export type LedgerRow = { t: string; text: string; v: number };
export type BudgetView = { parts: [string, number][]; income: number; ledger: LedgerRow[] };
export type CandView = { id: string; label: string; state: 'live' | 'out' | 'ok' };
export type MoveView = {
	key: number;
	kind: 'learned' | 'any';
	label: string;
	slots: number;
	ok: boolean;
	why: string;
	lesson?: string;
	lessonTitle?: string;
};
export type ReqDialog = {
	kind: 'req';
	id: string;
	icon: string;
	color: string;
	who: string;
	place: string;
	title: string;
	left: number;
	doubt: number;
	slots: number;
	cands: CandView[];
	moves: MoveView[];
	evidence: string | null;
	notes: string[];
	last: string[];
	reward: number;
	cost: number;
	clientSat: number;
	lessons: { lesson: string; title: string; move: string; learned: boolean }[];
};
export type ResultDialog = {
	kind: 'result';
	passed: boolean;
	title: string;
	body: string;
	days: { label: string; minute: number }[];
};
export type Dialog = null | { kind: 'intro' } | ReqDialog | ResultDialog;
/** キーボードだけで道具を使う一覧（screen-design.md 10.6） */
export type PickView = { title: string; items: string[]; sel: number; plan: string };
export type Goals = {
	clientSat: number;
	daysLeft: number;
	rankNext: number | null;
	rankName: string;
};

export type TownUi = {
	ready: boolean;
	noGL: string;
	clock: string;
	date: string;
	pop: number;
	money: number;
	income: number;
	sat: number;
	demand: { res: number; com: number; job: number };
	speed: number;
	tool: string;
	view: string;
	hint: string;
	reqs: ReqRow[];
	done: DoneRow[];
	toasts: Toast[];
	info: InfoView | null;
	budgetOpen: boolean;
	budget: BudgetView;
	dialog: Dialog;
	/** 章・日目・町の格・勤務の残り（上の帯） */
	chapter: string;
	day: number;
	slots: number;
	goals: Goals;
	pick: PickView | null;
	/** 建った仕組みの建物（地下の仕組みの凡例） */
	systems: { field: string; name: string; fieldName: string; color: string; links: number }[];
};

export function newTownUi(): TownUi {
	return {
		ready: false,
		noGL: '',
		clock: '08:00',
		date: '11月10日',
		pop: 0,
		money: 0,
		income: 0,
		sat: 60,
		demand: { res: 0, com: 0, job: 0 },
		speed: 1,
		tool: 'select',
		view: 'ground',
		hint: '',
		reqs: [],
		done: [],
		toasts: [],
		info: null,
		budgetOpen: false,
		budget: { parts: [], income: 0, ledger: [] },
		dialog: null,
		chapter: '第 1 章',
		day: 1,
		slots: 8,
		goals: { clientSat: 50, daysLeft: 7, rankNext: null, rankName: '' },
		systems: [],
		pick: null
	};
}

export type TownHandle = ReturnType<typeof startTown>;

type Layers = { canvas: HTMLCanvasElement; markers: HTMLElement; floaters: HTMLElement };

// 試作のまま：組み立て後の建物（区画に建つ家・店・公園）。仕組みの建物と業者の箱も同じ形で描く
type Built = Bld & {
	player: boolean;
	field?: string;
	lot: { y0?: number };
	floors?: number;
	wall?: Col;
	roof?: Col;
	sign?: Col;
	trees?: [number, number, Col][];
};
type AnyB = Bld | Built;
type Pt = { x: number; z: number };
type Seg = {
	ux: number;
	uz: number;
	lx: number;
	lz: number;
	off: number;
	S: number[];
	E: number[];
	L: number;
};
type Turn = { P0: number[]; P1: number[]; P2: number[]; ns: Seg; L: number };
type Car = {
	a: RNode;
	b: RNode;
	c: RNode | null;
	t: number;
	phase: 'seg' | 'turn';
	type: string;
	col: Col;
	sp: number;
	x: number;
	z: number;
	h: number;
	seg: Seg;
	tt: number;
	turn: Turn | null;
	lead: number | null;
};
type Ped = {
	rg: { x0: number; z0: number; x1: number; z1: number };
	per: number;
	s: number;
	v: number;
	shirt: Col;
	legs: Col;
	h: number;
	bob: number;
};
type Boat = {
	kind: string;
	path?: number[][];
	cx?: number;
	cz?: number;
	r?: number;
	a?: number;
	t?: number;
	sp: number;
	L: number;
	W: number;
	x?: number;
	z?: number;
	h?: number;
	ph?: number;
};
type Construction = { b: AnyB; p: number; dur: number; onDone?: () => void };
type Floater = { x: number; y: number; z: number; el: HTMLElement; t: number };
type Drag = {
	x: number;
	y: number;
	sx: number;
	sy: number;
	b: number;
	shift: boolean;
	moved: boolean;
	pts: Map<number, number[]>;
};

type StillHooks = {
	__game?: unknown;
	__frame?: (n?: number, dt?: number) => void;
	__snap?: () => void;
	__proj?: (x: number, z: number) => number[];
	__ready?: boolean;
};

export function startTown(layers: Layers, ui: TownUi, still: boolean) {
	const canvas = layers.canvas;
	let E: Engine;
	let noGL = false;
	try {
		E = createEngine(canvas);
	} catch {
		// 3D は描けないが、状態・板・知らせは同じに動かす（P-4・screen-design.md 10.8）
		E = createNullEngine();
		noGL = true;
		ui.noGL = 'この端末では 3D の街（WebGL2）を描けない。要望の一覧と、解き方の板で遊べる';
	}
	const eng = E;
	const city: City = generateCity();
	E.setMesh('city', city.G);
	E.setMesh('water', city.W);
	E.setMesh('glow', city.GL);
	const { Geo, q, box, rbox, cyl, faces, fp, fquad, windows, gable, HX, mulc, jit, PAL } = GEN;
	const Y = city.Y;
	const R = GEN.mulberry(7);
	const pick = <T>(a: readonly T[]): T => a[Math.floor(R() * a.length)];
	const mesh = (k: string) => {
		const m = eng.meshes[k];
		if (!m) throw new Error('mesh ' + k);
		return m;
	};

	// hide reserved buildings
	for (const b of city.B) if (b.hidden) E.setData(b.id, 0, 0, 0, 0);

	// ---------------- state ----------------
	// 時計は状態（src/lib/game/clock.ts の整数の分）。描画のための端数（frac）だけをここで持つ（段 8-2b）
	let frac = 0;
	const S = {
		/** その日の 0 時からの分（端数つき。描画の光に使う）。撮影の口から書き換えられる（city-standard.md 第 6 章） */
		get minute() {
			return (ts.minute % MIN_PER_DAY) + frac;
		},
		set minute(v: number) {
			ts = { ...ts, minute: Math.floor(ts.minute / MIN_PER_DAY) * MIN_PER_DAY + Math.floor(v) };
			frac = v - Math.floor(v);
		},
		get day() {
			return clockOf(ts.minute).day;
		},
		speed: 1,
		view: 'ground',
		tool: 'select',
		sel: null as AnyB | null,
		infra: 0,
		infraTarget: 0,
		roadStart: null as SnapPt | null,
		prevSpeed: 1
	};
	const MAP = mapOf(city);
	/** 修了したレッスンの集まり（学習の記録を読むだけ。段 4 の 4.3）。撮影の口からは差し替えられる */
	let learnedOverride: Set<string> | null = null;
	const learned = (): Set<string> => learnedOverride ?? new Set(loadProgress().done);
	/** 街の状態の全部（src/lib/game/town.ts）。applyTown と tickTown だけで変わる */
	let ts: TownState = startTownState(SEED, MAP);
	/** 打てた手の記録（何分目に・何をした。game-design.md 15.9）。任意の時点はここから作り直す */
	let log: TownSave['actions'] = [];
	let restored = false;
	if (!still) {
		try {
			const raw = localStorage.getItem(TOWN_KEY);
			const sv = raw ? (JSON.parse(raw) as TownSave) : null;
			if (sv && sv.version === 1 && sv.seed === SEED && Array.isArray(sv.actions)) {
				ts = replayTown(sv, MAP).state;
				log = sv.actions.slice();
				restored = true;
			}
		} catch {
			/* 読めない記録は使わない */
		}
	}
	const save = (): TownSave => ({ version: 1, seed: SEED, now: ts.minute, actions: log.slice() });
	function persist() {
		if (still) return;
		try {
			localStorage.setItem(TOWN_KEY, JSON.stringify(save()));
		} catch {
			/* 置けなくても遊べる */
		}
	}
	const allB = (): AnyB[] => (city.B as AnyB[]).concat(builtList(), extraList());
	/** 建物の満足度（0〜1。描画の色に使う） */
	const hp = (id: number) => happyAt(ts, MAP, id) / 100;
	const pop = () => population(ts, MAP);
	const avgHappy = () => avgHappyOf(ts, MAP);

	// ---------------- 動きを減らす設定（screen-design.md 10.7） ----------------
	const mq =
		typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
	let RM = !!mq?.matches;
	const onRM = () => (RM = !!mq?.matches);
	mq?.addEventListener('change', onRM);
	/** 前と後の絵を見せる長さ（秒。--dl-motion-hold） */
	function holdSec() {
		const v = getComputedStyle(document.documentElement).getPropertyValue('--dl-motion-hold');
		const m = /([\d.]+)\s*(ms|s)/.exec(v);
		return m ? (m[2] === 'ms' ? +m[1] / 1000 : +m[1]) : 1.2;
	}

	// ---------------- camera ----------------
	type CamV = { tx: number; tz: number; yaw: number; pitch: number; dist: number };
	const cam = {
		tx: 30,
		tz: -10,
		yaw: 0.75,
		pitch: 0.52,
		dist: 260,
		v: { tx: 30, tz: -10, yaw: 0.75, pitch: 0.52, dist: 260 } as CamV,
		fly: null as null | { t: number; from: CamV; to: CamV }
	};
	const CAMK = ['tx', 'tz', 'dist', 'pitch', 'yaw'] as const;
	function eyeOf(c: CamV) {
		return [
			c.tx + c.dist * Math.cos(c.pitch) * Math.sin(c.yaw),
			Math.max(4, c.dist * Math.sin(c.pitch)),
			c.tz + c.dist * Math.cos(c.pitch) * Math.cos(c.yaw)
		];
	}
	function flyTo(x: number, z: number, dist?: number, pitch?: number, yaw?: number) {
		cam.fly = {
			t: 0,
			from: { ...cam.v },
			to: {
				tx: x,
				tz: z,
				dist: dist || cam.v.dist,
				pitch: pitch === undefined ? cam.v.pitch : pitch,
				yaw: yaw === undefined ? cam.v.yaw : yaw
			}
		};
	}
	const clampCam = () => {
		cam.v.dist = Math.max(35, Math.min(950, cam.v.dist));
		cam.v.pitch = Math.max(0.18, Math.min(1.38, cam.v.pitch));
		cam.v.tx = Math.max(-700, Math.min(700, cam.v.tx));
		cam.v.tz = Math.max(-700, Math.min(500, cam.v.tz));
	};

	// ---------------- lighting by hour ----------------
	const KEYS: [number, number[], number[], number[], number, number][] = [
		[0, [0.1, 0.13, 0.22], [0.006, 0.01, 0.03], [0.02, 0.03, 0.06], 0.55, 1],
		[4.8, [0.1, 0.13, 0.22], [0.006, 0.01, 0.03], [0.02, 0.03, 0.06], 0.55, 1],
		[6.0, [1.5, 0.8, 0.45], [0.07, 0.11, 0.26], [0.72, 0.46, 0.36], 0.45, 0.35],
		[7.5, [2.3, 2.0, 1.6], [0.07, 0.16, 0.4], [0.45, 0.52, 0.65], 0.55, 0],
		[12, [2.6, 2.35, 1.95], [0.06, 0.16, 0.42], [0.42, 0.53, 0.7], 0.55, 0],
		[15.5, [2.5, 2.1, 1.6], [0.06, 0.15, 0.4], [0.5, 0.53, 0.62], 0.55, 0],
		[16.8, [2.3, 1.35, 0.65], [0.11, 0.16, 0.34], [0.88, 0.56, 0.38], 0.75, 0.05],
		[17.7, [1.5, 0.6, 0.27], [0.08, 0.09, 0.22], [0.8, 0.36, 0.25], 0.7, 0.45],
		[18.6, [0.12, 0.14, 0.25], [0.015, 0.02, 0.07], [0.09, 0.06, 0.13], 0.5, 0.92],
		[24, [0.1, 0.13, 0.22], [0.006, 0.01, 0.03], [0.02, 0.03, 0.06], 0.55, 1]
	];
	function lightAt(h: number): Light {
		let a = KEYS[0],
			b = KEYS[1];
		for (let i = 0; i < KEYS.length - 1; i++)
			if (h >= KEYS[i][0] && h <= KEYS[i + 1][0]) {
				a = KEYS[i];
				b = KEYS[i + 1];
				break;
			}
		const t = (h - a[0]) / (b[0] - a[0] || 1);
		const L = (u: number[], v: number[]) => u.map((x, i) => x + (v[i] - x) * t);
		const sun = L(a[1], b[1]),
			sky = L(a[2], b[2]),
			hor = L(a[3], b[3]);
		let sd: number[];
		if (h > 5.6 && h < 18.4) {
			const ph = ((h - 6) / 12) * Math.PI;
			const el = Math.max(0.04, Math.sin(ph) * 0.92);
			let hx = Math.cos(ph),
				hz = 0.5 + 0.45 * Math.sin(ph);
			const hl = Math.hypot(hx, hz);
			hx /= hl;
			hz /= hl;
			sd = [hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)];
		} else
			sd = (() => {
				const v = [-0.35, 0.75, 0.45];
				const l = Math.hypot(...v);
				return v.map((x) => x / l);
			})();
		return {
			sun,
			sky,
			hor,
			gnd: [sky[0] * 0.5 + 0.03, sky[1] * 0.45 + 0.03, sky[2] * 0.3 + 0.02].map(
				(x) => x * (1 - (a[5] + (b[5] - a[5]) * t) * 0.6)
			),
			amb: a[4] + (b[4] - a[4]) * t,
			night: a[5] + (b[5] - a[5]) * t,
			sd
		};
	}

	// ---------------- traffic ----------------
	const NODES: RNode[] = city.nodes;
	const cars: Car[] = [];
	function laneLeft(dx: number, dz: number) {
		return [dz, -dx];
	}
	function segFor(car: { a: RNode; b: RNode }): Seg {
		const A = car.a,
			B = car.b;
		const dx = B.x - A.x,
			dz = B.z - A.z,
			L = Math.hypot(dx, dz);
		const ux = dx / L,
			uz = dz / L;
		const [lx, lz] = laneLeft(ux, uz);
		const off = Math.max(A.w, B.w) > 14 ? 4.2 : 2.0;
		const rA = A.w / 2 + 3,
			rB = B.w / 2 + 3;
		return {
			ux,
			uz,
			lx,
			lz,
			off,
			S: [A.x + ux * rA + lx * off, A.z + uz * rA + lz * off],
			E: [B.x - ux * rB + lx * off, B.z - uz * rB + lz * off],
			L: L - rA - rB
		};
	}
	function chooseNext(car: Car) {
		const opts = car.b.nb.filter((n) => n !== car.a);
		car.c = opts.length ? opts[Math.floor(R() * opts.length)] : car.a;
	}
	function initCar(type: string) {
		const a = NODES[Math.floor(R() * NODES.length)];
		const b = a.nb[Math.floor(R() * a.nb.length)];
		// 試作のオブジェクトの書き方と同じ順（t → col → sp）で擬似乱数を引く
		const t0 = R();
		const col =
			type === 'bus'
				? pick([HX('#2f8f6b'), HX('#e0a92e'), HX('#3b6fb0')])
				: type === 'truck'
					? pick([HX('#f2f2f2'), HX('#3a6ea5'), HX('#c94f3a')])
					: pick(PAL.car);
		const car: Car = {
			a,
			b,
			c: null,
			t: t0,
			phase: 'seg',
			type,
			col,
			sp: type === 'bus' ? 8 : 9 + R() * 5,
			x: 0,
			z: 0,
			h: 0,
			seg: segFor({ a, b }),
			tt: 0,
			turn: null,
			lead: null
		};
		car.t = R() * car.seg.L;
		chooseNext(car);
		cars.push(car);
	}
	for (let i = 0; i < 150; i++) initCar(i < 8 ? 'bus' : i < 22 ? 'truck' : 'car');
	const greenX = (n: RNode) => (n.sig ? Math.floor((TIME + (n.off ?? 0)) / 14) % 2 === 0 : true);
	function stepCar(c: Car, dt: number) {
		let d = c.sp * dt;
		if (c.phase === 'seg') {
			const rem = c.seg.L - c.t;
			const alongX = Math.abs(c.seg.ux) > 0.5;
			if (c.b.sig && rem > 0.3 && rem < 9 && greenX(c.b) !== alongX)
				d = Math.min(d, Math.max(0, rem - 1.2));
			if (c.lead !== undefined && c.lead !== null) d = Math.min(d, Math.max(0, c.lead - 7.5));
		}
		while (d > 0) {
			if (c.phase === 'seg') {
				const rem = c.seg.L - c.t;
				if (d < rem) {
					c.t += d;
					d = 0;
				} else {
					d -= rem;
					c.phase = 'turn';
					c.tt = 0;
					const nxt = { a: c.b, b: c.c as RNode };
					const ns = segFor(nxt);
					const turn: Turn = {
						P0: c.seg.E,
						P2: ns.S,
						P1: [
							c.b.x + c.seg.lx * c.seg.off + ns.lx * ns.off,
							c.b.z + c.seg.lz * c.seg.off + ns.lz * ns.off
						],
						ns,
						L: 0
					};
					if (c.c === c.a) turn.P1 = [c.b.x, c.b.z];
					turn.L =
						Math.hypot(turn.P1[0] - turn.P0[0], turn.P1[1] - turn.P0[1]) +
						Math.hypot(turn.P2[0] - turn.P1[0], turn.P2[1] - turn.P1[1]);
					c.turn = turn;
				}
			} else {
				const turn = c.turn as Turn;
				const rem = turn.L * (1 - c.tt);
				if (d < rem) {
					c.tt += d / turn.L;
					d = 0;
				} else {
					d -= rem;
					c.a = c.b;
					c.b = c.c as RNode;
					c.seg = turn.ns;
					c.t = 0;
					c.phase = 'seg';
					chooseNext(c);
				}
			}
		}
		if (c.phase === 'seg') {
			c.x = c.seg.S[0] + c.seg.ux * c.t;
			c.z = c.seg.S[1] + c.seg.uz * c.t;
			c.h = Math.atan2(c.seg.uz, c.seg.ux);
		} else {
			const { P0, P1, P2 } = c.turn as Turn,
				t = c.tt,
				u = 1 - t;
			c.x = u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0];
			c.z = u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1];
			const tx = 2 * u * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]),
				tz = 2 * u * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
			c.h = Math.atan2(tz, tx);
		}
	}
	// pedestrians on sidewalks
	const peds: Ped[] = [];
	for (let i = 0; i < 320; i++) {
		const rg = city.rings[Math.floor(R() * city.rings.length)];
		const per = 2 * (rg.x1 - rg.x0 + (rg.z1 - rg.z0));
		peds.push({
			rg,
			per,
			s: R() * per,
			v: (0.9 + R() * 0.7) * (R() < 0.5 ? 1 : -1),
			shirt: pick([
				HX('#3b5ba5'),
				HX('#c0392b'),
				HX('#f2f2f2'),
				HX('#2d2d2d'),
				HX('#e6b33a'),
				HX('#5a8f5a'),
				HX('#8e5ba5'),
				HX('#d97b3a')
			]),
			legs: pick([HX('#2b2f3a'), HX('#3a3f4a'), HX('#6b5a4a')]),
			h: 1.55 + R() * 0.25,
			bob: R() * 6
		});
	}
	function pedPos(p: Ped) {
		const { rg } = p;
		const w = rg.x1 - rg.x0,
			d = rg.z1 - rg.z0;
		let s = ((p.s % p.per) + p.per) % p.per;
		if (s < w) return [rg.x0 + s, rg.z0, 0];
		s -= w;
		if (s < d) return [rg.x1, rg.z0 + s, Math.PI / 2];
		s -= d;
		if (s < w) return [rg.x1 - s, rg.z1, Math.PI];
		s -= w;
		return [rg.x0, rg.z1 - s, -Math.PI / 2];
	}
	// boats
	const boats: Boat[] = [
		{
			kind: 'ferry',
			path: [
				[-52, 262],
				[-110, 380],
				[-200, 470],
				[-110, 380]
			],
			t: 0,
			sp: 6,
			L: 26,
			W: 7
		},
		{ kind: 'fish', cx: 40, cz: 300, r: 60, a: 0, sp: 0.05, L: 10, W: 3.2 },
		{ kind: 'fish', cx: -150, cz: 280, r: 45, a: 2, sp: -0.06, L: 9, W: 3 },
		{ kind: 'yacht', cx: 120, cz: 420, r: 90, a: 4, sp: 0.03, L: 8, W: 2.6 }
	];

	// ---------------- dynamic geometry each frame ----------------
	const DYN = new Geo(1 << 15);
	function buildDyn() {
		const g = DYN.reset();
		for (const c of cars) {
			const yb = 0.05;
			if (c.type === 'bus') {
				rbox(g, c.x, c.z, c.h, -5.6, 5.6, 2.5, yb + 0.35, yb + 3.1, c.col, {
					ao: 0.7,
					top: HX('#e8e8e4')
				});
				rbox(g, c.x, c.z, c.h, -5.3, 5.5, 2.54, yb + 1.5, yb + 2.6, HX('#26323c'), { m: 1 });
				rbox(g, c.x, c.z, c.h, 5.55, 5.62, 2.0, yb + 0.8, yb + 1.1, HX('#fff4d0'), { m: 8 });
				rbox(g, c.x, c.z, c.h, -5.62, -5.55, 2.0, yb + 0.8, yb + 1.1, HX('#ff3a2a'), { m: 8 });
			} else if (c.type === 'truck') {
				rbox(g, c.x, c.z, c.h, -3.6, 1.4, 2.3, yb + 0.5, yb + 3.0, c.col, { ao: 0.75 });
				rbox(g, c.x, c.z, c.h, 1.5, 3.4, 2.2, yb + 0.4, yb + 2.3, HX('#e9e9e4'), { ao: 0.75 });
				rbox(g, c.x, c.z, c.h, 2.6, 3.42, 2.0, yb + 1.3, yb + 2.1, HX('#26323c'), { m: 1 });
				rbox(g, c.x, c.z, c.h, 3.4, 3.46, 1.8, yb + 0.6, yb + 0.85, HX('#fff4d0'), { m: 8 });
			} else {
				rbox(g, c.x, c.z, c.h, -2.15, 2.15, 1.75, yb + 0.28, yb + 0.95, c.col, { ao: 0.6 });
				rbox(g, c.x, c.z, c.h, -1.25, 0.85, 1.58, yb + 0.95, yb + 1.45, mulc(c.col, 0.9), {
					mf: 1,
					mb: 1
				});
				rbox(g, c.x, c.z, c.h, -1.2, 0.8, 1.6, yb + 1.0, yb + 1.38, HX('#26323c'), { m: 1 });
				rbox(g, c.x, c.z, c.h, 2.13, 2.18, 1.4, yb + 0.6, yb + 0.8, HX('#fff4d0'), { m: 8 });
				rbox(g, c.x, c.z, c.h, -2.18, -2.13, 1.4, yb + 0.62, yb + 0.8, HX('#ff3a2a'), { m: 8 });
			}
		}
		for (const p of peds) {
			const [x, z, a] = pedPos(p);
			const y = city.BH;
			const k = 0.06 * Math.abs(Math.sin(p.bob));
			rbox(g, x, z, a, -0.15, 0.15, 0.36, y, y + p.h * 0.5, p.legs, { ao: 0.8 });
			rbox(g, x, z, a, -0.17, 0.17, 0.46, y + p.h * 0.5, y + p.h * 0.84 + k, p.shirt, { ao: 0.9 });
			rbox(g, x, z, a, -0.12, 0.12, 0.24, y + p.h * 0.84 + k, y + p.h + k, HX('#e0b593'), {
				ao: 1
			});
		}
		for (const b of boats) {
			const bx = b.x as number,
				bz = b.z as number,
				bh = b.h as number;
			const hull =
				b.kind === 'ferry' ? HX('#f4f4f0') : b.kind === 'yacht' ? HX('#ffffff') : HX('#3a6ea5');
			const bob = Math.sin(b.ph || 0) * 0.15;
			rbox(g, bx, bz, bh, -b.L / 2, b.L / 2 - b.W * 0.4, b.W, -0.9 + bob, 0.9 + bob, hull, {
				ao: 0.7
			});
			rbox(g, bx, bz, bh, b.L / 2 - b.W * 0.4, b.L / 2, b.W * 0.55, -0.9 + bob, 0.9 + bob, hull, {
				ao: 0.7
			});
			rbox(g, bx, bz, bh, -b.L / 2, b.L / 2, b.W * 1.01, -0.95 + bob, -0.4 + bob, HX('#b33a2e'), {
				ao: 1
			});
			if (b.kind === 'ferry') {
				rbox(
					g,
					bx,
					bz,
					bh,
					-b.L * 0.35,
					b.L * 0.25,
					b.W * 0.86,
					0.9 + bob,
					3.6 + bob,
					HX('#e9ecef')
				);
				rbox(
					g,
					bx,
					bz,
					bh,
					-b.L * 0.34,
					b.L * 0.24,
					b.W * 0.88,
					1.8 + bob,
					2.9 + bob,
					HX('#26323c'),
					{ m: 1 }
				);
				rbox(g, bx, bz, bh, -b.L * 0.1, 0, b.W * 0.4, 3.6 + bob, 6 + bob, HX('#2f6f9e'));
			} else if (b.kind === 'fish') {
				rbox(g, bx, bz, bh, -b.L * 0.3, b.L * 0.05, b.W * 0.7, 0.9 + bob, 2.8 + bob, HX('#f2f2ee'));
				rbox(g, bx, bz, bh, -b.L * 0.05, 0.0, 0.2, 2.8 + bob, 5.5 + bob, HX('#dddddd'));
			} else {
				rbox(g, bx, bz, bh, -0.1, 0.1, 0.12, 0.9 + bob, 9 + bob, HX('#dddddd'));
				q(
					g,
					[bx, 1.6 + bob, bz],
					[bx, 8.5 + bob, bz],
					[bx - Math.cos(bh) * 3.5, 1.8 + bob, bz - Math.sin(bh) * 3.5],
					[bx - Math.cos(bh) * 3.5, 1.8 + bob, bz - Math.sin(bh) * 3.5],
					HX('#fbfbf6')
				);
			}
		}
		// signal heads
		for (const sg of city.signals) {
			const gx = greenX(sg.n);
			sg.cs.forEach(([px, pz], k) => {
				const on = k < 2 ? gx : !gx;
				box(
					g,
					px - 0.27,
					city.BH + (on ? 4.35 : 4.85),
					pz - 0.27,
					px + 0.27,
					city.BH + (on ? 4.7 : 5.2),
					pz + 0.27,
					on ? HX('#3dff8a') : HX('#ff3b2a'),
					{ m: 7, ao: 1, top: HX('#2f3337') }
				);
			});
		}
		// flags
		if (city.FEAT.flags)
			for (const [fx, fy, fz] of city.FEAT.flags) {
				const t = TIME * 3;
				const pts: number[][] = [];
				for (let k = 0; k <= 4; k++)
					pts.push([
						fx + k * 0.9,
						fy - 0.2 + Math.sin(t + k) * 0.15 * k * 0.4,
						fz + Math.sin(t * 1.3 + k * 0.9) * 0.25 * k
					]);
				for (let k = 0; k < 4; k++)
					q(
						g,
						[pts[k][0], pts[k][1] - 1.4, pts[k][2]],
						[pts[k + 1][0], pts[k + 1][1] - 1.4, pts[k + 1][2]],
						[pts[k + 1][0], pts[k + 1][1], pts[k + 1][2]],
						[pts[k][0], pts[k][1], pts[k][2]],
						fx < 34 ? HX('#2f6fae') : HX('#f2f2ee')
					);
			}
		// construction effects（要望で建つ物と、区画に建つ物）
		for (const cn of scaffolds()) {
			const b = cn.b;
			const p = cn.p;
			if (p >= 1) continue;
			const sc = HX('#d98a3a'),
				h = b.h * Math.min(1, p * 1.3 + 0.1);
			for (const [x, z] of [
				[b.x0 - 0.6, b.z0 - 0.6],
				[b.x1 + 0.6, b.z0 - 0.6],
				[b.x1 + 0.6, b.z1 + 0.6],
				[b.x0 - 0.6, b.z1 + 0.6]
			])
				box(g, x - 0.12, Y, z - 0.12, x + 0.12, Y + h, z + 0.12, sc, { ao: 1 });
			for (let yy = Y + 2; yy < Y + h; yy += 2.2) {
				box(g, b.x0 - 0.7, yy, b.z0 - 0.7, b.x1 + 0.7, yy + 0.12, b.z0 - 0.5, sc, { ao: 1 });
				box(g, b.x0 - 0.7, yy, b.z1 + 0.5, b.x1 + 0.7, yy + 0.12, b.z1 + 0.7, sc, { ao: 1 });
				box(g, b.x0 - 0.7, yy, b.z0 - 0.7, b.x0 - 0.5, yy + 0.12, b.z1 + 0.7, sc, { ao: 1 });
				box(g, b.x1 + 0.5, yy, b.z0 - 0.7, b.x1 + 0.7, yy + 0.12, b.z1 + 0.7, sc, { ao: 1 });
			}
			for (let k = 0; k < 14; k++) {
				const a = k * 2.4 + TIME * 0.8,
					rr = 2 + ((k * 7.3 + TIME * 3) % 7);
				const px = (b.x0 + b.x1) / 2 + (Math.cos(a) * (b.x1 - b.x0) * 0.4 * rr) / 5,
					pz = (b.z0 + b.z1) / 2 + (Math.sin(a) * (b.z1 - b.z0) * 0.4 * rr) / 5;
				const s = 0.6 + (k % 3) * 0.3;
				const yy = Y + ((k * 1.7 + TIME * 2) % 3);
				box(g, px - s, yy, pz - s, px + s, yy + s, pz + s, HX('#cbbf9f'), { ao: 1 });
			}
		}
		return g.view();
	}

	// ---------------- infra network (地下の仕組み) ----------------
	const F = city.FEAT;
	const cx = (b: { x0: number; x1: number }) => (b.x0 + b.x1) / 2,
		cz = (b: { z0: number; z1: number }) => (b.z0 + b.z1) / 2;
	function tube(g: InstanceType<typeof Geo>, pts: number[][], w: number, col: Col, y: number) {
		let acc = 0;
		for (let k = 0; k < pts.length - 1; k++) {
			const [ax, az] = pts[k],
				[bx, bz] = pts[k + 1];
			const L = Math.hypot(bx - ax, bz - az);
			// 長さ 0 の区間は向きが決まらない（0 で割ると NaN になり、にじみが黒い四角に広がる）
			if (L < 0.01) continue;
			const n = Math.max(1, Math.ceil(L / 6));
			const ux = (bx - ax) / L,
				uz = (bz - az) / L,
				px = (-uz * w) / 2,
				pz = (ux * w) / 2;
			for (let i = 0; i < n; i++) {
				const t0 = i / n,
					t1 = (i + 1) / n;
				const x0 = ax + (bx - ax) * t0,
					z0 = az + (bz - az) * t0,
					x1 = ax + (bx - ax) * t1,
					z1 = az + (bz - az) * t1;
				const u0 = acc + L * t0,
					u1 = acc + L * t1;
				q(
					g,
					[x0 + px, y + w * 0.5, z0 + pz],
					[x0 - px, y + w * 0.5, z0 - pz],
					[x1 - px, y + w * 0.5, z1 - pz],
					[x1 + px, y + w * 0.5, z1 + pz],
					col,
					4,
					0,
					[u0, u0, u1, u1],
					[0, 1, 0]
				);
				q(
					g,
					[x0 + px, y, z0 + pz],
					[x0 + px, y + w * 0.5, z0 + pz],
					[x1 + px, y + w * 0.5, z1 + pz],
					[x1 + px, y, z1 + pz],
					mulc(col, 0.7),
					4,
					0,
					[u0, u0, u1, u1]
				);
				q(
					g,
					[x0 - px, y, z0 - pz],
					[x0 - px, y + w * 0.5, z0 - pz],
					[x1 - px, y + w * 0.5, z1 - pz],
					[x1 - px, y, z1 - pz],
					mulc(col, 0.7),
					4,
					0,
					[u0, u0, u1, u1]
				);
			}
			acc += L;
		}
	}
	function node(
		g: InstanceType<typeof Geo>,
		x: number,
		z: number,
		r: number,
		col: Col,
		h?: number
	) {
		cyl(g, x, z, 0.2, h || 1.6, r, 18, col, { m: 4 });
	}
	/** 依頼主の建物ごとの、受付中の要望の数 */
	function openAt(): Map<FeatKey, number> {
		const m = new Map<FeatKey, number>();
		for (const r of ts.desk.requests)
			if (r.status === 'open') {
				const k = CLIENTS[r.group].at;
				m.set(k, (m.get(k) ?? 0) + 1);
			}
		return m;
	}
	const CLIENT_KEYS = [...new Set(Object.values(CLIENTS).map((c) => c.at))];
	/** その依頼主の建物に、最後につないだ仕組みの分野 */
	const linkedField = (k: FeatKey) => {
		let f: string | null = null;
		for (const x of ts.systems) if (x.links.includes(k)) f = x.field;
		return f;
	};
	function buildInfra() {
		const g = new Geo(1 << 14);
		const BLUE = HX('#4aa3ff'),
			RED = HX('#ff5a3c'),
			GRAY = HX('#8a9099');
		// trunk lines along roads（試作のまま）
		tube(
			g,
			[
				[0, -500],
				[0, -250],
				[0, 0],
				[-240, 0]
			],
			1.6,
			BLUE,
			0.4
		);
		tube(
			g,
			[
				[0, 0],
				[240, 0]
			],
			1.6,
			BLUE,
			0.4
		);
		tube(
			g,
			[
				[0, -80],
				[80, -80]
			],
			1.1,
			BLUE,
			0.4
		);
		tube(
			g,
			[
				[40, -80],
				[cx(F.hall), cz(F.hall)]
			],
			1.1,
			BLUE,
			0.4
		);
		tube(
			g,
			[
				[F.tower.x, F.tower.z],
				[0, -500]
			],
			1.6,
			BLUE,
			0.4
		);
		node(g, F.tower.x, F.tower.z, 4, BLUE, 3);
		node(g, cx(F.hall), cz(F.hall), 3.2, BLUE);
		// 依頼主の建物への線：受付中の要望があると赤（脈打つ）、直してつないだら分野の色（15.4）
		const open = openAt();
		for (const k of CLIENT_KEYS) {
			const b = F[k];
			const f = linkedField(k);
			const col = open.get(k) ? RED : f ? HX(FIELD_COLOR[f]) : BLUE;
			tube(
				g,
				[
					[cx(b), 0],
					[cx(b), cz(b)]
				],
				1.1,
				col,
				0.4
			);
			node(g, cx(b), cz(b), open.get(k) ? 3.6 : 2.6, col, open.get(k) ? 2.4 : 1.6);
		}
		// 仕組みの建物と、つないだ依頼主の建物
		for (const x of ts.systems) {
			const sb = systemB(x.field);
			const col = HX(FIELD_COLOR[x.field]);
			node(g, cx(sb), cz(sb), 3, col, 2.2);
			for (const k of x.links) {
				const c = F[k];
				tube(
					g,
					[
						[cx(c), cz(c)],
						[cx(c), cz(sb)],
						[cx(sb), cz(sb)]
					],
					1.2,
					col,
					0.6
				);
			}
		}
		// 業者の箱：灰色の線で回線につながるだけ。分野の色を持たない
		for (const bx of ts.boxes) {
			const r = BOX_SPOT[bx.client];
			if (!r) continue;
			tube(
				g,
				[
					[cx(r), cz(r)],
					[cx(r), 0]
				],
				1.0,
				GRAY,
				0.4
			);
			node(g, cx(r), cz(r), 2.2, GRAY, 1.8);
		}
		E.setMesh('infra', g.out(), true);
	}
	buildInfra();
	function applyInfoColors() {
		const open = openAt();
		const rgb = (h: string) => HX(h).slice(0, 3);
		for (const b of allB()) {
			const rise = Math.round(E.getRise(b.id) * 255);
			if (S.view === 'happy') {
				const h = hp(b.id);
				const t = Math.max(0, Math.min(1, (h - 0.35) / 0.55));
				const c =
					t < 0.5 ? [1, 0.35 + t * 1.1, 0.25] : [1 - (t - 0.5) * 1.3, 0.9, 0.35 + (t - 0.5) * 0.3];
				E.setData(b.id, c[0] * 255, c[1] * 255, c[2] * 255, rise);
			} else if (S.view === 'infra') {
				let c = [0, 0, 0];
				if (b === F.hall || b.kind === 'tower') c = [0.4, 0.65, 1];
				const k = CLIENT_KEYS.find((x) => F[x] === b);
				if (k) {
					const f = linkedField(k);
					c = open.get(k) ? [1, 0.45, 0.35] : f ? rgb(FIELD_COLOR[f]) : [0.4, 0.65, 1];
				}
				const sf = 'field' in b && b.field ? b.field : sysFieldOf(b);
				if (sf) c = rgb(FIELD_COLOR[sf]);
				if (b.kind === 'box') c = [0.55, 0.58, 0.62];
				E.setData(b.id, c[0] * 255, c[1] * 255, c[2] * 255, rise);
			} else E.setData(b.id, 0, 0, 0, rise);
		}
	}
	/** 試作の街の隠れた建物のうち、仕組みの建物に使う物の分野 */
	function sysFieldOf(b: AnyB): string | null {
		for (const [f, k] of Object.entries(SYSTEM_FEAT)) if (k && F[k] === b) return f;
		return null;
	}

	// ---------------- constructions ----------------
	/** 足場を描く物：要望で建つ物（実時間）と、区画に建つ物（ゲーム内の時刻） */
	function scaffolds(): { b: AnyB; p: number }[] {
		const now = ts.minute + frac;
		const list: { b: AnyB; p: number }[] = constructions.slice();
		for (const p of ts.build.placed) {
			const t = (now - p.startedAt) / BUILD_MIN;
			if (t < 1) list.push({ b: builtOf(p), p: Math.max(0, t) });
		}
		return list;
	}
	const constructions: Construction[] = [];
	function construct(b: AnyB, dur?: number, onDone?: () => void) {
		E.setData(b.id, 0, 0, 0, 0);
		constructions.push({ b, p: 0, dur: dur || 3.2, onDone });
	}

	// ---------------- player buildings (zoning) ----------------
	// 状態（資金・出入り・区画・建てた物・道路）は src/lib/game/build.ts の純粋な関数で変える（段 8-2b）。
	// ここは状態を読んで描くだけ。建てた物の色と形は、状態の look から決める（見た目だけ）
	const builtCache = new Map<number, Built>();
	function builtOf(p: Placed): Built {
		const hit = builtCache.get(p.id);
		if (hit && hit.lot === ts.build.lots[p.lot]) return hit;
		const r = GEN.mulberry(p.look);
		const pk = <T>(a: readonly T[]): T => a[Math.floor(r() * a.length)];
		const L = ts.build.lots[p.lot];
		const b: Built = {
			id: p.id,
			kind: p.kind,
			name: p.kind === 'park' ? '小さな公園' : p.kind === 'house' ? '新しい住宅' : '新しい商店',
			x0: p.x0,
			z0: p.z0,
			x1: p.x1,
			z1: p.z1,
			h: p.h,
			residents: p.residents,
			jobs: p.jobs,
			floors: p.floors,
			player: true,
			lot: L
		};
		if (p.kind === 'park') {
			const trees: [number, number, Col][] = [];
			for (let k = 0; k < 4; k++)
				trees.push([
					L.x0 + 3 + r() * (L.x1 - L.x0 - 6),
					L.z0 + 3 + r() * (L.z1 - L.z0 - 6),
					pk(PAL.leafA.concat(PAL.leafG))
				]);
			b.trees = trees;
		} else {
			b.wall = jit(pk(PAL.wallHouse), 0.08, r);
			b.roof = p.kind === 'house' ? jit(pk(PAL.roofHouse), 0.15, r) : pk(PAL.awning);
			b.sign = pk(PAL.sign);
		}
		builtCache.set(p.id, b);
		return b;
	}
	const builtList = () => ts.build.placed.map(builtOf);
	// 仕組みの建物（試作の街に無い 8 分野）と業者の箱。状態の systems・boxes を読んで描くだけ
	const FIELD_ORDER = Object.keys(SYSTEM_SPOT);
	const extraCache = new Map<string, Built>();
	function spotB(
		key: string,
		id: number,
		r: Rect,
		kind: string,
		name: string,
		h: number,
		field?: string
	) {
		const k = key + ':' + h;
		let b = extraCache.get(k);
		if (!b) {
			const y0 = Math.max(
				Y,
				...[
					[r.x0, r.z0],
					[r.x1, r.z0],
					[r.x0, r.z1],
					[r.x1, r.z1]
				].map(([x, z]) => city.terrainH(x, z) + 0.05)
			);
			b = { id, kind, name, ...r, h, residents: 0, jobs: 0, player: false, field, lot: { y0 } };
			extraCache.set(k, b);
		}
		return b;
	}
	function systemB(field: string): AnyB {
		const fk = SYSTEM_FEAT[field];
		if (fk) return F[fk];
		return spotB(
			'sys-' + field,
			SYSTEM_ID + FIELD_ORDER.indexOf(field),
			SYSTEM_SPOT[field],
			'system',
			SYSTEM_NAMES[field],
			9,
			field
		);
	}
	function boxB(client: FeatKey, count: number): Built {
		return spotB(
			'box-' + client,
			BOX_ID + CLIENT_KEYS.indexOf(client),
			BOX_SPOT[client],
			'box',
			'業者の箱（中身は見えない）',
			2.6 * count
		);
	}
	function extraList(): Built[] {
		const out: Built[] = [];
		for (const x of ts.systems) if (!SYSTEM_FEAT[x.field]) out.push(systemB(x.field) as Built);
		for (const bx of ts.boxes) if (BOX_SPOT[bx.client]) out.push(boxB(bx.client, bx.count));
		return out;
	}
	/** 仕組みの建物が建っているか（試作の隠れた建物は、建つまで隠す） */
	function syncSystems() {
		for (const [f, k] of Object.entries(SYSTEM_FEAT)) {
			if (!k) continue;
			const has = ts.systems.some((x) => x.field === f);
			F[k].hidden = !has;
			if (!constructions.some((c) => c.b === F[k])) E.setData(F[k].id, 0, 0, 0, has ? 255 : 0);
		}
	}
	function rebuildBuilt() {
		const g = new Geo(1 << 14);
		// player roads and the lots they opened
		for (const rd of ts.build.roads) roadGeo(g, rd);
		for (const L of ts.build.lots)
			if (L.y0 !== undefined) {
				const y = L.y0;
				q(
					g,
					[L.x0 + 0.3, y, L.z0 + 0.3],
					[L.x0 + 0.3, y, L.z1 - 0.3],
					[L.x1 - 0.3, y, L.z1 - 0.3],
					[L.x1 - 0.3, y, L.z0 + 0.3],
					L.taken ? HX('#66854a') : HX('#9c8f6e'),
					0,
					0,
					0,
					[0, 1, 0]
				);
			}
		for (const L of ts.build.lots)
			if (L.zone && !L.taken) {
				const y = (L.y0 !== undefined ? L.y0 : city.Y) + 0.04;
				const c = L.zone === 'home' ? HX('#5fae6a') : HX('#5a8fd0');
				q(
					g,
					[L.x0 + 0.6, y, L.z0 + 0.6],
					[L.x0 + 0.6, y, L.z1 - 0.6],
					[L.x1 - 0.6, y, L.z1 - 0.6],
					[L.x1 - 0.6, y, L.z0 + 0.6],
					c,
					0,
					0,
					0,
					[0, 1, 0]
				);
				const sx = (L.x0 + L.x1) / 2,
					sz = L.z0 + 1.5;
				box(g, sx - 0.06, y, sz - 0.06, sx + 0.06, y + 1.6, sz + 0.06, HX('#8a6a48'));
				box(g, sx - 0.7, y + 1.0, sz - 0.04, sx + 0.7, y + 1.7, sz + 0.04, HX('#f4efe0'));
			}
		for (const b of builtList()) {
			const id = b.id;
			const Y = b.lot && b.lot.y0 !== undefined ? b.lot.y0 : city.Y;
			if (b.kind === 'house') {
				const w = b.x1 - b.x0,
					d = b.z1 - b.z0;
				const wall = b.wall as Col,
					roof = b.roof as Col;
				const floors = b.floors as number;
				const h = floors * 2.9 + 0.4;
				box(g, b.x0, Y, b.z0, b.x1, Y + h, b.z1, wall, { id, noTop: true, ao: 0.78 });
				box(g, b.x0 - 0.05, Y, b.z0 - 0.05, b.x1 + 0.05, Y + 0.45, b.z1 + 0.05, HX('#9b958a'), {
					id,
					ao: 0.9
				});
				gable(g, b.x0, b.z0, b.x1, b.z1, Y + h, 2.2, 0.55, w > d ? 'x' : 'z', roof, wall, id);
				for (const f of faces(b.x0, b.z0, b.x1, b.z1))
					windows(g, f, Y + 0.45, floors, 2.9, 2.6, 1.1, 1.25, 0.85, HX('#2a3a48'), id, 1.2);
			} else if (b.kind === 'shop') {
				const h = 3.6 + 3.2 + 0.5;
				box(g, b.x0, Y, b.z0, b.x1, Y + h, b.z1, b.wall as Col, {
					id,
					top: HX('#6c6d6b'),
					mt: 10,
					ao: 0.75
				});
				for (const f of faces(b.x0, b.z0, b.x1, b.z1)) {
					fquad(
						g,
						f,
						0.5,
						f.L - 0.5,
						Y + 0.3,
						Y + 3.0,
						0.06,
						HX('#3a5568'),
						1,
						id,
						((b.id * 7) % 997) + 0.5
					);
					const a0 = fp(f, 0.3, Y + 3.5, 0.05),
						a1 = fp(f, f.L - 0.3, Y + 3.5, 0.05),
						a2 = fp(f, f.L - 0.3, Y + 2.9, 1.6),
						a3 = fp(f, 0.3, Y + 2.9, 1.6);
					q(g, a0, a1, a2, a3, b.roof as Col, 0, id);
					fquad(g, f, 0.4, f.L - 0.4, Y + 3.6, Y + 4.4, 0.08, b.sign as Col, 8, id);
					windows(g, f, Y + 3.6, 1, 3.2, 2.6, 1.3, 1.5, 1.0, HX('#2a3a48'), id, 1.0);
				}
			} else if (b.kind === 'park') {
				q(
					g,
					[b.x0, Y + 0.03, b.z0],
					[b.x0, Y + 0.03, b.z1],
					[b.x1, Y + 0.03, b.z1],
					[b.x1, Y + 0.03, b.z0],
					HX('#6fa04a'),
					0,
					id,
					0,
					[0, 1, 0]
				);
				for (const [tx, tz, cc] of b.trees ?? []) {
					box(g, tx - 0.2, Y, tz - 0.2, tx + 0.2, Y + 2.6, tz + 0.2, HX('#5c4532'), { id });
					GEN.blob(g, tx, Y + 4.2, tz, 2.4, 2.2, 2.4, cc, R, 1, id);
				}
				rbox(
					g,
					(b.x0 + b.x1) / 2,
					(b.z0 + b.z1) / 2,
					0,
					-1.2,
					1.2,
					0.5,
					Y + 0.4,
					Y + 0.5,
					HX('#7a5a3e'),
					{ id }
				);
			}
		}
		for (const b of extraList()) {
			const id = b.id;
			const y = b.lot.y0 ?? Y;
			if (b.kind === 'box') {
				const n = Math.round(b.h / 2.6);
				for (let k = 0; k < n; k++) {
					const y0 = y + k * 2.6;
					box(g, b.x0 + 0.3, y0, b.z0 + 0.3, b.x1 - 0.3, y0 + 2.5, b.z1 - 0.3, HX('#8a9099'), {
						id,
						top: HX('#6f757d'),
						ao: 0.8
					});
				}
				continue;
			}
			// 仕組みの建物：2 階の箱に、分野の色の屋根と帯（色だけに頼らないよう、板と凡例に分野の名前を出す）
			const col = HX(FIELD_COLOR[b.field ?? 'net']);
			box(g, b.x0, y, b.z0, b.x1, y + 7.4, b.z1, HX('#e9e6df'), { id, top: col, ao: 0.72 });
			box(g, b.x0 - 0.05, y, b.z0 - 0.05, b.x1 + 0.05, y + 0.45, b.z1 + 0.05, HX('#9b958a'), {
				id,
				ao: 0.9
			});
			for (const f of faces(b.x0, b.z0, b.x1, b.z1)) {
				fquad(g, f, 0.4, f.L - 0.4, y + 5.6, y + 6.6, 0.06, mulc(col, 0.85), 1, id, 31.5);
				windows(g, f, y + 0.6, 2, 2.6, 2.4, 1.0, 1.2, 0.8, HX('#2a3a48'), id, 1.2);
			}
			const mx = (b.x0 + b.x1) / 2,
				mz = (b.z0 + b.z1) / 2;
			box(g, mx - 0.12, y + 7.4, mz - 0.12, mx + 0.12, y + 10.5, mz + 0.12, HX('#cfd3d8'), { id });
			box(g, mx - 0.5, y + 10.2, mz - 0.5, mx + 0.5, y + 10.8, mz + 0.5, col, { id });
		}
		E.setMesh('built', g.out(), true);
	}
	function lotMarkers() {
		const g = new Geo(4096);
		const col =
			S.tool === 'home' ? HX('#56d68a') : S.tool === 'shop' ? HX('#4aa3ff') : HX('#e7d36b');
		for (const L of ts.build.lots) {
			if (L.taken || (L.zone && S.tool !== 'park')) continue;
			const p = 0.6;
			const Y = L.y0 !== undefined ? L.y0 : city.Y;
			for (let gx = L.x0 + p + 2; gx < L.x1 - p - 1; gx += 3)
				for (let gz = L.z0 + p + 2; gz < L.z1 - p - 1; gz += 3)
					q(
						g,
						[gx - 0.18, Y + 0.06, gz - 0.18],
						[gx - 0.18, Y + 0.06, gz + 0.18],
						[gx + 0.18, Y + 0.06, gz + 0.18],
						[gx + 0.18, Y + 0.06, gz - 0.18],
						mulc(col, 0.8),
						6,
						0,
						0,
						[0, 1, 0]
					);
			for (const [a0, c0, a1, c1] of [
				[L.x0 + p, L.z0 + p, L.x1 - p, L.z0 + p + 0.4],
				[L.x0 + p, L.z1 - p - 0.4, L.x1 - p, L.z1 - p],
				[L.x0 + p, L.z0 + p, L.x0 + p + 0.4, L.z1 - p],
				[L.x1 - p - 0.4, L.z0 + p, L.x1 - p, L.z1 - p]
			])
				q(
					g,
					[a0, Y + 0.08, c0],
					[a0, Y + 0.08, c1],
					[a1, Y + 0.08, c1],
					[a1, Y + 0.08, c0],
					col,
					6,
					0,
					0,
					[0, 1, 0]
				);
		}
		E.setMesh('lots', g.out(), true);
	}
	// ---------------- roads (player) ----------------
	const RW = 11;
	const TH = city.terrainH;
	function roadY(x: number, z: number) {
		return Math.max(TH(x, z), TH(x + 4, z), TH(x - 4, z), TH(x, z + 4), TH(x, z - 4), 0) + 0.14;
	}
	function roadGeo(g: InstanceType<typeof Geo>, rd: { a: Pt; b: Pt; L: number }, col?: Col) {
		const { a, b, L } = rd;
		const ux = (b.x - a.x) / L,
			uz = (b.z - a.z) / L,
			px = -uz,
			pz = ux;
		const n = Math.ceil(L / 10);
		for (let i = 0; i < n; i++) {
			const t0 = (i / n) * L,
				t1 = ((i + 1) / n) * L;
			const x0 = a.x + ux * t0,
				z0 = a.z + uz * t0,
				x1 = a.x + ux * t1,
				z1 = a.z + uz * t1;
			const y0 = roadY(x0, z0),
				y1 = roadY(x1, z1);
			for (const [o0, o1, c, dy] of [
				[-RW / 2 - 2, -RW / 2, HX('#b9b5ab'), 0.12],
				[RW / 2, RW / 2 + 2, HX('#b9b5ab'), 0.12],
				[-RW / 2, RW / 2, col || HX('#4a4e54'), 0]
			] as [number, number, Col, number][])
				q(
					g,
					[x0 + px * o0, y0 + dy, z0 + pz * o0],
					[x0 + px * o1, y0 + dy, z0 + pz * o1],
					[x1 + px * o1, y1 + dy, z1 + pz * o1],
					[x1 + px * o0, y1 + dy, z1 + pz * o0],
					c,
					col ? 6 : 0,
					0,
					0,
					[0, 1, 0]
				);
			if (!col && i % 2 === 0) {
				const mx0 = x0 + ux * 2,
					mz0 = z0 + uz * 2,
					mx1 = x0 + ux * 6,
					mz1 = z0 + uz * 6;
				q(
					g,
					[mx0 - px * 0.12, y0 + 0.02, mz0 - pz * 0.12],
					[mx0 + px * 0.12, y0 + 0.02, mz0 + pz * 0.12],
					[mx1 + px * 0.12, y1 + 0.02, mz1 + pz * 0.12],
					[mx1 - px * 0.12, y1 + 0.02, mz1 - pz * 0.12],
					HX('#ece8dc'),
					0,
					0,
					0,
					[0, 1, 0]
				);
			}
		}
		if (!col)
			for (let t = 12; t < L - 6; t += 30) {
				const x = a.x + ux * t + px * (RW / 2 + 1),
					z = a.z + uz * t + pz * (RW / 2 + 1),
					y = roadY(x, z);
				box(g, x - 0.09, y, z - 0.09, x + 0.09, y + 6.2, z + 0.09, HX('#5d6166'), { ao: 0.9 });
				box(
					g,
					x - px * 1.4 - 0.35,
					y + 5.75,
					z - pz * 1.4 - 0.35,
					x - px * 1.4 + 0.35,
					y + 6.0,
					z - pz * 1.4 + 0.35,
					HX('#e8e2c8'),
					{ m: 3, ao: 1 }
				);
			}
	}
	/** 交通（見た目だけ）の交差点。道の端の点に当たる物を探し、無ければ足す */
	function trafficNode(x: number, z: number): RNode {
		const f = NODES.find((n) => n.x === x && n.z === z);
		if (f) return f;
		const n: RNode = { x, z, nb: [], w: RW };
		NODES.push(n);
		return n;
	}
	function addRoad(plan: RoadPlan) {
		const r = act({ type: 'road', a: plan.a, b: plan.b });
		if (!r.ok) {
			toast('ここには引けない', r.why, 'warn');
			return;
		}
		roadTraffic(plan.a, plan.b, plan.L);
		rebuildBuilt();
		lotMarkers();
		mesh('lots').visible = true;
		toast(
			'道路を引いた',
			Math.round(plan.L) +
				' m ・ ¥' +
				plan.cost +
				' ・ 沿いに空き区画が ' +
				(r.opened ?? 0) +
				' つできた。住宅地や商業地を建てられる',
			''
		);
		sfxNote();
	}
	/** 引いた道に車を 4 台入れる（見た目だけ。15.6） */
	function roadTraffic(a: Pt, b: Pt, len: number) {
		const na = trafficNode(a.x, a.z),
			nb2 = trafficNode(b.x, b.z);
		na.nb.push(nb2);
		nb2.nb.push(na);
		for (let k = 0; k < 4; k++) {
			const car: Car = {
				a: na,
				b: nb2,
				c: null,
				t: (k * len) / 5,
				phase: 'seg',
				type: 'car',
				col: pick(PAL.car),
				sp: 9 + R() * 4,
				x: 0,
				z: 0,
				h: 0,
				seg: segFor({ a: na, b: nb2 }),
				tt: 0,
				turn: null,
				lead: null
			};
			car.t = Math.min(car.t, car.seg.L - 1);
			chooseNext(car);
			cars.push(car);
		}
	}
	function previewRoad(plan: RoadPlan | null) {
		const g = new Geo(2048);
		if (plan) roadGeo(g, plan, plan.ok ? HX('#56d68a') : HX('#ff6a45'));
		if (S.roadStart) {
			const x = S.roadStart.x,
				z = S.roadStart.z,
				y = roadY(x, z) + 0.3;
			GEN.cyl(g, x, z, y, y + 0.4, 3, 16, HX('#ffc35a'), { m: 6 });
		}
		E.setMesh('preview', g.out(), true);
	}
	let lastPlanKey = '';
	const snapPoint = (g: readonly number[]) => snapPointOf(ts.build, MAP, g);
	const roadPlan = (a: SnapPt, p: Pt) => roadPlanOf(ts.build, MAP, a, p);
	function placeOnLot(i: number) {
		const tool = S.tool === 'park' ? 'park' : S.tool === 'shop' ? 'shop' : 'home';
		const L = ts.build.lots[i];
		const r = act(
			tool === 'park' ? { type: 'park', lot: i } : { type: 'zone', lot: i, kind: tool }
		);
		if (!r.ok) {
			toast(L.zone && tool !== 'park' ? '指定済みの区画' : '資金が足りない', r.why, 'warn');
			return;
		}
		if (tool !== 'park')
			floater(L.cx, 4 + (L.y0 || Y), L.cz, tool === 'home' ? '住宅地' : '商業地', 'good');
		rebuildBuilt();
		lotMarkers();
		sfxNote();
	}
	function bulldozeB(b: AnyB) {
		const r = act({ type: 'bulldoze', id: b.id });
		if (!r.ok) {
			toast('取り壊せない', r.why, 'warn');
			return;
		}
		builtCache.delete(b.id);
		rebuildBuilt();
		lotMarkers();
		select(null);
	}
	/** 建ち始めた・建ち終えた物（ゲーム内の時刻で進む。描画は状態の分から建つ途中の絵を描く） */
	const doneIds = new Set<number>();
	function placedProgress() {
		const now = ts.minute + frac;
		for (const p of ts.build.placed) {
			const t = Math.max(0, Math.min(1, (now - p.startedAt) / BUILD_MIN));
			const e = t < 0.25 ? 0 : (t - 0.25) / 0.75;
			E.setData(p.id, 0, 0, 0, Math.round(255 * (1 - Math.pow(1 - e, 3))));
			if (t >= 1 && !doneIds.has(p.id)) {
				doneIds.add(p.id);
				const b = builtOf(p);
				floater(
					cx(b),
					b.h + 2,
					cz(b),
					p.kind === 'park'
						? '満足度 ↑'
						: p.kind === 'house'
							? '+' + p.residents + ' 人'
							: '+6 仕事',
					'good'
				);
				applyInfoColors();
			}
		}
	}
	// ---------------- requests ----------------
	/** 1 日の始まり（8:00）の数。17:00 の日報に使う */
	let dayStart = { clientSat: ts.desk.clientSat, money: ts.build.money, done: 0 };
	const doneCount = () => ts.desk.requests.filter((r) => r.status !== 'open').length;
	/** 状態の知らせ（tickTown・applyTown の結果）を、知らせ・印・絵に映す */
	function onEvents(evs: TownEvent[]) {
		let reqs = false,
			built = false,
			infra = false;
		for (const e of evs) {
			if (e.type === 'grown') built = true;
			else if (e.type === 'hour' && e.hour === MORNING / 60) {
				dayStart = { clientSat: ts.desk.clientSat, money: ts.build.money, done: doneCount() };
			} else if (e.type === 'hour' && e.hour === 17) dayReport(e.at);
			else if (e.type === 'day') reqs = true;
			else if (e.type === 'rank') {
				toast('町の格が上がった', `「${RANK_NAMES[e.rank]}」になった ・ 報酬 ¥300`, 'learn');
				sfxNote();
			} else if (e.type === 'chapter') {
				toast(
					e.chapter === 'free'
						? `自由の章（${e.freeRound} 回目）が始まった`
						: `第 ${e.chapter} 章が始まった`,
					'依頼主の満足度は 50 から。街はそのまま続く',
					'learn'
				);
				reqs = true;
			} else if (e.type === 'box') {
				const r = BOX_SPOT[e.client];
				if (r) floater(cx(r), Y + 8, cz(r), '業者の箱', '');
				built = infra = true;
			} else if (e.type === 'system') built = infra = true;
			else if (e.type === 'link') infra = true;
			else if (e.type === 'desk') {
				reqs = infra = true;
				const arrive = e.changes.filter((c) => c.what === 'arrive');
				if (arrive.length) {
					toast(`要望が ${arrive.length} 件届いた`, arrive.map((c) => c.why).join(' ／ '), 'req');
					sfxNote();
				}
				for (const c of e.changes)
					if (c.what === 'expire') toast('期限を過ぎた', c.why + ' ・ 依頼主の満足度 −5', 'warn');
				if (e.from === 'close') onClose(e.changes);
			}
		}
		if (built) {
			rebuildBuilt();
			lotMarkers();
			sfxNote();
		}
		if (infra) {
			syncSystems();
			buildInfra();
		}
		if (reqs || infra) {
			renderReqs();
			applyInfoColors();
		}
		if (evs.length) renderHUD();
	}
	/** 17:00 の日報：その日に動いた数と理由（15.2） */
	function dayReport(at: number) {
		const d = ts.desk.clientSat - dayStart.clientSat;
		const m = ts.build.money - dayStart.money;
		toast(
			`日報 ・ ${Math.floor((at - ts.chapterStart) / MIN_PER_DAY) + 1} 日目の締め`,
			`依頼主の満足度 ${dayStart.clientSat} → ${ts.desk.clientSat}（${d >= 0 ? '+' : ''}${d}） ・ 資金 ${m >= 0 ? '+' : '−'}${Math.abs(m)} ・ 片付いた要望 ${doneCount() - dayStart.done} 件`,
			''
		);
	}
	/** 章の締めの結果（合格・失敗）の板（15.7） */
	function onClose(changes: Change[]) {
		const c = changes.find((x) => x.what === 'status');
		if (!c || c.what !== 'status') return;
		const passed = ts.desk.result === 'passed';
		const days: { label: string; minute: number }[] = [];
		for (let d = 1; d <= Math.min(DAYS_PER_CHAPTER, chapterDay(ts)); d++)
			days.push({
				label: d === 1 ? '章の初め（1 日目の朝）から' : `${d} 日目の朝から`,
				minute: ts.chapterStart + (d - 1) * MIN_PER_DAY
			});
		ui.dialog = {
			kind: 'result',
			passed,
			title: passed ? `章の合格 ・ 評価「${ts.desk.grade}」` : 'この章は失敗',
			body: c.why + (passed ? '。明日の朝 8:00 から次の章が始まる' : '。時計は止まった'),
			days: passed ? [] : days
		};
		S.prevSpeed = passed ? S.speed || 1 : 0;
		setSpeed(0);
	}
	/** 手の記録を、その時点の前で切って作り直す（巻き戻し。15.7・段 4 の 12 章） */
	function restartAt(minute: number) {
		const cut: TownSave = {
			version: 1,
			seed: SEED,
			now: minute,
			actions: log.filter((a) => a.at < minute)
		};
		try {
			localStorage.setItem(TOWN_KEY, JSON.stringify(cut));
		} catch {
			/* 置けなくても作り直す */
		}
		// 道と車も記録から作り直すため、読み込み直す
		location.reload();
	}

	/** 手を 1 つ当てる（状態は town.ts だけが変える）。打てた手だけを記録に残す */
	function act(a: TownAction) {
		const at = ts.minute;
		const r = applyTown(ts, a, MAP, learned());
		if (r.ok) {
			ts = r.state;
			log.push({ at, action: a });
			onEvents(r.events);
			renderHUD();
			persist();
			if (ui.pick && !(S.tool === 'road' && S.roadStart)) refreshPick();
		}
		return r;
	}
	// ---------------- UI ----------------
	function setSpeed(v: number) {
		S.speed = v;
		ui.speed = v;
	}
	const HINTS: Record<string, string> = {
		select: '',
		road: '街の端の交差点（または引いた道の端）を押し、伸ばしたい先を押す。東の畑の方へ引ける ・ ¥2/m ・ 右クリックでやめる',
		home: '空き区画を押すと住宅地に指定する（¥20）。住の需要があると、家が少しずつ建っていく',
		shop: '空き区画を押すと商業地に指定する（¥20）。商の需要があると、店が少しずつ建っていく',
		park: '光っている空き地を押すと公園ができる（¥80）。60 m 以内の建物の満足度 +6',
		bulldoze: '自分で建てた建物を押すと取り壊す（資金は戻らない）'
	};
	// ---------------- キーボードだけで道具を使う（screen-design.md 10.6） ----------------
	/** 町の真ん中から見た向きと距離（区画と道の始まりの名前） */
	function placeName(x: number, z: number) {
		const dirs = ['東', '南東', '南', '南西', '西', '北西', '北', '北東'];
		const a = Math.round(Math.atan2(z, x) / (Math.PI / 4));
		return `町の${dirs[(a + 8) % 8]} ${Math.round(Math.hypot(x, z) / 10) * 10} m`;
	}
	let pickKeys: number[] = [];
	let roadStarts: SnapPt[] = [];
	const kRoad = { dir: 0, len: 100 };
	const DIRS = [
		[1, 0],
		[0, 1],
		[-1, 0],
		[0, -1]
	];
	/** 道を引き始められる点：街の端の交差点と引いた道の端のうち、どれかの向きに 100 m 引ける物 */
	function findRoadStarts(): SnapPt[] {
		const pts: SnapPt[] = [];
		const cands = [
			...MAP.nodes.filter((n) => Math.abs(n.x) >= 230 || Math.abs(n.z) >= 190),
			...ts.build.roads.flatMap((r) => [r.a, r.b])
		];
		for (const n of cands) {
			const a: SnapPt = { x: n.x, z: n.z, node: true };
			if (pts.some((p) => p.x === a.x && p.z === a.z)) continue;
			if (DIRS.some(([dx, dz]) => roadPlan(a, { x: a.x + dx * 100, z: a.z + dz * 100 }).ok))
				pts.push(a);
		}
		return pts;
	}
	function refreshPick() {
		if (['home', 'shop', 'park'].includes(S.tool)) {
			pickKeys = [];
			const items: string[] = [];
			ts.build.lots.forEach((L, i) => {
				if (L.taken || (L.zone && S.tool !== 'park')) return;
				pickKeys.push(i);
				items.push(`区画 ${i + 1} ・ ${placeName(L.cx, L.cz)}`);
			});
			const sel = ui.pick ? Math.min(ui.pick.sel, Math.max(0, items.length - 1)) : 0;
			ui.pick = {
				title: items.length
					? '使える空き区画（↑↓ で選び Enter）'
					: '使える空き区画が無い。道路を引くと増える',
				items,
				sel,
				plan: ''
			};
		} else if (S.tool === 'road') {
			if (S.roadStart) {
				const [dx, dz] = DIRS[kRoad.dir];
				const plan = roadPlan(S.roadStart, {
					x: S.roadStart.x + dx * kRoad.len,
					z: S.roadStart.z + dz * kRoad.len
				});
				previewRoad(plan);
				ui.pick = {
					title: '矢印で向き、[ ] で長さを 10 m ずつ、Enter で引く',
					items: [],
					sel: 0,
					plan: plan.ok
						? `${['東', '南', '西', '北'][kRoad.dir]}へ ${Math.round(plan.L)} m ・ ¥${plan.cost}`
						: `${['東', '南', '西', '北'][kRoad.dir]}へ ${kRoad.len} m ・ 引けない：${plan.why}`
				};
			} else {
				roadStarts = findRoadStarts();
				ui.pick = {
					title: '道を引き始められる点（↑↓ で選び Enter）',
					items: roadStarts.map((p) => `交差点 ・ ${placeName(p.x, p.z)}`),
					sel: ui.pick ? Math.min(ui.pick.sel, Math.max(0, roadStarts.length - 1)) : 0,
					plan: ''
				};
			}
		} else ui.pick = null;
	}
	function pickFocus() {
		const pk = ui.pick;
		if (!pk || !pk.items.length) return;
		if (S.tool === 'road') {
			const p = roadStarts[pk.sel];
			if (p) flyTo(p.x, p.z, 220, 0.85);
		} else {
			const L = ts.build.lots[pickKeys[pk.sel]];
			if (L) flyTo(L.cx, L.cz, 120, 0.75);
		}
	}
	/** 一覧と道路の向きを、キーで動かす。扱ったら true */
	function pickKey(key: string): boolean {
		const pk = ui.pick;
		if (!pk) return false;
		if (S.tool === 'road' && S.roadStart) {
			const d = { ArrowRight: 0, ArrowDown: 1, ArrowLeft: 2, ArrowUp: 3 }[key];
			if (d !== undefined) kRoad.dir = d;
			else if (key === '[') kRoad.len = Math.max(20, kRoad.len - 10);
			else if (key === ']') kRoad.len = Math.min(400, kRoad.len + 10);
			else if (key === 'Enter') {
				const [dx, dz] = DIRS[kRoad.dir];
				const plan = roadPlan(S.roadStart, {
					x: S.roadStart.x + dx * kRoad.len,
					z: S.roadStart.z + dz * kRoad.len
				});
				if (!plan.ok) toast('ここには引けない', plan.why, 'warn');
				else {
					addRoad(plan);
					S.roadStart = { x: plan.b.x, z: plan.b.z, node: true };
				}
			} else return false;
			refreshPick();
			return true;
		}
		if (!pk.items.length) return false;
		if (key === 'ArrowDown' || key === 'ArrowUp') {
			pk.sel = (pk.sel + (key === 'ArrowDown' ? 1 : pk.items.length - 1)) % pk.items.length;
			ui.pick = { ...pk };
			pickFocus();
			return true;
		}
		if (key === 'Enter') {
			if (S.tool === 'road') {
				S.roadStart = roadStarts[pk.sel] ?? null;
				kRoad.dir = 0;
				kRoad.len = 100;
				if (S.roadStart) {
					const st = S.roadStart;
					kRoad.dir = Math.max(
						0,
						DIRS.findIndex(
							([dx, dz]) => roadPlan(st, { x: st.x + dx * 100, z: st.z + dz * 100 }).ok
						)
					);
				}
			} else placeOnLot(pickKeys[pk.sel]);
			refreshPick();
			return true;
		}
		return false;
	}
	function setTool(t: string) {
		S.tool = S.tool === t && t !== 'select' ? 'select' : t;
		ui.tool = S.tool;
		ui.hint = HINTS[S.tool];
		ui.pick = null;
		const lots = eng.meshes.lots;
		if (lots) lots.visible = ['home', 'shop', 'park', 'road'].includes(S.tool);
		S.roadStart = null;
		previewRoad(null);
		lastPlanKey = '';
		if (S.tool === 'road') {
			mesh('lots').visible = true;
			lotMarkers();
		}
		if (['home', 'shop', 'park'].includes(S.tool)) {
			lotMarkers();
			mesh('lots').visible = true;
		}
		// 道具を替えてもカメラは動かさない（D-19、city-standard.md V-14）
		refreshPick();
		// 一覧に焦点を移す（↑↓ と Enter をそのまま使えるように）
		if (ui.pick) later(() => document.querySelector<HTMLElement>('.pick')?.focus(), 0);
	}
	function setView(v: string) {
		S.view = v;
		S.infraTarget = v === 'ground' ? 0 : 1;
		ui.view = v;
		mesh('infra').visible = v === 'infra';
		applyInfoColors();
	}
	function renderHUD() {
		const h = Math.floor(S.minute / 60) % 24,
			m = Math.floor(S.minute % 60);
		ui.clock = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
		ui.date = clockOf(ts.minute).date;
		ui.pop = pop();
		ui.money = ts.build.money;
		ui.income = income();
		ui.sat = Math.round(avgHappy());
		ui.demand = demand();
		const day = Math.max(1, chapterDay(ts));
		const c = ts.desk.chapter;
		ui.chapter = c === 'free' ? `自由の章 ${ts.desk.freeRound}` : `第 ${c} 章`;
		ui.day = day;
		ui.slots = slotsLeft(ts.minute);
		const p = ui.pop;
		ui.goals = {
			clientSat: ts.desk.clientSat,
			daysLeft: Math.max(0, DAYS_PER_CHAPTER - day),
			rankNext: ts.rank < RANKS.length ? RANKS[ts.rank] - p : null,
			rankName: RANK_NAMES[ts.rank]
		};
		if (ui.budgetOpen) renderBudget();
	}
	const demand = () => demandOf(ts, MAP);
	const incomeParts = () => incomePartsOf(ts, MAP);
	const income = () => incomeOf(ts, MAP);
	function renderBudget() {
		ui.budget = { parts: incomeParts(), income: income(), ledger: ts.build.ledger.slice() };
	}
	function toggleBudget() {
		ui.budgetOpen = !ui.budgetOpen;
		if (ui.budgetOpen) renderBudget();
	}
	const lookOf = (who: string) => CLIENT_LOOK[who] ?? { icon: '!', color: '#ff9d4d' };
	const openReqs = () =>
		ts.desk.requests
			.filter((r) => r.status === 'open')
			.sort((a, b) => a.due - b.due || (a.id < b.id ? -1 : 1));
	const HOW: Record<string, string> = {
		learned: '学んだ手で直した',
		grope: '手探りで直した',
		temp: '再起動でしのいだ（2 日後に再び届く）',
		out: '外に頼んだ'
	};
	function renderReqs() {
		const day = chapterDay(ts);
		ui.reqs = openReqs().map((r) => {
			const c = CLIENTS[r.group];
			const lk = lookOf(c.who);
			return {
				id: r.id,
				icon: lk.icon,
				color: lk.color,
				title: groupOf(r.group).symptom,
				who: c.who,
				left: r.due - day,
				doubt: r.doubt
			};
		});
		ui.done = ts.desk.requests
			.filter((r) => r.status !== 'open')
			.slice(-6)
			.reverse()
			.map((r) => ({
				id: r.id,
				title: groupOf(r.group).symptom,
				how:
					r.status === 'expired'
						? '期限を過ぎた'
						: r.status === 'outsourced'
							? '外に頼んだ（明日の朝に片付く）'
							: HOW[r.how ?? 'out']
			}));
		ui.systems = ts.systems.map((x) => ({
			field: x.field,
			name: SYSTEM_NAMES[x.field],
			fieldName: fieldName(x.field),
			color: FIELD_COLOR[x.field],
			links: x.links.length
		}));
		renderMarkers();
	}
	/** 印は依頼主の建物ごとに 1 つ。2 件以上あるときは件数を添える（15.3） */
	const markerEls = new Map<FeatKey, HTMLElement>();
	function renderMarkers() {
		const open = openAt();
		for (const [k, el] of markerEls)
			if (!open.get(k)) {
				el.remove();
				markerEls.delete(k);
			}
		for (const [k, n] of open) {
			const first = openReqs().find((r) => CLIENTS[r.group].at === k);
			if (!first) continue;
			const who = CLIENTS[first.group].who;
			let el = markerEls.get(k);
			if (!el) {
				const btn = document.createElement('button');
				btn.type = 'button';
				el = btn;
				el.className = 'marker';
				const pin = document.createElement('span');
				pin.className = 'pin';
				const bang = document.createElement('b');
				pin.appendChild(bang);
				const lbl = document.createElement('span');
				lbl.className = 'lbl';
				el.appendChild(pin);
				el.appendChild(lbl);
				el.addEventListener('click', (e) => {
					e.stopPropagation();
					const r = openReqs().find((x) => CLIENTS[x.group].at === k);
					if (r) openReq(r.id);
				});
				layers.markers.appendChild(el);
				markerEls.set(k, el);
			}
			el.style.setProperty('--c', lookOf(who).color);
			(el.querySelector('.pin b') as HTMLElement).textContent = n > 1 ? '!' + n : '!';
			(el.querySelector('.lbl') as HTMLElement).textContent = who;
			el.setAttribute('aria-label', `${who}の要望を開く（${n} 件）`);
		}
	}
	let toastSeq = 0;
	const timers = new Set<ReturnType<typeof setTimeout>>();
	const later = (fn: () => void, ms: number) => {
		const t = setTimeout(() => {
			timers.delete(t);
			fn();
		}, ms);
		timers.add(t);
	};
	function toast(
		title: string,
		body: string,
		kind: ToastKind,
		actions?: [string, () => void, string][]
	) {
		const id = ++toastSeq;
		ui.toasts = [
			{
				id,
				title,
				body,
				kind,
				actions: (actions ?? []).map(([label, run, cls]) => ({ label, run, pri: cls === 'pri' })),
				out: false
			},
			...ui.toasts
		];
		later(
			() => (ui.toasts = ui.toasts.map((t) => (t.id === id ? { ...t, out: true } : t))),
			actions ? 14000 : 5200
		);
		later(() => (ui.toasts = ui.toasts.filter((t) => t.id !== id)), actions ? 14600 : 5800);
	}
	const floats: Floater[] = [];
	function floater(x: number, y: number, z: number, text: string, kind: string) {
		const el = document.createElement('div');
		el.className = 'floater ' + (kind || '');
		el.textContent = text;
		layers.floaters.appendChild(el);
		floats.push({ x, y, z, el, t: 0 });
	}

	// ---------------- 要望の板（screen-design.md 10.4） ----------------
	let moveList: DeskAction[] = [];
	let lastLines: string[] = [];
	function openReq(id: string, keepLines = false) {
		const r = ts.desk.requests.find((x) => x.id === id);
		if (!r) return;
		const c = CLIENTS[r.group];
		const g = groupOf(r.group);
		const b = F[c.at];
		if (!ui.dialog || ui.dialog.kind !== 'req' || ui.dialog.id !== id) {
			flyTo(cx(b), cz(b), 110, 0.55);
			if (!keepLines) lastLines = [];
		}
		const L = learned();
		const opts = movesFor(ts.desk, id, L, deskCtx(ts));
		// 学んだ手は、打てる物を先に、学んでいない物はまとめて「効くレッスン」に出す
		const shown = opts.filter((o) => o.kind === 'any' || !o.lesson || L.has(o.lesson));
		moveList = shown.map((o) => o.action);
		const lk = lookOf(c.who);
		ui.dialog = {
			kind: 'req',
			id,
			icon: lk.icon,
			color: lk.color,
			who: c.who,
			place: b.name,
			title: g.symptom,
			left: Math.max(0, r.due - chapterDay(ts)),
			doubt: r.doubt,
			slots: slotsLeft(ts.minute),
			cands: r.candidates.map((x) => ({
				id: x,
				label: causeLabel(x),
				state: r.confirmed && x === r.truth ? 'ok' : r.ruledOut.includes(x) ? 'out' : 'live'
			})),
			moves: shown.map((o, key) => ({
				key,
				kind: o.kind,
				label: o.label,
				slots: o.slots,
				ok: o.ok,
				why: o.why,
				lesson: o.lesson,
				lessonTitle: o.lessonTitle
			})),
			evidence: r.evidence,
			notes: r.notes.slice(),
			last: lastLines,
			reward: reward(g),
			cost: outCost(g),
			clientSat: ts.desk.clientSat,
			lessons: lessonsFor(r).map((x) => ({ ...x, learned: L.has(x.lesson) }))
		};
		if (S.speed) S.prevSpeed = S.speed;
		setSpeed(0);
	}
	function closeDlg() {
		ui.dialog = null;
		setSpeed(S.prevSpeed || 1);
	}
	/** 板の手を打つ。片付いたら板を閉じ、街の変化を見せる（G-5） */
	function doMove(key: number) {
		const a = moveList[key];
		const d = ui.dialog;
		if (!a || !d || d.kind !== 'req') return;
		const before: Req | undefined = ts.desk.requests.find((x) => x.id === a.request);
		const sys0 = new Set(ts.systems.map((x) => x.field));
		const r = act(a);
		if (!r.ok) {
			toast('打てない', r.why, 'warn');
			return;
		}
		const ev = r.events.filter((e) => e.type === 'desk' && e.from === 'move');
		lastLines = ev.flatMap((e) => (e.type === 'desk' ? e.changes.map((c) => c.why) : []));
		const after = ts.desk.requests.find((x) => x.id === a.request);
		sfxNote();
		if (!before || !after || after.status === 'open') {
			openReq(a.request, true);
			return;
		}
		ui.dialog = null;
		const built = ts.systems.find((x) => !sys0.has(x.field));
		showChange(after, built?.field ?? null, lastLines);
	}
	/** 応えた結果を見せる：カメラが動き、仕組みの建物が建ち、周りに満足の印（G-5） */
	let lastChange: { req: Req; field: string | null } | null = null;
	function showChange(r: Req, field: string | null, lines: string[]) {
		lastChange = { req: r, field };
		const t = F[CLIENTS[r.group].at];
		const up = lines.some((l) => l.startsWith('依頼主の満足度 +'));
		const cheer = () => {
			let n = 0;
			for (const b of city.B) {
				if (n >= 7 || b.hidden || b.kind === 'board') continue;
				if (Math.hypot(cx(b) - cx(t), cz(b) - cz(t)) < 100) {
					floater(cx(b), b.h + 3 + (b.y0 || 0), cz(b), up ? '満足 ↑' : '…', up ? 'good' : '');
					n++;
				}
			}
		};
		if (field) {
			const sb = systemB(field);
			flyTo(cx(sb), cz(sb), 120, 1.05);
			construct(sb, 3.4, cheer);
		} else {
			flyTo(cx(t), cz(t), 110, 0.55);
			later(cheer, 1200);
		}
		setSpeed(S.prevSpeed || 1);
		toast(
			r.status === 'outsourced' ? '外に頼んだ' : '要望に応えた',
			lines.join(' ／ '),
			r.how === 'learned' ? 'learn' : '',
			[
				['↻ 変化をもう一度', replayChange, ''],
				['地下の仕組みで見る', () => setView('infra'), 'pri']
			]
		);
	}
	/** 最後の変化をもう一度（描画だけ。状態は変えない。15.4） */
	function replayChange() {
		if (!lastChange) return;
		setView('ground');
		const { req, field } = lastChange;
		const t = F[CLIENTS[req.group].at];
		if (field) {
			const sb = systemB(field);
			flyTo(cx(sb), cz(sb), 120, 1.05);
			construct(sb, 3.4, () => {
				for (const b of city.B)
					if (Math.hypot(cx(b) - cx(t), cz(b) - cz(t)) < 100 && !b.hidden && b.kind !== 'board')
						floater(cx(b), b.h + 3, cz(b), '満足 ↑', 'good');
			});
		} else {
			flyTo(cx(t), cz(t), 120, 0.55);
			later(() => setView('infra'), 900);
		}
	}
	/** 明日の朝 8:00 まで送る（記録には入らない。15.2） */
	function nextMorning() {
		const d = Math.floor(ts.minute / MIN_PER_DAY) * MIN_PER_DAY + MORNING;
		const to = d > ts.minute ? d : d + MIN_PER_DAY;
		const t = tickTown(ts, to, MAP);
		ts = t.state;
		frac = 0;
		onEvents(t.events);
		persist();
	}

	// building info
	function select(b: AnyB | null) {
		S.sel = b;
		if (!b) {
			ui.info = null;
			return;
		}
		const h = Math.round(hp(b.id) * 100);
		const voices: Record<string, string[]> = {
			house: ['静かで住みやすい', 'もう少しお店が近いといい', '夜の街灯がうれしい'],
			apt: ['駅まで歩けたらいいのに', 'ベランダから港が見える'],
			office: ['昼の通信が遅いときがある', '人手が足りない'],
			shop: ['帳面の管理が大変', '週末は人が多い'],
			school: ['昼休みの無線が混む'],
			hall: ['掲示板の書き換えが心配'],
			warehouse: ['荷が増えてきた']
		};
		const v = voices[b.kind] ? voices[b.kind][b.id % voices[b.kind].length] : '';
		ui.info = {
			name: b.name,
			residents: b.residents || 0,
			jobs: b.jobs || 0,
			happy: h,
			voice: v,
			player: 'player' in b
		};
	}

	// ---------------- input ----------------
	let drag: Drag | null = null;
	const keys = new Set<string>();
	const on = <K extends keyof HTMLElementEventMap>(
		el: HTMLElement | Window,
		k: K,
		fn: (e: HTMLElementEventMap[K]) => void,
		opt?: AddEventListenerOptions
	) => {
		el.addEventListener(k, fn as EventListener, opt);
		offs.push(() => el.removeEventListener(k, fn as EventListener, opt));
	};
	const offs: (() => void)[] = [];
	on(canvas, 'contextmenu', (e) => e.preventDefault());
	on(canvas, 'pointerdown', (e) => {
		if (noGL) return;
		canvas.setPointerCapture(e.pointerId);
		drag = {
			x: e.clientX,
			y: e.clientY,
			sx: e.clientX,
			sy: e.clientY,
			b: e.button,
			shift: e.shiftKey,
			moved: false,
			pts: drag && drag.pts ? drag.pts : new Map()
		};
		drag.pts.set(e.pointerId, [e.clientX, e.clientY]);
		cam.fly = null;
	});
	on(canvas, 'pointermove', (e) => {
		if (!drag) {
			hover(e);
			return;
		}
		if (drag.pts.size >= 2) {
			const prev = [...drag.pts.values()];
			drag.pts.set(e.pointerId, [e.clientX, e.clientY]);
			const now = [...drag.pts.values()];
			const d0 = Math.hypot(prev[0][0] - prev[1][0], prev[0][1] - prev[1][1]),
				d1 = Math.hypot(now[0][0] - now[1][0], now[0][1] - now[1][1]);
			cam.v.dist *= d0 / Math.max(1, d1);
			const a0 = Math.atan2(prev[1][1] - prev[0][1], prev[1][0] - prev[0][0]),
				a1 = Math.atan2(now[1][1] - now[0][1], now[1][0] - now[0][0]);
			cam.v.yaw += a1 - a0;
			const my0 = (prev[0][1] + prev[1][1]) / 2,
				my1 = (now[0][1] + now[1][1]) / 2;
			cam.v.pitch += (my1 - my0) * 0.004;
			clampCam();
			drag.moved = true;
			return;
		}
		drag.pts.set(e.pointerId, [e.clientX, e.clientY]);
		const dx = e.clientX - drag.x,
			dy = e.clientY - drag.y;
		drag.x = e.clientX;
		drag.y = e.clientY;
		if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true;
		if (drag.b === 2 || drag.b === 1 || drag.shift) {
			cam.v.yaw -= dx * 0.005;
			cam.v.pitch += dy * 0.004;
		} else {
			const k = cam.v.dist * 0.0021;
			const sy = Math.sin(cam.v.yaw),
				cy = Math.cos(cam.v.yaw);
			cam.v.tx -= (dx * cy + dy * sy) * k;
			cam.v.tz -= (-dx * sy + dy * cy) * k;
		}
		clampCam();
	});
	const up = (e: PointerEvent) => {
		if (!drag) return;
		drag.pts.delete(e.pointerId);
		if (drag.pts.size === 0) {
			if (!drag.moved && drag.b === 0) click(e);
			if (!drag.moved && drag.b === 2 && S.tool === 'road' && S.roadStart) {
				S.roadStart = null;
				previewRoad(null);
				lastPlanKey = '';
				ui.hint = '街の端の交差点を押して始める';
			}
			drag = null;
		}
	};
	on(canvas, 'pointerup', up);
	on(canvas, 'pointercancel', up);
	on(
		canvas,
		'wheel',
		(e) => {
			e.preventDefault();
			cam.v.dist *= Math.exp(e.deltaY * 0.0012);
			clampCam();
			cam.fly = null;
		},
		{ passive: false }
	);
	on(window, 'keydown', (e) => {
		const tg = e.target;
		if (tg instanceof Element && tg.closest('input,textarea')) return;
		// 道具の一覧（区画・道の始まり）を開いているときは、矢印と Enter と [ ] を一覧に使う
		const inPick = tg instanceof Element && !!tg.closest('.pick');
		const free = !(tg instanceof Element) || tg === document.body || tg === canvas || inPick;
		if (!ui.dialog && free && pickKey(e.key)) {
			e.preventDefault();
			return;
		}
		// 街に焦点があるときの Enter：画面の真ん中の建物を選ぶ（印のある建物なら要望を開く）
		if (e.key === 'Enter' && tg === canvas && !ui.dialog) {
			const rc = canvas.getBoundingClientRect();
			const b = hitBuilding(
				ray({ clientX: rc.left + rc.width / 2, clientY: rc.top + rc.height / 2 })
			);
			const req = b && openReqs().find((r) => F[CLIENTS[r.group].at] === b);
			if (req) openReq(req.id);
			else select(b);
			return;
		}
		keys.add(e.key.toLowerCase());
		if (e.key === ' ') {
			e.preventDefault();
			setSpeed(S.speed ? 0 : 1);
		}
		if (['1', '2', '3'].includes(e.key)) setSpeed(+e.key);
		const k = e.key.toLowerCase();
		if (!ui.dialog) {
			if (k === 'n')
				toast('明日の朝 8:00 まで送る？', '夜の間も収支は入り、区画は育つ', '', [
					['送る', nextMorning, 'pri']
				]);
			if (k === 'r') replayChange();
			if (e.key === '+' || e.key === ';') cam.v.dist *= 0.85;
			if (e.key === '-') cam.v.dist *= 1.18;
			clampCam();
		}
		if (e.key === 'Escape') {
			if (ui.dialog && ui.dialog.kind !== 'result') closeDlg();
			else {
				setTool('select');
				select(null);
			}
		}
	});
	on(window, 'keyup', (e) => keys.delete(e.key.toLowerCase()));
	let lastVP: Mat4 | null = null;
	function ray(e: { clientX: number; clientY: number }) {
		const rc = canvas.getBoundingClientRect();
		const nx = ((e.clientX - rc.left) / rc.width) * 2 - 1,
			ny = -(((e.clientY - rc.top) / rc.height) * 2 - 1);
		const inv = E.M4.inv(lastVP as Mat4);
		const a = E.M4.xf(inv, nx, ny, -1, 1),
			b = E.M4.xf(inv, nx, ny, 1, 1);
		const o = [a[0] / a[3], a[1] / a[3], a[2] / a[3]],
			f = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
		const d = [f[0] - o[0], f[1] - o[1], f[2] - o[2]];
		const l = Math.hypot(...d);
		return { o, d: d.map((v) => v / l) };
	}
	function hitBuilding(rr: { o: number[]; d: number[] }) {
		let best: AnyB | null = null,
			bt = 1e9;
		for (const b of allB()) {
			if (b.hidden && E.getRise(b.id) < 0.5) continue;
			const y0 = b.y0 || 0,
				y1 = y0 + b.h + Y;
			let t0 = 0,
				t1 = 1e9;
			const mn = [b.x0, y0, b.z0],
				mx = [b.x1, y1, b.z1];
			let ok = true;
			for (let k = 0; k < 3; k++) {
				if (Math.abs(rr.d[k]) < 1e-8) {
					if (rr.o[k] < mn[k] || rr.o[k] > mx[k]) {
						ok = false;
						break;
					}
					continue;
				}
				let ta = (mn[k] - rr.o[k]) / rr.d[k],
					tb = (mx[k] - rr.o[k]) / rr.d[k];
				if (ta > tb) [ta, tb] = [tb, ta];
				t0 = Math.max(t0, ta);
				t1 = Math.min(t1, tb);
				if (t0 > t1) {
					ok = false;
					break;
				}
			}
			if (ok && t0 < bt) {
				bt = t0;
				best = b;
			}
		}
		return best;
	}
	function groundHit(rr: { o: number[]; d: number[] }) {
		if (rr.d[1] >= -1e-4) return null;
		const t = (Y - rr.o[1]) / rr.d[1];
		return [rr.o[0] + rr.d[0] * t, rr.o[2] + rr.d[2] * t];
	}
	let hoverId = -1;
	function hover(e: PointerEvent) {
		if (!lastVP) return;
		const rr = ray(e);
		if (S.tool === 'road') {
			canvas.style.cursor = 'crosshair';
			const g = groundHit(rr);
			if (!g || !S.roadStart) return;
			const p = snapPoint(g);
			const key = p.x + ',' + p.z;
			if (key === lastPlanKey) return;
			lastPlanKey = key;
			const plan = roadPlan(S.roadStart, p);
			previewRoad(plan);
			ui.hint = plan.ok
				? Math.round(plan.L) + ' m ・ ¥' + plan.cost + ' ・ 押すと引く'
				: '引けない：' + plan.why;
			return;
		}
		if (['home', 'shop', 'park'].includes(S.tool)) {
			canvas.style.cursor = 'pointer';
			hoverId = -1;
			return;
		}
		const b = hitBuilding(rr);
		hoverId = b ? b.id : -1;
		canvas.style.cursor = b ? 'pointer' : 'grab';
	}
	function click(e: PointerEvent) {
		const rr = ray(e);
		if (S.tool === 'road') {
			const g = groundHit(rr);
			if (!g) return;
			const p = snapPoint(g);
			if (!S.roadStart) {
				S.roadStart = p;
				previewRoad(null);
				ui.hint = '伸ばしたい先を押す（右クリックでやめる）';
				return;
			}
			const plan = roadPlan(S.roadStart, p);
			if (!plan.ok) {
				toast('ここには引けない', plan.why, 'warn');
				return;
			}
			addRoad(plan);
			S.roadStart = { x: plan.b.x, z: plan.b.z, node: true };
			lastPlanKey = '';
			previewRoad(null);
			ui.hint = '続けて伸ばせる。別の所から引くなら右クリック';
			return;
		}
		if (['home', 'shop', 'park'].includes(S.tool)) {
			const g = groundHit(rr);
			if (!g) return;
			const i = ts.build.lots.findIndex(
				(l) => !l.taken && g[0] > l.x0 && g[0] < l.x1 && g[1] > l.z0 && g[1] < l.z1
			);
			if (i >= 0) placeOnLot(i);
			return;
		}
		const b = hitBuilding(rr);
		if (S.tool === 'bulldoze') {
			if (b) bulldozeB(b);
			return;
		}
		if (b) {
			const req = openReqs().find((r) => F[CLIENTS[r.group].at] === b);
			if (req) {
				openReq(req.id);
				return;
			}
			select(b);
		} else select(null);
	}
	// simple sound (optional)
	let AC: AudioContext | null = null;
	function sfxNote() {
		try {
			AC = AC || new AudioContext();
			const o = AC.createOscillator(),
				g = AC.createGain();
			o.type = 'sine';
			o.frequency.value = 660;
			g.gain.setValueAtTime(0.0001, AC.currentTime);
			g.gain.exponentialRampToValueAtTime(0.05, AC.currentTime + 0.02);
			g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 0.4);
			o.connect(g).connect(AC.destination);
			o.start();
			o.stop(AC.currentTime + 0.45);
		} catch {
			/* no audio */
		}
	}

	// ---------------- main loop ----------------
	const STILL = still;
	let FT = 16,
		QS = 1;
	let TIME = 0,
		last = performance.now();
	let raf = 0;
	let stopped = false;
	const W = window as unknown as StillHooks;
	if (STILL)
		W.__game = {
			state: () => ts.build,
			town: () => ts,
			save,
			replayed: () => replayTown(save(), MAP).state,
			demand,
			S,
			cam,
			flyTo,
			setView,
			setTool,
			openReq,
			doMove,
			closeDlg,
			ui,
			setLearned: (ids: string[] | null) => (learnedOverride = ids ? new Set(ids) : null),
			nextMorning,
			city,
			E,
			setSpeed,
			roadPlan,
			addRoad,
			snapPoint,
			placeOnLot
		};
	function frame(now: number) {
		if (stopped) return;
		const dtR = Math.min(0.1, (now - last) / 1000);
		last = now;
		const mult = [0, 1, 3, 8][S.speed];
		TIME += dtR * (mult ? 1 : 0.0) + (mult ? 0 : 0);
		// camera input
		const kp = cam.v.dist * 0.9 * dtR;
		const sy = Math.sin(cam.v.yaw),
			cyw = Math.cos(cam.v.yaw);
		if (keys.has('w') || keys.has('arrowup')) {
			cam.v.tx -= sy * kp;
			cam.v.tz -= cyw * kp;
			cam.fly = null;
		}
		if (keys.has('s') || keys.has('arrowdown')) {
			cam.v.tx += sy * kp;
			cam.v.tz += cyw * kp;
			cam.fly = null;
		}
		if (keys.has('a') || keys.has('arrowleft')) {
			cam.v.tx -= cyw * kp;
			cam.v.tz += sy * kp;
			cam.fly = null;
		}
		if (keys.has('d') || keys.has('arrowright')) {
			cam.v.tx += cyw * kp;
			cam.v.tz -= sy * kp;
			cam.fly = null;
		}
		if (keys.has('q')) cam.v.yaw += 1.2 * dtR;
		if (keys.has('e')) cam.v.yaw -= 1.2 * dtR;
		clampCam();
		if (cam.fly) {
			cam.fly.t = Math.min(1, cam.fly.t + dtR / (RM ? 0.4 : 1.4));
			const t = cam.fly.t,
				k = t * t * (3 - 2 * t);
			for (const p of CAMK) cam.v[p] = cam.fly.from[p] + (cam.fly.to[p] - cam.fly.from[p]) * k;
			if (t >= 1) cam.fly = null;
		}
		const sm = 1 - Math.pow(0.0005, dtR);
		for (const p of CAMK) cam[p] += (cam.v[p] - cam[p]) * sm;
		// sim
		if (mult) {
			frac += dtR * 10 * mult;
			const whole = Math.floor(frac);
			frac -= whole;
			if (whole > 0) {
				const t = tickTown(ts, ts.minute + whole, MAP);
				ts = t.state;
				onEvents(t.events);
			}
			const bySeg = new Map<string, Car[]>();
			for (const c of cars)
				if (c.phase === 'seg') {
					const k = c.a.x + ',' + c.a.z + '>' + c.b.x + ',' + c.b.z;
					let arr = bySeg.get(k);
					if (!arr) bySeg.set(k, (arr = []));
					arr.push(c);
				}
			for (const arr of bySeg.values()) {
				arr.sort((p1, p2) => p1.t - p2.t);
				for (let i = 0; i < arr.length; i++)
					arr[i].lead = i < arr.length - 1 ? arr[i + 1].t - arr[i].t : null;
			}
			// 見た目だけの動きは、動きを減らす設定で半分の速さ（止めると時間の流れが分からなくなる。10.7）
			const vm = dtR * Math.min(mult, 3) * (RM ? 0.5 : 1);
			for (const c of cars) {
				if (c.phase !== 'seg') c.lead = null;
				stepCar(c, vm);
			}
			for (const p of peds) {
				p.s += p.v * vm;
				p.bob += dtR * 8;
			}
			for (const b of boats) {
				b.ph = (b.ph || 0) + dtR * 1.5;
				if (b.kind === 'ferry') {
					const P = b.path as number[][];
					b.t = ((b.t as number) + (vm * b.sp) / 150) % P.length;
					const i = Math.floor(b.t),
						f = b.t - i,
						A = P[i],
						B2 = P[(i + 1) % P.length];
					b.x = A[0] + (B2[0] - A[0]) * f;
					b.z = A[1] + (B2[1] - A[1]) * f;
					b.h = Math.atan2(B2[1] - A[1], B2[0] - A[0]);
				} else {
					b.a = (b.a as number) + b.sp * vm;
					b.x = (b.cx as number) + Math.cos(b.a) * (b.r as number);
					b.z = (b.cz as number) + Math.sin(b.a) * (b.r as number);
					b.h = b.a + (b.sp > 0 ? Math.PI / 2 : -Math.PI / 2);
				}
			}
		}
		for (const b of boats)
			if (b.x === undefined) {
				b.x = b.cx || (b.path as number[][])[0][0];
				b.z = b.cz || (b.path as number[][])[0][1];
				b.h = 0;
			}
		// constructions
		for (const cn of constructions) {
			if (cn.p >= 1) continue;
			// 動きを減らす設定では、足場の絵（前）と建ち終えた絵（後）を、それぞれ --dl-motion-hold の間見せる
			cn.p = Math.min(1, cn.p + dtR / (RM ? holdSec() * 2 : cn.dur));
			const e = RM ? (cn.p < 0.5 ? 0 : 1) : cn.p < 0.25 ? 0 : (cn.p - 0.25) / 0.75;
			E.setData(cn.b.id, 0, 0, 0, Math.round(255 * (1 - Math.pow(1 - e, 3))));
			if (cn.p >= 1) {
				applyInfoColors();
				cn.onDone?.();
			}
		}
		for (let i = constructions.length - 1; i >= 0; i--)
			if (constructions[i].p >= 1) constructions.splice(i, 1);
		placedProgress();
		// render
		const hour = S.minute / 60;
		const L = lightAt(hour);
		S.infra += (S.infraTarget - S.infra) * Math.min(1, dtR * 4);
		E.setMesh('dyn', buildDyn(), true);
		FT = FT * 0.95 + dtR * 1000 * 0.05;
		if (!STILL) {
			if (FT > 30 && QS > 0.55) QS -= 0.01;
			else if (FT < 17 && QS < 1) QS += 0.005;
		}
		const dpr = Math.min(devicePixelRatio || 1, 1.75) * QS;
		const w = Math.floor(canvas.clientWidth * dpr),
			h = Math.floor(canvas.clientHeight * dpr);
		const eye = eyeOf(cam);
		const tilt = Math.max(0.08, Math.min(0.95, (420 - cam.dist) / 360));
		const opaque = ['city', 'water', 'dyn', 'built'];
		if (S.view === 'infra' && S.infra > 0.05) opaque.push('infra');
		if (eng.meshes.lots && eng.meshes.lots.visible) opaque.push('lots');
		if (S.tool === 'road') opaque.push('preview');
		const res = E.render({
			w,
			h,
			fov: 0.72,
			near: Math.max(0.5, cam.dist * 0.01),
			far: 6000,
			eye,
			target: [cam.tx, 0, cam.tz],
			sunDir: L.sd,
			shadowR: Math.min(950, Math.max(110, cam.dist * 1.05)),
			light: L,
			time: TIME + 100,
			info: S.infra,
			sel: S.sel ? S.sel.id : hoverId,
			fog: 0.00032,
			tilt,
			bloom: 0.55 + L.night * 0.5,
			aoK: 0.85,
			aoR: 2.5,
			opaque,
			casters: ['city', 'dyn', 'built'],
			glow: ['glow'],
			motion: RM ? 0 : 1
		});
		lastVP = res.VP;
		if (STILL)
			W.__proj = (x: number, z: number) => {
				const rc2 = canvas.getBoundingClientRect();
				const pp = E.M4.xf(res.VP, x, Y, z, 1);
				return [
					((pp[0] / pp[3]) * 0.5 + 0.5) * rc2.width,
					(1 - ((pp[1] / pp[3]) * 0.5 + 0.5)) * rc2.height
				];
			};
		// markers & floaters
		const rc = canvas.getBoundingClientRect();
		const proj = (x: number, y: number, z: number) => {
			const p = E.M4.xf(res.VP, x, y, z, 1);
			if (p[3] <= 0) return null;
			return [
				((p[0] / p[3]) * 0.5 + 0.5) * rc.width,
				(1 - ((p[1] / p[3]) * 0.5 + 0.5)) * rc.height
			];
		};
		for (const [k, el] of markerEls) {
			if (noGL) {
				el.style.display = 'none';
				continue;
			}
			const b = F[k];
			const p = proj(cx(b), (b.y0 || 0) + b.h + Y + 4, cz(b));
			if (!p) {
				el.style.display = 'none';
				continue;
			}
			el.style.display = '';
			el.style.transform = `translate(${p[0]}px, ${p[1]}px)`;
		}
		for (let i = floats.length - 1; i >= 0; i--) {
			const f = floats[i];
			f.t += dtR;
			// 動きを減らす設定では、動かさずにその場に 2 秒出す
			const p = proj(f.x, f.y + (RM ? 0 : f.t * 6), f.z);
			const life = RM ? 2 : 2.4;
			if (!p || f.t > life || noGL) {
				if (f.t > life || noGL) {
					f.el.remove();
					floats.splice(i, 1);
				}
				continue;
			}
			f.el.style.transform = `translate(${p[0]}px, ${p[1]}px)`;
			f.el.style.opacity = RM
				? '1'
				: String(f.t < 0.2 ? f.t / 0.2 : Math.max(0, 1 - (f.t - 1.6) / 0.8));
		}
		if (Math.floor(now / 250) !== Math.floor((now - dtR * 1000) / 250)) renderHUD();
		if (S.sel && Math.floor(now / 1000) !== Math.floor((now - dtR * 1000) / 1000)) select(S.sel);
		if (!STILL) raf = requestAnimationFrame(frame);
	}
	// initial
	for (const rd of ts.build.roads) roadTraffic(rd.a, rd.b, rd.L);
	syncSystems();
	rebuildBuilt();
	lotMarkers();
	previewRoad(null);
	mesh('lots').visible = false;
	mesh('infra').visible = false;
	setSpeed(1);
	setTool('select');
	setView('ground');
	renderReqs();
	renderHUD();
	if (!STILL && !restored) {
		ui.dialog = { kind: 'intro' };
		S.prevSpeed = 1;
		setSpeed(0);
	} else if (!STILL && ts.desk.result === 'failed') {
		onClose([
			{
				what: 'status',
				request: '',
				before: 'playing',
				after: 'failed',
				why: `依頼主の満足度 ${ts.desk.clientSat}`
			}
		]);
	}
	function startIntro() {
		closeDlg();
	}
	ui.ready = true;
	if (STILL) {
		W.__ready = true;
		W.__frame = (n?: number, dt?: number) => {
			for (let i = 0; i < (n || 1); i++) {
				last = performance.now() - (dt || 0.05) * 1000;
				frame(performance.now());
			}
		};
		W.__snap = () => {
			cam.tx = cam.v.tx;
			cam.tz = cam.v.tz;
			cam.yaw = cam.v.yaw;
			cam.pitch = cam.v.pitch;
			cam.dist = cam.v.dist;
		};
	}
	if (!STILL) raf = requestAnimationFrame(frame);
	else frame(performance.now());

	return {
		setSpeed,
		setTool,
		setView,
		openReq,
		closeDlg,
		doMove,
		restartAt,
		replayChange,
		nextMorning,
		startIntro,
		toggleBudget,
		select: () => select(null),
		dispose() {
			stopped = true;
			cancelAnimationFrame(raf);
			for (const t of timers) clearTimeout(t);
			for (const off of offs) off();
			mq?.removeEventListener('change', onRM);
			for (const el of markerEls.values()) el.remove();
			for (const f of floats) f.el.remove();
			const lose = E.gl.getExtension('WEBGL_lose_context');
			lose?.loseContext();
			if (STILL) {
				delete W.__game;
				delete W.__frame;
				delete W.__snap;
				delete W.__proj;
				delete W.__ready;
			}
		}
	};
}
