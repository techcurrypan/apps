<svelte:options namespace="svg" />

<script lang="ts">
	// 送信リング・輪になった置き場：短い円柱と中の穴、縁に粒が 8 つ（第 17 章 ring）
	import { cylinder, localProj } from '../iso';
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
		tone = 'gray'
	}: Props = $props();
	const f = FOOT.ring;
	const c = $derived(cylinder(x, y, 60, f[2], s));
	const hole = $derived(cylinder(x, y, 30, f[2], s));
	const beads = $derived(
		[0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
			localProj(x, y, s).at(
				Math.cos((i * Math.PI) / 4) * 45,
				Math.sin((i * Math.PI) / 4) * 45,
				f[2]
			)
		)
	);
</script>

<Base {x} {y} {s} {uik} w={f[0]} d={f[1]} {tone} {hl} {lift} {op} {id} {term}>
	<ellipse cx={x + 7} cy={y + 6} rx={c.rx} ry={c.ry} class="sh" />
	<path
		d={c.body}
		style:fill={face(tone, 36)}
		style:stroke="var(--dl-ink)"
		stroke-width={1.4 * uik}
	/>
	<ellipse
		cx={x}
		cy={c.topY}
		rx={c.rx}
		ry={c.ry}
		style:fill={face(tone, hl ? 24 : 14)}
		style:stroke="var(--dl-ink)"
		stroke-width={(hl ? 2.2 : 1.4) * uik}
	/>
	<ellipse
		cx={x}
		cy={c.topY}
		rx={hole.rx}
		ry={hole.ry}
		style:fill="var(--dl-scene-bg)"
		style:stroke="var(--dl-ink)"
		stroke-width={1.4 * uik}
	/>
	{#each beads as b, i (i)}
		<circle
			cx={b[0]}
			cy={b[1]}
			r={4 * s}
			style:fill={face(tone, 60)}
			style:stroke="var(--dl-ink)"
			stroke-width={0.8 * uik}
		/>
	{/each}
</Base>

<style>
	.sh {
		fill: #000;
		opacity: 0.12;
		filter: url(#dl-isoblur);
	}
</style>
