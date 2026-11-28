<script lang="ts">
	// 学習画面 第 3 版（learn-standard.md 第 15〜19 章。下限は試作 learn11）。
	// 上：題・4 つの使い方の釦・指標の帯。左：図（主役）。右：語り。下：ステップの帯（見る の時）。
	// 図は (ステップ, 前のステップ, 時計) から描く（CLAUDE.md 第 8 章）。時計は player.ts の純粋な関数で進める
	import { untrack } from 'svelte';
	import type { V3Lesson } from '../../learn/check-v3.ts';
	import { markTerms, type Term } from '../../learn/terms.ts';
	import { MODES, modeAfter, nextLabel, type Mode } from '../../learn/modes.ts';
	import { countAt, flowAt, frameDt, replay, start, tick, togglePlay } from '../../learn/player.ts';
	import { metricsUpTo, paraNow, splitNum, stepDur, stripOf } from '../../learn/view3.ts';
	import { sceneAt } from '../../learn/scene/layout.ts';
	import { tokensAt } from '../../learn/scene/cue.ts';
	import { localRect, placeTip } from '../../learn/scene/tip.ts';
	import Scene3 from '../scene/Scene3.svelte';
	import Token from '../scene/kit/Token.svelte';
	import Anatomy from '../scene/kit/Anatomy.svelte';
	import Tip from '../scene/label/Tip.svelte';
	import LabPanel from './LabPanel.svelte';
	import LabFigure from './LabFigure.svelte';
	import LabFigureMem from './LabFigureMem.svelte';
	import Code from '../scene/label/Code.svelte';
	import TryPanel3 from './TryPanel3.svelte';
	import TryFigure from './TryFigure.svelte';
	import TryFigureK8s from './TryFigureK8s.svelte';
	import TryFigureMem from './TryFigureMem.svelte';
	import RecallPanel3 from './RecallPanel3.svelte';
	import RecallFigure from './RecallFigure.svelte';
	import { LABS, type LabId } from '../../learn/lab.ts';
	import { makeL3 } from './probe.ts';
	import { startTry, tasksDone, typeLine, type TryScene } from '../../learn/try3.ts';
	import type { RecallSet } from '../../learn/recall3.ts';
	import { loadProgress, markDone, saveProgress } from '../../progress.ts';

	type Props = {
		lesson: V3Lesson;
		terms: readonly Term[];
		lab: LabId;
		tryScene: TryScene;
		recall: RecallSet;
	};
	let { lesson, terms, lab, tryScene, recall }: Props = $props();

	const KINDS: Record<string, string> = {
		intro: '準備',
		problem: '問題',
		mechanism: '仕組み',
		internals: '中身',
		fail: '失敗',
		fix: '解決',
		technique: '技',
		tradeoff: '代償',
		numbers: '数',
		realworld: '実際には',
		ops: '運用',
		teach: '教えるとき',
		summary: 'まとめ'
	};

	let mode = $state<Mode>('watch');
	let step = $state(0);
	/** 「中身まで」を開いているか（ステップを移ると閉じる） */
	let deepOpen = $state(false);
	let prev = $state<number | null>(null);
	let clock = $state(start());
	/** 描画の時刻（線の点・試すの育つ動き。状態は変えない） */
	let now = $state(0);
	/** 指標の数え上げ：ステップに入ってからの時間と、前の値 */
	let mT = $state(0);
	let mFrom = $state<Record<string, string>>({});
	let reduce = $state(false);

	const mine = $derived(
		lesson.terms.map((id) => terms.find((t) => t.id === id)).filter((t): t is Term => !!t)
	);
	const termOf = $derived(new Map(terms.map((t) => [t.id, t])));
	const st = $derived(lesson.steps[step]);
	const dur = $derived(stepDur(st));
	const objs = $derived.by(() => {
		const o = { ...lesson.objs };
		for (const [id, n] of Object.entries(st.names ?? {})) if (o[id]) o[id] = { ...o[id], name: n };
		return o;
	});
	const prevLayout = $derived(prev === null ? null : (lesson.steps[prev]?.layout ?? null));
	const at = $derived(sceneAt(st.layout, prevLayout, clock.t, { reduce }));
	const toks = $derived(tokensAt(st.tokens ?? [], at, clock.t));
	const para = $derived(paraNow(st, st.paras.length, clock.t));
	const metNow = $derived(metricsUpTo(lesson.steps, step));

	// 試す・やってみる・思い出す の状態
	const startVals = () =>
		Object.fromEntries(LABS[lab].knobs.map((k) => [k.k, k.v])) as Record<string, number>;
	// レッスンを替える時は画面ごと作り直す（親が {#key} で包む）ので、始めの値は 1 回だけ読む
	let labVals = $state<Record<string, number>>(untrack(startVals));
	let labAt = $state(0);
	let tryState = $state(startTry(untrack(() => tryScene)));
	let rqi = $state(0);
	let rhit = $state<string | null>(null);
	let toastText = $state('');

	function showMetric(key: string): string {
		const to = metNow[key];
		if (to === undefined) return '—';
		if (mode !== 'watch') return to;
		const a = splitNum(mFrom[key] ?? '');
		const b = splitNum(to);
		if (!a || !b || a.unit !== b.unit || a.n === b.n) return to;
		const v = countAt(a.n, b.n, mT);
		return (b.comma ? v.toLocaleString('en-US') : String(v)) + b.unit;
	}

	function go(i: number) {
		if (i < 0 || i >= lesson.steps.length || i === step) return;
		mFrom = metricsUpTo(lesson.steps, step);
		prev = step;
		step = i;
		deepOpen = false;
		clock = replay(clock);
		mT = 0;
	}
	function setMode(m: Mode) {
		mode = m;
		clock = replay(clock);
		if (m === 'quiz') {
			rqi = 0;
			rhit = null;
		}
	}
	function next() {
		if (mode === 'watch' && step < lesson.steps.length - 1) return go(step + 1);
		const n = modeAfter(mode);
		if (n) setMode(n);
	}
	function onsend(line: string) {
		const was = tasksDone(tryScene, tryState).every(Boolean);
		tryState = typeLine(tryScene, tryState, line);
		if (!was && tasksDone(tryScene, tryState).every(Boolean)) {
			saveProgress(markDone(loadProgress(), lesson.id));
			toastText = 'やることを全部終えた。修了の記録に残した';
			setTimeout(() => (toastText = ''), 3200);
		}
	}

	$effect(() => {
		reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		let raf = 0;
		let last = performance.now();
		const t0 = last;
		const f = (n: number) => {
			const dt = frameDt(n - last);
			last = n;
			now = n - t0;
			clock = tick(clock, dt, dur, { reduce });
			mT += dt;
			raf = requestAnimationFrame(f);
		};
		raf = requestAnimationFrame(f);
		return () => cancelAnimationFrame(raf);
	});

	// 測る道具の窓口（look-learn.ts。読むだけ）
	$effect(() => {
		const w = window as unknown as { __l3?: unknown };
		w.__l3 = makeL3({
			steps: lesson.steps,
			termName: (id) => termOf.get(id)?.t,
			kindName: (k) => KINDS[k] ?? k,
			state: () => ({ step, t: clock.t, playing: clock.playing }),
			go,
			mode: setMode,
			root: () => root ?? null
		});
		return () => {
			delete w.__l3;
		};
	});

	function onkey(e: KeyboardEvent) {
		const tg = e.target as HTMLElement | null;
		if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
		if (mode !== 'watch') return;
		if (e.key === 'ArrowRight') go(step + 1);
		else if (e.key === 'ArrowLeft') go(step - 1);
		else if (e.key === 'r' || e.key === 'R') clock = replay(clock);
		else if (e.key === ' ') {
			clock = togglePlay(clock);
			e.preventDefault();
		}
	}

	// 右の欄・指標の言葉の吹き出し（LS3-T6・T7・H4）
	let root = $state<HTMLDivElement>();
	let tip = $state<{ term: Term; rect: DOMRect } | null>(null);
	let tipSize = $state({ w: 240, h: 70 });
	const tipAt = $derived.by(() => {
		if (!tip || !root) return null;
		const box = root.getBoundingClientRect();
		return placeTip(localRect(tip.rect, box), tipSize, { w: box.width, h: box.height });
	});
	function pickTerm(e: Event) {
		const el = (e.target as Element | null)?.closest?.('[data-tw]');
		const id = el?.getAttribute('data-tw');
		const t = id ? termOf.get(id) : undefined;
		tip = el && t ? { term: t, rect: el.getBoundingClientRect() } : null;
	}
	const anatomyParts = $derived(
		(st.intro?.anatomy ?? []).flatMap((a, i) => [
			...(a.pre ? [{ text: a.pre }] : []),
			{
				text: a.text,
				color: a.color,
				note: a.note,
				term: a.term,
				row: i === 1 ? 1 : i === 2 ? 2 : 0
			},
			...(a.post ? [{ text: a.post }] : [])
		])
	);
	const firsts = $derived(st.first.map((id) => termOf.get(id)).filter((t): t is Term => !!t));
	const introTerms = $derived(
		(st.intro?.terms ?? []).map((id) => termOf.get(id)).filter((t): t is Term => !!t)
	);
	const last = $derived(step === lesson.steps.length - 1);
	const strip = $derived(stripOf(st));
	/** やってみる：打ちかけの行（頼みの欄と端末の欄で分け合う） */
	let tryTyped = $state('');
