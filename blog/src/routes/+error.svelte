<script lang="ts">
import { page } from '$app/state';
import { posts } from '../lib/posts';

const recent = posts.slice(0, 5);
</script>

<svelte:head>
	<title>{page.status === 404 ? 'ページが見つかりません' : 'エラー'}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="err">
	<p class="code">{page.status}</p>
	<h1>{page.status === 404 ? 'ページが見つかりません' : 'うまく表示できませんでした'}</h1>
	<p class="lead">
		{#if page.status === 404}
			URL が変わったか、記事を取り下げた可能性があります。
		{:else}
			{page.error?.message ?? '原因が分かりません。'}
		{/if}
	</p>

	<div class="go">
		<a href="/">ホーム</a>
		<a href="/blog">記事一覧</a>
		<a href="/search">検索</a>
	</div>

	{#if recent.length > 0}
		<h2>最近の記事</h2>
		<ul>
			{#each recent as p (p.slug)}
				<li><a href="/blog/{p.slug}">{p.title}</a></li>
			{/each}
		</ul>
	{/if}
</div>

<style>
.err {
padding: 3rem 0 5rem;
}

.code {
margin: 0;
font-family: var(--mono);
font-size: 3.5rem;
font-weight: 700;
line-height: 1;
color: var(--accent);
}

h1 {
margin: 0.8rem 0 0;
font-size: 1.6rem;
line-height: 1.5;
}

.lead {
margin: 0.8rem 0 0;
color: var(--ink-dim);
}

.go {
display: flex;
flex-wrap: wrap;
gap: 0.6rem;
margin: 2rem 0 0;
}

.go a {
padding: 0.4rem 1rem;
border: 1px solid var(--line);
border-radius: 999px;
text-decoration: none;
font-size: 0.88rem;
}

.go a:hover {
border-color: var(--accent);
}

h2 {
margin: 3rem 0 0.8rem;
font-size: 0.78rem;
letter-spacing: 0.12em;
color: var(--ink-dim);
}

ul {
margin: 0;
padding-left: 1.2rem;
}

li {
margin-bottom: 0.4rem;
}
</style>
