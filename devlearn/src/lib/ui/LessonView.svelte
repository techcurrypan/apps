<script lang="ts">
	// レッスンの画面（screen-design.md 案 2「舞台と台本」）。
	// 帯（位置・段・進み）/ 舞台 / 操作帯 / 台本 の 4 領域。解説は全て stateAt(n) から描く。
	import { resolve } from '$app/paths';
	import { fieldName } from '../content/fields.ts';
	import { PARTS, movePart, partLabel, type Part } from '../lesson/parts.ts';
	import { stateAt } from '../lesson/state.ts';
	import type { Lesson } from '../lesson/types.ts';
	import { initial, reduce, type PlayerCommand, type PlayerState } from '../player/control.ts';
	import { layoutOf, type LayoutMode } from '../player/frame.ts';
	import { keyToCommand } from '../player/keys.ts';
	import { kindSlots } from '../player/kinds.ts';
	import Controls from './Controls.svelte';
	import ExampleView from './ExampleView.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import ScriptPanel from './ScriptPanel.svelte';
	import Stage from './Stage.svelte';
	import { inField, wideQuery } from './dom.ts';
	import ToolPractice from './ToolPractice.svelte';
	import TownReturn from './TownReturn.svelte';
	import { runTools } from '../practice/run.ts';
	import { loadProgress, markDone, saveProgress } from '../progress.ts';

	type Props = { lesson: Lesson; known: ReadonlyMap<string, string> };
	let { lesson, known }: Props = $props();

	let part = $state<Part>('explain');
	let player = $state<PlayerState>(initial(1));
	let checked = $state<boolean[]>([]);
	let practiceReplay = $state(0);
	const hasTool = $derived(runTools.includes(lesson.practice.tool?.name ?? ''));
	function onpass() {
		saveProgress(markDone(loadProgress(), lesson.id));
	}

	// レッスンが替わったら最初から
	$effect.pre(() => {
		player = initial(lesson.explain.length);
		checked = lesson.check.map(() => false);
		part = 'explain';
	});

	const step = $derived(stateAt(lesson, Math.min(player.n, lesson.explain.length)));
	// 2 列になる幅（60rem）を境に、図の並べ方を替える（screen-design.md 4.6・5 章）
	let mode = $state<LayoutMode>('wide');
	$effect(() => {
		const q = wideQuery();
		if (!q) return;
		const set = () => (mode = q.matches ? 'wide' : 'narrow');
		set();
		q.addEventListener('change', set);
		return () => q.removeEventListener('change', set);
	});
	const layout = $derived(layoutOf(lesson, mode));
	const slots = $derived(kindSlots(lesson));
	const latest = $derived(step.log.rows.at(-1));

	let autoTimer: ReturnType<typeof setTimeout> | undefined;
	function command(c: PlayerCommand) {
		clearTimeout(autoTimer);
		player = reduce(player, c);
	}
	function onfinish() {
		if (!player.auto) return;
		clearTimeout(autoTimer);
		autoTimer = setTimeout(() => command({ type: 'autoAdvance' }), 1500 / player.speed);
	}
	$effect(() => () => clearTimeout(autoTimer));

	function onkeydown(e: KeyboardEvent) {
		const c = keyToCommand({
			key: e.key,
			shiftKey: e.shiftKey,
			ctrlKey: e.ctrlKey,
			altKey: e.altKey,
			metaKey: e.metaKey,
			inField: inField(e.target)
		});
		if (!c) return;
		if (c.type === 'part') {
			part = movePart(part, c.dir);
		} else if (c.type === 'theme' || c.type === 'map' || c.type === 'help' || c.type === 'work') {
			return; // 枠（+layout）が受け持つ
		} else if (part === 'explain') {
			command(c);
		} else if (part === 'practice' && c.type === 'replay') {
			practiceReplay++;
		} else return;
		e.preventDefault();
	}

	const title = (id: string) => known.get(id) ?? id;
</script>

<svelte:window {onkeydown} />

