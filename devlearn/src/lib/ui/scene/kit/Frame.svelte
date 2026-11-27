<svelte:options namespace="svg" />

<script lang="ts">
	// 関数のフレーム：角の丸い板。上に名前の小箱が立つ。灰（今のフレームは青。第 17 章 frame）
	import { localProj, prism, rrectPts } from '../iso';
	import Halo from '../label/Halo.svelte';
	import { textWidth } from './paint';
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
	/** 名前の小箱：板の奥の縁に立つ。幅は名前に合わせ、名前は小箱の上の面に書く（第 17 章 frame。判定 15 回目） */
	const bw = $derived(Math.min(w - 20, (textWidth(name, 13.5) * uik) / s + 24));
	const bx = $derived(-w / 2 + 12);
	const box = $derived(prism(rrectPts(bx, -d / 2 + 10, bw, 28, 8), 10, 26, P));
	const tp = $derived(P.at(bx + bw / 2, -d / 2 + 24, 36));
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
	<Halo
		x={tp[0]}
		y={tp[1] + 5 * uik}
		text={name}
		size={13.5}
		{uik}
		weight={800}
		anchor="middle"
		color="var(--dl-ink)"
	/>
</Base>
