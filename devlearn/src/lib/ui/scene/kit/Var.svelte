<svelte:options namespace="svg" />

<script lang="ts">
	// 変数の名札：角の丸い小箱。上に名前。色は名前ごと（a＝青・b＝橙・c＝緑。第 17 章 var）
	import { localProj, prism, rrectPts } from '../iso';
	import Halo from '../label/Halo.svelte';
	import Base from './Base.svelte';
	import Solid from './Solid.svelte';
	import { type Tone } from './paint';
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
	const BY: Record<string, Tone> = { a: 'blue', b: 'orange', c: 'green', d: 'purple' };
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
	const t = $derived(tone ?? BY[name] ?? 'teal');
	const body = $derived(prism(rrectPts(-30, -22, 60, 44, 10), 0, 22, localProj(x, y, s)));
	const tp = $derived(localProj(x, y, s).at(0, 0, 22));
</script>

<Base {x} {y} {s} {uik} w={60} d={44} tone={t} {hl} {lift} {op} {id} {term}>
	<Solid g={body} tone={t} top={hl ? 32 : 22} {uik} />
	<Halo
		x={tp[0]}
		y={tp[1] - 12 * uik}
		text={name}
		size={16}
		{uik}
		weight={800}
		anchor="middle"
		mono
		color="var(--dl-ink)"
	/>
</Base>
