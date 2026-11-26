<svelte:options namespace="svg" />

<script lang="ts">
	// ヒストグラム・指標の棒：立体の棒（前・上・右の 3 面）。x, y は棒の左下（第 17 章 bar）
	import { face, type Tone } from './paint';
	type Props = {
		x: number;
		y: number;
		w: number;
		h: number;
		d?: number;
		uik?: number;
		tone?: Tone;
		op?: number;
	};
	let { x, y, w, h, d = 5, uik = 1, tone = 'orange', op = 1 }: Props = $props();
	const dx = $derived(d * 0.9);
	const dy = $derived(d * 0.6);
</script>

<g opacity={op}>
	<rect
		{x}
		y={y - h}
		width={w}
		height={h}
		style:fill={face(tone, 48)}
		style:stroke="var(--dl-ink)"
		stroke-width={0.9 * uik}
	/>
	<polygon
		points="{x},{y - h} {x + dx},{y - h - dy} {x + w + dx},{y - h - dy} {x + w},{y - h}"
		style:fill={face(tone, 30)}
		style:stroke="var(--dl-ink)"
		stroke-width={0.9 * uik}
	/>
	<polygon
		points="{x + w},{y} {x + w},{y - h} {x + w + dx},{y - h - dy} {x + w + dx},{y - dy}"
		style:fill={face(tone, 64)}
		style:stroke="var(--dl-ink)"
		stroke-width={0.9 * uik}
	/>
</g>
