<svelte:options namespace="svg" />

<script lang="ts">
	// 受付・入口の係（apiserver）：六角の柱。上に記号（第 17 章 hex）
	import { hexPts, localProj, prism } from '../iso';
	import Base from './Base.svelte';
	import Solid from './Solid.svelte';
	import { FOOT, edge, type Tone } from './paint';
	type Props = {
		x: number;
		y: number;
		s?: number;
		uik?: number;
		hl?: boolean;
		lift?: number;
		op?: number;
		id?: string;
		term?: string;
		tone?: Tone;
		glyph?: string;
		r?: number;
	};
	let {
		x,
		y,
		s = 1,
		uik = 1,
		hl = false,
		lift = 0,
		op = 1,
		id,
		term,
		tone = 'teal',
		glyph,
		r = 62
	}: Props = $props();
	const f = FOOT.hex;
	const P = $derived(localProj(x, y, s));
	const body = $derived(prism(hexPts(r), 0, f[2], P));
	const gp = $derived(P.at(0, 0, f[2]));
</script>

<Base {x} {y} {s} {uik} w={f[0]} d={f[1]} {tone} {hl} {lift} {op} {id} {term}>
	<Solid g={body} {tone} top={hl ? 26 : 16} {uik} />
	{#if glyph}
		<text
			x={gp[0]}
			y={gp[1] + 9 * s}
			text-anchor="middle"
			style:font-size="{26 * s}px"
			font-weight="800"
			style:fill={edge(tone)}>{glyph}</text
		>
	{/if}
</Base>
