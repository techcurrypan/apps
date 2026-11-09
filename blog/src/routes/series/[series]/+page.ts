import type { PageLoad } from './$types';

type Meta = {
title?: string;
date?: string;
summary?: string;
tags?: string[];
series?: string;
order?: number;
icon?: string;
};

const modules = import.meta.glob('../../blog/*/+page.md', { eager: true });

const all = Object.entries(modules).map(([path, mod]) => {
const meta = ((mod as { metadata?: Meta }).metadata ?? {}) as Meta;
const parts = path.split('/');
return {
slug: parts[parts.length - 2],
title: meta.title ?? '(無題)',
date: meta.date ?? '',
summary: meta.summary ?? '',
series: meta.series ?? '',
order: Number(meta.order ?? 0),
icon: meta.icon ?? ''
};
});

export const load: PageLoad = ({ params }) => {
const posts = all
.filter((p) => p.series === params.series)
.sort((a, b) => a.order - b.order || a.date.localeCompare(b.date));

return {
series: params.series,
icon: posts.find((p) => p.icon)?.icon ?? '',
posts
};
};
