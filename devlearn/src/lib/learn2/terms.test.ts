import { describe, expect, it } from 'vitest';
import { lessonsWith, segment } from './terms.ts';

describe('用語の札（LS-L3）', () => {
	it('長い用語を先に当て、段落の中の最初の 1 回だけ札にする', () => {
		const p = segment('skb を送信キューへ。送信キューの skb は再送キューへ', [
			'skb',
			'送信キュー',
			'再送キュー'
		]);
		expect(p.filter((x) => x.term).map((x) => x.term)).toEqual(['skb', '送信キュー', '再送キュー']);
		expect(p.map((x) => x.text).join('')).toBe(
			'skb を送信キューへ。送信キューの skb は再送キューへ'
		);
	});
	it('用語が出るレッスンを探す', () => {
		const ls = [
			{ id: 'a', title: 'A', text: 'cwnd が増える' },
			{ id: 'b', title: 'B', text: 'Pod が戻る' }
		];
		expect(lessonsWith('cwnd', ls)).toEqual([{ id: 'a', title: 'A' }]);
	});
});
