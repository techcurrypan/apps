<script lang="ts">
	// 舞台：前の図 → 動き 1 つずつ → 後の図 を再生する（screen-design.md 3.3）。
	// 絵は毎フレーム、段階（phase）だけから draw() で作る。
	import type { StepState } from '../lesson/state.ts';
	import { draw, fitText, type Layout } from '../player/frame.ts';
	import { duration, phaseAt, phaseLabel, type Phase } from '../player/timeline.ts';
	import { prefersReducedMotion } from './dom.ts';

	type Props = {
		scene: StepState['scene'];
		layout: Layout;
		slots: Map<string, number>;
		run: number; // 替わるたびに 1 から再生
		speed: number;
		onfinish?: () => void;
	};
	let { scene, layout, slots, run, speed, onfinish }: Props = $props();

	let phase = $state<Phase>({ kind: 'before' });
	const drawing = $derived(draw(scene, phase, layout));
	const label = $derived(phaseLabel(phase, scene.motion.length));
	// 動きを減らす設定のときは速く流す（前 → 後は必ず見せる）
	const reduced = prefersReducedMotion();

	$effect(() => {
		// run・scene・speed が替わると、前の図から再生し直す
		void run;
		const ops = scene.motion.length;
		const sp = reduced ? speed * 2 : speed;
		const total = duration(ops, sp);
		let frame = 0;
		let start: number | null = null;
		phase = { kind: 'before' };
		const tick = (now: number) => {
			start ??= now;
			const elapsed = now - start;
			phase = phaseAt(elapsed, ops, sp);
			if (elapsed < total) frame = requestAnimationFrame(tick);
			else onfinish?.();
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	const slotOf = (kind: string) => slots.get(kind) ?? 5;
	const t = $derived(layout.text);
	const fit = (text: string, width: number, size = t.prop) => fitText(text, width, size);
	const stepLabel = $derived(phase.kind);
</script>

<figure class="stage" data-phase={stepLabel}>
	<svg
		viewBox="0 0 {layout.width} {layout.height}"
		role="img"
		aria-label="図。{drawing.nodes.map((x) => x.label).join('、')}"
	>
		{#if drawing.moving}
			{@const m = drawing.moving}
			<line class="path" x1={m.from.x} y1={m.from.y} x2={m.to.x} y2={m.to.y} />
		{/if}
		{#each drawing.nodes as n (n.id)}
			<g
				class="node"
				class:hl={n.highlighted}
				class:dashed={n.dashed}
				opacity={n.opacity}
				data-node={n.id}
			>
				<rect x={n.box.x} y={n.box.y} width={n.box.w} height={n.box.h} rx="10" />
				<text class="label" x={n.box.x + 12} y={n.box.y + t.labelY} font-size={t.label}>
					{fit(`${n.highlighted ? '▶ ' : ''}${n.label}`, n.box.w - 24, t.label)}
				</text>
				{#if n.sub}
					<text class="sub" x={n.box.x + 12} y={n.box.y + t.subY} font-size={t.sub}
						>{fit(n.sub, n.box.w - 20, t.sub)}</text
					>
				{/if}
				{#each n.props as p, i (p.k)}
					{@const y = n.box.y + t.propY + i * t.propStep}
					{#if t.lines === 2}
						<!-- 狭い幅：名前の行と値の行に分ける。値が替わる途中は、名前の行に前の値、値の行に後の値 -->
						<text class="prop key" x={n.box.x + 12} {y} font-size={t.prop}>
							<title>{p.k}: {p.old !== null ? `${p.old} → ` : ''}{p.v}</title>
							{#if p.old !== null}
								{fit(`${p.k}:`, 60)}
								<tspan class="old">{fit(p.old, n.box.w - 24 - 60)}</tspan>
							{:else}
								{fit(p.k, n.box.w - 20)}
							{/if}
						</text>
						<text class="prop" x={n.box.x + 18} y={y + t.lineStep} font-size={t.prop}>
							{#if p.old !== null}
								<tspan class="arrow">→ </tspan>
								<tspan class="new">{fit(p.v, n.box.w - 50)}</tspan>
							{:else}
								{fit(p.v, n.box.w - 26)}
							{/if}
						</text>
					{:else}
						<text class="prop" x={n.box.x + 12} {y} font-size={t.prop}>
							<title>{p.k}: {p.old !== null ? `${p.old} → ` : ''}{p.v}</title>
							{#if p.old !== null}
								<tspan class="old">{fit(`${p.k}: ${p.old}`, (n.box.w - 24) / 2)}</tspan>
								<tspan class="arrow"> → </tspan>
								<tspan class="new">{fit(p.v, (n.box.w - 24) / 2 - 24)}</tspan>
							{:else}
								{fit(`${p.k}: ${p.v}`, n.box.w - 24)}
							{/if}
						</text>
					{/if}
				{/each}
			</g>
		{/each}
		{#if drawing.moving}
			{@const m = drawing.moving}
			{@const w = Math.min(layout.mode === 'narrow' ? 140 : 200, 24 + m.payload.length * 7.8)}
			<g class="payload kind-{slotOf(m.kind)}" data-moving={m.kind}>
				<rect x={m.at.x - w / 2} y={m.at.y - 30} width={w} height="26" rx="6" />
				<text x={m.at.x} y={m.at.y - 12} text-anchor="middle">{fit(m.payload, w - 12, 13)}</text>
				<text class="kind" x={m.at.x} y={m.at.y + 12} text-anchor="middle">{m.kind}</text>
			</g>
		{/if}
	</svg>
	<figcaption>
		<span class="phases" aria-label="再生の段階：{label}">
			<span class:on={phase.kind === 'before'}>前</span>
			<span aria-hidden="true">→</span>
			<span class:on={phase.kind === 'op'}
				>{phase.kind === 'op' ? label : `動き ${scene.motion.length}`}</span
			>
			<span aria-hidden="true">→</span>
			<span class:on={phase.kind === 'after'}>後</span>
		</span>
	</figcaption>
</figure>

<style>
	.stage {
		margin: 0;
		background: var(--dl-surface-raised);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius-box);
		padding: var(--dl-space-3);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
	svg {
		width: 100%;
		height: auto;
		display: block;
		font-family: var(--dl-font);
	}
	.node rect {
		fill: var(--dl-surface);
		stroke: var(--dl-border-strong);
		stroke-width: 1.5;
	}
	.node.hl rect {
		stroke: var(--dl-now);
		stroke-width: 4;
	}
	.node.dashed rect {
		stroke-dasharray: 6 5;
	}
	.label {
		fill: var(--dl-text);
		font-weight: 700;
	}
	.node.hl .label {
		fill: var(--dl-now);
	}
	.sub {
		fill: var(--dl-text-muted);
		font-family: var(--dl-font-code);
	}
	.prop {
		fill: var(--dl-text);
		font-family: var(--dl-font-code);
	}
	.prop.key {
		fill: var(--dl-text-muted);
	}
	.prop .old {
		fill: var(--dl-text-muted);
		text-decoration: line-through;
	}
	.prop .new {
		font-weight: 700;
	}
	.path {
		stroke: var(--dl-text-muted);
		stroke-width: 2;
		stroke-dasharray: 4 6;
	}
	.payload rect {
		stroke: currentColor;
		stroke-width: 1.5;
	}
	.payload text {
		font-size: 13px;
		font-family: var(--dl-font-code);
		fill: currentColor;
	}
	.payload .kind {
		font-size: 11px;
		font-family: var(--dl-font);
	}
	.kind-1 {
		color: var(--dl-kind-1-fg);
		fill: var(--dl-kind-1-bg);
	}
	.kind-2 {
		color: var(--dl-kind-2-fg);
		fill: var(--dl-kind-2-bg);
	}
	.kind-3 {
		color: var(--dl-kind-3-fg);
		fill: var(--dl-kind-3-bg);
	}
	.kind-4 {
		color: var(--dl-kind-4-fg);
		fill: var(--dl-kind-4-bg);
	}
	.kind-5 {
		color: var(--dl-kind-5-fg);
		fill: var(--dl-kind-5-bg);
	}
	.payload rect {
		fill: inherit;
	}
	/* 最小の高さは 2 列の幅だけ。狭い幅では、舞台・記録の最新・文を縦 640px に収めるため（5 章） */
	@media (min-width: 60rem) {
		.stage {
			min-height: var(--dl-stage-min);
		}
	}
	figcaption {
		margin-top: var(--dl-space-2);
		font-size: var(--dl-text-small);
		color: var(--dl-text-muted);
	}
	.phases {
		display: inline-flex;
		gap: var(--dl-space-2);
	}
	.phases .on {
		color: var(--dl-now);
		font-weight: 700;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
