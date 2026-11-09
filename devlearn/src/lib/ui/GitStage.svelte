<script lang="ts">
	// 実戦の舞台（git）：作業ツリー・ステージ・リポジトリ。
	// 打った 1 行の前の絵 → 後の絵を見せ、替わった所に印を付ける。run が替わるたびに前から見せ直す。
	import { changedKeys, type GitPicture } from '../practice/git-picture.ts';
	import { prefersReducedMotion } from './dom.ts';

	type Props = { before: GitPicture | null; after: GitPicture; run: number };
	let { before, after, run }: Props = $props();

	let phase = $state<'before' | 'after'>('after');
	const shown = $derived(phase === 'before' && before ? before : after);
	const changed = $derived(before ? changedKeys(before, after) : new Set<string>());

	$effect(() => {
		void run;
		void after;
		if (!before) {
			phase = 'after';
			return;
		}
		phase = 'before';
		const hold = prefersReducedMotion() ? 300 : 700;
		const t = setTimeout(() => (phase = 'after'), hold);
		return () => clearTimeout(t);
	});

	const isNew = (key: string) => phase === 'after' && changed.has(key);
</script>

<figure class="stage" data-phase={phase} aria-label="道具の状態">
	<div class="cols">
		<section class="col" aria-label="作業ツリー">
			<h3>作業ツリー</h3>
			<p class="sub">/home/learner/demo</p>
			<ul>
				{#each shown.worktree as f (f.key)}
					<li class:new={isNew(f.key)}>
						{#if isNew(f.key)}<span class="mark" aria-hidden="true">▶</span>{/if}
						<code>{f.name}</code>
						{#if f.mark.trim()}<span class="tag">{f.mark.trim()}</span>{/if}
					</li>
				{:else}
					<li class="none">（空）</li>
				{/each}
			</ul>
		</section>
		<section class="col" aria-label="ステージ">
			<h3>ステージ</h3>
			<p class="sub">次の記録の一覧</p>
			<ul>
				{#if !shown.repo}
					<li class="none">（リポジトリが無い）</li>
				{/if}
				{#each shown.index as f (f.key)}
					<li class:new={isNew(f.key)}>
						{#if isNew(f.key)}<span class="mark" aria-hidden="true">▶</span>{/if}
						<code>{f.name}</code> <code class="id">{f.id}</code>
					</li>
				{:else}
					{#if shown.repo}<li class="none">（空）</li>{/if}
				{/each}
			</ul>
		</section>
		<section class="col" aria-label="リポジトリ">
			<h3>リポジトリ</h3>
			<p class="sub">{shown.repo ? `.git（枝 ${shown.branch}）` : '.git は無い'}</p>
			<ul>
				{#each shown.commits as c (c.key)}
					<li class:new={isNew(c.key)}>
						{#if isNew(c.key)}<span class="mark" aria-hidden="true">▶</span>{/if}
						<code class="id">{c.id}</code>
						{c.subject}
						{#each c.refs as r (r)}<span class="tag">{r}</span>{/each}
					</li>
				{:else}
					{#if shown.repo}<li class="none">（記録は無い）</li>{/if}
				{/each}
			</ul>
		</section>
	</div>
	<figcaption>
		<span class:on={phase === 'before'}>前</span>
		<span aria-hidden="true">→</span>
		<span class:on={phase === 'after'}>後</span>
		{#if phase === 'after' && changed.size > 0}
			<span class="count">（▶ が替わった所：{changed.size}）</span>
		{/if}
	</figcaption>
</figure>

<style>
	.stage {
		margin: 0;
		background: var(--dl-surface-raised);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius-box);
		padding: var(--dl-space-3);
	}
	.cols {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--dl-space-2);
	}
	.col {
		background: var(--dl-surface);
		border: 1.5px solid var(--dl-border-strong);
		border-radius: var(--dl-radius);
		padding: var(--dl-space-2);
		min-width: 0;
	}
	h3 {
		margin: 0;
		font-size: var(--dl-text-body);
	}
	.sub {
		margin: 0 0 var(--dl-space-1);
		font-size: var(--dl-text-small);
		color: var(--dl-text-muted);
		font-family: var(--dl-font-code);
		overflow-wrap: anywhere;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: var(--dl-text-small);
	}
	li {
		padding: 2px 4px;
		border: 2px solid transparent;
		border-radius: var(--dl-radius-inner);
		overflow-wrap: anywhere;
	}
	li.new {
		border-color: var(--dl-now);
		animation: appear var(--dl-motion-op) ease-out;
	}
	.mark {
		color: var(--dl-now);
	}
	.none {
		color: var(--dl-text-muted);
	}
	.id {
		color: var(--dl-text-muted);
	}
	.tag {
		display: inline-block;
		margin-left: 4px;
		padding: 0 4px;
		border: 1px solid var(--dl-border-strong);
		border-radius: var(--dl-radius-inner);
		font-family: var(--dl-font-code);
		font-size: 0.75rem;
	}
	@keyframes appear {
		from {
			opacity: 0.2;
		}
		to {
			opacity: 1;
		}
	}
	figcaption {
		margin-top: var(--dl-space-2);
		font-size: var(--dl-text-small);
		color: var(--dl-text-muted);
		display: flex;
		gap: var(--dl-space-2);
		flex-wrap: wrap;
	}
	figcaption .on {
		color: var(--dl-now);
		font-weight: 700;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	@media (max-width: 40rem) {
		.cols {
			grid-template-columns: 1fr;
		}
	}
</style>
