import { describe, expect, it } from 'vitest';
import { emptyFs, isDir, listDir, mkdir, readFile, remove, resolvePath, writeFile } from './fs.ts';

describe('道の解決', () => {
	it('相対・絶対・. と ..・~ を解く', () => {
		const home = '/home/learner';
		expect(resolvePath('/home/learner/demo', 'a.txt', home)).toBe('/home/learner/demo/a.txt');
		expect(resolvePath('/home/learner/demo', '../x', home)).toBe('/home/learner/x');
		expect(resolvePath('/home/learner/demo', './a/./b/', home)).toBe('/home/learner/demo/a/b');
		expect(resolvePath('/home', '/etc/../tmp', home)).toBe('/tmp');
		expect(resolvePath('/', '..', home)).toBe('/');
		expect(resolvePath('/tmp', '~', home)).toBe('/home/learner');
		expect(resolvePath('/tmp', '~/a', home)).toBe('/home/learner/a');
	});
});

describe('ファイルの木', () => {
	const base = mkdir(mkdir(emptyFs(), '/home', 0), '/home/learner', 0);

	it('書いて読める。元の木は変わらない', () => {
		const fs = writeFile(base, '/home/learner/a.txt', 'hi\n', 5);
		expect(readFile(fs, '/home/learner/a.txt')).toBe('hi\n');
		expect(readFile(base, '/home/learner/a.txt')).toBeNull();
	});

	it('親が無い所には書けない', () => {
		expect(() => writeFile(base, '/nope/a.txt', '', 0)).toThrow();
	});

	it('中身の一覧は名前の順（バイトの順）', () => {
		let fs = writeFile(base, '/home/learner/b', '', 0);
		fs = writeFile(fs, '/home/learner/B', '', 0);
		fs = writeFile(fs, '/home/learner/.hidden', '', 0);
		fs = mkdir(fs, '/home/learner/a', 0);
		expect(listDir(fs, '/home/learner')).toEqual(['.hidden', 'B', 'a', 'b']);
		expect(isDir(fs, '/home/learner/a')).toBe(true);
	});

	it('消すと、下の物も全て消える', () => {
		let fs = mkdir(base, '/home/learner/d', 0);
		fs = writeFile(fs, '/home/learner/d/x', '', 0);
		fs = remove(fs, '/home/learner/d');
		expect(listDir(fs, '/home/learner')).toEqual([]);
		expect(readFile(fs, '/home/learner/d/x')).toBeNull();
	});

	it('物を作る・消すと親の時刻が変わる。中身を書き直しても親の時刻は変わらない', () => {
		let fs = writeFile(base, '/home/learner/a', 'x', 7);
		expect(fs['/home/learner'].mtime).toBe(7);
		fs = writeFile(fs, '/home/learner/a', 'y', 9);
		expect(fs['/home/learner'].mtime).toBe(7);
		expect(fs['/home/learner/a'].mtime).toBe(9);
		fs = mkdir(fs, '/home/learner/d', 11);
		expect(fs['/home/learner'].mtime).toBe(11);
		fs = remove(fs, '/home/learner/a', 13);
		expect(fs['/home/learner'].mtime).toBe(13);
	});
});
