import { lessons } from '#lib/content/lessons.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	const terms = lessons
		.flatMap((l) => (l.terms ?? []).map((t) => ({ ...t, id: l.id, title: l.title })))
		.sort((a, b) => a.word.localeCompare(b.word, 'ja'));
	return { terms };
};
