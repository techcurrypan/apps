// 出来事の種類の色の枠：レッスンの中で初めて出た順に 1, 2, … 。5 以降は 5。
import { describe, expect, it } from 'vitest';
import { git001 } from '../content/lessons/git-001.ts';
import { kindSlots } from './kinds.ts';

describe('種類の枠', () => {
	it('記録と運ばれる物の種類を、初めて出た順に数える', () => {
		const m = kindSlots(git001);
		expect(m.get('init')).toBe(1);
		expect(m.get('edit')).toBe(2);
		// ステップ 3 では、運ばれる物（blob）が記録（add）より先に出る
		expect(m.get('blob')).toBe(3);
		expect(m.get('add')).toBe(4);
		expect(m.get('tree')).toBe(5);
		expect(m.get('commit')).toBe(5);
		expect(m.get('ref')).toBe(5);
	});
	it('同じレッスンからは同じ割り当て', () => {
		expect([...kindSlots(git001)]).toEqual([...kindSlots(git001)]);
	});
});
