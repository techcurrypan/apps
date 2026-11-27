<svelte:options namespace="svg" />

<script lang="ts">
	// キュー：角の丸い浅い皿と 4 つの溝（点線）。時刻を待つ物は時計の印（第 17 章 queue）
	import { localProj, prism, ptsStr, rrectPts } from '../iso';
	import Base from './Base.svelte';
	import Token from './Token.svelte';
	import Solid from './Solid.svelte';
	import { FOOT, edge, face, type Tone } from './paint';
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
		clock?: boolean;
		/** 溝に並ぶ荷物の名前（左の溝から） */
		items?: string[];
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
		tone = 'teal',
		clock = false,
		items = []
	}: Props = $props();
	const f = FOOT.queue;
	const P = $derived(localProj(x, y, s));
	const body = $derived(prism(rrectPts(-f[0] / 2, -f[1] / 2, f[0], f[1], 20), 0, f[2], P));
	const slots = $derived(
		[0, 1, 2, 3].map((i) =>
			rrectPts(-100 + i * 52, -30, 44, 60, 9).map((q) => P.at(q[0], q[1], f[2] + 0.5))
		)
	);
	/** 時計は待つ物（先頭の荷物、無ければ一番右の溝）の真上に、縁から細い柱で立てる */
	const cx = $derived(items.length ? -78 : 78);
	const cp = $derived(P.at(cx, 0, f[2] + (items.length ? 80 : 74)));
	const cb = $derived(P.at(cx, 0, f[2] + (items.length ? 56 : 2)));
	const itemAt = (i: number) => P.at(-78 + i * 52, 0, f[2]);
</script>

<Base {x} {y} {s} {uik} w={f[0]} d={f[1]} {tone} {hl} {lift} {op} {id} {term}>
	<Solid g={body} {tone} top={hl ? 18 : 11} {uik} />
	{#each slots as sl, i (i)}
		<polygon
			points={ptsStr(sl)}
			style:fill={face(tone, 28)}
			style:stroke={edge(tone)}
			stroke-width={1.2 * uik}
			stroke-dasharray="{4 * uik} {3 * uik}"
		/>
	{/each}
	{#each items as it, i (i)}
		{@const q = itemAt(i)}
		<Token x={q[0]} y={q[1] - 12 * s} label={it} scale={0.8 * s} {uik} />
	{/each}
	{#if clock}
		<line
			x1={cb[0]}
			y1={cb[1]}
			x2={cp[0]}
			y2={cp[1] + 11 * uik}
			style:stroke={edge(tone)}
			stroke-width={1.6 * uik}
			stroke-dasharray="{3 * uik} {2.5 * uik}"
		/>
		<circle
			cx={cp[0]}
			cy={cp[1]}
			r={11 * uik}
			style:fill="var(--dl-scene-pn)"
			style:stroke="var(--dl-ink)"
			stroke-width={2 * uik}
		/>
		<path
			d="M{cp[0]} {cp[1] - 6 * uik}V{cp[1]}l{4 * uik} {3 * uik}"
			fill="none"
			style:stroke={edge(tone)}
			stroke-width={2.2 * uik}
			stroke-linecap="round"
		/>
	{/if}
</Base>
