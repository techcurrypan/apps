// 図の置き方（LS-D1〜D6）。機械の位置・区画の枠・線の道筋・線の名前・番号の丸を、レッスンだけから決める。
// 線の名前と番号の丸は、機械の文字・名札・ほかの名前と重ならない所を探して置く（LS-D5・LS-D6。試作を上回る所）。
import type { Lesson, Link } from '../lesson/types.ts';
import { allNodes, beatsOf, beatTarget } from './model.ts';

export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export const COL_W = 236;
export const ROW_H = 222;
const X0 = 150;
const Y0 = 150;
/** 絵の中心から、線が出る所までの半径 */
export const ICON_R = 44;

export const center = (at: readonly [number, number]): Pt => ({
	x: X0 + at[0] * COL_W,
	y: Y0 + at[1] * ROW_H
});

/** 字の幅の見積もり（日本語は字の大きさ、英数字は 0.62 倍） */
export function textW(s: string, size: number): number {
	let w = 0;
	for (const ch of s) w += (ch.codePointAt(0) ?? 0) > 0xff ? size : size * 0.62;
	return w;
}

export type NodeBoxes = { icon: Rect; text: Rect; all: Rect };

/** 図の上に出す値の行の数と幅（機械ごと。レッスン全体での最大） */
export const PROP_LINES = 2;
export const PROP_MAX_W = 176;

/** 機械の絵と文字（名前・番地・名札・値の行）の箱。文字は絵の下 */
export function nodeBoxes(
	c: Pt,
	label: string,
	addr: string | null,
	town: string | null,
	props = 0
): NodeBoxes {
	const icon = { x: c.x - ICON_R, y: c.y - ICON_R, w: ICON_R * 2, h: ICON_R * 2 };
	const w =
		Math.max(
			textW(label, 15),
			addr ? textW(addr, 12.5) : 0,
			town ? textW('町：' + town, 12) + 20 : 0,
			props > 0 ? PROP_MAX_W : 0
		) + 8;
	const h = 24 + (addr ? 17 : 0) + (town ? 26 : 0) + props * 17;
	const text = { x: c.x - w / 2, y: c.y + ICON_R + 4, w, h };
	return { icon, text, all: union(icon, text) };
}

export const union = (a: Rect, b: Rect): Rect => {
	const x = Math.min(a.x, b.x);
	const y = Math.min(a.y, b.y);
	return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};
export const overlaps = (a: Rect, b: Rect, pad = 0) =>
	a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const grow = (r: Rect, p: number): Rect => ({
	x: r.x - p,
	y: r.y - p,
	w: r.w + 2 * p,
	h: r.h + 2 * p
});

/** 2 次のベジェ（直線は c が中点） */
export type Curve = { a: Pt; c: Pt; b: Pt };
export const at = (q: Curve, t: number): Pt => ({
	x: (1 - t) ** 2 * q.a.x + 2 * (1 - t) * t * q.c.x + t * t * q.b.x,
	y: (1 - t) ** 2 * q.a.y + 2 * (1 - t) * t * q.c.y + t * t * q.b.y
});
export const tangent = (q: Curve, t: number): number => {
	const dx = 2 * (1 - t) * (q.c.x - q.a.x) + 2 * t * (q.b.x - q.c.x);
	const dy = 2 * (1 - t) * (q.c.y - q.a.y) + 2 * t * (q.b.y - q.c.y);
	return Math.atan2(dy, dx);
};
function hitsRect(q: Curve, r: Rect): boolean {
	for (let i = 1; i < 40; i++) {
		const p = at(q, i / 40);
		if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) return true;
	}
	return false;
}
const curveLen = (q: Curve) => {
	let l = 0;
	let p = q.a;
	for (let i = 1; i <= 20; i++) {
		const n = at(q, i / 20);
		l += Math.hypot(n.x - p.x, n.y - p.y);
		p = n;
	}
	return l;
};

export type MapNodeG = {
	id: string;
	label: string;
	addr: string | null;
	town: string;
	icon: string;
	c: Pt;
	boxes: NodeBoxes;
};
export type LinkG = Link & {
	q: Curve;
	tag: Rect; // 線の名前の箱
	len: number;
};
export type ZoneG = { label: string; note: string; r: Rect };
export type MarkG = {
	k: number;
	x: number;
	y: number;
	ang: number | null;
	link: string | null;
	self: string | null;
};

export type Geometry = {
	nodes: MapNodeG[];
	links: LinkG[];
	zones: ZoneG[];
	marks: MarkG[]; // 出来事の番号の丸（全ての出来事の分。描くのは済んだ物だけ）
	bounds: Rect;
};

const IP = /\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?/;

/** 線の向きを問わない組の鍵 */
export const pairKey = (a: string, b: string) => [a, b].sort().join('|');

