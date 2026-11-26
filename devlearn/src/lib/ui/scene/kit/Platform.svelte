<svelte:options namespace="svg" />

<script lang="ts">
	// ノード・サーバ 1 台：角の丸い大きな台（上に Pod などが乗る）。落ちたノードは灰の点線（第 17 章 platform）
	import { localProj, prism, rrectPts } from '../iso';
	import Base from './Base.svelte';
	import Solid from './Solid.svelte';
	import { FOOT, type Tone } from './paint';
	type Props = {
		x: number;
		y: number;
		s?: number;
		uik?: number;
		hl?: boolean;
		lift?: number;
		op?: number;
		id?: string;
		term?: string;
		tone?: Tone;
		w?: number;
		d?: number;
		down?: boolean;
	};
	let {
		x,
		y,
		s = 1,
		uik = 1,
		hl = false,
		lift = 0,
		op = 1,
		id,
		term,
		tone = 'green',
		w = 300,
		d = 200,
		down = false
	}: Props = $props();
	const body = $derived(
		prism(rrectPts(-w / 2, -d / 2, w, d, 34), 0, FOOT.platform[2], localProj(x, y, s))
	);
</script>

<Base {x} {y} {s} {uik} {w} {d} {tone} {hl} {lift} {op} {id} {term} pad={false}>
	<Solid
		g={body}
		tone={down ? 'gray' : tone}
		top={hl ? 12 : 7}
		{uik}
		dash={down ? `${6 * uik} ${5 * uik}` : undefined}
	/>
</Base>
