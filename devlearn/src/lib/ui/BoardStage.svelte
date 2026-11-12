<script lang="ts">
	// 実戦の舞台（git 以外の道具）：道具の状態を列ごとの行で描く。
	// 打った 1 行の前の絵 → 後の絵を見せ、現れた・替わった行に印を付ける。run が替わるたびに前から見せ直す（GitStage と同じ見せ方）。
	import { boardChanged, type Board } from '../practice/board.ts';
	import { prefersReducedMotion } from './dom.ts';

	type Props = { before: Board | null; after: Board; run: number };
	let { before, after, run }: Props = $props();

	let phase = $state<'before' | 'after'>('after');
	const shown = $derived(phase === 'before' && before ? before : after);
	const changed = $derived(before ? boardChanged(before, after) : new Set<string>());

	$effect(() => {
		void run;
		void after;
		if (!before) {
			phase = 'after';
			return;
		}
		phase = 'before';
		const hold = prefersReducedMotion() ? 300 : 700;
		const t = setTimeout(() => (phase = 'after'), hold);
		return () => clearTimeout(t);
	});

	const isNew = (key: string) => phase === 'after' && changed.has(key);
</script>

<figure class="stage" data-phase={phase} aria-label="道具の状態">
	<div class="cols">
		{#each shown.cols as c (c.key)}
			<section class="col" aria-label={c.title}>
				<h3>{c.title}</h3>
				<p class="sub">{c.sub}</p>
				<ul>
					{#each c.rows as r (r.key)}
						<li class:new={isNew(`${c.key}/${r.key}`)}>
							{#if isNew(`${c.key}/${r.key}`)}<span class="mark" aria-hidden="true">▶</span
								>{/if}{r.text}{#if r.tag}<span class="tag">{r.tag}</span>{/if}
						</li>
					{:else}
						<li class="none">（空）</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
	<figcaption>
		<span class:on={phase === 'before'}>前</span>
		<span aria-hidden="true">→</span>
		<span class:on={phase === 'after'}>後</span>
		{#if phase === 'after' && changed.size > 0}
			<span class="count">（▶ が替わった所：{changed.size}）</span>
		{/if}
	</figcaption>
</figure>

<style>
	.stage {
		margin: 0;
		background: var(--dl-surface-raised);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius-box);
		padding: var(--dl-space-3);
	}
	.cols {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: var(--dl-space-2);
	}
	.col {
		background: var(--dl-surface);
		border: 1.5px solid var(--dl-border-strong);
		border-radius: var(--dl-radius);
		padding: var(--dl-space-2);
		min-width: 0;
	}
	h3 {
		margin: 0;
		font-size: var(--dl-text-body);
	}
	.sub {
		margin: 0 0 var(--dl-space-1);
		font-size: var(--dl-text-small);
		color: var(--dl-text-muted);
		font-family: var(--dl-font-code);
		overflow-wrap: anywhere;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: var(--dl-text-small);
	}
	li {
		white-space: pre-wrap;
		font-family: var(--dl-font-code);
		padding: 2px 4px;
		border: 2px solid transparent;
		border-radius: var(--dl-radius-inner);
		overflow-wrap: anywhere;
	}
	li.new {
		border-color: var(--dl-now);
		animation: appear var(--dl-motion-op) ease-out;
	}
	.mark {
		color: var(--dl-now);
	}
	.none {
		color: var(--dl-text-muted);
	}
	.tag {
		display: inline-block;
		margin-left: 4px;
		padding: 0 4px;
		border: 1px solid var(--dl-border-strong);
		border-radius: var(--dl-radius-inner);
		font-family: var(--dl-font-code);
		font-size: 0.75rem;
	}
	@keyframes appear {
		from {
			opacity: 0.2;
		}
		to {
			opacity: 1;
		}
	}
	figcaption {
		margin-top: var(--dl-space-2);
		font-size: var(--dl-text-small);
		color: var(--dl-text-muted);
		display: flex;
		gap: var(--dl-space-2);
		flex-wrap: wrap;
	}
	figcaption .on {
		color: var(--dl-now);
		font-weight: 700;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	@media (max-width: 40rem) {
		.cols {
			grid-template-columns: 1fr;
		}
	}
</style>
