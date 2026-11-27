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
	import Stage from '#lib/ui/scene/Stage.svelte';
	import Scene3 from '#lib/ui/scene/Scene3.svelte';
	import type { SceneObj } from '#lib/learn/scene/draw.ts';
	import type { Layout } from '#lib/learn/scene/layout.ts';
	import { flowAt } from '#lib/learn/player.ts';
	import { LABEL_PX, zoomView } from '#lib/ui/scene/label/uik.ts';
	import { NET_TERMS } from '#lib/content/terms/net.ts';
	import { LABS } from '#lib/learn/lab.ts';
	import LabPanel from '#lib/ui/learn3/LabPanel.svelte';
	import LabFigure from '#lib/ui/learn3/LabFigure.svelte';
	import TryPanel3 from '#lib/ui/learn3/TryPanel3.svelte';
	import TryFigure from '#lib/ui/learn3/TryFigure.svelte';
	import { startTry, typeLine } from '#lib/learn/try3.ts';
	import { TRY_TCP } from '#lib/content/v3/try-tcp.ts';

	const schemes = ['light', 'dark'] as const;
	let hov = $state('');
	/** 字の大きさの確かめ（16.3）：同じ図を倍率 0.5・1・2 で描く */
	const zooms = [0.5, 1, 2];

	/** 構図の移り変わり（16.1 S5）：2 つの構図を 3.5 秒ごとに行き来する。描く時刻だけで決まる */
	const demoObjs: Record<string, SceneObj> = {
		app: { kind: 'laptop', name: 'アプリ', term: 'app' },
		kern: { kind: 'func', name: 'カーネル', tone: 'blue', glyph: 'ƒ', term: 'kernel' },
		q: { kind: 'queue', name: '送信キュー', term: 'sendq' },
		nic: { kind: 'nic', name: 'NIC', term: 'nic' }
	};
	const demoLayouts: Layout[] = [
		{ app: [180, 250], kern: [500, 250], nic: [820, 250] },
		{ kern: [260, 230, 0.9], q: [560, 300], nic: [840, 360, 0.9] }
	];
	const DEMO_MS = 3500;
	let demoNow = $state(0);
	$effect(() => {
		let raf = 0;
		const t0 = performance.now();
		const f = (n: number) => {
			demoNow = Math.max(0, n - t0);
			raf = requestAnimationFrame(f);
		};
		raf = requestAnimationFrame(f);
		return () => cancelAnimationFrame(raf);
	});
	const startVals = (id: 'tcp' | 'k8s') =>
		Object.fromEntries(LABS[id].knobs.map((k) => [k.k, k.v])) as Record<string, number>;
	let labVals = $state({ tcp: startVals('tcp'), k8s: startVals('k8s') });
	let labAt = $state({ tcp: 0, k8s: 0 });
	let tryState = $state(startTry(TRY_TCP));
	const demoStep = $derived((((Math.floor(demoNow / DEMO_MS) % 2) + 2) % 2) as 0 | 1);
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
					viewBox="-70 0 1240 2060"
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
					<Block x={870} y={150} glyph="↻" id="block" />
					{@render name(870, 245, 'block')}
					<!-- 2 段目 -->
					<Queue x={160} y={418} clock items={['B', 'C']} id="queue" />
					{@render name(160, 520, 'queue')}
					<Ring x={475} y={400} id="ring" />
					{@render name(475, 490, 'ring')}
					<Nic x={765} y={400} id="nic" />
					{@render name(765, 490, 'nic')}
					<Hex x={1040} y={400} glyph="⇉" s={0.85} id="hex" />
					<Tag x={1040} y={490} text="kube-apiserver" dot="var(--dl-obj-teal)" />
					<Halo
						x={1040}
						y={524}
						text="hex・ただ 1 つの入口"
						size={12.5}
						anchor="middle"
						weight={700}
					/>
					<!-- 3 段目 -->
					<Db x={120} y={660} id="db" />
					{@render name(120, 752, 'db')}
					<Platform x={430} y={650} w={330} d={210} id="platform" />
					<!-- 台の上の Pod は単体の Pod と同じ大きさ（同じ物は同じ形。第 17 章） -->
					<Pod x={360} y={625} s={0.8} state="ready" name="web-1" />
					<Pod x={515} y={655} s={0.8} state="dead" name="web-2" />
					<Tag x={300} y={720} text="node-1" dot="var(--dl-obj-green)" />
					{@render name(560, 800, 'platform と pod')}
					<Platform x={760} y={650} w={220} d={150} down />
					<Pod x={760} y={650} s={0.55} state="paper" name="web-3" label="" />
					{@render name(760, 760, '落ちたノード・紙の pod')}
					<!-- 4 段目 -->
					<Pod x={90} y={880} s={0.8} state="ready" name="web-a" />
					<Pod x={235} y={880} s={0.8} state="create" name="web-b" />
					<Pod x={380} y={880} s={0.8} state="dead" name="web-c" />
					<Frame x={575} y={950} w={170} d={110} name="<module>" />
					<Frame x={930} y={975} w={170} d={110} name="フレーム add()" current id="frame" />
					<!-- 5 段目 -->
					<List x={200} y={1160} vals={['1', '2', '3']} cap={5} newIdx={2} id="list" />
					{@render name(200, 1266, 'list（容量 5）')}
					<Var x={420} y={1170} name="a" id="var" />
					<Var x={580} y={1170} name="b" />
					<Var x={740} y={1170} name="c" />
					{@render name(580, 1250, 'var')}
					<Token x={905} y={1160} label="A1" />
					<Token x={975} y={1160} label="A1′" kind="clone" />
					<Token x={1045} y={1160} label="ACK" kind="ack" />
					<Packet x={940} y={1220} />
					<Packet x={1000} y={1220} kind="drop" />
					{@render name(975, 1265, 'token・packet')}
					<!-- 6 段目：板・棒・球・札・式の分解 -->
					<Panel x={30} y={1290} w={420} h={160} tone="orange" title="平均の分布" id="panel">
						{#each [14, 32, 56, 77, 63, 38, 21, 9] as h, i (i)}
							<Bar x={60 + i * 44} y={1415} w={30} {h} />
						{/each}
						<line x1={48} y1={1420} x2={420} y2={1420} class="axis" />
						{#each [0, 5, 10] as v, i (v)}
							<line x1={75 + i * 155} y1={1420} x2={75 + i * 155} y2={1426} class="axis" />
							<Halo
								x={75 + i * 155}
								y={1442}
								text="{v} 分"
								size={12.5}
								anchor="middle"
								weight={700}
							/>
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
							'送ってよいか',
							{ text: '✓ cwnd に空き（10）', color: 'var(--dl-obj-green)' },
							{ text: '✓ 相手の窓 64 KB', color: 'var(--dl-obj-green)' },
							{ text: '✗ 前の ACK を待つ', color: 'var(--dl-obj-red)' }
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
						x={820}
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
					<!-- 板の段の色（母集団・標本・平均） -->
					<!-- 強めた状態（主役の物の下の台を物の色で淡く塗る） -->
					<Func x={200} y={1935} tone="blue" glyph="ƒ" hl />
					<Func x={450} y={1935} tone="orange" glyph="⚡" hl />
					<Tag x={325} y={2032} text="強めた func（主役）" size={14} />
					<!-- 実行の文脈の残り 2 色（hardirq＝赤・その他＝灰。第 17 章 func） -->
					<Func x={760} y={1950} s={0.8} tone="red" glyph="!" />
					{@render name(760, 2032, 'func（赤）hardirq')}
					<Func x={1000} y={1950} s={0.8} tone="gray" glyph="ƒ" />
					{@render name(1000, 2032, 'func（灰）その他')}
					<Panel x={30} y={1660} w={170} h={120} tone="teal" title="母集団">
						{#each [0, 1, 2, 3, 4, 5, 6] as i (i)}
							<Sphere x={58 + i * 20} y={1748 - (i % 2) * 12} r={9} tone="teal" />
						{/each}
					</Panel>
					<Panel x={213} y={1660} w={170} h={120} tone="blue" title="標本">
						{#each [0, 1, 2] as i (i)}
							<Sphere x={256 + i * 42} y={1742} r={10} />
						{/each}
					</Panel>
					<Panel x={396} y={1660} w={170} h={120} tone="orange" title="平均">
						{#each [18, 34, 50, 34, 18] as h, i (i)}
							<Bar x={420 + i * 28} y={1758} w={20} {h} tone="orange" />
						{/each}
						<line x1={410} y1={1762} x2={556} y2={1762} class="axis" />
					</Panel>
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
	<h2>構図の移り変わり（16.1 S5。3.5 秒ごとに次の構図へ）</h2>
	<div class="demo dl-scene-light" data-demo-step={demoStep}>
		<Scene3
			objs={demoObjs}
			layout={demoLayouts[demoStep]}
			prev={demoLayouts[1 - demoStep]}
			t={demoNow % DEMO_MS}
			hl={['kern']}
			links={[
				{ from: 'app', to: 'kern' },
				{ from: 'kern', to: 'nic' },
				{ from: 'kern', to: 'q' },
				{ from: 'q', to: 'nic', kind: 'ack', both: true }
			]}
			flow={flowAt(demoNow)}
			label="構図の移り変わりの見本"
			terms={NET_TERMS}
		/>
	</div>
	<h2>試す（第 19 章。つまみの値で計算し直す）</h2>
	<div class="labs">
		{#each ['tcp', 'k8s'] as const as id (id)}
			<div class="lab-pair">
				<div class="lab-fig">
					<LabFigure lab={id} vals={labVals[id]} t={(demoNow - labAt[id]) / 1000} />
				</div>
				<LabPanel
					lab={LABS[id]}
					onchange={(v) => {
						labVals[id] = v;
						labAt[id] = demoNow;
					}}
				/>
			</div>
		{/each}
	</div>
	<h2>やってみる（第 19 章。命令で図が変わる）</h2>
	<div class="lab-pair try-pair">
		<div class="lab-fig"><TryFigure scene={TRY_TCP} st={tryState} t={demoNow} /></div>
		<TryPanel3
			scene={TRY_TCP}
			st={tryState}
			onsend={(l) => (tryState = typeLine(TRY_TCP, tryState, l))}
		/>
	</div>
	<h2>字の大きさ（寄っても引いても同じ。16.3）</h2>
	<p>
		同じ図（1000×600）を倍率 0.5・1・2 で描く。物は大きさが変わり、札の字は画面の上でいつも同じ
		px（名前
		{LABEL_PX.name}px・説明 {LABEL_PX.sub}px・数 {LABEL_PX.num}px・線 {LABEL_PX.line}px）。
	</p>
	<div class="zooms dl-scene-light">
		{#each zooms as z (z)}
			<figure>
				<div class="zbox">
					<Stage view={zoomView(1000, 600, z)} zoom={z} label="倍率 {z} の図">
						{#snippet children(uik)}
							<Func x={370} y={300} s={0.8} tone="blue" glyph="ƒ" {uik} />
							<Queue x={650} y={300} s={0.7} {uik} />
							<line
								x1={425}
								y1={300}
								x2={555}
								y2={300}
								style:stroke="var(--dl-ink)"
								stroke-width={1.5 * uik}
							/>
							<g data-lk="name"><Tag x={370} y={405} text="tcp_sendmsg" {uik} /></g>
							<g data-lk="sub">
								<Halo
									x={370}
									y={405 + 26 * uik}
									text="データを写す"
									size={LABEL_PX.sub}
									{uik}
									anchor="middle"
									weight={700}
								/>
							</g>
							<g data-lk="num"><Num x={700} y={165} text="cwnd 10" size={LABEL_PX.num} {uik} /></g>
							<g data-lk="line">
								<Halo
									x={490}
									y={282}
									text="写す"
									size={LABEL_PX.line}
									{uik}
									anchor="middle"
									weight={700}
								/>
							</g>
							<g data-lk="note"
								><Note x={310} y={165} text="40 µs で戻る" size={LABEL_PX.note} {uik} /></g
							>
						{/snippet}
					</Stage>
				</div>
				<figcaption>倍率 {z}</figcaption>
			</figure>
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
		grid-template-columns: repeat(auto-fit, 1256px);
		gap: 16px;
		justify-content: center;
	}
	.demo {
		width: 940px;
		height: 564px;
		margin: 0 auto 16px;
		background: var(--dl-scene-bg);
		border-radius: 16px;
	}
	.axis {
		stroke: var(--dl-ink);
		stroke-width: 1.5;
		opacity: 0.55;
	}
	.zooms {
		display: grid;
		grid-template-columns: repeat(3, 460px);
		gap: 16px;
		justify-content: center;
	}
	.zooms figure {
		margin: 0;
		background: var(--dl-scene-bg);
		border-radius: 16px;
		padding: 8px;
	}
	.zbox {
		width: 444px;
		height: 266px;
		overflow: hidden;
	}
	figcaption {
		text-align: center;
		color: var(--dl-ink);
	}
	section {
		background: var(--dl-scene-bg);
		border-radius: 16px;
		padding: 8px;
		color: var(--dl-ink);
	}
	svg {
		/* 図の 1 単位 ＝ 画面の 1px（viewBox と同じ大きさ） */
		width: 1240px;
		height: 2060px;
		display: block;
	}
	.labs {
		display: grid;
		gap: 32px;
		margin: 12px 0 32px;
	}
	/* 図が主役（1440×900 で図 940×520 以上）。右に つまみ の欄 */
	.lab-pair {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 360px;
		gap: 24px;
		align-items: start;
	}
	.lab-fig {
		height: 560px;
		background: var(--dl-scene-bg, transparent);
		border-radius: 14px;
	}
</style>
