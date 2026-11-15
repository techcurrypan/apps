import { describe, expect, it } from 'vitest';
import { git001 } from '../content/lessons/git-001.ts';
import { changedKeys, gitBoard, gitPicture } from './git-picture.ts';
import { openPractice, typePractice } from './tool-practice.ts';

const stateAfter = (lines: string[]) => {
	const r = lines.reduce(typePractice, openPractice(git001.practice));
	return r.session.entries.at(-1)?.state ?? r.session.initial;
};

describe('git の絵', () => {
	it('初め：作業ツリーに hello.txt（追跡していない）、ステージもリポジトリも空', () => {
		const p = gitPicture(stateAfter([]));
		expect(p.worktree).toEqual([{ key: 'wt:hello.txt', name: 'hello.txt', mark: '??' }]);
		expect(p.index).toEqual([]);
		expect(p.commits).toEqual([]);
		expect(p.branch).toBe('main');
	});

	it('add の後：ステージに blob の ID', () => {
		const p = gitPicture(stateAfter(['git add hello.txt']));
		expect(p.index).toEqual([{ key: 'ix:hello.txt', name: 'hello.txt', id: '3b18e51' }]);
		expect(p.worktree[0].mark).toBe('A ');
	});

	it('commit の後：リポジトリに commit、HEAD の枝が指す', () => {
		const p = gitPicture(stateAfter(['git add hello.txt', 'git commit -m first']));
		expect(p.commits).toHaveLength(1);
		expect(p.commits[0].subject).toBe('first');
		expect(p.commits[0].refs).toEqual(['HEAD -> main']);
	});

	it('前と後で替わった物の鍵', () => {
		const a = gitPicture(stateAfter([]));
		const b = gitPicture(stateAfter(['git add hello.txt']));
		expect(changedKeys(a, b)).toEqual(new Set(['wt:hello.txt', 'ix:hello.txt']));
		expect(changedKeys(b, b)).toEqual(new Set());
	});

	it('リポジトリが無ければ、その事が分かる', () => {
		const p = gitPicture(
			openPractice({ ...git001.practice, setup: { initialized: false, files: {} } }).session.initial
		);
		expect(p.repo).toBe(false);
	});
});

describe('git の絵を OS の中の行にする（LS-I9）', () => {
	it('作業ツリー・ステージ・記録の 3 列。記録には ID と説明、枝の名札', () => {
		const b = gitBoard({
			repo: true,
			branch: 'main',
			worktree: [{ key: 'wt:a.txt', name: 'a.txt', mark: 'A ' }],
			index: [{ key: 'ix:a.txt', name: 'a.txt', id: '3b18e51' }],
			commits: [{ key: 'c:84eecf4', id: '84eecf4', subject: 'first', refs: ['HEAD -> main'] }]
		});
		expect(b.cols.map((c) => c.title)).toEqual(['作業ツリー', 'ステージ', '記録']);
		expect(b.cols[2].rows[0].text).toBe('84eecf4 first');
		expect(b.cols[2].rows[0].tag).toBe('HEAD -> main');
		expect(b.cols[0].rows[0].tag).toBe('A ');
	});
	it('リポジトリが無ければ、作業ツリーだけ', () => {
		const b = gitBoard({ repo: false, branch: '', worktree: [], index: [], commits: [] });
		expect(b.cols.map((c) => c.key)).toEqual(['wt']);
	});
});
