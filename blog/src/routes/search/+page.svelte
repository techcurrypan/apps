<script lang="ts">
import { posts, thumbOf, hueOf } from '../../lib/posts';

let q = $state('');

const hits = $derived(
q.trim() === ''
? []
: posts.filter((p) => {
const t = q.trim().toLowerCase();
return (
p.title.toLowerCase().includes(t) ||
p.summary.toLowerCase().includes(t) ||
p.tags.some((tag) => tag.toLowerCase().includes(t)) ||
p.series.toLowerCase().includes(t)
);
})
);
</script>

<h1>検索</h1>

<input bind:value={q} placeholder="題名・概要・タグ" autocomplete="off" />

{#if q.trim() !== ''}
<p class="count">{hits.length} 件</p>
{/if}

<ul class="posts">
{#each hits as post (post.slug)}
<li>
<a href="/blog/{post.slug}">
<span class="icon" style="--hue: {hueOf(post.slug)}">{thumbOf(post)}</span>
<span class="body">
<strong>{post.title}</strong>
<span class="sub">{post.date} ・ {post.summary}</span>
</span>
</a>
</li>
{/each}
</ul>

<style>
input {
width: 100%;
max-width: 32rem;
padding: 0.7rem 1rem;
border: 1px solid var(--line);
border-radius: 10px;
font-size: 1rem;
font-family: inherit;
color: var(--ink);
background: var(--bg);
}

input:focus {
outline: none;
border-color: var(--accent);
}

.count {
color: var(--ink-dim);
font-size: 0.85rem;
}

.posts {
list-style: none;
margin: 1rem 0 0;
padding: 0;
}

.posts a {
display: flex;
gap: 1rem;
align-items: center;
padding: 0.9rem 0;
border-bottom: 1px solid var(--line);
text-decoration: none;
color: inherit;
}

.icon {
display: grid;
place-items: center;
width: 2.6rem;
height: 2.6rem;
flex: none;
border-radius: 8px;
background: hsl(var(--hue) 70% 94%);
font-size: 1.2rem;
}

strong {
display: block;
font-size: 1.02rem;
line-height: 1.6;
}

.posts a:hover strong {
color: var(--accent);
}

.sub {
display: block;
color: var(--ink-dim);
font-size: 0.85rem;
}
</style>
