<script lang="ts">
	// やってみる の右の欄（learn-standard.md 第 19 章）：頼む人の頼み・やることの一覧（済むと ✓ と知らせ）・
	// 端末（履歴 ↑↓・補完 Tab・Ctrl+L で消す）・命令の見本（押すと入る）・公式の説明への道。
	// 状態は親が持つ（打った命令の並びから決まる。try3.ts）。この欄は描いて、打った行を親へ返すだけ
	import {
		completeLine,
		histAt,
		tasksDone,
		type TryScene,
		type TryState
	} from '../../learn/try3.ts';

	type Props = { scene: TryScene; st: TryState; onsend: (line: string) => void };
	let { scene, st, onsend }: Props = $props();
	let typed = $state('');
	let back = $state(0);
	let out: HTMLDivElement | undefined = $state();
	let input: HTMLInputElement | undefined = $state();
	const done = $derived(tasksDone(scene, st));
	const all = $derived(done.every(Boolean));
	/** 今済んだやること（知らせに出す）：一番後ろの済んだ物 */
	const lastDone = $derived(done.lastIndexOf(true));

	$effect(() => {
		void st.lines.length;
		if (out) out.scrollTop = out.scrollHeight;
	});

	function send() {
		onsend(typed);
		typed = '';
		back = 0;
	}
	function key(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			send();
			e.preventDefault();
		} else if (e.key === 'ArrowUp') {
			back = Math.min(st.hist.length, back + 1);
			typed = histAt(st.hist, back);
			e.preventDefault();
		} else if (e.key === 'ArrowDown') {
			back = Math.max(0, back - 1);
			typed = histAt(st.hist, back);
			e.preventDefault();
		} else if (e.key === 'Tab' && typed) {
			typed = completeLine(scene, typed);
			e.preventDefault();
		} else if (e.key === 'l' && e.ctrlKey) {
			onsend('clear');
			e.preventDefault();
		}
	}
	function pick(c: string) {
		typed = c;
		input?.focus();
	}
</script>

<section class="try" aria-label="やってみる">
	<div class="req">
		<b>{scene.who}からの頼み</b>
		<p>{scene.req}</p>
	</div>
	<ol class="tasks">
		{#each scene.tasks as t, i (t.t)}
			<li class:done={done[i]} data-task={i}>
				<span class="mark" aria-hidden="true">{done[i] ? '✓' : i + 1}</span>{t.t}
			</li>
		{/each}
	</ol>
	<p class="news" role="status">
		{#if all}
			全て済んだ。頼みに応えられた
		{:else if lastDone >= 0}
			✓ {scene.tasks[lastDone].t}
		{/if}
	</p>
	<div class="term">
		<div class="out" bind:this={out} aria-live="polite">
			{#each st.lines as l, i (i)}
				<div class="ln {l.kind}">{l.text}</div>
			{/each}
		</div>
		<label class="in">
			<span class="ps">{scene.ps}</span>
			<input
				bind:this={input}
				bind:value={typed}
				onkeydown={key}
				autocomplete="off"
				spellcheck="false"
				aria-label="命令を打つ"
				placeholder="命令を打って Enter（↑↓ で履歴、Tab で補完、Ctrl+L で消す）"
			/>
		</label>
	</div>
	<div class="cards">
		<b>命令の見本（押すと入る）</b>
		{#each scene.cards as c (c)}
			<button type="button" onclick={() => pick(c)}><code>{c}</code></button>
		{/each}
	</div>
	<p class="refs">
		公式の説明：
		{#each scene.refs as [n, u] (u)}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- 外の公式の説明（別タブ。この app の道ではない） -->
			<a href={u} target="_blank" rel="noopener noreferrer">{n}</a>
		{/each}
	</p>
</section>

<style>
	.try {
		font: 14px/1.6 var(--dl-font);
		color: var(--dl-ink);
		display: grid;
		gap: 10px;
	}
	.req {
		border-left: 4px solid var(--dl-obj-orange);
		padding: 4px 10px;
	}
	.req p {
		margin: 2px 0 0;
	}
	.tasks {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 4px;
	}
	.tasks li {
		display: flex;
		gap: 8px;
		align-items: baseline;
	}
	.mark {
		display: inline-grid;
		place-items: center;
		min-width: 1.6em;
		height: 1.6em;
		border-radius: 50%;
		border: 1.5px solid currentColor;
		font-size: 12.5px;
		font-weight: 800;
	}
	.tasks li.done {
		color: var(--dl-obj-green);
	}
	.tasks li.done .mark {
		background: var(--dl-obj-green);
		color: #fff;
		border-color: var(--dl-obj-green);
	}
	.news {
		margin: 0;
		min-height: 1.6em;
		font-weight: 800;
		color: var(--dl-obj-green);
	}
	.term {
		background: #15181d;
		color: #e6e6e6;
		border-radius: 12px;
		padding: 10px 12px;
		font: 13px/1.55 var(--dl-mono, ui-monospace, monospace);
	}
	.out {
		height: 300px;
		overflow-y: auto;
		white-space: pre-wrap;
		word-break: break-all;
	}
	.ln.cmd {
		color: #9ecbff;
	}
	.ln.err {
		color: #ff9a9a;
	}
	.ln.hint {
		color: #8fe0a8;
	}
	.ln.note {
		color: #b8b8b8;
	}
	.in {
		display: flex;
		gap: 8px;
		align-items: center;
		border-top: 1px solid #333;
		margin-top: 6px;
		padding-top: 6px;
	}
	.ps {
		color: #9ecbff;
		white-space: nowrap;
	}
	.in input {
		flex: 1;
		background: transparent;
		border: 0;
		color: inherit;
		font: inherit;
		outline: none;
		min-width: 0;
	}
	.cards {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
	}
	.cards b {
		width: 100%;
	}
	.cards button {
		border: 1px solid var(--dl-line, #8888);
		border-radius: 8px;
		background: transparent;
		color: inherit;
		padding: 2px 8px;
		cursor: pointer;
	}
	.cards code {
		font-size: 13px;
	}
	.refs {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 4px 10px;
	}
</style>
