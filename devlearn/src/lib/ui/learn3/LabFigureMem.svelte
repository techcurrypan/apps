<script lang="ts">
	// 試す の図（mem。見せ方の型 memory）：名前 a・b と、外の配列・中の配列。b の作り方で、b がどの物を指すかが変わる。
	// 4.2 秒ごとに「b[0] を直す」を繰り返す（LS3-M1）。直した所は赤。図は 1000×600。t は秒
	import { MEM_MODES, memLab } from '../../learn/lab.ts';
	import Defs from '../scene/kit/Defs.svelte';
	import List from '../scene/kit/List.svelte';
	import Var from '../scene/kit/Var.svelte';
	import Wire from '../scene/kit/Wire.svelte';
	import Halo from '../scene/label/Halo.svelte';
	import Stage from '../scene/Stage.svelte';

	type Props = { vals: Record<string, number>; t: number };
	let { vals, t }: Props = $props();
	const r = $derived(memLab({ n: vals.n ?? 4, mode: vals.mode ?? 1, nested: vals.nested ?? 1 }));
	const CYCLE = 4.2;
	const edited = $derived(t % CYCLE > 1.8);
	const flow = $derived((t % 1.8) / 1.8);
	/** 外の配列に見せるマスの数（多い時は 6 まで。残りは札で数える） */
	const shown = $derived(Math.min(r.n, 6));
	const A = { x: 130, y: 190 };
	const B = { x: 130, y: 430 };
	const OA = { x: 430, y: 190 };
	const OB = { x: 430, y: 430 };
	const outerVals = (side: 'a' | 'b') =>
		Array.from({ length: shown }, (_, i) =>
			r.nested ? '●' : side === 'b' && i === 0 && edited ? '9' : String(i)
		);
	/** a 側の数の要素が直るのは、b = a の時だけ（同じ物） */
	const aVals = $derived(outerVals(r.same && edited ? 'b' : 'a'));
	const inner = $derived(r.nested ? Math.min(r.n, 3) : 0);
	const innerAt = (i: number, side: 'a' | 'b') => ({
		x: 800,
		y: (side === 'a' ? 90 : 340) + i * 78
	});
	const innerVals = (i: number, hit: boolean) =>
		hit && i === 0 && edited ? [`${i}`, `${i}`, '9'] : [`${i}`, `${i}`];
</script>

<Stage view={[0, 0, 1000, 600]} label="試す の図">
	{#snippet children(uik: number)}
		<Defs />
		<Halo
			x={40}
			y={44}
			text="{MEM_MODES[r.mode]} → b[0] を直す"
			size={17}
			{uik}
			weight={800}
			mono
		/>
		<Halo
			x={40}
			y={72}
			text={r.aChanges ? 'a も巻き込まれる' : 'a は無事'}
			size={14}
			{uik}
			weight={800}
			color={r.aChanges ? 'var(--dl-obj-red)' : 'var(--dl-obj-green)'}
		/>
		<!-- 名前から外の配列へ（参照の矢印） -->
		<Wire a={A} b={OA} ia={36} ib={150} kind="ref" p={flow} {uik} />
		<Wire a={B} b={r.same ? OA : OB} ia={36} ib={150} kind="ref" p={flow} {uik} />
		<!-- 外の配列から中の配列へ -->
		{#each Array.from({ length: inner }, (_, i) => i) as i (i)}
			<Wire a={OA} b={innerAt(i, 'a')} ia={150} ib={70} kind="ref" p={flow} {uik} />
			{#if !r.same}
				<Wire
					a={OB}
					b={innerAt(i, r.innerSame ? 'a' : 'b')}
					ia={150}
					ib={70}
					kind="ref"
					p={flow}
					{uik}
				/>
			{/if}
		{/each}
		<g data-obj="va" data-term="variable"><Var x={A.x} y={A.y} name="a" {uik} /></g>
		<g data-obj="vb" data-term="variable"><Var x={B.x} y={B.y} name="b" {uik} /></g>
		<g data-obj="oa" data-term="array">
			<List x={OA.x} y={OA.y} s={0.85} vals={aVals} hl={r.same} {uik} />
		</g>
		{#if !r.same}
			<g data-obj="ob" data-term="copy">
				<List x={OB.x} y={OB.y} s={0.85} vals={outerVals('b')} hl {uik} />
			</g>
		{/if}
		{#if r.n > shown}
			<Halo x={OA.x} y={OA.y + 90} text="…ほか {r.n - shown} 個" size={13} {uik} anchor="middle" />
		{/if}
		{#each Array.from({ length: inner }, (_, i) => i) as i (i)}
			{@const pa = innerAt(i, 'a')}
			<g data-obj="ia-{i}" data-term={r.innerSame ? 'shallow' : 'array'}>
				<List x={pa.x} y={pa.y} s={0.55} vals={innerVals(i, r.innerSame)} newIdx={2} {uik} />
			</g>
			{#if !r.innerSame}
				{@const pb = innerAt(i, 'b')}
				<g data-obj="ib-{i}" data-term="clone">
					<List x={pb.x} y={pb.y} s={0.55} vals={innerVals(i, true)} newIdx={2} hl {uik} />
				</g>
			{/if}
		{/each}
		<Halo
			x={40}
			y={575}
			text="ヒープの配列 {r.arrays} 個 ・ 写した値 {r.copied} 個"
			size={13}
			{uik}
			weight={700}
			mono
		/>
	{/snippet}
</Stage>
