<script lang="ts">
	// 試す の図（stat。見せ方の型 chart）：上に母集団、下に平均の分布（つまみの n・日数・形で計算し直す）。
	// 平均は 1 日 20 ms ごとに積もり、積み終わると 2.6 秒置いて最初から繰り返す（LS3-M1）。t は秒（親が一時停止で止める）
	import { DAY_MS } from '../../learn/scene/chart.ts';
	import { SHAPES, type Shape } from '../../learn/stat-sim.ts';
	import Defs from '../scene/kit/Defs.svelte';
	import ChartBody from '../scene/kit/ChartBody.svelte';
	import Panel from '../scene/kit/Panel.svelte';
	import Stage from '../scene/Stage.svelte';

	type Props = { vals: Record<string, number>; t: number };
	let { vals, t }: Props = $props();
	const n = $derived(vals.n ?? 30);
	const days = $derived(vals.days ?? 400);
	const shape = $derived(Math.max(0, Math.min(2, Math.round(vals.shape ?? 0))) as Shape);
	const cycle = $derived(days * DAY_MS + 2600);
	const tt = $derived((t * 1000) % cycle);
	const POP = { x: 30, y: 16, w: 940, h: 160 };
	const MEAN = { x: 30, y: 214, w: 940, h: 350 };
</script>

<Stage view={[0, 0, 1000, 600]} label="試す の図：母集団と平均の分布">
	{#snippet children(uik: number)}
		<Defs />
		<Panel
			{...POP}
			{uik}
			tone="teal"
			title="母集団：{SHAPES[shape]}・平均 4 分"
			id="pop"
			term="population"
		>
			<ChartBody spec={{ kind: 'pop', shape }} box={POP} t={tt} {uik} tone="teal" />
		</Panel>
		<Panel
			{...MEAN}
			{uik}
			tone="orange"
			title="平均の分布：1 日 {n} 人の平均を {days} 日"
			id="mean"
			term="sampdist"
		>
			<ChartBody
				spec={{ kind: 'means', shape, n, days, grow: true, curve: true, band: true }}
				box={MEAN}
				t={tt}
				{uik}
				tone="orange"
			/>
		</Panel>
	{/snippet}
</Stage>
