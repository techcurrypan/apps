import { describe, expect, it } from 'vitest';
import { checkRecall, moveItem, recallScore, type Recall3 } from './recall3';
import { RECALL_TCP } from '../content/v3/recall-tcp';

// learn-standard.md 第 19 章「思い出す」：選ぶ・並べる・図を押す・数・説明（短い文）。答えると理由。最後に点と手帳の 1 枚
describe('答え合わせ（checkRecall）', () => {
	const pick: Recall3 = { k: 'pick', q: 'q', opts: ['a', 'b'], ans: 1, why: 'w' };
	const order: Recall3 = {
		k: 'order',
		q: 'q',
		items: ['1', '2', '3'],
		start: ['3', '1', '2'],
		why: 'w'
	};
	const hit: Recall3 = { k: 'hit', q: 'q', hits: ['wq', 'rtx'], ans: 'rtx', why: 'w' };
	const num: Recall3 = { k: 'num', q: 'q', ans: 14480, unit: 'B', why: 'w' };
	const text: Recall3 = {
		k: 'text',
		q: 'q',
		keys: [['再送', '送り直'], ['キュー']],
		model: 'm',
		why: 'w'
	};
	it('選ぶ・図を押す：同じなら当たり', () => {
		expect(checkRecall(pick, 1).ok).toBe(true);
		expect(checkRecall(pick, 0).ok).toBe(false);
		expect(checkRecall(hit, 'rtx').ok).toBe(true);
		expect(checkRecall(hit, 'wq').ok).toBe(false);
	});
	it('並べる：並びが全て同じなら当たり', () => {
		expect(checkRecall(order, ['1', '2', '3']).ok).toBe(true);
		expect(checkRecall(order, ['1', '3', '2']).ok).toBe(false);
	});
	it('数：桁の区切り・全角・単位があっても読む', () => {
		expect(checkRecall(num, '14,480').ok).toBe(true);
		expect(checkRecall(num, '１４４８０ B').ok).toBe(true);
		expect(checkRecall(num, '14481').ok).toBe(false);
		expect(checkRecall(num, '').ok).toBe(false);
	});
	it('説明：大事な言葉の組ごとに、どれか 1 つが入っていれば当たり。外れは足りない言葉を返す', () => {
		expect(checkRecall(text, '再送キューに残るから').ok).toBe(true);
		expect(checkRecall(text, 'キューで送り直す').ok).toBe(true);
		const r = checkRecall(text, '送り直す');
		expect(r.ok).toBe(false);
		expect(r.missing).toEqual(['キュー']);
	});
	it('答えると必ず理由が返る', () => {
		expect(checkRecall(pick, 0).why).toBe('w');
	});
});

describe('並べる問いの動かし方（moveItem）', () => {
	it('上へ・下へ。端では動かない。元の並びは変えない', () => {
		const a = ['x', 'y', 'z'];
		expect(moveItem(a, 1, -1)).toEqual(['y', 'x', 'z']);
		expect(moveItem(a, 2, 1)).toEqual(['x', 'y', 'z']);
		expect(a).toEqual(['x', 'y', 'z']);
	});
});

describe('点（recallScore）', () => {
	it('当たりの数と全ての数', () => {
		expect(recallScore([true, false, true, undefined])).toEqual({ right: 2, total: 4 });
	});
});

describe('TCP の思い出す', () => {
	it('5 種（選ぶ・並べる・図を押す・数・説明）が全てある', () => {
		const kinds = new Set(RECALL_TCP.qs.map((q) => q.k));
		for (const k of ['pick', 'order', 'hit', 'num', 'text'])
			expect(kinds.has(k as Recall3['k'])).toBe(true);
	});
	it('並べる問いは崩した並びで始まる（正しい並びのままではない）。中身は同じ', () => {
		for (const q of RECALL_TCP.qs)
			if (q.k === 'order') {
				expect(q.start).not.toEqual(q.items);
				expect([...q.start].sort()).toEqual([...q.items].sort());
			}
	});
	it('図を押す問いの答えは押せる物の中にある。選ぶ問いの答えは選択肢の中', () => {
		for (const q of RECALL_TCP.qs) {
			if (q.k === 'hit') expect(q.hits).toContain(q.ans);
			if (q.k === 'pick') expect(q.ans).toBeLessThan(q.opts.length);
		}
	});
	it('説明の問いの手本の答えは当たりになる', () => {
		for (const q of RECALL_TCP.qs)
			if (q.k === 'text') expect(checkRecall(q, q.model).ok).toBe(true);
	});
	it('手帳の 1 枚（覚えておく事）が 3〜5 行', () => {
		expect(RECALL_TCP.note.length).toBeGreaterThanOrEqual(3);
		expect(RECALL_TCP.note.length).toBeLessThanOrEqual(5);
	});
});
