<script lang="ts">
import { groups } from '../lib/posts';
let { children } = $props();
</script>

<div class="shell">
<aside>
<a class="brand" href="/">techcurrypan</a>
<p class="tagline">作った物と、調べた事の記録</p>

<nav>
<a href="/">ホーム</a>
<a href="/blog">記事一覧</a>
</nav>

{#if groups.length > 0}
<section class="block">
<h2>トピック</h2>
<ul class="series">
{#each groups as g (g.tag)}
<li>
<a href="/tag/{g.tag}">
<span class="ring"><span class="icon">{g.icon}</span></span>
<span class="name">{g.tag}</span>
<span class="count">{g.count}</span>
</a>
</li>
{/each}
</ul>
</section>
{/if}
</aside>

<main>
{@render children()}
</main>
</div>

<style>
:global(:root) {
--bg: #ffffff;
--surface: #f7f9fc;
--surface-2: #eef2f8;
--line: #e2e8f2;
--ink: #1a2234;
--ink-soft: #3d4a61;
--ink-dim: #6b7a93;
--accent: #2563eb;
--accent-soft: #eaf1ff;
--mono: ui-monospace, "Cascadia Mono", Consolas, monospace;
--sans: system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif;
}

:global(body) {
margin: 0;
background: var(--bg);
color: var(--ink);
font-family: var(--sans);
font-size: 1.0625rem;
line-height: 1.95;
-webkit-font-smoothing: antialiased;
}

:global(a) {
color: var(--accent);
}

:global(pre.code) {
counter-reset: line;
position: relative;
background: var(--surface);
border: 1px solid var(--line);
border-radius: 10px;
padding: 2.6rem 0 1.1rem;
overflow-x: auto;
max-width: 84ch;
font-size: 0.88rem;
line-height: 1.8;
}

:global(pre.code::before) {
content: attr(data-lang);
position: absolute;
top: 0;
left: 0;
right: 0;
padding: 0.35rem 1rem;
background: var(--surface-2);
border-bottom: 1px solid var(--line);
border-radius: 10px 10px 0 0;
font-family: var(--mono);
font-size: 0.7rem;
letter-spacing: 0.14em;
text-transform: uppercase;
color: var(--ink-dim);
}

:global(pre.code .line) {
counter-increment: line;
display: block;
padding: 0 1.1rem;
}

:global(pre.code .line::before) {
content: counter(line);
display: inline-block;
width: 2.2em;
margin-right: 1.1em;
text-align: right;
color: var(--ink-dim);
opacity: 0.55;
user-select: none;
}

:global(pre.code .line:hover) {
background: rgba(37, 99, 235, 0.05);
}

:global(code) {
font-family: var(--mono);
font-size: 0.9em;
}

:global(:not(pre) > code) {
background: var(--accent-soft);
color: #1746a8;
border-radius: 4px;
padding: 0.12em 0.42em;
}

:global(blockquote) {
margin: 1.75rem 0;
padding: 0.1rem 1.25rem;
border-left: 4px solid var(--accent);
background: var(--surface);
border-radius: 0 8px 8px 0;
color: var(--ink-soft);
}

:global(table) {
border-collapse: collapse;
width: 100%;
}

:global(th),
:global(td) {
border: 1px solid var(--line);
padding: 0.5rem 0.85rem;
text-align: left;
}

:global(th) {
background: var(--surface);
}

:global(img) {
max-width: 100%;
border-radius: 10px;
}

:global(hr) {
border: 0;
border-top: 1px solid var(--line);
margin: 3rem 0;
}

.shell {
display: grid;
grid-template-columns: 1fr;
gap: 2rem;
padding: 1.5rem;
}

@media (min-width: 60rem) {
.shell {
grid-template-columns: 13rem minmax(0, 1fr);
gap: 4rem;
padding: 3rem;
}

aside {
position: sticky;
top: 3rem;
align-self: start;
}
}

.brand {
display: block;
font-size: 1.15rem;
font-weight: 800;
text-decoration: none;
color: var(--ink);
}

.tagline {
margin: 0.2rem 0 0;
font-size: 0.8rem;
line-height: 1.6;
color: var(--ink-dim);
}

nav {
display: flex;
gap: 1.25rem;
margin-top: 1.5rem;
font-size: 0.95rem;
}

@media (min-width: 60rem) {
nav {
flex-direction: column;
gap: 0.1rem;
}
}

nav a {
text-decoration: none;
color: var(--ink-soft);
font-weight: 500;
}

nav a:hover {
color: var(--accent);
}

.block {
margin-top: 2.25rem;
}

.block h2 {
margin: 0 0 0.9rem;
font-size: 0.72rem;
letter-spacing: 0.14em;
color: var(--ink-dim);
font-weight: 700;
}

.series {
list-style: none;
margin: 0;
padding: 0;
display: flex;
flex-wrap: wrap;
gap: 0.9rem;
}

.series a {
display: grid;
justify-items: center;
width: 3.5rem;
text-decoration: none;
color: var(--ink-soft);
}

.ring {
display: grid;
place-items: center;
width: 3.1rem;
height: 3.1rem;
border-radius: 50%;
background: linear-gradient(135deg, #2563eb, #7c3aed, #db2777);
padding: 2.5px;
}

.icon {
display: grid;
place-items: center;
width: 100%;
height: 100%;
border-radius: 50%;
background: var(--bg);
font-size: 1.25rem;
}

.series .name {
margin-top: 0.3rem;
font-size: 0.72rem;
line-height: 1.3;
text-align: center;
word-break: break-all;
}

.series .count {
font-size: 0.65rem;
color: var(--ink-dim);
}

.series a:hover .name {
color: var(--accent);
}

main {
min-width: 0;
padding-bottom: 6rem;
}

main :global(h1) {
margin: 0 0 1.5rem;
font-size: 2rem;
line-height: 1.5;
}

main :global(h2) {
margin-top: 3.5rem;
padding-bottom: 0.4rem;
border-bottom: 2px solid var(--surface-2);
font-size: 1.4rem;
}

main :global(h3) {
margin-top: 2.25rem;
font-size: 1.12rem;
}

main :global(p),
main :global(li),
main :global(blockquote) {
max-width: 72ch;
}

main :global(p) {
color: var(--ink-soft);
}
</style>
