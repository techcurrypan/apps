<script lang="ts">
	// レッスンの「次」の段の「街へ戻る」（段 9。screen-design.md 3.1・10.4）。
	// 修了の記録を読むだけ。街の手は game-design.md 第 8 章の表から引く
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { lessonMoves } from '../game/learn.ts';
	import { loadProgress } from '../progress.ts';

	let { lessonId }: { lessonId: string } = $props();

	const moves = $derived(lessonMoves(lessonId));
	// 修了の記録はブラウザの中にだけある。組み立ての時は「まだ」として描き、開いた後で読む
	let done = $state(false);
	onMount(() => {
		done = loadProgress().done.includes(lessonId);
	});
	const use = (m: { test: boolean; fix: boolean }) =>
		[m.test ? '調べる' : '', m.fix ? '直す' : ''].filter(Boolean).join('・');
</script>

<section class="town" aria-labelledby="town-return">
	<h3 id="town-return">街へ戻る</h3>
	{#if moves.length}
		<p>
			このレッスンを修了すると、街の要望の板で使える手：
			{#each moves as m, i (m.name)}{i ? '、' : ''}<strong>「{m.name}」</strong>（{use(m)}）{/each}
		</p>
		<p class="state">
			{done
				? '修了した。街に戻ると、使える手が増えている'
				: 'まだ修了していない（実戦で合格すると修了）。修了していなくても、街へはいつでも戻れる'}
		</p>
	{/if}
	<a href={resolve('/town')} aria-keyshortcuts="G">街へ戻る</a>
</section>

<style>
	.town {
		margin-top: var(--dl-space-4);
		padding: var(--dl-space-4);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius-box);
	}
	.town h3 {
		margin-top: 0;
	}
	.state {
		color: var(--dl-text-muted);
		font-size: var(--dl-text-small);
	}
	a {
		font-weight: 700;
	}
</style>
