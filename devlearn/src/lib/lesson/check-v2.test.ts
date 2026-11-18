import { describe, expect, it } from 'vitest';
import { checkV2, type V2Options } from './check-v2.ts';
import type { Lesson } from './types.ts';
import { FIXTURE_SOURCES, validV2 } from './testing/v2-fixture.ts';
import { lessonHash } from './hash.ts';

const opt = (l: Lesson): V2Options => ({
	sources: FIXTURE_SOURCES,
	reviews: {
		[l.id]: {
			date: '2026-11-18',
			hash: lessonHash(l),
			items: Array.from({ length: 12 }, () => '合格')
		}
	},
	solutions: {
		[l.id]: { pass: ['a', 'b', 'c', 'd', 'e'], wrong: [], alt: ['a', 'b', 'c', 'd', 'f'] }
	}
});

function run(l: Lesson, o: V2Options = opt(l)) {
	const out: { check: number; where: string; message: string }[] = [];
	checkV2(l, (check, where, message) => out.push({ check, where, message }), o);
	return out;
}
const nums = (l: Lesson, o?: V2Options) => [...new Set(run(l, o).map((p) => p.check))];

describe('検査 26〜40（第 2 版）', () => {
	it('見本は全て通る', () => {
		expect(run(validV2())).toEqual([]);
	});
	it('26：10〜16 ステップ・種類の必須・最初は問題・最後はまとめ', () => {
		const a = validV2();
		a.explain = a.explain.slice(0, 9);
		expect(nums(a)).toContain(26);
		const b = validV2();
		b.explain[5].kind = 'mechanism'; // 失敗が 1 つになる
		expect(nums(b)).toContain(26);
		const c = validV2();
		[c.explain[0], c.explain[1]] = [c.explain[1], c.explain[0]];
		expect(nums(c)).toContain(26);
	});
	it('27：詳しさ 3 段の字数・1 文 80 字・refs', () => {
		const a = validV2();
		a.explain[2].depth = { ...a.explain[2].depth!, work: ['短い。'] };
		expect(nums(a)).toContain(27);
		const b = validV2();
		b.explain[2].depth!.intro = ['あ'.repeat(85) + '。' + 'い'.repeat(60) + '。'];
		expect(nums(b)).toContain(27);
		const c = validV2();
		c.explain[2].refs = [];
		expect(nums(c)).toContain(27);
	});
	it('28：具体値 2 つ以上・数の無い「速い」を禁止', () => {
		const a = validV2();
		a.explain[3].facts = [{ k: '箱', v: 'たくさん' }];
		a.explain[3].depth!.work = [
			'箱はあるかもしれないし、無いかもしれない。'.repeat(6),
			'中身は送る側が決めることになっていて、受ける側は決めない。'.repeat(4)
		];
		expect(nums(a)).toContain(28);
		const b = validV2();
		b.explain[3].depth!.work[0] += 'この道はとても速い。';
		expect(nums(b)).toContain(28);
	});
	it('29：合図 4 つ以上・最初は camera・全段落・同じ時刻に 3 つ・id が図にある', () => {
		const a = validV2();
		a.explain[1].motion = a.explain[1].motion!.slice(1);
		expect(nums(a)).toContain(29);
		const b = validV2();
		b.explain[1].motion = b.explain[1].motion!.map((c) => ({ ...c, para: 0 }));
		expect(nums(b)).toContain(29);
		const c = validV2();
		c.explain[1].motion = [
			...c.explain[1].motion!,
			{ at: 300, dur: 1, para: 0, do: { op: 'pulse', id: 'b' } },
			{ at: 300, dur: 1, para: 0, do: { op: 'pulse', id: 'b' } }
		];
		expect(nums(c)).toContain(29);
		const d = validV2();
		d.explain[1].motion![1] = { at: 300, dur: 500, para: 0, do: { op: 'pulse', id: 'zz' } };
		expect(nums(d)).toContain(29);
	});
	it('30：loop か none と理由・失敗は壊れる合図と失敗のログ', () => {
		const a = validV2();
		delete a.explain[1].loop;
		expect(nums(a)).toContain(30);
		const b = validV2();
		b.explain[1].loop = 'none';
		expect(nums(b)).toContain(30);
		b.explain[1].loopReason = '何も流れていないことを見せる';
		expect(nums(b)).not.toContain(30);
		const c = validV2();
		c.explain[4].motion = c.explain[4].motion!.slice(0, 4);
		expect(nums(c)).toContain(30);
	});
	it('31：short・callout・changes・board・badges', () => {
		const a = validV2();
		a.explain[0].short = '九文字以上の短い題';
		expect(nums(a)).toContain(31);
		const b = validV2();
		b.explain[0].changes = [{ mark: '+', text: '1 つ' }];
		expect(nums(b)).toContain(31);
		const c = validV2();
		c.explain[0].badges = { zz: 'x' };
		expect(nums(c)).toContain(31);
	});
	it('32：指標の合計が和・数え上げの値がステップの値', () => {
		const a = validV2();
		a.explain[2].metrics = { ...a.explain[2].metrics, total: '99 ms' };
		expect(nums(a)).toContain(32);
		const b = validV2();
		b.explain[2].motion![3] = {
			at: 1700,
			dur: 400,
			para: 1,
			do: { op: 'count', metric: 'q', to: '7 個' }
		};
		expect(nums(b)).toContain(32);
	});
	it('33：学べること 4〜7・全てに ✓', () => {
		const a = validV2();
		a.learn = [...a.learn!, '五つ目'];
		expect(nums(a)).toContain(33);
	});
	it('34：一次情報 3 件・表にある・refs が実在', () => {
		const a = validV2();
		a.sources = a.sources!.slice(0, 2);
		expect(nums(a)).toContain(34);
		const b = validV2();
		b.explain[0].refs = ['nope'];
		expect(nums(b)).toContain(34);
		const c = validV2();
		expect(nums(c, { ...opt(c), sources: new Set() })).toContain(34);
	});
	it('35：教えるとき', () => {
		const a = validV2();
		a.teach = { ...a.teach!, myths: a.teach!.myths.slice(0, 2) };
		expect(nums(a)).toContain(35);
	});
	it('36：命令 5 つ以上・正しい道 2 つ・間違い 3〜6', () => {
		const a = validV2();
		expect(
			nums(a, { ...opt(a), solutions: { [a.id]: { pass: ['a', 'b'], wrong: [] } } })
		).toContain(36);
		const b = validV2();
		b.practice.mistakes = b.practice.mistakes.slice(0, 2);
		expect(nums(b)).toContain(36);
	});
	it('37：思い出す 6 問・場面 2・数 1', () => {
		const a = validV2();
		a.check = a.check.map((c) => ({ ask: c.ask, how: c.how }));
		expect(nums(a)).toContain(37);
	});
	it('38：査読が全て合格で、いまの本文を読んだ物', () => {
		const a = validV2();
		const o = opt(a);
		a.explain[0].title = '直した';
		expect(nums(a, o)).toContain(38);
		const b = validV2();
		const ob = opt(b);
		ob.reviews![b.id].items[3] = '不合格（数が違う）';
		expect(nums(b, ob)).toContain(38);
	});
	it('39：段 3・4 の中身は impl 3 つ・layers・出典は版の tag', () => {
		const a = validV2();
		a.explain[3].impl = a.explain[3].impl!.slice(0, 2);
		expect(nums(a)).toContain(39);
		const b = validV2();
		b.sources![1].url = 'https://github.com/torvalds/linux/blob/master/net/ipv4/tcp_output.c';
		expect(
			nums(b, { ...opt(b), sources: new Set([...FIXTURE_SOURCES, b.sources![1].url]) })
		).toContain(39);
		const c = validV2();
		c.explain[3].motion![5] = {
			at: 3000,
			dur: 600,
			para: 1,
			do: { op: 'move', item: 'skb1', from: 'wq', to: 'nowhere' }
		};
		expect(nums(c)).toContain(39);
	});
});
