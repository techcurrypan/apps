<script lang="ts">
	// 操作帯：前へ・もう一度・次へ・自動・速さ（screen-design.md 3.2・第 6 章）。
	import type { PlayerCommand, PlayerState } from '../player/control.ts';

	type Props = { player: PlayerState; onCommand: (c: PlayerCommand) => void };
	let { player, onCommand }: Props = $props();
	// 狭い幅では、自動・速さを「…」の中にしまう（screen-design.md 5 章）。広い幅では常に出す
	let open = $state(false);
</script>

<div class="controls" role="toolbar" aria-label="再生の操作">
	<div class="main">
		<button
			type="button"
			onclick={() => onCommand({ type: 'prev' })}
			disabled={player.n <= 1}
			aria-keyshortcuts="ArrowLeft">◀ 前へ</button
		>
		<button
			type="button"
			class="replay"
			onclick={() => onCommand({ type: 'replay' })}
			aria-keyshortcuts="R">↻ もう一度</button
		>
		<button
			type="button"
			class="next"
			onclick={() => onCommand({ type: 'next' })}
			disabled={player.n >= player.total}
			aria-keyshortcuts="ArrowRight">次へ ▶</button
		>
		<button
			type="button"
			class="toggle"
			aria-expanded={open}
			aria-controls="controls-more"
			aria-label="自動と速さ"
			onclick={() => (open = !open)}>…</button
		>
	</div>
	<div class="more" id="controls-more" class:open={open || player.auto}>
		<button
			type="button"
			onclick={() => onCommand({ type: 'toggleAuto' })}
			aria-pressed={player.auto}
			aria-keyshortcuts="Space">{player.auto ? '■ 停止' : '⏵ 自動'}</button
		>
		<span class="speed" role="group" aria-label="速さ">
			<button
				type="button"
				onclick={() => onCommand({ type: 'slower' })}
				disabled={player.speed === 0.5}
				aria-label="遅く"
				aria-keyshortcuts="-">−</button
			>
			<output aria-live="polite">×{player.speed}</output>
			<button
				type="button"
				onclick={() => onCommand({ type: 'faster' })}
				disabled={player.speed === 2}
				aria-label="速く"
				aria-keyshortcuts="+">＋</button
			>
		</span>
	</div>
</div>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--dl-space-2);
		padding: var(--dl-space-2) 0;
	}
	.main,
	.more {
		display: flex;
		gap: var(--dl-space-2);
		align-items: center;
	}
	.next {
		font-weight: 700;
		border-color: var(--dl-now);
		color: var(--dl-now);
	}
	.speed {
		display: inline-flex;
		align-items: center;
		gap: var(--dl-space-1);
	}
	output {
		min-width: 3em;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
	.toggle {
		display: none;
	}
	@media (max-width: 59.99rem) {
		.toggle {
			display: inline-flex;
		}
		.more {
			display: none;
		}
		.more.open {
			display: flex;
		}
		.controls {
			position: fixed;
			left: 0;
			right: 0;
			bottom: 0;
			padding: var(--dl-space-2) var(--dl-space-4);
			background: var(--dl-bg);
			border-top: 1px solid var(--dl-border);
			z-index: 2;
		}
	}
</style>
