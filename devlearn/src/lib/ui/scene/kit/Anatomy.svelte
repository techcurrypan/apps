<svelte:options namespace="svg" />

<script lang="ts">
	// 式の分解の札（言葉をそろえるステップ。learn-standard.md 第 18.1 LS3-T2）：暗い札に式を大きく書き、部分ごとに色と意味の札を線で結ぶ。
	// 札は step ms ずつ順に現れる（t は今のステップの経過時間）。x, y は式の字の基準線の中心
	import Tag from '../label/Tag.svelte';
	import { textWidth } from './paint';
	export type Part = { text: string; color?: string; note?: string; term?: string; row?: number };
	type Props = {
		x: number;
		y: number;
		parts: Part[];
		t?: number;
		step?: number;
		size?: number;
		uik?: number;
	};
	let { x, y, parts, t = 1e9, step = 600, size = 30, uik = 1 }: Props = $props();
	const sz = $derived(size * uik);
	const laid = $derived.by(() => {
		let cx = 0;
		const out = parts.map((p) => {
			const w = textWidth(p.text, sz);
			const at = cx;
			cx += w;
			return { ...p, at, w };
		});
		return { out, W: cx };
	});
	const x0 = $derived(x - laid.W / 2);
	const notes = $derived(laid.out.filter((p) => p.note));
	const op = (i: number) => Math.max(0, Math.min(1, (t - step * i) / 400));
</script>

<g data-anatomy>
	<rect
		x={x0 - 20 * uik}
		y={y - sz - 14 * uik}
		width={laid.W + 40 * uik}
		height={sz + 28 * uik}
		rx={12 * uik}
		fill="#15171c"
		style:stroke="var(--dl-ink)"
		stroke-width={1.6 * uik}
	/>
	{#each laid.out as p, i (i)}
		<text
			x={x0 + p.at}
			{y}
			xml:space="preserve"
			data-anatomy-part={p.note ? '' : undefined}
			style:font-size="{sz}px"
			font-weight="800"
			style:fill={p.color ?? '#9aa3b2'}>{p.text}</text
		>
	{/each}
	{#each notes as p, j (j)}
		{@const nx = x0 + p.at + p.w / 2}
		{@const ny = y + 44 * uik + (p.row ?? 0) * 46 * uik}
		<g opacity={op(j)}>
			<path d="M{nx} {y + 8 * uik}V{ny - 14 * uik}" style:stroke={p.color} stroke-width={2 * uik} />
			<Tag
				x={nx}
				y={ny}
				text={p.note ?? ''}
				size={13.5}
				{uik}
				dot={p.color}
				mono={false}
				term={p.term}
			/>
		</g>
	{/each}
</g>

<style>
	text {
		font-family: var(--dl-font-code);
	}
</style>
