<script lang="ts">
	// 街 /town（D-15）。画面いっぱいの 3D の街に、試作 docs/prototype/minato.html と同じ置き方で板を重ねる。
	// 板の色は --dl-* のトークン、文字は --dl-font（screen-design.md 第 10 章）。
	import { onMount } from 'svelte';
	import { newTownUi, startTown, type TownHandle } from '#lib/city/game.ts';
	import TownLesson from '#lib/city/TownLesson.svelte';
	import { shortCommit } from '#lib/build-info.ts';

	const ui = $state(newTownUi());
	let canvas = $state<HTMLCanvasElement>();
	let markers = $state<HTMLElement>();
	let floaters = $state<HTMLElement>();
	let game: TownHandle = null;
	const commit = shortCommit(__COMMIT__);

	onMount(() => {
		if (!canvas || !markers || !floaters) return;
		const still = location.hash.includes('still');
		game = startTown({ canvas, markers, floaters }, ui, still);
		return () => game?.dispose();
	});

	const fmt = (n: number) => Math.round(n).toLocaleString('ja-JP');
	const satLevel = $derived(ui.sat > 70 ? 'good' : ui.sat > 55 ? 'mid' : 'bad');
	const hpLevel = (h: number) => (h > 70 ? 'good' : h > 55 ? 'mid' : 'bad');

	const TOOLS = [
		{ id: 'select', label: '選ぶ', d: 'M5 3 L19 12 L12 13.5 L9 20 Z' },
		{ id: 'road', label: '道路', d: 'M6 21 L10 3 M18 21 L14 3 M12 5 V7 M12 10 V13 M12 16 V19' },
		{ id: 'home', label: '住宅地', d: 'M3 11 L12 4 L21 11 M5 10 V20 H19 V10 M10 20 V14 H14 V20' },
		{ id: 'shop', label: '商業地', d: 'M3 9 L5 4 H19 L21 9 Z M4 9 V20 H20 V9 M9 20 V14 H15 V20' },
		{ id: 'park', label: '公園', d: 'M12 14 V21 M7 21 H17' },
		{ id: 'bulldoze', label: '取り壊し', d: 'M3 18 H21 M5 18 V12 H13 L16 15 V18 M13 12 L17 6' }
	];
	const VIEWS = [
		{ id: 'ground', label: '地上の街', d: 'M3 20 H21 M5 20 V10 H10 V20 M12 20 V5 H18 V20' },
		{ id: 'infra', label: '地下の仕組み', d: 'M3 7 H21 M3 17 H21 M8 7 V17 M16 7 V17 M8 12 H16' },
		{ id: 'happy', label: '満足度', d: 'M8.5 14 Q12 17.5 15.5 14 M9 9.5 H9.1 M15 9.5 H15.1' }
	];
</script>

<svelte:head><title>みなと町 ・ devlearn</title></svelte:head>

