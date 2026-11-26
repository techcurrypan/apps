<svelte:options namespace="svg" />

<script lang="ts">
	// 物の下の台（物より一回り大きい、角の丸い淡い床）。選ばれた物は台の色が濃い（LS3-K1）
	import { localProj, ptsStr, rrectPts } from '../iso';
	import { face, type Tone } from './paint';
	type Props = {
		x: number;
		y: number;
		w: number;
		d: number;
		tone?: Tone;
		hl?: boolean;
		uik?: number;
		r?: number;
	};
	let { x, y, w, d, tone = 'gray', hl = false, uik = 1, r = 26 }: Props = $props();
	const pts = $derived(
		rrectPts(-w / 2, -d / 2, w, d, r).map((q) => localProj(x, y).at(q[0], q[1], 0))
	);
</script>

<polygon
	points={ptsStr(pts)}
	style:fill={face(tone, hl ? 20 : 7)}
	style:stroke={face(tone, 50)}
	stroke-width={1.6 * uik}
/>
