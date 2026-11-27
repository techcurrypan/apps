import { describe, expect, it } from 'vitest';
import { firstPerStep, markTerms, termIndex, type Term } from './terms';

// explanation-standard.md 第 10 章：言葉は分野ごとに 1 か所。本文で当てる書き方 m（長い物から）
const T: Term[] = [
	{
		id: 'send',
		t: 'send',
		m: ['send()', 'send'],
		d: 'データを送るよう OS に頼む関数。',
		field: 'net',
		first: 'net-101'
	},
	{
		id: 'fd',
		t: 'fd',
		m: ['fd', 'ファイル記述子'],
		d: '開いた接続やファイルの番号札。',
		field: 'net',
		first: 'net-101'
	},
	{ id: 'buf', t: 'buf', m: ['buf'], d: '送る中身を置いた場所。', field: 'net', first: 'net-101' },
	{ id: 'sk', t: 'ソケット', m: ['ソケット'], d: '通信の口。', field: 'net', first: 'net-101' }
];

describe('言葉（terms.ts）', () => {
	it('termIndex：書き方 → 言葉。長い書き方が先', () => {
		const ix = termIndex(T);
		expect(ix[0][0]).toBe('ファイル記述子');
		expect(ix.find(([m]) => m === 'send()')?.[1].id).toBe('send');
	});
	it('markTerms：段落ごとに最初の 1 回だけ印。長い書き方を先に当てる', () => {
		const p = markTerms('send() は fd と buf を受け取る。send は戻る。', T);
		expect(p.filter((x) => x.term).map((x) => [x.text, x.term])).toEqual([
			['send()', 'send'],
			['fd', 'fd'],
			['buf', 'buf']
		]);
		expect(p.map((x) => x.text).join('')).toBe('send() は fd と buf を受け取る。send は戻る。');
	});
	it('markTerms：英字の言葉は単語の途中では当てない（sendmsg の send は当てない）', () => {
		const p = markTerms('tcp_sendmsg が呼ばれる', T);
		expect(p.some((x) => x.term === 'send')).toBe(false);
	});
	it('firstPerStep：各ステップで初めて出る言葉（前のステップで出た物は出さない）', () => {
		const steps = [['send() を呼ぶ'], ['fd と send', 'ソケット'], ['buf と fd']];
		expect(firstPerStep(steps, T)).toEqual([['send'], ['fd', 'sk'], ['buf']]);
	});
});
