<script lang="ts">
	// 地図：分野とレッスンの一覧。どのレッスンも、いつでも開ける（ロックは無い）。
	import { resolve } from '$app/paths';
	import { FIELDS } from '#lib/content/fields.ts';
	import { lessons } from '#lib/content/lessons.ts';

	const levels = ['初級', '中級', '上級'];
	const byField = FIELDS.map((f) => ({
		...f,
		lessons: lessons.filter((l) => l.field === f.id)
	}));
</script>

<svelte:head>
	<title>地図 | devlearn</title>
</svelte:head>

<h1>地図</h1>
<p>どのレッスンも、いつでも、どこからでも開ける。前提は推奨として示すだけ。</p>

<div class="fields">
	{#each byField as f (f.id)}
		<section aria-labelledby="f-{f.id}">
			<h2 id="f-{f.id}">{f.name}</h2>
			{#if f.lessons.length === 0}
				<p class="none">まだ書かれていない</p>
			{:else}
				<ul>
					{#each f.lessons as l (l.id)}
						<li>
							<a href={resolve('/lesson/[id]', { id: l.id })}>{l.title}</a>
							<span class="meta">{levels[l.level - 1]} ・ {l.explain.length} ステップ</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/each}
</div>

<style>
	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: var(--dl-space-3);
	}
	section {
		background: var(--dl-surface);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius-box);
		padding: var(--dl-space-4);
	}
	ul {
		margin: 0;
		padding-left: var(--dl-space-5);
	}
	.meta,
	.none {
		display: block;
		color: var(--dl-text-muted);
		font-size: var(--dl-text-small);
	}
</style>
