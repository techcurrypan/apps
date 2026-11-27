<script lang="ts">
	// 思い出す の右の欄（learn-standard.md 第 19 章）：1 問ずつ。選ぶ・並べる・図を押す・数・説明（短い文）。
	// 答えると当たり外れと理由。最後に点と手帳の 1 枚。図を押す問いの答えは親が図から渡す（hitPick）
	import {
		checkRecall,
		moveItem,
		recallScore,
		type RecallAnswer,
		type RecallResult,
		type RecallSet
	} from '../../learn/recall3.ts';

	type Props = {
		set: RecallSet;
		/** 今の問いの番号（親と図で共有） */
		qi: number;
		onqi: (i: number) => void;
		/** 図で押した物（図を押す問いの答え） */
		hitPick: string | null;
	};
	let { set, qi, onqi, hitPick }: Props = $props();
	let results = $state<(RecallResult | undefined)[]>([]);
	let orders = $state<Record<number, string[]>>({});
	let typed = $state('');
	const q = $derived(set.qs[qi]);
	const res = $derived(results[qi]);
	const end = $derived(qi >= set.qs.length);
	const score = $derived(recallScore(set.qs.map((_, i) => results[i]?.ok)));
	const order = $derived(q?.k === 'order' ? (orders[qi] ?? q.start) : []);

	function answer(a: RecallAnswer) {
		if (!q || res) return;
		const r = checkRecall(q, a);
		results = set.qs.map((_, i) => (i === qi ? r : results[i]));
	}
	$effect(() => {
		if (hitPick && q?.k === 'hit' && !res) answer(hitPick);
	});
	function next() {
		typed = '';
		onqi(qi + 1);
	}
</script>

<section class="recall" aria-label="思い出す">
	{#if !end && q}
		<p class="no">問 {qi + 1} / {set.qs.length}</p>
		<h3>{q.q}</h3>
		{#if q.k === 'pick'}
			<div class="opts">
				{#each q.opts as o, j (o)}
					<button
						type="button"
						disabled={!!res}
						class:ok={res && j === q.ans}
						onclick={() => answer(j)}>{o}</button
					>
				{/each}
			</div>
		{:else if q.k === 'order'}
			<ol class="ord">
				{#each order as it, j (it)}
					<li>
						<span>{it}</span>
						<button
							type="button"
							aria-label="上へ"
							disabled={!!res}
							onclick={() => (orders = { ...orders, [qi]: moveItem(order, j, -1) })}>↑</button
						>
						<button
							type="button"
							aria-label="下へ"
							disabled={!!res}
							onclick={() => (orders = { ...orders, [qi]: moveItem(order, j, 1) })}>↓</button
						>
					</li>
				{/each}
			</ol>
			{#if !res}<button type="button" class="go" onclick={() => answer(order)}>これで答える</button
				>{/if}
		{:else if q.k === 'hit'}
			<p class="hint">左の図の、光っている置き場を押す（Tab で選んで Enter でもよい）</p>
		{:else if q.k === 'num'}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					answer(typed);
				}}
			>
				<input bind:value={typed} inputmode="numeric" aria-label="数" disabled={!!res} />
				<span>{q.unit}</span>
				{#if !res}<button type="submit" class="go">答える</button>{/if}
			</form>
		{:else if q.k === 'text'}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					answer(typed);
				}}
			>
				<textarea bind:value={typed} rows="3" aria-label="説明" disabled={!!res}></textarea>
				{#if !res}<button type="submit" class="go">答える</button>{/if}
			</form>
		{/if}
		{#if res}
			<div class="res" class:ok={res.ok} role="status">
				<b>{res.ok ? '当たり' : '外れ'}</b>
				{res.why}
				{#if !res.ok && res.missing?.length}<br /><span>足りない言葉：{res.missing.join('・')}</span
					>{/if}
				{#if q.k === 'text'}<br /><span>手本：{q.model}</span>{/if}
			</div>
			<button type="button" class="go" onclick={next}
				>{qi + 1 < set.qs.length ? '次の問い' : '点を見る'} →</button
			>
		{/if}
	{:else}
		<h3>点：{score.right} / {score.total}</h3>
		<div class="note">
			<b>手帳の 1 枚</b>
			<ul>
				{#each set.note as n (n)}<li>{n}</li>{/each}
			</ul>
		</div>
		<button
			type="button"
			class="go"
			onclick={() => {
				results = [];
				orders = {};
				onqi(0);
			}}>もう一度</button
		>
	{/if}
</section>

<style>
	.recall {
		font: 14px/1.6 var(--dl-font);
		color: var(--dl-ink);
		display: grid;
		gap: 10px;
	}
	.no {
		margin: 0;
		font-weight: 800;
		opacity: 0.8;
	}
	h3 {
		margin: 0;
		font-size: 16px;
	}
	.opts {
		display: grid;
		gap: 6px;
	}
	button {
		font: inherit;
		color: inherit;
		background: transparent;
		border: 1px solid var(--dl-line, #8888);
		border-radius: 10px;
		padding: 4px 10px;
		cursor: pointer;
		text-align: left;
	}
	button.ok {
		border-color: var(--dl-obj-green);
		color: var(--dl-obj-green);
		font-weight: 800;
	}
	.go {
		justify-self: start;
		font-weight: 800;
	}
	.ord {
		margin: 0;
		padding-left: 1.6em;
		display: grid;
		gap: 4px;
	}
	.ord li span {
		display: inline-block;
		min-width: 14em;
		font-family: var(--dl-mono, monospace);
	}
	.ord button {
		padding: 0 8px;
	}
	input,
	textarea {
		font: inherit;
		color: inherit;
		background: transparent;
		border: 1px solid var(--dl-line, #8888);
		border-radius: 8px;
		padding: 4px 8px;
		width: 100%;
		box-sizing: border-box;
	}
	form {
		display: grid;
		gap: 6px;
	}
	.res {
		border-left: 4px solid var(--dl-obj-red);
		padding: 4px 10px;
	}
	.res.ok {
		border-color: var(--dl-obj-green);
	}
	.note {
		border: 1px solid var(--dl-line, #8888);
		border-radius: 12px;
		padding: 8px 12px;
	}
	.note ul {
		margin: 4px 0 0;
		padding-left: 1.2em;
	}
</style>
