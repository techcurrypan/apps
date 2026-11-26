<svelte:options namespace="svg" />

<script lang="ts">
	// 名前の札（丸い札・左に色の点）。字は画面の上で size px（uik を掛ける。learn-standard.md 16.3）
	import { textWidth } from '../kit/paint';
	type Props = {
		x: number;
		y: number;
		text: string;
		size?: number;
		uik?: number;
		dot?: string;
		mono?: boolean;
		left?: boolean;
		fill?: string;
		color?: string;
		term?: string;
		op?: number;
	};
	let {
		x,
		y,
		text,
		size = 14,
		uik = 1,
		dot,
		mono = true,
		left = false,
		fill = 'var(--dl-scene-pn)',
		color = 'var(--dl-ink)',
		term,
		op = 1
	}: Props = $props();
	const sz = $derived(size * uik);
	const h = $derived(sz + 13 * uik);
	const w = $derived(textWidth(text, sz) + (dot ? 32 : 22) * uik);
	const x0 = $derived(left ? x : x - w / 2);
</script>

<g class="tag" opacity={op} data-term={term} class:help={!!term}>
	<rect x={x0 + 1.5 * uik} y={y - h / 2 + 2.5 * uik} width={w} height={h} rx={h / 2} class="sh" />
	<rect
		x={x0}
		y={y - h / 2}
		width={w}
		height={h}
		rx={h / 2}
		style:fill
		style:stroke="var(--dl-ink)"
		stroke-width={1.6 * uik}
	/>
	{#if dot}
		<circle
			cx={x0 + 15 * uik}
			cy={y}
			r={5.5 * uik}
			style:fill={dot}
			style:stroke="var(--dl-ink)"
			stroke-width={uik}
		/>
	{/if}
	<text
		x={x0 + (dot ? 26 : 11) * uik}
		y={y + sz * 0.36}
		class:mono
		style:font-size="{sz}px"
		font-weight="700"
		style:fill={color}>{text}</text
	>
</g>

<style>
	.sh {
		fill: var(--dl-ink);
		opacity: 0.18;
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
