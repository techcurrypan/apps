import { describe, expect, it } from 'vitest';
import { MODES, modeAfter, nextLabel } from './modes';

// learn-standard.md 第 19 章：上の帯の釦で 4 つの使い方を行き来し、最後の釦は次の使い方へ進む
describe('4 つの使い方の並び', () => {
	it('見る → 試す → やってみる → 思い出す', () => {
		expect(MODES.map((m) => m.label)).toEqual(['見る', '試す', 'やってみる', '思い出す']);
	});
	it('次の使い方。思い出すの次は無い', () => {
		expect(modeAfter('watch')).toBe('lab');
		expect(modeAfter('lab')).toBe('try');
		expect(modeAfter('try')).toBe('quiz');
		expect(modeAfter('quiz')).toBeNull();
	});
	it('最後の「次へ」の文言は、次の使い方とやること（例：試す：つまみを動かす）', () => {
		expect(nextLabel('watch')).toBe('試す：つまみを動かす');
		expect(nextLabel('lab')).toBe('やってみる：端末で直す');
		expect(nextLabel('try')).toBe('思い出す：答えて確かめる');
		expect(nextLabel('quiz')).toBeNull();
	});
	it('どの使い方にも、何をするかの説明（吹き出し）がある', () => {
		for (const m of MODES) expect(m.desc.length).toBeGreaterThan(5);
	});
});
