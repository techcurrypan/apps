<script lang="ts">
type Meta = { title?: string; date?: string; summary?: string; tags?: string[] };
const modules = import.meta.glob('./blog/*/+page.md', { eager: true });

const posts = Object.entries(modules)
.map(([path, mod]) => {
const meta = ((mod as { metadata?: Meta }).metadata ?? {}) as Meta;
const parts = path.split('/');
return {
slug: parts[parts.length - 2],
title: meta.title ?? '(無題)',
date: meta.date ?? '',
summary: meta.summary ?? '',
tags: meta.tags ?? []
};
})
.sort((a, b) => b.date.localeCompare(a.date));
</script>

<header class="head">
<h1>記事</h1>
<p>{posts.length} 本</p>
</header>

<ul class="posts">
{#each posts as post (post.slug)}
<li>
<a class="card" href="/blog/{post.slug}">
<div class="meta">
<time>{post.date}</time>
{#each post.tags as tag (tag)}
<span class="tag">{tag}</span>
{/each}
</div>
<h2>{post.title}</h2>
{#if post.summary}<p>{post.summary}</p>{/if}
<span class="more">読む →</span>
</a>
</li>
{/each}
</ul>

<style>
.head {
display: flex;
align-items: baseline;
justify-content: space-between;
gap: 1rem;
padding-bottom: 1rem;
border-bottom: 2px solid var(--surface-2);
margin-bottom: 2rem;
}

.head h1 {
margin: 0;
}

.head p {
margin: 0;
color: var(--ink-dim);
font-size: 0.85rem;
}

.posts {
list-style: none;
margin: 0;
padding: 0;
display: grid;
gap: 1rem;
}

.card {
display: block;
padding: 1.4rem 1.6rem 1.5rem;
background: var(--bg);
border: 1px solid var(--line);
border-radius: 12px;
text-decoration: none;
color: inherit;
transition:
border-color 0.15s,
box-shadow 0.15s,
transform 0.15s;
}

.card:hover {
border-color: var(--accent);
box-shadow: 0 6px 20px rgba(26, 34, 52, 0.08);
transform: translateY(-2px);
}

.meta {
display: flex;
flex-wrap: wrap;
align-items: center;
gap: 0.5rem;
margin-bottom: 0.4rem;
}

time {
font-family: var(--mono);
font-size: 0.78rem;
color: var(--ink-dim);
margin-right: 0.3rem;
}

.tag {
padding: 0.1rem 0.6rem;
background: var(--accent-soft);
color: var(--accent);
border-radius: 999px;
font-size: 0.74rem;
font-weight: 600;
}

.card h2 {
margin: 0;
font-size: 1.3rem;
line-height: 1.6;
border: 0;
padding: 0;
}

.card p {
margin: 0.5rem 0 0;
color: var(--ink-dim);
font-size: 0.93rem;
max-width: 74ch;
}

.more {
display: inline-block;
margin-top: 0.9rem;
font-size: 0.85rem;
font-weight: 600;
color: var(--accent);
}
</style>
