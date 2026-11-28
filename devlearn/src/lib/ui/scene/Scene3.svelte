<script lang="ts">
	// 学習画面 第 3 版の図（learn-standard.md 16.1・第 17 章）。ステップの構図から、ある時刻の物を等角の部品で描く。
	// 物の位置・縮尺・透明度は drawList（sceneAt）が (今の構図, 前の構図, 経過時間) だけで決める（CLAUDE.md 第 8 章）
	import type { Snippet } from 'svelte';
	import {
		NAME_DROP,
		REACH,
		SELF_NAMED,
		drawList,
		isFloor,
		type Drawn,
		type SceneObj
	} from '../../learn/scene/draw.ts';
	import { rectReach, type WireKind } from '../../learn/scene/wire.ts';
	import Wire from './kit/Wire.svelte';
	import type { Layout } from '../../learn/scene/layout.ts';
	import { pulseAt } from '../../learn/player.ts';
	import type { ListState } from '../../learn/check-v3.ts';
	import List from './kit/List.svelte';
	import Panel from './kit/Panel.svelte';
	import ChartBody from './kit/ChartBody.svelte';
	import type { ChartSpec } from '../../learn/scene/chart.ts';
	import Stage from './Stage.svelte';
	import Block from './kit/Block.svelte';
	import Db from './kit/Db.svelte';
	import Defs from './kit/Defs.svelte';
	import Frame from './kit/Frame.svelte';
	import Func from './kit/Func.svelte';
	import Hex from './kit/Hex.svelte';
	import Laptop from './kit/Laptop.svelte';
	import Nic from './kit/Nic.svelte';
	import Platform from './kit/Platform.svelte';
	import Pod from './kit/Pod.svelte';
	import Queue from './kit/Queue.svelte';
	import Ring from './kit/Ring.svelte';
	import Var from './kit/Var.svelte';
	import Tag from './label/Tag.svelte';
	import Halo from './label/Halo.svelte';
	import { LABEL_PX } from './label/uik';
	import Tip from './label/Tip.svelte';
	import type { Term } from '../../learn/terms.ts';
	import { VAR_TONE, type PodState } from './kit/paint.ts';
	import { localRect, placeTip } from '../../learn/scene/tip.ts';

	type Props = {
		objs: Record<string, SceneObj>;
		layout: Layout;
		prev?: Layout | null;
		/** ステップに入ってからの時間（ms） */
		t: number;
		reduce?: boolean;
		label: string;
		/** 主役（台の色を濃くする） */
		hl?: string[];
		/** 物と物を結ぶ線（両端の物と一緒に動く。LS3-S5・K4） */
		links?: { from: string; to: string; kind?: WireKind; both?: boolean }[];
		/** 線の点の周の位置（player.ts の flowAt）。null は点を出さない */
		flow?: number | null;
		/** 物の上に重ねる物（線・荷物・札）。uik を受け取る */
		over?: Snippet<[number]>;
		/** 吹き出しに出す言葉（data-term の ID で引く。LS3-H1） */
		terms?: readonly Term[];
		/** Pod の状態（物の ID → ready・dead・paper など。無ければ ready） */
		pods?: Record<string, PodState>;
		/** 黙ったノード（灰の点線の台） */
		down?: string[];
		/** リストの中身（物の ID → 値・席の数・今足したマス） */
		lists?: Record<string, ListState>;
		/** 段の中身（見せ方の型 chart） */
		charts?: Record<string, ChartSpec>;
		/** キューの溝の荷物（物の ID → 名前） */
		queues?: Record<string, string[]>;
		/** 名前の札の下の一言（このステップだけ。無ければ物の desc） */
		subs?: Record<string, string>;
	};
	let {
		objs,
		layout,
		prev = null,
		t,
		reduce = false,
		label,
		hl = [],
		links = [],
		flow = null,
		over,
		terms = [],
		pods = {},
		down = [],
		lists = {},
		charts = {},
		queues = {},
		subs = {}
	}: Props = $props();
	// 乗せた物（浮き上がり 8。LS3-M4）と吹き出し（LS3-H1）。Tab で移った時も同じ（U-10）
	const LIFT = 8;
	let wrap = $state<HTMLDivElement>();
	let hover = $state<{ obj: string | null; term: string; anchor: DOMRect } | null>(null);
	let tipSize = $state({ w: 200, h: 60 });
	const termOf = $derived(new Map(terms.map((x) => [x.id, x])));
	const tipTerm = $derived(hover ? termOf.get(hover.term) : undefined);
	const tipAt = $derived.by(() => {
		if (!hover || !wrap) return null;
		const box = wrap.getBoundingClientRect();
		return placeTip(localRect(hover.anchor, box), tipSize, { w: box.width, h: box.height });
	});
	function pick(e: Event) {
		const el = (e.target as Element | null)?.closest?.('[data-term]');
		const term = el?.getAttribute('data-term');
		if (!el || !term) return void (hover = null);
		const obj = el.closest('[data-obj]')?.getAttribute('data-obj') ?? null;
		hover = { obj, term, anchor: el.getBoundingClientRect() };
	}
	const lift = (id: string) => (hover?.obj === id ? LIFT : 0);
	/** 線を物の外枠の手前で止める長さ。段（panel）は四角の辺（下は厚み 20 の分だけ下げる）で止める */
	const reach = (d: Drawn, o: Drawn) =>
		d.kind === 'panel'
			? rectReach(((d.w ?? 940) * d.s) / 2, ((d.h ?? 160) * d.s) / 2 + 12, o.x - d.x, o.y - d.y) + 8
			: REACH[d.kind] * d.s;
	const list = $derived(drawList(objs, layout, prev, t, { reduce }));
	const byId = $derived(new Map(list.map((d) => [d.id, d])));
	const pulse = $derived(pulseAt(t, { reduce }));
	const GLYPHED = { func: Func, block: Block, hex: Hex } as const;
	const PLAIN = {
		laptop: Laptop,
		queue: Queue,
		ring: Ring,
		nic: Nic,
		db: Db,
		platform: Platform
	} as const;
