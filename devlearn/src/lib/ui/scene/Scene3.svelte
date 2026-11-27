<script lang="ts">
	// 学習画面 第 3 版の図（learn-standard.md 16.1・第 17 章）。ステップの構図から、ある時刻の物を等角の部品で描く。
	// 物の位置・縮尺・透明度は drawList（sceneAt）が (今の構図, 前の構図, 経過時間) だけで決める（CLAUDE.md 第 8 章）
	import type { Snippet } from 'svelte';
	import { NAME_DROP, SELF_NAMED, drawList, type SceneObj } from '../../learn/scene/draw.ts';
	import type { Layout } from '../../learn/scene/layout.ts';
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
		/** 物の上に重ねる物（線・荷物・札）。uik を受け取る */
		over?: Snippet<[number]>;
	};
	let { objs, layout, prev = null, t, reduce = false, label, hl = [], over }: Props = $props();
	const list = $derived(drawList(objs, layout, prev, t, { reduce }));
	const PLAIN = {
		laptop: Laptop,
		func: Func,
		block: Block,
		queue: Queue,
		ring: Ring,
		nic: Nic,
		hex: Hex,
		db: Db,
		platform: Platform
	} as const;
</script>

<Stage view={[0, 0, 1000, 600]} {label}>
	{#snippet children(uik)}
		<Defs />
		{#each list as d (d.id)}
			{@const h = hl.includes(d.id)}
			{#if d.kind === 'pod'}
				<Pod x={d.x} y={d.y} s={d.s} op={d.op} {uik} name={d.name} term={d.term} />
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
				/>
			{:else}
				{@const C = PLAIN[d.kind]}
				<C x={d.x} y={d.y} s={d.s} op={d.op} {uik} hl={h} tone={d.tone} id={d.id} term={d.term} />
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
			{/if}
		{/each}
		{@render over?.(uik)}
	{/snippet}
</Stage>
