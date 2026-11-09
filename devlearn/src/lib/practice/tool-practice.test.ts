// 道具を使う実戦：初めの状態・合格の判定・間違いの見分け・巻き戻し（docs/tools.md 4 章）。
import { describe, expect, it } from 'vitest';
import { git001 } from '../content/lessons/git-001.ts';
import { openPractice, rewindPractice, typePractice, type PracticeRun } from './tool-practice.ts';

const typeAll = (lines: string[], run: PracticeRun = openPractice(git001.practice)) =>
	lines.reduce(typePractice, run);

describe('git-001 の実戦', () => {
	it('初めは hello.txt があり、リポジトリはあるが記録は無い', () => {
		const r = typeAll(['git status --short', 'git log']);
		expect(r.steps[0].out).toBe('?? hello.txt\n');
		expect(r.steps[1].err).toContain('does not have any commits yet');
		expect(r.passed).toBe(false);
	});

	it('add して commit すると合格。判定の項目ごとに今の値が分かる', () => {
		const r = typeAll(['git add hello.txt', 'git commit -m "first commit"']);
		expect(r.passed).toBe(true);
		expect(r.judge.every((j) => j.ok)).toBe(true);
		expect(r.steps.at(-1)?.passedHere).toBe(true);
	});

	it('合格の前は、どの項目が足りないかが分かる', () => {
		const r = typeAll(['git add hello.txt']);
		const bad = r.judge.filter((j) => !j.ok).map((j) => j.label);
		expect(bad).toContain('commit の数');
	});

	it('add をせずに commit すると、1 つ目の間違いの「なぜ」と「次」を返す', () => {
		const r = typeAll(['git commit -m "first commit"']);
		expect(r.steps[0].mistake).toEqual(git001.practice.mistakes[0]);
	});

	it('名前を打ち違えると、2 つ目の間違い', () => {
		const r = typeAll(['git add hello.tx']);
		expect(r.steps[0].mistake).toEqual(git001.practice.mistakes[1]);
	});

	it('commit の後にもう一度 commit すると、3 つ目の間違い。合格は保たれる', () => {
		const r = typeAll(['git add hello.txt', 'git commit -m a', 'git commit -m b']);
		expect(r.steps[2].mistake).toEqual(git001.practice.mistakes[2]);
		expect(r.passed).toBe(true);
	});

	it('間違いに当たらない失敗は、間違い無しで出力をそのまま返す', () => {
		const r = typeAll(['nosuch']);
		expect(r.steps[0].mistake).toBeNull();
		expect(r.steps[0].code).toBe(127);
	});

	it('巻き戻すと合格も戻る。戻した所から打ち直せる', () => {
		const done = typeAll(['git add hello.txt', 'git commit -m a']);
		const back = rewindPractice(done, 1);
		expect(back.passed).toBe(false);
		expect(back.steps).toHaveLength(1);
		expect(typePractice(back, 'git commit -m a').passed).toBe(true);
	});

	it('同じ物を打てば同じ結果（乱数・時計に依らない）', () => {
		const a = typeAll(['git add hello.txt', 'git commit -m a', 'git log --oneline']);
		const b = typeAll(['git add hello.txt', 'git commit -m a', 'git log --oneline']);
		expect(a.steps.map((x) => x.out)).toEqual(b.steps.map((x) => x.out));
	});
});
