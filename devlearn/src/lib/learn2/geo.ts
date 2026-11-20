// 第 2 版の図の置き方（screen-design.md 11.3・learn-standard.md LS-D1〜D16）。レッスンだけから決まる純粋な関数。
// 世界の座標は 1 単位 ＝ 倍率 1 で 1px。字は 15 単位以上で描き、倍率は 0.8 より小さくしない（字 12px 以上。LS-A7）。
// 地図（機械・区画・線）を上に、層の図（層の帯・関数の箱・キュー）をその下に置く。寄りが両方の間を滑らかに動く（LS-M6）。
import type { Cue, Lesson, Link } from '../lesson/types.ts';

export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export const COL = 300;
export const ROW = 230;
const X0 = 160;
const Y0 = 140;
/** 機械の絵の半分の幅・高さ（台座を含む） */
export const NODE_HW = 58;
export const NODE_HH = 50;
export const FONT = { name: 16, sub: 15, small: 15 } as const;
export const MIN_SCALE = 0.8;
export const MAX_SCALE = 1.6;

export const textW = (s: string, size: number): number => {
	let w = 0;
	for (const ch of s) w += (ch.codePointAt(0) ?? 0) > 0xff ? size : size * 0.6;
	return w;
};

export const union = (rs: readonly Rect[]): Rect => {
	if (rs.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
	const x = Math.min(...rs.map((r) => r.x));
	const y = Math.min(...rs.map((r) => r.y));
	const x2 = Math.max(...rs.map((r) => r.x + r.w));
	const y2 = Math.max(...rs.map((r) => r.y + r.h));
	return { x, y, w: x2 - x, h: y2 - y };
};
export const pad = (r: Rect, p: number): Rect => ({
	x: r.x - p,
	y: r.y - p,
	w: r.w + p * 2,
	h: r.h + p * 2
});

export type GNode = {
	id: string;
	label: string;
	sub: string | null;
	town: string | null;
	icon: string;
	c: Pt;
	/** 絵・名前・番地・名札・状態の札を全部含む箱 */
	r: Rect;
	/** 状態の札を置く所（絵の右上） */
	badgeAt: Pt;
	step: number; // 現れるステップ（1 から）
};
/** 区画。lr は名前の札の箱、bottom は名前を下の縁に置くとき（上に置くと外の機械と重なる時） */
export type GZone = {
	label: string;
	note: string;
	r: Rect;
	members: string[];
	lr: Rect;
	bottom: boolean;
};
export type GLink = {
	a: string;
	b: string;
	label: string;
	dir: Link['dir'];
	from: Pt;
	to: Pt;
	id: string;
};
export type GBox = {
	id: string;
	impl: string;
	band: string;
	r: Rect;
	/** 箱が出るステップ */
	steps: number[];
};
export type GQueue = {
	id: string;
	label: string;
	box: string;
	limit: string | null;
	r: Rect;
	/** 要素の箱の置き場の数 */
	slots: number;
	slot: (i: number) => Rect;
};
export type GBand = { id: string; label: string; r: Rect };
/** 荷物の通る道。packet の合図の組ごとに 1 本 */
export type GEdge = {
	a: string;
	b: string;
	kind: string;
	from: Pt;
	to: Pt;
	id: string;
	steps: number[];
};

export type Geo = {
	nodes: Map<string, GNode>;
	zones: GZone[];
	links: GLink[];
	bands: GBand[];
	boxes: Map<string, GBox>;
	queues: Map<string, GQueue>;
	edges: GEdge[];
	mapBounds: Rect;
	layerBounds: Rect | null;
	all: Rect;
};

/** 線分 a→b が箱 r の縁と交わる点（a が箱の中にあるとき、出ていく所） */
export function trim(a: Pt, b: Pt, r: Rect): Pt {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	let t = 1;
	if (dx > 0) t = Math.min(t, (r.x + r.w - a.x) / dx);
	if (dx < 0) t = Math.min(t, (r.x - a.x) / dx);
	if (dy > 0) t = Math.min(t, (r.y + r.h - a.y) / dy);
	if (dy < 0) t = Math.min(t, (r.y - a.y) / dy);
	t = Math.max(0, t);
	return { x: a.x + dx * t, y: a.y + dy * t };
}

const ctr = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

export const ITEM_W = 92;
export const ITEM_H = 32;
const ITEM_GAP = 8;
const BOX_GAP = 90;
/** 層の帯の左の余白。帯の名前は箱の左ではなく、帯の上の細い段に置く（寄りの幅を削らない。LS-D1・D16） */
const BAND_PAD = 24;
/** 帯の名前の段の高さ */
export const BAND_HEAD = 34;

function cuesOf(l: Lesson): { cue: Cue; step: number }[] {
	const out: { cue: Cue; step: number }[] = [];
	l.explain.forEach((s, i) => {
		for (const c of s.motion ?? []) out.push({ cue: c, step: i + 1 });
		if (Array.isArray(s.loop)) for (const c of s.loop) out.push({ cue: c, step: i + 1 });
	});
	return out;
}

export function geoOf(l: Lesson): Geo {
	const nodes = new Map<string, GNode>();
	l.explain.forEach((s, i) => {
		for (const op of s.scene) {
			if (op.op !== 'appear' || nodes.has(op.id)) continue;
			const m = l.map?.nodes[op.id];
			const c = { x: X0 + op.at[0] * COL, y: Y0 + op.at[1] * ROW };
			const town = m?.town ?? null;
			const tw = Math.max(
				textW(op.label, FONT.name),
				op.sub ? textW(op.sub, FONT.sub) : 0,
				town ? textW('町：' + town, FONT.small) + 16 : 0
			);
			const textH = 24 + (op.sub ? 20 : 0) + (town ? 26 : 0);
			const icon = { x: c.x - NODE_HW, y: c.y - NODE_HH, w: NODE_HW * 2, h: NODE_HH * 2 };
			const text = { x: c.x - tw / 2 - 4, y: c.y + NODE_HH + 4, w: tw + 8, h: textH };
			const badgeAt = { x: c.x + NODE_HW - 6, y: c.y - NODE_HH - 30 };
			const badge = { x: badgeAt.x, y: badgeAt.y, w: 150, h: 28 };
			nodes.set(op.id, {
				id: op.id,
				label: op.label,
				sub: op.sub ?? null,
				town,
				icon: m?.icon ?? 'box',
				c,
				r: union([icon, text, badge]),
				badgeAt,
				step: i + 1
			});
		}
	});
	const zones: GZone[] = zonesOf(l.map?.zones ?? [], nodes);
	const links: GLink[] = [];
	for (const k of l.map?.links ?? []) {
		const a = nodes.get(k.a);
		const b = nodes.get(k.b);
		if (!a || !b) continue;
		const ia = { x: a.c.x - NODE_HW, y: a.c.y - NODE_HH, w: NODE_HW * 2, h: NODE_HH * 2 };
		const ib = { x: b.c.x - NODE_HW, y: b.c.y - NODE_HH, w: NODE_HW * 2, h: NODE_HH * 2 };
		links.push({
			...k,
			from: trim(a.c, b.c, pad(ia, 8)),
			to: trim(b.c, a.c, pad(ib, 8)),
			id: `l2-link-${k.a}-${k.b}`
		});
	}
	const mapRects = [...[...nodes.values()].map((n) => n.r), ...zones.map((z) => z.r)];
	const mapBounds = mapRects.length ? union(mapRects) : { x: 0, y: 0, w: 0, h: 0 };

	// 層の図：全てのステップの layers を帯（id）ごと・箱（id）ごとに集め、初めて出た順に並べる
	const bandOrder: { id: string; label: string; boxes: string[] }[] = [];
	const boxInfo = new Map<
		string,
		{
			impl: string;
			band: string;
			steps: number[];
			queues: Map<string, { label: string; limit: string | null; max: number }>;
		}
	>();
	l.explain.forEach((s, i) => {
		for (const ly of s.layers ?? []) {
			let band = bandOrder.find((b) => b.id === ly.id);
			if (!band) bandOrder.push((band = { id: ly.id, label: ly.label, boxes: [] }));
			for (const b of ly.boxes) {
				let info = boxInfo.get(b.id);
				if (!info) {
					info = { impl: b.impl, band: ly.id, steps: [], queues: new Map() };
					boxInfo.set(b.id, info);
					band.boxes.push(b.id);
				}
				info.steps.push(i + 1);
				for (const q of b.queues ?? []) {
					const cur = info.queues.get(q.id);
					const n = q.items.length;
					info.queues.set(q.id, {
						label: q.label,
						limit: q.limit ?? cur?.limit ?? null,
						max: Math.max(cur?.max ?? 0, n)
					});
				}
			}
		}
	});
	// キューに入る数の最大を、合図からも数える（enqueue・split・clone で増える）
	for (const { cue } of cuesOf(l)) {
		const d = cue.do;
		const grow = (qid: string, n: number) => {
			for (const info of boxInfo.values()) {
				const q = info.queues.get(qid);
				if (q) q.max = Math.max(q.max, n);
			}
		};
		if (d.op === 'enqueue') grow(d.queue, 2);
		if (d.op === 'split')
			for (const info of boxInfo.values())
				for (const q of info.queues.values())
					q.max = Math.max(q.max, Math.min(d.into.length + 1, 6));
	}
	const bands: GBand[] = [];
	const boxes = new Map<string, GBox>();
	const queues = new Map<string, GQueue>();
	let y = mapRects.length ? mapBounds.y + mapBounds.h + 140 : 0;
	const x0 = mapRects.length ? mapBounds.x : 0;
	for (const band of bandOrder) {
		let x = x0 + BAND_PAD;
		let bandH = 0;
		const placed: { id: string; w: number; h: number }[] = [];
		for (const id of band.boxes) {
			const info = boxInfo.get(id)!;
			const qs = [...info.queues.entries()];
			const qW = qs.length
				? Math.max(...qs.map(([, q]) => Math.min(Math.max(q.max, 3), 6) * (ITEM_W + ITEM_GAP) + 16))
				: 0;
			// 右上の実行の文脈の札（syscall・softirq など。最大 9 字）の分も空ける
			const w = Math.max(
				textW(info.impl, FONT.name) + 36 + textW('kthread__', FONT.sub) + 12,
				qW + 24,
				200
			);
			const h = 56 + qs.length * 78;
			placed.push({ id, w, h });
			bandH = Math.max(bandH, h);
		}
		// 帯の名前の段の下に、箱の上の状態の札（箱の 34 上から）の分を空ける
		const top = y + 32 + BAND_HEAD;
		for (const p of placed) {
			const info = boxInfo.get(p.id)!;
			const r = { x, y: top + (bandH - p.h) / 2, w: p.w, h: p.h };
			boxes.set(p.id, { id: p.id, impl: info.impl, band: band.id, r, steps: info.steps });
			let qy = r.y + 48;
			for (const [qid, q] of info.queues) {
				const slots = Math.min(Math.max(q.max, 3), 6);
				const qr = { x: r.x + 12, y: qy, w: r.w - 24, h: 66 };
				queues.set(qid, {
					id: qid,
					label: q.label,
					box: p.id,
					limit: q.limit,
					r: qr,
					slots,
					slot: (i: number) => ({
						x: qr.x + 8 + i * (ITEM_W + ITEM_GAP),
						y: qr.y + 26,
						w: ITEM_W,
						h: ITEM_H
					})
				});
				qy += 78;
			}
			x += p.w + BOX_GAP;
		}
		const r = { x: x0, y, w: x - BOX_GAP - x0 + BAND_PAD, h: bandH + 52 + BAND_HEAD };
		bands.push({ id: band.id, label: band.label, r });
		y += bandH + 52 + BAND_HEAD + 14;
	}
	// 帯の幅をそろえる
	const bw = Math.max(0, ...bands.map((b) => b.r.w));
	for (const b of bands) b.r.w = bw;
	const layerBounds = bands.length ? union(bands.map((b) => b.r)) : null;

	// 荷物の通る道
	const rectOf = (id: string): Rect | null => {
		const n = nodes.get(id);
		if (n) return { x: n.c.x - NODE_HW, y: n.c.y - NODE_HH, w: NODE_HW * 2, h: NODE_HH * 2 };
		const b = boxes.get(id);
		if (b) return b.r;
		const q = queues.get(id);
		return q ? q.r : null;
	};
	const edges: GEdge[] = [];
	for (const { cue, step } of cuesOf(l)) {
		if (cue.do.op !== 'packet') continue;
		const { a, b, kind } = cue.do;
		const e = edges.find((x) => x.a === a && x.b === b);
		if (e) {
			if (!e.steps.includes(step)) e.steps.push(step);
			continue;
		}
		const ra = rectOf(a);
		const rb = rectOf(b);
		if (!ra || !rb) continue;
		// 逆向きの道が既にあれば、少しずらして 2 本に見せる
		const back = edges.some((x) => x.a === b && x.b === a);
		const off = back ? 14 : 0;
		const ca = ctr(ra);
		const cb = ctr(rb);
		const len = Math.hypot(cb.x - ca.x, cb.y - ca.y) || 1;
		const nx = (-(cb.y - ca.y) / len) * off;
		const ny = ((cb.x - ca.x) / len) * off;
		const sa = { x: ca.x + nx, y: ca.y + ny };
		const sb = { x: cb.x + nx, y: cb.y + ny };
		edges.push({
			a,
			b,
			kind,
			from: trim(sa, sb, pad(ra, 6)),
			to: trim(sb, sa, pad(rb, 6)),
			id: `l2-edge-${a}-${b}`,
			steps: [step]
		});
	}
	const all = union([
		...(mapRects.length ? [mapBounds] : []),
		...(layerBounds ? [layerBounds] : [])
	]);
	return { nodes, zones, links, bands, boxes, queues, edges, mapBounds, layerBounds, all };
}

const ZONE_PAD = 22;
const ZONE_HEAD = 26;
const cuts = (a: Rect, b: Rect) =>
	a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** 機械の絵と名前の箱（状態の札の空けておく所を除く。札は左右対称に置かれる絵と名前の右に出る） */
const bodyOf = (n: GNode): Rect => ({
	x: n.r.x,
	y: n.c.y - NODE_HH,
	w: 2 * (n.c.x - n.r.x),
	h: n.r.y + n.r.h - (n.c.y - NODE_HH)
});

/**
 * 区画の囲い（LS-D7）。中の機械を余白 22px で囲み、名前の段 26px を上に足す。
 * 上の名前が外の機械と重なる時は名前を下の縁へ。縦に並んだ区画が重なる時は、中の機械どうしの間の真ん中で分ける（LS-D6）
 */
function zonesOf(
	zs: readonly { label: string; note: string; members: string[] }[],
	nodes: Map<string, GNode>
): GZone[] {
	const inner = zs.map((z) =>
		union(z.members.map((id) => nodes.get(id)?.r).filter((r): r is Rect => !!r))
	);
	const out = zs.map((z, i) => {
		const r = pad(inner[i], ZONE_PAD);
		const lw = textW(`${z.label}・${z.note}`, FONT.small) + 28;
		const top = { x: r.x, y: r.y - ZONE_HEAD, w: lw, h: ZONE_HEAD };
		const bottom = [...nodes.values()].some(
			(n) => !z.members.includes(n.id) && cuts(top, bodyOf(n))
		);
		const zr = bottom
			? { ...r, h: r.h + ZONE_HEAD }
			: { ...r, y: r.y - ZONE_HEAD, h: r.h + ZONE_HEAD };
		return { label: z.label, note: z.note, members: z.members, r: zr, bottom, lr: top };
	});
	// 縦か横に並んで重なる区画を、中の機械の間の真ん中で分ける
	for (let i = 0; i < out.length; i++)
		for (let j = 0; j < out.length; j++) {
			if (i === j) continue;
			const a = out[i];
			const b = out[j];
			if (!cuts(a.r, b.r)) continue;
			if (inner[i].y + inner[i].h <= inner[j].y) {
				const mid = (inner[i].y + inner[i].h + inner[j].y) / 2;
				if (a.r.y + a.r.h > mid - 2) a.r = { ...a.r, h: mid - 2 - a.r.y };
				if (b.r.y < mid + 2) b.r = { ...b.r, h: b.r.h - (mid + 2 - b.r.y), y: mid + 2 };
			} else if (inner[i].x + inner[i].w <= inner[j].x) {
				const mid = (inner[i].x + inner[i].w + inner[j].x) / 2;
				if (a.r.x + a.r.w > mid - 2) a.r = { ...a.r, w: mid - 2 - a.r.x };
				if (b.r.x < mid + 2) b.r = { ...b.r, w: b.r.w - (mid + 2 - b.r.x), x: mid + 2 };
			}
		}
	for (const z of out) {
		const lw = z.lr.w;
		z.lr = z.bottom
			? { x: z.r.x, y: z.r.y + z.r.h - ZONE_HEAD, w: lw, h: ZONE_HEAD }
			: { x: z.r.x, y: z.r.y, w: lw, h: ZONE_HEAD };
	}
	return out;
}

/** id の箱（機械・層の箱・キュー・帯） */
export function rectOfId(g: Geo, id: string): Rect | null {
	return (
		g.nodes.get(id)?.r ??
		g.boxes.get(id)?.r ??
		g.queues.get(id)?.r ??
		g.bands.find((b) => b.id === id)?.r ??
		null
	);
}

export type View = { x: number; y: number; w: number; h: number; scale: number };

/** 箱たちが全部入る視点（余白 24px。倍率 0.8〜1.6）。sw・sh は図の画面の大きさ（px） */
export function fitView(rs: readonly Rect[], sw: number, sh: number, margin = 24): View {
	const u = union(rs);
	const avW = Math.max(1, sw - margin * 2);
	const avH = Math.max(1, sh - margin * 2);
	const raw = Math.min(avW / Math.max(1, u.w), avH / Math.max(1, u.h));
	const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw));
	const w = sw / scale;
	const h = sh / scale;
	const c = ctr(u);
	return { x: c.x - w / 2, y: c.y - h / 2, w, h, scale };
}

