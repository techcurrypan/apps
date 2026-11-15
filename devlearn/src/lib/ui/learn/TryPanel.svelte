<script lang="ts">
	// やってみるの右の欄（learn-standard.md 第 6 章・screen-design.md 11.5）。
	// 要望・端末（最新の約 22 行。前は「前の出力を表示」で開く）・入力・返事・ヒント・最初から・命令の見本・コマンドの参考。
	// 打つ・戻すは親（LearnView）が持つ。この欄は、打った物の並びと選んだ記録から描くだけ。
	import type { Lesson } from '../../lesson/types.ts';
	import type { Run } from '../../practice/run.ts';
	import { COMMAND_REFS } from '../../practice/refs.ts';
	import { terminalLines } from '../../practice/terminal.ts';
	import { hintOf, samplesOf } from '../../learn/try.ts';

	type Props = {
		lesson: Lesson;
		run: Run;
		/** 選んだ記録（1 から。0 は無し） */
		sel: number;
		depth: 1 | 2 | 3;
		request: { who: string; text: string } | null;
		busy: boolean;
		onsend: (line: string) => void;
		onreset: () => void;
		onrewind: (n: number) => void;
		onrecall: () => void;
	};
	let { lesson, run, sel, depth, request, busy, onsend, onreset, onrewind, onrecall }: Props =
		$props();

	const TAIL = 22;
	let line = $state('');
	let code = $state('');
	let all = $state(false);
	let hints = $state(0);
	let input = $state<HTMLInputElement | HTMLTextAreaElement>();
	$effect.pre(() => {
		void lesson.id;
		line = '';
		code = run.editor ?? '';
		all = false;
		hints = 0;
	});

	// 端末の行（打った行と返ってきた行）。最新の約 22 行だけを出す（LS-P2）
	type TLine = { k: 'cmd' | 'out' | 'err'; text: string; n: number };
	const tlines = $derived.by(() => {
		const out: TLine[] = [];
		run.steps.forEach((s, i) => {
			out.push({
				k: 'cmd',
				text: run.editor === null ? s.line : `▶ 走らせた（${s.line.split('\n').length} 行）`,
				n: i + 1
			});
			for (const l of terminalLines(s.out)) out.push({ k: 'out', text: l, n: i + 1 });
			for (const l of terminalLines(s.err)) out.push({ k: 'err', text: l, n: i + 1 });
		});
		return out;
	});
	const cut = $derived(all ? 0 : Math.max(0, tlines.length - TAIL));
	const last = $derived(run.steps.at(-1) ?? null);
	const mistake = $derived(last?.mistake ?? null);
	const hint = $derived(hints > 0 ? hintOf(lesson, run.judge, mistake, hints) : null);
	const samples = $derived(samplesOf(lesson));
	const refs = $derived(
		(lesson.practice.commands ?? []).map((c) => ({ c, ref: COMMAND_REFS[c] ?? null }))
	);
	const picked = $derived(sel > 0 ? (run.steps[sel - 1] ?? null) : null);
	const prompt = $derived(run.kit.prompt === 'sqlite>' ? 'sqlite>' : '$');

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const text = run.editor === null ? line.trim() : code;
		if (!text.trim() || busy) return;
		onsend(text);
		if (run.editor === null) line = '';
		// 打った後も入力欄に焦点を残す（LS-P3）
		queueMicrotask(() => input?.focus());
	}
	function onEditorKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			onsend(code);
		}
	}
	function useSample(s: string) {
		// 押すと入力欄に入る。すぐには実行しない（LS-P7）
		if (run.editor === null) line = s;
		else code = s;
		input?.focus();
	}
</script>

