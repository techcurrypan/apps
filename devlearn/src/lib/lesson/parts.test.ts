// 1 レッスンの 7 段（L-1）。
import { describe, expect, it } from 'vitest';
import { PARTS, movePart, partLabel } from './parts.ts';

describe('7 段', () => {
	it('目的 / 前提 / 解説 / 例 / 実戦 / 確認 / 次 の順', () => {
		expect(PARTS.map(partLabel)).toEqual(['目的', '前提', '解説', '例', '実戦', '確認', '次']);
	});
	it('前後へ移る。端では止まる', () => {
		expect(movePart('explain', 1)).toBe('example');
		expect(movePart('explain', -1)).toBe('prereq');
		expect(movePart('goal', -1)).toBe('goal');
		expect(movePart('next', 1)).toBe('next');
	});
});
