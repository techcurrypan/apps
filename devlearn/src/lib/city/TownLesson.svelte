<script lang="ts">
	// 試作の簡略な解説（試作のまま載せる。段 8-2c で段 6 の再生装置につなぎ替える）
	import type { LessonView, Tok } from './game.ts';

	let {
		lesson,
		onclose,
		onfinish
	}: { lesson: LessonView; onclose: () => void; onfinish: (lid: string) => void } = $props();

	const L = $derived(lesson.data);
	let step = $state(0);
	// 札の位置：前の段の位置に置いてから、次のコマで今の段の位置へ動かす（試作と同じ）
	let shown = $state(0);
	let instant = $state(true);

	const keys = $derived(
		Object.keys(L.steps.reduce<Record<string, Tok>>((a, s) => Object.assign(a, s.tok), {}))
	);
	const cur = $derived(L.steps[step]);

	function place(k: string, from: number) {
		const tk = L.steps[from].tok[k];
		if (!tk) return null;
		const n = L.nodes.find((x) => x.id === tk[0]);
		if (!n) return null;
		const net: Record<string, number> = { a: -46, b: 0, c: 46 };
		const x = n.x + (lesson.lid === 'net' ? (net[k] ?? 0) : tk[3] || 0),
			y = n.y + 10 + (tk[4] || 0);
		return { x, y, text: tk[1], hl: !!tk[2] };
	}

	function go(to: number, animate: boolean) {
		step = to;
		if (animate && to > 0) {
			instant = true;
			shown = to - 1;
			requestAnimationFrame(() =>
				requestAnimationFrame(() => {
					instant = false;
					shown = to;
				})
			);
		} else {
			instant = true;
			shown = to;
		}
	}
	function replay() {
		if (step > 0) go(step, true);
	}
	function edgePath(a: string, b: string) {
		const A = L.nodes.find((n) => n.id === a);
		const B = L.nodes.find((n) => n.id === b);
		if (!A || !B) return { d: '', mx: 0, my: 0 };
		const x1 = A.x + 78,
			x2 = B.x - 80;
		return {
			d: `M${x1} ${A.y} C ${(x1 + x2) / 2} ${A.y}, ${(x1 + x2) / 2} ${B.y}, ${x2} ${B.y}`,
			mx: (x1 + x2) / 2,
			my: (A.y + B.y) / 2 - 8
		};
	}
</script>

