import { error } from '@sveltejs/kit';
import { lessons } from '#lib/content/lessons.ts';
import { lessonsWith } from '#lib/learn2/terms.ts';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => lessons.map((l) => ({ id: l.id }));

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
	if (!lesson) error(404, 'そのレッスンは無い');
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
		lesson,
		known: new Map(lessons.map((l) => [l.id, l.title])),
		course: lessons
			.filter((l) => l.field === lesson.field)
			.map((l) => ({ id: l.id, title: l.title })),
		index,
		termLessons
	};
};