<div class="town">
	<canvas bind:this={canvas} id="view" aria-label="みなと町の 3D の街並み"></canvas>
	{#if ui.noGL}
		<div class="boot">{ui.noGL}</div>
	{:else if !ui.ready}
		<div class="boot">街を描いています…</div>
	{/if}

	<div class="top">
		<div class="glass brand">
			<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"
				><path
					d="M17 2 L31 9.5 L31 24.5 L17 32 L3 24.5 L3 9.5 Z"
					fill="#17314f"
					stroke="#6fb3ff"
					stroke-width="1.5"
				/><path
					d="M8 21 L17 12 L26 21"
					fill="none"
					stroke="#ffc35a"
					stroke-width="2.4"
					stroke-linecap="round"
					stroke-linejoin="round"
				/><path
					d="M8 25.5 Q12.5 23 17 25.5 T26 25.5"
					fill="none"
					stroke="#6fb3ff"
					stroke-width="2"
					stroke-linecap="round"
				/></svg
			>
			<div><b>みなと町</b><small>港の町 ・ 町長 1 年目</small></div>
		</div>
		<div class="glass time" role="group" aria-label="時間">
			<div class="d"><span>{ui.date}</span><strong>{ui.clock}</strong></div>
			{#each [['❚❚', '一時停止'], ['▶', '速さ 1'], ['▶▶', '速さ 2'], ['▶▶▶', '速さ 3']] as [sym, label], i (i)}
				<button
					class="spd"
					type="button"
					aria-label={label}
					aria-pressed={ui.speed === i}
					onclick={() => game?.setSpeed(i)}>{sym}</button
				>
			{/each}
		</div>
		<div class="spacer"></div>
		<div class="glass stats">
			<div class="stat"><span>人口</span><strong>{fmt(ui.pop)}</strong></div>
			<button
				type="button"
				class="stat statBtn"
				aria-label="資金の内訳を開く"
				aria-expanded={ui.budgetOpen}
				onclick={() => game?.toggleBudget()}
			>
				<span>資金 <em>{ui.income >= 0 ? '+' : ''}{fmt(ui.income)}/時</em></span><strong
					>¥{fmt(ui.money)}</strong
				>
			</button>
			<div class="stat">
				<span>満足度</span><strong>{ui.sat}</strong>
				<div class="meter"><i class={satLevel} style:width="{ui.sat}%"></i></div>
			</div>
		</div>
		<div class="glass demand" aria-label="町が求めている物">
			<div><span class="col"><i style:height="{ui.demand.res}%"></i></span><small>住</small></div>
			<div><span class="col"><i style:height="{ui.demand.com}%"></i></span><small>商</small></div>
			<div><span class="col"><i style:height="{ui.demand.job}%"></i></span><small>職</small></div>
		</div>
	</div>

	<aside class="glass reqs" aria-label="届いた要望">
		<header><strong>届いた要望</strong><span>{ui.reqs.length} 件</span></header>
		<div class="reqList">
			{#if !ui.reqs.length}<p class="empty">今は届いている要望が無い</p>{/if}
			{#each ui.reqs as r (r.id)}
				<button type="button" class="req" onclick={() => game?.openReq(r.id)}>
					<span class="av" style:background="{r.color}22" style:color={r.color}>{r.icon}</span>
					<span class="tx"
						><strong>{r.title}</strong><small
							>{r.who} ・
							<em class:hot={r.left <= 1}>{r.left <= 1 ? '! ' : ''}あと {Math.max(0, r.left)} 日</em
							></small
						></span
					>
				</button>
			{/each}
			{#each ui.done as d (d.id)}
				<div class="req done">
					<span class="av ok">✓</span>
					<span class="tx"
						><strong>{d.title}</strong><small
							>{d.how === 'learned' ? '学んだ手で応えた' : '業者に任せた'}</small
						></span
					>
				</div>
			{/each}
		</div>
	</aside>

	<div class="side">
		{#if ui.budgetOpen}
			<section class="glass budget" aria-label="資金の内訳">
				<header>
					<strong>資金の内訳</strong><button
						type="button"
						class="x"
						aria-label="閉じる"
						onclick={() => game?.toggleBudget()}>×</button
					>
				</header>
				<h4>1 時間ごとの収支</h4>
				<table>
					<tbody>
						{#each ui.budget.parts as p (p[0])}
							<tr
								><th>{p[0]}</th><td class={p[1] < 0 ? 'neg' : 'pos'}
									>{p[1] < 0 ? '−' : '+'}{fmt(Math.abs(p[1]))}</td
								></tr
							>
						{/each}
						<tr class="sum"
							><th>計</th><td
								>{ui.budget.income >= 0 ? '+' : '−'}{fmt(Math.abs(ui.budget.income))}</td
							></tr
						>
					</tbody>
				</table>
				<h4>最近の出入り</h4>
				{#if ui.budget.ledger.length}
					<ul>
						{#each ui.budget.ledger as l, i (i)}
							<li>
								<span>{l.t}</span><span>{l.text}</span><b class={l.v < 0 ? 'neg' : 'pos'}
									>{l.v < 0 ? '−' : '+'}{fmt(Math.abs(l.v))}</b
								>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="empty">まだ無い</p>
				{/if}
			</section>
		{/if}
		{#if ui.info}
			<section class="glass info" aria-live="polite">
				<header>
					<strong>{ui.info.name}</strong><button
						type="button"
						class="x"
						aria-label="閉じる"
						onclick={() => game?.select()}>×</button
					>
				</header>
				<dl>
					{#if ui.info.residents}<div>
							<dt>住んでいる人</dt>
							<dd>{ui.info.residents} 人</dd>
						</div>{/if}
					{#if ui.info.jobs}<div>
							<dt>働く場所</dt>
							<dd>{ui.info.jobs} 人分</dd>
						</div>{/if}
					<div>
						<dt>満足度</dt>
						<dd>
							<span class="bar"
								><i class={hpLevel(ui.info.happy)} style:width="{ui.info.happy}%"></i></span
							>{ui.info.happy}
						</dd>
					</div>
				</dl>
				{#if ui.info.voice}<p class="voice">「{ui.info.voice}」</p>{/if}
				{#if ui.info.player}<p class="note">あなたが建てた建物</p>{/if}
			</section>
		{/if}
		{#if ui.view === 'infra'}
			<section class="glass legend">
				<strong>地下の仕組み</strong>
				<span><i style:background="#4aa3ff"></i>通信の幹線（流れている）</span>
				<span><i style:background="#b48cff"></i>記録庫へ流れる記録</span>
				<span><i style:background="#ff5a3c"></i>混んでいる所</span>
				<span><i style:background="#3fd0c0"></i>帳簿の倉庫へ流れる予約</span>
				<span><i style:background="#ffb000"></i>門番で止まる接続</span>
				<span><i style:background="#56d68a"></i>直した所・通した接続</span>
				<p>建物を暗くして、地面の下を流れる物だけを光らせている</p>
			</section>
		{/if}
		{#if ui.view === 'happy'}
			<section class="glass legend">
				<strong>満足度</strong>
				<span><i style:background="#56d68a"></i>満足している</span>
				<span><i style:background="#f2c14e"></i>ふつう</span>
				<span><i style:background="#ff6a45"></i>不満がある</span>
			</section>
		{/if}
	</div>

	<div class="layer" bind:this={markers}></div>
	<div class="layer" bind:this={floaters}></div>

	<div class="toasts">
		{#each ui.toasts as t (t.id)}
			<div class="toast {t.kind}" class:out={t.out} role="status">
				<strong>{t.title}</strong>{#if t.body}<span>{t.body}</span>{/if}
				{#if t.actions.length}
					<div class="row">
						{#each t.actions as a (a.label)}
							<button type="button" class:pri={a.pri} onclick={a.run}>{a.label}</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<nav class="toolbar" aria-label="操作">
		{#if ui.hint}<span class="glass hint">{ui.hint}</span>{/if}
		<div class="glass tools">
			{#each TOOLS as t (t.id)}
				<button
					class="tool"
					type="button"
					aria-pressed={ui.tool === t.id}
					onclick={() => game?.setTool(t.id)}
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linejoin="round"
						stroke-linecap="round"
						aria-hidden="true"
					>
						{#if t.id === 'park'}<circle cx="12" cy="9" r="5" />{/if}<path d={t.d} />
					</svg>{t.label}
				</button>
			{/each}
			<span class="sep" aria-hidden="true"></span>
			{#each VIEWS as v (v.id)}
				<button
					class="tool"
					type="button"
					aria-pressed={ui.view === v.id}
					onclick={() => game?.setView(v.id)}
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						{#if v.id === 'happy'}<circle cx="12" cy="12" r="8.5" />{/if}<path d={v.d} />
					</svg>{v.label}
				</button>
			{/each}
		</div>
	</nav>
	<div class="help glass">
		左ドラッグ 移動 ・ 右ドラッグ 回転 ・ ホイール ズーム<br /><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd
		><kbd>D</kbd> 移動 <kbd>Q</kbd><kbd>E</kbd> 回転
		<kbd>Space</kbd> 一時停止<br /><span class="ver">配信 <code>{commit}</code></span>
	</div>

	{#if ui.dialog}
		<div class="modal">
			{#if ui.dialog.kind === 'intro'}
				<div class="card" role="dialog" aria-modal="true" aria-label="はじめに">
					<header>
						<div>
							<span class="kick">はじめに</span>
							<h2>みなと町の町長になった</h2>
							<span class="who">港の小さな町を、町の人の声を聞きながら育てる</span>
						</div>
					</header>
					<ol class="intro">
						<li>
							<b>要望が届く</b><span>町の人が困りごとを持ってくる。街の上に <em>!</em> が出る</span>
						</li>
						<li>
							<b>解説で学ぶ</b><span>困りごとに効く IT の仕組みを、動きを見ながら覚える</span>
						</li>
						<li>
							<b>応えると街が変わる</b><span
								>学んだ手で応えると、街と地下の仕組みが育つ。学ばずに業者へ任せることもできる</span
							>
						</li>
					</ol>
					<div class="opts">
						<button type="button" class="opt good" onclick={() => game?.startIntro()}
							><span
								><strong>町を見て回る</strong><small
									>左ドラッグで移動、右ドラッグで回転、ホイールでズーム</small
								></span
							><b>▶</b></button
						>
					</div>
				</div>
			{:else}
				{@const d = ui.dialog}
				<div class="card" role="dialog" aria-modal="true" aria-label={d.who + 'からの要望'}>
					<header>
						<span class="av big" style:background="{d.color}22" style:color={d.color}>{d.icon}</span
						>
						<div>
							<span class="kick">要望 ・ 期限 あと {d.left} 日</span>
							<h2>{d.title}</h2>
							<span class="who">{d.who}</span>
						</div>
						<button class="x" type="button" aria-label="閉じる" onclick={() => game?.closeDlg()}
							>×</button
						>
					</header>
					<p class="quote">{d.quote}</p>
					<div class="conds">
						{#each d.conds as c (c)}<div><small>条件</small>{c}</div>{/each}
						<div><small>見返り</small>{d.reward}</div>
					</div>
					<button
						type="button"
						class="lessonBtn"
						disabled={d.learned}
						onclick={() => game?.openLesson(d.lid, () => game?.openReq(d.id))}
					>
						<span
							><small
								>この要望に効く解説（{d.lesson.tool} ・ {d.lesson.steps.length} ステップ）</small
							><strong>{d.lesson.title}</strong></span
						>
						<em>{d.learned ? '学んだ ✓' : '解説を受ける →'}</em>
					</button>
					<div class="opts">
						<button
							type="button"
							class="opt good"
							disabled={!(d.learned && d.needOk)}
							onclick={() => game?.answer(d.id, 'learned')}
						>
							<span
								><strong>{d.learnedOpt.label}</strong><small
									>{d.learned
										? d.learnedOpt.note
										: d.needOk
											? '解説を受けると選べる'
											: '先に記録庫を建てると選べる'}</small
								></span
							><b>¥{d.learnedOpt.cost}</b>
						</button>
						<button type="button" class="opt" onclick={() => game?.answer(d.id, 'out')}
							><span><strong>{d.outOpt.label}</strong><small>{d.outOpt.note}</small></span><b
								>¥{d.outOpt.cost}</b
							></button
						>
						<button type="button" class="later" onclick={() => game?.closeDlg()}
							>後回しにする</button
						>
					</div>
				</div>
			{/if}
		</div>
	{/if}
	{#if ui.lesson}
		<TownLesson
			lesson={ui.lesson}
			onclose={() => game?.closeLesson()}
			onfinish={(lid) => game?.finishLesson(lid)}
		/>
	{/if}
</div>

<style>
	/* 試作 docs/prototype/src/index.html の板の置き方と大きさ。色は --dl-* に置き換えた */
	.town {
		--panel: color-mix(in srgb, var(--dl-surface) 84%, transparent);
		position: fixed;
		inset: 0;
		overflow: hidden;
		font-family: var(--dl-font);
		color: var(--dl-text);
		-webkit-font-smoothing: antialiased;
	}
	.town :global(button) {
		min-height: 0;
		min-width: 0;
		padding: 0;
		background: transparent;
		border: 1px solid transparent;
	}
	#view {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		touch-action: none;
		cursor: grab;
	}
	.boot {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		background: var(--dl-bg);
		color: var(--dl-text-muted);
		font-size: 14px;
		z-index: 50;
	}
	.glass {
		background: var(--panel);
		border: 1px solid var(--dl-border);
		border-radius: 14px;
		backdrop-filter: blur(10px) saturate(1.2);
		-webkit-backdrop-filter: blur(10px) saturate(1.2);
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.28);
	}
	.top {
		position: fixed;
		left: calc(12px + env(safe-area-inset-left, 0px));
		right: calc(12px + env(safe-area-inset-right, 0px));
		top: calc(12px + env(safe-area-inset-top, 0px));
		display: flex;
		gap: 10px;
		align-items: stretch;
		pointer-events: none;
		z-index: 5;
	}
	.top > :global(*) {
		pointer-events: auto;
	}
	.brand {
		display: flex;
		gap: 10px;
		align-items: center;
		padding: 8px 14px 8px 10px;
	}
	.brand svg {
		flex: none;
	}
	.brand b {
		display: block;
		font-size: 17px;
		font-weight: 900;
		letter-spacing: 0.06em;
		line-height: 1.1;
	}
	.brand small {
		display: block;
		font-size: 11px;
		color: var(--dl-text-muted);
	}
	.time {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 8px;
	}
	.time .d {
		display: flex;
		flex-direction: column;
		line-height: 1.1;
		padding: 0 8px 0 6px;
		min-width: 88px;
	}
	.time .d span {
		font-size: 11px;
		color: var(--dl-text-muted);
	}
	.time .d strong {
		font-family: var(--dl-font-code);
		font-size: 19px;
	}
	.town .spd {
		min-width: 44px;
		min-height: 44px;
		border-radius: 10px;
		color: var(--dl-text-muted);
		font-size: 12px;
		font-weight: 700;
	}
	.town .spd[aria-pressed='true'] {
		border-color: var(--dl-now);
		color: var(--dl-now);
		background: var(--dl-surface-raised);
	}
	.spacer {
		flex: 1;
	}
	.stats {
		display: flex;
		gap: 2px;
		padding: 6px;
	}
	.stat {
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 2px 12px;
		min-width: 96px;
		border-right: 1px solid var(--dl-border);
		text-align: left;
	}
	.stat:last-child {
		border-right: 0;
	}
	.stat span {
		font-size: 11px;
		color: var(--dl-text-muted);
	}
	.stat strong {
		font-family: var(--dl-font-code);
		font-size: 17px;
		font-weight: 700;
	}
	.stat em {
		font-style: normal;
		font-size: 11px;
		font-family: var(--dl-font-code);
		color: var(--dl-done);
	}
	.town .statBtn {
		border: 0;
		border-right: 1px solid var(--dl-border);
		border-radius: 8px;
		cursor: pointer;
	}
	.town .statBtn:hover {
		background: var(--dl-surface-raised);
	}
	.meter {
		width: 84px;
		height: 6px;
		border-radius: 3px;
		background: var(--dl-border);
		margin-top: 4px;
		overflow: hidden;
	}
	.meter i {
		transition:
			width 0.8s,
			background 0.8s;
	}
	.meter i,
	.bar i {
		display: block;
		height: 100%;
	}
	.good {
		background: var(--dl-done);
	}
	.mid {
		background: var(--dl-warn);
	}
	.bad {
		background: var(--dl-wrong);
	}
	.demand {
		display: flex;
		gap: 6px;
		padding: 8px 12px 6px;
		align-items: flex-end;
	}
	.demand div {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
	}
	.demand .col {
		width: 12px;
		height: 34px;
		border-radius: 3px;
		background: var(--dl-border);
		display: flex;
		align-items: flex-end;
		overflow: hidden;
	}
	.demand .col i {
		display: block;
		width: 100%;
		background: var(--dl-text-muted);
		transition: height 0.8s;
	}
	.demand small {
		font-size: 10px;
		color: var(--dl-text-muted);
	}
	/* requests panel */
	.reqs {
		position: fixed;
		left: 12px;
		top: 86px;
		width: 300px;
		max-height: calc(100% - 200px);
		display: flex;
		flex-direction: column;
		z-index: 4;
	}
	.reqs header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 12px 14px 6px;
	}
	.reqs header strong {
		font-size: 14px;
	}
	.reqs header span {
		font-size: 11px;
		color: var(--dl-text-muted);
	}
	.reqList {
		overflow: auto;
		padding: 4px 8px 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.town .req {
		display: flex;
		gap: 10px;
		align-items: center;
		min-height: 56px;
		padding: 8px 10px;
		border-radius: 11px;
		border: 1px solid var(--dl-border);
		background: color-mix(in srgb, var(--dl-text) 3%, transparent);
		text-align: left;
		cursor: pointer;
		width: 100%;
	}
	.town .req:hover {
		background: color-mix(in srgb, var(--dl-text) 7%, transparent);
	}
	.req.done {
		cursor: default;
		opacity: 0.72;
	}
	.av {
		flex: none;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		font-weight: 900;
		font-size: 14px;
	}
	.av.ok {
		color: var(--dl-done);
		border: 1px solid var(--dl-done);
	}
	.av.big {
		width: 54px;
		height: 54px;
		font-size: 22px;
		border-radius: 14px;
	}
	.req .tx {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.req strong {
		font-size: 13px;
		line-height: 1.35;
	}
	.req small {
		font-size: 11px;
		color: var(--dl-text-muted);
	}
	.req em {
		font-style: normal;
	}
	.req em.hot {
		color: var(--dl-warn);
		font-weight: 700;
	}
	.empty {
		margin: 6px 8px;
		font-size: 12px;
		color: var(--dl-text-muted);
	}
	/* right side */
	.side {
		position: fixed;
		right: 12px;
		top: 86px;
		width: 268px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		z-index: 4;
	}
	.info header,
	.budget header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 12px 4px;
	}
	.info header strong {
		font-size: 15px;
	}
	.info dl {
		margin: 0;
		padding: 4px 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.info dl div {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 12px;
	}
	.info dt {
		color: var(--dl-text-muted);
	}
	.info dd {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: var(--dl-font-code);
	}
	.bar {
		display: inline-block;
		width: 80px;
		height: 6px;
		border-radius: 3px;
		background: var(--dl-border);
		overflow: hidden;
	}
	.voice {
		margin: 6px 12px 12px;
		padding: 8px 10px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--dl-text) 5%, transparent);
		font-size: 12px;
		line-height: 1.6;
	}
	.note {
		margin: 0 12px 12px;
		font-size: 11px;
		color: var(--dl-now);
	}
	.budget h4 {
		margin: 10px 12px 4px;
		font-size: 11px;
		color: var(--dl-text-muted);
		font-weight: 500;
	}
	.budget table {
		width: calc(100% - 24px);
		margin: 0 12px;
		border-collapse: collapse;
		font-size: 12px;
	}
	.budget th {
		text-align: left;
		font-weight: 400;
		padding: 4px 0;
	}
	.budget td {
		text-align: right;
		font-family: var(--dl-font-code);
		font-variant-numeric: tabular-nums;
	}
	.budget tr.sum th,
	.budget tr.sum td {
		border-top: 1px solid var(--dl-border);
		font-weight: 700;
		padding-top: 6px;
	}
	.budget ul {
		list-style: none;
		margin: 0 12px 12px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 11px;
	}
	.budget li {
		display: grid;
		grid-template-columns: 3.4em minmax(0, 1fr) auto;
		gap: 6px;
		align-items: baseline;
	}
	.budget li span:first-child {
		color: var(--dl-text-muted);
		font-family: var(--dl-font-code);
	}
	.budget b {
		font-family: var(--dl-font-code);
		font-weight: 500;
	}
	.pos {
		color: var(--dl-done);
	}
	.neg {
		color: var(--dl-wrong);
	}
	.town :global(.x) {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		border: 1px solid var(--dl-border);
		cursor: pointer;
		font-size: 18px;
		color: var(--dl-text-muted);
	}
	.legend {
		padding: 10px 12px;
		font-size: 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.legend strong {
		font-size: 12px;
	}
	.legend span {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.legend i {
		display: inline-block;
		width: 20px;
		height: 4px;
		border-radius: 2px;
	}
	.legend p {
		margin: 2px 0 0;
		color: var(--dl-text-muted);
		line-height: 1.6;
		font-size: 11px;
	}
	/* bottom toolbar */
	.toolbar {
		position: fixed;
		left: 50%;
		bottom: calc(14px + env(safe-area-inset-bottom, 0px));
		transform: translateX(-50%);
		display: flex;
		gap: 8px;
		align-items: flex-end;
		z-index: 5;
		max-width: calc(100% - 24px);
	}
	.hint {
		position: absolute;
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
		white-space: nowrap;
		padding: 6px 12px;
		font-size: 12px;
	}
	.tools {
		display: flex;
		gap: 4px;
		padding: 6px;
		overflow-x: auto;
	}
	.town .tool {
		min-width: 68px;
		min-height: 58px;
		padding: 4px 6px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		border-radius: 11px;
		color: var(--dl-text);
		cursor: pointer;
		font-size: 11px;
		white-space: nowrap;
	}
	.town .tool:hover {
		background: color-mix(in srgb, var(--dl-text) 6%, transparent);
	}
	.town .tool[aria-pressed='true'] {
		border-color: var(--dl-now);
		background: var(--dl-surface-raised);
		color: var(--dl-now);
	}
	.tool svg {
		width: 24px;
		height: 24px;
	}
	.sep {
		width: 1px;
		background: var(--dl-border);
		margin: 8px 2px;
	}
	/* markers */
	.layer {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 3;
	}
	.town :global(.marker) {
		position: absolute;
		left: 0;
		top: 0;
		pointer-events: auto;
		border: 0;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: -62px 0 0 -40px;
		width: 80px;
	}
	.town :global(.marker .pin) {
		width: 40px;
		height: 40px;
		border-radius: 50% 50% 50% 4px;
		transform: rotate(-45deg);
		background: var(--c);
		display: grid;
		place-items: center;
		box-shadow:
			0 0 0 4px rgba(255, 255, 255, 0.85),
			0 6px 18px rgba(0, 0, 0, 0.4);
		animation: bob 1.4s ease-in-out infinite;
	}
	.town :global(.marker .pin b) {
		transform: rotate(45deg);
		font-size: 20px;
		font-weight: 900;
		color: #fff;
	}
	.town :global(.marker .lbl) {
		margin-top: 10px;
		padding: 2px 8px;
		border-radius: 8px;
		background: var(--panel);
		color: var(--dl-text);
		font-size: 11px;
		font-weight: 700;
		white-space: nowrap;
	}
	@keyframes -global-bob {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 -6px;
		}
	}
	.town :global(.floater) {
		position: absolute;
		left: 0;
		top: 0;
		margin: -14px 0 0 -40px;
		width: 80px;
		text-align: center;
		font-size: 13px;
		font-weight: 900;
		color: #56d68a;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
	}
	@media (prefers-reduced-motion: reduce) {
		.town :global(.marker .pin) {
			animation: none;
		}
	}
	/* toasts */
	.toasts {
		position: fixed;
		left: 50%;
		top: 86px;
		transform: translateX(-50%);
		width: min(520px, calc(100% - 660px));
		min-width: 300px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		z-index: 6;
		pointer-events: none;
	}
	.toast {
		pointer-events: auto;
		padding: 12px 14px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--dl-surface) 94%, transparent);
		border: 1px solid var(--dl-border);
		display: flex;
		flex-direction: column;
		gap: 4px;
		animation: tin 0.35s ease both;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
	}
	.toast strong {
		font-size: 13px;
	}
	.toast span {
		font-size: 12px;
		line-height: 1.65;
	}
	.toast.req {
		border-color: var(--dl-warn);
	}
	.toast.req strong {
		color: var(--dl-warn);
	}
	.toast.learn {
		border-color: var(--dl-done);
	}
	.toast.learn strong {
		color: var(--dl-done);
	}
	.toast.warn {
		border-color: var(--dl-wrong);
	}
	.toast.warn strong {
		color: var(--dl-wrong);
	}
	.toast .row {
		display: flex;
		gap: 6px;
		margin-top: 6px;
		flex-wrap: wrap;
	}
	.town .toast .row button {
		min-height: 40px;
		padding: 0 12px;
		border-radius: 9px;
		border: 1px solid var(--dl-border);
		cursor: pointer;
		font-size: 12px;
	}
	.town .toast .row button.pri {
		border-color: var(--dl-now);
		color: var(--dl-now);
	}
	.toast.out {
		opacity: 0;
		transform: translateY(-6px);
		transition: all 0.5s;
	}
	@keyframes -global-tin {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	/* dialogs（解説の板 TownLesson.svelte とも共通） */
	.town :global(.modal) {
		position: fixed;
		inset: 0;
		background: rgba(4, 7, 11, 0.5);
		display: grid;
		place-items: center;
		padding: 16px;
		z-index: 20;
	}
	.town :global(.card) {
		width: min(640px, 100%);
		max-height: calc(100% - 24px);
		overflow: auto;
		background: var(--dl-surface);
		border: 1px solid var(--dl-border-strong);
		border-radius: 18px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		animation: tin 0.3s ease both;
	}
	.town :global(.card.wide) {
		width: min(860px, 100%);
	}
	.town :global(.card header) {
		display: flex;
		gap: 14px;
		align-items: center;
		padding: 16px 18px;
		background: var(--dl-surface-raised);
		border-bottom: 1px solid var(--dl-border);
	}
	.town :global(.card header > div) {
		flex: 1;
		min-width: 0;
	}
	.town :global(.card .kick) {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--dl-now);
	}
	.town :global(.card h2) {
		margin: 2px 0;
		font-size: 19px;
		line-height: 1.35;
	}
	.town :global(.card .who) {
		font-size: 12px;
		color: var(--dl-text-muted);
	}
	.quote {
		margin: 16px 18px 10px;
		font-size: 14px;
		line-height: 1.85;
	}
	.conds {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
		margin: 0 18px 12px;
	}
	.conds div {
		padding: 8px 10px;
		border-radius: 10px;
		background: var(--dl-bg);
		font-size: 12px;
		line-height: 1.5;
	}
	.conds small {
		display: block;
		color: var(--dl-text-muted);
		font-size: 10px;
	}
	.town .lessonBtn {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		width: calc(100% - 36px);
		margin: 0 18px 10px;
		min-height: 60px;
		padding: 10px 14px;
		border-radius: 12px;
		border: 1px solid var(--dl-now);
		background: var(--dl-surface-raised);
		text-align: left;
		cursor: pointer;
	}
	.lessonBtn small {
		display: block;
		font-size: 11px;
		color: var(--dl-now);
	}
	.lessonBtn strong {
		font-size: 15px;
	}
	.lessonBtn em {
		font-style: normal;
		font-weight: 700;
		font-size: 13px;
	}
	.town .lessonBtn:disabled {
		opacity: 0.75;
		cursor: default;
		color: var(--dl-text);
	}
	.opts {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 0 18px 18px;
	}
	.town .opt {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		min-height: 58px;
		padding: 10px 14px;
		border-radius: 12px;
		border: 1px solid var(--dl-border-strong);
		background: var(--dl-bg);
		text-align: left;
		cursor: pointer;
	}
	.opt strong {
		display: block;
		font-size: 14px;
	}
	.opt small {
		display: block;
		font-size: 11px;
		color: var(--dl-text-muted);
	}
	.opt b {
		font-family: var(--dl-font-code);
		font-size: 14px;
	}
	.town .opt.good:not(:disabled) {
		border: 2px solid var(--dl-done);
	}
	.opt.good:not(:disabled) small {
		color: var(--dl-done);
	}
	.town .opt:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		border-style: dashed;
	}
	.town .later {
		min-height: 44px;
		border-radius: 10px;
		border: 1px solid var(--dl-border);
		color: var(--dl-text-muted);
		cursor: pointer;
	}
	.intro {
		margin: 16px 18px;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
		counter-reset: i;
	}
	.intro li {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px 12px 10px 46px;
		border-radius: 12px;
		background: var(--dl-bg);
		position: relative;
		counter-increment: i;
	}
	.intro li::before {
		content: counter(i);
		position: absolute;
		left: 12px;
		top: 12px;
		width: 24px;
		height: 24px;
		border-radius: 7px;
		background: var(--dl-surface-raised);
		color: var(--dl-now);
		display: grid;
		place-items: center;
		font-weight: 900;
		font-size: 12px;
	}
	.intro b {
		font-size: 14px;
	}
	.intro span {
		font-size: 12px;
		line-height: 1.7;
	}
	.intro em {
		font-style: normal;
		color: var(--dl-warn);
		font-weight: 900;
	}
	.help {
		position: fixed;
		right: 12px;
		bottom: 14px;
		z-index: 4;
		padding: 8px 12px;
		font-size: 11px;
		color: var(--dl-text-muted);
		line-height: 1.7;
	}
	.help kbd {
		font-size: 10px;
		padding: 1px 5px;
		border: 1px solid var(--dl-border);
		border-radius: 4px;
		color: var(--dl-text);
	}
	.help code {
		font-size: 10px;
	}
	@media (max-width: 1100px) {
		.reqs {
			width: 260px;
		}
		.side {
			width: 230px;
		}
		.help {
			display: none;
		}
		.toasts {
			width: min(460px, calc(100% - 32px));
			top: 150px;
		}
	}
	@media (max-width: 760px) {
		.top {
			left: 8px;
			right: 8px;
			top: 8px;
			flex-wrap: wrap;
			gap: 6px;
		}
		.brand small,
		.demand {
			display: none;
		}
		.stats {
			order: 3;
			width: 100%;
			overflow-x: auto;
		}
		.stat {
			min-width: 84px;
		}
		.reqs {
			left: 8px;
			right: 8px;
			width: auto;
			top: auto;
			bottom: 96px;
			max-height: 30%;
		}
		.side {
			left: 8px;
			right: 8px;
			width: auto;
			top: 150px;
		}
		.toolbar {
			left: 8px;
			right: 8px;
			transform: none;
			bottom: 8px;
			max-width: none;
		}
		.tools {
			width: 100%;
		}
		.conds {
			grid-template-columns: 1fr;
		}
		.toasts {
			top: 200px;
			min-width: 0;
		}
	}
</style>
