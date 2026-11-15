import { describe, expect, it } from 'vitest';
import { lessons } from '../content/lessons.ts';
import { git001 } from '../content/lessons/git-001.ts';
import { net007 } from '../content/lessons/net-007.ts';
import { addNote, judgeRecall, noteOf, recallOf } from './recall.ts';

describe('思い出すの問い（LS-R1）', () => {
	it('並べる・図の機械を押す・打つ・選ぶの 4 種がそろう（図と町の呼び名のあるレッスン）', () => {
		const qs = recallOf(net007);
		expect(new Set(qs.map((q) => q.kind))).toEqual(new Set(['order', 'hit', 'type', 'pick']));
	});
	it('同じレッスンからは、いつ作っても同じ問い（乱数を使わない）', () => {
		expect(JSON.stringify(recallOf(git001))).toBe(JSON.stringify(recallOf(git001)));
	});
	it('並べる問いは、最初から正しい順に並んでいない', () => {
		const q = recallOf(git001).find((x) => x.kind === 'order');
		expect(q?.kind).toBe('order');
		if (q?.kind === 'order') expect(q.items).not.toEqual(q.right);
	});
	it('全てのレッスンで 3 問以上。答えは選択肢・図の機械の中にある', () => {
		for (const l of lessons) {
			const qs = recallOf(l);
			expect(qs.length, l.id).toBeGreaterThanOrEqual(3);
			for (const q of qs) {
				if (q.kind === 'pick') expect(q.a, l.id).toBeLessThan(q.opts.length);
				if (q.kind === 'hit')
					expect(
						l.explain.some((s) => s.scene.some((o) => o.op === 'appear' && o.id === q.a)),
						l.id
					).toBe(true);
				if (q.kind === 'order') expect([...q.items].sort(), l.id).toEqual([...q.right].sort());
			}
		}
	});
});

describe('答えの判定（LS-R3）', () => {
	const qs = recallOf(net007);
	it('正しい答えで当たり、違えば外れ。外れでも理由が出る', () => {
		for (const q of qs) {
			const right =
				q.kind === 'order' ? q.right : q.kind === 'hit' ? q.a : q.kind === 'type' ? q.ans : q.a;
			expect(judgeRecall(q, right).ok, q.q).toBe(true);
			const wrong =
				q.kind === 'order'
					? [...q.right].reverse()
					: q.kind === 'hit'
						? 'nothing'
						: q.kind === 'type'
							? 'zzz'
							: (q.a + 1) % q.opts.length;
			const r = judgeRecall(q, wrong);
			expect(r.ok, q.q).toBe(false);
			expect(r.why.length).toBeGreaterThan(0);
		}
	});
	it('打つ答えは、前後の空白と大文字小文字を問わない', () => {
		const q = qs.find((x) => x.kind === 'type');
		if (q?.kind === 'type') expect(judgeRecall(q, `  ${q.ans.toUpperCase()} `).ok).toBe(true);
	});
});

describe('手帳（LS-R4・R5）', () => {
	it('終わると 1 枚：要点・町では・点数・次の見返し。同じレッスンは上書き', () => {
		const n = noteOf(net007, 3, 4);
		expect(n.score).toBe('3 / 4');
		expect(n.point).toBe(net007.goal);
		const notes = addNote(addNote([], n), noteOf(net007, 4, 4));
		expect(notes.length).toBe(1);
		expect(notes[0].score).toBe('4 / 4');
	});
});
