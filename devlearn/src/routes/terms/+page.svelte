<script lang="ts">
	// 用語集（learn-standard.md LS-L3）。第 2 版のレッスンの用語（Lesson.terms）を集め、出るレッスンへ飛べる。
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>用語集 | devlearn</title></svelte:head>

<main class="terms">
	<h1>用語集</h1>
	<p>
		本文の用語に触れると出る 1 行の意味を、全てのレッスンから集めた。検索は Ctrl +
		K（レッスン画面）。
	</p>
	<dl>
		{#each data.terms as t (t.word + t.id)}
			<dt id={t.word}>{t.word}</dt>
			<dd>{t.mean} <a href={resolve('/lesson/[id]', { id: t.id })}>{t.title}</a></dd>
		{:else}
			<p>まだ用語は無い。</p>
		{/each}
	</dl>
</main>

<style>
	.terms {
		max-width: 52rem;
		margin: 0 auto;
		padding: var(--dl-space-6) var(--dl-space-4);
	}
	dt {
		font-weight: 700;
		margin-top: var(--dl-space-3);
	}
	dd {
		margin: 0;
	}
</style>
