// みなと町：遊びの層（時刻と光、車・人・船、要望と解説、建てる道具、地下の仕組みの表示、操作）。
// 試作 docs/prototype/src/game.js を TypeScript に移した物（段 8-2a）。処理は変えていない。
// 変えたのは：型を付けた・グローバルを引数にした・板を innerHTML でなく ui（Svelte の $state）に書くようにした・
// 撮影の口（window.__game など）を #still のときだけ出すようにした、だけ。
// 状態の計算を描画から切り離すのは 8-2b で行う。

import { createEngine, type Engine, type Light, type Mat4 } from './engine.ts';
import { generateCity, GEN, type Bld, type Col, type RNode } from './gen.ts';
import { clockOf, MIN_PER_DAY, START_MINUTE, tick } from '../game/clock.ts';
import { bumpNear, DEFAULT_HAPPY, initHappy, type Happy, type Spot } from '../game/happy.ts';
import {
	BUILD_MIN,
	bulldoze,
	demand as demandOf,
	income as incomeOf,
	incomeParts as incomePartsOf,
	hourly,
	pay,
	placeLot,
	pop as popOf,
	road,
	roadPlan as roadPlanOf,
	snapPoint as snapPointOf,
	startBuild,
	type BuildState,
	type Placed,
	type RoadPlan,
	type SnapPt
} from '../game/build.ts';
import { mapOf } from '../game/map.ts';

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
export type ReqOpt = { label: string; note: string; cost: number };
export type ReqDialog = {
	kind: 'req';
	id: string;
	icon: string;
	color: string;
	left: number;
	title: string;
	who: string;
	quote: string;
	conds: string[];
	reward: string;
	lesson: LessonData;
	lid: string;
	learned: boolean;
	needOk: boolean;
	learnedOpt: ReqOpt;
	outOpt: ReqOpt;
};
export type Dialog = null | { kind: 'intro' } | ReqDialog;
export type LessonNode = { id: string; x: number; y: number; label: string; sub: string };
/** 札：[置き場, 字, 強調, 横のずれ, 縦のずれ] */
export type Tok = [string, string, number, number, number];
export type LessonStep = {
	t: string;
	d: string;
	cmd: string;
	facts: [string, string][];
	tok: Record<string, Tok>;
};
export type LessonData = {
	title: string;
	tool: string;
	edges: [string, string, string][];
	vh: number;
	nodes: LessonNode[];
	steps: LessonStep[];
};
export type LessonView = { lid: string; data: LessonData };

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
	lesson: LessonView | null;
};

export function newTownUi(): TownUi {
	return {
		ready: false,
		noGL: '',
		clock: '15:30',
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
		lesson: null
	};
}

export type TownHandle = ReturnType<typeof startTown>;

type Layers = { canvas: HTMLCanvasElement; markers: HTMLElement; floaters: HTMLElement };

