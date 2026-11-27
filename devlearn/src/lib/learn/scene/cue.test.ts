import { describe, expect, it } from 'vitest';
import { alongPath, tokensAt } from './cue.ts';

describe('alongPath（荷物が物から物へ進む）', () => {
	const pts = [
		{ x: 0, y: 0 },
		{ x: 100, y: 0 },
		{ x: 100, y: 100 }
	];
	it('0 は最初、1 は最後、0.5 は道のりの真ん中', () => {
		expect(alongPath(pts, 0)).toEqual({ x: 0, y: 0 });
		expect(alongPath(pts, 1)).toEqual({ x: 100, y: 100 });
		expect(alongPath(pts, 0.5)).toEqual({ x: 100, y: 0 });
	});
	it('範囲の外はそろえる', () => {
		expect(alongPath(pts, -1)).toEqual({ x: 0, y: 0 });
		expect(alongPath(pts, 2)).toEqual({ x: 100, y: 100 });
	});
});

describe('tokensAt（ステップの荷物の時刻ごとの置き場）', () => {
	const at = { a: { x: 0, y: 0, s: 1, op: 1 }, b: { x: 200, y: 0, s: 1, op: 1 } };
	const tok = [{ name: 'A', tone: 'blue' as const, path: ['a', 'b'], at: 1000, d: 1000 }];
	it('始まる前は出さない', () => {
		expect(tokensAt(tok, at, 500)).toEqual([]);
	});
	it('途中は道の上、終わった後は最後の物の上に残る', () => {
		expect(tokensAt(tok, at, 1500)[0]).toMatchObject({ name: 'A', x: 100, y: -40 });
		expect(tokensAt(tok, at, 5000)[0]).toMatchObject({ x: 200 });
	});
	it('同じ時刻は同じ結果（乱数を使わない）', () => {
		expect(tokensAt(tok, at, 1234)).toEqual(tokensAt(tok, at, 1234));
	});
	it('道の物が図に無ければ出さない', () => {
		expect(tokensAt([{ ...tok[0], path: ['a', 'z'] }], at, 1500)).toEqual([]);
	});
});
