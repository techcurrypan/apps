<svelte:options namespace="svg" />

<script lang="ts">
	// 関数・処理の係：角の丸い箱と、上の角の丸い札と記号（ƒ・?・✓・⇉・⚡・IP）。色は実行の文脈（第 17 章 func・block）
	import { localProj, prism, ptsStr, rrectPts } from '../iso';
	import Base from './Base.svelte';
	import Solid from './Solid.svelte';
	import { FOOT, edge, face, type Tone } from './paint';
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
		kind?: 'func' | 'block';
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
		tone = 'gray',
		glyph,
		kind = 'func'
	}: Props = $props();
	const f = $derived(FOOT[kind]);
	const P = $derived(localProj(x, y, s));
	const body = $derived(prism(rrectPts(-f[0] / 2, -f[1] / 2, f[0], f[1], 22), 0, f[2], P));
	const chip = $derived(
		rrectPts(-f[0] * 0.31, -f[1] * 0.31, f[0] * 0.62, f[1] * 0.62, 12).map((q) =>
			P.at(q[0], q[1], f[2] + 0.5)
		)
	);
	const gp = $derived(P.at(0, 0, f[2]));
</script>

<Base {x} {y} {s} {uik} w={f[0]} d={f[1]} {tone} {hl} {lift} {op} {id} {term}>
	<Solid g={body} {tone} top={hl ? 20 : 12} {uik} />
	<polygon
		points={ptsStr(chip)}
		style:fill={face(tone, hl ? 30 : 22)}
		style:stroke={edge(tone)}
		stroke-width={1.1 * uik}
		opacity="0.95"
	/>
	{#if glyph}
		<text
			x={gp[0]}
			y={gp[1] + 9 * s}
			text-anchor="middle"
			style:font-size="{26 * s}px"
			font-weight="800"
			paint-order="stroke"
			style:stroke={edge(tone)}
			stroke-width={1.2 * s}
			style:fill={edge(tone)}>{glyph}</text
		>
	{/if}
</Base>
