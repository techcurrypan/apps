<script lang="ts">
	// 思い出す の図（learn-standard.md 第 19 章：問いに合わせた図。図を押す問いは押せる物を光らせる）。
	// TCP の 4 つの置き場：送信キュー・再送キュー・qdisc・NIC。押すと親に知らせる。答えた後は正しい物を緑で囲む
	import type { Recall3 } from '../../learn/recall3.ts';
	import Defs from '../scene/kit/Defs.svelte';
	import Nic from '../scene/kit/Nic.svelte';
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
	};
	let { q, answered, t, onhit }: Props = $props();
	const OBJ: { id: string; name: string; x: number; y: number }[] = [
		{ id: 'wq', name: '送信キュー', x: 190, y: 220 },
		{ id: 'rtx', name: '再送キュー', x: 190, y: 430 },
		{ id: 'fq', name: 'qdisc（fq）', x: 505, y: 300 },
		{ id: 'nic', name: 'NIC', x: 830, y: 300 }
	];
	const hits = $derived(q?.k === 'hit' ? q.hits : []);
	const ans = $derived(q?.k === 'hit' && answered ? q.ans : null);
	/** 光る輪の脈（1.6 秒で 1 回） */
	const pulse = $derived(0.5 + 0.5 * Math.sin((t / 1600) * Math.PI * 2));
</script>

<Stage view={[0, 0, 1000, 600]} label="思い出す の図：送信キュー・再送キュー・qdisc・NIC">
	{#snippet children(uik: number)}
		<Defs />
		<Wire
			a={{ x: 190, y: 220 }}
			b={{ x: 505, y: 300 }}
			ia={120}
			ib={120}
			p={(t % 1800) / 1800}
			{uik}
		/>
		<Wire
			a={{ x: 505, y: 300 }}
			b={{ x: 830, y: 300 }}
			ia={120}
			ib={90}
			p={((t + 900) % 1800) / 1800}
			{uik}
		/>
		<Wire a={{ x: 190, y: 220 }} b={{ x: 190, y: 430 }} ia={70} ib={70} p={null} {uik} />
		{#each OBJ as o (o.id)}
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
				{#if o.id === 'nic'}
					<Nic x={o.x} y={o.y} s={0.8} hl={right} {uik} />
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
				<Tag x={o.x} y={o.y + 92} text={o.name} {uik} />
			</g>
		{/each}
		{#if q?.k === 'hit' && !answered}
			<Note x={500} y={70} text="光っている置き場を押す" tone="blue" center {uik} />
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
