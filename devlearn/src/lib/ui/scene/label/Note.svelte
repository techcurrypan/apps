<svelte:options namespace="svg" />

<script lang="ts">
	// 説明の札（例：「send() は 40 µs で戻る」）：物の色の淡い面と濃い輪郭の丸い札（LS3-K6）。字は画面の上で size px
	import { edge, face, textWidth, type Tone } from '../kit/paint';
	import { LABEL_PX } from './uik';
	type Props = {
		x: number;
		y: number;
		text: string;
		tone?: Tone;
		size?: number;
		uik?: number;
		mono?: boolean;
		center?: boolean;
		op?: number;
		term?: string;
	};
	let {
		x,
		y,
		text,
		tone = 'green',
		size = LABEL_PX.note,
		uik = 1,
		mono = false,
		center = true,
		op = 1,
		term
	}: Props = $props();
	const sz = $derived(size * uik);
	const h = $derived(sz + 14 * uik);
	const w = $derived(textWidth(text, sz) + 24 * uik);
	const x0 = $derived(center ? x - w / 2 : x);
</script>

<g opacity={op} data-term={term} class:help={!!term}>
	<rect x={x0 + 2 * uik} y={y - h / 2 + 3 * uik} width={w} height={h} rx={h / 2} class="sh" />
	<rect
		x={x0}
		y={y - h / 2}
		width={w}
		height={h}
		rx={h / 2}
		style:fill={face(tone, 22)}
		style:stroke={edge(tone)}
		stroke-width={1.6 * uik}
	/>
	<text
		x={x0 + 12 * uik}
		y={y + sz * 0.36}
		class:mono
		style:font-size="{sz}px"
		font-weight="800"
		style:fill={edge(tone)}>{text}</text
	>
</g>

<style>
	.sh {
		fill: var(--dl-ink);
		opacity: 0.14;
	}
	.help {
		cursor: help;
	}
	text {
		font-family: var(--dl-font);
	}
	text.mono {
		font-family: var(--dl-font-code);
	}
</style>
