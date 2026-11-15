// 学習画面（screen-design.md 第 11 章）の状態。全て純粋な関数で、(レッスン, 出来事の番号, 動きの段階) だけから決まる。
// 章 = 解説のステップ。出来事 = ステップの中の move 1 つ（move の無いステップは、そのステップで 1 つ）。
// 出来事 0 は「概要」（まだ何も起きていない）。
import type { Host, HostRow, Lesson, LogLine, Packet, SceneOp, Step } from '../lesson/types.ts';

export type Beat = {
	k: number; // 0 は概要、1 から出来事の番号
	step: number; // 1 から。概要は 0
	move: Extract<SceneOp, { op: 'move' }> | null;
	first: boolean; // ステップの最初の出来事
	last: boolean; // ステップの最後の出来事（ここで状態が変わり、中身の板が変わる）
	ops: SceneOp[]; // この出来事で当てる操作（move を除く）。pre は動きの前、post は届いた後
	pre: SceneOp[];
	post: SceneOp[];
};

/** レッスンの出来事の並び。[0] は概要 */
export function beatsOf(lesson: Lesson): Beat[] {
	const out: Beat[] = [
		{ k: 0, step: 0, move: null, first: true, last: true, ops: [], pre: [], post: [] }
	];
	lesson.explain.forEach((s, i) => {
		const groups: { pre: SceneOp[]; move: Beat['move']; post: SceneOp[] }[] = [];
		let buffer: SceneOp[] = [];
		s.scene.forEach((op, j) => {
			const cur = groups.at(-1);
			if (op.op === 'move') {
				groups.push({ pre: buffer, move: op, post: [] });
				buffer = [];
			} else if (!cur) buffer.push(op);
			else if (op.op === 'appear' && s.scene.slice(j + 1).some((o) => o.op === 'move'))
				buffer.push(op); // 次の動きの前に現れる
			else cur.post.push(op);
		});
		if (groups.length === 0) groups.push({ pre: [], move: null, post: buffer });
		else groups[groups.length - 1].post.push(...buffer);
		groups.forEach((g, j) =>
			out.push({
				k: out.length,
				step: i + 1,
				move: g.move,
				first: j === 0,
				last: j === groups.length - 1,
				ops: [...g.pre, ...g.post],
				pre: g.pre,
				post: g.post
			})
		);
	});
	return out;
}

/** 出来事の主な機械（荷物の送り元。move の無い出来事は、最初に触る機械） */
export function beatTarget(b: Beat): string | null {
	if (b.move) return b.move.from;
	for (const o of b.ops) if (o.op !== 'move') return o.id;
	return null;
}

export type NodeState = {
	id: string;
	label: string;
	sub: string | null;
	at: [number, number];
	props: { k: string; v: string; old: string | null }[];
	fresh: boolean; // この出来事で現れた
	hot: boolean; // この出来事に関わる（送り元・宛先・変わった・強調）
	gone: boolean; // この出来事で消える（届いた後に消える）
};

type Nodes = Map<string, NodeState>;

function apply(nodes: Nodes, op: SceneOp, mark: boolean): void {
	switch (op.op) {
		case 'appear':
			nodes.set(op.id, {
				id: op.id,
				label: op.label,
				sub: op.sub ?? null,
				at: [op.at[0], op.at[1]],
				props: [],
				fresh: mark,
				hot: mark,
				gone: false
			});
			return;
		case 'change': {
			const n = nodes.get(op.id);
			if (!n) return;
			const p = n.props.find((x) => x.k === op.k);
			if (p) {
				if (mark) p.old = p.v;
				p.v = op.v;
			} else n.props.push({ k: op.k, v: op.v, old: null });
			if (mark) n.hot = true;
			return;
		}
		case 'highlight': {
			const n = nodes.get(op.id);
			if (n && mark) n.hot = true;
			return;
		}
		case 'vanish': {
			if (mark) {
				const n = nodes.get(op.id);
				if (n) n.gone = true;
			} else nodes.delete(op.id);
			return;
		}
		case 'move':
			return;
	}
}

const clean = (nodes: Nodes) => {
	for (const n of nodes.values()) {
		n.fresh = false;
		n.hot = false;
		for (const p of n.props) p.old = null;
	}
};

/** 動きの段階。before は動く前（寄る）、moving は荷物が動いている間、after は届いて状態が変わった後 */
export type Phase = 'before' | 'moving' | 'after';

/** 出来事 k のときの図の機械。before / moving では、この出来事の後の変化（post）をまだ当てない（LS-M2） */
export function nodesAt(lesson: Lesson, k: number, phase: Phase): NodeState[] {
	const beats = beatsOf(lesson);
	const nodes: Nodes = new Map();
	for (let i = 1; i < k && i < beats.length; i++) {
		const b = beats[i];
		for (const op of b.pre) apply(nodes, op, false);
		for (const op of b.post) apply(nodes, op, false);
	}
	clean(nodes);
	const b = beats[k];
	if (b && k > 0) {
		for (const op of b.pre) apply(nodes, op, true);
		if (phase === 'after') for (const op of b.post) apply(nodes, op, true);
		if (b.move) {
			for (const id of [b.move.from, b.move.to]) {
				const n = nodes.get(id);
				if (n) n.hot = true;
			}
		}
	}
	return [...nodes.values()];
}

/** レッスンに出る全ての機械（位置を 1 度に決めるため） */
export function allNodes(lesson: Lesson): { id: string; label: string; at: [number, number] }[] {
	const out = new Map<string, { id: string; label: string; at: [number, number] }>();
	for (const s of lesson.explain)
		for (const op of s.scene)
			if (op.op === 'appear' && !out.has(op.id))
				out.set(op.id, { id: op.id, label: op.label, at: [op.at[0], op.at[1]] });
	return [...out.values()];
}