</script>

<svelte:window onkeydown={onkey} />

<div
	class="v3"
	bind:this={root}
	data-testid="learn-v3"
	data-mode={mode}
	data-step={step}
	data-view={lesson.view ?? 'stack'}
	role="presentation"
	onpointerover={pickTerm}
	onfocusin={pickTerm}
>
	<header class="top">
		<div class="ttl">
			<small>{lesson.kick}</small>
			<h1>{lesson.title}</h1>
			<p>{lesson.goal}</p>
		</div>
		<nav class="modes" aria-label="使い方" data-l3-modes>
			{#each MODES as m, i (m.id)}
				<button
					type="button"
					class="hov"
					data-d={m.desc}
					aria-pressed={mode === m.id}
					onclick={() => setMode(m.id)}><b>{i + 1}</b>{m.label}</button
				>
			{/each}
		</nav>
		{#if mode === 'watch'}
			<dl class="mets" data-l3-metrics>
				{#each lesson.metrics ?? [] as m (m.key)}
					<!-- 札の全体（名前と値）に乗せると説明（LS3-T7・H4） -->
					<div
						class="met"
						class:hov={!m.term}
						data-metric={m.key}
						data-tw={m.term}
						data-d={m.term ? undefined : m.desc}
					>
						<dt>
							<button type="button" class="mlab" class:tl={!!m.term} data-tw={m.term}
								>{m.label}</button
							>
						</dt>
						<dd>{showMetric(m.key)}</dd>
					</div>
				{/each}
			</dl>
		{/if}
	</header>

	{#snippet narr()}
		{#each st.paras as p, i (i)}
			<p class="para" class:now={i === para} class:seen={i < para}>
				{#each markTerms(p, mine) as part, j (j)}{#if part.term}<button
							type="button"
							class="tw"
							data-tw={part.term}>{part.text}</button
						>{:else}{part.text}{/if}{/each}
			</p>
		{/each}
	{/snippet}

	<div class="main" data-l3-side>
		<div class="figcol">
			<section class="fig" aria-label="図">
				{#if mode === 'watch'}
					<Scene3
						{objs}
						layout={st.layout}
						prev={prevLayout}
						t={clock.t}
						{reduce}
						label={st.title}
						hl={st.hl ?? []}
						links={st.links ?? []}
						flow={flowAt(now, { reduce })}
						terms={mine}
						pods={st.pods}
						down={st.down}
						lists={st.lists}
					>
						{#snippet over(uik)}
							{#if st.intro}
								<Anatomy x={500} y={110} parts={anatomyParts} t={clock.t} {uik} />
							{/if}
							{#if st.code && lesson.code}
								<Code
									file={lesson.code.file}
									lines={st.code.lines ?? lesson.code.lines}
									cur={st.code.cur}
									done={st.code.done}
									out={st.code.out}
									t={clock.t}
									{uik}
								/>
							{/if}
							{#each toks as k, i (i)}
								<Token x={k.x} y={k.y} label={k.name} tone={k.tone} op={k.op} {uik} />
							{/each}
						{/snippet}
					</Scene3>
					{#if deepOpen && st.deep}
						<div class="deepcard" role="note" data-testid="deepcard">
							<b>中身まで（実装の名前と数）</b>
							<p>{st.deep}</p>
							<button
								type="button"
								class="hov"
								data-d="閉じる"
								aria-label="閉じる"
								onclick={() => (deepOpen = false)}>×</button
							>
						</div>
					{/if}
					<div class="play">
						<button
							type="button"
							class="hov"
							data-d="最初から流し直す（R）"
							onclick={() => (clock = replay(clock))}>↻</button
						>
						<button
							type="button"
							class="hov"
							data-d="動きを止める・動かす（Space）"
							aria-pressed={!clock.playing}
							onclick={() => (clock = togglePlay(clock))}>{clock.playing ? '❚❚' : '▶'}</button
						>
					</div>
				{:else if mode === 'lab'}
					{#if lab === 'mem'}
						<LabFigureMem vals={labVals} t={(now - labAt) / 1000} />
					{:else}
						<LabFigure {lab} vals={labVals} t={(now - labAt) / 1000} />
					{/if}
				{:else if mode === 'try'}
					{#if tryScene.id === 'k8s'}
						<TryFigureK8s scene={tryScene} st={tryState} t={now} />
					{:else if tryScene.id === 'mem'}
						<TryFigureMem st={tryState} t={now} />
					{:else}
						<TryFigure scene={tryScene} st={tryState} t={now} />
					{/if}
				{:else}
					<RecallFigure
						q={recall.qs[rqi]}
						set={lab}
						answered={rhit !== null}
						t={now}
						onhit={(id) => (rhit = id)}
					/>
				{/if}
			</section>
			{#if mode === 'watch' && strip}
				<!-- 図の下の帯：囲みと変わったこと（言葉をそろえるステップは語りも）。右の欄に内側のスクロールを作らない（LS-A6） -->
				<div class="strip" data-testid="strip">
					{#if strip.paras}
						<div class="snarr">{@render narr()}</div>
					{/if}
					{#if strip.note}
						<div class="callout"><b>{strip.note[0]}</b>{strip.note[1]}</div>
					{/if}
					{#if strip.changes.length}
						<div class="chg">
							<h4>変わったこと</h4>
							<ul>
								{#each strip.changes as [m, t], i (i)}
									<li>
										<i class="c{m === '+' ? 'p' : m === '-' ? 'm' : 't'}"
											>{m === '-' ? '−' : m === '~' ? '〜' : '+'}</i
										>{t}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/if}
			{#if mode === 'lab'}
				<!-- 予想の問いは図の下へ（答えると説明が足されて伸びる。右の欄に内側のスクロールを作らない） -->
				<div class="strip tbrief" data-testid="strip">
					<LabPanel part="preds" lab={LABS[lab]} />
				</div>
			{/if}
			{#if mode === 'try'}
				<!-- 頼み・やることは図の下へ。右の欄は見本と端末（640×520 以上。LS-P5。内側のスクロールを作らない） -->
				<div class="strip tbrief" data-testid="strip">
					<TryPanel3 scene={tryScene} st={tryState} {onsend} part="brief" bind:typed={tryTyped} />
				</div>
			{/if}
		</div>

		<aside class="side" class:wide={mode === 'try'}>
			{#if mode === 'watch'}
				<div class="sbody">
					<div class="sn">
						<span>ステップ {step + 1} / {lesson.steps.length}</span>
						<span class="kind k-{st.kind}">{KINDS[st.kind]}</span>
					</div>
					<h2>{st.title}</h2>
					{#if st.intro}
						<div class="words terms big">
							<h3>この教材で使う言葉</h3>
							<dl>
								{#each introTerms as t (t.id)}
									<div>
										<dt>{t.t}</dt>
										<dd>{t.d}</dd>
									</div>
								{/each}
							</dl>
						</div>
					{/if}
					{#if !st.intro}{@render narr()}{/if}
					{#if !st.intro && firsts.length}
						<!-- 初めて出る言葉は名前の札で並べ、説明は乗せる・押す・Tab で吹き出しに出す（LS3-T5・H4。内側のスクロールを作らない） -->
						<div class="words small terms" data-testid="firsts">
							<h3>このステップで初めて出る言葉<small>（乗せると説明）</small></h3>
							<ul class="chips">
								{#each firsts as t (t.id)}
									<li><button type="button" class="chip" data-tw={t.id}>{t.t}</button></li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if st.deep}
						<!-- 開くと図の下の方に札で重ねる（右の欄を伸ばさない。内側のスクロールを作らない） -->
						<button
							type="button"
							class="deep"
							aria-expanded={deepOpen}
							data-testid="deep"
							onclick={() => (deepOpen = !deepOpen)}
							>{deepOpen ? '▼' : '▶'} 中身まで（実装の名前と数）</button
						>
					{/if}
				</div>
				<div class="sfoot">
					<button
						class="back hov"
						type="button"
						data-d="前のステップ（←）"
						disabled={step === 0}
						onclick={() => go(step - 1)}>←</button
					>
					<button class="next" type="button" data-testid="next" onclick={next}>
						<span
							><small>{last ? '見るは終わり' : '次へ'}</small>{last
								? nextLabel('watch')
								: lesson.steps[step + 1].title}</span
						><span>→</span>
					</button>
				</div>
			{:else}
				<div class="sbody" class:fill={mode === 'try'}>
					{#if mode === 'lab'}
						<LabPanel
							part="knobs"
							lab={LABS[lab]}
							onchange={(v) => {
								labVals = v;
								labAt = now;
							}}
						/>
					{:else if mode === 'try'}
						<TryPanel3 scene={tryScene} st={tryState} {onsend} part="term" bind:typed={tryTyped} />
					{:else}
						<RecallPanel3
							set={recall}
							qi={rqi}
							onqi={(i) => {
								rqi = i;
								rhit = null;
							}}
							hitPick={rhit}
						/>
					{/if}
				</div>
				{#if nextLabel(mode)}
					<div class="sfoot">
						<button class="next" type="button" data-testid="next" onclick={next}>
							<span><small>次へ</small>{nextLabel(mode)}</span><span>→</span>
						</button>
					</div>
				{/if}
			{/if}
		</aside>
	</div>

	{#if mode === 'watch'}
		<nav class="steps" aria-label="ステップ" data-l3-steps>
			{#each lesson.steps as s, i (i)}
				<button
					type="button"
					class="hov up"
					class:on={i === step}
					class:done={i < step}
					data-d="{KINDS[s.kind]}：{s.title}"
					aria-current={i === step ? 'step' : undefined}
					onclick={() => go(i)}><b>{i < step ? '✓' : i + 1}</b>{s.short ?? s.title}</button
				>
			{/each}
		</nav>
	{/if}

	{#if tip && tipAt}
		<Tip
			term={tip.term}
			left={tipAt.left}
			top={tipAt.top}
			onsize={(w, h) => (tipSize = { w, h })}
		/>
	{/if}
	{#if toastText}<div class="toast" role="status">{toastText}</div>{/if}
</div>

<style>
	.v3 {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 10px;
		height: 100vh;
		min-height: 720px;
		padding: 10px 16px;
		box-sizing: border-box;
		color: var(--dl-ink);
		font-family: var(--dl-font);
	}
	.top {
		display: flex;
		align-items: center;
		gap: 18px;
		flex-wrap: wrap;
	}
	.ttl {
		flex: 1 1 360px;
		min-width: 0;
	}
	.ttl small {
		color: var(--dl-text-muted);
		font-size: 12.5px;
	}
	.ttl h1 {
		margin: 2px 0;
		font-size: 20px;
	}
	.ttl p {
		margin: 0;
		font-size: 13px;
		color: var(--dl-text-muted);
	}
	.modes {
		display: flex;
		gap: 6px;
	}
	.modes button {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border-radius: 999px;
		border: 1.5px solid var(--dl-border-strong);
		background: var(--dl-surface);
		color: var(--dl-ink);
		font-size: 14px;
		cursor: pointer;
	}
	.modes button b {
		display: inline-grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--dl-border);
		font-size: 12px;
	}
	.modes button[aria-pressed='true'] {
		background: var(--dl-ink);
		color: var(--dl-bg);
	}
	.mets {
		display: flex;
		gap: 6px;
		margin: 0;
	}
	.met {
		padding: 4px 10px;
		border-radius: 10px;
		background: var(--dl-surface);
		border: 1px solid var(--dl-border);
		text-align: center;
		min-width: 64px;
	}
	.met dt {
		font-size: 12px;
		color: var(--dl-text-muted);
	}
	.tw,
	.mlab {
		all: unset;
		font: inherit;
		color: inherit;
	}
	.mlab.tl,
	.tw {
		text-decoration: underline dotted;
		text-underline-offset: 3px;
		cursor: help;
	}
	.met dd {
		margin: 0;
		font-family: var(--dl-font-code);
		font-weight: 700;
		font-size: 14px;
	}
	.main {
		flex: 1 1 auto;
		display: flex;
		gap: 14px;
		min-height: 0;
	}
	/* 図と、図の下の帯（囲み・変わったこと。言葉をそろえるステップは語りも） */
	.figcol {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.strip {
		flex: 0 0 auto;
		display: flex;
		gap: 10px;
		align-items: stretch;
		font-size: 13.5px;
		line-height: 1.55;
	}
	.strip > div {
		flex: 1 1 0;
		min-width: 0;
		margin: 0;
		padding: 8px 12px;
		border-radius: 14px;
	}
	.strip .snarr {
		flex: 3 1 0;
		padding: 0;
	}
	.strip .callout,
	.strip .chg {
		flex: 1.5 1 0;
	}
	.strip .snarr .para {
		margin: 0 0 2px;
		padding: 1px 8px;
		font-size: 13.5px;
		line-height: 1.55;
	}
	.strip .chg {
		background: var(--dl-surface);
		border: 1px solid var(--dl-border);
	}
	.strip .chg h4 {
		margin: 0 0 2px;
	}
	.fig {
		position: relative;
		flex: 1 1 auto;
		min-height: 0;
		min-width: 0;
		border-radius: 18px;
		background: var(--dl-scene-bg);
		border: 1px solid var(--dl-border);
		overflow: hidden;
	}
	.play {
		position: absolute;
		right: 12px;
		bottom: 12px;
		display: flex;
		gap: 6px;
	}
	.play button {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1.5px solid var(--dl-border-strong);
		background: var(--dl-surface);
		color: var(--dl-ink);
		cursor: pointer;
	}
	.side {
		flex: 0 0 440px;
		display: flex;
		flex-direction: column;
		min-height: 0;
		border-radius: 18px;
		background: var(--dl-surface);
		border: 1px solid var(--dl-border);
	}
	/* やってみる は端末を大きく（第 19 章・LS-P5） */
	.side.wide {
		flex-basis: 700px;
	}
	.tbrief {
		display: block;
		padding: 10px 14px;
		border-radius: 14px;
		background: var(--dl-surface);
		border: 1px solid var(--dl-border);
	}
	/* やってみる：右の欄は端末だけで埋める（過去の出力だけがスクロールする） */
	.sbody.fill {
		display: flex;
		flex-direction: column;
		padding: 12px 14px;
	}
	.sbody.fill > :global(.try) {
		flex: 1 1 auto;
		min-height: 0;
	}
	.sbody {
		flex: 1 1 auto;
		overflow: auto;
		padding: 14px 16px;
		font-size: 14px;
		line-height: 1.7;
	}
	.sn {
		display: flex;
		justify-content: space-between;
		font-size: 12.5px;
		color: var(--dl-text-muted);
	}
	.kind {
		padding: 1px 10px;
		border-radius: 999px;
		background: var(--dl-kind-1-bg);
		color: var(--dl-kind-1-fg);
		font-weight: 700;
	}
	.k-fail {
		background: var(--dl-kind-4-bg);
		color: var(--dl-kind-4-fg);
	}
	.k-intro,
	.k-summary {
		background: var(--dl-kind-3-bg);
		color: var(--dl-kind-3-fg);
	}
	.sbody h2 {
		font-size: 17px;
		margin: 6px 0 8px;
		line-height: 1.45;
	}
	.para {
		margin: 0 0 8px;
		padding: 4px 8px;
		border-left: 3px solid transparent;
		border-radius: 4px;
		opacity: 0.62;
		transition: opacity var(--dl-motion-ui, 0.3s);
	}
	.para.seen {
		opacity: 0.85;
	}
	.para.now {
		opacity: 1;
		border-left-color: var(--dl-obj-blue);
		background: color-mix(in srgb, var(--dl-obj-blue) 8%, transparent);
	}
	.words {
		margin: 6px 0 10px;
		padding: 8px 10px;
		border-radius: 12px;
		background: var(--dl-surface-raised);
		border: 1px solid var(--dl-border);
	}
	.words h3 {
		margin: 0 0 4px;
		font-size: 13px;
	}
	.words dl {
		margin: 0;
	}
	.words div {
		display: grid;
		grid-template-columns: 7.5em 1fr;
		gap: 6px;
		font-size: 13px;
		line-height: 1.4;
		padding: 1px 0;
	}
	.words dt {
		font-weight: 700;
		overflow-wrap: anywhere;
	}
	.words dd {
		margin: 0;
	}
	.words h3 small {
		font-weight: 400;
		color: var(--dl-text-muted);
		margin-left: 4px;
	}
	.chips {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chip {
		font: 700 13px/1.4 var(--dl-font);
		color: var(--dl-ink);
		padding: 3px 10px;
		border-radius: 999px;
		border: 1px dotted var(--dl-border-strong);
		background: var(--dl-surface);
		cursor: help;
	}
	.chip:hover,
	.chip:focus-visible {
		border-style: solid;
		background: var(--dl-surface-raised);
	}
	.callout {
		margin: 8px 0;
		padding: 8px 10px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--dl-obj-yellow) 14%, transparent);
		font-size: 13.5px;
	}
	.callout b {
		display: block;
		font-size: 13px;
	}
	.chg h4 {
		margin: 8px 0 2px;
		font-size: 13px;
	}
	.chg ul {
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 13.5px;
	}
	.chg i {
		display: inline-block;
		width: 1.4em;
		font-style: normal;
		font-weight: 800;
	}
	.cp {
		color: var(--dl-obj-green);
	}
	.cm {
		color: var(--dl-obj-red);
	}
	.ct {
		color: var(--dl-obj-orange);
	}
	.deep {
		margin-top: 8px;
		min-height: 0;
		min-width: 0;
		padding: 2px 0;
		border: 0;
		background: none;
		font-size: 13px;
		font-weight: 700;
		color: var(--dl-ink);
		cursor: pointer;
	}
	.deepcard {
		position: absolute;
		left: 12px;
		right: 110px;
		bottom: 12px;
		padding: 10px 40px 10px 14px;
		border-radius: 14px;
		background: var(--dl-surface);
		border: 1.5px solid var(--dl-border-strong);
		box-shadow: 0 6px 20px rgb(0 0 0 / 0.15);
		font-size: 13.5px;
		line-height: 1.6;
		z-index: 5;
	}
	.deepcard p {
		margin: 2px 0 0;
	}
	.deepcard button {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 28px;
		height: 28px;
		min-width: 0;
		min-height: 0;
		padding: 0;
		border-radius: 50%;
	}
	.sfoot {
		display: flex;
		gap: 8px;
		padding: 10px 14px 14px;
	}
	.sfoot button {
		border-radius: 14px;
		border: 1.5px solid var(--dl-border-strong);
		background: var(--dl-surface-raised);
		color: var(--dl-ink);
		cursor: pointer;
		font-size: 14px;
	}
	.back {
		flex: 0 0 48px;
	}
	.next {
		flex: 1 1 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 14px;
		text-align: left;
		background: var(--dl-ink) !important;
		color: var(--dl-bg) !important;
	}
	.next small {
		display: block;
		color: inherit;
		font-size: 12px;
		opacity: 0.8;
	}
	.steps {
		flex: 0 0 auto;
		display: flex;
		gap: 4px;
		overflow-x: auto;
		padding-bottom: 2px;
	}
	.steps button {
		flex: 1 0 auto;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border-radius: 12px;
		border: 1px solid var(--dl-border);
		background: var(--dl-surface);
		color: var(--dl-ink);
		font-size: 13px;
		cursor: pointer;
		transition: transform var(--dl-motion-ui, 0.2s);
	}
	.steps button b {
		display: inline-grid;
		place-items: center;
		min-width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--dl-border);
		font-size: 12px;
	}
	.steps button.on {
		border-color: var(--dl-ink);
		font-weight: 700;
	}
	.steps button.done b {
		background: var(--dl-done);
		color: #fff;
	}
	.steps button.up:hover {
		transform: translateY(-3px);
	}
	/* 釦・ステップ・指標の説明（LS3-H2・H3） */
	.hov {
		position: relative;
	}
	.hov[data-d]:hover::after,
	.hov[data-d]:focus-visible::after,
	.met.hov[data-d]:focus-within::after {
		content: attr(data-d);
		position: absolute;
		left: 50%;
		top: calc(100% + 6px);
		transform: translateX(-50%);
		z-index: 20;
		width: max-content;
		max-width: 280px;
		padding: 6px 10px;
		border-radius: 10px;
		background: var(--dl-card-dark);
		color: #f4f2ec;
		font-size: 13px;
		font-weight: 500;
		line-height: 1.5;
		white-space: normal;
		pointer-events: none;
	}
	.steps .hov[data-d]:hover::after {
		top: auto;
		bottom: calc(100% + 6px);
	}
	.toast {
		position: absolute;
		left: 50%;
		bottom: 70px;
		transform: translateX(-50%);
		padding: 10px 16px;
		border-radius: 12px;
		background: var(--dl-ink);
		color: var(--dl-bg);
		font-size: 14px;
	}
	@media (max-width: 900px) {
		.main {
			flex-direction: column;
		}
		.side {
			flex: 0 0 auto;
		}
		.fig {
			min-height: 420px;
		}
	}
</style>
