<svelte:options namespace="svg" />

<script lang="ts">
	// 物の枠：下の台・浮き上がり（乗せると 8 浮く。LS3-M4）・吹き出しの印（data-term）・測る印（data-obj・data-body）
	import type { Snippet } from 'svelte';
	import Pad from './Pad.svelte';
	import type { Tone } from './paint';
	type Props = {
		x: number;
		y: number;
		s?: number;
		uik?: number;
		w: number;
		d: number;
		tone?: Tone;
		hl?: boolean;
		lift?: number;
		op?: number;
		id?: string;
		term?: string;
		/** 台・板に乗る部材（主な物に数えない。測る印 data-part） */
		part?: boolean;
		pad?: boolean;
		children: Snippet;
	};
	let {
		x,
		y,
		s = 1,
		uik = 1,
		w,
		d,
		tone = 'gray',
		hl = false,
		lift = 0,
		op = 1,
		id,
		term,
		part = false,
		pad = true,
		children
	}: Props = $props();
	const on = $derived(hl || lift > 0);
</script>

<g
	opacity={op}
	data-obj={id}
	data-term={term}
	data-part={part ? '' : undefined}
	class:help={!!term}
>
	{#if pad}
		<Pad
			{x}
			{y}
			w={(w + 46) * s}
			d={(d + 46) * s}
			tone={on ? tone : 'gray'}
			hl={on}
			{uik}
			r={26 * s}
		/>
	{/if}
	<g data-body transform="translate(0 {-lift})">{@render children()}</g>
</g>

<style>
	.help {
		cursor: help;
	}
</style>
