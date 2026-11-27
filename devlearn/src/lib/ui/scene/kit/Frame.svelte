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
	const P = $derived(localProj(x, y, s));
	const board = $derived(prism(rrectPts(-w / 2, -d / 2, w, d, 20), 0, 10, P));
	/** 名前の小箱：板の奥に立つ小箱。名前の札は小箱の上に接して載せる（浮かせない。第 17 章 frame・判定 15 回目） */
	const box = $derived(prism(rrectPts(-w / 2 + 14, -d / 2 + 10, 46, 30, 8), 10, 30, P));
	const boxTop = $derived(Math.min(...box.top.map((q) => q[1])));
	const tx = $derived(P.at(-w / 2 + 37, -d / 2 + 25, 30)[0]);
	/** 札の高さ（Tag と同じ：字 13.5 ＋ 13）の半分だけ上に。札の下の縁が小箱の上に触れる */
	const ty = $derived(boxTop - ((13.5 + 13) * uik) / 2 + 2 * uik);
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
	<Tag
		x={tx}
		y={ty}
		text={name}
		size={13.5}
		{uik}
		dot={`var(--dl-obj-${current ? 'blue' : 'gray'})`}
	/>
</Base>
