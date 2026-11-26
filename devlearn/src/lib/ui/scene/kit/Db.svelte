<svelte:options namespace="svg" />

<script lang="ts">
	// データベース・帳簿（etcd）：円柱と 2 本の帯（第 17 章 db）
	import { cylinder } from '../iso';
	import Base from './Base.svelte';
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
		r?: number;
		bands?: number;
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
		tone = 'purple',
		r = 56,
		bands = 2
	}: Props = $props();
	const f = FOOT.db;
	const c = $derived(cylinder(x, y, r, f[2], s));
	const ks = $derived(Array.from({ length: bands }, (_, i) => i));
</script>

<Base {x} {y} {s} {uik} w={f[0]} d={f[1]} {tone} {hl} {lift} {op} {id} {term}>
	<ellipse cx={x + 7} cy={y + 6} rx={c.rx} ry={c.ry} class="sh" />
	<path
		d={c.body}
		style:fill={face(tone, 36)}
		style:stroke="var(--dl-ink)"
		stroke-width={1.4 * uik}
	/>
	{#each ks as i (i)}
		<path
			d={c.band(i, bands)}
			fill="none"
			style:stroke="var(--dl-ink)"
			stroke-width="1"
			opacity="0.55"
		/>
	{/each}
	<ellipse
		cx={x}
		cy={c.topY}
		rx={c.rx}
		ry={c.ry}
		style:fill={face(tone, hl ? 24 : 14)}
		style:stroke="var(--dl-ink)"
		stroke-width={(hl ? 2.2 : 1.4) * uik}
	/>
</Base>

<style>
	.sh {
		fill: #000;
		opacity: 0.12;
		filter: url(#dl-isoblur);
	}
</style>
