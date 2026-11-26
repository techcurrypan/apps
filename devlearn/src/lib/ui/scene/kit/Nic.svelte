<svelte:options namespace="svg" />

<script lang="ts">
	// NIC・部品：角の丸い基板（緑）・中央のチップ（紫）・端の金の端子・小さな部品 3 つ（第 17 章 nic）
	import { localProj, prism, ptsStr, rrectPts } from '../iso';
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
		tone = 'purple'
	}: Props = $props();
	const f = FOOT.nic;
	const P = $derived(localProj(x, y, s));
	const board = $derived(prism(rrectPts(-f[0] / 2, -f[1] / 2, f[0], f[1], 16), 0, f[2], P));
	const chip = $derived(prism(rrectPts(-30, -26, 60, 52, 10), f[2], 12, P));
	const pins = $derived(
		prism(rrectPts(f[0] / 2 - 18, -f[1] / 2 + 10, 12, f[1] - 20, 4), f[2], 4, P)
	);
	const parts = $derived(
		[0, 1, 2].map((i) =>
			rrectPts(-62, -36 + i * 26, 22, 16, 4).map((q) => P.at(q[0], q[1], f[2] + 0.5))
		)
	);
</script>

<Base {x} {y} {s} {uik} w={f[0]} d={f[1]} tone="green" {hl} {lift} {op} {id} {term}>
	<Solid g={board} tone="green" top={18} {uik} />
	<Solid g={chip} {tone} top={30} {uik} shadow={false} />
	<Solid g={pins} tone="yellow" top={40} {uik} shadow={false} />
	{#each parts as p, i (i)}
		<polygon
			points={ptsStr(p)}
			style:fill={face('gray', 30)}
			style:stroke="var(--dl-ink)"
			stroke-width={0.8 * uik}
		/>
	{/each}
</Base>
