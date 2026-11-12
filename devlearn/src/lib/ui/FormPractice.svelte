<script lang="ts">
	// 実戦（打つコマンドが無い題材）：calc 計算する / order 並べる / sort 振り分ける / pick 選ぶ / fix 直す。
	// 舞台に題材と答えの欄、操作帯に「確かめる」「もう一度」、台本に目的と返事・試した記録（押すとその答えに戻す）。
	// 確かめると、結果を 1 行ずつ流す（原理 1.5）。「もう一度」で何度でも流し直す（1.6）。キーボードだけで全て操作できる。
	import type { Practice } from '../lesson/types.ts';
	import {
		blankAnswer,
		formNames,
		judgeForm,
		type CalcSetup,
		type FixSetup,
		type FormAnswer,
		type FormJudge,
		type OrderSetup,
		type PickSetup,
		type SortSetup,
		FIX_RESULTS
	} from '../practice/forms.ts';

	type Props = { practice: Practice; replay: number; onpass: () => void };
	let { practice, replay, onpass }: Props = $props();

	let answer = $derived<FormAnswer>(blankAnswer(practice));
	let judge = $state<FormJudge | null>(null);
	let attempts = $state<{ answer: FormAnswer; judge: FormJudge }[]>([]);
	let flow = $state(0);

	const form = $derived(practice.form ?? '');
	const calc = $derived(practice.setup as CalcSetup);
	const order = $derived(practice.setup as OrderSetup);
	const sort = $derived(practice.setup as SortSetup);
	const pick = $derived(practice.setup as PickSetup);
	const fix = $derived(practice.setup as FixSetup);

	function check() {
		const was = attempts.some((x) => x.judge.passed);
		judge = judgeForm(practice, answer);
		attempts = [...attempts, { answer: structuredClone($state.snapshot(answer)), judge }];
		flow++;
		if (judge.passed && !was) onpass();
	}
	function backTo(i: number) {
		const a = attempts[i];
		answer = structuredClone($state.snapshot(a.answer));
		judge = a.judge;
		attempts = attempts.slice(0, i + 1);
		flow++;
	}
	function moveCard(i: number, d: -1 | 1) {
		if (answer.kind !== 'order') return;
		const o = answer.order.slice();
		const j = i + d;
		if (j < 0 || j >= o.length) return;
		[o[i], o[j]] = [o[j], o[i]];
		answer = { kind: 'order', order: o };
		judge = null;
		queueMicrotask(() =>
			document.querySelector<HTMLButtonElement>(`[data-card="${o[j]}"] [data-dir="${d}"]`)?.focus()
		);
	}
	const cardText = (id: string) => order.cards.find((c) => c.id === id)?.text ?? id;
	const RES: Record<string, string> = FIX_RESULTS;
	const runKey = $derived(`${flow}:${replay}`);
	// ✕ の行の添え書き。並べるは最初に誤った札で止まり、その先は流れない。ほかの形は、その行が違う
	const firstBad = $derived(judge ? judge.rows.findIndex((r) => !r.ok) : -1);
	const badNote = (i: number) =>
		form !== 'order' ? '（違う）' : i === firstBad ? '（ここで止まった）' : '（その先は流れない）';
</script>

