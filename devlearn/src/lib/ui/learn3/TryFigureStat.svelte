<script lang="ts">
	// やってみる の図（stat）：打った JavaScript の結果で変わる 2 段。上は取った日の標本の粒（waits を打つと出る）、
	// 下は平均の分布（曲線）。平均を出すとその所に印、信頼区間を出すと 95% の帯。t はミリ秒（親が一時停止で止める）
	import type { TryState } from '../../learn/try3.ts';
	import { statFig } from '../../content/v3/try-stat.ts';
	import Defs from '../scene/kit/Defs.svelte';
	import ChartBody from '../scene/kit/ChartBody.svelte';
	import Panel from '../scene/kit/Panel.svelte';
	import Note from '../scene/label/Note.svelte';
	import Stage from '../scene/Stage.svelte';

	type Props = { st: TryState; t: number };
	let { st, t }: Props = $props();
	const g = $derived(statFig(st));
	const SMP = { x: 30, y: 30, w: 940, h: 190 };
	const MEAN = { x: 30, y: 270, w: 940, h: 300 };
	/** 粒は 4 秒ごとに出し直す（LS3-M1） */
	const tt = $derived(t % 4000);
</script>

<Stage view={[0, 0, 1000, 600]} label="やってみる の図：標本と平均の分布">
	{#snippet children(uik: number)}
		<Defs />
		<Panel
			{...SMP}
			{uik}
			tone="blue"
			title={g.day === null ? '標本（waits を打つと出る）' : `標本：${g.day} 日目の ${g.n} 人`}
			id="smp"
			term="sample"
		>
			{#if g.day !== null}
				<ChartBody
					spec={{ kind: 'sample', shape: 0, n: g.n, day: g.day, grow: true }}
					box={SMP}
					t={tt}
					{uik}
					tone="blue"
				/>
			{/if}
		</Panel>
		<Panel
			{...MEAN}
			{uik}
			tone="orange"
			title="平均の分布（n = 30・400 日の模擬）"
			id="mean"
			term="sampdist"
		>
			<ChartBody
				spec={{
					kind: 'means',
					shape: 0,
					n: 30,
					days: 400,
					curve: true,
					band: g.ci,
					...(g.mean !== null ? { mark: Number(g.mean.toFixed(2)) } : {})
				}}
				box={MEAN}
				t={60000}
				{uik}
				tone="orange"
			/>
		</Panel>
		{#if g.day === null}
			<Note
				x={500}
				y={130}
				text="const x = waits(30, 20) と打つと、今日の 30 人がここに出る"
				tone="blue"
				center
				{uik}
			/>
		{/if}
	{/snippet}
</Stage>
