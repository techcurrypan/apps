import { describe, expect, it } from 'vitest';
import { START_MINUTE as T } from './clock.ts';
import { gainedLessons, gainNotices, lessonMoves, parseKnown } from './learn.ts';
import { townMap } from './map.ts';
import { startTown, tickTown } from './town.ts';

// 段 9：修了したレッスンが街の「学んだ手」に加わる。増えた手と、それが効く受付中の要望を知らせる
const map = townMap();

describe('レッスンと街の手', () => {
	it('レッスンの手：git-001 は「記録されたかを確かめる」で、調べる・直すの両方に使う', () => {
		expect(lessonMoves('git-001')).toEqual([
			{ name: '記録されたかを確かめる', test: true, fix: true }
		]);
		expect(lessonMoves('無いレッスン')).toEqual([]);
	});

	it('増えた手：前に知っていた集まりに無く、手を持つレッスンだけ', () => {
		expect(gainedLessons(['git-001'], ['git-001', 'git-002', '無いレッスン'])).toEqual(['git-002']);
		expect(gainedLessons([], [])).toEqual([]);
		expect(gainedLessons(['git-002'], ['git-002'])).toEqual([]);
	});

	it('知らせ：増えた手が効く受付中の要望を、依頼主と症状の言葉で出す', () => {
		// 種 1 の 2 日目の朝に、町内会長の『…』（G06。候補に c-uncommitted）が届く
		const s = tickTown(startTown(1, map), T + 24 * 60 + 60, map).state;
		const n = gainNotices(s, ['git-001']);
		expect(n).toHaveLength(1);
		expect(n[0].lesson).toBe('git-001');
		expect(n[0].move).toBe('記録されたかを確かめる');
		expect(n[0].requests.length).toBeGreaterThan(0);
		expect(n[0].requests.every((r) => r.who === '町内会長')).toBe(true);
	});

	it('知らせ：効く要望が無くても、増えた手は知らせる（要望の数は 0）', () => {
		const s = startTown(1, map);
		const n = gainNotices(s, ['git-001']);
		expect(n).toHaveLength(1);
		expect(n[0].requests).toEqual([]);
	});

	it('街が覚えている集まりは、壊れていたら空として読む', () => {
		expect(parseKnown(null)).toEqual([]);
		expect(parseKnown('{')).toEqual([]);
		expect(parseKnown('[1,"git-001"]')).toEqual(['git-001']);
	});
});
