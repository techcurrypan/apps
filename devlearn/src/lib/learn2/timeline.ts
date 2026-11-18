// 第 2 版の動きの時間軸（screen-design.md 11.4・learn-standard.md 第 2 章・CLAUDE.md 第 8 章）。
// 画面に出る全ての物を (レッスン, ステップ, 入ってからの ms) だけから決める純粋な関数。乱数も時計も読まない。
// 描く側は requestAnimationFrame で t を進め、この関数の返す絵を描くだけ（状態を変えない）。
import type { Cue, CueDo, ImplContext, Lesson, Step } from '../lesson/types.ts';
import {
	along,
	fitView,
	lerpView,
	rectOfId,
	type Geo,
	type Pt,
	type Rect,
	type View
} from './geo.ts';

export type Tone = 'ok' | 'warn' | 'bad' | 'none';
export type NodeF = {
	id: string;
	opacity: number;
	scale: number;
	/** このステップで寄っている物 */
	hot: boolean;
	/** 赤く点滅（0〜1） */
	flash: number;
	failed: boolean;
	/** 輪が広がる（0〜1。null は無し） */
	ring: number | null;
	gone: boolean;
};
export type BadgeF = { id: string; text: string; tone: Tone; pulse: number };
export type LinkF = { id: string; draw: number };
export type EdgeF = { id: string; draw: number; active: boolean; broken: boolean };
export type PacketF = {
	key: string;
	path: string; // 道の id（data-link）
	label: string;
	kind: string;
	p: number;
	pos: Pt;
	state: 'go' | 'drop' | 'stall';
	fall: number;
};
export type ItemF = {
	id: string;
	queue: string;
	x: number;
	y: number;
	opacity: number;
	lift: number;
	fresh: boolean;
};
export type QueueF = { id: string; count: number };
export type MetricF = { key: string; text: string; moving: boolean };
export type BoardF = { text: string; shown: boolean; active: boolean };
export type ContextF = { at: string; to: ImplContext; k: number };
export type Frame = {
	step: number;
	t: number;
	view: View;
	fit: string[];
	nodes: NodeF[];
	badges: BadgeF[];
	links: LinkF[];
	edges: EdgeF[];
	packets: PacketF[];
	items: ItemF[];
	queues: QueueF[];
	metrics: MetricF[];
	board: BoardF[];
	para: { active: number; shown: number[] };
	contexts: ContextF[];
	done: boolean;
	looping: boolean;
};
/** insetR：図の右に重ねる出来事の札の幅（px）。寄りはその左に入れる */
export type FrameOpts = { sw: number; sh: number; reduced: boolean; insetR?: number };

const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const clamp01 = (k: number) => Math.max(0, Math.min(1, k));
const win = (t: number, at: number, dur: number) => clamp01((t - at) / Math.max(1, dur));

/** 合図が全て終わる時刻 */
export function endOf(s: Step): number {
	return Math.max(0, ...(s.motion ?? []).map((c) => c.at + c.dur));
}
const loopPeriod = (s: Step): number =>
	Array.isArray(s.loop) && s.loop.length ? Math.max(...s.loop.map((c) => c.at + c.dur)) + 400 : 0;

/** 文字の中の最初の数（小数の桁も） */
export function numberIn(s: string): { n: number; dec: number } | null {
	const m = /-?\d[\d,]*(?:\.(\d+))?/.exec(s);
	if (!m) return null;
	return { n: Number(m[0].replace(/,/g, '')), dec: m[1]?.length ?? 0 };
}
function countText(from: string, to: string, k: number): string {
	const b = numberIn(to);
	if (!b) return k >= 1 ? to : from;
	const a = numberIn(from)?.n ?? 0;
	const v = a + (b.n - a) * k;
	const s = k >= 1 ? null : v.toFixed(b.dec);
	if (s === null) return to;
	const m = /-?\d[\d,]*(?:\.\d+)?/.exec(to)!;
	return to.slice(0, m.index) + s + to.slice(m.index + m[0].length);
}

// ---- ステップをまたいで残る物（ステップの後の形） ----

type After = {
	view: View;
	fit: string[];
	badges: Map<string, { text: string; tone: Tone }>;
	metrics: Map<string, string>;
	failed: Set<string>;
	gone: Set<string>;
};

const cache = new WeakMap<Lesson, Map<string, After>>();

function fitOf(s: Step): string[] {
	const c = [...(s.motion ?? [])].reverse().find((x) => x.do.op === 'camera');
	return c && c.do.op === 'camera' ? c.do.fit : [];
}

