<script lang="ts">
	import LearnView from '#lib/ui/learn/LearnView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.lesson.title} | devlearn</title>
</svelte:head>

<LearnView lesson={data.lesson} known={data.known} />
