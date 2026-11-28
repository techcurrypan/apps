import { error } from '@sveltejs/kit';
import { lessons } from '#lib/content/lessons.ts';
import { lessonsWith } from '#lib/learn2/terms.ts';
import { V3_LESSONS, v3Of } from '#lib/content/v3/index.ts';
import type { EntryGenerator, PageLoad } from './$types';

/** 第 3 版だけで書いた題（旧版のレッスンが無い物。10-P の見本の題 sta-019 など）も開ける */
const v3Only = () => V3_LESSONS.filter((v) => !lessons.some((l) => l.id === v.id));

export const entries: EntryGenerator = () => [
	...lessons.map((l) => ({ id: l.id })),
	...v3Only().map((v) => ({ id: v.id }))
];

/** レッスンの文（用語が出るレッスンを探す。LS-L3） */
const textOf = (l: (typeof lessons)[number]) =>
	[
		l.title,
		...l.explain.flatMap((s) => [
			s.title,
			...s.body,
			...(s.depth ? [...s.depth.work, ...s.depth.deep] : [])
		])
	].join(' ');

export const load: PageLoad = ({ params }) => {
	const lesson = lessons.find((l) => l.id === params.id);
	if (!lesson) {
		const v3 = v3Of(params.id);
		if (!v3) error(404, 'そのレッスンは無い');
		return {
			id: v3.lesson.id,
			title: v3.lesson.title,
			lesson: null,
			known: new Map<string, string>(),
			course: [],
			index: [],
			termLessons: {}
		};
	}
	const texts = lessons.map((l) => ({ id: l.id, title: l.title, text: textOf(l) }));
	const termLessons = Object.fromEntries(
		(lesson.terms ?? []).map((t) => [t.word, lessonsWith(t.word, texts)])
	);
	const index = [
		...lessons.map((l) => ({ kind: 'lesson' as const, id: l.id, title: l.title, sub: l.goal })),
		...lessons.flatMap((l) =>
			(l.terms ?? []).map((t) => ({
				kind: 'term' as const,
				id: t.word,
				title: t.word,
				sub: t.mean
			}))
		)
	];
	return {
		id: lesson.id,
		title: lesson.title,
		lesson,
		known: new Map(lessons.map((l) => [l.id, l.title])),
		course: lessons
			.filter((l) => l.field === lesson.field)
			.map((l) => ({ id: l.id, title: l.title })),
		index,
		termLessons
	};
};