function viewFor(g: Geo, ids: readonly string[], o: FrameOpts): View {
	const rs = ids.map((id) => rectOfId(g, id)).filter((r): r is Rect => !!r);
	const inset = Math.min(o.insetR ?? 0, o.sw * 0.4);
	const v = fitView(rs.length ? rs : [g.all], o.sw - inset, o.sh);
	return { ...v, w: v.w + inset / v.scale };
}

/** ステップ s（0 は概要）の後の形 */
function after(l: Lesson, g: Geo, s: number, o: FrameOpts): After {
	let m = cache.get(l);
	if (!m) cache.set(l, (m = new Map()));
	const key = `${s}|${o.sw}|${o.sh}|${o.insetR ?? 0}`;
	const hit = m.get(key);
	if (hit) return hit;
	let r: After;
	if (s <= 0) {
		const ids = [...g.nodes.keys()];
		r = {
			view: viewFor(g, ids.length ? ids : [...g.boxes.keys()], o),
			fit: ids,
			badges: new Map(),
			metrics: new Map((l.metrics ?? []).map((x) => [x.key, '—'])),
			failed: new Set(),
			gone: new Set()
		};
	} else {
		const prev = after(l, g, s - 1, o);
		const st = l.explain[s - 1];
		const badges = new Map(prev.badges);
		const failed = new Set(prev.failed);
		const gone = new Set(prev.gone);
		for (const c of [...(st.motion ?? [])].sort((a, b) => a.at - b.at)) {
			const d = c.do;
			if (d.op === 'badge') {
				badges.set(d.id, { text: d.text, tone: d.tone ?? 'ok' });
				if (d.tone !== 'bad') failed.delete(d.id);
			}
			if (d.op === 'fail') failed.add(d.id);
			if (d.op === 'vanish') gone.add(d.id);
		}
		for (const [id, text] of Object.entries(st.badges ?? {}))
			badges.set(id, { text, tone: badges.get(id)?.tone ?? 'ok' });
		const metrics = new Map(prev.metrics);
		for (const [k, v] of Object.entries(st.metrics ?? {})) metrics.set(k, v);
		const fit = fitOf(st);
		r = {
			view: fit.length ? viewFor(g, fit, o) : prev.view,
			fit: fit.length ? fit : prev.fit,
			badges,
			metrics,
			failed,
			gone
		};
	}
	m.set(key, r);
	return r;
}

// ---- キュー（LS-M14）：合図ごとの中身の写しを作り、合図の間は前後の写しの間を動く ----

type QState = Map<string, string[]>; // キュー → 要素（先頭から）
type QStep = {
	at: number;
	dur: number;
	before: QState;
	after: QState;
	peek?: { queue: string; item: string };
	fresh: Set<string>;
};

