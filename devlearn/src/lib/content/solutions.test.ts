// 段 10：書いたレッスンの実戦が、決まった解き方で合格でき、間違いの手で「なぜ」と「次の一手」が出る。
// 道具の実戦は src/lib/practice/run.ts で、形の実戦は src/lib/practice/forms.ts で流す。
import { describe, expect, it } from 'vitest';
import { lessons } from './lessons.ts';
import { openRun, typeRun } from '../practice/run.ts';

/** レッスンごとの解き方（合格まで）と、間違いの手（mistakes の順に 1 つずつ） */
export const SOLUTIONS: Record<string, { pass: string[]; wrong: string[][] }> = {
	'git-001': {
		pass: ['git add hello.txt', 'git commit -m "first commit"'],
		wrong: [
			['git commit -m "x"'],
			['git add hello.tx'],
			['git add hello.txt', 'git commit -m a', 'git commit -m b']
		]
	},
	'ctr-001': {
		pass: ['docker run -d --name clock busybox:1.37 sleep 600'],
		wrong: [
			['docker run -d --name clock busybox:137 sleep 600'],
			[
				'docker run -d --name clock busybox:1.37 sleep 600',
				'docker run -d --name clock busybox:1.37 sleep 600'
			],
			['docker run -d --name clock buzybox sleep 600']
		]
	},
	'prg-001': {
		pass: ['let stock = 12;\nstock = stock - 5;\nconsole.log(stock);\n'],
		wrong: [['let stock = 12;\nstok = stock - 5;'], ['const stock = 12;\nstock = stock - 5;']]
	},
	'db-001': {
		pass: ['SELECT name, stock FROM items;'],
		wrong: [['SELECT name, stok FROM items;'], ['SELECT name, stock FROM item;']]
	},
	'lnx-001': {
		pass: ['cd docs', 'cd notes', 'ls'],
		wrong: [['cd note'], ['cd readme.txt']]
	}
};

/** 例（打った物と返った物）を流すときの初めの状態。無ければ実戦の初めの状態から流す */
const EXAMPLE_SETUP: Record<string, unknown> = {};

const NL = String.fromCharCode(10);
/** 出力を行に分ける（最後の改行の後の空の行は数えない） */
const splitOut = (t: string) => {
	const a = t.split(NL);
	return a.at(-1) === '' ? a.slice(0, -1) : a;
};

describe('書いたレッスンの例は、道具に打つと同じ物が返る', () => {
	// git-001 の例は段 2 で手元の git 2.54.0 を日時を固定して打った物で、commit の ID が模擬の時計と違う（例の前書きに書いてある）
	for (const l of lessons.filter((x) => x.practice.tool && x.id !== 'git-001')) {
		it(`${l.id}：例の ${l.example.lines.filter((x) => x.startsWith('$ ')).length} 行`, async () => {
			const setup = EXAMPLE_SETUP[l.id] ?? l.practice.setup;
			let r = openRun({ ...l.practice, setup });
			const want: string[] = [];
			const got: string[] = [];
			// js：▶ の行より前が書いた物、後が出力
			if (l.practice.tool?.name === 'js') {
				const k = l.example.lines.findIndex((x) => x.startsWith('▶'));
				r = await typeRun(r, l.example.lines.slice(0, k).join(NL));
				const st = r.steps.at(-1);
				expect(splitOut(`${st?.out ?? ''}${st?.err ?? ''}`)).toEqual(l.example.lines.slice(k + 1));
				return;
			}
			for (const line of l.example.lines) {
				if (line.startsWith('$ ') || line.startsWith('sqlite> ')) {
					const cmd = line.slice(line.indexOf(' ') + 1);
					r = await typeRun(r, cmd);
					const st = r.steps.at(-1);
					got.push(line, ...splitOut(`${st?.out ?? ''}${st?.err ?? ''}`));
					want.push(line);
				} else want.push(line);
			}
			expect(got.join(NL)).toBe(want.join(NL));
		});
	}
});

describe('書いたレッスンの実戦', () => {
	for (const l of lessons.filter((x) => x.practice.tool)) {
		const sol = SOLUTIONS[l.id];
		it(`${l.id}：解き方がある`, () => {
			expect(sol, l.id).toBeDefined();
		});
		if (!sol) continue;
		it(`${l.id}：解き方で合格する`, async () => {
			let r = openRun(l.practice);
			expect(r.passed).toBe(false);
			for (const line of sol.pass) r = await typeRun(r, line);
			expect(r.passed).toBe(true);
		});
		l.practice.mistakes.forEach((m, i) => {
			it(`${l.id}：間違い ${i + 1}「${m.when}」で、なぜと次の一手が出る`, async () => {
				let r = openRun(l.practice);
				for (const line of sol.wrong[i] ?? []) r = await typeRun(r, line);
				expect(r.steps.at(-1)?.mistake).toEqual(m);
			});
		});
	}
});
