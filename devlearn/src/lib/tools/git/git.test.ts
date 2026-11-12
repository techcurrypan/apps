// 模擬の git：巻き戻しと、記録に無い所の振る舞い。本物との一致は real.test.ts。
import { describe, expect, it } from 'vitest';
import { current, rewind, start, typeLine } from '../session.ts';
import { shellTool } from '../shell/run.ts';
import { learnerWorld, WORK } from '../shell/world.ts';
import { gitCommands } from './git.ts';
import type { GitExt } from './repo.ts';

const tool = shellTool<GitExt>(gitCommands());
const fresh = () => start(tool, learnerWorld<GitExt>({ repos: {} }));
const typeAll = (lines: string[]) => lines.reduce(typeLine, fresh());

describe('巻き戻し', () => {
	const lines = [
		'git init',
		"printf 'hello world\\n' > hello.txt",
		'git add hello.txt',
		'git commit -m "first commit"'
	];

	it('commit の前に戻すと、記録が無く、ステージに残っている', () => {
		const back = rewind(typeAll(lines), 3);
		const after = typeLine(back, 'git log --oneline');
		expect(after.entries.at(-1)?.err).toBe(
			"fatal: your current branch 'main' does not have any commits yet\n"
		);
		expect(typeLine(back, 'git status --short').entries.at(-1)?.out).toBe('A  hello.txt\n');
	});

	it('init の前まで戻すと、リポジトリもファイルも無い', () => {
		const back = rewind(typeAll(lines), 0);
		expect(current(back).ext.repos).toEqual({});
		expect(typeLine(back, 'ls -a').entries.at(-1)?.out).toBe('.  ..\n');
	});

	it('戻した所から打ち直すと、同じ物を打てば同じ ID になる', () => {
		const once = typeAll(lines);
		const again = lines.slice(3).reduce(typeLine, rewind(once, 3));
		expect(again.entries.at(-1)?.out).toBe(once.entries.at(-1)?.out);
		expect(current(again)).toEqual(current(once));
	});
});

describe('記録の外', () => {
	it('リポジトリの外では fatal で 128', () => {
		const s = typeAll(['git status']);
		expect(s.entries[0]).toMatchObject({
			err: 'fatal: not a git repository (or any of the parent directories): .git\n',
			code: 128
		});
	});

	it('扱わない命令は、模擬だとはっきり返す', () => {
		const s = typeAll(['git init', 'git bisect start']);
		expect(s.entries[1].err).toContain('模擬の git');
		expect(s.entries[1].code).toBe(1);
	});

	it('git rebase 土台 枝 の形（枝へ移ってから積み直す）は扱わないと返す。黙って今の枝で積み直さない', () => {
		const s = typeAll(['git init', 'git commit --allow-empty -m a', 'git rebase main feature']);
		expect(s.entries[2].err).toContain('模擬の git');
		expect(s.entries[2].code).toBe(1);
	});

	it('リポジトリは作業場所に .git を作る', () => {
		const s = typeAll(['git init']);
		expect(current(s).fs[`${WORK}/.git`]?.kind).toBe('dir');
	});
});
