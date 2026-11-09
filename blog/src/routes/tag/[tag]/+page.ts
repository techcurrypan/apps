import type { PageLoad } from './$types';

type Meta = { title?: string; date?: string; summary?: string; tags?: string[] };

const modules = import.meta.glob('../../blog/*/+page.md', { eager: true });

const all = Object.entries(modules).map(([path, mod]) => {
const meta = ((mod as { metadata?: Meta }).metadata ?? {}) as Meta;
const parts = path.split('/');
return {
slug: parts[parts.length - 2],
title: meta.title ?? '(無題)',
date: meta.date ?? '',
summary: meta.summary ?? '',
tags: meta.tags ?? []
};
});

export const load: PageLoad = ({ params }) => ({
tag: params.tag,
posts: all
.filter((p) => p.tags.includes(params.tag))
.sort((a, b) => b.date.localeCompare(a.date))
});