/**
 * 寄せる物を前から順に足し、0.8 倍で入る所まで入れる視点（LS-D1）。全部入れば fitView と同じ。
 * 入らない物を入れて中を切るより、前（そのステップの主役）を切らずに見せる。1 つ目も入らない時は 1 つ目に寄せる。
 * 入れなかった物がある時は、周りが見えるよう倍率を 1 までにする。taken は入れた物の番号
 */
export function fitFirstOf(
	rs: readonly Rect[],
	sw: number,
	sh: number,
	margin = 24
): { view: View; taken: number[] } {
	const fits = (xs: readonly Rect[]) => {
		const u = union(xs);
		return (
			u.w * MIN_SCALE <= Math.max(1, sw - margin * 2) &&
			u.h * MIN_SCALE <= Math.max(1, sh - margin * 2)
		);
	};
	if (rs.length === 0 || fits(rs))
		return { view: fitView(rs, sw, sh, margin), taken: rs.map((_, i) => i) };
	const taken = [0];
	for (let i = 1; i < rs.length; i++) if (fits([...taken.map((k) => rs[k]), rs[i]])) taken.push(i);
	const v = fitView(
		taken.map((k) => rs[k]),
		sw,
		sh,
		margin
	);
	if (v.scale <= 1) return { view: v, taken };
	const c = { x: v.x + v.w / 2, y: v.y + v.h / 2 };
	return { view: { x: c.x - sw / 2, y: c.y - sh / 2, w: sw, h: sh, scale: 1 }, taken };
}
export const fitFirst = (rs: readonly Rect[], sw: number, sh: number, margin = 24): View =>
	fitFirstOf(rs, sw, sh, margin).view;

export const lerpView = (a: View, b: View, k: number): View => ({
	x: a.x + (b.x - a.x) * k,
	y: a.y + (b.y - a.y) * k,
	w: a.w + (b.w - a.w) * k,
	h: a.h + (b.h - a.h) * k,
	scale: a.scale + (b.scale - a.scale) * k
});

/** 道の上の点（0〜1） */
export const along = (from: Pt, to: Pt, p: number): Pt => ({
	x: from.x + (to.x - from.x) * p,
	y: from.y + (to.y - from.y) * p
});