<div class="modal">
	<div class="card wide" role="dialog" aria-modal="true" aria-label={'解説 ' + L.title}>
		<header>
			<div>
				<span class="kick">解説 ・ {L.tool}</span>
				<h2>{L.title}</h2>
			</div>
			<button class="x" type="button" aria-label="閉じる" onclick={onclose}>×</button>
		</header>
		<ol class="steps">
			{#each L.steps as s, i (i)}
				<li class={i === step ? 'on' : i < step ? 'done' : ''}>
					<button type="button" aria-label={s.t} onclick={() => go(i, true)}>{i + 1}</button>
				</li>
			{/each}
		</ol>
		<div class="stage">
			<svg viewBox="0 0 600 {L.vh}" role="img" aria-label={cur.t + 'の動き'}>
				<defs>
					<marker
						id="ah"
						viewBox="0 0 10 10"
						refX="8"
						refY="5"
						markerWidth="7"
						markerHeight="7"
						orient="auto"><path d="M0 0 L10 5 L0 10 Z" /></marker
					>
				</defs>
				{#each L.edges as [a, b, lab] (a + b)}
					{@const e = edgePath(a, b)}
					<path
						class="edge"
						d={e.d}
						fill="none"
						stroke-width="2"
						stroke-dasharray="6 6"
						marker-end="url(#ah)"
					/>
					{#if lab}<text x={e.mx} y={e.my} text-anchor="middle" font-size="10" class="elab"
							>{lab}</text
						>{/if}
				{/each}
				{#each L.nodes as n (n.id)}
					<g>
						<rect
							class="nd"
							x={n.x - 76}
							y={n.y - 52}
							width="152"
							height={L.nodes.length > 3 ? 92 : 112}
							rx="14"
						/>
						<text
							class="nl"
							x={n.x}
							y={n.y - 30}
							text-anchor="middle"
							font-size="13"
							font-weight="700">{n.label}</text
						>
						<text class="ns" x={n.x} y={n.y - 14} text-anchor="middle" font-size="10">{n.sub}</text>
					</g>
				{/each}
				{#each keys as k (k)}
					{@const p = place(k, shown)}
					<g
						class="tok"
						class:hl={p?.hl}
						style:opacity={p ? 1 : 0}
						style:transform={p ? `translate(${p.x}px, ${p.y}px)` : undefined}
						style:transition={instant
							? 'none'
							: 'transform 900ms cubic-bezier(.6,.05,.3,1), opacity 400ms'}
					>
						<rect x="-33" y="-12" width="66" height="24" rx="7" />
						<text y="4" text-anchor="middle" font-size="11" font-weight="700">{p?.text ?? ''}</text>
					</g>
				{/each}
			</svg>
			<button type="button" class="replay" onclick={replay}>↻ この動きをもう一度</button>
		</div>
		<div class="body">
			<h3>{step + 1}. {cur.t}</h3>
			<p>{cur.d}</p>
			<div class="cmd"><small>操作</small><code>{cur.cmd}</code></div>
			<table>
				<tbody>
					{#each cur.facts as f (f[0])}
						<tr><th>{f[0]}</th><td>{f[1]}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
		<footer>
			<button type="button" disabled={step === 0} onclick={() => go(step - 1, false)}>← 前へ</button
			>
			{#if step < L.steps.length - 1}
				<button type="button" class="pri" onclick={() => go(step + 1, true)}>次へ →</button>
			{:else}
				<button type="button" class="pri" onclick={() => onfinish(lesson.lid)}
					>学んだ ・ 要望に戻る</button
				>
			{/if}
		</footer>
	</div>
</div>

<style>
	.steps {
		display: flex;
		gap: 6px;
		list-style: none;
		margin: 14px 18px 0;
		padding: 0;
	}
	.steps button {
		width: 40px;
		height: 40px;
		min-width: 40px;
		padding: 0;
		border-radius: 10px;
		border: 1px solid var(--dl-border);
		background: var(--dl-bg);
		font-family: var(--dl-font-code);
		font-weight: 700;
	}
	.steps li.done button {
		border-color: var(--dl-done);
		color: var(--dl-done);
	}
	.steps li.on button {
		border-color: var(--dl-now);
		color: var(--dl-now);
		background: var(--dl-surface-raised);
	}
	.stage {
		position: relative;
		margin: 12px 18px 0;
		border-radius: 14px;
		background: var(--dl-bg);
		border: 1px solid var(--dl-border);
		padding: 8px;
	}
	.stage svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.stage :global(marker path) {
		fill: var(--dl-text-muted);
	}
	.edge {
		stroke: var(--dl-text-muted);
		animation: flow 1.2s linear infinite;
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -24;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.edge {
			animation: none;
		}
	}
	.elab,
	.ns {
		fill: var(--dl-text-muted);
	}
	.nd {
		fill: var(--dl-surface);
		stroke: var(--dl-border-strong);
	}
	.nl {
		fill: var(--dl-text);
	}
	.tok rect {
		fill: var(--dl-surface-raised);
		stroke: var(--dl-border-strong);
	}
	.tok text {
		fill: var(--dl-text);
	}
	.tok.hl rect {
		fill: var(--dl-kind-2-bg);
		stroke: var(--dl-kind-2-fg);
	}
	.tok.hl text {
		fill: var(--dl-kind-2-fg);
	}
	.replay {
		position: absolute;
		right: 12px;
		bottom: 10px;
		min-height: 36px;
		padding: 0 10px;
		border-radius: 9px;
		font-size: 12px;
	}
	.body {
		padding: 12px 18px;
	}
	.body h3 {
		margin: 0 0 6px;
		font-size: 16px;
	}
	.body p {
		margin: 0 0 10px;
		font-size: 13px;
		line-height: 1.8;
	}
	.cmd {
		display: flex;
		gap: 10px;
		align-items: center;
		padding: 8px 10px;
		border-radius: 10px;
		background: var(--dl-code-bg);
		margin-bottom: 10px;
	}
	.cmd small {
		color: var(--dl-text-muted);
		font-size: 11px;
	}
	.cmd code {
		font-size: 12px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}
	th {
		text-align: left;
		color: var(--dl-text-muted);
		font-weight: 500;
		padding: 6px 8px;
		border-top: 1px solid var(--dl-border);
		width: 40%;
	}
	td {
		padding: 6px 8px;
		border-top: 1px solid var(--dl-border);
	}
	footer {
		display: flex;
		justify-content: space-between;
		padding: 12px 18px 18px;
	}
	footer button {
		min-height: 44px;
		padding: 0 16px;
		border-radius: 10px;
		font-size: 13px;
	}
	footer button.pri {
		border-color: var(--dl-now);
		color: var(--dl-now);
		font-weight: 700;
	}
</style>
