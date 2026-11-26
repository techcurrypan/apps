<svelte:options namespace="svg" />

<script lang="ts">
	// 立体 1 つ（iso.ts の PrismGeom）を描く：影・横の面（3 段）・外の輪郭・上の面
	import { ptsStr, type PrismGeom } from '../iso';
	import { face, SHADE, type Tone } from './paint';
	type Props = {
		g: PrismGeom;
		tone: Tone;
		top?: number;
		uik?: number;
		dash?: string;
		shadow?: boolean;
		sw?: number;
		topFill?: string;
		stroke?: string;
	};
	let {
		g,
		tone,
		top = 13,
		uik = 1,
		dash,
		shadow = true,
		sw = 1.5,
		topFill,
		stroke = 'var(--dl-ink)'
	}: Props = $props();
</script>

{#if shadow}<polygon class="sh" points={ptsStr(g.shadow)} />{/if}
{#each g.sides as sd, i (i)}
	<polygon
		points={ptsStr(sd.pts)}
		style:fill={face(tone, SHADE[sd.shade])}
		style:stroke={face(tone, SHADE[sd.shade])}
		stroke-width="0.6"
	/>
{/each}
{#if g.outline.length}
	<polyline
		points={ptsStr(g.outline)}
		fill="none"
		style:stroke
		stroke-width={sw * uik}
		stroke-linejoin="round"
		stroke-dasharray={dash}
	/>
{/if}
<polygon
	points={ptsStr(g.top)}
	style:fill={topFill ?? face(tone, top)}
	style:stroke
	stroke-width={sw * uik}
	stroke-linejoin="round"
	stroke-dasharray={dash}
/>

<style>
	.sh {
		fill: #000;
		opacity: 0.13;
		filter: url(#dl-isoblur);
	}
</style>
