import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, parseNotes, parsePrefs, parseSummary } from './prefs.ts';

describe('学習画面の好み', () => {
	it('壊れた・空の値は既定', () => {
		expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
		expect(parsePrefs('{x')).toEqual(DEFAULT_PREFS);
	});
	it('置いた値を読む', () => {
		expect(parsePrefs('{"depth":3,"town":false,"view":"seq","speed":2,"follow":false}')).toEqual({
			depth: 3,
			town: false,
			view: 'seq',
			speed: 2,
			follow: false
		});
	});
	it('街の数と手帳', () => {
		expect(parseSummary('{"money":600,"happy":61}')).toEqual({ money: 600, happy: 61 });
		expect(parseSummary('{"money":"x"}')).toBeNull();
		expect(
			parseNotes('[{"id":"net-007","title":"t","point":"p","town":"x","score":"3/3"},1]').length
		).toBe(1);
	});
});