/** レッスン全体の図の置き方。town を出すか（名札）で文字の箱が変わる */
export function geometryOf(lesson: Lesson, withTown = true): Geometry {
	const map = lesson.map;
	const propKeys = new Map<string, Set<string>>();
	for (const st of lesson.explain)
		for (const o of st.scene)
			if (o.op === 'change') propKeys.set(o.id, (propKeys.get(o.id) ?? new Set()).add(o.k));
	const nodes: MapNodeG[] = allNodes(lesson).map((n) => {
		const m = map?.nodes[n.id];
		const sub = lesson.explain
			.flatMap((s) => s.scene)
			.find((o) => o.op === 'appear' && o.id === n.id);
		const subText = sub?.op === 'appear' ? (sub.sub ?? null) : null;
		const addr = m?.addr ?? subText?.match(IP)?.[0] ?? subText;
		const label = n.label;
		const town = m?.town ?? '';
		const c = center(n.at);
		return {
			id: n.id,
			label,
			addr: addr ?? null,
			town,
			icon: m?.icon ?? 'box',
			c,
			boxes: nodeBoxes(
				c,
				label,
				addr ?? null,
				withTown && town ? town : null,
				Math.min(PROP_LINES, propKeys.get(n.id)?.size ?? 0)
			)
		};
	});
	const byId = new Map(nodes.map((n) => [n.id, n]));

	// 線：map.links。無い組は move から作り、名前は運ぶ物にする（map の無いレッスンでも名前の無い線を作らない）
	const links: Link[] = [...(map?.links ?? [])];
	const have = new Set(links.map((l) => pairKey(l.a, l.b)));
	for (const s of lesson.explain)
		for (const o of s.scene)
			if (o.op === 'move' && o.from !== o.to && !have.has(pairKey(o.from, o.to))) {
				have.add(pairKey(o.from, o.to));
				const back = lesson.explain.some((x) =>
					x.scene.some((y) => y.op === 'move' && y.from === o.to && y.to === o.from)
				);
				links.push({ a: o.from, b: o.to, label: o.payload, dir: back ? 'both' : 'ab' });
			}

	const blocks: Rect[] = nodes.flatMap((n) => [grow(n.boxes.icon, 4), grow(n.boxes.text, 2)]);
	const linksG: LinkG[] = [];
	for (const l of links) {
		const A = byId.get(l.a);
		const B = byId.get(l.b);
		if (!A || !B) continue;
		const others = nodes
			.filter((n) => n !== A && n !== B)
			.flatMap((n) => [grow(n.boxes.icon, 6), grow(n.boxes.text, 6)]);
		const ang = Math.atan2(B.c.y - A.c.y, B.c.x - A.c.x);
		const nx = -Math.sin(ang);
		const ny = Math.cos(ang);
		let q: Curve | null = null;
		for (const bend of [0, 50, -50, 100, -100, 160, -160, 230, -230]) {
			const mid = { x: (A.c.x + B.c.x) / 2 + nx * bend, y: (A.c.y + B.c.y) / 2 + ny * bend };
			const a0 = Math.atan2(mid.y - A.c.y, mid.x - A.c.x);
			const b0 = Math.atan2(mid.y - B.c.y, mid.x - B.c.x);
			const cand: Curve = {
				a: { x: A.c.x + Math.cos(a0) * (ICON_R + 6), y: A.c.y + Math.sin(a0) * (ICON_R + 6) },
				c: mid,
				b: { x: B.c.x + Math.cos(b0) * (ICON_R + 6), y: B.c.y + Math.sin(b0) * (ICON_R + 6) }
			};
			// 2 次のベジェは中点を通らないので、制御点は中点の 2 倍の所へ
			cand.c = {
				x: 2 * mid.x - (cand.a.x + cand.b.x) / 2,
				y: 2 * mid.y - (cand.a.y + cand.b.y) / 2
			};
			if (bend === 0) cand.c = { x: (cand.a.x + cand.b.x) / 2, y: (cand.a.y + cand.b.y) / 2 };
			// 自分の文字の箱にも重ねない
			const own = [grow(A.boxes.text, 4), grow(B.boxes.text, 4)];
			if (![...others, ...own].some((r) => hitsRect(cand, r))) {
				q = cand;
				break;
			}
			q ??= cand;
		}
		if (!q) continue;
		linksG.push({
			...l,
			q,
			tag: { x: 0, y: 0, w: textW(l.label, 12.5) + 16, h: 24 },
			len: curveLen(q)
		});
	}
	// 線の名前：線の上で、機械・ほかの名前に重ならない所
	const placed: Rect[] = [];
	for (const g of linksG) {
		const w = g.tag.w;
		const h = g.tag.h;
		let best: Rect | null = null;
		for (const t of [0.5, 0.42, 0.58, 0.34, 0.66, 0.27, 0.73]) {
			const p = at(g.q, t);
			const r = { x: p.x - w / 2, y: p.y - h / 2, w, h };
			if (blocks.some((b) => overlaps(r, b, 2)) || placed.some((b) => overlaps(r, b, 4))) continue;
			best = r;
			break;
		}
		best ??= { x: at(g.q, 0.5).x - w / 2, y: at(g.q, 0.5).y - h / 2, w, h };
		placed.push(best);
		g.tag = best;
	}

	// 番号の丸：move は線の上（行きは片側、帰りは反対側）、move の無い出来事は機械の右上
	const R = 12;
	const marks: MarkG[] = [];
	const circ = (p: Pt): Rect => ({ x: p.x - R, y: p.y - R, w: 2 * R, h: 2 * R });
	const taken: Rect[] = [];
	const free = (r: Rect) =>
		!taken.some((x) => overlaps(r, x, 3)) &&
		!placed.some((x) => overlaps(r, x, 2)) &&
		!blocks.some((x) => overlaps(r, x, 1));
	for (const b of beatsOf(lesson)) {
		if (b.k === 0) continue;
		if (b.move && b.move.from !== b.move.to) {
			const g = linksG.find((x) => pairKey(x.a, x.b) === pairKey(b.move!.from, b.move!.to));
			if (g) {
				const fwd = g.a === b.move.from ? 1 : -1;
				let spot: Rect | null = null;
				let ang = 0;
				search: for (const off of [22, 46, 70, 94]) {
					for (const t of [0.3, 0.7, 0.2, 0.8, 0.4, 0.6, 0.12, 0.88, 0.5]) {
						const p = at(g.q, t);
						const a = tangent(g.q, t);
						const c = { x: p.x - Math.sin(a) * off * fwd, y: p.y + Math.cos(a) * off * fwd };
						const r = circ(c);
						if (free(r)) {
							spot = r;
							ang = fwd > 0 ? a : a + Math.PI;
							break search;
						}
					}
				}
				if (spot) {
					taken.push(spot);
					marks.push({
						k: b.k,
						x: spot.x + R,
						y: spot.y + R,
						ang,
						link: pairKey(g.a, g.b),
						self: null
					});
					continue;
				}
			}
		}
		const id = beatTarget(b) ?? nodes[0]?.id;
		const n = (id ? byId.get(id) : undefined) ?? nodes[0];
		if (!n) continue;
		let spot: Rect | null = null;
		for (let i = 0; i < 12 && !spot; i++) {
			const c = {
				x: n.c.x + ICON_R + 8 + R + (i % 4) * (2 * R + 6),
				y: n.c.y - ICON_R - R + Math.floor(i / 4) * (2 * R + 6)
			};
			if (free(circ(c))) spot = circ(c);
		}
		spot ??= circ({ x: n.c.x + ICON_R + 20, y: n.c.y - ICON_R });
		taken.push(spot);
		marks.push({ k: b.k, x: spot.x + R, y: spot.y + R, ang: null, link: null, self: n.id });
	}

	// 区画
	const zones: ZoneG[] = (map?.zones ?? []).map((z) => {
		const ms = nodes.filter((n) => z.members.includes(n.id));
		let r = ms[0]?.boxes.all ?? { x: 0, y: 0, w: 0, h: 0 };
		for (const m of ms) r = union(r, m.boxes.all);
		return {
			label: z.label,
			note: z.note,
			r: { x: r.x - 22, y: r.y - 50, w: r.w + 44, h: r.h + 66 }
		};
	});

	let bounds = nodes[0]?.boxes.all ?? { x: 0, y: 0, w: 100, h: 100 };
	for (const n of nodes) bounds = union(bounds, n.boxes.all);
	for (const z of zones) bounds = union(bounds, z.r);
	for (const m of marks) bounds = union(bounds, circ(m));
	for (const p of placed) bounds = union(bounds, p);
	bounds = grow(bounds, 24);
	return { nodes, links: linksG, zones, marks, bounds };
}

