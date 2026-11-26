// content:check の結果を、人が読める行にする。
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SOLUTIONS } from '../../src/lib/content/solutions.ts';
import type { Review } from '../../src/lib/lesson/check-v2.ts';
import { V2_DONE } from '../../src/lib/lesson/v2-done.ts';
import { V2_FIELDS, V2_LESSONS } from '../../src/lib/lesson/v2-scope.ts';
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

const ROOT = join(import.meta.dirname, '..', '..');

/** docs/content-sources.md の「6. 一次情報」の表にある URL（検査 34） */
export function primarySources(
	md = readFileSync(join(ROOT, 'docs/content-sources.md'), 'utf8')
): Set<string> {
	const at = md.indexOf('## 6.');
	if (at < 0) return new Set();
	const end = md.indexOf('\n## ', at + 5);
	const part = md.slice(at, end < 0 ? undefined : end);
	return new Set([...part.matchAll(/https?:\/\/[^\s|)]+/g)].map((m) => m[0]));
}

/** 専門家の査読の記録（src/lib/content/reviews/<id>.json。検査 38） */
export function reviewsOf(dir = join(ROOT, 'src/lib/content/reviews')): Record<string, Review> {
	const out: Record<string, Review> = {};
	let names: string[];
	try {
		names = readdirSync(dir).filter((n) => n.endsWith('.json'));
	} catch {
		return out;
	}
	for (const n of names)
		out[n.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(dir, n), 'utf8')) as Review;
	return out;
}

export function report(lessons: readonly Lesson[]): { ok: boolean; lines: string[] } {
	if (lessons.length === 0)
		return { ok: false, lines: ['content:check: レッスンが 0 本。一覧の読み込みを確かめる'] };
	const refs = Object.fromEntries(Object.entries(COMMAND_REFS).map(([k, v]) => [k, v.url]));
	const problems = checkAll(lessons, {
		insideFields: INSIDE_FIELDS,
		refs,
		used: usedCommands(lessons),
		sources: primarySources(),
		reviews: reviewsOf(),
		solutions: SOLUTIONS
	});
	const v2 = [...V2_LESSONS, ...V2_FIELDS].join('・') || '無し';
	const done = [...V2_DONE].join('・') || '無し';
	const inside = lessons.filter((l) => l.explain.some((s) => s.inside)).length;
	if (problems.length === 0)
		return {
			ok: true,
			lines: [
				`content:check: レッスン ${lessons.length} 本を 40 項目で検査した（中身の板を持つ物 ${inside} 本。検査 16・20 を当てる分野：${[...INSIDE_FIELDS].join('・') || '無し'}。検査 26〜40 を当てる物：${v2}。検査 38 を当てる仕上がりの物：${done}）。落ちた物は無い`
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
