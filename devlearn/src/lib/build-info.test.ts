import { describe, expect, it } from 'vitest';
import { shortCommit, formatBuiltAt } from './build-info.ts';

describe('shortCommit', () => {
	it('40 桁のコミット ID を先頭 7 桁にする', () => {
		expect(shortCommit('3531d09aaaabbbbccccddddeeeeffff000011112')).toBe('3531d09');
	});
	it('既に短い ID はそのまま', () => {
		expect(shortCommit('3531d09')).toBe('3531d09');
	});
	it('空なら「不明」', () => {
		expect(shortCommit('')).toBe('不明');
	});
});

describe('formatBuiltAt', () => {
	it('UTC の ISO 時刻を日本時間で表す', () => {
		expect(formatBuiltAt('2026-11-09T15:04:05.000Z')).toBe('2026-11-10 00:04:05（日本時間）');
	});
	it('読めない値なら「不明」', () => {
		expect(formatBuiltAt('not-a-date')).toBe('不明');
	});
});
