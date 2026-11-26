<script lang="ts">
	// 部品集の一覧（learn-standard.md 第 17 章。開発用。本番の目次には出さない）。
	// 全部の部品を明るい配色と暗い配色で並べ、試作 learn11 の同じ部品と比べる（10-P 手順 3）
	import Anatomy from '#lib/ui/scene/kit/Anatomy.svelte';
	import Bar from '#lib/ui/scene/kit/Bar.svelte';
	import Block from '#lib/ui/scene/kit/Block.svelte';
	import Card from '#lib/ui/scene/kit/Card.svelte';
	import Db from '#lib/ui/scene/kit/Db.svelte';
	import Defs from '#lib/ui/scene/kit/Defs.svelte';
	import Frame from '#lib/ui/scene/kit/Frame.svelte';
	import Func from '#lib/ui/scene/kit/Func.svelte';
	import Hex from '#lib/ui/scene/kit/Hex.svelte';
	import Laptop from '#lib/ui/scene/kit/Laptop.svelte';
	import List from '#lib/ui/scene/kit/List.svelte';
	import Nic from '#lib/ui/scene/kit/Nic.svelte';
	import Packet from '#lib/ui/scene/kit/Packet.svelte';
	import Panel from '#lib/ui/scene/kit/Panel.svelte';
	import Platform from '#lib/ui/scene/kit/Platform.svelte';
	import Pod from '#lib/ui/scene/kit/Pod.svelte';
	import Queue from '#lib/ui/scene/kit/Queue.svelte';
	import Ring from '#lib/ui/scene/kit/Ring.svelte';
	import Sphere from '#lib/ui/scene/kit/Sphere.svelte';
	import Token from '#lib/ui/scene/kit/Token.svelte';
	import Var from '#lib/ui/scene/kit/Var.svelte';
	import Clock from '#lib/ui/scene/label/Clock.svelte';
	import Note from '#lib/ui/scene/label/Note.svelte';
	import Num from '#lib/ui/scene/label/Num.svelte';
	import Tag from '#lib/ui/scene/label/Tag.svelte';
	import Halo from '#lib/ui/scene/label/Halo.svelte';

	const schemes = ['light', 'dark'] as const;
	let hov = $state('');
</script>

<svelte:head><title>部品集 — devlearn</title></svelte:head>