<div class="lesson">
	<!-- 帯 -->
	<nav class="where" aria-label="位置">
		<a href={resolve('/map')}>地図</a>
		<span aria-hidden="true">›</span>
		<span>{fieldName(lesson.field)}</span>
		<span aria-hidden="true">›</span>
		<span>{lesson.title}</span>
		<span aria-hidden="true">›</span>
		<strong>{partLabel(part)}</strong>
		<a class="totown" href={resolve('/town')} aria-keyshortcuts="G">街へ</a>
	</nav>

	<div class="parts" role="tablist" aria-label="段">
		{#each PARTS as p (p)}
			<button
				type="button"
				role="tab"
				aria-selected={p === part}
				class:on={p === part}
				onclick={() => (part = p)}
			>
				{p === part ? '▶ ' : ''}{partLabel(p)}
			</button>
		{/each}
	</div>

	{#if part === 'explain'}
		<ProgressBar progress={step.progress} ongo={(n) => command({ type: 'go', n })} />
		<div class="grid" data-step={step.n}>
			<div class="left">
				<Stage
					scene={step.scene}
					{layout}
					{slots}
					run={player.run}
					speed={player.speed}
					{onfinish}
				/>
				{#if latest}
					<p class="latest" data-step={latest.n}>
						<span aria-hidden="true">▶</span>
						<code>{latest.t}</code>
						{latest.from} → {latest.to}：{latest.info}
					</p>
				{/if}
				<Controls {player} onCommand={command} />
			</div>
			<div class="right">
				<ScriptPanel state={step} {slots} />
			</div>
		</div>
	{:else if part === 'practice' && hasTool}
		<div role="tabpanel" aria-label={partLabel(part)}>
			<ToolPractice practice={lesson.practice} replay={practiceReplay} {onpass} />
		</div>
	{:else}
		<div class="panel" role="tabpanel" aria-label={partLabel(part)}>
			{#if part === 'goal'}
				<h2>目的</h2>
				<p class="goal">{lesson.goal}</p>
				<p class="meta">
					分野：{fieldName(lesson.field)} ／ 難しさ：{['初級', '中級', '上級'][lesson.level - 1]}
					／ 解説 {lesson.explain.length} ステップ
				</p>
			{:else if part === 'prereq'}
				<h2>前提</h2>
				<p>推奨の前提。読んでいなくても、このレッスンは開いて進められる。</p>
				{#if lesson.prereq.length === 0}
					<p>推奨の前提は無い。</p>
				{:else}
					<ul>
						{#each lesson.prereq as id (id)}
							<li><a href={resolve('/lesson/[id]', { id })}>{title(id)}</a></li>
						{/each}
					</ul>
				{/if}
			{:else if part === 'example'}
				<ExampleView example={lesson.example} />
			{:else if part === 'practice'}
				{#if !hasTool}
					<h2>実戦</h2>
					<p class="goal">{lesson.practice.goal}</p>
					<p>この実戦の道具は準備中。</p>
				{/if}
			{:else if part === 'check'}
				<h2>確認</h2>
				<ul class="checks">
					{#each lesson.check as c, i (c.ask)}
						<li>
							<label>
								<input type="checkbox" bind:checked={checked[i]} />
								<span>{c.ask}</span>
							</label>
							<span class="how">確かめ方：{c.how}</span>
						</li>
					{/each}
				</ul>
				<p class="meta">{checked.filter(Boolean).length} / {lesson.check.length} を確かめた</p>
			{:else if part === 'next'}
				<h2>次</h2>
				{#if lesson.next.length + lesson.related.length === 0}
					<p>
						このレッスンから続くレッスンは、まだ書かれていない。<a href={resolve('/map')}>地図</a
						>から選べる。
					</p>
				{/if}
				{#if lesson.next.length > 0}
					<h3>次に学ぶとよい</h3>
					<ul>
						{#each lesson.next as id (id)}
							<li><a href={resolve('/lesson/[id]', { id })}>{title(id)}</a></li>
						{/each}
					</ul>
				{/if}
				{#if lesson.related.length > 0}
					<h3>関連</h3>
					<ul>
						{#each lesson.related as id (id)}
							<li><a href={resolve('/lesson/[id]', { id })}>{title(id)}</a></li>
						{/each}
					</ul>
				{/if}
				<TownReturn lessonId={lesson.id} />
			{/if}
		</div>
	{/if}
</div>

<style>
	.lesson {
		display: flex;
		flex-direction: column;
		gap: var(--dl-space-3);
	}
	.where {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dl-space-2);
		font-size: var(--dl-text-small);
		color: var(--dl-text-muted);
	}
	.totown {
		margin-left: auto;
	}
	.parts {
		display: flex;
		gap: var(--dl-space-1);
		overflow-x: auto;
		padding-bottom: var(--dl-space-1);
	}
	.parts button {
		flex: none;
		border-radius: var(--dl-radius-inner);
	}
	.parts button.on {
		border: 2px solid var(--dl-now);
		color: var(--dl-now);
		font-weight: 700;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--dl-space-4);
		/* 狭い幅では操作帯が画面の下に固定されるので、その分を空ける */
		padding-bottom: 7rem;
	}
	.left,
	.right {
		display: flex;
		flex-direction: column;
		gap: var(--dl-space-3);
		min-width: 0;
	}
	.latest {
		margin: 0;
		font-size: var(--dl-text-small);
		background: var(--dl-surface);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius-inner);
		padding: var(--dl-space-2) var(--dl-space-3);
	}
	.latest span {
		color: var(--dl-now);
	}
	@media (min-width: 60rem) {
		.grid {
			grid-template-columns: 3fr 2fr;
			align-items: start;
			padding-bottom: 0;
		}
		.left {
			position: sticky;
			top: var(--dl-space-2);
		}
	}
	.panel {
		background: var(--dl-surface);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius-box);
		padding: var(--dl-space-6);
	}
	.goal {
		font-size: var(--dl-text-lead);
		font-weight: 700;
	}
	.meta {
		color: var(--dl-text-muted);
		font-size: var(--dl-text-small);
	}
	.checks {
		list-style: none;
		padding: 0;
	}
	.checks li {
		padding: var(--dl-space-2) 0;
		border-bottom: 1px solid var(--dl-border);
	}
	.checks label {
		display: flex;
		gap: var(--dl-space-2);
		align-items: center;
		min-height: var(--dl-tap);
	}
	.checks input {
		width: 1.25rem;
		height: 1.25rem;
	}
	.how {
		display: block;
		color: var(--dl-text-muted);
		font-size: var(--dl-text-small);
		padding-left: 2rem;
	}
</style>