// 試作のまま：組み立て後の建物（区画に建つ家・店・公園）
type Built = Bld & {
	player: true;
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
type Req = {
	id: string;
	who: string;
	icon: string;
	color: string;
	at: () => Bld;
	builds?: () => Bld;
	view?: number[];
	title: string;
	due: number;
	needs?: string;
	quote: string;
	conds: string[];
	reward: string;
	lesson: string;
	learnedOpt: ReqOpt;
	outOpt: ReqOpt;
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
	try {
		E = createEngine(canvas);
	} catch {
		ui.noGL = 'この端末では 3D 表示（WebGL2）が使えません。';
		return null;
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
	let clk = START_MINUTE;
	let frac = 0;
	const S = {
		/** その日の 0 時からの分（端数つき。描画の光に使う）。撮影の口から書き換えられる（city-standard.md 第 6 章） */
		get minute() {
			return (clk % MIN_PER_DAY) + frac;
		},
		set minute(v: number) {
			clk = Math.floor(clk / MIN_PER_DAY) * MIN_PER_DAY + Math.floor(v);
			frac = v - Math.floor(v);
		},
		get day() {
			return clockOf(clk).day;
		},
		speed: 1,
		view: 'ground',
		tool: 'select',
		sel: null as AnyB | null,
		learned: {} as Record<string, boolean>,
		answered: {} as Record<string, string>,
		requests: [] as { id: string; dayIn: number; due: number }[],
		/** 建物ごとの満足度（状態。src/lib/game/happy.ts） */
		happy: {} as Happy,
		infra: 0,
		infraTarget: 0,
		roadStart: null as SnapPt | null,
		prevSpeed: 1
	};
	/** 街づくりの状態（src/lib/game/build.ts） */
	const MAP = mapOf(city);
	let st: BuildState = startBuild(MAP, 5000);
	const allB = (): AnyB[] => (city.B as AnyB[]).concat(builtList());
	const spotOf = (b: Bld): Spot => ({ id: b.id, x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2 });
	const SPOTS = city.B.map(spotOf);
	S.happy = initHappy(SPOTS, SEED);
	// 試作はここで満足度の始まりを擬似乱数から引いていた。見た目だけの擬似乱数（車・人・船・公園の木）の並びを試作と同じに保つため、同じ数だけ引いて捨てる
	for (let i = 0; i < city.B.length; i++) R();
	const hp = (id: number) => S.happy[id] || DEFAULT_HAPPY;
	const pop = () => popOf(st, MAP, clk);
	const outs = () => Object.values(S.answered).filter((v) => v === 'out').length;
	const avgHappy = () => {
		let s = 0,
			n = 0;
		for (const b of allB()) {
			if (b.hidden && E.getRise(b.id) < 0.5) continue;
			s += hp(b.id);
			n++;
		}
		return s / n;
	};

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
	function buildInfra() {
		const g = new Geo(1 << 14);
		const BLUE = HX('#4aa3ff'),
			VIO = HX('#b48cff'),
			RED = HX('#ff5a3c'),
			GRN = HX('#56d68a');
		const hall = [cx(F.hall), cz(F.hall)];
		// trunk lines along roads
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
				[hall[0], hall[1]]
			],
			1.1,
			BLUE,
			0.4
		);
		tube(
			g,
			[
				[-80, 0],
				[-80, 40],
				[cx(F.school), cz(F.school)]
			],
			1.1,
			S.answered.school ? GRN : RED,
			0.4
		);
		tube(
			g,
			[
				[-160, -80],
				[-160, -40],
				[cx(F.clinic), cz(F.clinic)]
			],
			1.1,
			BLUE,
			0.4
		);
		tube(
			g,
			[
				[80, 0],
				[80, 160],
				[150, 180]
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
		node(g, hall[0], hall[1], 3.2, BLUE);
		node(g, cx(F.clinic), cz(F.clinic), 2.4, BLUE);
		node(g, 150, 180, 2.4, BLUE);
		node(
			g,
			cx(F.school),
			cz(F.school),
			S.answered.school ? 2.6 : 3.6,
			S.answered.school ? GRN : RED,
			S.answered.school ? 1.6 : 2.4
		);
		if (S.answered.school === 'learned') {
			node(g, cx(F.school) - 22, cz(F.school) + 12, 2.0, GRN);
			tube(
				g,
				[
					[cx(F.school), cz(F.school)],
					[cx(F.school) - 22, cz(F.school) + 12]
				],
				0.9,
				GRN,
				0.4
			);
		}
		if (S.answered.board) {
			const an = [cx(F.annex), cz(F.annex)];
			const col = S.answered.board === 'learned' ? VIO : HX('#8a9099');
			tube(
				g,
				[[cx(F.board), cz(F.board)], [cx(F.board), cz(F.board) - 8], [an[0], cz(F.board) - 8], an],
				1.2,
				col,
				0.6
			);
			node(g, an[0], an[1], 3, col, 2.2);
			if (S.answered.shop)
				tube(
					g,
					[[cx(F.shopMain), cz(F.shopMain)], [cx(F.shopMain), 0], [an[0], 0], an],
					1.0,
					col,
					0.6
				);
		}
		const TEAL = HX('#3fd0c0'),
			ORG = HX('#ffb000');
		if (S.answered.clinic) {
			const dv = [cx(F.dbvault), cz(F.dbvault)];
			const col = S.answered.clinic === 'learned' ? TEAL : HX('#8a9099');
			tube(
				g,
				[
					[F.clinic.x1 + 1.6, cz(F.clinic)],
					[F.clinic.x1 + 1.6, dv[1]],
					[F.dbvault.x1 + 0.6, dv[1]]
				],
				1.2,
				col,
				0.6
			);
			tube(
				g,
				[
					[-80, cz(F.clinic)],
					[F.clinic.x1 + 1.6, cz(F.clinic)]
				],
				1.0,
				BLUE,
				0.4
			);
			node(g, dv[0], dv[1], 2.8, col, 2);
		}
		const wh = [cx(F.warehouse), cz(F.warehouse)],
			gt = [cx(F.gate), cz(F.gate)];
		if (S.answered.harbor === 'learned') {
			tube(g, [[250, 0], [250, 150], [gt[0], 150], gt], 1.2, ORG, 0.4);
			node(g, gt[0], gt[1], 3, ORG, 2.2);
			tube(g, [gt, wh], 1.1, GRN, 0.5);
			tube(
				g,
				[
					[80, 160],
					[80, 150],
					[gt[0] + 4, 150],
					[gt[0] + 4, gt[1]]
				],
				1.0,
				GRN,
				0.45
			);
		} else if (S.answered.harbor) {
			tube(g, [[250, 0], [250, 150], [wh[0], 150], wh], 1.2, HX('#8a9099'), 0.4);
			node(g, wh[0], wh[1], 2.6, HX('#8a9099'), 2);
		} else {
			tube(g, [[250, 0], [250, 150], [wh[0], 150], wh], 1.2, RED, 0.4);
			node(g, wh[0], wh[1], 3.2, RED, 2.4);
		}
		E.setMesh('infra', g.out(), true);
	}
	buildInfra();
	function applyInfoColors() {
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
				if (b === F.annex) c = S.answered.board === 'learned' ? [0.75, 0.6, 1] : [0.55, 0.58, 0.62];
				if (b === F.school) c = S.answered.school ? [0.4, 0.85, 0.55] : [1, 0.45, 0.35];
				if (b === F.hall || b === F.clinic || b.kind === 'tower') c = [0.4, 0.65, 1];
				if (b === F.board) c = S.answered.board ? [0.75, 0.6, 1] : [1, 0.75, 0.4];
				if (b === F.shopMain) c = S.answered.shop ? [0.75, 0.6, 1] : [1, 0.85, 0.45];
				if (b === F.dbvault) c = [0.3, 0.85, 0.78];
				if (b === F.gate) c = [1, 0.7, 0.2];
				if (b === F.warehouse)
					c =
						S.answered.harbor === 'learned'
							? [0.4, 0.85, 0.55]
							: S.answered.harbor
								? [0.55, 0.58, 0.62]
								: [1, 0.45, 0.35];
				E.setData(b.id, c[0] * 255, c[1] * 255, c[2] * 255, rise);
			} else E.setData(b.id, 0, 0, 0, rise);
		}
	}

	// ---------------- constructions ----------------
	/** 足場を描く物：要望で建つ物（実時間）と、区画に建つ物（ゲーム内の時刻） */
	function scaffolds(): { b: AnyB; p: number }[] {
		const now = clk + frac;
		const list: { b: AnyB; p: number }[] = constructions.slice();
		for (const p of st.placed) {
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
		if (hit && hit.lot === st.lots[p.lot]) return hit;
		const r = GEN.mulberry(p.look);
		const pk = <T>(a: readonly T[]): T => a[Math.floor(r() * a.length)];
		const L = st.lots[p.lot];
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
	const builtList = () => st.placed.map(builtOf);
	function rebuildBuilt() {
		const g = new Geo(1 << 14);
		// player roads and the lots they opened
		for (const rd of st.roads) roadGeo(g, rd);
		for (const L of st.lots)
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
		for (const L of st.lots)
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
		E.setMesh('built', g.out(), true);
	}
	function lotMarkers() {
		const g = new Geo(4096);
		const col =
			S.tool === 'home' ? HX('#56d68a') : S.tool === 'shop' ? HX('#4aa3ff') : HX('#e7d36b');
		for (const L of st.lots) {
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
		const r = road(st, MAP, plan.a, plan.b, clk);
		if (!r.ok) {
			toast('ここには引けない', r.why, 'warn');
			return;
		}
		st = r.state;
		const na = trafficNode(plan.a.x, plan.a.z),
			nb2 = trafficNode(plan.b.x, plan.b.z);
		na.nb.push(nb2);
		nb2.nb.push(na);
		for (let k = 0; k < 4; k++) {
			const car: Car = {
				a: na,
				b: nb2,
				c: null,
				t: (k * plan.L) / 5,
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
		rebuildBuilt();
		lotMarkers();
		mesh('lots').visible = true;
		toast(
			'道路を引いた',
			Math.round(plan.L) +
				' m ・ ¥' +
				plan.cost +
				' ・ 沿いに空き区画が ' +
				r.opened +
				' つできた。住宅地や商業地を建てられる',
			''
		);
		sfxNote();
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
	const snapPoint = (g: readonly number[]) => snapPointOf(st, MAP, g);
	const roadPlan = (a: SnapPt, p: Pt) => roadPlanOf(st, MAP, a, p);
	function placeOnLot(i: number) {
		const tool = S.tool === 'park' ? 'park' : S.tool === 'shop' ? 'shop' : 'home';
		const L = st.lots[i];
		const r = placeLot(st, MAP, i, tool, clk, SEED);
		if (!r.ok) {
			toast(L.zone && tool !== 'park' ? '指定済みの区画' : '資金が足りない', r.why, 'warn');
			return;
		}
		st = r.state;
		if (tool === 'park') {
			const p = st.placed[st.placed.length - 1];
			S.happy = { ...S.happy, [p.id]: 0.7 };
			S.happy = bumpNear(S.happy, SPOTS, (p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2, 60, 0.06, 0, 1);
		} else floater(L.cx, 4 + (L.y0 || Y), L.cz, tool === 'home' ? '住宅地' : '商業地', 'good');
		rebuildBuilt();
		lotMarkers();
		sfxNote();
	}
	function bulldozeB(b: AnyB) {
		const r = bulldoze(st, b.id, clk);
		if (!r.ok) {
			toast('取り壊せない', r.why, 'warn');
			return;
		}
		st = r.state;
		builtCache.delete(b.id);
		rebuildBuilt();
		lotMarkers();
		select(null);
	}
	/** 建ち始めた・建ち終えた物（ゲーム内の時刻で進む。描画は状態の分から建つ途中の絵を描く） */
	const doneIds = new Set<number>();
	function placedProgress() {
		const now = clk + frac;
		for (const p of st.placed) {
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
	// ---------------- requests & lessons ----------------
	const REQ: Record<string, Req> = {
		board: {
			id: 'board',
			who: '町内会長',
			icon: '町',
			color: '#ff9d4d',
			at: () => F.board,
			builds: () => F.annex,
			view: [-8, 6, 105, 0.62, -0.4],
			title: '掲示板を、誰がいつ直したか残したい',
			due: 3,
			quote:
				'「お祭りの日付が、いつの間にか書き換わっていたんです。誰が直したのか分かるようにしてもらえませんか。前の文面にも戻せると助かります」',
			conds: ['直した人と日時が残る', '前の文面に戻せる'],
			reward: '満足度 最大 +6',
			lesson: 'git',
			learnedOpt: {
				label: '役場の隣に記録庫を建てる',
				note: '学んだ手 ・ 中身が見える ・ 後の要望にも使える',
				cost: 200
			},
			outOpt: { label: '外の業者に任せる', note: '学ばなくても選べる ・ 中身は見えない', cost: 900 }
		},
		school: {
			id: 'school',
			who: '港の学校の先生',
			icon: '学',
			color: '#6fb3ff',
			at: () => F.school,
			title: '昼休みになると校内の無線が止まる',
			due: 4,
			quote:
				'「昼休みにみんなが一斉につなぐと、授業の資料が開かなくなるんです。午後の授業までに何とかなりませんか」',
			conds: ['昼休みでも資料が開く', '新しい機械は最小限'],
			reward: '満足度 最大 +5',
			lesson: 'net',
			learnedOpt: {
				label: '中継器を 1 台足して振り分ける',
				note: '学んだ手 ・ 混む理由が見える',
				cost: 300
			},
			outOpt: {
				label: '業者に回線を太くしてもらう',
				note: '学ばなくても選べる ・ 費用が高い',
				cost: 1200
			}
		},
		shop: {
			id: 'shop',
			who: '商店街の会長',
			icon: '店',
			color: '#f2c14e',
			at: () => F.shopMain,
			title: '売上の控えを、なくさず残したい',
			due: 5,
			needs: 'board',
			quote:
				'「帳面が雨で濡れて、先月の売上が分からなくなりました。役場の記録庫みたいに残せませんか」',
			conds: ['毎日の控えが残る', '誰が書いたか分かる'],
			reward: '満足度 最大 +5',
			lesson: 'git',
			learnedOpt: {
				label: '記録庫に商店街の帳面をつなぐ',
				note: '前に学んだ記録庫をそのまま使える',
				cost: 100
			},
			outOpt: { label: '外の業者に任せる', note: '学ばなくても選べる', cost: 800 }
		},
		clinic: {
			id: 'clinic',
			who: '診療所の受付',
			icon: '診',
			color: '#3fd0c0',
			at: () => F.clinic,
			builds: () => F.dbvault,
			view: [0, 0, 85, 0.62, -2.4],
			title: '予約の数が、帳面と合わない',
			due: 4,
			quote:
				'「同じ人の予約が 2 回書いてあったり、数えるたびに数が違ったりするんです。明日の予約が何件か、すぐ分かるようにしたい」',
			conds: ['日ごとの予約の数がすぐ分かる', '二重の予約を見つけられる'],
			reward: '満足度 最大 +5',
			lesson: 'db',
			learnedOpt: {
				label: '診療所の隣に帳簿の倉庫を建てる',
				note: '学んだ手 ・ 表にして数えられる',
				cost: 250
			},
			outOpt: {
				label: '外の業者に予約の機械を入れてもらう',
				note: '学ばなくても選べる ・ 中身は見えない',
				cost: 1000
			}
		},
		harbor: {
			id: 'harbor',
			who: '港の倉庫の番頭',
			icon: '港',
			color: '#ff7a59',
			at: () => F.warehouse,
			builds: () => F.gate,
			view: [0, 10, 110, 0.6, 2.6],
			title: '夜中に、知らない所から記録へつながろうとする',
			due: 4,
			quote:
				'「荷の記録を見る機械に、夜中に知らない所から何度もつなごうとした跡があるんです。うちの事務所からだけ見られるようにできませんか」',
			conds: ['事務所からは今まで通り見られる', '知らない所からは届かない'],
			reward: '満足度 最大 +5',
			lesson: 'sec',
			learnedOpt: {
				label: '港の入口に門番の小屋を建てる',
				note: '学んだ手 ・ 断った記録が残る',
				cost: 300
			},
			outOpt: {
				label: '外の業者に見張ってもらう',
				note: '学ばなくても選べる ・ 毎月の費用がかさむ',
				cost: 1100
			}
		}
	};
	const LESSONS: Record<string, LessonData> = LESSON_DATA;
	function addRequest(id: string) {
		if (S.requests.find((r) => r.id === id) || S.answered[id]) return;
		S.requests.push({ id, dayIn: S.day, due: S.day + REQ[id].due });
		toast('要望が届いた', REQ[id].who + '：' + REQ[id].title, 'req');
		renderReqs();
		sfxNote();
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
		park: '光っている空き地を押すと公園ができる（¥80）',
		bulldoze: '自分で建てた建物を押すと取り壊す'
	};
	function setTool(t: string) {
		S.tool = S.tool === t && t !== 'select' ? 'select' : t;
		ui.tool = S.tool;
		ui.hint = HINTS[S.tool];
		const lots = eng.meshes.lots;
		if (lots) lots.visible = ['home', 'shop', 'park', 'road'].includes(S.tool);
		S.roadStart = null;
		previewRoad(null);
		lastPlanKey = '';
		if (S.tool === 'road') {
			mesh('lots').visible = true;
			lotMarkers();
			if (cam.v.dist > 420 || cam.v.tx < 150) flyTo(330, -20, 300, 0.85, 0.9);
		}
		if (['home', 'shop', 'park'].includes(S.tool)) {
			lotMarkers();
			mesh('lots').visible = true;
			if (cam.v.dist > 300 || Math.hypot(cam.v.tx - 200, cam.v.tz - 120) > 200)
				flyTo(200, 120, 170, 0.75);
		}
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
		ui.date = clockOf(clk).date;
		ui.pop = pop();
		ui.money = st.money;
		ui.income = income();
		ui.sat = Math.round(avgHappy() * 100);
		ui.demand = demand();
		if (ui.budgetOpen) renderBudget();
	}
	function demand() {
		return demandOf(st, MAP, avgHappy(), clk);
	}
	function incomeParts(): [string, number][] {
		return incomePartsOf(st, MAP, outs(), clk);
	}
	function income() {
		return incomeOf(st, MAP, outs(), clk);
	}
	function renderBudget() {
		ui.budget = { parts: incomeParts(), income: income(), ledger: st.ledger.slice() };
	}
	function toggleBudget() {
		ui.budgetOpen = !ui.budgetOpen;
		if (ui.budgetOpen) renderBudget();
	}
	function onHour() {
		const r = hourly(st, MAP, clk, avgHappy(), outs(), SEED);
		st = r.state;
		if (r.grown.length) {
			for (const p of r.grown) S.happy = { ...S.happy, [p.id]: 0.7 };
			rebuildBuilt();
			lotMarkers();
			sfxNote();
		}
	}
	function renderReqs() {
		ui.reqs = S.requests.map((r) => {
			const d = REQ[r.id];
			return {
				id: r.id,
				icon: d.icon,
				color: d.color,
				title: d.title,
				who: d.who,
				left: r.due - S.day
			};
		});
		ui.done = Object.keys(S.answered).map((id) => ({
			id,
			title: REQ[id].title,
			how: S.answered[id]
		}));
		renderMarkers();
	}
	const markerEls = new Map<string, HTMLElement>();
	function renderMarkers() {
		for (const [k, el] of markerEls)
			if (!S.requests.find((r) => r.id === k)) {
				el.remove();
				markerEls.delete(k);
			}
		for (const r of S.requests)
			if (!markerEls.has(r.id)) {
				const d = REQ[r.id];
				const el = document.createElement('button');
				el.type = 'button';
				el.className = 'marker';
				el.style.setProperty('--c', d.color);
				el.setAttribute('aria-label', d.who + 'の要望を開く');
				const pin = document.createElement('span');
				pin.className = 'pin';
				const bang = document.createElement('b');
				bang.textContent = '!';
				pin.appendChild(bang);
				const lbl = document.createElement('span');
				lbl.className = 'lbl';
				lbl.textContent = d.who;
				el.appendChild(pin);
				el.appendChild(lbl);
				el.addEventListener('click', (e) => {
					e.stopPropagation();
					openReq(r.id);
				});
				layers.markers.appendChild(el);
				markerEls.set(r.id, el);
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

	// request dialog
	function openReq(id: string) {
		const d = REQ[id];
		const r = S.requests.find((x) => x.id === id);
		if (!r) return;
		const b = d.at();
		flyTo(cx(b), cz(b), 110, 0.55);
		const learned = !!S.learned[d.lesson];
		const needOk = !d.needs || S.answered[d.needs] === 'learned';
		ui.dialog = {
			kind: 'req',
			id,
			icon: d.icon,
			color: d.color,
			left: Math.max(0, r.due - S.day),
			title: d.title,
			who: d.who,
			quote: d.quote,
			conds: d.conds,
			reward: d.reward,
			lesson: LESSONS[d.lesson],
			lid: d.lesson,
			learned,
			needOk,
			learnedOpt: d.learnedOpt,
			outOpt: d.outOpt
		};
		S.prevSpeed = S.speed;
		setSpeed(0);
	}
	function closeDlg() {
		ui.dialog = null;
		setSpeed(S.prevSpeed || 1);
	}
	let lessonBack: (() => void) | null = null;
	// lesson player（試作の簡略な解説。8-2c で段 6 の再生装置につなぎ替える）
	function openLesson(lid: string, back: () => void) {
		ui.dialog = null;
		lessonBack = back;
		ui.lesson = { lid, data: LESSONS[lid] };
	}
	function closeLesson() {
		ui.lesson = null;
		lessonBack?.();
	}
	function finishLesson(lid: string) {
		S.learned[lid] = true;
		ui.lesson = null;
		toast('解説を修了', LESSONS[lid].title + ' ・ 応え方が 1 つ増えた', 'learn');
		lessonBack?.();
	}

	function answer(id: string, how: string) {
		const d = REQ[id];
		const cost = how === 'learned' ? d.learnedOpt.cost : d.outOpt.cost;
		if (st.money < cost) {
			toast('資金が足りない', '必要 ¥' + cost, 'warn');
			return;
		}
		st = pay(st, clk, '要望：' + (how === 'learned' ? d.learnedOpt.label : d.outOpt.label), -cost);
		S.answered[id] = how;
		S.requests = S.requests.filter((r) => r.id !== id);
		closeDlg();
		renderReqs();
		const target = d.at();
		if (d.builds) {
			const bb = d.builds();
			bb.hidden = false;
			const v = d.view as number[];
			flyTo(cx(bb) + v[0], cz(bb) + v[1], v[2], v[3], v[4]);
			construct(bb, 3.4, () => resolveEffects(id, how));
		} else if (id === 'school') {
			flyTo(cx(F.school), cz(F.school), 120, 0.55);
			later(() => resolveEffects(id, how), 1200);
		} else {
			flyTo(cx(target), cz(target), 110, 0.55);
			later(() => resolveEffects(id, how), 1200);
		}
		sfxNote();
	}
	function resolveEffects(id: string, how: string) {
		const d = REQ[id];
		const t = d.at();
		const k = how === 'learned' ? 1 : 0.5;
		let n = 0;
		const r = how === 'learned' ? 110 : 70;
		S.happy = bumpNear(
			S.happy,
			city.B.filter((b) => !b.hidden).map(spotOf),
			cx(t),
			cz(t),
			r,
			0.12 * k,
			0,
			1
		);
		for (const b of city.B) {
			const dd = Math.hypot(cx(b) - cx(t), cz(b) - cz(t));
			if (dd < r && !b.hidden) {
				if (n < (how === 'learned' ? 7 : 3) && b.kind !== 'board') {
					floater(cx(b), b.h + 3 + (b.y0 || 0), cz(b), '満足 ↑', 'good');
					n++;
				}
			}
		}
		buildInfra();
		applyInfoColors();
		const lines: Record<string, string> = {
			board:
				how === 'learned'
					? '掲示板を直すたびに、直した人・日時・中身が記録庫へ流れ込む。前の文面にも戻せる。'
					: '仕組みは入ったが中身が見えない。町の誰も使い方を説明できない。',
			school:
				how === 'learned'
					? '中継器を 1 台足して振り分けた。昼休みの待ちが消えた。'
					: '回線は太くなったが、費用がかさんだ。混む理由は分からないまま。',
			shop:
				how === 'learned'
					? '前に建てた記録庫に、商店街の帳面がそのままつながった。'
					: '業者の箱が 1 つ増えた。記録庫とは別の仕組みになった。',
			clinic:
				how === 'learned'
					? '予約を表にして、日ごとの数と二重の予約がすぐ出るようになった。'
					: '機械は入ったが、数え方は業者しか分からない。',
			harbor:
				how === 'learned'
					? '事務所からだけ記録へ届くようになり、断った接続は門番の記録に残る。'
					: '見張りは付いたが、毎月の費用がかかり続ける。'
		};
		toast(
			how === 'learned' ? '要望に応えた ・ 満足度 大きく上昇' : '要望に応えた ・ 満足度 少し上昇',
			lines[id],
			how === 'learned' ? 'learn' : '',
			[
				['↻ 変化をもう一度', () => replayChange(id), ''],
				['地下の仕組みで見る', () => setView('infra'), 'pri']
			]
		);
		if (id === 'board') later(() => addRequest('shop'), 9000);
	}
	function replayChange(id: string) {
		setView('ground');
		const d = REQ[id];
		if (d.builds) {
			const bb = d.builds();
			const v = d.view as number[];
			flyTo(cx(bb) + v[0], cz(bb) + v[1], v[2], v[3], v[4]);
			construct(bb, 3.4, () => {
				for (const b of city.B)
					if (Math.hypot(cx(b) - cx(bb), cz(b) - cz(bb)) < 80 && !b.hidden && b.kind !== 'board')
						floater(cx(b), b.h + 3, cz(b), '満足 ↑', 'good');
			});
		} else {
			const t = REQ[id].at();
			flyTo(cx(t), cz(t), 120, 0.55);
			later(() => {
				setView('infra');
			}, 900);
		}
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
		keys.add(e.key.toLowerCase());
		if (e.key === ' ') {
			e.preventDefault();
			setSpeed(S.speed ? 0 : 1);
		}
		if (['1', '2', '3'].includes(e.key)) setSpeed(+e.key);
		if (e.key === 'Escape') {
			if (ui.lesson) closeLesson();
			else if (ui.dialog) closeDlg();
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
			const i = st.lots.findIndex(
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
			const req = S.requests.find((r) => REQ[r.id].at() === b);
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
			state: () => st,
			onHour,
			demand,
			S,
			cam,
			flyTo,
			setView,
			setTool,
			openReq,
			answer,
			openLesson,
			city,
			E,
			setSpeed,
			roadPlan,
			addRoad,
			snapPoint,
			placeOnLot,
			addRequest: (id: string) => addRequest(id)
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
		if (keys.has('r')) cam.v.dist *= 1 - dtR;
		if (keys.has('f')) cam.v.dist *= 1 + dtR;
		clampCam();
		if (cam.fly) {
			cam.fly.t = Math.min(1, cam.fly.t + dtR / 1.4);
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
			const t = tick(clk, clk + whole);
			clk = t.minute;
			for (const ev of t.events) {
				if (ev.type === 'day') onNewDay();
				else onHour();
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
			for (const c of cars) {
				if (c.phase !== 'seg') c.lead = null;
				stepCar(c, dtR * Math.min(mult, 3));
			}
			for (const p of peds) {
				p.s += p.v * dtR * Math.min(mult, 3);
				p.bob += dtR * 8;
			}
			for (const b of boats) {
				b.ph = (b.ph || 0) + dtR * 1.5;
				if (b.kind === 'ferry') {
					const P = b.path as number[][];
					b.t = ((b.t as number) + (dtR * Math.min(mult, 3) * b.sp) / 150) % P.length;
					const i = Math.floor(b.t),
						f = b.t - i,
						A = P[i],
						B2 = P[(i + 1) % P.length];
					b.x = A[0] + (B2[0] - A[0]) * f;
					b.z = A[1] + (B2[1] - A[1]) * f;
					b.h = Math.atan2(B2[1] - A[1], B2[0] - A[0]);
				} else {
					b.a = (b.a as number) + b.sp * dtR * Math.min(mult, 3);
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
			cn.p = Math.min(1, cn.p + dtR / cn.dur);
			const e = cn.p < 0.25 ? 0 : (cn.p - 0.25) / 0.75;
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
			glow: ['glow']
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
		for (const r of S.requests) {
			const el = markerEls.get(r.id);
			if (!el) continue;
			const b = REQ[r.id].at();
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
			const p = proj(f.x, f.y + f.t * 6, f.z);
			if (!p || f.t > 2.4) {
				if (f.t > 2.4) {
					f.el.remove();
					floats.splice(i, 1);
				}
				continue;
			}
			f.el.style.transform = `translate(${p[0]}px, ${p[1]}px)`;
			f.el.style.opacity = String(f.t < 0.2 ? f.t / 0.2 : Math.max(0, 1 - (f.t - 1.6) / 0.8));
		}
		if (Math.floor(now / 250) !== Math.floor((now - dtR * 1000) / 250)) renderHUD();
		if (S.sel && Math.floor(now / 1000) !== Math.floor((now - dtR * 1000) / 1000)) select(S.sel);
		if (!STILL) raf = requestAnimationFrame(frame);
	}
	function onNewDay() {
		if (S.day === 11 && !S.answered.school) addRequest('school');
		if (S.day === 12 && !S.answered.clinic) addRequest('clinic');
		if (S.day === 13 && !S.answered.harbor) addRequest('harbor');
		for (const r of S.requests)
			if (r.due < S.day) {
				toast('期限を過ぎた', REQ[r.id].who + 'の満足度が下がった', 'warn');
				const t = REQ[r.id].at();
				S.happy = bumpNear(S.happy, SPOTS, cx(t), cz(t), 90, -0.08, 0.2, 1);
				r.due = S.day + 2;
			}
		renderReqs();
		if (S.view !== 'ground') applyInfoColors();
	}
	// initial
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
	if (!STILL) {
		ui.dialog = { kind: 'intro' };
		S.prevSpeed = 1;
		setSpeed(0);
	} else later(() => addRequest('board'), 1800);
	function startIntro() {
		closeDlg();
		later(() => addRequest('board'), 2500);
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
		answer,
		openLesson,
		closeLesson,
		finishLesson,
		startIntro,
		toggleBudget,
		select: () => select(null),
		dispose() {
			stopped = true;
			cancelAnimationFrame(raf);
			for (const t of timers) clearTimeout(t);
			for (const off of offs) off();
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

// ---------------- 試作の簡略な解説の中身（試作のまま。8-2c で段 6 の再生装置につなぎ替える） ----------------
const LESSON_DATA: Record<string, LessonData> = {
	git: {
		title: '変更を記録して共有する',
		tool: 'Git',
		edges: [
			['desk', 'vault', '記録する'],
			['vault', 'shelf', '送る']
		],
		vh: 180,
		nodes: [
			{ id: 'desk', x: 95, y: 82, label: '手元の机', sub: '作業中の文面' },
			{ id: 'vault', x: 300, y: 82, label: '記録庫', sub: '直した履歴' },
			{ id: 'shelf', x: 505, y: 82, label: 'みんなの棚', sub: '町で共有' }
		],
		steps: [
			{
				t: '掲示板の文面を直す',
				d: '机の上にある「祭り 10/12」を「祭り 10/19」に書き換える。まだどこにも残っていない。',
				cmd: '（文面を編集）',
				facts: [
					['机', '10/19（直した）'],
					['記録庫', 'まだ空'],
					['棚', '10/12 のまま']
				],
				tok: { v1: ['desk', '10/12', 0, -36, 0], v2: ['desk', '10/19', 1, 36, 0] }
			},
			{
				t: '直した内容を記録する',
				d: '直した文面を記録庫に入れる。前の文面も消えずに一緒に残る。',
				cmd: 'git commit -m "祭りの日付を直す"',
				facts: [
					['机', '10/19'],
					['記録庫', '10/12 → 10/19 の 2 件'],
					['棚', '10/12 のまま']
				],
				tok: { v1: ['vault', '10/12', 1, -36, 0], v2: ['vault', '10/19', 1, 36, 0] }
			},
			{
				t: '記録には名前と日時がつく',
				d: '1 件ごとに「誰が・いつ・何を」が付く。あとから見れば、書き換えた人が分かる。',
				cmd: 'git log',
				facts: [
					['10/19 の記録', '会長 ・ 11/10 15:42'],
					['10/12 の記録', '事務 ・ 10/01 09:10']
				],
				tok: {
					v1: ['vault', '10/12', 0, -36, 0],
					v2: ['vault', '10/19', 1, 36, 0],
					tag: ['vault', '会長 11/10', 1, 36, 30]
				}
			},
			{
				t: 'みんなの棚に送る',
				d: '記録庫の最新をみんなの棚に送る。町の誰が見ても 10/19 になる。',
				cmd: 'git push',
				facts: [
					['棚', '10/19（最新）'],
					['記録庫', '2 件のまま']
				],
				tok: {
					v1: ['vault', '10/12', 0, -36, 0],
					v2: ['shelf', '10/19', 1, 0, 0],
					tag: ['vault', '会長 11/10', 0, 36, 30]
				}
			},
			{
				t: '前の文面に戻す',
				d: '間違いだったら、記録庫から 10/12 を取り出して戻せる。戻したこと自体も記録に残る。',
				cmd: 'git revert HEAD',
				facts: [
					['机', '10/12（戻した）'],
					['記録庫', '3 件（戻した記録も残る）']
				],
				tok: {
					v1: ['desk', '10/12', 1, 0, 0],
					v2: ['shelf', '10/19', 0, 0, 0],
					tag: ['vault', '戻した記録', 1, 0, 30]
				}
			}
		]
	},
	net: {
		title: '混む通り道を分ける',
		tool: 'ネットワーク',
		edges: [
			['room', 'ap1', ''],
			['room', 'ap2', ''],
			['ap1', 'net', ''],
			['ap2', 'net', '']
		],
		vh: 240,
		nodes: [
			{ id: 'room', x: 95, y: 120, label: '教室の端末', sub: '30 台' },
			{ id: 'ap1', x: 300, y: 70, label: '中継器 1', sub: '1 台で受ける' },
			{ id: 'ap2', x: 300, y: 175, label: '中継器 2', sub: 'まだ無い' },
			{ id: 'net', x: 505, y: 120, label: '資料の置き場', sub: '学校の中' }
		],
		steps: [
			{
				t: '端末が 1 台の中継器に集まる',
				d: '昼休み、30 台が同じ中継器に一斉につなぐ。',
				cmd: '（観察）',
				facts: [
					['中継器 1', '30 台'],
					['中継器 2', '無し']
				],
				tok: {
					a: ['room', '端末', 1, -28, 0],
					b: ['room', '端末', 1, 28, 0],
					c: ['room', '端末', 1, 80, 0]
				}
			},
			{
				t: '順番待ちができる',
				d: '中継器は一度に少しずつしか送れないので、待ち行列ができて資料が開かない。',
				cmd: 'ping 資料の置き場 → 遅い',
				facts: [
					['待ち', '長い'],
					['応答', '2 秒以上']
				],
				tok: {
					a: ['ap1', '待ち', 1, -44, 0],
					b: ['ap1', '待ち', 1, 0, 0],
					c: ['ap1', '待ち', 1, 44, 0]
				}
			},
			{
				t: '中継器をもう 1 台置く',
				d: '廊下の反対側に中継器 2 を置く。電源とケーブルだけで済む。',
				cmd: '（中継器 2 を設置）',
				facts: [['中継器 2', '設置した']],
				tok: {
					a: ['ap1', '待ち', 1, -44, 0],
					b: ['ap1', '待ち', 1, 0, 0],
					c: ['ap1', '待ち', 1, 44, 0]
				}
			},
			{
				t: '近い方へ振り分ける',
				d: '端末を近い中継器へ分ける。1 台あたり 15 台になり、待ちが半分になる。',
				cmd: '（振り分けを設定）',
				facts: [
					['中継器 1', '15 台'],
					['中継器 2', '15 台']
				],
				tok: {
					a: ['ap1', '端末', 1, -20, 0],
					b: ['ap2', '端末', 1, -20, 0],
					c: ['ap2', '端末', 1, 28, 0]
				}
			},
			{
				t: '資料がすぐ開く',
				d: '待ちが減って、昼休みでも資料が開くようになる。',
				cmd: 'ping 資料の置き場 → 速い',
				facts: [
					['応答', '0.1 秒'],
					['待ち', 'ほぼ無し']
				],
				tok: {
					a: ['net', '届いた', 1, -36, 0],
					b: ['net', '届いた', 1, 16, 0],
					c: ['net', '届いた', 1, 68, 0]
				}
			}
		]
	},
	db: {
		title: '帳簿の数を数える',
		tool: 'SQL',
		vh: 180,
		edges: [
			['paper', 'table', '入れる'],
			['table', 'ask', '数える']
		],
		nodes: [
			{ id: 'paper', x: 95, y: 82, label: '受付の帳面', sub: '紙に手書き' },
			{ id: 'table', x: 300, y: 82, label: '予約の表', sub: '1 行 1 件' },
			{ id: 'ask', x: 505, y: 82, label: '問い合わせ', sub: '数を出す' }
		],
		steps: [
			{
				t: '帳面に予約が書いてある',
				d: '紙の帳面に予約がばらばらに書いてある。数えるたびに数え間違える。',
				cmd: '（帳面を見る）',
				facts: [
					['帳面', '3 件の書き込み'],
					['表', 'まだ無い']
				],
				tok: {
					a: ['paper', '佐藤 11/12', 0, -40, -8],
					b: ['paper', '田中 11/12', 0, 40, -8],
					c: ['paper', '佐藤 11/12', 1, 0, 24]
				}
			},
			{
				t: '表に 1 行ずつ入れる',
				d: '1 件を 1 行にして表に入れる。名前と日付の欄に分ける。',
				cmd: "INSERT INTO yoyaku (name, day) VALUES ('佐藤', '11/12');",
				facts: [
					['表', '3 行'],
					['欄', 'name ・ day']
				],
				tok: {
					a: ['table', '佐藤 11/12', 0, -40, -8],
					b: ['table', '田中 11/12', 0, 40, -8],
					c: ['table', '佐藤 11/12', 0, 0, 24]
				}
			},
			{
				t: '日付で絞る',
				d: '明日（11/12）の行だけを取り出す。',
				cmd: "SELECT * FROM yoyaku WHERE day = '11/12';",
				facts: [['当たった行', '3 行']],
				tok: {
					a: ['table', '佐藤 11/12', 1, -40, -8],
					b: ['table', '田中 11/12', 1, 40, -8],
					c: ['table', '佐藤 11/12', 1, 0, 24]
				}
			},
			{
				t: '数を数える',
				d: '絞った行の数を数える。紙で数えるより速く、何度数えても同じ数になる。',
				cmd: "SELECT COUNT(*) FROM yoyaku WHERE day = '11/12';",
				facts: [['答え', '3']],
				tok: {
					a: ['table', '佐藤 11/12', 0, -40, -8],
					b: ['table', '田中 11/12', 0, 40, -8],
					c: ['table', '佐藤 11/12', 0, 0, 24],
					n: ['ask', '3 件', 1, 0, 0]
				}
			},
			{
				t: '二重の予約を見つける',
				d: '同じ名前でまとめて、2 回以上ある人を探す。佐藤さんが二重だった。',
				cmd: 'SELECT name, COUNT(*) FROM yoyaku GROUP BY name HAVING COUNT(*) > 1;',
				facts: [
					['二重', '佐藤 2 件'],
					['本当の数', '2 人']
				],
				tok: {
					a: ['table', '佐藤 11/12', 1, -40, -8],
					b: ['table', '田中 11/12', 0, 40, -8],
					c: ['table', '佐藤 11/12', 1, 0, 24],
					n: ['ask', '佐藤が二重', 1, 0, 0]
				}
			}
		]
	},
	sec: {
		title: '入口を絞る',
		tool: 'ファイアウォール',
		vh: 180,
		edges: [
			['out', 'gate', 'つなぐ'],
			['gate', 'rec', '通す']
		],
		nodes: [
			{ id: 'out', x: 95, y: 82, label: '外の網', sub: '事務所と知らない所' },
			{ id: 'gate', x: 300, y: 82, label: '門番', sub: 'まだ無い' },
			{ id: 'rec', x: 505, y: 82, label: '荷の記録', sub: '倉庫の機械' }
		],
		steps: [
			{
				t: '全ての口が開いている',
				d: '記録の機械は、どこからつないでも返事をする。',
				cmd: '（観察）',
				facts: [['開いている口', '全部']],
				tok: {
					a: ['out', '事務所', 0, -40, -8],
					b: ['out', '知らない所', 1, 40, -8],
					c: ['out', '知らない所', 1, 0, 24]
				}
			},
			{
				t: '知らない所から記録まで届く',
				d: '夜中の知らない所からの接続が、そのまま記録まで届いてしまう。',
				cmd: '（記録の機械の跡を見る）',
				facts: [
					['届いた接続', '3 件'],
					['うち知らない所', '2 件']
				],
				tok: {
					a: ['rec', '事務所', 0, -40, -8],
					b: ['rec', '知らない所', 1, 40, -8],
					c: ['rec', '知らない所', 1, 0, 24]
				}
			},
			{
				t: '門番を置く',
				d: '記録の前に門番を置く。決まりに当たる接続だけを通す。',
				cmd: 'deny all',
				facts: [['門番', '置いた ・ まず全部断る']],
				tok: {
					a: ['gate', '事務所', 0, -40, -8],
					b: ['gate', '知らない所', 1, 40, -8],
					c: ['gate', '知らない所', 1, 0, 24]
				}
			},
			{
				t: '事務所だけ通す',
				d: '事務所から記録の口への接続だけを許す決まりを足す。',
				cmd: 'allow from 事務所 to 記録 port 443',
				facts: [
					['通した', '事務所 1 件'],
					['断った', '知らない所 2 件']
				],
				tok: {
					a: ['rec', '事務所', 1, 0, 0],
					b: ['gate', '断った', 1, 40, -8],
					c: ['gate', '断った', 1, 0, 24]
				}
			},
			{
				t: '断った記録を残す',
				d: '断った接続を記録に残す。何度来たか、どこからかが後で分かる。',
				cmd: 'log deny',
				facts: [['断った記録', '2 件 ・ 夜中 2:10 と 2:12']],
				tok: { a: ['rec', '事務所', 0, 0, 0], b: ['gate', '断った 2 件', 1, 0, 8] }
			}
		]
	}
};
