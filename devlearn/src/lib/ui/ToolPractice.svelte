<script lang="ts">
	// 実戦（道具を使う）：舞台に道具の状態、操作帯に 1 行の入力（js は書いた物の全体）、台本に目的と返事・合格の項目・履歴。
	// 履歴の行から、その時点まで巻き戻せる（screen-design.md 3.2・3.4）。道具は git・shell・docker（模擬）、js・sql（本物）。
	import sqlWasm from 'sql.js/dist/sql-wasm-browser.wasm?url';
	import type { Practice } from '../lesson/types.ts';
	import { terminalLines, terminalSpans } from '../practice/terminal.ts';
	import { boardAt, openRun, rewindRun, typeRun, useSqlWasm, type Run } from '../practice/run.ts';
	import BoardStage from './BoardStage.svelte';
	import GitStage from './GitStage.svelte';

	type Props = { practice: Practice; replay: number; onpass: () => void };
	let { practice, replay, onpass }: Props = $props();

	useSqlWasm(sqlWasm);
	// レッスンが替わったら作り直す。打つ・戻すで書き換える（書き換えられる $derived）
	let run = $derived<Run>(openRun(practice));
	let line = $state('');
	let code = $derived(run.editor ?? '');
	let busy = $state(false);
	let localReplay = $state(0);
	let terminal = $state<HTMLElement>();

	const n = $derived(run.steps.length);
	const before = $derived(n === 0 ? null : boardAt(run, n - 1));
	const last = $derived(run.steps.at(-1));
	const name = $derived(practice.tool?.name ?? '');
	const PLACE: Record<string, string> = {
		git: 'git status',
		shell: 'ls',
		docker: 'docker images',
		sql: 'SELECT * FROM 表;'
	};

	async function send(text: string) {
		if (!text.trim() || busy) return;
		busy = true;
		const was = run.passed;
		try {
			run = await typeRun(run, run.editor === null ? text.trim() : text);
		} finally {
			busy = false;
		}
		if (run.editor === null) line = '';
		if (run.passed && !was) onpass();
		queueMicrotask(() => terminal?.scrollTo({ top: terminal.scrollHeight }));
	}
	function submit(e: SubmitEvent) {
		e.preventDefault();
		void send(run.editor === null ? line : code);
	}
	// 書いた物の欄：Ctrl（Mac は ⌘）+ Enter で走らせる。Enter は改行
	function onEditorKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			void send(code);
		}
	}

	const NL = String.fromCharCode(10);
	const lineCount = (t: string) => t.split(NL).length;
	const firstLine = (t: string) => t.split(NL)[0];

	function rewindTo(k: number) {
		run = rewindRun(run, k);
	}
</script>

