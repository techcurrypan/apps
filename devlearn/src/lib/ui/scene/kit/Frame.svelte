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
	/** 名前の小箱：名前の札そのものを、板の奥の縁に立てる（札の下の縁が板の上の面に触れる）。
	 * 名前の無い小箱は var と見分けにくいので置かない（第 17 章 frame・判定 16 回目） */
	const tx = $derived(P.at(-w / 2 + 70, -d / 2 + 18, 10)[0]);
	const ty = $derived(P.at(-w / 2 + 70, -d / 2 + 18, 10)[1] - ((13.5 + 13) * uik) / 2 + 3 * uik);
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
	<Tag
		x={tx}
		y={ty}
		text={name}
		size={13.5}
		{uik}
		dot={`var(--dl-obj-${current ? 'blue' : 'gray'})`}
	/>
</Base>
