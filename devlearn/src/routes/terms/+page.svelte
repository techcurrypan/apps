<script lang="ts">
	// 用語集（learn-standard.md LS-L3）。第 2 版のレッスンの用語（Lesson.terms）を集め、出るレッスンへ飛べる。
	// 図の絵の一式（LS-L8）も同じ頁に並べる。図の中の絵は、全てのレッスンで同じ物に同じ絵を使う（src/lib/learn2/iso.ts）
	import { resolve } from '$app/paths';
	import { KINDS } from '#lib/learn2/iso.ts';
	import Machine from '#lib/ui/learn2/Machine.svelte';
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
	<h2 id="icons">図の絵</h2>
	<p>図の中の機械の絵。形と色の系統で種類が分かる。同じ物は、どのレッスンでも同じ絵になる。</p>
	<ul class="icons" data-icons={Object.keys(KINDS).length}>
		{#each Object.entries(KINDS) as [id, k] (id)}
			<li>
				<svg viewBox="-70 -90 140 140" width="96" height="96" role="img" aria-label={k.name}>
					<Machine icon={id} />
				</svg>
				<span>{k.name}</span>
			</li>
		{/each}
	</ul>
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
	.icons {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
		gap: var(--dl-space-3);
	}
	.icons li {
		display: grid;
		justify-items: center;
		gap: var(--dl-space-1);
		font-size: 0.85rem;
	}
</style>
