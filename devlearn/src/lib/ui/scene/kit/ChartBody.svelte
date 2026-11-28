<svelte:options namespace="svg" />

<script lang="ts">
	// 段（panel）の中身（見せ方の型 chart。第 17 章 bar・sphere）：目盛り・立体の棒・標本の粒・正規の曲線・95% の帯・印。
	// 形は chartGeom（純粋な関数）が決める。字は uik で画面の上の大きさを保つ
	import { chartGeom, type Box, type ChartSpec } from '../../../learn/scene/chart.ts';
	import Halo from '../label/Halo.svelte';
	import Bar from './Bar.svelte';
	import Sphere from './Sphere.svelte';
	import type { Tone } from './paint';
	type Props = { spec: ChartSpec; box: Box; t: number; uik?: number; tone?: Tone };
	let { spec, box, t, uik = 1, tone = 'orange' }: Props = $props();
	const g = $derived(chartGeom(spec, box, t));
	const curve = $derived(g.curve.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
	const MARK: Record<string, string> = {
		orange: 'var(--dl-obj-orange)',
		red: 'var(--dl-obj-red)',
		gray: 'var(--dl-ink)'
	};
</script>

<g pointer-events="none" data-chart={spec.kind}>
	{#if g.band}
		<rect
			x={g.band.x0}
			y={g.plot.top}
			width={g.band.x1 - g.band.x0}
			height={g.plot.bottom - g.plot.top}
			class="band"
			rx={6 * uik}
		/>
	{/if}
	<line
		x1={g.plot.left}
		y1={g.plot.bottom}
		x2={g.plot.right}
		y2={g.plot.bottom}
		class="axis"
		stroke-width={1.4 * uik}
	/>
	{#each g.ticks as k (k.label)}
		<Halo
			x={k.x}
			y={g.plot.bottom + 18 * uik}
			text={k.label}
			size={12}
			{uik}
			anchor="middle"
			mono
		/>
	{/each}
	<Halo
		x={g.plot.right + 20 * uik}
		y={g.plot.bottom + 18 * uik}
		text="分"
		size={12}
		{uik}
		anchor="start"
	/>
	{#each g.bars as b, i (i)}
		<Bar x={b.x} y={b.y} w={b.w} h={Math.max(0.5, b.h)} d={Math.min(6, b.w * 0.5)} {tone} {uik} />
	{/each}
	{#each g.dots as d, i (i)}
		<Sphere x={d.x} y={d.y} r={6} tone="blue" />
	{/each}
	{#if curve}
		<polyline points={curve} class="curve" stroke-width={2.6 * uik} />
	{/if}
	{#if g.band}
		<Halo
			x={g.band.x1 + 6}
			y={g.plot.top + 34 * uik}
			text="95%：{g.band.lo.toFixed(2)}〜{g.band.hi.toFixed(2)} 分"
			size={13}
			{uik}
			weight={800}
			anchor="start"
			color="var(--dl-obj-green)"
		/>
	{/if}
	{#each g.marks as m (m.label)}
		<line
			x1={m.x}
			y1={g.plot.top - 4}
			x2={m.x}
			y2={g.plot.bottom}
			style:stroke={MARK[m.tone]}
			stroke-width={2.2 * uik}
			stroke-dasharray="{6 * uik} {4 * uik}"
		/>
		<Halo
			x={m.x + 6}
			y={g.plot.top + 2}
			text={m.label}
			size={13}
			{uik}
			weight={800}
			color={MARK[m.tone]}
		/>
	{/each}
</g>

<style>
	.axis {
		stroke: var(--dl-ink);
		opacity: 0.55;
	}
	.band {
		fill: var(--dl-obj-green);
		opacity: 0.16;
	}
	.curve {
		fill: none;
		stroke: var(--dl-obj-purple);
		stroke-linejoin: round;
	}
</style>
