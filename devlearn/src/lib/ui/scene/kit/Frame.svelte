<svelte:options namespace="svg" />

<script lang="ts">
	// 関数のフレーム：角の丸い板。上に名前の小箱が立つ。灰（今のフレームは青。第 17 章 frame）
	import { localProj, prism, rrectPts } from '../iso';
	import Tag from '../label/Tag.svelte';
	import Base from './Base.svelte';
	import Solid from './Solid.svelte';
	type Props = {
		x: number;
		y: number;
		s?: number;
		uik?: number;
		lift?: number;
		op?: number;
		id?: string;
		term?: string;
		name: string;
		current?: boolean;
		w?: number;
		d?: number;
	};
	let {
		x,
		y,
		s = 1,
		uik = 1,
		lift = 0,
		op = 1,
		id,
		term = 'frame',
		name,
		current = false,
		w = 260,
		d = 150
	}: Props = $props();
	const tone = $derived(current ? 'blue' : 'gray');
	const P = $derived(localProj(x, y, s));
	const board = $derived(prism(rrectPts(-w / 2, -d / 2, w, d, 20), 0, 10, P));
	const box = $derived(prism(rrectPts(-w / 2 + 14, -d / 2 + 10, 46, 30, 8), 10, 30, P));
	/** 名前は上に立つ小箱の真上に（第 17 章 frame「上に名前の小箱が立つ」） */
	const tp = $derived(P.at(-w / 2 + 37, -d / 2 + 25, 56));
</script>

<Base
	{x}
	{y}
	{s}
	{uik}
	{w}
	{d}
	tone={current ? 'blue' : 'gray'}
	hl={current}
	{lift}
	{op}
	{id}
	{term}
>
	<Solid g={board} tone={current ? 'blue' : 'gray'} top={current ? 14 : 8} {uik} />
	<Solid g={box} tone={current ? 'blue' : 'gray'} top={30} {uik} shadow={false} />
	<Tag x={tp[0]} y={tp[1] - 20 * uik} text={name} size={13.5} {uik} dot={`var(--dl-obj-${tone})`} />
</Base>
