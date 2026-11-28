<svelte:options namespace="svg" />

<script lang="ts">
	// 変数の名札：角の丸い小箱。上に名前。フレームの板に乗る部材（主な物に数えない。data-part）。色は名前ごと（a＝青・b＝橙・c＝緑。第 17 章 var）
	import { localProj, prism, rrectPts } from '../iso';
	import Halo from '../label/Halo.svelte';
	import Base from './Base.svelte';
	import Solid from './Solid.svelte';
	import { VAR_TONE, type Tone } from './paint';
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
		name: string;
		tone?: Tone;
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
		term = 'name',
		name,
		tone
	}: Props = $props();
	const t = $derived(tone ?? VAR_TONE[name] ?? 'teal');
	const body = $derived(prism(rrectPts(-30, -22, 60, 44, 10), 0, 22, localProj(x, y, s)));
	const tp = $derived(localProj(x, y, s).at(0, 0, 22));
	/** 名前は上の面の真ん中に載せる（試作 learn11 の mem と同じ。判定 13 回目）。字の真ん中を面の真ん中に */
	const nameY = $derived(tp[1] + 6 * uik);
</script>

<Base {x} {y} {s} {uik} w={60} d={44} tone={t} {hl} {lift} {op} {id} {term} part>
	<Solid g={body} tone={t} top={hl ? 32 : 22} {uik} />
	<Halo
		x={tp[0]}
		y={nameY}
		text={name}
		size={15}
		{uik}
		weight={800}
		anchor="middle"
		color="var(--dl-ink)"
	/>
</Base>
