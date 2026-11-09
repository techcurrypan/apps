<script lang="ts">
import { posts } from '../../lib/posts';
import { SITE } from '../../lib/site';

let { data, children } = $props();

const slug = $derived(data.pathname.replace(/^\/blog\/?/, '').replace(/\/$/, ''));
const post = $derived(posts.find((p) => p.slug === slug));
const url = $derived(SITE.url + data.pathname);
const title = $derived(post ? `${post.title} | ${SITE.name}` : `記事 | ${SITE.name}`);
const description = $derived(post?.summary || SITE.description);
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
</svelte:head>

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

<style>
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
