<svelte:options namespace="svg" />

<script lang="ts">
	// 図の上の字。白い縁取りで線や面の上でも読める。size は画面の上の px（uik を掛ける）
	type Props = {
		x: number;
		y: number;
		text: string;
		size?: number;
		uik?: number;
		weight?: number;
		anchor?: 'start' | 'middle' | 'end';
		color?: string;
		mono?: boolean;
		op?: number;
	};
	let {
		x,
		y,
		text,
		size = 12.5,
		uik = 1,
		weight = 700,
		anchor = 'start',
		color = 'var(--dl-ink)',
		mono = false,
		op = 1
	}: Props = $props();
</script>

<text
	{x}
	{y}
	text-anchor={anchor}
	class:mono
	opacity={op}
	style:font-size="{size * uik}px"
	font-weight={weight}
	style:fill={color}
	style:stroke-width="{4 * uik}px">{text}</text
>

<style>
	text {
		font-family: var(--dl-font);
		paint-order: stroke;
		stroke: var(--dl-scene-pn);
		stroke-linejoin: round;
	}
	text.mono {
		font-family: var(--dl-font-code);
	}
</style>
