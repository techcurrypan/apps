<script lang="ts">
	// 例：打った物と返った物を 1 行ずつ現す（screen-design.md 3.2）。
	import type { Example } from '../lesson/types.ts';

	let { example }: { example: Example } = $props();
	let shown = $state(1);

	$effect.pre(() => {
		void example;
		shown = 1;
	});
</script>

<h2>例</h2>
<p>{example.intro}</p>
<div class="term" aria-live="polite">
	{#each example.lines.slice(0, shown) as line, i (i)}
		<code class="line" class:cmd={line.startsWith('$ ')}>{line}</code>
	{/each}
</div>
<div class="ctl">
	<button type="button" onclick={() => (shown = 1)} disabled={shown <= 1}>↻ 最初から</button>
	<button
		type="button"
		onclick={() => (shown = Math.min(example.lines.length, shown + 1))}
		disabled={shown >= example.lines.length}>1 行進む ▶</button
	>
	<button type="button" onclick={() => (shown = example.lines.length)}>全部</button>
	<span class="count">{shown} / {example.lines.length} 行</span>
</div>

<style>
	.term {
		background: var(--dl-code-bg);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius);
		padding: var(--dl-space-4);
		overflow-x: auto;
		line-height: var(--dl-leading-tight);
		font-size: var(--dl-text-small);
	}
	.line {
		display: block;
		white-space: pre;
		min-height: 1.4em;
	}
	.cmd {
		font-weight: 700;
	}
	.ctl {
		display: flex;
		gap: var(--dl-space-2);
		align-items: center;
		flex-wrap: wrap;
	}
	.count {
		color: var(--dl-text-muted);
		font-size: var(--dl-text-small);
	}
</style>
