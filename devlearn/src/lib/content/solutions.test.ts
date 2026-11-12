// 段 10：書いたレッスンの実戦が、決まった解き方で合格でき、間違いの手で「なぜ」と「次の一手」が出る。
// 道具の実戦は src/lib/practice/run.ts で、形の実戦は src/lib/practice/forms.ts で流す。
import { describe, expect, it } from 'vitest';
import { lessons } from './lessons.ts';
import { openRun, typeRun } from '../practice/run.ts';
import { blankAnswer, judgeForm } from '../practice/forms.ts';
import { EXAMPLE_SETUP, FORM_SOLUTIONS, SOLUTIONS } from './solutions.ts';

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
			// 合格した行に、間違いの返事を出さない（match が正しい出力に含まれていない）
			expect(r.steps.at(-1)?.mistake ?? null).toBeNull();
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

describe('書いたレッスンの形の実戦', () => {
	for (const l of lessons.filter((x) => x.practice.form)) {
		const sol = FORM_SOLUTIONS[l.id];
		it(`${l.id}：解き方がある`, () => {
			expect(sol, l.id).toBeDefined();
		});
		if (!sol) continue;
		it(`${l.id}：何もしない答えでは合格しない`, () => {
			expect(judgeForm(l.practice, blankAnswer(l.practice)).passed).toBe(false);
		});
		it(`${l.id}：解き方で合格する`, () => {
			expect(sol.pass.kind).toBe(l.practice.form);
			expect(judgeForm(l.practice, sol.pass).passed).toBe(true);
		});
		l.practice.mistakes.forEach((m, i) => {
			it(`${l.id}：間違い ${i + 1}「${m.when}」で、なぜと次の一手が出る`, () => {
				const r = judgeForm(l.practice, sol.wrong[i]);
				expect(r.passed).toBe(false);
				expect(r.mistake).toEqual(m);
			});
		});
	}
});
