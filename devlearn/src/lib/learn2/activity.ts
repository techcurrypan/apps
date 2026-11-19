// 図がどれだけ動いているかを、画面を撮らずに絵のデータ（Frame）から見積もる（learn-standard.md LS-M1・M4）。
// look-learn.ts --motion は本物の画面の画素の差を数える。こちらは同じ問いを、レッスンを書いた時点で単体テストから確かめる道具。
// 見積もりは「変わる所の面積（画面の px²）」。図の面積の 0.3% を LS-M1・M4 の線とし、撮る時刻のずれと字の滑らかさの分の余裕を見る。
import type { Lesson } from '../lesson/types.ts';
import { ITEM_H, ITEM_W, NODE_HH, NODE_HW, textW, type Geo } from './geo.ts';
import { frameAt, type Frame, type FrameOpts } from './timeline.ts';

/** 指標の帯の値 1 つ・出来事の札の行 1 つが変わった時の面積（画面の px²。字の大きさで決まり、寄りの倍率に依らない） */
const METRIC_AREA = 70 * 22;
const BOARD_AREA = 320 * 22;
/** 色の差がこれより小さい薄れは、撮った絵で数えない（png の差の閾値 8/255 に合わせる） */
const FADE = 0.06;

const pillOf = (label: string) => ({ w: textW(label, 15) + 22, h: 28 });

