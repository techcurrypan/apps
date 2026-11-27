<script lang="ts">
	// 吹き出し（learn-standard.md 18.3 H1・H4）。言葉の見出しと 1〜2 文の説明。最大 300px 幅、置き場は placeTip が決める
	import type { Term } from '../../../learn/terms.ts';
	import { TIP_MAX_W } from '../../../learn/scene/tip.ts';
	type Props = { term: Term; left: number; top: number; onsize?: (w: number, h: number) => void };
	let { term, left, top, onsize }: Props = $props();
	let w = $state(0);
	let h = $state(0);
	$effect(() => {
		if (w && h) onsize?.(w, h);
	});
</script>

<div
	class="tip"
	role="tooltip"
	data-tip={term.id}
	style:left="{left}px"
	style:top="{top}px"
	style:max-width="{TIP_MAX_W}px"
	bind:clientWidth={w}
	bind:clientHeight={h}
>
	<b>{term.t}</b>
	<span>{term.d}</span>
</div>

<style>
	.tip {
		position: absolute;
		z-index: 5;
		pointer-events: none;
		box-sizing: border-box;
		padding: 8px 12px;
		border-radius: 10px;
		border: 1.5px solid var(--dl-ink);
		background: var(--dl-surface-raised);
		color: var(--dl-ink);
		font: 13px/1.5 var(--dl-font);
		box-shadow: 0 4px 14px rgb(0 0 0 / 0.18);
		width: max-content;
	}
	b {
		display: block;
		font-size: 14px;
		margin-bottom: 2px;
	}
</style>
