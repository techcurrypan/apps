<svelte:options namespace="svg" />

<script lang="ts">
	// Pod・コンテナ：六角の柱。上に名前、下に状態。色は状態（Ready＝緑・起動中＝橙・落ちた＝赤・紙だけ＝紫の点線。第 17 章 pod）
	import { hexPts, localProj, prism } from '../iso';
	import Halo from '../label/Halo.svelte';
	import Solid from './Solid.svelte';
	import { POD, edge } from './paint';
	type Props = {
		x: number;
		y: number;
		s?: number;
		uik?: number;
		lift?: number;
		op?: number;
		r?: number;
		state?: keyof typeof POD;
		name?: string;
		label?: string;
		term?: string;
	};
	let {
		x,
		y,
		s = 1,
		uik = 1,
		lift = 0,
		op = 1,
		r = 56,
		state = 'ready',
		name,
		label,
		term = 'pod'
	}: Props = $props();
	const tone = $derived(POD[state][0]);
	const paper = $derived(state === 'paper');
	const R = $derived(r * s);
	const h = $derived(paper ? 3 : (R > 22 ? 54 : 14) * s);
	const body = $derived(prism(hexPts(R), 0, h, localProj(x, y - lift, 1)));
	const lb = $derived(label ?? POD[state][1]);
</script>

<g opacity={op} data-term={term} class="help">
	<g data-body>
		<Solid
			g={body}
			{tone}
			top={paper ? 8 : state === 'gray' ? 14 : 26}
			{uik}
			shadow={!paper}
			sw={paper ? 2 : 1.5}
			dash={paper ? `${6 * uik} ${4 * uik}` : undefined}
		/>
	</g>
	{#if name}
		<Halo
			{x}
			y={y - lift - h + 5 * uik}
			text={name}
			size={R > 30 ? 14 : 13}
			{uik}
			weight={800}
			anchor="middle"
			mono
		/>
	{/if}
	{#if R > 22 && lb}
		<Halo
			{x}
			y={y + R * 0.6 + 18 * uik}
			text={lb}
			size={13}
			{uik}
			weight={800}
			anchor="middle"
			color={edge(tone)}
		/>
	{/if}
	{#if state === 'dead'}
		<path
			d="M{x + R + 4 * uik} {y - lift - h - 30 * uik}l{16 * uik} {16 * uik}m0 {-16 * uik}l{-16 *
				uik} {16 * uik}"
			style:stroke="var(--dl-obj-red)"
			stroke-width={3 * uik}
			stroke-linecap="round"
		/>
	{/if}
</g>

<style>
	.help {
		cursor: help;
	}
</style>
