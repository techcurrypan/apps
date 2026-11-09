import { describe, expect, it } from 'vitest';
import { git001 } from '../content/lessons/git-001.ts';
import { changedKeys, gitPicture } from './git-picture.ts';
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
