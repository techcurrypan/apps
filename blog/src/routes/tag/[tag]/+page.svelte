<script lang="ts">
let { data } = $props();
</script>

<header class="head">
<span class="ring"><span class="icon">{data.icon}</span></span>
<div>
<h1>{data.tag}</h1>
<p>{data.posts.length} 本</p>
</div>
</header>

<ul class="posts">
{#each data.posts as post, i (post.slug)}
<li>
<a class="card" href="/blog/{post.slug}">
<time>{i + 1} / {data.posts.length} ・ {post.date}</time>
<h2>{post.title}</h2>
{#if post.summary}<p>{post.summary}</p>{/if}
</a>
</li>
{/each}
</ul>

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

.posts {
list-style: none;
margin: 0;
padding: 0;
display: grid;
gap: 1rem;
}

.card {
display: block;
padding: 1.3rem 1.5rem;
border: 1px solid var(--line);
border-radius: 12px;
text-decoration: none;
color: inherit;
}

.card:hover {
border-color: var(--accent);
box-shadow: 0 6px 20px rgba(26, 34, 52, 0.08);
}

time {
font-family: var(--mono);
font-size: 0.78rem;
color: var(--ink-dim);
}

.card h2 {
margin: 0.2rem 0 0;
font-size: 1.2rem;
line-height: 1.6;
border: 0;
padding: 0;
}

.card p {
margin: 0.4rem 0 0;
color: var(--ink-dim);
font-size: 0.92rem;
}
</style>
