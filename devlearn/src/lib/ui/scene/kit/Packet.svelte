<svelte:options namespace="svg" />

<script lang="ts">
	// 線の上のパケット：名前の無い小さな角の丸い小箱（第 17 章 packet）
	import { localProj, prism, rrectPts } from '../iso';
	import Solid from './Solid.svelte';
	import { TOKEN, type Tone } from './paint';
	type Props = {
		x: number;
		y: number;
		kind?: keyof typeof TOKEN;
		tone?: Tone;
		uik?: number;
		op?: number;
	};
	let { x, y, kind = 'data', tone, uik = 1, op = 1 }: Props = $props();
	const body = $derived(prism(rrectPts(-8, -8, 16, 16, 4, 2), 0, 12, localProj(x, y + 6, 1)));
</script>

<g opacity={op} pointer-events="none">
	<Solid g={body} tone={tone ?? TOKEN[kind]} top={50} {uik} shadow={false} />
</g>
