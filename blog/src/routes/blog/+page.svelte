<script lang="ts">
type Meta = { title?: string; date?: string };
const modules = import.meta.glob('./*/+page.md', { eager: true });

const posts = Object.entries(modules)
.map(([path, mod]) => {
const meta = ((mod as { metadata?: Meta }).metadata ?? {}) as Meta;
return {
slug: path.split('/')[1],
title: meta.title ?? path,
date: meta.date ?? ''
};
})
.sort((a, b) => b.date.localeCompare(a.date));
</script>

<h1>記事</h1>

<ul>
{#each posts as post (post.slug)}
<li>
<a href="/blog/{post.slug}">{post.title}</a>
<time>{post.date}</time>
</li>
{/each}
</ul>