// ---- 中身の板 ----

export type RowMark = 'same' | 'new' | 'chg' | 'gone';
export type RowView = HostRow & { mark: RowMark; was: string | null };
export type HostView = Omit<Host, 'rows'> & { rows: RowView[]; changed: boolean };

/** 前の OS の中と比べて、増えた・変わった・消えた行に印を付ける。変わった箱を上に並べる（LS-I6） */
export function diffHosts(before: readonly Host[] | null, after: readonly Host[]): HostView[] {
	const views = after.map((h): HostView => {
		const old = before?.find((x) => x.name === h.name);
		const rows: RowView[] = [];
		for (const r of h.rows) {
			const o = old?.rows.find((x) => x.id === r.id);
			const mark: RowMark =
				!old || !o
					? before
						? 'new'
						: 'same'
					: o.what !== r.what || o.state !== r.state || o.tone !== r.tone
						? 'chg'
						: 'same';
			rows.push({ ...r, mark, was: mark === 'chg' && o ? o.state : null });
		}
		// 消えた行は、前の位置のすぐ後に 1 回だけ出す
		for (const o of old?.rows ?? []) {
			if (h.rows.some((r) => r.id === o.id)) continue;
			const i = old ? old.rows.indexOf(o) : 0;
			const prev = i > 0 && old ? old.rows[i - 1].id : null;
			const at = prev ? rows.findIndex((r) => r.id === prev) + 1 : 0;
			rows.splice(at, 0, { ...o, mark: 'gone', was: null });
		}
		return {
			name: h.name,
			town: h.town,
			addr: h.addr,
			rows,
			changed: rows.some((r) => r.mark !== 'same')
		};
	});
	for (const o of before ?? []) {
		if (after.some((h) => h.name === o.name)) continue;
		views.push({
			...o,
			rows: o.rows.map((r) => ({ ...r, mark: 'gone', was: null })),
			changed: true
		});
	}
	return [...views.filter((v) => v.changed), ...views.filter((v) => !v.changed)];
}

/** ステップ n の後の OS の中（書いていないステップは前のまま）。n = 0 は始まりの前 */
export function hostsAfter(lesson: Lesson, n: number): Host[] | null {
	for (let i = Math.min(n, lesson.explain.length); i >= 1; i--) {
		const h = lesson.explain[i - 1].inside?.hosts;
		if (h) return h;
	}
	return null;
}

export type LogView = LogLine & { step: number; k: number; fresh: boolean };

export type InsideView = {
	packet: Packet | null; // この出来事で流れる物
	packetBeat: number; // その荷物の出来事の番号
	sending: boolean; // 荷物が動いている途中
	hosts: HostView[]; // 印つきの OS の中
	logs: LogView[]; // 新しい行が上
	waiting: boolean; // 届くとログが増える
};

/** 出来事 k・段階 phase のときの中身の板（LS-I）。届く前は前の状態のまま、届いた後に変わる */
export function insideAt(lesson: Lesson, k: number, phase: Phase): InsideView {
	const beats = beatsOf(lesson);
	const b = beats[k] ?? beats[0];
	const step: Step | null = b.step > 0 ? lesson.explain[b.step - 1] : null;
	const lastOfStep = b.last;
	const done = phase === 'after' && lastOfStep ? b.step : b.step - 1;
	const before = hostsAfter(lesson, done - (done === b.step ? 1 : 0));
	const after = hostsAfter(lesson, done);
	const changedNow = done === b.step && step?.inside?.hosts !== undefined;
	const hosts = after ? diffHosts(changedNow ? before : null, after) : [];
	if (!changedNow) for (const h of hosts) for (const r of h.rows) r.mark = 'same';
	const logs: LogView[] = [];
	for (let i = 1; i <= done; i++) {
		const kOf = beats.filter((x) => x.step === i).at(-1)?.k ?? 0;
		for (const l of lesson.explain[i - 1].inside?.logs ?? [])
			logs.push({ ...l, step: i, k: kOf, fresh: i === b.step && done === b.step });
	}
	const packet = b.move && b.first && step?.inside?.packet ? step.inside.packet : null;
	return {
		packet,
		packetBeat: packet ? b.k : 0,
		sending: phase === 'moving' && packet !== null,
		hosts,
		logs: logs.reverse(),
		waiting: phase !== 'after' && lastOfStep && (step?.inside?.logs?.length ?? 0) > 0
	};
}

/** 出来事 k で変わった図の値（右の欄の「変わったこと」。前は取り消し線）。現れた・消えた機械も 1 行にする */
export function changesAt(
	lesson: Lesson,
	k: number
): { who: string; k: string; before: string | null; after: string | null }[] {
	const b = beatsOf(lesson)[k];
	if (!b || k === 0) return [];
	const before = new Map(nodesAt(lesson, k, 'before').map((n) => [n.id, n]));
	const nodes = new Map(nodesAt(lesson, k, 'after').map((n) => [n.id, n]));
	const out: { who: string; k: string; before: string | null; after: string | null }[] = [];
	for (const op of b.ops) {
		if (op.op === 'change') {
			const n = nodes.get(op.id);
			const was = before.get(op.id)?.props.find((p) => p.k === op.k)?.v ?? null;
			out.push({ who: n?.label ?? op.id, k: op.k, before: was, after: op.v });
		} else if (op.op === 'appear')
			out.push({ who: op.label, k: '現れた', before: null, after: op.sub ?? op.label });
		else if (op.op === 'vanish')
			out.push({
				who: before.get(op.id)?.label ?? op.id,
				k: '消えた',
				before: before.get(op.id)?.label ?? op.id,
				after: null
			});
	}
	return out;
}
