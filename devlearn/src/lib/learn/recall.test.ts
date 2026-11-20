import { describe, expect, it } from 'vitest';
import { lessons } from '../content/lessons.ts';
import { git001 } from '../content/lessons/git-001.ts';
import { net007 } from '../content/lessons/net-007.ts';
import { addNote, judgeRecall, noteOf, recallOf } from './recall.ts';
import { isV2 } from '../lesson/types.ts';

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

describe('打つ答えの空白', () => {
	it('間の空白（全角を含む）は 1 つとして読む。s の字は消さない', () => {
		const q = { kind: 'type' as const, q: '', label: '', ans: 'git status', why: 'x' };
		expect(judgeRecall(q, 'git\u3000 status').ok).toBe(true);
		expect(judgeRecall(q, 'git tatu').ok).toBe(false);
	});
});

describe('第 2 版のレッスンの思い出す（LS-R1・R2）', () => {
	const v2 = lessons.filter((l) => isV2(l));
	it('第 2 版のレッスンがある', () => expect(v2.length).toBeGreaterThanOrEqual(2));
	it('6 問以上。場面の問い 2 問以上・数の問い 1 問以上（レッスンの check から出す）', () => {
		for (const l of v2) {
			const qs = recallOf(l);
			expect(qs.length, l.id).toBeGreaterThanOrEqual(6);
			expect(qs.filter((q) => q.tag === 'scene').length, l.id).toBeGreaterThanOrEqual(2);
			expect(qs.filter((q) => q.tag === 'number').length, l.id).toBeGreaterThanOrEqual(1);
		}
	});
	it('場面の問いは選ぶ。正しい答えは check の how で、並びは決まった崩し方（最初が答えとは限らない）', () => {
		for (const l of v2) {
			const qs = recallOf(l).filter((q) => q.tag === 'scene');
			for (const q of qs) {
				expect(q.kind, l.id).toBe('pick');
				if (q.kind === 'pick') {
					const c = l.check.find((x) => x.ask === q.q);
					expect(q.opts[q.a], l.id).toBe(c?.how);
				}
			}
			expect(
				qs.some((q) => q.kind === 'pick' && q.a !== 0),
				l.id
			).toBe(true);
		}
	});
	it('数の問いは打つ。数が合えば当たり（桁の区切り・単位の書き方は問わない）', () => {
		const l = v2.find((x) =>
			x.check.some((c) => c.kind === 'number' && c.how.startsWith('14,480'))
		);
		expect(l).toBeDefined();
		const q = recallOf(l!).find(
			(x) => x.tag === 'number' && x.kind === 'type' && x.ans.includes('14,480')
		);
		expect(q?.kind).toBe('type');
		if (q?.kind !== 'type') return;
		expect(judgeRecall(q, '14480').ok).toBe(true);
		expect(judgeRecall(q, '14,480 B').ok).toBe(true);
		expect(judgeRecall(q, '１４４８０').ok).toBe(true);
		expect(judgeRecall(q, '14,481').ok).toBe(false);
		expect(judgeRecall(q, '').ok).toBe(false);
	});
});