function cloneQ(q: QState): QState {
	return new Map([...q].map(([k, v]) => [k, [...v]]));
}
function applyQ(q: QState, d: CueDo): { next: QState; fresh: Set<string> } | null {
	const n = cloneQ(q);
	const fresh = new Set<string>();
	const find = (item: string) => [...n.entries()].find(([, v]) => v.includes(item));
	switch (d.op) {
		case 'enqueue':
			n.set(d.queue, [...(n.get(d.queue) ?? []), d.item]);
			fresh.add(d.item);
			break;
		case 'dequeue': {
			const v = n.get(d.queue) ?? [];
			const i = v.indexOf(d.item);
			if (i >= 0) v.splice(i, 1);
			break;
		}
		case 'move': {
			const v = n.get(d.from) ?? [];
			const i = v.indexOf(d.item);
			if (i >= 0) v.splice(i, 1);
			n.set(d.to, [...(n.get(d.to) ?? []), d.item]);
			break;
		}
		case 'clone': {
			const f = find(d.item);
			if (!f) return null;
			f[1].splice(f[1].indexOf(d.item) + 1, 0, d.as);
			fresh.add(d.as);
			break;
		}
		case 'split': {
			const f = find(d.item);
			if (!f) return null;
			f[1].splice(f[1].indexOf(d.item), 1, ...d.into);
			for (const x of d.into) fresh.add(x);
			break;
		}
		case 'merge': {
			const f = find(d.items[0]);
			if (!f) return null;
			const i = f[1].indexOf(d.items[0]);
			for (const x of d.items) {
				const j = f[1].indexOf(x);
				if (j >= 0) f[1].splice(j, 1);
			}
			f[1].splice(i, 0, d.into);
			fresh.add(d.into);
			break;
		}
		case 'peek':
			return { next: n, fresh };
		default:
			return null;
	}
	return { next: n, fresh };
}
function initialQ(s: Step): QState {
	const q: QState = new Map();
	for (const ly of s.layers ?? [])
		for (const b of ly.boxes) for (const x of b.queues ?? []) q.set(x.id, [...x.items]);
	return q;
}
function qsteps(start: QState, cues: readonly Cue[]): QStep[] {
	const out: QStep[] = [];
	let cur = start;
	for (const c of [...cues].sort((a, b) => a.at - b.at)) {
		const r = applyQ(cur, c.do);
		if (!r) continue;
		out.push({
			at: c.at,
			dur: c.dur,
			before: cur,
			after: r.next,
			peek: c.do.op === 'peek' ? { queue: c.do.queue, item: c.do.item } : undefined,
			fresh: r.fresh
		});
		cur = r.next;
	}
	return out;
}
function itemsAt(g: Geo, start: QState, steps: QStep[], t: number): ItemF[] {
	// 今の合図（t が窓の中）か、最後に終わった合図の後の形
	let base = start;
	let active: QStep | null = null;
	for (const q of steps) {
		if (t >= q.at + q.dur) base = q.after;
		else if (t >= q.at) {
			active = q;
			break;
		} else break;
	}
	const place = (st: QState) => {
		const m = new Map<string, { queue: string; x: number; y: number }>();
		for (const [qid, items] of st) {
			const gq = g.queues.get(qid);
			if (!gq) continue;
			items.forEach((it, i) => {
				const r = gq.slot(Math.min(i, gq.slots - 1));
				m.set(it, { queue: qid, x: r.x, y: r.y });
			});
		}
		return m;
	};
	const out: ItemF[] = [];
	if (!active) {
		for (const [id, p] of place(base)) out.push({ id, ...p, opacity: 1, lift: 0, fresh: false });
		return out;
	}
	const k = ease(win(t, active.at, active.dur));
	const a = place(active.before);
	const b = place(active.after);
	for (const [id, pb] of b) {
		const pa = a.get(id);
		if (pa) {
			const lift = active.peek && active.peek.item === id ? Math.sin(Math.PI * clamp01(k)) * 12 : 0;
			out.push({
				id,
				queue: k < 0.5 ? pa.queue : pb.queue,
				x: pa.x + (pb.x - pa.x) * k,
				y: pa.y + (pb.y - pa.y) * k - (pa.queue !== pb.queue ? Math.sin(Math.PI * k) * 40 : 0),
				opacity: 1,
				lift,
				fresh: false
			});
		} else
			out.push({
				id,
				queue: pb.queue,
				x: pb.x - (1 - k) * 40,
				y: pb.y + (active.fresh.has(id) ? (1 - k) * 14 : 0),
				opacity: k,
				lift: 0,
				fresh: true
			});
	}
	for (const [id, pa] of a)
		if (!b.has(id))
			out.push({ id, ...pa, x: pa.x + k * 40, opacity: 1 - k, lift: 0, fresh: false });
	return out;
}

// ---- 1 枚の絵 ----