{#snippet spans(l: string)}
	{#each terminalSpans(l) as sp, k (k)}{#if sp.link}<span
				class="link"
				class:b={sp.bold}
				title={sp.link}>{sp.text}</span
			>{:else if sp.bold}<b>{sp.text}</b>{:else}{sp.text}{/if}{:else}{' '}{/each}
{/snippet}

<div class="grid" data-steps={run.steps.length}>
	<div class="left">
		<p class="band">
			実戦 ・ 打った回数 {run.steps.length}
			{#if run.passed}<strong class="ok">✓ 合格</strong>{/if}
		</p>
		{#if run.git}
			<GitStage before={before?.git ?? null} after={run.git} run={replay + localReplay} />
		{:else}
			<BoardStage before={before?.board ?? null} after={run.board} run={replay + localReplay} />
		{/if}
		<div class="terminal" bind:this={terminal} aria-label="端末" role="log">
			{#each run.steps as s, i (i)}
				{#if run.editor === null}
					<div class="cmd">
						<span aria-hidden="true">{run.kit.prompt === 'sqlite>' ? 'sqlite>' : '$'}</span>
						{s.line}
					</div>
				{:else}
					<div class="cmd">▶ 走らせた（{lineCount(s.line)} 行）</div>
				{/if}
				{#each terminalLines(s.out) as l, j (j)}<div class="out">{@render spans(l)}</div>{/each}
				{#each terminalLines(s.err) as l, j (j)}<div class="err">{@render spans(l)}</div>{/each}
			{:else}
				<div class="hint">ここに打った物と、返ってきた物が出る</div>
			{/each}
		</div>
		<form class="controls" onsubmit={submit}>
			{#if run.editor === null}
				<label for="tool-line" class="prompt">{run.kit.prompt}</label>
				<input
					id="tool-line"
					bind:value={line}
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					placeholder={PLACE[name] ?? ''}
				/>
			{:else}
				<label for="tool-line" class="prompt">{run.kit.prompt}（Ctrl + Enter で走らせる）</label>
				<textarea
					id="tool-line"
					bind:value={code}
					rows="8"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					onkeydown={onEditorKey}></textarea>
			{/if}
			<button type="submit" disabled={busy}>{run.editor === null ? '打つ' : '走らせる'}</button>
			<button type="button" onclick={() => localReplay++} aria-keyshortcuts="R">↻ もう一度</button>
		</form>
	</div>

	<div class="right">
		<section class="text" aria-label="目的と返事">
			<h2>実戦</h2>
			<p class="goal">{practice.goal}</p>
			<p class="meta">
				道具：<code>{name}</code>（{practice.tool?.mode === 'real'
					? '本物。このブラウザの中で動く'
					: '模擬。本物と同じ出力・同じエラーを返す'}）
			</p>
			{#if last?.mistake}
				<div class="reply wrong" role="status">
					<p><strong>✕ なぜ駄目か</strong> {last.mistake.why}</p>
					<p><strong>次の一手</strong> {last.mistake.next}</p>
				</div>
			{:else if last && last.code !== 0}
				<div class="reply wrong" role="status">
					<p><strong>✕</strong> 終了コード {last.code}。上の端末の出力を読む</p>
				</div>
			{:else if run.passed}
				<div class="reply ok" role="status"><p><strong>✓ 合格</strong> 修了の記録を残した</p></div>
			{/if}
		</section>

		<section class="facts" aria-label="合格の項目">
			<table>
				<thead><tr><th>合格の項目</th><th>今</th><th>目標</th></tr></thead>
				<tbody>
					{#each run.judge as j (j.label)}
						<tr>
							<th scope="row">{j.ok ? '✓' : '○'} {j.label}</th>
							<td><code>{j.got}</code></td>
							<td><code>{j.want}</code></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>

		<section class="log" aria-label="打った物の記録">
			<h3>記録（押すと、その時点まで戻す）</h3>
			<ol>
				<li>
					<button type="button" onclick={() => rewindTo(0)} disabled={run.steps.length === 0}>
						0 初めの状態に戻す
					</button>
				</li>
				{#each run.steps as s, i (i)}
					<li aria-current={i === run.steps.length - 1 ? 'step' : undefined}>
						<button type="button" onclick={() => rewindTo(i + 1)}>
							{i + 1}
							{s.code === 0 ? '✓' : '✕'} <code>{firstLine(s.line)}</code>
						</button>
					</li>
				{/each}
			</ol>
		</section>
	</div>
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--dl-space-4);
	}
	.left,
	.right {
		display: flex;
		flex-direction: column;
		gap: var(--dl-space-3);
		min-width: 0;
	}
	@media (min-width: 60rem) {
		.grid {
			grid-template-columns: 3fr 2fr;
			align-items: start;
		}
	}
	.band {
		margin: 0;
		font-size: var(--dl-text-small);
		color: var(--dl-text-muted);
	}
	.ok {
		color: var(--dl-done);
		margin-left: var(--dl-space-2);
	}
	.terminal {
		background: var(--dl-code-bg);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius-inner);
		padding: var(--dl-space-2) var(--dl-space-3);
		font-family: var(--dl-font-code);
		font-size: var(--dl-text-small);
		max-height: 16rem;
		overflow: auto;
	}
	.terminal > div {
		white-space: pre;
	}
	.cmd {
		font-weight: 700;
	}
	.err {
		color: var(--dl-wrong);
	}
	/* curl が端末に出す字の飾り：見出しの太字と、押せる印（行き先は title に。作り物の網なので押して飛ばさない） */
	.terminal b,
	.terminal .b {
		font-weight: 700;
	}
	.terminal .link {
		text-decoration: underline;
	}
	.hint {
		color: var(--dl-text-muted);
		white-space: normal;
	}
	.controls {
		display: flex;
		gap: var(--dl-space-2);
		align-items: center;
		flex-wrap: wrap;
	}
	.prompt {
		font-family: var(--dl-font-code);
		font-size: var(--dl-text-small);
		color: var(--dl-text-muted);
	}
	textarea {
		flex: 1 1 100%;
		font-family: var(--dl-font-code);
		font-size: var(--dl-text-body);
		padding: var(--dl-space-2);
		border: 1.5px solid var(--dl-border-strong);
		border-radius: var(--dl-radius-inner);
		background: var(--dl-surface);
		color: var(--dl-text);
		resize: vertical;
	}
	input {
		flex: 1 1 12rem;
		min-height: var(--dl-tap);
		font-family: var(--dl-font-code);
		font-size: var(--dl-text-body);
		padding: 0 var(--dl-space-2);
		border: 1.5px solid var(--dl-border-strong);
		border-radius: var(--dl-radius-inner);
		background: var(--dl-surface);
		color: var(--dl-text);
	}
	.text,
	.facts,
	.log {
		background: var(--dl-surface);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius-box);
		padding: var(--dl-space-4);
	}
	h2 {
		margin: 0 0 var(--dl-space-2);
		font-size: var(--dl-text-h2);
	}
	h3 {
		margin: 0 0 var(--dl-space-2);
		font-size: var(--dl-text-body);
	}
	.goal {
		font-weight: 700;
	}
	.meta {
		color: var(--dl-text-muted);
		font-size: var(--dl-text-small);
	}
	.reply {
		border-left: 4px solid var(--dl-border-strong);
		padding: var(--dl-space-2) var(--dl-space-3);
		margin-top: var(--dl-space-2);
	}
	.reply p {
		margin: var(--dl-space-1) 0;
	}
	.reply.wrong {
		border-color: var(--dl-wrong);
	}
	.reply.wrong strong {
		color: var(--dl-wrong);
	}
	.reply.ok {
		border-color: var(--dl-done);
	}
	.reply.ok strong {
		color: var(--dl-done);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--dl-text-small);
	}
	th,
	td {
		text-align: left;
		padding: var(--dl-space-1) var(--dl-space-2);
		border-bottom: 1px solid var(--dl-border);
		vertical-align: top;
		overflow-wrap: anywhere;
	}
	td code {
		white-space: pre-wrap;
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--dl-space-1);
	}
	ol button {
		width: 100%;
		text-align: left;
		justify-content: flex-start;
		overflow-wrap: anywhere;
	}
	li[aria-current='step'] button {
		border: 2px solid var(--dl-now);
	}
</style>
