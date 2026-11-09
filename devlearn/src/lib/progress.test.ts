// 修了の記録（L-6）。ブラウザ内に残す。読めない値は空として扱う。
import { describe, expect, it } from 'vitest';
import { emptyProgress, markDone, parseProgress, PROGRESS_KEY, serialize } from './progress.ts';

describe('修了の記録', () => {
	it('修了を足すと、そのレッスンが済になる。元の値は変わらない', () => {
		const a = emptyProgress();
		const b = markDone(a, 'git-001');
		expect(b.done).toEqual(['git-001']);
		expect(a.done).toEqual([]);
	});
	it('同じレッスンを 2 度足しても 1 つ', () => {
		expect(markDone(markDone(emptyProgress(), 'git-001'), 'git-001').done).toEqual(['git-001']);
	});
	it('書いて読むと同じ。壊れた値・別の形は空', () => {
		const p = markDone(emptyProgress(), 'db-001');
		expect(parseProgress(serialize(p))).toEqual(p);
		expect(parseProgress(null)).toEqual(emptyProgress());
		expect(parseProgress('{oops')).toEqual(emptyProgress());
		expect(parseProgress('{"v":1,"done":[1,"x"]}')).toEqual({ v: 1, done: ['x'] });
	});
	it('保存の鍵は devlearn. で始まる', () => {
		expect(PROGRESS_KEY.startsWith('devlearn.')).toBe(true);
	});
});
