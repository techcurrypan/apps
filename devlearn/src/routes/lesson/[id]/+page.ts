import { error } from '@sveltejs/kit';
import { lessons } from '#lib/content/lessons.ts';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => lessons.map((l) => ({ id: l.id }));

export const load: PageLoad = ({ params }) => {
	const lesson = lessons.find((l) => l.id === params.id);
	if (!lesson) error(404, 'そのレッスンは無い');
	return { lesson, known: new Map(lessons.map((l) => [l.id, l.title])) };
};
