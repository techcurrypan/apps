// 模擬の道具が始まる世界。本物の記録（tools-real/record.ts）と同じ利用者・場所・設定。
import { emptyFs, mkdir, writeFile, type Fs } from '../fs.ts';
import { CLOCK_BASE, type ShellState } from './run.ts';

export const HOME = '/home/learner';
export const WORK = `${HOME}/demo`;

export const GITCONFIG = [
	'[user]',
	'\tname = learner',
	'\temail = learner@example.com',
	'[init]',
	'\tdefaultBranch = main',
	''
].join('\n');

export function baseFs(): Fs {
	let fs = emptyFs();
	for (const d of ['/home', HOME, WORK, '/tmp']) fs = mkdir(fs, d, CLOCK_BASE);
	return writeFile(fs, `${HOME}/.gitconfig`, GITCONFIG, CLOCK_BASE);
}

export function learnerWorld<X>(ext: X, fs: Fs = baseFs()): ShellState<X> {
	const vars = {
		HOME,
		USER: 'learner',
		LOGNAME: 'learner',
		SHELL: '/bin/bash',
		PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
		PWD: WORK,
		TZ: 'Asia/Tokyo',
		LANG: 'C.UTF-8',
		TERM: 'dumb'
	};
	return {
		fs,
		cwd: WORK,
		home: HOME,
		user: 'learner',
		vars,
		exported: Object.keys(vars),
		lastCode: 0,
		tick: 0,
		ext
	};
}