<div class="grid" data-form={form} data-tries={attempts.length}>
	<div class="left">
		<p class="band">
			実戦 ・ {formNames[form]} ・ 確かめた回数 {attempts.length}
			{#if judge?.passed}<strong class="ok">✓ 合格</strong>{/if}
		</p>

		<section class="stage" aria-label="題材と答え">
			{#if answer.kind === 'calc'}
				<table class="data">
					<tbody>
						{#each calc.data as d (d.k)}
							<tr><th scope="row">{d.k}</th><td><code>{d.v}</code></td></tr>
						{/each}
					</tbody>
				</table>
				<ol class="fields">
					{#each calc.steps as st, i (i)}
						<li>
							<label for="calc-{i}">{i + 1}. {st.label}</label>
							<span class="in">
								<input
									id="calc-{i}"
									bind:value={answer.values[i]}
									autocomplete="off"
									spellcheck="false"
									oninput={() => (judge = null)}
								/>{#if st.unit}<span>{st.unit}</span>{/if}
							</span>
						</li>
					{/each}
				</ol>
			{:else if answer.kind === 'order'}
				<p class="how">札を起きる順に並べる。各札の ↑ ↓ で動かす</p>
				<ol class="cards">
					{#each answer.order as id, i (id)}
						<li data-card={id}>
							<span class="num">{i + 1}</span>
							<span class="txt">{cardText(id)}</span>
							<button
								type="button"
								data-dir="-1"
								aria-label="{cardText(id)} を上へ"
								disabled={i === 0}
								onclick={() => moveCard(i, -1)}>↑</button
							>
							<button
								type="button"
								data-dir="1"
								aria-label="{cardText(id)} を下へ"
								disabled={i === answer.order.length - 1}
								onclick={() => moveCard(i, 1)}>↓</button
							>
						</li>
					{/each}
				</ol>
			{:else if answer.kind === 'sort'}
				<p class="how">項目ごとに、入る区分を選ぶ</p>
				<ul class="items">
					{#each sort.items as it (it.id)}
						<li>
							<label for="sort-{it.id}">{it.text}</label>
							<select
								id="sort-{it.id}"
								bind:value={answer.bins[it.id]}
								onchange={() => (judge = null)}
							>
								<option value={undefined}>（選ぶ）</option>
								{#each sort.bins as b (b.id)}<option value={b.id}>{b.label}</option>{/each}
							</select>
						</li>
					{/each}
				</ul>
			{:else if answer.kind === 'pick'}
				<pre class="situation">{pick.situation.join('\n')}</pre>
				<fieldset>
					<legend>どれにする</legend>
					{#each pick.choices as c (c.id)}
						<label class="choice">
							<input
								type="radio"
								name="pick"
								value={c.id}
								bind:group={answer.choice}
								onchange={() => (judge = null)}
							/>
							{c.text}
						</label>
					{/each}
				</fieldset>
			{:else if answer.kind === 'fix'}
				<p class="how">誤った行を、正しい行に替える（替えない行は「そのまま」）</p>
				<ol class="lines">
					{#each fix.lines as l, i (l.id)}
						<li>
							<label for="fix-{l.id}"><span class="num">{i + 1}</span> <code>{l.text}</code></label>
							<select
								id="fix-{l.id}"
								bind:value={answer.lines[l.id]}
								onchange={() => (judge = null)}
							>
								<option value={undefined}>そのまま</option>
								{#each fix.options.filter((o) => o.line === l.id) as o (o.id)}
									<option value={o.id}>→ {o.text}</option>
								{/each}
							</select>
						</li>
					{/each}
				</ol>
			{/if}
		</section>

		{#if judge}
			{#key runKey}
				<figure class="flow" aria-label="流した結果" data-run={runKey}>
					<figcaption>流した結果（1 行ずつ）</figcaption>
					{#if answer.kind === 'fix'}
						<table>
							<thead><tr><th>通信</th><th>直す前</th><th>直した後</th></tr></thead>
							<tbody>
								{#each judge.rows as r, i (r.key)}
									<tr class:bad={!r.ok} style:animation-delay="{i * 0.45}s">
										<th scope="row">{r.ok ? '✓' : '✕'} {r.text}</th>
										<td>{RES[r.before ?? ''] ?? r.before}</td>
										<td><strong>{RES[r.after ?? ''] ?? r.after}</strong></td>
									</tr>
								{/each}
							</tbody>
						</table>
					{:else}
						<ol>
							{#each judge.rows as r, i (r.key)}
								<li class:bad={!r.ok} style:animation-delay="{i * 0.45}s">
									<span aria-hidden="true">{r.ok ? '✓' : '✕'}</span>
									{r.text}{#if !r.ok}<em>{badNote(i)}</em>{/if}
								</li>
							{/each}
						</ol>
					{/if}
				</figure>
			{/key}
		{/if}

		<div class="controls">
			<button type="button" class="pri" onclick={check}>確かめる</button>
			<button type="button" onclick={() => flow++} disabled={!judge} aria-keyshortcuts="R"
				>↻ もう一度流す</button
			>
		</div>
	</div>

	<div class="right">
		<section class="text" aria-label="目的と返事">
			<h2>実戦</h2>
			<p class="goal">{practice.goal}</p>
			<p class="meta">形：{formNames[form]}（答えを決まった値と比べる）</p>
			{#if judge && !judge.passed}
				<div class="reply wrong" role="status">
					{#if judge.mistake}
						<p><strong>✕ なぜ駄目か</strong> {judge.mistake.why}</p>
						<p><strong>次の一手</strong> {judge.mistake.next}</p>
					{:else}
						<p><strong>✕</strong> ✕ の付いた行が違う。その行の考え方を解説で見直す</p>
					{/if}
				</div>
			{:else if judge?.passed}
				<div class="reply ok" role="status"><p><strong>✓ 合格</strong> 修了の記録を残した</p></div>
			{/if}
		</section>
		<section class="log" aria-label="確かめた記録">
			<h3>記録（押すと、その答えに戻す）</h3>
			<ol>
				{#each attempts as a, i (i)}
					<li aria-current={i === attempts.length - 1 ? 'step' : undefined}>
						<button type="button" onclick={() => backTo(i)}>
							{i + 1}
							{a.judge.passed ? '✓ 合格' : `✕ ${a.judge.rows.filter((r) => !r.ok).length} 行違う`}
						</button>
					</li>
				{:else}
					<li class="none">まだ確かめていない</li>
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
	.stage,
	.flow,
	.text,
	.log {
		background: var(--dl-surface);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius-box);
		padding: var(--dl-space-4);
		margin: 0;
	}
	.how {
		margin: 0 0 var(--dl-space-2);
		color: var(--dl-text-muted);
		font-size: var(--dl-text-small);
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
		overflow-wrap: anywhere;
	}
	ol,
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--dl-space-2);
	}
	.fields li,
	.items li,
	.lines li {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dl-space-2);
		align-items: center;
		justify-content: space-between;
	}
	.fields {
		margin-top: var(--dl-space-3);
	}
	.in {
		display: inline-flex;
		gap: var(--dl-space-1);
		align-items: center;
	}
	input:not([type='radio']),
	select {
		min-height: var(--dl-tap);
		font-family: var(--dl-font-code);
		font-size: var(--dl-text-body);
		padding: 0 var(--dl-space-2);
		border: 1.5px solid var(--dl-border-strong);
		border-radius: var(--dl-radius-inner);
		background: var(--dl-surface);
		color: var(--dl-text);
		max-width: 100%;
	}
	.cards li {
		display: grid;
		grid-template-columns: 2rem 1fr auto auto;
		gap: var(--dl-space-2);
		align-items: center;
		border: 1.5px solid var(--dl-border-strong);
		border-radius: var(--dl-radius-inner);
		padding: var(--dl-space-1) var(--dl-space-2);
	}
	.num {
		font-family: var(--dl-font-code);
		color: var(--dl-text-muted);
	}
	.situation {
		background: var(--dl-code-bg);
		border-radius: var(--dl-radius-inner);
		padding: var(--dl-space-3);
		white-space: pre-wrap;
		font-family: var(--dl-font-code);
		font-size: var(--dl-text-small);
		margin: 0 0 var(--dl-space-3);
	}
	fieldset {
		border: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--dl-space-2);
	}
	.choice {
		display: flex;
		gap: var(--dl-space-2);
		align-items: center;
		min-height: var(--dl-tap);
		border: 1.5px solid var(--dl-border-strong);
		border-radius: var(--dl-radius-inner);
		padding: 0 var(--dl-space-3);
	}
	.flow li,
	.flow tr {
		animation: flowin var(--dl-motion-op) ease-out both;
	}
	.flow li {
		padding: var(--dl-space-1) var(--dl-space-2);
		border-left: 4px solid var(--dl-done);
	}
	.flow .bad {
		border-color: var(--dl-wrong);
		color: var(--dl-wrong);
	}
	.flow em {
		font-style: normal;
		margin-left: var(--dl-space-2);
	}
	figcaption {
		font-size: var(--dl-text-small);
		color: var(--dl-text-muted);
		margin-bottom: var(--dl-space-2);
	}
	@keyframes flowin {
		from {
			opacity: 0;
			transform: translateX(-0.75rem);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.flow li,
		.flow tr {
			animation-name: none;
		}
	}
	.controls {
		display: flex;
		gap: var(--dl-space-2);
		flex-wrap: wrap;
	}
	.pri {
		font-weight: 700;
		border-color: var(--dl-now);
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
	.meta,
	.none {
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
	.log button {
		width: 100%;
		text-align: left;
		justify-content: flex-start;
	}
	li[aria-current='step'] button {
		border: 2px solid var(--dl-now);
	}
</style>
