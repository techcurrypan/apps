<svelte:options namespace="svg" />

<script lang="ts">
	// 時計：時刻を待つ物の印（RTO・backoff・pacing）。右に時刻の札（例：「200 ms 後」）
	import { edge, type Tone } from '../kit/paint';
	import Halo from './Halo.svelte';
	import { LABEL_PX } from './uik';
	type Props = { x: number; y: number; label?: string; tone?: Tone; uik?: number; op?: number };
	let { x, y, label, tone = 'orange', uik = 1, op = 1 }: Props = $props();
</script>

<g opacity={op}>
	<circle
		cx={x}
		cy={y}
		r={11 * uik}
		style:fill="var(--dl-scene-pn)"
		style:stroke="var(--dl-ink)"
		stroke-width={2 * uik}
	/>
	<path
		d="M{x} {y - 6 * uik}V{y}l{4 * uik} {3 * uik}"
		fill="none"
		style:stroke={edge(tone)}
		stroke-width={2.2 * uik}
		stroke-linecap="round"
	/>
	{#if label}
		<Halo
			x={x + 17 * uik}
			y={y + 4.5 * uik}
			text={label}
			size={LABEL_PX.num}
			{uik}
			weight={800}
			mono
			color={edge(tone)}
		/>
	{/if}
</g>
