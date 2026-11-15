// content:check の結果を、人が読める行にする。
import { SOLUTIONS } from '../../src/lib/content/solutions.ts';
import { checkAll } from '../../src/lib/lesson/check.ts';
import { INSIDE_FIELDS } from '../../src/lib/lesson/inside-fields.ts';
import type { Lesson } from '../../src/lib/lesson/types.ts';
import { COMMAND_REFS, commandKeys } from '../../src/lib/practice/refs.ts';

/** 実戦の解き方で使うコマンド（検査 20） */
export function usedCommands(lessons: readonly Lesson[]): Map<string, string[]> {
	const out = new Map<string, string[]>();
	for (const l of lessons) {
		const tool = l.practice.tool?.name;
		const sol = SOLUTIONS[l.id];
		if (!tool || !sol) continue;
		out.set(l.id, [...new Set(sol.pass.flatMap((line) => commandKeys(tool, line)))]);
	}
	return out;
}

export function report(lessons: readonly Lesson[]): { ok: boolean; lines: string[] } {
	if (lessons.length === 0)
		return { ok: false, lines: ['content:check: レッスンが 0 本。一覧の読み込みを確かめる'] };
	const refs = Object.fromEntries(Object.entries(COMMAND_REFS).map(([k, v]) => [k, v.url]));
	const problems = checkAll(lessons, {
		insideFields: INSIDE_FIELDS,
		refs,
		used: usedCommands(lessons)
	});
	const inside = lessons.filter((l) => l.explain.some((s) => s.inside)).length;
	if (problems.length === 0)
		return {
			ok: true,
			lines: [
				`content:check: レッスン ${lessons.length} 本を 25 項目で検査した（中身の板を持つ物 ${inside} 本。検査 16・20 を当てる分野：${[...INSIDE_FIELDS].join('・') || '無し'}）。落ちた物は無い`
			]
		};
	return {
		ok: false,
		lines: [
			...problems.map((p) => `${p.lessonId}  検査 ${p.check}  ${p.where}  ${p.message}`),
			`content:check: ${problems.length} 件落ちた（レッスン ${lessons.length} 本）`
		]
	};
}
