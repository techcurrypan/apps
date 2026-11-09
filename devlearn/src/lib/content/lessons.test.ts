// 全レッスンが説明の基準（docs/explanation-standard.md）を通ることを、単体テストでも確かめる。
import { describe, expect, it } from 'vitest';
import { checkAll } from '../lesson/check.ts';
import { stateAt } from '../lesson/state.ts';
import { lessons } from './lessons.ts';

describe('レッスン一覧', () => {
	it('見本が 1 本以上ある', () => {
		expect(lessons.length).toBeGreaterThan(0);
	});
	it('全レッスンが 15 項目の検査を通る', () => {
		expect(checkAll(lessons)).toEqual([]);
	});
	it('全レッスンの全ステップを stateAt で描ける', () => {
		for (const l of lessons)
			for (const s of l.explain) expect(stateAt(l, s.n).text.title).toBe(s.title);
	});
	it('最初のステップは空の図から始まる', () => {
		for (const l of lessons) expect(stateAt(l, 1).scene.before.nodes).toEqual([]);
	});
});
