// 思い出す（learn-standard.md 第 7 章）。レッスンのデータから、並べる・図の機械を押す・打つ・選ぶの問いを作る。
// 乱数を使わない：並べる問いの崩し方は、題の文字から決まる（同じレッスンなら、いつ作っても同じ問い）。
import type { Lesson } from '../lesson/types.ts';
import type { Note } from './prefs.ts';

export type Recall =
	| { kind: 'order'; q: string; items: string[]; right: string[]; why: string }
	| { kind: 'hit'; q: string; a: string; why: string }
	| { kind: 'type'; q: string; label: string; ans: string; why: string }
	| { kind: 'pick'; q: string; opts: string[]; a: number; why: string };

/** 文字から決まる 32 ビットの数（FNV-1a） */
function hash(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h;
}
/** 決まった崩し方。崩した結果が元と同じなら 1 つずらす */
function mixed<T>(xs: readonly T[], key: (x: T) => string): T[] {
	const out = [...xs].sort((a, b) => hash(key(a)) - hash(key(b)));
	if (out.every((x, i) => x === xs[i]) && out.length > 1) out.push(out.shift() as T);
	return out;
}

const labels = (l: Lesson) => {
	const m = new Map<string, string>();
	for (const s of l.explain)
		for (const o of s.scene) if (o.op === 'appear' && !m.has(o.id)) m.set(o.id, o.label);
	return m;
};

export function recallOf(l: Lesson): Recall[] {
	const out: Recall[] = [];
	const names = labels(l);
	const town = (id: string) => l.map?.nodes[id]?.town ?? '';

	// 並べる：章の順（多いときは 5 章まで、間を空けて取る）
	const steps = l.explain;
	const pickN = Math.min(5, steps.length);
	const chosen = Array.from(
		{ length: pickN },
		(_, i) => steps[Math.round((i * (steps.length - 1)) / Math.max(1, pickN - 1))]
	).filter((s, i, a) => a.indexOf(s) === i);
	const right = chosen.map((s) => s.title);
	out.push({
		kind: 'order',
		q: 'このレッスンで起きることを、起きる順に並べる',
		items: mixed(right, (x) => x + l.id),
		right,
		why: right.join(' → ')
	});

	// 図の機械を押す：荷物を受け取る機械
	const moves = steps.flatMap((s) =>
		s.scene.flatMap((o) => (o.op === 'move' && o.from !== o.to ? [{ s, o }] : []))
	);
	const mv = moves[Math.floor(moves.length / 2)];
	if (mv && mv.o.op === 'move' && names.has(mv.o.to)) {
		const to = mv.o.to;
		out.push({
			kind: 'hit',
			q: `「${mv.o.payload}」を受け取るのはどれ？（図の機械を押す）`,
			a: to,
			why: `${names.get(to)}${town(to) ? `（町：${town(to)}）` : ''}が受け取る。${mv.s.lead}`
		});
	} else if (names.size >= 2) {
		const s = steps.find((x) => x.scene.some((o) => o.op === 'appear')) ?? steps[0];
		const ap = s.scene.find((o) => o.op === 'appear');
		if (ap?.op === 'appear')
			out.push({
				kind: 'hit',
				q: `「${s.title}」で現れるのはどれ？（図の機械を押す）`,
				a: ap.id,
				why: `${ap.label} が現れる。${s.lead}`
			});
	}

	// 打つ：章の値（短い物）
	const facts = steps.flatMap((s) =>
		s.facts
			.filter((f) => f.v.length >= 1 && f.v.length <= 24 && !/\s{2}/.test(f.v))
			.map((f) => ({ s, f }))
	);
	const withNum = facts.filter((x) => /\d/.test(x.f.v));
	const pool = withNum.length > 0 ? withNum : facts;
	const tf = pool[Math.floor(pool.length / 2)];
	if (tf)
		out.push({
			kind: 'type',
			q: `章「${tf.s.title}」の「${tf.f.k}」は？（打つ）`,
			label: `${tf.f.k} =`,
			ans: tf.f.v,
			why: `${tf.f.k} は ${tf.f.v}。${tf.s.lead}`
		});

	// 選ぶ：町での呼び名（図があるとき）。無ければ章の要約
	const townNodes = [...names.keys()].filter((id) => town(id));
	if (townNodes.length >= 2) {
		const opts4 = townNodes.slice(0, 4);
		const target = opts4[hash(l.id) % opts4.length];
		const opts = mixed(
			opts4.map((id) => town(id)),
			(x) => x + l.id
		);
		out.push({
			kind: 'pick',
			q: `${names.get(target)} を、町では何と呼ぶ？`,
			opts,
			a: opts.indexOf(town(target)),
			why: `${names.get(target)} は町の「${town(target)}」。`
		});
	} else if (steps.length >= 3) {
		const target = steps[hash(l.id) % steps.length];
		const others = steps.filter((s) => s !== target && s.lead !== target.lead).slice(0, 3);
		const opts = mixed([target.lead, ...others.map((s) => s.lead)], (x) => x + l.id);
		out.push({
			kind: 'pick',
			q: `「${target.title}」で起きることは？`,
			opts,
			a: opts.indexOf(target.lead),
			why: `${target.title}：${target.lead}`
		});
	}

	// 予想の問いがあれば、もう一度（思い出す手間が記憶を強くする）
	const ask = steps.find((s) => s.ask)?.ask;
	if (ask) out.push({ kind: 'pick', q: ask.q, opts: ask.opts, a: ask.a, why: ask.why });
	return out;
}

const norm = (s: string) => s.replace(/s+/g, ' ').trim().toLowerCase();

/** 答えを確かめる。order は並べた題、hit は機械の id、type は打った文字、pick は選んだ番号 */
export function judgeRecall(
	q: Recall,
	answer: readonly string[] | string | number
): { ok: boolean; why: string; right: string } {
	switch (q.kind) {
		case 'order': {
			const a = Array.isArray(answer) ? answer : [];
			return {
				ok: a.length === q.right.length && a.every((x, i) => x === q.right[i]),
				why: q.why,
				right: q.right.join(' → ')
			};
		}
		case 'hit':
			return { ok: answer === q.a, why: q.why, right: q.a };
		case 'type':
			return {
				ok: typeof answer === 'string' && norm(answer) === norm(q.ans),
				why: q.why,
				right: q.ans
			};
		case 'pick':
			return { ok: answer === q.a, why: q.why, right: q.opts[q.a] ?? '' };
	}
}

/** 手帳の 1 枚（LS-R4） */
export function noteOf(l: Lesson, ok: number, n: number): Note {
	return {
		id: l.id,
		title: l.title,
		point: l.goal,
		town: l.explain.find((s) => s.town)?.town ?? '',
		score: `${ok} / ${n}`,
		again: l.check[0]?.ask ?? ''
	};
}

/** 同じレッスンの 1 枚は上書きし、新しい物を先頭に */
export function addNote(notes: readonly Note[], n: Note): Note[] {
	return [n, ...notes.filter((x) => x.id !== n.id)];
}
