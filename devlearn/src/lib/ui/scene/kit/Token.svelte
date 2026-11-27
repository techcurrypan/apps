<svelte:options namespace="svg" />

<script lang="ts">
	// 荷物・メッセージ：角の丸い等角の小箱。上に名前（12.5px・物の色の濃い色・白い縁取り）。種類の色（データ＝青・写し＝紫・ACK＝緑・落ちた＝赤。LS3-K5）
	import { localProj, prism, rrectPts } from '../iso';
	import Halo from '../label/Halo.svelte';
	import Solid from './Solid.svelte';
	import { TOKEN, edge, type Tone } from './paint';
	type Props = {
		x: number;
		y: number;
		label?: string;
		kind?: keyof typeof TOKEN;
		tone?: Tone;
		w?: number;
		scale?: number;
		uik?: number;
		op?: number;
		/** 名前と箱の上の間（図の単位。縮尺 1 の時） */
		gap?: number;
	};
	let {
		x,
		y,
		label,
		kind = 'data',
		tone,
		w = 44,
		scale = 1,
		uik = 1,
		op = 1,
		gap = 13
	}: Props = $props();
	const t = $derived(tone ?? TOKEN[kind]);
	const ww = $derived(w * 0.7 * scale);
	const hh = $derived(24 * scale);
	const body = $derived(
		prism(rrectPts(-ww / 2, -ww / 2, ww, ww, ww * 0.22, 3), 0, hh, localProj(x, y + hh * 0.6, 1))
	);
</script>

<g opacity={op} data-packet>
	<Solid g={body} tone={t} top={45} {uik} shadow={false} />
	{#if label}
		<Halo
			{x}
			y={y - hh * 0.55 - gap * uik}
			text={label}
			size={13}
			{uik}
			weight={800}
			anchor="middle"
			mono
			color={edge(t)}
		/>
	{/if}
</g>
