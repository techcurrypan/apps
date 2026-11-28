import { describe, expect, it } from 'vitest';
import { startTry, tasksDone, typeLine, type TryState } from '../../learn/try3.ts';
import { TRY_MEM, memFig } from './try-mem.ts';

const type = (lines: string[], s: TryState = startTry(TRY_MEM)) =>
	lines.reduce((st, l) => typeLine(TRY_MEM, st, l), s);
const last = (s: TryState) => s.lines.slice(-1)[0];

// やってみる（mem）：本物の JavaScript を 1 行ずつ。出力は Node.js v24.19.0 の REPL と同じ形
describe('やってみる（mem・本物の JavaScript）', () => {
	it('宣言は undefined、式は値を Node.js と同じ形で返す', () => {
		const s = type(['let a = [1, 2]']);
		expect(last(s)).toEqual({ text: 'undefined', kind: 'out' });
		const t = type(['let b = a', 'b.push(3)', 'a'], s);
		expect(
			t.lines
				.filter((l) => l.kind !== 'cmd')
				.slice(-3)
				.map((l) => l.text)
		).toEqual(['undefined', '3', '[ 1, 2, 3 ]']);
	});
	it('console.log は書いた物の後に undefined', () => {
		const s = type(['let a = [1, 2]', 'console.log(a)']);
		expect(s.lines.slice(-2).map((l) => l.text)).toEqual(['[ 1, 2 ]', 'undefined']);
	});
	it('エラーは本物の名前と文で返し、その行は次から走らせない', () => {
		const s = type(['let a = [1]', 'foo']);
		expect(last(s)).toEqual({ text: 'Uncaught ReferenceError: foo is not defined', kind: 'err' });
		expect(last(type(['a'], s)).text).toBe('[ 1 ]');
	});
	it('止まらない繰り返しは決まった回数で止める（固まらない）', () => {
		const s = type(['while (true) {}']);
		expect(last(s).kind).toBe('err');
	});
	it('やることが順に済む：別名 → a も変わる → === → 写し → 写しを直しても a は無事', () => {
		const steps = [
			'let a = [1, 2]',
			'let b = a',
			'b.push(3)',
			'a',
			'a === b',
			'let c = [...a]',
			'c.push(4)',
			'a'
		];
		const s = type(steps);
		expect(tasksDone(TRY_MEM, s)).toEqual([true, true, true, true, true]);
		const early = type(steps.slice(0, 3));
		expect(tasksDone(TRY_MEM, early)).toEqual([true, false, false, false, false]);
	});
	it('図の元：名前ごとに、どの物を指すか（同じ物は同じ番号）と中身', () => {
		const s = type(['let a = [1, 2]', 'let b = a', 'let c = [...a]']);
		expect(memFig(s)).toEqual([
			{ name: 'a', obj: 0, vals: ['1', '2'] },
			{ name: 'b', obj: 0, vals: ['1', '2'] },
			{ name: 'c', obj: 1, vals: ['1', '2'] }
		]);
	});
});