<main>
	<h1>図の部品集（第 3 版）</h1>
	<p>
		学習画面の図に使う部品の一覧（開発用）。同じ物は全レッスンで同じ形と色。明るい配色と暗い配色を並べる（図の
		1 単位 ＝ 画面の 1px）。物に指を置くと浮き上がる。
	</p>
	<div class="pair">
		{#each schemes as sc (sc)}
			<section class="dl-scene-{sc}" data-scheme={sc}>
				<svg
					viewBox="-70 0 1140 1860"
					role="img"
					aria-label="部品の一覧（{sc === 'light' ? '明るい' : '暗い'}配色）"
				>
					<Defs />
					{#snippet name(x: number, y: number, t: string)}
						<Tag {x} {y} text={t} size={14} />
					{/snippet}
					<!-- 1 段目：機械 -->
					<g
						role="presentation"
						onmouseenter={() => (hov = 'laptop')}
						onmouseleave={() => (hov = '')}
					>
						<Laptop x={120} y={150} lift={hov === 'laptop' ? 8 : 0} id="laptop" />
					</g>
					{@render name(120, 245, 'laptop')}
					<Func x={370} y={150} tone="blue" glyph="ƒ" id="func" />
					{@render name(370, 245, 'func（青）')}
					<Func x={620} y={150} tone="orange" glyph="⚡" />
					{@render name(620, 245, 'func（橙）')}
					<Block x={870} y={150} glyph="⌖" id="block" />
					{@render name(870, 245, 'block')}
					<!-- 2 段目 -->
					<Queue x={160} y={400} clock id="queue" />
					{@render name(160, 490, 'queue')}
					<Ring x={450} y={400} id="ring" />
					{@render name(450, 490, 'ring')}
					<Nic x={700} y={400} id="nic" />
					{@render name(700, 490, 'nic')}
					<Hex x={900} y={400} glyph="⇉" s={0.85} id="hex" />
					{@render name(900, 490, 'hex')}
					<!-- 3 段目 -->
					<Db x={120} y={660} id="db" />
					{@render name(120, 740, 'db')}
					<Platform x={430} y={650} w={260} d={170} id="platform" />
					<Pod x={400} y={630} s={0.45} state="ready" name="web-1" label="" />
					<Pod x={470} y={665} s={0.45} state="dead" name="web-2" label="" />
					{@render name(430, 760, 'platform と pod')}
					<Platform x={760} y={650} w={220} d={150} down />
					<Pod x={760} y={650} s={0.45} state="paper" label="" />
					{@render name(760, 760, '落ちたノード・紙の pod')}
					<!-- 4 段目 -->
					<Pod x={100} y={880} s={0.8} state="ready" name="web-a" />
					<Pod x={260} y={880} s={0.8} state="create" name="web-b" />
					<Pod x={420} y={880} s={0.8} state="dead" name="web-c" />
					<Frame x={790} y={960} name="フレーム add()" current id="frame" />
					<!-- 5 段目 -->
					<List x={200} y={1160} vals={['1', '2', '3']} cap={5} newIdx={2} id="list" />
					{@render name(200, 1250, 'list（容量 5）')}
					<Var x={450} y={1170} name="a" id="var" />
					<Var x={560} y={1170} name="b" />
					<Var x={670} y={1170} name="c" />
					{@render name(560, 1250, 'var')}
					<Token x={800} y={1160} label="A1" />
					<Token x={860} y={1160} label="A1′" kind="clone" />
					<Token x={920} y={1160} label="ACK" kind="ack" />
					<Packet x={820} y={1220} />
					<Packet x={860} y={1220} kind="drop" />
					{@render name(860, 1265, 'token・packet')}
					<!-- 6 段目：板・棒・球・札・式の分解 -->
					<Panel x={30} y={1300} w={420} h={130} tone="orange" title="平均の分布" id="panel">
						{#each [20, 45, 80, 110, 90, 55, 30, 12] as h, i (i)}
							<Bar x={60 + i * 44} y={1415} w={30} {h} />
						{/each}
					</Panel>
					{#each [0, 1, 2, 3, 4, 5] as i (i)}
						<Sphere x={500 + i * 22} y={1330} />
					{/each}
					<Card
						x={490}
						y={1360}
						w={190}
						lines={[
							'ss -tim',
							{ text: 'cwnd:10', color: 'var(--dl-obj-blue)' },
							{ text: 'retrans:0', op: 0.6 }
						]}
					/>
					<Card
						x={700}
						y={1300}
						w={270}
						dark
						lines={[
							'$ kubectl get pods',
							'web-1  1/1  Running',
							{ text: 'web-2  0/1  OOMKilled', color: '#ff8a8a' }
						]}
					/>
					<!-- 式の分解（言葉をそろえる。第 18.1）：式を全て大きく書き、部分 3 つを意味の札と結ぶ -->
					<Anatomy
						x={700}
						y={1640}
						parts={[
							{ text: 'send', color: '#6ea0ff', note: '送る' },
							{ text: '(' },
							{ text: 'fd', color: '#f0a252', note: '番号札', row: 1 },
							{ text: ', ' },
							{ text: 'buf', color: '#5fd0a0', note: '送る中身の置き場', row: 2 },
							{ text: ', ' },
							{ text: '65536', color: '#e7c35a', note: 'バイト数' },
							{ text: ')' }
						]}
					/>
					<!-- 名前の札と下の説明の 2 段（試作の物の札と同じ形） -->
					<Tag x={160} y={1620} text="kube-apiserver" dot="var(--dl-obj-teal)" />
					<Halo x={160} y={1646} text="ただ 1 つの入口" size={12.5} anchor="middle" weight={700} />
					<!-- 板の段の色（母集団・標本・平均） -->
					<Panel x={30} y={1680} w={120} h={60} tone="teal" title="母集団" />
					<Panel x={170} y={1680} w={120} h={60} tone="blue" title="標本" />
					<!-- 7 段目：札（label/） -->
					<Tag x={110} y={1520} text="sk_write_queue" dot="var(--dl-obj-teal)" />
					<Note x={360} y={1520} text="send() は 40 µs で戻る" />
					<Num x={520} y={1520} text="cwnd 10" />
					<Num x={630} y={1520} text="参照 2" tone="orange" />
					<Clock x={750} y={1520} label="200 ms 後" />
				</svg>
			</section>
		{/each}
	</div>
</main>

<style>
	main {
		max-width: 2360px;
		margin: 0 auto;
		padding: 16px;
	}
	/* 図の 1 単位を画面の 1px にする（字の大きさを本番の図と同じにして比べる） */
	.pair {
		display: grid;
		grid-template-columns: repeat(auto-fit, 1156px);
		gap: 16px;
		justify-content: center;
	}
	section {
		background: var(--dl-scene-bg);
		border-radius: 16px;
		padding: 8px;
		color: var(--dl-ink);
	}
	svg {
		/* 図の 1 単位 ＝ 画面の 1px（viewBox と同じ大きさ） */
		width: 1140px;
		height: 1860px;
		display: block;
	}
</style>
