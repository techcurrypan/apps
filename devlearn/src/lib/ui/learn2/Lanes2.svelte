<script lang="ts">
	// 表し方「時系列」（learn-standard.md LS-D10）。荷物の合図を、レーン（機械・関数の箱）の間の矢印で並べる。番号を押すとそのステップへ。
	import type { Lesson } from '../../lesson/types.ts';

	type Props = {
		lesson: Lesson;
		step: number;
		label: (id: string) => string;
		ongo: (n: number) => void;
	};
	let { lesson, step, label, ongo }: Props = $props();

	const lanes = $derived.by(() => {
		const out: string[] = [];
		for (const s of lesson.explain)
			for (const c of s.motion ?? [])
				if (c.do.op === 'packet')
					for (const id of [c.do.a, c.do.b]) if (!out.includes(id)) out.push(id);
		return out.slice(0, 9);
	});
	const rows = $derived(
		lesson.explain.flatMap((s, i) =>
			(s.motion ?? [])
				.filter((c) => c.do.op === 'packet')
				.map((c) => ({ n: i + 1, d: c.do as Extract<typeof c.do, { op: 'packet' }> }))
				.filter((r) => lanes.includes(r.d.a) && lanes.includes(r.d.b))
		)
	);
	const W = $derived(Math.max(640, lanes.length * 150));
	const x = (id: string) => 90 + lanes.indexOf(id) * ((W - 140) / Math.max(1, lanes.length - 1));
	const H = $derived(80 + rows.length * 34);
</script>

<svg class="lanes" viewBox="0 0 {W} {H}" role="img" aria-label="時系列：機械の間の荷物の行き来">
	{#each lanes as id (id)}
		<line x1={x(id)} y1="44" x2={x(id)} y2={H - 10} class="lane" />
		<text x={x(id)} y="30" text-anchor="middle" class="ln">{label(id)}</text>
	{/each}
	{#each rows as r, i (i)}
		{@const y = 64 + i * 34}
		<g
			class="row"
			class:now={r.n === step}
			role="button"
			tabindex="0"
			onclick={() => ongo(r.n)}
			onkeydown={(e) => e.key === 'Enter' && ongo(r.n)}
		>
			<circle cx="30" cy={y} r="13" />
			<text x="30" y={y + 5} text-anchor="middle" class="no">{r.n}</text>
			<line x1={x(r.d.a)} y1={y} x2={x(r.d.b)} y2={y} class="arr" class:drop={r.d.drop} />
			<text x={(x(r.d.a) + x(r.d.b)) / 2} y={y - 6} text-anchor="middle" class="pl"
				>{r.d.label}</text
			>
		</g>
	{/each}
</svg>

<style>
	.lanes {
		width: 100%;
		height: 100%;
		font-family: var(--dl-font);
	}
	text {
		fill: var(--dl-text);
		font-size: 15px;
	}
	.lane {
		stroke: var(--dl-border-strong);
		stroke-dasharray: 4 4;
	}
	.ln {
		font-weight: 700;
	}
	.row {
		cursor: pointer;
	}
	.row circle {
		fill: var(--dl-surface-raised);
		stroke: var(--dl-border-strong);
	}
	.row.now circle {
		stroke: var(--dl-now);
		stroke-width: 3;
	}
	.arr {
		stroke: var(--dl-kind-1-fg);
		stroke-width: 2.5;
	}
	.arr.drop {
		stroke: var(--dl-wrong);
		stroke-dasharray: 6 4;
	}
	.pl {
		font-family: var(--dl-font-code);
		fill: var(--dl-text-muted);
	}
	.no {
		font-weight: 700;
	}
</style>
