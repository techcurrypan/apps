<script lang="ts">
	// 試す の図（learn-standard.md 第 19 章：つまみの値で計算し直した図）。値を変えると棒・Pod が 0.9 秒で育ち、
	// 6 秒ごとに最初から繰り返す（LS3-M1）。一時停止の時は t を止める（親が渡す）。図は 1000×600
	import { k8sPlan, tcpSim, type LabId } from '../../learn/lab.ts';
	import { growAt, k8sFigure, tcpBars } from '../../learn/lab-figure.ts';
	import Bar from '../scene/kit/Bar.svelte';
	import Defs from '../scene/kit/Defs.svelte';
	import Platform from '../scene/kit/Platform.svelte';
	import Pod from '../scene/kit/Pod.svelte';
	import Halo from '../scene/label/Halo.svelte';
	import Num from '../scene/label/Num.svelte';
	import Tag from '../scene/label/Tag.svelte';
	import Stage from '../scene/Stage.svelte';

	type Props = { lab: Exclude<LabId, 'mem'>; vals: Record<string, number>; t: number };
	let { lab, vals, t }: Props = $props();
	const BOX = { x: 90, y: 110, w: 860, h: 380 };
	const tcp = $derived(
		lab === 'tcp'
			? tcpSim({ rtt: vals.rtt ?? 30, loss: vals.loss ?? 0, icw: vals.icw ?? 10 })
			: null
	);
	const bars = $derived(tcp ? tcpBars(tcp.hist, BOX) : null);
	const plan = $derived(
		lab === 'k8s'
			? k8sPlan({
					rep: vals.rep ?? 4,
					lim: vals.lim ?? 256,
					peak: vals.peak ?? 300,
					nodes: vals.nodes ?? 3
				})
			: null
	);
	const K_BOX = { x: 60, y: 140, w: 880, h: 450 };
	const fig = $derived(plan ? k8sFigure(plan, vals.nodes ?? 3, K_BOX) : null);
	/** 落ちた Pod は 1.2 秒ごとに点滅（落ちて立ち上がるのを繰り返す） */
	const blink = $derived(Math.floor((t % 6) / 0.6) % 2 === 0);
</script>

<Stage view={[0, 0, 1000, 600]} label="試す の図">
	{#snippet children(uik: number)}
		<Defs />
		{#if bars && tcp}
			<Halo
				x={BOX.x}
				y={60}
				text="1 往復ごとの cwnd（送ってよい数）。赤は落ちた往復"
				size={14}
				{uik}
				weight={700}
			/>
			<line
				x1={BOX.x - 10}
				y1={BOX.y + BOX.h}
				x2={BOX.x + BOX.w + 10}
				y2={BOX.y + BOX.h}
				class="axis"
				style="stroke-width:{1.5 * uik}"
			/>
			{#each bars.bars as b, i (i)}
				{@const g = growAt(t, i)}
				<g data-term="cwnd" data-obj="bar-{i}">
					<Bar x={b.x} y={b.y} w={b.w} h={Math.max(0.5, b.h * g)} tone={b.tone} {uik} />
				</g>
			{/each}
			{@const top = bars.bars.reduce((m, b) => (b.h > m.h ? b : m), bars.bars[0])}
			<Num
				x={top.x + top.w / 2}
				y={top.y - top.h * growAt(t, bars.bars.indexOf(top)) - 22 * uik}
				text="{bars.max} MSS"
				{uik}
			/>
			<Halo
				x={BOX.x}
				y={BOX.y + BOX.h + 40 * uik}
				text="往復 {tcp.rtts} 回 × RTT {vals.rtt} ms ＝ {tcp.ms.toLocaleString('en-US')} ms"
				size={14}
				{uik}
				weight={800}
			/>
		{:else if fig && plan}
			<Halo
				x={BOX.x}
				y={50}
				text={plan.oom
					? `山が上限を ${(vals.peak ?? 0) - (vals.lim ?? 0)} Mi 超える → 置けた Pod は落ちて立ち上がるのを繰り返す`
					: `1 台に ${plan.cap} 個まで。山は上限に収まる → 落ちない`}
				size={14}
				{uik}
				weight={700}
			/>
			{#each [['green', 'Ready（動き続ける）'], ['red', '落ちた（OOMKilled）'], ['orange', '起動し直し中'], ['purple', 'Pending（置き場が無い）']] as [c, t], i (t)}
				<Tag
					x={BOX.x + 90 + i * 200}
					y={92}
					text={t}
					dot="var(--dl-obj-{c})"
					size={13}
					mono={false}
					{uik}
				/>
			{/each}
			{#each fig.nodes as n, ni (n.name)}
				<g data-obj={n.name} data-term="node">
					<Platform x={n.x} y={n.y} w={n.pw} d={n.pd} {uik} />
				</g>
				{#each n.pods as p, pi (p.name)}
					{@const g = growAt(t, ni * 3 + pi)}
					<g data-obj={p.name} data-term="pod" style="opacity:{g}">
						<Pod
							x={p.x}
							y={p.y}
							s={fig.podScale}
							state={p.state === 'dead' && !blink ? 'create' : p.state}
							name={p.name}
							label=""
							lift={(1 - g) * 40}
							{uik}
						/>
					</g>
				{/each}
				<Tag x={n.x} y={n.bottom + 22} text={n.name} {uik} />
			{/each}
			{#if fig.pending.length}
				<Halo
					x={K_BOX.x}
					y={K_BOX.y + K_BOX.h - 20}
					text="Pending（置き場が無い）{fig.pending.length} 個"
					size={14}
					{uik}
					weight={800}
				/>
				{#each fig.pending as p (p.name)}
					<g data-obj={p.name} data-term="pending">
						<Pod x={p.x} y={p.y} s={0.5} state="paper" name={p.name} label="" {uik} />
					</g>
				{/each}
			{/if}
		{/if}
	{/snippet}
</Stage>

<style>
	.axis {
		stroke: var(--dl-ink);
		opacity: 0.5;
	}
</style>
