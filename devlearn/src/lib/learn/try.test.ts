import { describe, expect, it } from 'vitest';
import { git001 } from '../content/lessons/git-001.ts';
import { net007 } from '../content/lessons/net-007.ts';
import type { Board } from '../practice/board.ts';
import { beatsOf, insideAt, nodesAt } from './model.ts';
import { goalsOf, hintOf, homeOf, hostOf, samplesOf, tryLesson, type TryCmd } from './try.ts';

const board = (rows: string[]): Board => ({
	cols: [
		{
			key: 'tree',
			title: '作業場所',
			sub: '/home/learner',
			rows: rows.map((r) => ({ key: r, text: r }))
		}
	]
});
const cmd = (line: string, code = 0, out = 'ok\n', err = ''): TryCmd => ({ line, out, err, code });

describe('やってみるの出来事（LS-P9・LS-I9）', () => {
	it('打っていなければ、元のレッスンの概要（出来事 0）を描く。図は全ての機械を出す', () => {
		const v = tryLesson(net007, [], [board([])]);
		expect(nodesAt(v, 0, 'after').length).toBeGreaterThan(0);
		expect(insideAt(v, 0, 'after').logs.length).toBe(0);
	});
	it('打った命令 1 つが出来事 1 つ。flow に当たる命令は、その線を動く', () => {
		const v = tryLesson(net007, [cmd('curl -v http://shop.example.com/')], [board([]), board([])]);
		const b = beatsOf(v);
		expect(b.length).toBe(2);
		expect(b[1].move?.from).toBe('me');
		expect(b[1].move?.to).toBe('web');
		expect(b[1].move?.payload).toBe('curl');
	});
	it('flow に当たらない命令は、自分の機械の中の出来事（輪）になる', () => {
		const v = tryLesson(net007, [cmd('echo hi > a.txt')], [board([]), board([])]);
		const m = beatsOf(v)[1].move;
		expect(m?.from).toBe(homeOf(net007));
		expect(m?.to).toBe(homeOf(net007));
	});
	it('失敗した命令は種類「エラー」。記録の行に、返ってきた 1 行目が出る', () => {
		const v = tryLesson(
			net007,
			[cmd('curl http://x/', 6, '', 'curl: (6) Could not resolve host: x\n')],
			[board([]), board([])]
		);
		expect(v.explain[0].log.kind).toBe('エラー');
		expect(v.explain[0].log.info).toContain('Could not resolve host');
	});
	it('中身の板：荷物は打った命令と返ってきた物。OS の中は道具の状態で、前と比べて増えた行に印', () => {
		const v = tryLesson(
			net007,
			[cmd('echo yorozu > server.txt', 0, '')],
			[board(['notes.txt']), board(['notes.txt', 'server.txt'])]
		);
		const inside = insideAt(v, 1, 'after', [hostOf(net007, board(['notes.txt']), '')]);
		expect(inside.packet?.parts[0].fields[0].v).toBe('echo yorozu > server.txt');
		const rows = inside.hosts[0].rows;
		expect(rows.find((r) => r.what === 'server.txt')?.mark).toBe('new');
		expect(rows.find((r) => r.what === 'notes.txt')?.mark).toBe('same');
	});
	it('ログは新しい行が上', () => {
		const v = tryLesson(
			net007,
			[cmd('echo a', 0, 'a\n'), cmd('echo b', 0, 'b\n')],
			[board([]), board([]), board([])]
		);
		expect(insideAt(v, 2, 'after').logs[0].text).toBe('b');
	});
	it('同じ命令の並びからは、いつ作っても同じ（状態だけから描ける）', () => {
		const cs = [cmd('git add hello.txt'), cmd('git commit -m x')];
		const bs = [board([]), board(['a']), board(['a', 'b'])];
		expect(JSON.stringify(tryLesson(git001, cs, bs))).toBe(
			JSON.stringify(tryLesson(git001, cs, bs))
		);
	});
});

describe('やること・ヒント・命令の見本（LS-P4・P6・P7）', () => {
	const judge = [
		{ label: 'commit の数', want: '1', got: '0', ok: false },
		{ label: '追跡しているファイル', want: 'hello.txt', got: '', ok: false }
	];
	it('済・今・まだ。最初の済んでいない物が「今」', () => {
		const g = goalsOf([{ ...judge[0], ok: true }, judge[1]]);
		expect(g.map((x) => x.state)).toEqual(['ok', 'cur']);
		expect(goalsOf(judge).map((x) => x.state)).toEqual(['cur', 'todo']);
	});
	it('ヒントは押すたびに 1 段ずつ具体になり、同じ回数なら同じ文', () => {
		const a = hintOf(git001, judge, null, 1);
		const b = hintOf(git001, judge, null, 2);
		expect(a).not.toBe(b);
		expect(hintOf(git001, judge, null, 1)).toBe(a);
		expect(a).toContain('commit の数');
	});
	it('間違えた後のヒントは、その間違いの「次の一手」', () => {
		const m = git001.practice.mistakes[0];
		expect(hintOf(git001, judge, m, 1)).toContain(m.next);
	});
	it('命令の見本は、例の $ の行から取る（答えそのものではない）', () => {
		const s = samplesOf(git001);
		expect(s.length).toBeGreaterThan(0);
		expect(s.every((x) => !x.startsWith('$'))).toBe(true);
	});
});