</script>

<div
	class="s3"
	bind:this={wrap}
	role="presentation"
	onpointerover={pick}
	onfocusin={pick}
	onpointerleave={() => (hover = null)}
	onfocusout={() => (hover = null)}
>
	<Stage view={[0, 0, 1000, 600]} {label}>
		{#snippet children(uik)}
			<Defs />
			{#each links.filter((l) => l.kind !== 'ref') as ln (ln.from + '>' + ln.to)}
				{@const a = byId.get(ln.from)}
				{@const b = byId.get(ln.to)}
				{#if a && b}
					<Wire
						{a}
						{b}
						ia={reach(a, b)}
						ib={reach(b, a)}
						kind={ln.kind}
						both={ln.both}
						p={flow}
						{uik}
						op={Math.min(a.op, b.op)}
					/>
				{/if}
			{/each}
			<!-- 主役の物の下で広がる輪（留まっている間も動く。LS3-M1・試作の pulse） -->
			{#if pulse}
				{#each hl as id (id)}
					{@const d = byId.get(id)}
					{#if d && d.op >= 0.5 && d.kind !== 'pod' && d.kind !== 'panel'}
						{@const r = (64 + 40 * pulse.k) * d.s}
						<ellipse
							data-pulse={id}
							pointer-events="none"
							cx={d.x}
							cy={d.y}
							rx={r * 1.6}
							ry={r * 0.8}
							fill="none"
							style:stroke="var(--dl-obj-blue)"
							stroke-width={2.4 * uik}
							opacity={pulse.op}
						/>
					{/if}
				{/each}
			{/if}
			{#snippet one(d: Drawn)}
				{@const h = hl.includes(d.id)}
				{#if d.kind === 'pod'}
					<Pod
						x={d.x}
						y={d.y}
						s={d.s}
						op={d.op}
						state={pods[d.id] ?? 'ready'}
						{uik}
						name={d.name}
						term={d.term}
						id={d.id}
						lift={lift(d.id)}
					/>
				{:else if d.kind === 'frame'}
					<Frame
						x={d.x}
						y={d.y}
						s={d.s}
						op={d.op}
						{uik}
						name={d.name}
						current={h}
						id={d.id}
						term={d.term}
						lift={lift(d.id)}
					/>
				{:else if d.kind === 'var'}
					<Var
						x={d.x}
						y={d.y}
						s={d.s}
						op={d.op}
						{uik}
						name={d.name}
						tone={d.tone}
						id={d.id}
						term={d.term}
						lift={lift(d.id)}
					/>
				{:else if d.kind === 'func' || d.kind === 'block' || d.kind === 'hex'}
					{@const G = GLYPHED[d.kind]}
					<G
						x={d.x}
						y={d.y}
						s={d.s}
						op={d.op}
						{uik}
						hl={h}
						tone={d.tone}
						glyph={d.glyph}
						id={d.id}
						term={d.term}
						lift={lift(d.id)}
					/>
				{:else if d.kind === 'list'}
					{@const ls = lists[d.id]}
					<List
						x={d.x}
						y={d.y}
						s={d.s}
						op={d.op}
						{uik}
						hl={h}
						vals={ls?.vals ?? []}
						cap={ls?.cap}
						newIdx={ls?.newIdx}
						freed={ls?.freed}
						more={ls?.more}
						id={d.id}
						term={d.term}
						lift={lift(d.id)}
					/>
				{:else if d.kind === 'panel'}
					{@const w = (d.w ?? 940) * d.s}
					{@const hh = (d.h ?? 160) * d.s}
					{@const spec = charts[d.id]}
					<Panel
						x={d.x - w / 2}
						y={d.y - hh / 2}
						{w}
						h={hh}
						{uik}
						tone={d.tone}
						title={d.name}
						hl={h}
						lift={lift(d.id)}
						op={d.op}
						id={d.id}
						term={d.term}
					>
						{#if spec}
							<ChartBody
								{spec}
								box={{ x: d.x - w / 2, y: d.y - hh / 2, w, h: hh }}
								{t}
								{uik}
								tone={d.tone}
							/>
						{/if}
					</Panel>
				{:else if d.kind === 'platform'}
					<Platform
						x={d.x}
						y={d.y}
						s={d.s}
						op={d.op}
						{uik}
						hl={h}
						tone={d.tone}
						id={d.id}
						term={d.term}
						lift={lift(d.id)}
						down={down.includes(d.id)}
					/>
				{:else if d.kind === 'queue'}
					<Queue
						x={d.x}
						y={d.y}
						s={d.s}
						op={d.op}
						{uik}
						hl={h}
						tone={d.tone}
						id={d.id}
						term={d.term}
						lift={lift(d.id)}
						items={queues[d.id] ?? []}
					/>
				{:else}
					{@const C = PLAIN[d.kind]}
					<C
						x={d.x}
						y={d.y}
						s={d.s}
						op={d.op}
						{uik}
						hl={h}
						tone={d.tone}
						id={d.id}
						term={d.term}
						lift={lift(d.id)}
					/>
				{/if}
				{#if !SELF_NAMED.has(d.kind)}
					<Tag
						x={d.x}
						y={d.y + NAME_DROP[d.kind] * d.s}
						text={d.name}
						{uik}
						op={d.op}
						term={d.term}
					/>
					{@const sub = subs[d.id] ?? d.desc}
					{#if sub}
						<Halo
							x={d.x}
							y={d.y + NAME_DROP[d.kind] * d.s + 30 * uik}
							text={sub}
							size={LABEL_PX.sub}
							{uik}
							anchor="middle"
							color="var(--dl-text-muted)"
							op={d.op}
						/>
					{/if}
				{/if}
			{/snippet}
			<!-- 床（台・フレームの板）→ 参照の矢印（板に隠れない）→ 上に乗る物 -->
			{#each list.filter((d) => isFloor(d.kind)) as d (d.id)}
				{@render one(d)}
			{/each}
			{#each links.filter((l) => l.kind === 'ref') as ln (ln.from + '>' + ln.to)}
				{@const a = byId.get(ln.from)}
				{@const b = byId.get(ln.to)}
				{#if a && b}
					<Wire
						color={a.tone ?? VAR_TONE[a.name] ?? 'yellow'}
						{a}
						{b}
						ia={reach(a, b)}
						ib={reach(b, a)}
						kind={ln.kind}
						both={ln.both}
						p={flow}
						{uik}
						op={Math.min(a.op, b.op)}
					/>
				{/if}
			{/each}
			{#each list.filter((d) => !isFloor(d.kind)) as d (d.id)}
				{@render one(d)}
			{/each}
			<!-- 主役の段（panel）は外枠の輪が広がる（板の下の輪は見えないので上に描く。LS3-M1） -->
			{#if pulse}
				{#each hl as id (id)}
					{@const d = byId.get(id)}
					{#if d && d.op >= 0.5 && d.kind === 'panel'}
						{@const w = (d.w ?? 940) * d.s}
						{@const hh = (d.h ?? 160) * d.s}
						{@const g = 4 + 14 * pulse.k}
						<rect
							data-pulse={id}
							pointer-events="none"
							x={d.x - w / 2 - g}
							y={d.y - hh / 2 - g}
							width={w + g * 2}
							height={hh + 20 + g * 2}
							rx={18 + g}
							fill="none"
							style:stroke="var(--dl-obj-blue)"
							stroke-width={2.4 * uik}
							opacity={pulse.op}
						/>
					{/if}
				{/each}
			{/if}
			{@render over?.(uik)}
		{/snippet}
	</Stage>
	{#if tipTerm && tipAt}
		<Tip term={tipTerm} left={tipAt.left} top={tipAt.top} onsize={(w, h) => (tipSize = { w, h })} />
	{/if}
</div>

<style>
	.s3 {
		position: relative;
		width: 100%;
		height: 100%;
	}
</style>
