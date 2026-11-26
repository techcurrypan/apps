<svelte:options namespace="svg" />

<script lang="ts">
	// アプリ・利用者の端末・kubectl：角の丸い台と、立てた画面。画面に 3 本の行（第 17 章 laptop）
	import { localProj, prism, ptsStr, rrectPts, type Pt } from '../iso';
	import Base from './Base.svelte';
	import Solid from './Solid.svelte';
	import { FOOT, face, type Tone } from './paint';
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
		tone = 'blue'
	}: Props = $props();
	const f = FOOT.laptop;
	const P = $derived(localProj(x, y, s));
	const base = $derived(prism(rrectPts(-66, -46, 132, 92, 14), 0, 8, P));
	const keys = $derived(rrectPts(-52, -24, 104, 56, 8).map((q) => P.at(q[0], q[1], 8.5)));
	const lid = $derived(prism(rrectPts(-62, -46, 124, 9, 4), 8, 84, P));
	const screen = $derived<Pt[]>([
		P.at(-54, -37, 16),
		P.at(54, -37, 16),
		P.at(54, -37, 86),
		P.at(-54, -37, 86)
	]);
	const rows = $derived(
		[0, 1, 2].map((i) => [
			P.at(-44, -37, 72 - i * 16),
			P.at(30 - i * 14, -37, 72 - i * 16),
			P.at(30 - i * 14, -37, 65 - i * 16),
			P.at(-44, -37, 65 - i * 16)
		])
	);
</script>

<Base {x} {y} {s} {uik} w={f[0]} d={f[1]} {tone} {hl} {lift} {op} {id} {term}>
	<Solid g={base} tone="gray" top={8} {uik} />
	<polygon
		points={ptsStr(keys)}
		style:fill={face('gray', 22)}
		style:stroke="var(--dl-ink)"
		stroke-width={uik}
	/>
	<Solid g={lid} tone="gray" top={18} {uik} shadow={false} />
	<polygon
		points={ptsStr(screen)}
		style:fill={face(tone, 26)}
		style:stroke="var(--dl-ink)"
		stroke-width={1.2 * uik}
		stroke-linejoin="round"
	/>
	{#each rows as r, i (i)}
		<polygon points={ptsStr(r)} style:fill={face(tone, 60)} />
	{/each}
</Base>
