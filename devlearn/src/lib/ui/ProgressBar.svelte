<script lang="ts">
	// 進みの帯：済んだ所に ✓、今に ▶、先は番号だけ（題を見せない。原理 5・7）。
	import type { StepState } from '../lesson/state.ts';

	type Props = { progress: StepState['progress']; ongo: (n: number) => void };
	let { progress, ongo }: Props = $props();

	const mark = (s: 'done' | 'current' | 'ahead') =>
		s === 'done' ? '✓' : s === 'current' ? '▶' : '';
</script>

<nav class="progress" aria-label="解説のステップ">
	<ol>
		{#each progress.steps as s (s.n)}
			<li>
				<button
					type="button"
					class={s.state}
					aria-current={s.state === 'current' ? 'step' : undefined}
					aria-label={s.title ? `ステップ ${s.n}：${s.title}` : `ステップ ${s.n}（まだ）`}
					title={s.title ?? undefined}
					onclick={() => ongo(s.n)}
				>
					<span aria-hidden="true">{mark(s.state)}</span>{s.n}
				</button>
			</li>
		{/each}
	</ol>
	<span class="count" data-testid="progress-count">{progress.n} / {progress.total}</span>
</nav>

<style>
	.progress {
		display: flex;
		align-items: center;
		gap: var(--dl-space-3);
		flex-wrap: wrap;
	}
	ol {
		display: flex;
		gap: var(--dl-space-1);
		list-style: none;
		margin: 0;
		padding: 0;
		flex-wrap: wrap;
	}
	button {
		min-width: var(--dl-tap);
		padding: 0 var(--dl-space-2);
		border-radius: var(--dl-radius-inner);
		font-variant-numeric: tabular-nums;
	}
	button.done {
		color: var(--dl-done);
		border-color: var(--dl-done);
	}
	button.current {
		color: var(--dl-now);
		border: 2px solid var(--dl-now);
		font-weight: 700;
	}
	button.ahead {
		color: var(--dl-text-muted);
		border-style: dashed;
	}
	.count {
		font-variant-numeric: tabular-nums;
		color: var(--dl-text-muted);
	}
</style>
