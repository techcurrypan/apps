<script lang="ts">
	// 思い出す（learn-standard.md 第 7 章）。流れ・中身・記録を隠し、図だけを残して答える。
	// 答え方は 4 種：並べる（↑ ↓ の釦）・図の機械を押す・打つ・選ぶ。確かめると当たり外れと理由。終わると点数と手帳の 1 枚。
	import { resolve } from '$app/paths';
	import type { Lesson } from '../../lesson/types.ts';
	import { judgeRecall, recallOf, type Recall } from '../../learn/recall.ts';

	type Props = {
		lesson: Lesson;
		title: (id: string) => string;
		onfinish: (ok: number, n: number) => void;
		onnotes: () => void;
	};
	let { lesson, title, onfinish, onnotes }: Props = $props();

	const qs = $derived(recallOf(lesson));
	let i = $state(0);
	let order = $state<string[]>([]);
	let typed = $state('');
	let picked = $state<number | null>(null);
	let res = $state<{ ok: boolean; why: string; right: string } | null>(null);
	let score = $state(0);
	let done = $state(false);
	let typeEl = $state<HTMLInputElement>();

	const q = $derived<Recall | undefined>(qs[i]);
	$effect.pre(() => {
		void lesson.id;
		restart();
	});
	$effect.pre(() => {
		const cur = qs[i];
		order = cur?.kind === 'order' ? [...cur.items] : [];
		typed = '';
		picked = null;
	});

	export function restart() {
		i = 0;
		res = null;
		score = 0;
		done = false;
	}
	/** 図の機械を押した（親の図から呼ぶ） */
	export function hit(id: string) {
		if (q?.kind === 'hit' && !res) check(id);
	}
	/** 数字のキーで選ぶ（1〜9） */
	export function key(n: number) {
		if (res || !q) return;
		if (q.kind === 'pick' && n < q.opts.length) check(n);
	}
	function check(ans: readonly string[] | string | number) {
		if (!q || res) return;
		res = judgeRecall(q, ans);
		if (res.ok) score++;
	}
	function next() {
		res = null;
		if (i + 1 < qs.length) i++;
		else {
			done = true;
			onfinish(score, qs.length);
		}
	}
	function move(j: number, d: -1 | 1) {
		const k = j + d;
		if (k < 0 || k >= order.length) return;
		const a = [...order];
		[a[j], a[k]] = [a[k], a[j]];
		order = a;
		// 動かした札に焦点を付いて行かせる
		queueMicrotask(() =>
			document.querySelector<HTMLButtonElement>(`[data-ord="${k}"][data-d="${d}"]`)?.focus()
		);
	}
	function hitName(id: string): string {
		for (const st of lesson.explain)
			for (const o of st.scene) if (o.op === 'appear' && o.id === id) return o.label;
		return id;
	}
</script>

