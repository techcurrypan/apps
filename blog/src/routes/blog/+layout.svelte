<script lang="ts">
import { posts } from '../../lib/posts';
import { SITE } from '../../lib/site';

let { data, children } = $props();

const slug = $derived(data.pathname.replace(/^\/blog\/?/, '').replace(/\/$/, ''));
const post = $derived(posts.find((p) => p.slug === slug));
const url = $derived(SITE.url + data.pathname);
const title = $derived(post ? `${post.title} | ${SITE.name}` : `記事 | ${SITE.name}`);
const description = $derived(post?.summary || SITE.description);

const siblings = $derived(
post?.series ? posts.filter((p) => p.series === post.series).slice().reverse() : []
);
const at = $derived(siblings.findIndex((p) => p.slug === post?.slug));
const prev = $derived(at > 0 ? siblings[at - 1] : undefined);
const next = $derived(at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : undefined);

let body: HTMLElement | undefined = $state();
let headings = $state<{ id: string; text: string; level: number }[]>([]);

$effect(() => {
data.pathname;
const nodes = body?.querySelectorAll('h2, h3') ?? [];
const list: { id: string; text: string; level: number }[] = [];
nodes.forEach((n, i) => {
if (!n.id) n.id = `h-${i}`;
list.push({ id: n.id, text: n.textContent ?? '', level: Number(n.tagName[1]) });
});
headings = list;
});
</script>

<svelte:head>
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={url} />
<meta property="og:type" content={post ? 'article' : 'website'} />
<meta property="og:title" content={post?.title ?? SITE.name} />
<meta property="og:description" content={description} />
<meta property="og:url" content={url} />
<meta property="og:site_name" content={SITE.name} />
<meta name="twitter:card" content="summary_large_image" />
<link rel="alternate" type="application/rss+xml" title={SITE.name} href="/rss.xml" />
</svelte:head>

<div class="article">
<div class="body" bind:this={body}>
{#if post}
<header class="article-head">
<p class="meta">
<time>{post.date}</time>
{#each post.tags as tag (tag)}
<a class="tag" href="/tag/{tag}">{tag}</a>
{/each}
</p>
<h1>{post.title}</h1>
{#if post.summary}<p class="summary">{post.summary}</p>{/if}
</header>
{/if}

{@render children()}

{#if prev || next}
<nav class="around">
{#if prev}
<a class="prev" href="/blog/{prev.slug}">
<span>前の回</span>
<strong>{prev.title}</strong>
</a>
{:else}
<span></span>
{/if}
{#if next}
<a class="next" href="/blog/{next.slug}">
<span>次の回</span>
<strong>{next.title}</strong>
</a>
{/if}
</nav>
{/if}
</div>

{#if post && headings.length > 2}
<nav class="toc">
<h2>目次</h2>
<ul>
{#each headings as h (h.id)}
<li class:sub={h.level === 3}>
<a href="#{h.id}">{h.text}</a>
</li>
{/each}
</ul>
</nav>
{/if}
</div>

<style>
.article {
display: grid;
grid-template-columns: minmax(0, 1fr);
gap: 2rem;
}

@media (min-width: 80rem) {
.article {
grid-template-columns: minmax(0, 1fr) 14rem;
gap: 3rem;
}

.toc {
position: sticky;
top: 3rem;
align-self: start;
order: 2;
max-height: calc(100vh - 6rem);
overflow-y: auto;
}
}

.toc {
border-left: 2px solid var(--surface-2);
padding-left: 1rem;
}

.toc h2 {
margin: 0 0 0.6rem;
font-size: 0.72rem;
letter-spacing: 0.14em;
color: var(--ink-dim);
font-weight: 700;
border: 0;
padding: 0;
}

.toc ul {
list-style: none;
margin: 0;
padding: 0;
}

.toc li {
line-height: 1.6;
margin-bottom: 0.3rem;
}

.toc li.sub {
padding-left: 0.9rem;
}

.toc a {
font-size: 0.82rem;
text-decoration: none;
color: var(--ink-dim);
}

.toc a:hover {
color: var(--accent);
}

.around {
display: grid;
grid-template-columns: 1fr 1fr;
gap: 1rem;
margin-top: 4rem;
padding-top: 2rem;
border-top: 2px solid var(--surface-2);
}

.around a {
display: block;
padding: 1rem 1.2rem;
border: 1px solid var(--line);
border-radius: 12px;
text-decoration: none;
color: inherit;
}

.around a:hover {
border-color: var(--accent);
}

.around .next {
text-align: right;
}

.around span {
display: block;
font-size: 0.74rem;
color: var(--ink-dim);
}

.around strong {
display: block;
margin-top: 0.2rem;
font-size: 0.95rem;
line-height: 1.6;
}

.article-head {
padding-bottom: 1.5rem;
border-bottom: 2px solid var(--surface-2);
margin-bottom: 2.5rem;
}

.meta {
display: flex;
flex-wrap: wrap;
align-items: center;
gap: 0.5rem;
margin: 0 0 0.6rem;
}

time {
font-family: var(--mono);
font-size: 0.8rem;
color: var(--ink-dim);
margin-right: 0.3rem;
}

.tag {
padding: 0.1rem 0.6rem;
background: var(--accent-soft);
color: var(--accent);
border-radius: 999px;
font-size: 0.75rem;
font-weight: 600;
text-decoration: none;
}

.article-head h1 {
margin: 0;
font-size: 2rem;
line-height: 1.5;
}

.summary {
margin: 0.7rem 0 0;
color: var(--ink-dim);
font-size: 0.95rem;
}
</style>
