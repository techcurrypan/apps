<script lang="ts">
	import LearnView from '#lib/ui/learn/LearnView.svelte';
	import LearnV2 from '#lib/ui/learn2/LearnV2.svelte';
	import LearnV3 from '#lib/ui/learn3/LearnV3.svelte';
	import { isV2 } from '#lib/lesson/types.ts';
	import { v3Of } from '#lib/content/v3/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const v3 = $derived(v3Of(data.lesson.id));
</script>

<svelte:head>
	<title>{data.lesson.title} | devlearn</title>
</svelte:head>

<!-- 第 2 版で書いたレッスン（tier を持つ）は第 2 版の画面で開く（D-23）。第 1 版は 10-D で書き直すまで今の画面 -->
<!-- 第 3 版で書いたレッスン（content/v3）は第 3 版の画面で開く（D-25。10-P 手順 9） -->
{#if v3}
	{#key v3.lesson.id}
		<LearnV3
			lesson={v3.lesson}
			terms={v3.terms}
			lab={v3.lab}
			tryScene={v3.tryScene}
			recall={v3.recall}
		/>
	{/key}
{:else if isV2(data.lesson)}
	<LearnV2
		lesson={data.lesson}
		known={data.known}
		course={data.course}
		index={data.index}
		termLessons={data.termLessons}
	/>
{:else}
	<LearnView lesson={data.lesson} known={data.known} />
{/if}
