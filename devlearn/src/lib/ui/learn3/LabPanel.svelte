<script lang="ts">
	// 試す（learn-standard.md 第 19 章）：つまみ 2〜4 個・結果の表・予想の問い 2 つ。
	// 結果はつまみの値だけから計算し直す（lab.ts。乱数なし）。つまみには何の値か・単位・範囲の説明（LS3-H5）
	import { answerPred, knobText, snapKnob, type Lab } from '../../learn/lab.ts';
	// part：knobs＝題・つまみ・結果の表（右の欄）、preds＝予想の問い（図の下の帯。内側のスクロールを作らない）
	type Props = {
		lab: Lab;
		onchange?: (v: Record<string, number>) => void;
		part?: 'all' | 'knobs' | 'preds';
	};
	let { lab, onchange, part = 'all' }: Props = $props();
	let vals = $derived<Record<string, number>>(Object.fromEntries(lab.knobs.map((k) => [k.k, k.v])));
	const rows = $derived(Object.keys(vals).length ? lab.results(vals) : []);
	let picked = $derived<(number | null)[]>(lab.preds.map(() => null));
	function set(k: string, x: number) {
		const kn = lab.knobs.find((q) => q.k === k);
		if (!kn) return;
		vals = { ...vals, [k]: snapKnob(kn, x) };
		onchange?.(vals);
	}
</script>

<section class="lab p-{part}" aria-label="試す：{lab.title}">
	{#if part !== 'preds'}
		<h3>{lab.title}</h3>
		<p class="intro">{lab.intro}</p>
		<div class="knobs">
			{#each lab.knobs as k (k.k)}
				<label title={k.d} data-knob={k.k}>
					<span class="name">{k.label}</span>
					<input
						type="range"
						min={k.min}
						max={k.max}
						step={k.step}
						value={vals[k.k] ?? k.v}
						aria-describedby="knob-{k.k}"
						oninput={(e) => set(k.k, Number(e.currentTarget.value))}
					/>
					<output>{knobText(k, vals[k.k] ?? k.v)}</output>
					<small id="knob-{k.k}">{k.d}</small>
				</label>
			{/each}
		</div>
		<table class="res">
			<tbody>
				{#each rows as r (r[0])}
					<tr data-term={r[2]}><th>{r[0]}</th><td>{r[1]}</td></tr>
				{/each}
			</tbody>
		</table>
	{/if}
	{#if part !== 'knobs'}
		<ol class="preds">
			{#each lab.preds as p, i (p.q)}
				{@const a = picked[i] === null || picked[i] === undefined ? null : answerPred(p, picked[i])}
				<li>
					<p class="q">{p.q}</p>
					<div class="opts">
						{#each p.opts as o, j (o)}
							<button
								type="button"
								class:on={picked[i] === j}
								aria-pressed={picked[i] === j}
								onclick={() => (picked = picked.map((x, q) => (q === i ? j : x)))}>{o}</button
							>
						{/each}
					</div>
					{#if a}
						<p class="ans" class:ok={a.ok} role="status">
							<b>{a.ok ? '当たり' : '外れ'}</b>
							{a.why}<br /><span class="try">試してみる：{a.tryit}</span>
						</p>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</section>

<style>
	.lab {
		font: 14px/1.6 var(--dl-font);
		color: var(--dl-ink);
	}
	/* 図の下の帯では 2 つの問いを横に並べる */
	.p-preds .preds {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		font-size: 13.5px;
		line-height: 1.5;
	}
	h3 {
		margin: 0 0 4px;
		font-size: 17px;
	}
	.intro {
		margin: 0 0 12px;
	}
	.knobs {
		display: grid;
		gap: 10px;
		margin-bottom: 12px;
	}
	label {
		display: grid;
		grid-template-columns: 9em 1fr 6em;
		align-items: center;
		gap: 4px 10px;
	}
	label small {
		grid-column: 1 / -1;
		color: var(--dl-ink-soft, var(--dl-ink));
		opacity: 0.8;
		font-size: 13px;
	}
	output {
		font-family: var(--dl-font-code);
		text-align: right;
	}
	.res {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 14px;
	}
	.res th,
	.res td {
		padding: 4px 8px;
		border-bottom: 1px solid color-mix(in srgb, var(--dl-ink) 15%, transparent);
		text-align: left;
	}
	.res td {
		font-family: var(--dl-font-code);
		text-align: right;
	}
	.preds {
		padding-left: 1.2em;
		margin: 0;
	}
	.q {
		margin: 0 0 6px;
		font-weight: 700;
	}
	.opts {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	button {
		font: inherit;
		padding: 4px 12px;
		border-radius: 999px;
		border: 1.5px solid var(--dl-ink);
		background: var(--dl-surface-raised);
		color: var(--dl-ink);
		cursor: pointer;
	}
	button.on {
		background: color-mix(in srgb, var(--dl-obj-blue) 30%, var(--dl-surface-raised));
	}
	.ans {
		margin: 6px 0 12px;
		padding: 6px 10px;
		border-radius: 8px;
		background: color-mix(in srgb, var(--dl-obj-red) 14%, transparent);
	}
	.ans.ok {
		background: color-mix(in srgb, var(--dl-obj-green) 18%, transparent);
	}
	.try {
		font-size: 13px;
	}
</style>
