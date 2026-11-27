<svelte:options namespace="svg" />

<script lang="ts">
	// キュー：角の丸い浅い皿と 4 つの溝（点線）。時刻を待つ物は時計の印（第 17 章 queue）
	import { localProj, prism, ptsStr, rrectPts } from '../iso';
	import Base from './Base.svelte';
	import Token from './Token.svelte';
	import Solid from './Solid.svelte';
	import { FOOT, edge, face, textWidth, type Tone } from './paint';
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
	/** 時計は待つ物の印：荷物の名前から離し、列の右端（次の荷物が入る溝）の上に添える（判定 15 回目） */
	const itemAt = (i: number) => P.at(-78 + i * 52, 0, f[2]);
	const cp = $derived(P.at(78, 0, f[2] + 58));
	/** 荷物の名前の札の箱（画面）。溝の点線は、この箱の外側 4px 手前で切る（LS3-S4・判定 20 回目） */
	const GAP = 11;
	const nameBox = $derived(
		items.map((it, i) => {
			const q = itemAt(i + 1);
			const hh = 24 * 0.8 * s;
			const cy = q[1] - 2 * s - hh * 0.55 - GAP * uik - 4.5 * uik;
			const w = textWidth(it, 13) * uik;
			const h = 13 * uik;
			const pad = 4 * uik;
			return { x: q[0] - w / 2 - pad, y: cy - h / 2 - pad, w: w + pad * 2, h: h + pad * 2 };
		})
	);
	const mid = $props.id();
</script>

<Base {x} {y} {s} {uik} w={f[0]} d={f[1]} {tone} {hl} {lift} {op} {id} {term}>
	<Solid g={body} {tone} top={hl ? 18 : 11} {uik} />
	<mask id="qm-{mid}" maskUnits="userSpaceOnUse">
		<rect x={x - 400} y={y - 400} width={800} height={800} fill="#fff" />
		{#each nameBox as b, i (i)}
			<rect x={b.x} y={b.y} width={b.w} height={b.h} rx={4 * uik} fill="#000" />
		{/each}
	</mask>
	{#each slots as sl, i (i)}
		<polygon
			mask="url(#qm-{mid})"
			points={ptsStr(sl)}
			style:fill={face(tone, 28)}
			style:stroke={edge(tone)}
			stroke-width={1.2 * uik}
			stroke-dasharray="{4 * uik} {3 * uik}"
		/>
	{/each}
	{#each items as it, i (i)}
		{@const q = itemAt(i + 1)}
		<Token x={q[0]} y={q[1] - 2 * s} label={it} scale={0.8 * s} {uik} gap={GAP} />
	{/each}
	{#if clock}
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
