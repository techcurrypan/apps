import { describe, expect, it } from 'vitest';
import { countChanges, diffLines, splitLines } from './diff.ts';

describe('行の差分', () => {
	it('同じなら全て keep', () => {
		expect(diffLines(['a', 'b'], ['a', 'b']).every((e) => e.op === 'keep')).toBe(true);
	});
	it('足した行・消した行', () => {
		const e = diffLines(['a', 'b', 'c'], ['a', 'x', 'c', 'd']);
		expect(e.map((x) => `${x.op}:${x.line}`)).toEqual([
			'keep:a',
			'del:b',
			'add:x',
			'keep:c',
			'add:d'
		]);
	});
	it('空から・空へ', () => {
		expect(diffLines([], ['a']).map((x) => x.op)).toEqual(['add']);
		expect(diffLines(['a'], []).map((x) => x.op)).toEqual(['del']);
	});
	it('行に分ける（末尾の改行は行を作らない）', () => {
		expect(splitLines('a\nb\n')).toEqual(['a', 'b']);
		expect(splitLines('a\nb')).toEqual(['a', 'b']);
		expect(splitLines('')).toEqual([]);
	});
	it('変更の数', () => {
		expect(countChanges('', 'hello world\n')).toEqual({ add: 1, del: 0 });
		expect(countChanges('hello world\n', 'hello world\nhello git\n')).toEqual({ add: 1, del: 0 });
		expect(countChanges('a\nb\n', 'a\nc\n')).toEqual({ add: 1, del: 1 });
		expect(countChanges('a\n', '')).toEqual({ add: 0, del: 1 });
	});
});
