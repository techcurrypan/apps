<script lang="ts">
	// 台本：文（題・要約・本文・なぜ）、具体値、記録。全て同じステップ n から描く（原理 4）。
	import type { StepState } from '../lesson/state.ts';

	type Props = {
		state: StepState;
		slots: Map<string, number>;
	};
	let { state, slots }: Props = $props();

	const slotOf = (kind: string) => slots.get(kind) ?? 5;
</script>

<section class="text" aria-labelledby="step-title" data-step={state.text.n}>
	<h2 id="step-title" aria-live="polite">
		<span class="num">ステップ {state.text.n} / {state.progress.total}</span>
		{state.text.title}
	</h2>
	<p class="lead">{state.text.lead}</p>
	{#each state.text.body as line, i (i)}
		<p>{line}</p>
	{/each}
	{#if state.text.why}
		<aside class="why"><span class="tag">なぜ</span>{state.text.why}</aside>
	{/if}
</section>

<section class="facts" aria-label="具体値" data-step={state.facts.n}>
	<table>
		<tbody>
			{#each state.facts.rows as f (f.k)}
				<tr><th scope="row">{f.k}</th><td><code>{f.v}</code></td></tr>
			{/each}
		</tbody>
	</table>
</section>

<section class="log" aria-label="記録" data-step={state.log.n}>
	<h3>記録</h3>
	<div class="scroll">
		<table>
			<thead>
				<tr><th>時刻</th><th>どこから → どこへ</th><th>種類</th><th>中身</th></tr>
			</thead>
			<tbody>
				{#each state.log.rows as r (r.n)}
					<tr
						class:current={r.n === state.log.n}
						aria-current={r.n === state.log.n ? 'step' : undefined}
						data-row={r.n}
					>
						<td class="t"
							><span aria-hidden="true">{r.n === state.log.n ? '▶' : ''}</span><code>{r.t}</code
							></td
						>
						<td>{r.from} → {r.to}</td>
						<td><span class="kind kind-{slotOf(r.kind)}">{r.kind}</span></td>
						<td>{r.info}{r.size ? `（${r.size}）` : ''}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<style>
	section {
		background: var(--dl-surface);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius-box);
		padding: var(--dl-space-4);
	}
	.num {
		display: block;
		font-size: var(--dl-text-small);
		color: var(--dl-text-muted);
		font-weight: 400;
	}
	.lead {
		font-size: var(--dl-text-lead);
		font-weight: 700;
	}
	.why {
		margin-top: var(--dl-space-3);
		padding: var(--dl-space-3);
		border-left: 4px solid var(--dl-border-strong);
		background: var(--dl-surface-raised);
		border-radius: var(--dl-radius-inner);
	}
	.tag {
		font-weight: 700;
		margin-right: var(--dl-space-2);
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-size: var(--dl-text-small);
		line-height: var(--dl-leading-tight);
	}
	th,
	td {
		text-align: left;
		padding: var(--dl-space-2);
		border-bottom: 1px solid var(--dl-border);
		vertical-align: top;
	}
	.facts th {
		width: 40%;
		color: var(--dl-text-muted);
		font-weight: 400;
	}
	code {
		background: var(--dl-code-bg);
		padding: 0 var(--dl-space-1);
		border-radius: var(--dl-radius-inner);
		word-break: break-all;
	}
	.scroll {
		overflow-x: auto;
	}
	.log table {
		min-width: 32rem;
	}
	.log thead th {
		color: var(--dl-text-muted);
		font-weight: 400;
	}
	tr.current td {
		font-weight: 700;
		background: var(--dl-surface-raised);
	}
	tr.current .t span {
		color: var(--dl-now);
		margin-right: var(--dl-space-1);
	}
	.kind {
		display: inline-block;
		padding: 0 var(--dl-space-2);
		border-radius: var(--dl-radius-inner);
		border: 1px solid currentColor;
	}
	.kind-1 {
		color: var(--dl-kind-1-fg);
		background: var(--dl-kind-1-bg);
	}
	.kind-2 {
		color: var(--dl-kind-2-fg);
		background: var(--dl-kind-2-bg);
	}
	.kind-3 {
		color: var(--dl-kind-3-fg);
		background: var(--dl-kind-3-bg);
	}
	.kind-4 {
		color: var(--dl-kind-4-fg);
		background: var(--dl-kind-4-bg);
	}
	.kind-5 {
		color: var(--dl-kind-5-fg);
		background: var(--dl-kind-5-bg);
	}
</style>