/** 2 枚の絵の間で変わる所の面積（画面の px²） */
export function changedArea(g: Geo, a: Frame, b: Frame, o: FrameOpts): number {
	const s = b.view.scale;
	const s2 = s * s;
	// 寄りが 1px でも動けば、図の全体が変わる
	const shift = Math.max(
		Math.abs(a.view.x - b.view.x) * s,
		Math.abs(a.view.y - b.view.y) * s,
		Math.abs(a.view.w - b.view.w) * s,
		Math.abs(a.view.scale - b.view.scale) * 400
	);
	if (shift >= 1) return o.sw * o.sh * 0.2;
	let area = 0;
	// 見えている所（世界の座標）。図の外で動いても画素は変わらない
	const v = b.view;
	const seen = (x: number, y: number, hw: number, hh: number) =>
		x + hw > v.x && x - hw < v.x + v.w && y + hh > v.y && y - hh < v.y + v.h;

	// 荷物
	const pa = new Map(a.packets.map((p) => [p.key, p]));
	const pb = new Map(b.packets.map((p) => [p.key, p]));
	for (const key of new Set([...pa.keys(), ...pb.keys()])) {
		const x = pa.get(key);
		const y = pb.get(key);
		const pill = pillOf((x ?? y)!.label);
		const inX = !!x && seen(x.pos.x, x.pos.y, pill.w / 2, pill.h / 2);
		const inY = !!y && seen(y.pos.x, y.pos.y, pill.w / 2, pill.h / 2);
		if (!inX && !inY) continue;
		const w = pill.w * s;
		const h = pill.h * s;
		if (!x || !y) {
			area += w * h;
			continue;
		}
		const d = Math.hypot(x.pos.x - y.pos.x, x.pos.y - y.pos.y) * s;
		area += Math.min(2 * w * h, d * (w + h));
		if (Math.abs(x.fall - y.fall) >= FADE) area += w * h;
	}

	// 機械
	const na = new Map(a.nodes.map((n) => [n.id, n]));
	const NODE = NODE_HW * 2 * NODE_HH * 2 * s2;
	const RING = 2 * Math.PI * 86 * 6 * s2;
	for (const y of b.nodes) {
		const x = na.get(y.id);
		const gn = g.nodes.get(y.id);
		if (gn && !seen(gn.c.x, gn.c.y, NODE_HW + 40, NODE_HH + 40)) continue;
		if (!x) {
			area += NODE * y.opacity;
			continue;
		}
		if (
			Math.abs(x.opacity - y.opacity) >= FADE ||
			Math.abs(x.scale - y.scale) >= 0.01 ||
			Math.abs(x.flash - y.flash) >= FADE ||
			x.failed !== y.failed ||
			x.gone !== y.gone ||
			x.hot !== y.hot
		)
			area += NODE;
		if ((x.ring ?? -1) !== (y.ring ?? -1) && (x.ring !== null || y.ring !== null)) area += RING;
	}

	// 状態の札
	const ba = new Map(a.badges.map((x) => [x.id, x]));
	for (const y of b.badges) {
		const x = ba.get(y.id);
		const at = g.nodes.get(y.id)?.badgeAt ?? g.boxes.get(y.id)?.r;
		if (at && !seen(at.x + 60, at.y, 200, 40)) continue;
		const bw = (textW(y.text, 15) + 20) * s;
		const bh = 27 * s;
		if (!x || x.text !== y.text || x.tone !== y.tone) area += bw * bh * 2;
		else if (Math.abs(x.pulse - y.pulse) >= 0.05)
			area += bw * bh * Math.min(1, Math.abs(x.pulse - y.pulse) * 4);
	}

	// 線と道（引かれていく長さ）
	const lenOf = new Map<string, number>([
		...g.links.map((k) => [k.id, Math.hypot(k.to.x - k.from.x, k.to.y - k.from.y)] as const),
		...g.edges.map((e) => [e.id, Math.hypot(e.to.x - e.from.x, e.to.y - e.from.y)] as const)
	]);
	const la = new Map(a.links.map((k) => [k.id, k.draw]));
	for (const y of b.links) {
		const d = Math.abs((la.get(y.id) ?? 0) - y.draw);
		if (d > 0) area += d * (lenOf.get(y.id) ?? 0) * 5 * s2;
	}
	const ea = new Map(a.edges.map((e) => [e.id, e]));
	for (const y of b.edges) {
		const x = ea.get(y.id);
		const len = lenOf.get(y.id) ?? 0;
		if (!x) continue;
		area += Math.abs(x.draw - y.draw) * len * 5 * s2;
		if (x.active !== y.active || x.broken !== y.broken) area += len * 5 * s2;
	}

	// キューの中身
	const ia = new Map(a.items.map((x) => [x.id, x]));
	const ib = new Map(b.items.map((x) => [x.id, x]));
	const ITEM = ITEM_W * ITEM_H * s2;
	for (const id of new Set([...ia.keys(), ...ib.keys()])) {
		const x = ia.get(id);
		const y = ib.get(id);
		const z = (y ?? x)!;
		if (!seen(z.x + ITEM_W / 2, z.y + ITEM_H / 2, ITEM_W, ITEM_H)) continue;
		if (!x || !y) {
			area += ITEM * ((x ?? y)!.opacity >= FADE ? 1 : 0);
			continue;
		}
		const d = Math.hypot(x.x - y.x, x.y - x.lift - (y.y - y.lift)) * s;
		area += Math.min(2 * ITEM, d * (ITEM_W + ITEM_H) * s);
		if (Math.abs(x.opacity - y.opacity) >= FADE) area += ITEM;
	}

	// 関数の箱の強調（縁の輪が広がる）
	const ra = new Map(a.boxRings.map((r) => [r.id, r.k]));
	const rb = new Map(b.boxRings.map((r) => [r.id, r.k]));
	for (const id of new Set([...ra.keys(), ...rb.keys()])) {
		const box = g.boxes.get(id);
		if (!box || ra.get(id) === rb.get(id)) continue;
		if (!seen(box.r.x + box.r.w / 2, box.r.y + box.r.h / 2, box.r.w / 2 + 20, box.r.h / 2 + 20))
			continue;
		area += 2 * (box.r.w + box.r.h + 80) * 3 * 2 * s2;
	}

	// 文脈の札
	const ca = a.contexts.length;
	const cb = b.contexts.length;
	if (ca !== cb) area += 330 * 28 * s2 * Math.abs(ca - cb);
	for (let i = 0; i < Math.min(ca, cb); i++)
		if (Math.abs(Math.min(1, a.contexts[i].k * 3) - Math.min(1, b.contexts[i].k * 3)) >= FADE)
			area += 330 * 28 * s2;

	// 指標の帯・出来事の札（図の枠の中。字の大きさは倍率に依らない）
	const ma = new Map(a.metrics.map((m) => [m.key, m.text]));
	for (const m of b.metrics) if (ma.get(m.key) !== m.text) area += METRIC_AREA;
	b.board.forEach((r, i) => {
		const x = a.board[i];
		if (!x || x.shown !== r.shown || x.active !== r.active) area += BOARD_AREA;
	});
	return area;
}

