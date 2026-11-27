<script lang="ts">
	// やってみる の図（learn-standard.md 第 19 章：状態の図。命令で図が変わる）。Kubernetes の場面：
	// 入口 → node-2 の上の 3 つの Pod。上限 256Mi の間は web-c が落ちては起き（赤と橙を行き来）、
	// 上限を 384Mi にすると新しい Pod に順に入れ替わり、3 つとも Ready で居続ける。t はミリ秒（親が一時停止で止める）
	import type { TryScene, TryState } from '../../learn/try3.ts';
	import Defs from '../scene/kit/Defs.svelte';
	import Hex from '../scene/kit/Hex.svelte';
	import Laptop from '../scene/kit/Laptop.svelte';
	import Platform from '../scene/kit/Platform.svelte';
	import Pod from '../scene/kit/Pod.svelte';
	import Token from '../scene/kit/Token.svelte';
	import Wire from '../scene/kit/Wire.svelte';
	import Note from '../scene/label/Note.svelte';
	import Num from '../scene/label/Num.svelte';
	import Tag from '../scene/label/Tag.svelte';
	import Stage from '../scene/Stage.svelte';

	type Props = { scene: TryScene; st: TryState; t: number };
	let { scene, st, t }: Props = $props();
	const m = $derived(scene.metrics(st));
	const set = $derived(!!st.f.set);
	const done = $derived(!!st.f.done);
	const X = { me: [120, 330], api: [360, 210], node: [700, 360] } as const;
	/** 台の上の 3 つの Pod の置き場（台の中に横 1 列。状態の札が隣の Pod に掛からない） */
	const SLOT = [
		[590, 345],
		[700, 345],
		[810, 345]
	] as const;
	/** 落ちる Pod の繰り返し（3.2 秒で 1 回：動く → 落ちる → 待つ → 起きる） */
	const ph = $derived((t % 3200) / 3200);
	const crash = $derived(!set && ph > 0.35 && ph < 0.75);
	const pods = $derived(
		done
			? (['ready', 'ready', 'ready'] as const)
			: set
				? (['ready', ph < 0.5 ? 'create' : 'ready', 'create'] as const)
				: (['ready', 'ready', crash ? 'dead' : ph < 0.35 ? 'run' : 'create'] as const)
	);
	const names = $derived(done || set ? ['h2v9r', 'q7nzx', 'x4lmb'] : ['2xk4p', '8mz7q', 'c4wtn']);
	const tok = $derived(((t % 2400) / 2400) as number);
	const along = (a: readonly number[], b: readonly number[], p: number) =>
		[a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p] as const;
	const pt = (a: readonly number[]) => ({ x: a[0], y: a[1] });
</script>

<Stage view={[0, 0, 1000, 600]} label="やってみる の図：端末・入口・node-2 の上の 3 つの Pod">
	{#snippet children(uik: number)}
		<Defs />
		<Wire a={pt(X.me)} b={pt(X.api)} ia={80} ib={70} p={(t % 1800) / 1800} {uik} />
		<Wire
			a={pt(X.api)}
			b={pt(X.node)}
			ia={70}
			ib={150}
			kind="watch"
			p={((t + 600) % 1800) / 1800}
			{uik}
		/>
		<g data-obj="me" data-term="kubectl"><Laptop x={X.me[0]} y={X.me[1]} s={0.8} {uik} /></g>
		<Tag x={X.me[0]} y={X.me[1] + 78} text="kubectl" {uik} dot="var(--dl-obj-gray)" />
		<g data-obj="api" data-term="apiserver"
			><Hex x={X.api[0]} y={X.api[1]} s={0.72} glyph="⇄" {uik} /></g
		>
		<Tag x={X.api[0]} y={X.api[1] + 82} text="kube-apiserver" {uik} dot="var(--dl-obj-teal)" />
		<g data-obj="node" data-term="node"
			><Platform x={X.node[0]} y={X.node[1]} s={0.95} w={360} d={230} {uik} /></g
		>
		{#each SLOT as p, i (i)}
			<Pod x={p[0]} y={p[1]} s={0.62} state={pods[i]} name={names[i]} {uik} />
		{/each}
		<Tag x={X.node[0] + 120} y={X.node[1] + 150} text="node-2" {uik} dot="var(--dl-obj-green)" />
		{#if set}
			{@const q = along([X.api[0] + 60, X.api[1]], [SLOT[2][0], SLOT[2][1] - 60], tok)}
			<Token x={q[0]} y={q[1]} label="384Mi" tone="blue" {uik} />
		{/if}
		<Note
			x={500}
			y={60}
			text={done
				? '上限 384Mi：山 300Mi でも殺されない。3 つとも Ready'
				: set
					? '上限を 384Mi に。新しい Pod に順に入れ替わる'
					: '上限 256Mi：山 300Mi で殺される（OOMKilled・137）'}
			tone={done ? 'green' : set ? 'blue' : 'red'}
			center
			{uik}
		/>
		<Num
			x={170}
			y={520}
			text="Ready {m.ready} / {m.want}"
			tone={done ? 'green' : 'orange'}
			center
			{uik}
		/>
		<Num x={500} y={520} text="再起動 {m.restarts}" tone={done ? 'green' : 'red'} center {uik} />
		<Num x={830} y={520} text="待ち {m.wait}" tone={done ? 'green' : 'orange'} center {uik} />
	{/snippet}
</Stage>
