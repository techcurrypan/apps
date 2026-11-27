<svelte:options namespace="svg" />

<script lang="ts">
	// 条件の一覧・端末の出力・Events：角の丸い札（明るい・暗い）。行ごとに色を変えられる。x, y は左上。字は uik で画面の上の大きさを保つ（第 17 章 card）
	type Line = string | { text: string; color?: string; op?: number };
	type Props = {
		x: number;
		y: number;
		lines: Line[];
		w?: number;
		lh?: number;
		size?: number;
		dark?: boolean;
		uik?: number;
		op?: number;
	};
	let { x, y, lines, w = 240, lh = 26, size = 14, dark = false, uik = 1, op = 1 }: Props = $props();
	const W = $derived(w * uik);
	const LH = $derived(lh * uik);
	const H = $derived(lines.length * LH + 22 * uik);
	const rows = $derived(lines.map((l) => (typeof l === 'string' ? { text: l } : l)));
</script>

<g opacity={op}>
	<rect x={x + 3 * uik} y={y + 5 * uik} width={W} height={H} rx={12 * uik} class="sh" />
	<rect {x} {y} width={W} height={H} rx={12 * uik} class:dark class="bd" stroke-width={1.6 * uik} />
	{#each rows as r, i (i)}
		<text
			x={x + 14 * uik}
			y={y + 11 * uik + (i + 1) * LH - 7 * uik}
			class:dark
			style:font-size="{size * uik}px"
			style:fill={r.color}
			opacity={r.op ?? 1}
			font-weight="800">{r.text}</text
		>
	{/each}
</g>

<style>
	.sh {
		fill: var(--dl-ink);
		opacity: 0.16;
	}
	.bd {
		fill: var(--dl-card-light);
		stroke: var(--dl-ink);
	}
	.bd.dark {
		fill: var(--dl-card-dark);
		stroke: var(--dl-card-dark-edge);
	}
	text {
		font-family: var(--dl-font-code);
		fill: var(--dl-ink);
	}
	text.dark {
		fill: #d7dae0;
	}
</style>