/** 重なりの数（LS-D5・LS-D6 の測り方）。文字の箱どうし・線と文字の箱・番号の丸どうし */
export function overlapCount(g: Geometry): { text: number; lineText: number; marks: number } {
	const texts: Rect[] = [...g.nodes.map((n) => n.boxes.text), ...g.links.map((l) => l.tag)];
	let text = 0;
	for (let i = 0; i < texts.length; i++)
		for (let j = i + 1; j < texts.length; j++) if (overlaps(texts[i], texts[j])) text++;
	let lineText = 0;
	for (const l of g.links)
		for (const n of g.nodes) {
			if (n.id === l.a || n.id === l.b) {
				if (hitsRect(l.q, grow(n.boxes.text, -2))) lineText++;
				continue;
			}
			if (hitsRect(l.q, n.boxes.text) || hitsRect(l.q, n.boxes.icon)) lineText++;
		}
	let marks = 0;
	for (let i = 0; i < g.marks.length; i++)
		for (let j = i + 1; j < g.marks.length; j++)
			if (Math.hypot(g.marks[i].x - g.marks[j].x, g.marks[i].y - g.marks[j].y) < 24) marks++;
	return { text, lineText, marks };
}

/** 機械の箱の中心の集まりを入れる枠（「動きに寄る」） */
export function boundsOf(g: Geometry, ids: readonly string[]): Rect {
	const ns = g.nodes.filter((n) => ids.includes(n.id));
	if (ns.length === 0) return g.bounds;
	let r = ns[0].boxes.all;
	for (const n of ns) r = union(r, n.boxes.all);
	return grow(r, 60);
}
