<svelte:options namespace="svg" />

<script lang="ts">
	// リスト・配列・バッファ：角の丸い長い台と、マスの立方体（値が上に）。空きの席は点線。新しいマスは青（第 17 章 list）
	import { localProj, prism, ptsStr, rectPts, rrectPts } from '../iso';
	import Halo from '../label/Halo.svelte';
	import Base from './Base.svelte';
	import Solid from './Solid.svelte';
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
		vals: string[];
		cap?: number;
		newIdx?: number;
		freed?: boolean;
		/** 描かない残りの席の数（「＋more 席」の札） */
		more?: number;
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
		term = 'list',
		vals,
		cap,
		newIdx = -1,
		freed = false,
		more = 0
	}: Props = $props();
	const n = $derived(Math.max(1, cap ?? vals.length));
	const Lc = $derived(n * 44);
	const P = $derived(localProj(x, y, s));
	const tone = $derived(freed ? 'red' : hl ? 'blue' : 'gray');
	const base = $derived(prism(rrectPts(-Lc / 2 - 14, -34, Lc + 28, 68, 18), 0, 12, P));
	const cells = $derived(
		Array.from({ length: n }, (_, i) => {
			const cx = -Lc / 2 + 22 + i * 44;
			const used = i < vals.length;
			return {
				i,
				used,
				cube: used ? prism(rrectPts(cx - 17, -17, 34, 34, 7, 3), 12, 26, P) : null,
				empty: used ? '' : ptsStr(rectPts(cx - 15, -15, 30, 30).map((q) => P.at(q[0], q[1], 12))),
				top: P.at(cx, 0, 38)
			};
		})
	);
	/** 「＋more 席」の札：台の右の端の先 */
	const moreAt = $derived(P.at(Lc / 2 + 30, 0, 12));
</script>

<Base {x} {y} {s} {uik} w={Lc + 28} d={68} {tone} {hl} {lift} {op} {id} {term}>
	<Solid
		g={base}
		{tone}
		top={hl ? 16 : 8}
		{uik}
		dash={freed ? `${6 * uik} ${5 * uik}` : undefined}
	/>
	{#each cells as c (c.i)}
		{#if c.cube}
			<Solid g={c.cube} tone={c.i === newIdx ? 'blue' : 'yellow'} top={34} {uik} shadow={false} />
			<Halo
				x={c.top[0]}
				y={c.top[1] + 6 * uik}
				text={vals[c.i]}
				size={15}
				{uik}
				weight={800}
				anchor="middle"
				mono
			/>
		{:else}
			<polygon
				points={c.empty}
				fill="none"
				style:stroke="var(--dl-text-muted)"
				stroke-width={1.2 * uik}
				stroke-dasharray="{4 * uik} {3 * uik}"
			/>
		{/if}
	{/each}
	{#if more > 0}
		<Halo
			x={moreAt[0]}
			y={moreAt[1] + 5 * uik}
			text="＋{more} 席"
			size={14}
			{uik}
			weight={800}
			mono
		/>
	{/if}
</Base>
