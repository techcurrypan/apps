<script lang="ts">
	// 思い出す の図（learn-standard.md 第 19 章：問いに合わせた図。図を押す問いは押せる物を光らせる）。
	// 題ごとの置き場：TCP は送信キュー・再送キュー・qdisc・NIC、k8s は入口・帳簿・係・ノード。
	// 押すと親に知らせる。答えた後は正しい物を緑で囲む
	import type { Recall3 } from '../../learn/recall3.ts';
	import Block from '../scene/kit/Block.svelte';
	import Db from '../scene/kit/Db.svelte';
	import Defs from '../scene/kit/Defs.svelte';
	import Hex from '../scene/kit/Hex.svelte';
	import Nic from '../scene/kit/Nic.svelte';
	import Platform from '../scene/kit/Platform.svelte';
	import Pod from '../scene/kit/Pod.svelte';
	import Queue from '../scene/kit/Queue.svelte';
	import Wire from '../scene/kit/Wire.svelte';
	import Note from '../scene/label/Note.svelte';
	import Tag from '../scene/label/Tag.svelte';
	import Stage from '../scene/Stage.svelte';

	type Props = {
		q: Recall3 | undefined;
		answered: boolean;
		t: number;
		onhit: (id: string) => void;
		/** 図の題（LearnV3 の lab と同じ） */
		set?: 'tcp' | 'k8s';
	};
	let { q, answered, t, onhit, set = 'tcp' }: Props = $props();
	type Obj = { id: string; name: string; x: number; y: number; k: string; drop: number };
	const SETS: Record<'tcp' | 'k8s', { objs: Obj[]; wires: [string, string][]; label: string }> = {
		tcp: {
			label: '送信キュー・再送キュー・qdisc・NIC',
			objs: [
				{ id: 'wq', name: '送信キュー', x: 190, y: 220, k: 'queue', drop: 92 },
				{ id: 'rtx', name: '再送キュー', x: 190, y: 430, k: 'queue', drop: 92 },
				{ id: 'fq', name: 'qdisc（fq）', x: 505, y: 300, k: 'queue', drop: 92 },
				{ id: 'nic', name: 'NIC', x: 830, y: 300, k: 'nic', drop: 92 }
			],
			wires: [
				['wq', 'fq'],
				['fq', 'nic'],
				['wq', 'rtx']
			]
		},
		k8s: {
			label: '入口・帳簿・数を合わせる係・ノード',
			objs: [
				{ id: 'api', name: 'kube-apiserver', x: 480, y: 170, k: 'hex', drop: 92 },
				{ id: 'etcd', name: 'etcd', x: 170, y: 330, k: 'db', drop: 92 },
				{ id: 'ctrl', name: 'controller-manager', x: 820, y: 220, k: 'block', drop: 84 },
				{ id: 'n2', name: 'node-2', x: 560, y: 450, k: 'platform', drop: 110 }
			],
			wires: [
				['api', 'etcd'],
				['api', 'ctrl'],
				['api', 'n2']
			]
		}
	};
	const S = $derived(SETS[set]);
	const at = (id: string) => S.objs.find((o) => o.id === id) ?? S.objs[0];
	const hits = $derived(q?.k === 'hit' ? q.hits : []);
	const ans = $derived(q?.k === 'hit' && answered ? q.ans : null);
	/** 光る輪の脈（1.6 秒で 1 回） */
	const pulse = $derived(0.5 + 0.5 * Math.sin((t / 1600) * Math.PI * 2));
</script>

<Stage view={[0, 0, 1000, 600]} label="思い出す の図：{S.label}">
	{#snippet children(uik: number)}
		<Defs />
		{#each S.wires as [a, b], i (a + b)}
			<Wire
				a={at(a)}
				b={at(b)}
				ia={110}
				ib={110}
				p={i === S.wires.length - 1 && set === 'tcp' ? null : ((t + i * 900) % 1800) / 1800}
				{uik}
			/>
		{/each}
		{#each S.objs as o (o.id)}
			{@const can = hits.includes(o.id) && !answered}
			{@const right = ans === o.id}
			<g
				data-obj={o.id}
				role="button"
				tabindex={can ? 0 : -1}
				aria-disabled={!can}
				aria-label="{o.name}を答えにする"
				class:can
				onclick={() => can && onhit(o.id)}
				onkeydown={(e) => {
					if (can && (e.key === 'Enter' || e.key === ' ')) {
						e.preventDefault();
						onhit(o.id);
					}
				}}
			>
				{#if can || right}
					<ellipse
						cx={o.x}
						cy={o.y + 10}
						rx={128}
						ry={68}
						fill="none"
						style:stroke={right ? 'var(--dl-obj-green)' : 'var(--dl-obj-blue)'}
						stroke-width={(right ? 5 : 3) * uik}
						opacity={right ? 1 : 0.35 + 0.55 * pulse}
					/>
				{/if}
				{#if o.k === 'nic'}
					<Nic x={o.x} y={o.y} s={0.8} hl={right} {uik} />
				{:else if o.k === 'hex'}
					<Hex x={o.x} y={o.y} s={0.8} glyph="⇄" hl={right} {uik} />
				{:else if o.k === 'db'}
					<Db x={o.x} y={o.y} s={0.8} hl={right} {uik} />
				{:else if o.k === 'block'}
					<Block x={o.x} y={o.y} s={0.8} glyph="↻" hl={right} {uik} />
				{:else if o.k === 'platform'}
					<Platform x={o.x} y={o.y} s={0.8} hl={right} {uik} />
					<Pod x={o.x - 40} y={o.y - 14} s={0.6} name="web-a" {uik} />
					<Pod x={o.x + 50} y={o.y + 10} s={0.6} name="web-b" {uik} />
				{:else}
					<Queue
						x={o.x}
						y={o.y}
						s={0.8}
						tone={o.id === 'fq' ? 'teal' : 'blue'}
						items={o.id === 'rtx' ? ['A1'] : o.id === 'wq' ? ['A2', 'A3'] : []}
						hl={right}
						{uik}
					/>
				{/if}
				<Tag x={o.x} y={o.y + o.drop} text={o.name} {uik} />
			</g>
		{/each}
		{#if q?.k === 'hit' && !answered}
			<Note x={500} y={70} text="光っている物を押す" tone="blue" center {uik} />
		{/if}
	{/snippet}
</Stage>

<style>
	.can {
		cursor: pointer;
	}
	.can:focus-visible {
		outline: none;
	}
	.can:focus-visible ellipse {
		stroke-width: 6;
	}
</style>
