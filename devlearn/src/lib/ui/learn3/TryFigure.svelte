<script lang="ts">
	// やってみる の図（learn-standard.md 第 19 章：状態の図。命令で図が変わる）。TCP の場面：
	// 送る係 → qdisc → NIC → 相手。pfifo_fast は溜めて落とす（赤い荷物が落ちる）、fq は間を空けて流す。
	// 線の上の荷物は cwnd に応じた数が流れ続ける（LS3-M2）。t はミリ秒（親が一時停止で止める）
	import type { TryScene, TryState } from '../../learn/try3.ts';
	import Defs from '../scene/kit/Defs.svelte';
	import Func from '../scene/kit/Func.svelte';
	import Laptop from '../scene/kit/Laptop.svelte';
	import Nic from '../scene/kit/Nic.svelte';
	import Packet from '../scene/kit/Packet.svelte';
	import Queue from '../scene/kit/Queue.svelte';
	import Wire from '../scene/kit/Wire.svelte';
	import Note from '../scene/label/Note.svelte';
	import Num from '../scene/label/Num.svelte';
	import Tag from '../scene/label/Tag.svelte';
	import Stage from '../scene/Stage.svelte';

	type Props = { scene: TryScene; st: TryState; t: number };
	let { scene, st, t }: Props = $props();
	const fq = $derived(st.v.q === 'fq');
	const bbr = $derived(st.v.cc === 'bbr');
	const m = $derived(scene.metrics(st));
	const fixed = $derived(!!st.f.ss2);
	// 端末に幅を譲った細い枠（約 690px）でも物が大きく見えるよう、700 の幅に 2 段で並べる（送る係 → qdisc → NIC → 相手。U の字）
	const X = { xmit: [150, 210], q: [480, 225], nic: [480, 445], peer: [150, 445] } as const;
	/** 物の縮尺（4 つが重ならず間が空く大きさ。LS3-S3） */
	const S = 0.92;
	const k = $derived((t % 1600) / 1600);
	const n = $derived(fixed ? 4 : 1);
	const along = (a: readonly number[], b: readonly number[], p: number) =>
		[a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p] as const;
	const pt = (a: readonly number[]) => ({ x: a[0], y: a[1] });
</script>

<Stage view={[0, 0, 700, 640]} label="やってみる の図：送る係・qdisc・NIC・相手">
	{#snippet children(uik: number)}
		<Defs />
		<Wire a={pt(X.xmit)} b={pt(X.q)} ia={70} ib={95} p={(t % 1800) / 1800} {uik} />
		<Wire a={pt(X.q)} b={pt(X.nic)} ia={75} ib={70} p={((t + 600) % 1800) / 1800} {uik} />
		<Wire a={pt(X.nic)} b={pt(X.peer)} ia={90} ib={80} p={null} {uik} op={0.6} />
		{#each Array.from({ length: n }, (_, i) => i) as i (i)}
			{@const p = along(
				[X.nic[0] - 90, X.nic[1]],
				[X.peer[0] + 80, X.peer[1]],
				(((t / 1800 + i / n) % 1) + 1) % 1
			)}
			<Packet x={p[0]} y={p[1]} kind="data" tone={fixed ? 'blue' : 'gray'} {uik} />
		{/each}
		<g data-obj="xmit" data-term="tcp_write_xmit"
			><Func x={X.xmit[0]} y={X.xmit[1]} s={S} tone="blue" glyph="ƒ" {uik} /></g
		>
		<Tag x={X.xmit[0]} y={X.xmit[1] + 90} text="tcp_write_xmit()" {uik} dot="var(--dl-obj-blue)" />
		<Num
			x={X.xmit[0]}
			y={X.xmit[1] - 120}
			text="cwnd {m.cwnd}"
			tone={fixed ? 'green' : 'red'}
			center
			{uik}
		/>
		<g data-obj="qdisc" data-term="qdisc">
			<Queue x={X.q[0]} y={X.q[1]} s={S} items={fq ? [] : ['B', 'C', 'D', 'E']} hl={!fq} {uik} />
		</g>
		<Tag
			x={X.q[0]}
			y={X.q[1] + 95}
			text={fq ? 'qdisc：fq' : 'qdisc：pfifo_fast'}
			{uik}
			dot="var(--dl-obj-teal)"
		/>
		<Note
			x={X.q[0] - 20}
			y={X.q[1] - 140}
			text={fq ? 'fq：間を空けて流す。溜めない' : 'pfifo_fast：溜まってあふれ、落とす'}
			tone={fq ? 'green' : 'red'}
			center
			{uik}
		/>
		{#if !fq}
			<Packet x={X.q[0] + 120 + 60 * k} y={X.q[1] + 20 + 90 * k * k} kind="drop" op={1 - k} {uik} />
		{/if}
		<g data-obj="nic" data-term="nic"><Nic x={X.nic[0]} y={X.nic[1]} s={S} {uik} /></g>
		<Tag x={X.nic[0]} y={X.nic[1] + 90} text="NIC（eth0）" {uik} dot="var(--dl-obj-green)" />
		<g data-obj="peer"><Laptop x={X.peer[0]} y={X.peer[1]} s={S * 0.9} {uik} /></g>
		<Tag x={X.peer[0]} y={X.peer[1] + 80} text="203.0.113.80" {uik} />
		<Note
			x={350}
			y={605}
			text={bbr
				? '輻輳制御：BBR（落ちても縮めすぎない）'
				: '輻輳制御：CUBIC（落ちると 0.7 倍に縮む）'}
			tone={bbr ? 'green' : 'gray'}
			center
			{uik}
		/>
		<Num x={70} y={605} text="再送 {m.rtx}" tone={fixed ? 'green' : 'red'} center {uik} />
		<Num x={630} y={605} text="RTT {m.rtt}" tone={fixed ? 'green' : 'orange'} center {uik} />
	{/snippet}
</Stage>
