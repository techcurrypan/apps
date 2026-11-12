// 段 10-0：道具を使う実戦を、5 つの道具で同じ形にする（git・shell・docker は模擬、js・sql は本物）
import { describe, expect, it } from 'vitest';
import type { Practice } from '../lesson/types.ts';
import { openRun, rewindRun, typeRun } from './run.ts';

const P = (tool: string, mode: 'real' | 'mock', setup: unknown, success: unknown): Practice => ({
	goal: 'g',
	tool: { name: tool, mode },
	setup,
	success,
	mistakes: [
		{ when: 'w', why: 'y', next: 'n', match: 'No such file or directory' },
		{ when: 'w2', why: 'y2', next: 'n2', match: 'ReferenceError' }
	]
});

async function play(p: Practice, lines: string[]) {
	let r = openRun(p);
	for (const l of lines) r = await typeRun(r, l);
	return r;
}

describe('道具を使う実戦（同じ形）', () => {
	it('shell：移動して合格。無い場所は間違いの返事。戻すと前の状態', async () => {
		const p = P(
			'shell',
			'mock',
			{ dirs: ['docs/notes'] },
			{ cwd: '/home/learner/demo/docs/notes' }
		);
		const r = await play(p, ['cd nothere', 'cd docs/notes']);
		expect(r.steps[0].mistake?.why).toBe('y');
		expect(r.passed).toBe(true);
		expect(r.board.cols[0].rows.map((x) => x.text)).toContain('docs/');
		const back = rewindRun(r, 1);
		expect(back.passed).toBe(false);
		expect(back.steps).toHaveLength(1);
	});

	it('shell：世界（tools-real/worlds）を名前で読める', () => {
		const r = openRun(P('shell', 'mock', { world: 'procs' }, { cwd: '/home/learner/demo' }));
		expect(r.passed).toBe(true);
	});

	it('docker：裏で動くコンテナに名前を付けて動かすと合格', async () => {
		const p = P('docker', 'mock', { images: [] }, { running: ['clock'] });
		const r = await play(p, [
			'docker run busybox:1.37 echo hello',
			'docker run -d --name clock busybox:1.37 sleep 600'
		]);
		expect(r.steps[0].out).toBe('hello\n');
		expect(r.passed).toBe(true);
		const names = r.board.cols.flatMap((c) => c.rows.map((x) => x.text)).join(' ');
		expect(names).toContain('clock');
		expect(names).toContain('busybox:1.37');
	});

	it('js：書いた物の出力が目標と同じなら合格。エラーは間違いの返事', async () => {
		const p = P('js', 'real', { code: 'let a = 1;' }, { output: '3\n' });
		let r = openRun(p);
		expect(r.editor).toBe('let a = 1;');
		r = await typeRun(r, 'console.log(b)');
		expect(r.steps[0].mistake?.why).toBe('y2');
		r = await typeRun(r, 'let a = 1;\na = a + 2;\nconsole.log(a);');
		expect(r.steps[1].out).toBe('3\n');
		expect(r.passed).toBe(true);
	});

	it('sql：結果の表が目標と同じなら合格', async () => {
		const setup = {
			sql: "CREATE TABLE t(name TEXT, price INT); INSERT INTO t VALUES ('pan', 120), ('milk', 180);"
		};
		const want = '+------+\n| name |\n+------+\n| pan  |\n| milk |\n+------+\n';
		const r = await play(P('sql', 'real', setup, { output: want }), [
			'SELECT price FROM t;',
			'SELECT name FROM t;'
		]);
		expect(r.steps[0].passedHere).toBe(false);
		expect(r.passed).toBe(true);
		expect(r.board.cols[0].rows.map((x) => x.text)).toContain('| milk |');
	});

	it('git：見本レッスンと同じ判定', async () => {
		const p = P(
			'git',
			'mock',
			{ initialized: true, files: { 'hello.txt': 'hello world\n' } },
			{ commits: 1, tracked: ['hello.txt'], statusShort: '' }
		);
		const r = await play(p, ['git add hello.txt', 'git commit -m "first commit"']);
		expect(r.passed).toBe(true);
		expect(r.git).not.toBeNull();
	});
});
