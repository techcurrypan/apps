<script lang="ts">
	import LearnView from '#lib/ui/learn/LearnView.svelte';
	import LearnV2 from '#lib/ui/learn2/LearnV2.svelte';
	import { isV2 } from '#lib/lesson/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.lesson.title} | devlearn</title>
</svelte:head>

<!-- 第 2 版で書いたレッスン（tier を持つ）は第 2 版の画面で開く（D-23）。第 1 版は 10-D で書き直すまで今の画面 -->
{#if isV2(data.lesson)}
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
