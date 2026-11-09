<script lang="ts">
import { posts, thumbOf, hueOf } from '../lib/posts';
</script>

<header class="head">
<h1>techcurrypan</h1>
<p>{posts.length} 本</p>
</header>

<ul class="posts">
{#each posts as post (post.slug)}
<li>
<a class="card" href="/blog/{post.slug}">
{#if post.cover}
<img class="thumb" src={post.cover} alt="" />
{:else}
<span class="thumb icon" style="--hue: {hueOf(post.slug)}">{thumbOf(post)}</span>
{/if}

<div class="main">
<div class="meta">
<time>{post.date} ・ 約 {post.minutes} 分</time>
{#each post.tags as tag (tag)}
<span class="tag">{tag}</span>
{/each}
</div>
<h2>{post.title}</h2>
{#if post.summary}<p>{post.summary}</p>{/if}
</div>
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
display: grid;
grid-template-columns: 1fr;
gap: 1rem;
padding: 1.3rem 1.5rem;
border: 1px solid var(--line);
border-radius: 12px;
text-decoration: none;
color: inherit;
transition:
border-color 0.15s,
box-shadow 0.15s,
transform 0.15s;
}

@media (min-width: 40rem) {
.card {
grid-template-columns: 5.5rem minmax(0, 1fr);
gap: 1.3rem;
align-items: start;
}
}

.card:hover {
border-color: var(--accent);
box-shadow: 0 6px 20px rgba(26, 34, 52, 0.08);
transform: translateY(-2px);
}

.thumb {
display: grid;
place-items: center;
width: 5.5rem;
height: 5.5rem;
border-radius: 10px;
object-fit: cover;
}

.thumb.icon {
background: hsl(var(--hue) 70% 94%);
font-size: 2rem;
}

.meta {
display: flex;
flex-wrap: wrap;
align-items: center;
gap: 0.5rem;
margin-bottom: 0.35rem;
}

time {
font-family: var(--mono);
font-size: 0.76rem;
color: var(--ink-dim);
margin-right: 0.3rem;
}

.tag {
padding: 0.08rem 0.55rem;
background: var(--accent-soft);
color: var(--accent);
border-radius: 999px;
font-size: 0.72rem;
font-weight: 600;
}

.card h2 {
margin: 0;
font-size: 1.25rem;
line-height: 1.6;
border: 0;
padding: 0;
}

.card p {
margin: 0.45rem 0 0;
color: var(--ink-dim);
font-size: 0.92rem;
}
</style>
