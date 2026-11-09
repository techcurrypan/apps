// 舞台の絵を、ステップの図（前・動き・後）と再生の段階だけから作る。
// 位置は appear の at（列・行）を格子に当てて決める（screen-design.md 3.3）。
import type { Motion, SceneNode, StepState } from '../lesson/state.ts';
import type { Lesson } from '../lesson/types.ts';
import type { Phase } from './timeline.ts';

const PAD = 12;

// 物の中の字の大きさと行の位置（SVG の単位。物の上端から測る）
export type TextMetrics = {
	label: number;
	sub: number;
	prop: number;
	labelY: number;
	subY: number;
	propY: number; // 1 つ目の値の行
	propStep: number; // 値 1 つが取る高さ
	lineStep: number; // 名前の行から値の行まで（2 行に分けるとき）
	lines: 1 | 2;
};

type Metrics = { cellW: number; gap: number; text: TextMetrics };

const WIDE: Metrics = {
	cellW: 230,
	gap: 34,
	text: {
		label: 16,
		sub: 12,
		prop: 12,
		labelY: 26,
		subY: 46,
		propY: 72,
		propStep: 22,
		lineStep: 0,
		lines: 1
	}
};

// 狭い幅：携帯（舞台の幅 約 334px）に縮めても、3 列の図の値が 10px 以上で読める大きさ
const NARROW: Metrics = {
	cellW: 150,
	gap: 12,
	text: {
		label: 18,
		sub: 13,
		prop: 14,
		labelY: 22,
		subY: 40,
		propY: 62,
		propStep: 40,
		lineStep: 18,
		lines: 2
	}
};

function nodeHeight(t: TextMetrics, maxProps: number): number {
	if (maxProps === 0) return t.subY + 10;
	return t.propY + (maxProps - 1) * t.propStep + t.lineStep + 10;
}

// 字の幅を見積もって、width に収まるよう末尾を … で切る。
// 日本語の字は字の大きさと同じ幅、英数字はその 0.6 倍と数える。
export function fitText(text: string, width: number, size: number): string {
	const w = (ch: string) => ((ch.codePointAt(0) ?? 0) > 0xff ? size : size * 0.6);
	const chars = [...text];
	const total = chars.reduce((a, ch) => a + w(ch), 0);
	if (total <= width) return text;
	let used = size * 0.6;
	let out = '';
	for (const ch of chars) {
		if (used + w(ch) > width) break;
		used += w(ch);
		out += ch;
	}
	return out + '…';
}

export type Box = { x: number; y: number; w: number; h: number };
export type Point = { x: number; y: number };

// wide：広い幅。narrow：狭い幅（物を細くし、値を名前と値の 2 行に分ける）
export type LayoutMode = 'wide' | 'narrow';

export type Layout = {
	mode: LayoutMode;
	text: TextMetrics;
	width: number;
	height: number;
	box(at: readonly [number, number]): Box;
};

export type DrawProp = { k: string; v: string; old: string | null };
export type DrawNode = {
	id: string;
	label: string;
	sub: string | null;
	box: Box;
	props: DrawProp[];
	opacity: number;
	highlighted: boolean;
	dashed: boolean;
	appearing: boolean;
};
export type DrawMove = {
	from: Point;
	to: Point;
	at: Point;
	payload: string;
	kind: string;
	t: number;
};
export type Drawing = { nodes: DrawNode[]; moving: DrawMove | null };

// レッスン全体で、物の数の多さと置き場所の広さを見て、図の大きさを 1 つに決める。
// ステップが替わっても大きさが変わらないので、図が跳ねない。
// 狭い幅では物を細くし、値を名前と値の 2 行に分ける。列の並び（流れの向き）は替えない。
export function layoutOf(lesson: Lesson, mode: LayoutMode = 'wide'): Layout {
	let cols = 1;
	let rows = 1;
	const propCount = new Map<string, Set<string>>();
	for (const step of lesson.explain) {
		for (const op of step.scene) {
			if (op.op === 'appear') {
				cols = Math.max(cols, op.at[0] + 1);
				rows = Math.max(rows, op.at[1] + 1);
			}
			if (op.op === 'change') {
				const s = propCount.get(op.id) ?? new Set<string>();
				s.add(op.k);
				propCount.set(op.id, s);
			}
		}
	}
	const maxProps = Math.max(0, ...[...propCount.values()].map((s) => s.size));
	const m = mode === 'narrow' ? NARROW : WIDE;
	const nodeH = nodeHeight(m.text, maxProps);
	const nodeW = m.cellW - m.gap;
	const box = (at: readonly [number, number]): Box => ({
		x: PAD + at[0] * m.cellW,
		y: PAD + at[1] * (nodeH + m.gap),
		w: nodeW,
		h: nodeH
	});
	return {
		mode,
		text: m.text,
		width: PAD * 2 + cols * m.cellW - m.gap,
		height: PAD * 2 + rows * (nodeH + m.gap) - m.gap,
		box
	};
}

const center = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

function toDraw(n: SceneNode, lay: Layout, highlighted: boolean): DrawNode {
	return {
		id: n.id,
		label: n.label,
		sub: n.sub ?? null,
		box: lay.box(n.at),
		props: n.props.map((p) => ({ k: p.k, v: p.v, old: null })),
		opacity: 1,
		highlighted,
		dashed: false,
		appearing: false
	};
}

// 動き 1 つを、t（0〜1）の分だけ当てる。t = 1 で当て終わり。
function applyMotion(nodes: DrawNode[], m: Motion, t: number, lay: Layout): DrawMove | null {
	const find = (id: string) => nodes.find((x) => x.id === id);
	switch (m.op) {
		case 'appear': {
			nodes.push({
				id: m.id,
				label: m.label,
				sub: m.sub ?? null,
				box: lay.box(m.at),
				props: [],
				opacity: t,
				highlighted: false,
				dashed: false,
				appearing: t < 1
			});
			return null;
		}
		case 'change': {
			const node = find(m.id);
			if (!node) return null;
			const prop = node.props.find((p) => p.k === m.k);
			const old = t < 1 ? m.before : null;
			if (prop) {
				prop.v = m.after;
				prop.old = old;
			} else node.props.push({ k: m.k, v: m.after, old });
			return null;
		}
		case 'highlight': {
			const node = find(m.id);
			if (node) node.highlighted = true;
			return null;
		}
		case 'vanish': {
			const node = find(m.id);
			if (!node) return null;
			if (t >= 1) nodes.splice(nodes.indexOf(node), 1);
			else {
				node.opacity = 1 - t;
				node.dashed = true;
			}
			return null;
		}
		case 'move': {
			const a = find(m.from);
			const b = find(m.to);
			if (!a || !b) return null;
			const from = center(a.box);
			const to = center(b.box);
			return {
				from,
				to,
				at: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
				payload: m.payload,
				kind: m.kind,
				t
			};
		}
	}
}

export function draw(scene: StepState['scene'], phase: Phase, lay: Layout): Drawing {
	if (phase.kind === 'after') {
		return { nodes: scene.after.nodes.map((n) => toDraw(n, lay, n.highlighted)), moving: null };
	}
	const nodes = scene.before.nodes.map((n) => toDraw(n, lay, false));
	if (phase.kind === 'before') return { nodes, moving: null };
	let moving: DrawMove | null = null;
	scene.motion.forEach((m, i) => {
		if (i < phase.index) applyMotion(nodes, m, 1, lay);
		else if (i === phase.index) moving = applyMotion(nodes, m, phase.t, lay);
	});
	return { nodes, moving };
}
