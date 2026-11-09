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

<ul class="go">
	<li>
		<a href={resolve('/lesson/[id]', { id: first.id })}>見本のレッスン：{first.title}</a>
	</li>
	<li><a href={resolve('/map')}>地図：分野とレッスンの一覧</a></li>
</ul>

<style>
	.go {
		font-size: var(--dl-text-lead);
		line-height: 2;
	}
</style>
