<script lang="ts">
let { data } = $props();
</script>

<header class="head">
<span class="ring"><span class="icon">{data.icon}</span></span>
<div>
<h1>{data.series}</h1>
<p>{data.posts.length} 本の連載</p>
</div>
</header>

<ol class="steps">
{#each data.posts as post, i (post.slug)}
<li>
<span class="no">{i + 1}</span>
<a href="/blog/{post.slug}">
<strong>{post.title}</strong>
{#if post.summary}<span>{post.summary}</span>{/if}
</a>
</li>
{/each}
</ol>

{#if data.posts.length === 0}
<p>この連載の記事はまだありません。</p>
{/if}

<style>
.head {
display: flex;
align-items: center;
gap: 1.1rem;
padding-bottom: 1.25rem;
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

.ring {
display: grid;
place-items: center;
width: 3.6rem;
height: 3.6rem;
flex: none;
border-radius: 50%;
background: linear-gradient(135deg, #2563eb, #7c3aed, #db2777);
padding: 3px;
}

.icon {
display: grid;
place-items: center;
width: 100%;
height: 100%;
border-radius: 50%;
background: var(--bg);
font-size: 1.5rem;
}

.steps {
list-style: none;
margin: 0;
padding: 0;
counter-reset: step;
}

.steps li {
display: flex;
gap: 1rem;
padding: 1rem 0;
border-bottom: 1px solid var(--line);
}

.no {
display: grid;
place-items: center;
width: 1.9rem;
height: 1.9rem;
flex: none;
margin-top: 0.4rem;
border-radius: 50%;
background: var(--accent-soft);
color: var(--accent);
font-family: var(--mono);
font-size: 0.8rem;
font-weight: 700;
}

.steps a {
text-decoration: none;
color: inherit;
}

.steps strong {
display: block;
font-size: 1.1rem;
line-height: 1.6;
}

.steps a:hover strong {
color: var(--accent);
}

.steps span {
display: block;
color: var(--ink-dim);
font-size: 0.9rem;
}
</style>