<div class="try">
	<div class="req">
		{#if request}
			<b>{request.who}から</b>「{request.text}」
		{/if}
		<span class="role">あなたの役目：{lesson.practice.goal}</span>
	</div>

	<div class="where">
		道具：<code>{lesson.practice.tool?.name}</code>（{lesson.practice.tool?.mode === 'real'
			? '本物。このブラウザの中で動く'
			: '模擬。本物と同じ出力・同じエラーを返す'}）
	</div>

	{#if cut > 0}
		<button type="button" class="more" onclick={() => (all = true)}
			>▲ 前の出力を表示（{cut} 件）</button
		>
	{/if}
	<div class="term" role="log" aria-label="端末" aria-live="polite">
		{#each tlines.slice(cut) as l, i (i)}
			{#if l.k === 'cmd'}
				<div class="cmd" class:sel={l.n === sel}>
					<span class="p" aria-hidden="true">{prompt}</span>
					{l.text}
				</div>
			{:else}
				<div class={l.k}>{l.text || ' '}</div>
			{/if}
		{:else}
			<div class="none">何から調べる？ 命令を打つ（Enter で実行）</div>
		{/each}
	</div>
	<form class="in" onsubmit={submit}>
		{#if run.editor === null}
			<label for="try-line" class="pr">{run.kit.prompt}</label>
			<input
				id="try-line"
				bind:this={input}
				bind:value={line}
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				aria-label="命令"
			/>
		{:else}
			<label for="try-line" class="pr">{run.kit.prompt}（Ctrl + Enter で走らせる）</label>
			<textarea
				id="try-line"
				bind:this={input}
				bind:value={code}
				rows="7"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				onkeydown={onEditorKey}></textarea>
		{/if}
		<button type="submit" class="btn pri" disabled={busy}
			>{run.editor === null ? '打つ' : '走らせる'}</button
		>
	</form>

	<div aria-live="polite">
		{#if mistake}
			<div class="fb bad">
				<b>✕ なぜ駄目か</b>{mistake.why}
				<b>次の一手</b>{mistake.next}
			</div>
		{:else if last && last.code !== 0}
			<div class="fb bad">
				<b>✕ 終了コード {last.code}</b>端末の赤い行が理由。ヒントを押すと、次に打つとよい物が出る。
			</div>
		{:else if run.passed}
			<div class="fb good"><b>✓ 合格</b>修了の記録に残した。思い出すで、要点を手帳に残せる。</div>
		{:else if last}
			<div class="fb info">
				<b>✓ 通った</b>{last.out.trim()
					? '返ってきた物を読み、やることの次の項目へ。'
					: '何も出ないのは成功の印。状態は中身の板の「OS の中」で確かめる。'}
			</div>
		{/if}
		{#if hint}
			<div class="fb info"><b>ヒント {hints}</b>{hint}</div>
		{/if}
	</div>

	<div class="row">
		<button type="button" class="btn" onclick={() => hints++}>ヒント（{hints}）</button>
		<button type="button" class="btn" onclick={onreset} disabled={run.steps.length === 0}
			>最初から</button
		>
		{#if run.passed}
			<button type="button" class="btn pri" onclick={onrecall}>思い出す ▶</button>
		{/if}
	</div>

	{#if picked}
		<section class="picked" aria-label="選んだ記録">
			<h4>選んだ記録 {sel}</h4>
			<code class="ln">{prompt} {picked.line.split('\n')[0]}</code>
			<p class="tx">
				終了コード {picked.code}。{picked.mistake ? picked.mistake.why : ''}
			</p>
			{#if sel < run.steps.length}
				<button type="button" class="btn" onclick={() => onrewind(sel)}
					>ここまで戻す（後の {run.steps.length - sel} 件を消す）</button
				>
			{/if}
		</section>
	{/if}

	{#if depth === 1 && samples.length > 0}
		<section aria-label="命令の見本">
			<h4>命令の見本（押すと入力欄に入る）</h4>
			<div class="samples">
				{#each samples as s (s)}
					<button type="button" class="sample" onclick={() => useSample(s)}><code>{s}</code></button
					>
				{/each}
			</div>
		</section>
	{/if}

	{#if refs.length > 0}
		<section aria-label="コマンドの参考">
			<h4>コマンドの参考（公式の説明・別タブで開く）</h4>
			<div class="refs">
				{#each refs as r (r.c)}
					{#if r.ref}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- 外の公式の説明（別タブ。この app の道ではない） -->
						<a href={r.ref.url} target="_blank" rel="noopener noreferrer"
							><code>{r.c}</code><small>{r.ref.site} ↗</small></a
						>
					{:else}
						<span class="noref"><code>{r.c}</code><small>参考は準備中</small></span>
					{/if}
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.req {
		padding: 10px 12px;
		border: 1px solid var(--dl-warn);
		border-radius: 6px;
		background: color-mix(in srgb, var(--dl-warn) 8%, transparent);
		font-size: 13.5px;
		line-height: 1.75;
		margin-bottom: 10px;
	}
	.req .role {
		display: block;
		color: var(--dl-text-muted);
		font-size: 12.5px;
	}
	.where {
		font-size: 12px;
		color: var(--dl-text-muted);
		margin-bottom: 6px;
	}
	.more {
		width: 100%;
		border: 1px solid var(--dl-border);
		border-bottom: none;
		border-radius: 6px 6px 0 0;
		background: var(--dl-surface-raised);
		color: var(--dl-text);
		font-size: 12px;
		padding: 4px;
		cursor: pointer;
	}
	.term {
		border: 1px solid var(--dl-border-strong);
		border-radius: 6px;
		background: var(--dl-surface-raised);
		font-family: var(--dl-font-code);
		font-size: 12px;
		line-height: 1.6;
		padding: 8px 10px;
		min-height: 110px;
		white-space: pre-wrap;
		word-break: break-all;
	}
	.term .cmd {
		color: var(--dl-text);
		font-weight: 700;
	}
	.term .cmd.sel {
		outline: 2px solid var(--dl-now);
		outline-offset: 1px;
	}
	.term .p {
		color: var(--dl-done);
	}
	.term .out {
		color: var(--dl-text-muted);
	}
	.term .err {
		color: var(--dl-wrong);
	}
	.term .none {
		color: var(--dl-text-muted);
	}
	.in {
		display: flex;
		gap: 6px;
		align-items: center;
		flex-wrap: wrap;
		margin: 8px 0;
	}
	.in .pr {
		font-family: var(--dl-font-code);
		font-size: 12px;
		color: var(--dl-text-muted);
	}
	.in input,
	.in textarea {
		flex: 1 1 160px;
		min-width: 0;
		font-family: var(--dl-font-code);
		font-size: 13px;
		padding: 6px 8px;
		border: 1px solid var(--dl-border-strong);
		border-radius: 6px;
		background: var(--dl-surface);
		color: var(--dl-text);
	}
	.in textarea {
		flex-basis: 100%;
	}
	.fb {
		margin-bottom: 10px;
		padding: 10px 12px;
		border-radius: 6px;
		font-size: 13px;
		line-height: 1.75;
	}
	.fb b {
		display: block;
	}
	.fb.good {
		border: 1px solid var(--dl-done);
		background: color-mix(in srgb, var(--dl-done) 10%, transparent);
	}
	.fb.bad {
		border: 1px solid var(--dl-wrong);
		background: color-mix(in srgb, var(--dl-wrong) 10%, transparent);
	}
	.fb.info {
		border: 1px solid var(--dl-now);
		background: color-mix(in srgb, var(--dl-now) 8%, transparent);
	}
	.row {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		margin-bottom: 12px;
	}
	h4 {
		margin: 12px 0 6px;
		font-size: 12.5px;
		color: var(--dl-text-muted);
		font-weight: 600;
	}
	.picked {
		border-top: 1px solid var(--dl-border);
	}
	.picked .ln {
		display: block;
		font-family: var(--dl-font-code);
		font-size: 12.5px;
		word-break: break-all;
	}
	.picked .tx {
		font-size: 12.5px;
		margin: 4px 0 8px;
	}
	.samples,
	.refs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.sample,
	.refs a,
	.noref {
		display: inline-flex;
		flex-direction: column;
		gap: 1px;
		padding: 5px 8px;
		border: 1px solid var(--dl-border);
		border-radius: 6px;
		background: var(--dl-surface-raised);
		color: var(--dl-text);
		text-decoration: none;
		font-size: 12px;
		cursor: pointer;
		text-align: left;
	}
	.refs small,
	.noref small {
		color: var(--dl-text-muted);
		font-size: 11px;
	}
	code {
		font-family: var(--dl-font-code);
	}
	.btn {
		font: inherit;
		font-size: 13px;
		padding: 6px 12px;
		border: 1px solid var(--dl-border-strong);
		border-radius: 6px;
		background: var(--dl-surface-raised);
		color: var(--dl-text);
		cursor: pointer;
	}
	.btn.pri {
		background: var(--dl-now);
		border-color: var(--dl-now);
		color: var(--dl-surface);
		font-weight: 700;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.btn:focus-visible,
	.sample:focus-visible,
	.refs a:focus-visible,
	.more:focus-visible {
		outline: 3px solid var(--dl-now);
		outline-offset: 2px;
	}
</style>