export type Still = { step: number; phase: 'early' | 'late'; t: number; area: number };

/**
 * 動きの止まる所（LS-M1・M4）。図の面積 dia（px²）の 0.3% に余裕を見た線より変わりが少ない時刻を返す。
 *   early：入ってから 1.5 秒の間、どの時刻からも 0.25 秒後の絵が変わる（撮る時刻のずれに強いよう、50ms ごとに全て見る）
 *   late：3〜6 秒の間、どの時刻からも 1 秒後の絵が変わる（loop: 'none' のステップは見ない）
 */
export function stills(l: Lesson, g: Geo, o: FrameOpts, dia: number, margin = 1.5): Still[] {
	const line = dia * 0.003 * margin;
	const out: Still[] = [];
	const at = (s: number, t: number) => frameAt(l, g, s, t, o);
	l.explain.forEach((step, i) => {
		const s = i + 1;
		for (let t = 0; t + 250 <= 1500; t += 50) {
			const area = changedArea(g, at(s, t), at(s, t + 250), o);
			if (area < line) out.push({ step: s, phase: 'early', t, area: Math.round(area) });
		}
		if (step.loop === 'none') return;
		for (let t = 3000; t + 1000 <= 6000; t += 100) {
			const area = changedArea(g, at(s, t), at(s, t + 1000), o);
			if (area < line) out.push({ step: s, phase: 'late', t, area: Math.round(area) });
		}
	});
	return out;
}

export type Unseen = { step: number; at: number; op: string; id: string };

/**
 * 図の外で起きる合図（LS-D1「そのステップに関わる物が既定の視点で見える」を動きの時刻ごとに）。
 * 合図が流れている真ん中の時刻の視点に、合図の触る物（機械・箱・キュー。荷物はその時の位置）が入っていなければ返す。
 * 寄る物が多すぎて 0.8 倍で入らないと前の物だけに寄るので、後ろの物で起きる合図が見えなくなる。camera を足して寄り直す
 */
export function unseenCues(l: Lesson, g: Geo, o: FrameOpts): Unseen[] {
	const out: Unseen[] = [];
	const itemQueue = new Map<string, string>();
	l.explain.forEach((step, i) => {
		const s = i + 1;
		for (const c of step.motion ?? []) {
			const d = c.do;
			const ids: string[] = [];
			if (d.op === 'pulse' || d.op === 'fail' || d.op === 'badge') ids.push(d.id);
			if (d.op === 'enqueue' || d.op === 'dequeue' || d.op === 'peek') {
				ids.push(d.queue);
				itemQueue.set(d.item, d.queue);
			}
			if (d.op === 'move') ids.push(d.to);
			if (d.op === 'context') ids.push(d.at);
			if (d.op !== 'packet' && ids.length === 0) continue;
			const inView = (v: Frame['view'], r: { x: number; y: number; w: number; h: number }) =>
				r.x + r.w > v.x + 8 && r.x < v.x + v.w - 8 && r.y + r.h > v.y + 8 && r.y < v.y + v.h - 8;
			// 流れている間を 4 つに分けて見る。残る変化（札・キュー・文脈・失敗）は終わってから 0.6 秒の間に見えればよい
			const lasting = d.op !== 'packet' && d.op !== 'pulse';
			const ts = [1, 2, 3, 4].map((k) => c.at + (c.dur * k) / 4);
			if (lasting) ts.push(c.at + c.dur + 300, c.at + c.dur + 600);
			if (d.op === 'packet') {
				const ok = ts.filter((t) => {
					const f = frameAt(l, g, s, t, o);
					const p = f.packets.find((x) => x.label === d.label);
					return !p || inView(f.view, { x: p.pos.x - 20, y: p.pos.y - 14, w: 40, h: 28 });
				}).length;
				if (ok < 3) out.push({ step: s, at: c.at, op: d.op, id: `${d.a}>${d.b}` });
				continue;
			}
			for (const id of ids) {
				const r = g.nodes.get(id)?.r ?? g.boxes.get(id)?.r ?? g.queues.get(id)?.r;
				if (!r) continue;
				if (!ts.some((t) => inView(frameAt(l, g, s, t, o).view, r)))
					out.push({ step: s, at: c.at, op: d.op, id });
			}
		}
	});
	return out;
}
