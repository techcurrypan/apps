<script lang="ts">
	// やってみる の図（mem。learn-standard.md 第 19 章：状態の図。命令で図が変わる）。
	// 打った JavaScript の後の、名前（左）と、ヒープの配列（右）と、参照の矢印。同じ物を指す名前は同じ配列へ。
	// 線の上の点はいつも流れる（LS3-M2）。t はミリ秒（親が一時停止で止める）
	import type { TryState } from '../../learn/try3.ts';
	import { memFig } from '../../content/v3/try-mem.ts';
	import Defs from '../scene/kit/Defs.svelte';
	import List from '../scene/kit/List.svelte';
	import Var from '../scene/kit/Var.svelte';
	import Wire from '../scene/kit/Wire.svelte';
	import Note from '../scene/label/Note.svelte';
	import Tag from '../scene/label/Tag.svelte';
	import Stage from '../scene/Stage.svelte';

	type Props = { st: TryState; t: number };
	let { st, t }: Props = $props();
	const fig = $derived(memFig(st).slice(0, 5));
	const objs = $derived([...new Set(fig.map((f) => f.obj))]);
	const gap = (n: number) => (n <= 1 ? 0 : Math.min(130, 440 / (n - 1)));
	const nameAt = (i: number) => ({
		x: 170,
		y: 300 - (gap(fig.length) * (fig.length - 1)) / 2 + i * gap(fig.length)
	});
	const objAt = (k: number) => {
		const i = objs.indexOf(k);
		return { x: 640, y: 300 - (gap(objs.length) * (objs.length - 1)) / 2 + i * gap(objs.length) };
	};
	const valsOf = (k: number) => fig.find((f) => f.obj === k)?.vals ?? [];
	const flow = $derived((t % 1800) / 1800);
	/** 名前が 2 つ以上集まる配列（同じ物） */
	const sharedObj = (k: number) => fig.filter((f) => f.obj === k).length > 1;
</script>

<Stage view={[0, 0, 1000, 600]} label="やってみる の図：名前とヒープの配列">
	{#snippet children(uik: number)}
		<Defs />
		{#if fig.length === 0}
			<Note
				x={500}
				y={300}
				text="let a = [1, 2] と打つと、名前と配列がここに出る"
				tone="blue"
				center
				{uik}
			/>
		{/if}
		{#each fig as f, i (f.name)}
			<Wire a={nameAt(i)} b={objAt(f.obj)} ia={40} ib={170} kind="ref" p={flow} {uik} />
		{/each}
		{#each fig as f, i (f.name)}
			{@const p = nameAt(i)}
			<g data-obj="v-{f.name}" data-term="variable"><Var x={p.x} y={p.y} name={f.name} {uik} /></g>
		{/each}
		{#each objs as k (k)}
			{@const p = objAt(k)}
			<g data-obj="o-{k}" data-term="array">
				<List
					x={p.x}
					y={p.y}
					s={0.8}
					vals={valsOf(k).map((v) => (v.length > 5 ? '…' : v))}
					hl={sharedObj(k)}
					{uik}
				/>
			</g>
			<Tag x={p.x} y={p.y + 56} text="配列 #{k + 1}{sharedObj(k) ? '（同じ物）' : ''}" {uik} />
		{/each}
	{/snippet}
</Stage>
