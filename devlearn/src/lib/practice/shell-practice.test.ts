// シェルの実戦：初めの状態（setup）と合格の判定（success）。docs/tools.md 4.1b。
import { describe, expect, it } from 'vitest';
import { start, typeLine } from '../tools/session.ts';
import { shellInitial, judgeShell, shellPracticeTool } from './shell-practice.ts';

describe('シェルの実戦', () => {
	it('初めの状態：ファイル・ディレクトリ・権限・始める場所', () => {
		const s = shellInitial({
			files: { 'logs/app.log': 'a\n', 'run.sh': 'echo hi\n' },
			dirs: ['tmp'],
			modes: { 'run.sh': '755' },
			cwd: 'logs'
		});
		expect(s.cwd).toBe('/home/learner/demo/logs');
		expect(s.fs['/home/learner/demo/run.sh']).toMatchObject({ mode: 0o755 });
		expect(s.fs['/home/learner/demo/tmp']).toMatchObject({ kind: 'dir' });
	});
	it('合格の判定：今いる場所・ある物・無い物・中身・権限・最後の出力', () => {
		let ses = start(shellPracticeTool(), shellInitial({ files: { 'a.txt': 'x\n' } }));
		for (const l of ['mkdir box', 'mv a.txt box/', 'chmod 600 box/a.txt', 'cd box', 'cat a.txt'])
			ses = typeLine(ses, l);
		const state = ses.entries.at(-1)?.state ?? ses.initial;
		const items = judgeShell(state, ses.entries.at(-1)?.out ?? '', {
			cwd: '/home/learner/demo/box',
			exists: ['box/a.txt'],
			absent: ['a.txt'],
			files: { 'box/a.txt': 'x\n' },
			modes: { 'box/a.txt': '600' },
			output: 'x\n'
		});
		expect(items.map((i) => i.ok)).toEqual([true, true, true, true, true, true]);
		const bad = judgeShell(state, '', { absent: ['box'] });
		expect(bad).toEqual([{ label: '無い物', want: 'box', got: 'box', ok: false }]);
	});
	it('合格の判定：/ で始まる場所は、作業場所の外のそのままの場所', () => {
		let ses = start(shellPracticeTool(), shellInitial({}));
		ses = typeLine(ses, 'echo hi > /tmp/a.txt');
		const state = ses.entries.at(-1)?.state ?? ses.initial;
		const items = judgeShell(state, '', {
			exists: ['/tmp/a.txt'],
			files: { '/tmp/a.txt': 'hi\n' }
		});
		expect(items.map((i) => i.ok)).toEqual([true, true]);
	});
});
