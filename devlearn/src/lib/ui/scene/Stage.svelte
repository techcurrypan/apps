<script lang="ts">
	// 図の枠（learn-standard.md 16.3）。枠の大きさを測って UIK を求め、中身に渡す。
	// 中身は字の大きさ・札の余白・線の太さに uik を掛けて描くので、寄っても引いても画面の上の字は同じ px
	import type { Snippet } from 'svelte';
	import { uikOf } from './label/uik';

	type Props = {
		view: [number, number, number, number];
		label: string;
		zoom?: number;
		children: Snippet<[number]>;
	};
	let { view, label, zoom, children }: Props = $props();
	let bw = $state(0);
	let bh = $state(0);
	const uik = $derived(uikOf(view[2], view[3], bw, bh));
</script>

<div class="stage" bind:clientWidth={bw} bind:clientHeight={bh} data-zoom={zoom} data-uik={uik}>
	<svg viewBox={view.join(' ')} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
		{@render children(uik)}
	</svg>
</div>

<style>
	.stage {
		width: 100%;
		height: 100%;
	}
	svg {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