export function frameAt(l: Lesson, g: Geo, s: number, tIn: number, o: FrameOpts): Frame {
	const step = s >= 1 ? l.explain[s - 1] : null;
	const prev = after(l, g, Math.max(0, s - 1), o);
	const fin = after(l, g, s, o);
	const motion = step ? [...(step.motion ?? [])].sort((a, b) => a.at - b.at) : [];
	const end = step ? endOf(step) : 0;
	const t = o.reduced ? end + 1 : tIn;
	const done = t >= end;
	const period = step && !o.reduced ? loopPeriod(step) : 0;
	const looping = !!step && period > 0 && t > end + 300;
	const lt = looping ? (t - end - 300) % period : -1;
	const loopCues = step && Array.isArray(step.loop) ? step.loop : [];
	// 今流れている合図（ステップの合図と、続く流れの今の周）
	const live: { c: Cue; t: number }[] = [
		...motion.map((c) => ({ c, t })),
		...(looping ? loopCues.map((c) => ({ c, t: lt })) : [])
	];

	// 寄り
	const cam = motion.find((c) => c.do.op === 'camera');
	let view = fin.view;
	if (s === 0) view = fin.view;
	else if (cam && !o.reduced) view = lerpView(prev.view, fin.view, ease(win(t, cam.at, cam.dur)));
	const fit = s === 0 ? fin.fit : fin.fit;

	// 機械
	const appearAt = new Map<string, number>();
	if (step) {
		const fresh = [...g.nodes.values()].filter((n) => n.step === s);
		const base = cam ? cam.at + cam.dur * 0.5 : 0;
		fresh.forEach((n, i) => appearAt.set(n.id, base + i * 100));
		for (const c of motion) if (c.do.op === 'appear') appearAt.set(c.do.id, c.at);
	}
	const nodes: NodeF[] = [];
	for (const n of g.nodes.values()) {
		if (s > 0 && n.step > s) continue;
		if (prev.gone.has(n.id) && s > 0) continue;
		const ap = s === 0 ? n.step * 0 : appearAt.get(n.id);
		const k = ap === undefined ? 1 : o.reduced ? 1 : ease(win(t, ap, 400));
		let flash = 0;
		let ring: number | null = null;
		let gone = false;
		let failed = prev.failed.has(n.id);
		for (const { c, t: ct } of live) {
			const d = c.do;
			if (d.op === 'pulse' && d.id === n.id && ct >= c.at && ct < c.at + c.dur)
				ring = win(ct, c.at, c.dur);
			if (d.op === 'fail' && d.id === n.id && ct >= c.at) {
				if (ct < c.at + c.dur) flash = 0.5 + 0.5 * Math.sin(((ct - c.at) / 120) * Math.PI);
				else failed = true;
			}
			if (d.op === 'vanish' && d.id === n.id && ct >= c.at) gone = true;
			if (d.op === 'badge' && d.id === n.id && ct >= c.at && d.tone !== 'bad') failed = false;
		}
		nodes.push({
			id: n.id,
			opacity: gone ? 0.35 : k,
			scale: 0.6 + 0.4 * k,
			hot: fit.includes(n.id),
			flash,
			failed,
			ring,
			gone
		});
	}

	// 状態の札
	const badges: BadgeF[] = [];
	const bmap = new Map([...prev.badges].map(([id, v]) => [id, { ...v, pulse: 0 }]));
	for (const { c, t: ct } of live) {
		const d = c.do;
		if (d.op === 'badge' && ct >= c.at) {
			const p = win(ct, c.at, 450);
			bmap.set(d.id, {
				text: d.text,
				tone: d.tone ?? 'ok',
				pulse: p < 1 ? Math.sin(Math.PI * p) : 0
			});
		}
	}
	if (done && step)
		for (const [id, text] of Object.entries(step.badges ?? {})) {
			const cur = bmap.get(id);
			bmap.set(id, { text, tone: cur?.tone ?? 'ok', pulse: cur?.pulse ?? 0 });
		}
	for (const [id, v] of bmap)
		if (nodes.some((n) => n.id === id) || g.boxes.has(id)) badges.push({ id, ...v });

	// 線
	const links: LinkF[] = g.links.map((k) => {
		const na = g.nodes.get(k.a)!;
		const nb = g.nodes.get(k.b)!;
		if (s > 0 && (na.step > s || nb.step > s)) return { id: k.id, draw: 0 };
		const ta = appearAt.get(k.a);
		const tb = appearAt.get(k.b);
		if (ta === undefined && tb === undefined) return { id: k.id, draw: 1 };
		const from = Math.max(ta ?? 0, tb ?? 0) + 250;
		const lc = motion.find(
			(c) =>
				c.do.op === 'link' &&
				((c.do.a === k.a && c.do.b === k.b) || (c.do.a === k.b && c.do.b === k.a))
		);
		return {
			id: k.id,
			draw: o.reduced ? 1 : lc ? ease(win(t, lc.at, lc.dur)) : ease(win(t, from, 500))
		};
	});

	// 道（層の図の荷物の道）。全て薄く描き、このステップの道を濃く
	const brokenTo = new Set<string>();
	for (const { c, t: ct } of live) if (c.do.op === 'context' && ct >= c.at) brokenTo.add(c.do.at);
	const edges: EdgeF[] = g.edges.map((e) => {
		const active = s > 0 && e.steps.includes(s);
		const first = active
			? motion.find((c) => c.do.op === 'packet' && c.do.a === e.a && c.do.b === e.b)
			: undefined;
		const draw = first && !o.reduced ? ease(win(t, first.at - 350, 350)) : 1;
		return { id: e.id, draw, active, broken: active && brokenTo.has(e.b) };
	});

	// 荷物
	const packets: PacketF[] = [];
	live.forEach(({ c, t: ct }, i) => {
		const d = c.do;
		if (d.op !== 'packet' || o.reduced) return;
		if (ct < c.at) return;
		const lk = g.links.find((x) => (x.a === d.a && x.b === d.b) || (x.a === d.b && x.b === d.a));
		const ed = g.edges.find((x) => x.a === d.a && x.b === d.b);
		const path = ed
			? { id: ed.id, from: ed.from, to: ed.to }
			: lk
				? lk.a === d.a
					? { id: lk.id, from: lk.from, to: lk.to }
					: { id: lk.id, from: lk.to, to: lk.from, rev: true }
				: null;
		if (!path) return;
		const raw = (ct - c.at) / Math.max(1, c.dur);
		const key = `${i}-${d.a}-${d.b}`;
		if (d.stall) {
			if (raw > 1.6 && looping) return;
			const p = Math.min(raw, 1) * 0.5;
			const shake = raw > 1 ? Math.sin(ct / 40) * 2 : 0;
			const pos = along(path.from, path.to, p);
			packets.push({
				key,
				path: path.id,
				label: d.label,
				kind: d.kind,
				p,
				pos: { x: pos.x + shake, y: pos.y },
				state: 'stall',
				fall: 0
			});
			return;
		}
		if (raw >= 1) return;
		if (d.drop && raw > 0.55) {
			const f = (raw - 0.55) / 0.45;
			const pos = along(path.from, path.to, 0.55);
			packets.push({
				key,
				path: path.id,
				label: d.label,
				kind: d.kind,
				p: 0.55,
				pos: { x: pos.x, y: pos.y + f * 90 },
				state: 'drop',
				fall: f
			});
			return;
		}
		const p = raw;
		const real = 'rev' in path ? 1 - p : p;
		packets.push({
			key,
			path: path.id,
			label: d.label,
			kind: d.kind,
			p: real,
			pos: along(path.from, path.to, p),
			state: 'go',
			fall: 0
		});
	});

	// キュー
	let items: ItemF[] = [];
	const counts = new Map<string, number>();
	if (step?.layers?.length) {
		const start = initialQ(step);
		const qs = qsteps(start, motion);
		const endQ = qs.length ? qs[qs.length - 1].after : start;
		if (looping) items = itemsAt(g, endQ, qsteps(endQ, loopCues), lt);
		else items = itemsAt(g, start, qs, t);
		for (const q of g.queues.keys()) counts.set(q, 0);
		for (const it of items)
			if (it.opacity > 0.5) counts.set(it.queue, (counts.get(it.queue) ?? 0) + 1);
	}
	const queues: QueueF[] = [...counts].map(([id, count]) => ({ id, count }));

	// 指標
	const metrics: MetricF[] = (l.metrics ?? []).map((m) => {
		let text = prev.metrics.get(m.key) ?? '—';
		let moving = false;
		for (const c of motion) {
			const d = c.do;
			if (d.op !== 'count' || d.metric !== m.key || t < c.at) continue;
			const k = win(t, c.at, c.dur);
			text = countText(text === '—' ? '0' : text, d.to, k);
			moving = k < 1;
		}
		if (done && step?.metrics?.[m.key] !== undefined) text = step.metrics[m.key];
		return { key: m.key, text, moving };
	});

	// 出来事の札
	const lines = step?.board ?? [];
	const bcues = motion.filter((c) => c.do.op === 'board');
	let activeLine = -1;
	const shown = lines.map((_, i) => {
		if (o.reduced) return true;
		const c = bcues.find((x) => x.do.op === 'board' && x.do.line >= i);
		const when = c ? c.at : 300 + i * Math.max(400, end / Math.max(1, lines.length));
		return t >= when;
	});
	for (const { c, t: ct } of live) if (c.do.op === 'board' && ct >= c.at) activeLine = c.do.line;
	if (activeLine < 0) activeLine = shown.lastIndexOf(true);
	const board: BoardF[] = lines.map((text, i) => ({
		text,
		shown: shown[i],
		active: i === activeLine
	}));

	// 段落
	const paraShown = new Set<number>([0]);
	let paraActive = 0;
	let lastStart = -1;
	for (const c of motion) {
		if (c.para === undefined) continue;
		if (o.reduced || t >= c.at) {
			paraShown.add(c.para);
			if (c.at >= lastStart && (o.reduced || t >= c.at)) {
				lastStart = c.at;
				paraActive = c.para;
			}
		}
	}
	if (o.reduced) paraActive = -1;

	// 文脈の切り替え（LS-M15）
	const contexts: ContextF[] = [];
	for (const { c, t: ct } of live)
		if (c.do.op === 'context' && ct >= c.at)
			contexts.push({ at: c.do.at, to: c.do.to, k: win(ct, c.at, c.dur) });

	return {
		step: s,
		t,
		view,
		fit,
		nodes,
		badges,
		links,
		edges,
		packets,
		items,
		queues,
		metrics,
		board,
		para: { active: paraActive, shown: [...paraShown].sort((a, b) => a - b) },
		contexts,
		done,
		looping
	};
}
