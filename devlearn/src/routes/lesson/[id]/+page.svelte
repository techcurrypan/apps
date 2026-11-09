<script lang="ts">
	import LessonView from '#lib/ui/LessonView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.lesson.title} | devlearn</title>
</svelte:head>

<LessonView lesson={data.lesson} known={data.known} />
