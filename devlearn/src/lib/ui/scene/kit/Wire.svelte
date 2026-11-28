<svelte:options namespace="svg" />

<script lang="ts">
	// 線（learn-standard.md 16.2 LS3-K4）：物の外枠の手前で止め、矢じりを付け、線の上を点が流れる。
	// 行き来は両側に矢じり。ACK・watch の戻りは点線。線の太さは画面の上で一定（uik を掛ける）
	import {
		DASHED,
		WIRE_TONE,
		dotsAt,
		trim,
		type Pt,
		type WireKind
	} from '../../../learn/scene/wire.ts';
	import { col, edge } from './paint';
	type Props = {
		a: Pt;
		b: Pt;
		/** 両端で止める長さ（図の単位） */
		ia?: number;
		ib?: number;
		kind?: WireKind;
		both?: boolean;
		/** 点の周の位置（player.ts の flowAt）。null は点を出さない */
		p?: number | null;
		uik?: number;
		op?: number;
	};
	let {
		a,
		b,
		ia = 0,
		ib = 0,
		kind = 'data',
		both = false,
		p = null,
		uik = 1,
		op = 1
	}: Props = $props();
	const t = $derived(trim(a, b, ia, ib));
	const tone = $derived(WIRE_TONE[kind]);
	const dots = $derived(dotsAt(t, p, both));
	const head = (from: Pt, to: Pt) => {
		const L = Math.hypot(to.x - from.x, to.y - from.y) || 1;
		const ux = (to.x - from.x) / L;
		const uy = (to.y - from.y) / L;
		const s = 9 * uik;
		return `M${to.x - ux * s - uy * s * 0.6} ${to.y - uy * s + ux * s * 0.6}L${to.x} ${to.y}L${to.x - ux * s + uy * s * 0.6} ${to.y - uy * s - ux * s * 0.6}`;
	};
</script>

{#if t.len > 0}
	<g opacity={op} data-wire={kind} pointer-events="none">
		<line
			x1={t.a.x}
			y1={t.a.y}
			x2={t.b.x}
			y2={t.b.y}
			style:stroke={edge(tone)}
			stroke-width={2 * uik}
			stroke-linecap="round"
			stroke-dasharray={DASHED.has(kind) ? `${6 * uik} ${5 * uik}` : undefined}
		/>
		<path
			d={head(t.a, t.b)}
			fill="none"
			style:stroke={edge(tone)}
			stroke-width={2 * uik}
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		{#if both}
			<path
				d={head(t.b, t.a)}
				fill="none"
				style:stroke={edge(tone)}
				stroke-width={2 * uik}
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{/if}
		{#each dots as d, i (i)}
			<circle
				cx={d.x}
				cy={d.y}
				r={4.5 * uik}
				style:fill={col(tone)}
				style:stroke="var(--dl-scene-pn)"
				stroke-width={1.5 * uik}
				pointer-events="none"
				data-dot
			/>
		{/each}
	</g>
{/if}
