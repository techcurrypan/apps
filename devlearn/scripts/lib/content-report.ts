// content:check の結果を、人が読める行にする。
import { checkAll } from '../../src/lib/lesson/check.ts';
import type { Lesson } from '../../src/lib/lesson/types.ts';

export function report(lessons: readonly Lesson[]): { ok: boolean; lines: string[] } {
	if (lessons.length === 0)
		return { ok: false, lines: ['content:check: レッスンが 0 本。一覧の読み込みを確かめる'] };
	const problems = checkAll(lessons);
	if (problems.length === 0)
		return {
			ok: true,
			lines: [`content:check: レッスン ${lessons.length} 本を 15 項目で検査した。落ちた物は無い`]
		};
	return {
		ok: false,
		lines: [
			...problems.map((p) => `${p.lessonId}  検査 ${p.check}  ${p.where}  ${p.message}`),
			`content:check: ${problems.length} 件落ちた（レッスン ${lessons.length} 本）`
		]
	};
}
