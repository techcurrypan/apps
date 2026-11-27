<svelte:options namespace="svg" />

<script lang="ts">
	// 数の札（例：「cwnd 10」「参照 2」）：等幅の字の角の丸い札。色の地に白い字（LS3-K6）。x, y は左の中ほど（center で中心）
	import { col, textWidth, type Tone } from '../kit/paint';
	import { LABEL_PX } from './uik';
	type Props = {
		x: number;
		y: number;
		text: string;
		tone?: Tone;
		size?: number;
		uik?: number;
		center?: boolean;
		op?: number;
		term?: string;
	};
	let {
		x,
		y,
		text,
		tone = 'blue',
		size = LABEL_PX.num,
		uik = 1,
		center = false,
		op = 1,
		term
	}: Props = $props();
	const sz = $derived(size * uik);
	const h = $derived(24 * uik);
	const w = $derived(textWidth(text, sz) + 18 * uik);
	const x0 = $derived(center ? x - w / 2 : x);
</script>

<g opacity={op} data-term={term} class:help={!!term}>
	<rect
		x={x0}
		y={y - h / 2}
		width={w}
		height={h}
		rx={7 * uik}
		style:fill="color-mix(in srgb, {col(tone)} 66%, #15181d)"
		style:stroke="var(--dl-ink)"
		stroke-width={1.2 * uik}
	/>
	<text x={x0 + 9 * uik} y={y + sz * 0.36} style:font-size="{sz}px" font-weight="800">{text}</text>
</g>

<style>
	text {
		font-family: var(--dl-font-code);
		fill: #fff;
	}
	.help {
		cursor: help;
	}
</style>
