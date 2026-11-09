<script lang="ts">
import '../styles/theme.css';
import '../styles/base.css';
import '../styles/code.css';
import { groups, tagList } from '../lib/posts';

let { children } = $props();
let theme = $state<'light' | 'dark'>('light');

$effect(() => {
const saved = localStorage.getItem('theme');
theme =
saved === 'dark' || saved === 'light'
? saved
: window.matchMedia('(prefers-color-scheme: dark)').matches
? 'dark'
: 'light';
});

$effect(() => {
document.documentElement.dataset.theme = theme;
localStorage.setItem('theme', theme);
});
</script>

<button
class="theme"
onclick={() => (theme = theme === 'dark' ? 'light' : 'dark')}
aria-label={theme === 'dark' ? 'ライトモードにする' : 'ダークモードにする'}
>
{#if theme === 'dark'}
<svg viewBox="0 0 24 24" aria-hidden="true">
<circle cx="12" cy="12" r="4.2" />
<path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
</svg>
<span>ライトモード</span>
{:else}
<svg viewBox="0 0 24 24" aria-hidden="true">
<path d="M20 14.2A8.3 8.3 0 1 1 9.8 4 6.6 6.6 0 0 0 20 14.2z" />
</svg>
<span>ダークモード</span>
{/if}
</button>

<div class="shell">
<aside>
<a class="brand" href="/">techcurrypan</a>
<p class="tagline">作った物と、調べた事の記録</p>

<nav>
<a href="/">ホーム</a>
<a href="/blog">記事一覧</a>
<a href="/search">検索</a>
<a href="/about">このサイトについて</a>
<a href="/rss.xml">RSS</a>
</nav>

{#if groups.length > 0}
<section class="block">
<h2>連載</h2>
<ul class="series">
{#each groups as g (g.name)}
<li>
<a href="/series/{g.name}">
<span class="ring"><span class="icon">{g.icon}</span></span>
<span class="name">{g.label}</span>
<span class="count">{g.count}</span>
</a>
</li>
{/each}
</ul>
</section>
{/if}

{#if tagList.length > 0}
<section class="block">
<h2>タグ</h2>
<ul class="tags">
{#each tagList as t (t.tag)}
<li><a href="/tag/{t.tag}">{t.tag}<span>{t.count}</span></a></li>
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
.theme {
position: fixed;
top: 1rem;
right: 1.25rem;
z-index: 20;
display: inline-flex;
align-items: center;
gap: 0.4rem;
padding: 0.35rem 0.85rem;
background: var(--bg);
border: 1px solid var(--line);
border-radius: 999px;
font: inherit;
font-size: 0.8rem;
color: var(--ink-soft);
cursor: pointer;
}

.theme:hover {
color: var(--accent);
border-color: var(--accent);
}

.theme svg {
width: 1rem;
height: 1rem;
fill: none;
stroke: currentColor;
stroke-width: 1.7;
stroke-linecap: round;
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
flex-wrap: wrap;
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

.tags {
list-style: none;
margin: 0;
padding: 0;
display: flex;
flex-wrap: wrap;
gap: 0.35rem;
}

.tags a {
display: inline-flex;
align-items: center;
gap: 0.35rem;
padding: 0.1rem 0.6rem;
background: var(--surface-2);
border-radius: 999px;
font-size: 0.78rem;
text-decoration: none;
color: var(--ink-soft);
}

.tags a:hover {
background: var(--accent-soft);
color: var(--accent);
}

.tags span {
font-size: 0.68rem;
color: var(--ink-dim);
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
