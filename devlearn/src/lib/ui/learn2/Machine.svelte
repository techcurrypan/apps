<script lang="ts">
	// 機械の絵 1 つ（learn-standard.md LS-D2・LS-L8）。形・色の系統・印は src/lib/learn2/iso.ts の一式から。
	import { glyphAt, kindOf, partsOf } from '../../learn2/iso.ts';

	type Props = { icon: string; failed?: boolean; flash?: number; hot?: boolean };
	let { icon, failed = false, flash = 0, hot = false }: Props = $props();
	const k = $derived(kindOf(icon));
	const parts = $derived(partsOf(k.shape));
	const g = $derived(glyphAt(k.shape));

	// 印（前の面に描く。幅・高さ ±9）
	const GLYPH: Record<string, string> = {
		slots: 'M-9,-6h18M-9,-1h18M-9,4h18',
		ports: 'M-8,0h2M-3,0h2M2,0h2M7,0h2',
		rings: 'M-10,-3q10,6 20,0M-10,4q10,6 20,0',
		window: 'M-9,-6h18v12h-18zM-9,-2h18',
		gear: 'M0,-8v3M0,5v3M-8,0h3M5,0h3M-5.5,-5.5l2,2M3.5,3.5l2,2M-5.5,5.5l2,-2M3.5,-3.5l2,-2M-3,0a3,3 0 1,0 6,0a3,3 0 1,0 -6,0',
		shield: 'M0,-8l7,3v4c0,4 -3,7 -7,9c-4,-2 -7,-5 -7,-9v-4z',
		doc: 'M-6,-8h8l4,4v12h-12zM-3,-1h6M-3,3h6',
		person: 'M-3,-5a3,3 0 1,0 6,0a3,3 0 1,0 -6,0M-6,8c0,-6 12,-6 12,0',
		chip: 'M-6,-6h12v12h-12zM-9,-3h3M-9,3h3M6,-3h3M6,3h3',
		queue: 'M-9,-4h5v8h-5zM-2,-4h5v8h-5zM5,-4h4v8h-4z',
		wave: 'M-10,0q2.5,-6 5,0t5,0t5,0t5,0',
		lock: 'M-5,-1h10v8h-10zM-3,-1v-3a3,3 0 0,1 6,0v3',
		eye: 'M-9,0q9,-8 18,0q-9,8 -18,0zM-2,0a2,2 0 1,0 4,0a2,2 0 1,0 -4,0',
		arrow: 'M-9,0h16M3,-4l4,4l-4,4',
		grid: 'M-7,-7h6v6h-6zM1,-7h6v6h-6zM-7,1h6v6h-6zM1,1h6v6h-6z',
		dot: 'M-4,0a4,4 0 1,0 8,0a4,4 0 1,0 -8,0',
		brain: 'M-7,0c0,-6 6,-8 7,-4c1,-4 7,-2 7,4c0,5 -6,7 -7,3c-1,4 -7,2 -7,-3zM0,-4v8',
		chart: 'M-8,6v-4M-3,6v-9M2,6v-6M7,6v-12',
		cloud: 'M-8,4a4,4 0 0,1 2,-8a5,5 0 0,1 9,-1a4,4 0 0,1 5,9z',
		clock: 'M-8,0a8,8 0 1,0 16,0a8,8 0 1,0 -16,0M0,-5v5l4,2',
		key: 'M-8,0a4,4 0 1,0 8,0a4,4 0 1,0 -8,0M0,0h9M6,0v3',
		book: 'M-8,-6h7v12h-7zM1,-6h7v12h-7z',
		scale: 'M0,-8v14M-8,-4h16M-8,-4l-3,6h6zM8,-4l-3,6h6z',
		tag: 'M-8,-5h10l6,5l-6,5h-10zM-5,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0'
	};
</script>

<g class="mach fam{k.family}" class:failed class:hot>
	<ellipse class="shadow" cx="0" cy="34" rx="56" ry="16" />
	{#each parts as p, i (i)}
		{#if 'faces' in p}
			<polygon class="left" points={p.faces.left} />
			<polygon class="right" points={p.faces.right} />
			<polygon class="top" points={p.faces.top} />
		{:else}
			{@const c = p.cyl}
			<path
				class="left"
				d="M{-c.rx},{-c.z0 - c.h} V{-c.z0} A{c.rx},{c.ry} 0 0,0 {c.rx},{-c.z0} V{-c.z0 - c.h} Z"
			/>
			<ellipse class="top" cx="0" cy={-c.z0 - c.h} rx={c.rx} ry={c.ry} />
		{/if}
	{/each}
	<path class="glyph" d={GLYPH[k.glyph] ?? GLYPH.dot} transform="translate({g[0]},{g[1]})" />
	{#if flash > 0}
		<ellipse class="flash" cx="0" cy="-10" rx="62" ry="52" style:opacity={flash * 0.55} />
	{/if}
</g>

<style>
	.mach .shadow {
		fill: var(--dl-text);
		opacity: 0.12;
	}
	.mach polygon,
	.mach path,
	.mach ellipse:not(.shadow):not(.flash) {
		stroke: color-mix(in oklab, var(--dl-text) 35%, transparent);
		stroke-width: 1;
		stroke-linejoin: round;
	}
	.fam1 {
		--m: var(--dl-kind-1-fg);
	}
	.fam2 {
		--m: var(--dl-kind-2-fg);
	}
	.fam3 {
		--m: var(--dl-kind-3-fg);
	}
	.fam4 {
		--m: var(--dl-kind-4-fg);
	}
	.fam5 {
		--m: var(--dl-kind-5-fg);
	}
	/* 光は左上から：上の面が明るく、右の面が暗い */
	.top {
		fill: color-mix(in oklab, var(--m) 45%, var(--dl-surface-raised));
	}
	.left {
		fill: color-mix(in oklab, var(--m) 72%, var(--dl-surface));
	}
	.right {
		fill: color-mix(in oklab, var(--m) 88%, black);
	}
	.mach .glyph {
		fill: none;
		stroke: var(--dl-surface-raised);
		stroke-width: 1.8;
		stroke-linecap: round;
	}
	.failed .top,
	.failed .left,
	.failed .right {
		--m: var(--dl-wrong);
	}
	.flash {
		fill: var(--dl-wrong);
	}
	.hot .shadow {
		opacity: 0.22;
	}
</style>