<div class="rc">
	<div
		class="bar"
		role="progressbar"
		aria-valuemin="0"
		aria-valuemax={qs.length}
		aria-valuenow={i + (done ? 1 : 0)}
	>
		<i style:width="{(((done ? qs.length : i) / Math.max(1, qs.length)) * 100).toFixed(1)}%"></i>
	</div>
	{#if !done && q}
		<p class="cnt">{i + 1} / {qs.length}</p>
		<p class="q">{q.q}</p>
		{#if q.kind === 'order'}
			<ol class="ord">
				{#each order as it, j (it)}
					<li>
						<span class="n">{j + 1}</span><span class="t">{it}</span>
						<button
							type="button"
							class="mv"
							data-ord={j}
							data-d="-1"
							aria-label="{it} を上へ"
							disabled={j === 0 || res !== null}
							onclick={() => move(j, -1)}>↑</button
						>
						<button
							type="button"
							class="mv"
							data-ord={j}
							data-d="1"
							aria-label="{it} を下へ"
							disabled={j === order.length - 1 || res !== null}
							onclick={() => move(j, 1)}>↓</button
						>
					</li>
				{/each}
			</ol>
			{#if !res}
				<button type="button" class="btn pri" onclick={() => check(order)}>確かめる</button>
			{/if}
		{:else if q.kind === 'hit'}
			<p class="tx">左の図の機械を押す（Tab で機械に届き、Enter で選ぶ）。</p>
		{:else if q.kind === 'type'}
			<form
				class="in"
				onsubmit={(e) => {
					e.preventDefault();
					check(typed);
				}}
			>
				<label for="rc-type">{q.label}</label>
				<input
					id="rc-type"
					bind:this={typeEl}
					bind:value={typed}
					autocomplete="off"
					spellcheck="false"
					disabled={res !== null}
				/>
				{#if !res}<button type="submit" class="btn pri">確かめる</button>{/if}
			</form>
		{:else}
			<div class="opts" role="radiogroup" aria-label="選択肢">
				{#each q.opts as o, j (j)}
					<button
						type="button"
						class="opt"
						role="radio"
						aria-checked={picked === j}
						class:right={res !== null && j === q.a}
						class:wrong={res !== null && picked === j && j !== q.a}
						disabled={res !== null}
						onclick={() => {
							picked = j;
							check(j);
						}}><kbd>{j + 1}</kbd> {o}</button
					>
				{/each}
			</div>
		{/if}
		<div aria-live="polite">
			{#if res}
				<div class="fb" class:good={res.ok} class:bad={!res.ok}>
					<b
						>{res.ok
							? '✓ 当たり'
							: `✕ ちがう ── 答え：${q.kind === 'hit' ? hitName(res.right) : res.right}`}</b
					>{res.why}
				</div>
				<button type="button" class="btn pri" onclick={next}
					>{i + 1 < qs.length ? '次の問いへ ▶' : '終える ▶'}</button
				>
			{/if}
		</div>
	{:else if done}
		<div class="end" aria-live="polite">
			<p class="score"><b>{score}</b> / {qs.length}</p>
			<p class="tx">手帳に 1 枚残した：{lesson.goal}</p>
			{#if lesson.check.length > 0}
				<p class="tx muted">次の見返し：{lesson.check[0].ask}（{lesson.check[0].how}）</p>
			{/if}
			<div class="row">
				<button
					type="button"
					class="btn"
					onclick={() => {
						restart();
						queueMicrotask(() => typeEl?.focus());
					}}>もう一度</button
				>
				<button type="button" class="btn" onclick={onnotes}>手帳を見る</button>
				{#if lesson.next[0]}
					<a class="btn pri" href={resolve('/lesson/[id]', { id: lesson.next[0] })}
						>次：{title(lesson.next[0])} ▶</a
					>
				{/if}
				<a class="btn" href={resolve('/town')}>⌂ 街へ</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.bar {
		height: 6px;
		border-radius: 3px;
		background: var(--dl-border);
		overflow: hidden;
		margin-bottom: 8px;
	}
	.bar i {
		display: block;
		height: 100%;
		background: var(--dl-now);
		transition: width 0.3s;
	}
	.cnt {
		font-size: 12px;
		color: var(--dl-text-muted);
		margin: 0 0 4px;
	}
	.q {
		font-size: 15px;
		font-weight: 700;
		line-height: 1.6;
		margin: 0 0 10px;
	}
	.tx {
		font-size: 13px;
		line-height: 1.7;
	}
	.muted {
		color: var(--dl-text-muted);
	}
	.ord {
		list-style: none;
		margin: 0 0 10px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.ord li {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 8px;
		border: 1px solid var(--dl-border-strong);
		border-radius: 6px;
		background: var(--dl-surface-raised);
		font-size: 13px;
	}
	.ord .n {
		width: 20px;
		color: var(--dl-text-muted);
		font-family: var(--dl-font-code);
	}
	.ord .t {
		flex: 1;
	}
	.mv {
		width: 30px;
		height: 28px;
		border: 1px solid var(--dl-border-strong);
		border-radius: 5px;
		background: var(--dl-surface);
		color: var(--dl-text);
		cursor: pointer;
	}
	.mv:disabled {
		opacity: 0.4;
	}
	.in {
		display: flex;
		gap: 6px;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 10px;
	}
	.in label {
		font-family: var(--dl-font-code);
		font-size: 13px;
	}
	.in input {
		flex: 1 1 120px;
		min-width: 0;
		font-family: var(--dl-font-code);
		font-size: 14px;
		padding: 6px 8px;
		border: 1px solid var(--dl-border-strong);
		border-radius: 6px;
		background: var(--dl-surface);
		color: var(--dl-text);
	}
	.opts {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 10px;
	}
	.opt {
		text-align: left;
		padding: 8px 10px;
		border: 1px solid var(--dl-border-strong);
		border-radius: 6px;
		background: var(--dl-surface-raised);
		color: var(--dl-text);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
	}
	.opt.right {
		border: 2px solid var(--dl-done);
	}
	.opt.wrong {
		border: 2px solid var(--dl-wrong);
		text-decoration: line-through;
	}
	kbd {
		font-family: var(--dl-font-code);
		font-size: 11px;
		padding: 0 5px;
		border: 1px solid var(--dl-border-strong);
		border-radius: 4px;
		margin-right: 4px;
	}
	.fb {
		margin: 8px 0 10px;
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
	.score {
		font-size: 14px;
		margin: 4px 0;
	}
	.score b {
		font-size: 32px;
		font-family: var(--dl-font-code);
	}
	.row {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		margin-top: 10px;
	}
	.btn {
		display: inline-block;
		font: inherit;
		font-size: 13px;
		padding: 6px 12px;
		border: 1px solid var(--dl-border-strong);
		border-radius: 6px;
		background: var(--dl-surface-raised);
		color: var(--dl-text);
		text-decoration: none;
		cursor: pointer;
	}
	.btn.pri {
		background: var(--dl-now);
		border-color: var(--dl-now);
		color: var(--dl-surface);
		font-weight: 700;
	}
	.btn:focus-visible,
	.opt:focus-visible,
	.mv:focus-visible {
		outline: 3px solid var(--dl-now);
		outline-offset: 2px;
	}
</style>
