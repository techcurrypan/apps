// 模擬のシェルの基本。本物との一字ずつの一致は tools-real の記録で確かめる（real.test.ts）。
import { describe, expect, it } from 'vitest';
import { readFile } from '../fs.ts';
import { current, start, typeLine, type Session } from '../session.ts';
import { basicCommands, columns, formatPrintf } from './basic.ts';
import { nowOf, shellTool, type ShellState } from './run.ts';
import { learnerWorld, WORK } from './world.ts';

type S = ShellState<null>;
const tool = shellTool<null>(basicCommands<null>());
const run = (lines: string[]): Session<S> =>
	lines.reduce(typeLine, start(tool, learnerWorld(null)));
const last = (s: Session<S>) => s.entries.at(-1);

describe('シェル', () => {
	it('printf をファイルへ書き、cat で読む', () => {
		const s = run(["printf 'hello world\\n' > hello.txt", 'cat hello.txt']);
		expect(last(s)?.out).toBe('hello world\n');
		expect(readFile(current(s).fs, `${WORK}/hello.txt`)).toBe('hello world\n');
	});

	it('>> は後ろに足す', () => {
		const s = run(['echo a > f', 'echo b >> f', 'cat f']);
		expect(last(s)?.out).toBe('a\nb\n');
	});

	it('無い命令は 127 で、bash の言い方で返す', () => {
		const s = run(['nosuch x']);
		expect(last(s)).toMatchObject({ out: '', err: 'bash: nosuch: command not found\n', code: 127 });
	});

	it('cd と pwd、無い場所への cd', () => {
		const s = run(['cd ..', 'pwd', 'cd nope']);
		expect(s.entries[1].out).toBe('/home/learner\n');
		expect(last(s)).toMatchObject({ err: 'bash: cd: nope: No such file or directory\n', code: 1 });
	});

	it('&& は前が成功したときだけ、|| は失敗したときだけ', () => {
		expect(last(run(['cat nope && echo yes']))?.out).toBe('');
		expect(last(run(['cat nope || echo no']))?.out).toBe('no\n');
		expect(last(run(['cat nope; echo $?']))?.out).toBe('1\n');
	});

	it('パイプで次の命令へ渡す', () => {
		expect(last(run(['echo hi | cat']))?.out).toBe('hi\n');
	});

	it('変数を置き、展開する', () => {
		expect(last(run(['X=abc', 'echo "$X-1" $HOME']))?.out).toBe('abc-1 /home/learner\n');
	});

	it('読めない行は bash の言い方で返す', () => {
		expect(last(run(["echo 'abc"]))).toMatchObject({
			err: "bash: unexpected EOF while looking for matching `''\n",
			code: 2
		});
	});

	it('ls：端末では横に並べ、パイプの先では 1 行に 1 つ', () => {
		const s = run(['touchless=1', 'echo > b', 'echo > a', 'echo > .h']);
		const tty = typeLine(s, 'ls');
		expect(last(tty)?.out).toBe('a  b\n');
		expect(last(typeLine(s, 'ls | cat'))?.out).toBe('a\nb\n');
		expect(last(typeLine(s, 'ls -a'))?.out).toBe('.  ..  .h  a  b\n');
	});

	it('時計は打った行ごとに 1 分進む', () => {
		const s = run(['echo a', 'echo b']);
		expect(current(s).tick).toBe(2);
		expect(nowOf(2) - nowOf(0)).toBe(120);
	});
});

describe('部品', () => {
	it('printf の書式', () => {
		expect(formatPrintf('%s=%d\\n', ['a', '3', 'b', '4'])).toBe('a=3\nb=4\n');
		expect(formatPrintf('100%%\\t\\\\', [])).toBe('100%\t\\');
	});

	it('ls の並べ方：幅 80 に収まる最も多い列で、縦に詰める', () => {
		const names = Array.from({ length: 12 }, (_, i) => `file-number-${String(i).padStart(2, '0')}`);
		const out = columns(names);
		const lines = out.trimEnd().split('\n');
		expect(lines.every((l) => l.length <= 80)).toBe(true);
		expect(lines[0].startsWith('file-number-00  file-number-03')).toBe(true);
	});
});
