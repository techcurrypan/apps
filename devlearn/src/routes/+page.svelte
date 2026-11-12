<script lang="ts">
	import { resolve } from '$app/paths';
	import { lessons } from '#lib/content/lessons.ts';

	const first = lessons[0];
</script>

<svelte:head>
	<title>devlearn</title>
</svelte:head>

<h1>devlearn</h1>
<p>IT を、手を動かして学ぶ。1 ステップずつ進み、図が動き、値が見える。</p>

<p class="town">
	<a href={resolve('/town')} aria-keyshortcuts="G">街で遊ぶ：みなと町の町長になる</a>
	<span>町の人の要望に、学んだ手で応える。学ばずに業者へ任せる道もある</span>
</p>

<ul class="go">
	<li>
		<a href={resolve('/lesson/[id]', { id: first.id })}>見本のレッスン：{first.title}</a>
	</li>
	<li><a href={resolve('/map')}>地図：分野とレッスンの一覧</a></li>
</ul>

<style>
	.town {
		display: flex;
		flex-direction: column;
		gap: var(--dl-space-1);
		padding: var(--dl-space-4);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius-box);
		background: var(--dl-surface);
	}
	.town a {
		font-size: var(--dl-text-lead);
		font-weight: 700;
	}
	.town span {
		color: var(--dl-text-muted);
		font-size: var(--dl-text-small);
	}
	.go {
		font-size: var(--dl-text-lead);
		line-height: 2;
	}
</style>
