// stateAt(lesson, n)：ステップ n の全ての表し方（本文・具体値・図・記録・進み）の中身を返す。
// 純粋な関数。同じ lesson と n からは、いつ・どの順で呼んでも同じ結果を返す。
// 図の「前」と「後」と、その間の「動き」を持つので、画面は動きを何度でも再生し直せる。
import type { Fact, LogRow, Lesson, SceneOp } from './types.ts';

export type SceneNode = {
	id: string;
	label: string;
	sub?: string;
	at: [number, number];
	props: Fact[]; // change で付いた値。付いた順
	highlighted: boolean; // このステップで強調された物
};

export type Frame = { nodes: SceneNode[] };

// 前の図から後の図へ移る間の、1 つずつの動き。前と後の値を持つ。
export type Motion =
	| { op: 'appear'; id: string; label: string; sub?: string; at: [number, number] }
	| { op: 'move'; from: string; to: string; payload: string; kind: string }
	| { op: 'change'; id: string; k: string; before: string | null; after: string }
	| { op: 'highlight'; id: string }
	| { op: 'vanish'; id: string; label: string };

export type StepMark = {
	n: number;
	state: 'done' | 'current' | 'ahead';
	title: string | null; // 先のステップの題は見せない
};

export type StepState = {
	n: number;
	text: { n: number; title: string; lead: string; body: string[]; why: string | null };
	facts: { n: number; rows: Fact[] };
	scene: { n: number; before: Frame; motion: Motion[]; after: Frame };
	log: { n: number; rows: (LogRow & { n: number })[] };
	progress: { n: number; total: number; steps: StepMark[] };
};

type Nodes = Map<string, SceneNode>;

const copyNode = (x: SceneNode): SceneNode => ({
	...x,
	at: [x.at[0], x.at[1]],
	props: x.props.map((p) => ({ ...p }))
});
const snapshot = (nodes: Nodes, highlighted: boolean): Frame => ({
	nodes: [...nodes.values()].map((x) => ({
		...copyNode(x),
		highlighted: highlighted && x.highlighted
	}))
});

// 1 つの操作を図に当て、その動きを返す。
function apply(nodes: Nodes, op: SceneOp): Motion {
	switch (op.op) {
		case 'appear': {
			const node: SceneNode = {
				id: op.id,
				label: op.label,
				at: [op.at[0], op.at[1]],
				props: [],
				highlighted: false
			};
			if (op.sub !== undefined) node.sub = op.sub;
			nodes.set(op.id, node);
			const m: Motion = { op: 'appear', id: op.id, label: op.label, at: [op.at[0], op.at[1]] };
			if (op.sub !== undefined) m.sub = op.sub;
			return m;
		}
		case 'move':
			return { op: 'move', from: op.from, to: op.to, payload: op.payload, kind: op.kind };
		case 'change': {
			const node = nodes.get(op.id);
			const prop = node?.props.find((p) => p.k === op.k);
			const before = prop?.v ?? null;
			if (prop) prop.v = op.v;
			else node?.props.push({ k: op.k, v: op.v });
			return { op: 'change', id: op.id, k: op.k, before, after: op.v };
		}
		case 'highlight': {
			const node = nodes.get(op.id);
			if (node) node.highlighted = true;
			return { op: 'highlight', id: op.id };
		}
		case 'vanish': {
			const label = nodes.get(op.id)?.label ?? op.id;
			nodes.delete(op.id);
			return { op: 'vanish', id: op.id, label };
		}
	}
}

export function stateAt(lesson: Lesson, n: number): StepState {
	const steps = lesson.explain;
	if (!Number.isInteger(n) || n < 1 || n > steps.length)
		throw new RangeError(`ステップ ${n} は無い（1〜${steps.length}）`);

	// 図は 1 から n-1 までの操作を当てた結果を「前」とする。毎回作り直すので、
	// 呼ぶ順に依らない。
	const nodes: Nodes = new Map();
	for (let i = 0; i < n - 1; i++) {
		for (const op of steps[i].scene) apply(nodes, op);
		for (const x of nodes.values()) x.highlighted = false;
	}
	const before = snapshot(nodes, false);
	const step = steps[n - 1];
	const motion = step.scene.map((op) => apply(nodes, op));
	const after = snapshot(nodes, true);

	return {
		n,
		text: {
			n,
			title: step.title,
			lead: step.lead,
			body: [...step.body],
			why: step.why ?? null
		},
		facts: { n, rows: step.facts.map((f) => ({ ...f })) },
		scene: { n, before, motion, after },
		log: { n, rows: steps.slice(0, n).map((s, i) => ({ ...s.log, n: i + 1 })) },
		progress: {
			n,
			total: steps.length,
			steps: steps.map((s, i) => {
				const k = i + 1;
				const state = k < n ? 'done' : k === n ? 'current' : 'ahead';
				return { n: k, state, title: k <= n ? s.title : null };
			})
		}
	};
}
