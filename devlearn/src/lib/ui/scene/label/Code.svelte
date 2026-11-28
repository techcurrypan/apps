<svelte:options namespace="svg" />

<script lang="ts">
	// コードの札（見せ方の型 memory。learn-standard.md 第 17 章 card の暗い札）：左の 0〜CODE_W に、ファイル名・行の番号・行。
	// 今の行（cur）は 1.6 秒ごとに順に光り、済んだ行は明るく、まだの行は薄い。下に画面の出力。字は uik で画面の上の大きさを保つ
	import { CODE_W } from '../../../learn/check-v3.ts';
	type Props = {
		file: string;
		lines: string[];
		cur: number[];
		done?: number[];
		out?: string[];
		/** ステップに入ってからの時間（ms） */
		t: number;
		uik?: number;
	};
	let { file, lines, cur, done = [], out = [], t, uik = 1 }: Props = $props();
	const X = 14;
	const Y = 20;
	const W = CODE_W - 28;
	const H = 560;
	const rows = $derived(lines.length + (out.length ? out.length + 1 : 0));
	/** 行の高さ：画面の上で 26px を目安に、札に収まるまで縮める（字は 12px 以上を保つ） */
	const lh = $derived(Math.min(30 * uik, (H - 56 * uik) / Math.max(1, rows)));
	const size = $derived(Math.max(12 * uik, Math.min(14 * uik, lh * 0.56)));
	const PER = 1600;
	const k = $derived(Math.min(cur.length - 1, Math.floor(t / PER)));
	const now = $derived(cur[k]);
	/** 光った後の今の行は「済んだ」に数える */
	const past = $derived(new Set([...done, ...cur.slice(0, k)]));
	const yOf = (i: number) => Y + 44 * uik + (i + 1) * lh - lh * 0.3;
</script>

<g data-l3-code pointer-events="none">
	<rect x={X + 3 * uik} y={Y + 5 * uik} width={W} height={H} rx={14 * uik} class="sh" />
	<rect x={X} y={Y} width={W} height={H} rx={14 * uik} class="bd" stroke-width={1.6 * uik} />
	<text x={X + 16 * uik} y={Y + 26 * uik} class="file" style:font-size="{12.5 * uik}px">{file}</text
	>
	{#each lines as ln, i (i)}
		{@const n = i + 1}
		{#if n === now}
			<rect
				x={X + 6 * uik}
				y={yOf(i) - lh * 0.72}
				width={W - 12 * uik}
				height={lh * 0.94}
				rx={6 * uik}
				class="cur"
				stroke-width={1.5 * uik}
				data-l3-curline={n}
			/>
		{/if}
		<text x={X + 30 * uik} y={yOf(i)} class="no" text-anchor="end" style:font-size="{size * 0.86}px"
			>{n}</text
		>
		<text
			x={X + 40 * uik}
			y={yOf(i)}
			class="ln"
			class:on={n === now}
			class:past={past.has(n)}
			style:font-size="{size}px"
			xml:space="preserve">{ln}</text
		>
	{/each}
	{#if out.length}
		<text x={X + 16 * uik} y={yOf(lines.length)} class="file" style:font-size="{12 * uik}px"
			>画面の出力</text
		>
		{#each out as o, j (j)}
			<text x={X + 40 * uik} y={yOf(lines.length + 1 + j)} class="out" style:font-size="{size}px"
				>{o}</text
			>
		{/each}
	{/if}
</g>

<style>
	.sh {
		fill: var(--dl-ink);
		opacity: 0.16;
	}
	.bd {
		fill: var(--dl-card-dark);
		stroke: var(--dl-card-dark-edge);
	}
	text {
		font-family: var(--dl-font-code);
	}
	.file {
		fill: #8a93a3;
		font-weight: 700;
	}
	.no {
		fill: #5f6775;
	}
	.ln {
		fill: #8a93a3;
	}
	.ln.past {
		fill: #c9d1dc;
	}
	.ln.on {
		fill: #fff;
		font-weight: 800;
	}
	.cur {
		fill: rgba(217, 162, 27, 0.22);
		stroke: var(--dl-obj-yellow);
	}
	.out {
		fill: #7fd8a4;
		font-weight: 700;
	}
</style>
