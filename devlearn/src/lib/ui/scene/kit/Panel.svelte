<svelte:options namespace="svg" />

<script lang="ts">
	// グラフの段：厚みのある角の丸い板。色は段（母集団＝青緑・標本＝青・平均＝橙。第 17 章 panel）
	import type { Snippet } from 'svelte';
	import Halo from '../label/Halo.svelte';
	import { face, type Tone } from './paint';
	type Props = {
		x: number;
		y: number;
		w: number;
		h: number;
		uik?: number;
		tone?: Tone;
		title?: string;
		hl?: boolean;
		lift?: number;
		op?: number;
		id?: string;
		term?: string;
		children?: Snippet;
	};
	let {
		x,
		y,
		w,
		h,
		uik = 1,
		tone = 'teal',
		title,
		hl = false,
		lift = 0,
		op = 1,
		id,
		term,
		children
	}: Props = $props();
	const depth = 14;
	const r = 16;
</script>

<g opacity={op} data-obj={id} data-term={term} class:help={!!term}>
	<g data-body transform="translate(0 {-lift})">
		<rect x={x + 6} y={y + depth + 6} width={w} height={h} rx={r} class="sh" />
		<rect
			{x}
			y={y + depth}
			width={w}
			height={h}
			rx={r}
			style:fill={face(tone, 46)}
			style:stroke="var(--dl-ink)"
			stroke-width={1.5 * uik}
		/>
		<rect
			{x}
			{y}
			width={w}
			height={h}
			rx={r}
			style:fill={hl || lift ? face(tone, 8) : 'var(--dl-scene-pn)'}
			style:stroke="var(--dl-ink)"
			stroke-width={1.5 * uik}
		/>
		{#if title}<Halo
				x={x + 16}
				y={y + 28 * uik}
				text={title}
				size={14}
				{uik}
				weight={800}
				color="var(--dl-ink)"
			/>{/if}
		{#if children}{@render children()}{/if}
	</g>
</g>

<style>
	.sh {
		fill: #000;
		opacity: 0.1;
		filter: url(#dl-isoblur);
	}
	.help {
		cursor: help;
	}
</style>
