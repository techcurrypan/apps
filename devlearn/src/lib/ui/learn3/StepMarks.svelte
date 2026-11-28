<svelte:options namespace="svg" />

<script lang="ts">
	// ステップだけの印（LS3-K6）：説明の札・大きな ×・使う量の棒・札の板（条件の ✓・✗）・待ち時間の帯。
	// どれもステップに入ってからの時刻 t だけで描く（at から出る。繰り返し再生で同じ絵。CLAUDE.md 第 8 章）
	import type { V3Step } from '../../learn/check-v3.ts';
	import { REACH, type SceneObj } from '../../learn/scene/draw.ts';
	import Note from '../scene/label/Note.svelte';
	import Card from '../scene/kit/Card.svelte';
	import Halo from '../scene/label/Halo.svelte';
	import { LABEL_PX } from '../scene/label/uik';
	import { edge, face } from '../scene/kit/paint';

	type Props = { st: V3Step; objs: Record<string, SceneObj>; t: number; uik: number };
	let { st, objs, t, uik }: Props = $props();
	/** at から 0.4 秒で出る */
	const fade = (at = 0) => Math.max(0, Math.min(1, (t - at) / 400));
	const RED = 'var(--dl-obj-red)';
	const GREEN = 'var(--dl-obj-green, #2f9e6a)';
</script>

{#each st.crosses ?? [] as c (c.obj)}
	{@const p = st.layout[c.obj]}
	{#if p && objs[c.obj]}
		{@const r = REACH[objs[c.obj].kind] * (p[2] ?? 1) * 0.62}
		{@const k = Math.max(0, Math.min(1, (t - (c.at ?? 0)) / 500))}
		{#if k > 0}
			<g data-mark="cross" pointer-events="none" opacity="0.9">
				<line
					x1={p[0] - r}
					y1={p[1] - r * 0.6}
					x2={p[0] - r + 2 * r * k}
					y2={p[1] - r * 0.6 + 1.2 * r * k}
					stroke={RED}
					stroke-width={7 * uik}
					stroke-linecap="round"
				/>
				<line
					x1={p[0] + r}
					y1={p[1] - r * 0.6}
					x2={p[0] + r - 2 * r * k}
					y2={p[1] - r * 0.6 + 1.2 * r * k}
					stroke={RED}
					stroke-width={7 * uik}
					stroke-linecap="round"
				/>
			</g>
		{/if}
	{/if}
{/each}

{#each st.meters ?? [] as m (m.obj + m.label)}
	{@const p = st.layout[m.obj]}
	{#if p}
		{@const W = 190 * uik}
		{@const H = 14 * uik}
		{@const top = Math.max(m.val, m.max) * 1.15}
		{@const k = Math.max(0, Math.min(1, (t - (m.at ?? 0)) / 1200))}
		{@const v = m.val * k}
		{@const over = v > m.max}
		{@const x0 = p[0] - W / 2}
		{@const y0 = p[1] + (m.dy ?? -110) * (p[2] ?? 1)}
		<g data-mark="meter" opacity={fade(m.at)} pointer-events="none">
			<Halo
				x={x0}
				y={y0 - 8 * uik}
				text="{m.label} {Math.round(v)} / {m.max} {m.unit}"
				size={LABEL_PX.num}
				{uik}
				weight={800}
				color={over ? RED : 'var(--dl-ink)'}
			/>
			<rect
				x={x0}
				y={y0}
				width={W}
				height={H}
				rx={H / 2}
				style:fill={face('gray', 30)}
				style:stroke={edge('gray')}
				stroke-width={1.2 * uik}
			/>
			<rect
				x={x0}
				y={y0}
				width={(W * v) / top}
				height={H}
				rx={H / 2}
				style:fill={over ? RED : face('orange', 70)}
			/>
			<line
				x1={x0 + (W * m.max) / top}
				x2={x0 + (W * m.max) / top}
				y1={y0 - 5 * uik}
				y2={y0 + H + 5 * uik}
				stroke="var(--dl-ink)"
				stroke-width={2 * uik}
				stroke-dasharray="{3 * uik} {2 * uik}"
			/>
			<Halo
				x={x0 + (W * m.max) / top}
				y={y0 + H + 18 * uik}
				text="上限"
				size={LABEL_PX.line}
				{uik}
				anchor="middle"
			/>
		</g>
	{/if}
{/each}

{#each st.notes ?? [] as n (n.obj + n.text)}
	{@const at = st.layout[n.obj]}
	{#if at}
		<Note
			x={at[0] + (n.dx ?? 0)}
			y={at[1] + (n.dy ?? -80) * (at[2] ?? 1)}
			text={n.text}
			tone={n.tone ?? 'blue'}
			op={fade(n.at)}
			{uik}
		/>
	{/if}
{/each}

{#each st.cards ?? [] as c (c.title)}
	{#if t >= (c.at ?? 0)}
		<g data-mark="card">
			<Card
				x={c.x}
				y={c.y}
				w={c.w ?? 260}
				{uik}
				op={fade(c.at)}
				lines={[
					{ text: c.title },
					...c.rows.map((r, i) => ({
						text: (r.ok === undefined ? '' : r.ok ? '✓ ' : '✗ ') + r.text,
						color: r.ok === undefined ? undefined : r.ok ? GREEN : RED,
						op: fade((c.at ?? 0) + 350 * (i + 1))
					}))
				]}
			/>
		</g>
	{/if}
{/each}

{#if st.band}
	{@const b = st.band}
	{@const every = b.every ?? 700}
	{@const lit = Math.floor((t - (b.at ?? 0)) / every)}
	{@const SW = 64 * uik}
	<g data-mark="band" opacity={fade(b.at)} pointer-events="none">
		<Halo x={b.x} y={b.y + 5 * uik} text={b.label} size={LABEL_PX.num} {uik} weight={800} />
		{#each b.segs as sg, i (i)}
			{@const x = b.x + 110 * uik + i * (SW + 10 * uik)}
			{@const on = i <= lit}
			{@const now = i === Math.min(lit, b.segs.length - 1)}
			<rect
				{x}
				y={b.y - 15 * uik}
				width={SW}
				height={30 * uik}
				rx={9 * uik}
				style:fill={on ? face('orange', now ? 70 : 35) : face('gray', 18)}
				style:stroke={on ? edge('orange') : edge('gray')}
				stroke-width={(now ? 2.4 : 1.2) * uik}
			/>
			<text
				x={x + SW / 2}
				y={b.y + 5 * uik}
				text-anchor="middle"
				font-weight="800"
				style:font-size="{LABEL_PX.num * uik}px"
				style:fill={on ? edge('orange') : 'var(--dl-text-muted)'}>{sg}</text
			>
		{/each}
	</g>
{/if}
