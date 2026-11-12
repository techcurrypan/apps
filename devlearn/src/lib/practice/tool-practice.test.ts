// 道具を使う実戦：初めの状態・合格の判定・間違いの見分け・巻き戻し（docs/tools.md 4 章）。
import { describe, expect, it } from 'vitest';
import { git001 } from '../content/lessons/git-001.ts';
import {
	gitStart,
	judgeGit,
	openPractice,
	rewindPractice,
	typePractice,
	type PracticeRun
} from './tool-practice.ts';

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

describe('git の実戦の前準備と、枝・中身の判定', () => {
	const PRE = {
		initialized: false,
		files: {},
		prelude: [
			'git init',
			"printf 'a\\n' > a.txt",
			'git add a.txt',
			'git commit -m "first"',
			'git switch -c feature',
			"printf 'b\\n' > b.txt",
			'git add b.txt',
			'git commit -m "add b"',
			'git switch main'
		]
	};
	it('prelude の命令を打った後の状態から始める。打った物は記録に出ない', () => {
		const s = gitStart(PRE);
		const repo = s.ext.repos['/home/learner/demo'];
		expect(repo.head).toBe('refs/heads/main');
		expect(Object.keys(repo.refs).sort()).toEqual(['refs/heads/feature', 'refs/heads/main']);
		expect(s.cwd).toBe('/home/learner/demo');
	});
	it('今の枝・枝ごとの commit の数・ファイルの中身・HEAD の親の数を判定する', () => {
		const s = gitStart(PRE);
		const items = judgeGit(s, {
			commits: 1,
			tracked: ['a.txt'],
			statusShort: '',
			branch: 'main',
			branches: { main: 1, feature: 2 },
			files: { 'a.txt': 'a\n' },
			parents: 0
		});
		expect(items.map((i) => [i.label, i.ok])).toEqual([
			['commit の数', true],
			['記録に入っているファイル', true],
			['git status --short', true],
			['今の枝', true],
			['枝 main の commit の数', true],
			['枝 feature の commit の数', true],
			['a.txt の中身', true],
			['HEAD の親の数', true]
		]);
		const bad = judgeGit(s, { commits: 1, tracked: ['a.txt'], statusShort: '', branch: 'feature' });
		expect(bad.at(-1)).toEqual({ label: '今の枝', want: 'feature', got: 'main', ok: false });
	});
});
