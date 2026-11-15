<script lang="ts">
	// レッスン画面（screen-design.md 第 11 章。D-21）。手本は docs/prototype/learn/learn10.html。合否は learn-standard.md。
	// 見る・やってみる・思い出すの 3 つ。図・一行の説明・時間の帯・中身の板・台本・記録は、全て (出来事, 段階) から描く。
	import { resolve } from '$app/paths';
	import { fieldName } from '../../content/fields.ts';
	import type { Lesson } from '../../lesson/types.ts';
	import { geometryOf } from '../../learn/geometry.ts';
	import { growsOf } from '../../learn/grow.ts';
	import { beatsOf, changesAt, insideAt, type Phase } from '../../learn/model.ts';
	import {
		NOTES_KEY,
		PREFS_KEY,
		SUMMARY_KEY,
		parseNotes,
		parsePrefs,
		parseSummary,
		read,
		write,
		type Depth,
		type Prefs
	} from '../../learn/prefs.ts';
	import { kindSlots } from '../../player/kinds.ts';
	import sqlWasm from 'sql.js/dist/sql-wasm-browser.wasm?url';
	import { gitBoard } from '../../practice/git-picture.ts';
	import {
		boardAt,
		openRun,
		rewindRun,
		runTools,
		typeRun,
		useSqlWasm,
		type Run
	} from '../../practice/run.ts';
	import { goalsOf, hostOf, tryLesson } from '../../learn/try.ts';
	import { loadProgress, markDone, saveProgress } from '../../progress.ts';
	import { inField, prefersReducedMotion } from '../dom.ts';
	import FormPractice from '../FormPractice.svelte';
	import Diagram from './Diagram.svelte';
	import InsideBoard from './InsideBoard.svelte';
	import TryPanel from './TryPanel.svelte';
	import RecallPanel from './RecallPanel.svelte';
	import { addNote, noteOf } from '../../learn/recall.ts';

	type Props = { lesson: Lesson; known: ReadonlyMap<string, string> };
	let { lesson, known }: Props = $props();

	type Mode = 'watch' | 'try' | 'recall';
	const MODES: { id: Mode; label: string }[] = [
		{ id: 'watch', label: '見る' },
		{ id: 'try', label: 'やってみる' },
		{ id: 'recall', label: '思い出す' }
	];
	const DONE_KEY = 'devlearn.learn.done';

	let prefs = $state<Prefs>(parsePrefs(null));
	let mode = $state<Mode>('watch');
	let doneModes = $state<Record<string, Partial<Record<Mode, boolean>>>>({});
	let summary = $state<{ money: number; happy: number } | null>(null);
	let notes = $state(0);
	/** 学んだ手の数（やってみるに合格したレッスン。街の「学んだ手」と同じ集まり。LS-P10） */
	let hands = $state(0);
	let handsUp = $state(false);
	let showNotes = $state(false);
	let reduced = $state(false);
	$effect(() => {
		prefs = parsePrefs(read(PREFS_KEY));
		summary = parseSummary(read(SUMMARY_KEY));
		notes = parseNotes(read(NOTES_KEY)).length;
		hands = loadProgress().done.length;
		try {
			doneModes = JSON.parse(read(DONE_KEY) ?? '{}') as typeof doneModes;
		} catch {
			doneModes = {};
		}
		reduced = prefersReducedMotion();
	});
	function setPrefs(p: Partial<Prefs>) {
		prefs = { ...prefs, ...p };
		write(PREFS_KEY, prefs);
	}
	function markMode(m: Mode) {
		const cur = doneModes[lesson.id] ?? {};
		if (cur[m]) return;
		doneModes = { ...doneModes, [lesson.id]: { ...cur, [m]: true } };
		write(DONE_KEY, doneModes);
	}

	// ---- やってみる（道具を使う実戦）：打った命令の並びから「やってみるのレッスン」を作り、見ると同じ図で描く ----
	useSqlWasm(sqlWasm);
	const hasTool = $derived(runTools.includes(lesson.practice.tool?.name ?? ''));
	let run = $state.raw<Run | null>(null);
	let busy = $state(false);
	$effect.pre(() => {
		run = hasTool ? openRun(lesson.practice) : null;
	});
	const addr = $derived(run ? run.kit.prompt.replace(/\s*\$$/, '') : '');
	const boardOf = (r: Run, i: number) => {
		const b = boardAt(r, i);
		return b.git ? gitBoard(b.git) : b.board;
	};
	const tryL = $derived(
		run
			? tryLesson(
					lesson,
					run.steps,
					Array.from({ length: run.steps.length + 1 }, (_, i) => boardOf(run as Run, i)),
					addr
				)
			: lesson
	);
	const startHosts = $derived(run ? [hostOf(lesson, boardOf(run, 0), addr)] : null);
	const trying = $derived(mode === 'try' && run !== null);
	/** 描くレッスン：やってみるでは打った命令の並び、ほかは元のレッスン */
	const drawn = $derived(trying ? tryL : lesson);
	const goals = $derived(run ? goalsOf(run.judge) : []);

	const beats = $derived(beatsOf(drawn));
	const watchBeats = $derived(beatsOf(lesson));
	const geo = $derived(geometryOf(drawn, prefs.town));
	const slots = $derived(kindSlots(drawn));
	const kindOf = (kind: string) => slots.get(kind) ?? 5;
	const slotOfStep = (step: number) => kindOf(drawn.explain[step - 1]?.log.kind ?? '');
	const grows = $derived(growsOf(lesson.id, lesson.field));
	const nodeOf = (id: string) => geo.nodes.find((n) => n.id === id);
	const townOfLabel = (label: string) => geo.nodes.find((n) => n.label === label)?.town ?? '';
	const withTown = (label: string) => {
		const t = townOfLabel(label);
		return t ? `${label}（${t}）` : label;
	};

	// ---- 再生（LS-M） ----
	let k = $state(0);
	let phase = $state<Phase>('after');
	let t = $state(1);
	let playing = $state(false);
	let ask = $state<number | null>(null);
	let asked = $state<Record<number, number>>({});
	let fb = $state<{ good: boolean; head: string; why: string } | null>(null);
	let reach = $state(0);
	let raf = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	const MOVE_MS = 1600;
	const SELF_MS = 750;
	const LEAD_MS = 380;
	const speed = $derived(prefs.speed);

	$effect.pre(() => {
		void lesson.id;
		cancel();
		k = 0;
		phase = 'after';
		t = 1;
		reach = 0;
		ask = null;
		asked = {};
		fb = null;
		playing = false;
		mode = 'watch';
	});
	$effect(() => () => cancel());

	function cancel() {
		cancelAnimationFrame(raf);
		clearTimeout(timer);
	}
	const askOf = (n: number) => {
		const b = beats[n];
		return b && b.first && b.step > 0 ? (drawn.explain[b.step - 1]?.ask ?? null) : null;
	};
	function animate(to: number) {
		cancel();
		k = to;
		reach = Math.max(reach, to);
		const b = beats[to];
		if (to === 0 || !b || reduced) {
			phase = 'after';
			t = 1;
			afterBeat();
			return;
		}
		phase = 'before';
		t = 0;
		timer = setTimeout(() => {
			phase = 'moving';
			const dur = (b.move && b.move.from !== b.move.to ? MOVE_MS : SELF_MS) / speed;
			const t0 = performance.now();
			const tick = (now: number) => {
				t = Math.min(1, (now - t0) / dur);
				if (t < 1) raf = requestAnimationFrame(tick);
				else {
					phase = 'after';
					afterBeat();
				}
			};
			raf = requestAnimationFrame(tick);
		}, LEAD_MS / speed);
	}
	function jump(to: number) {
		cancel();
		k = Math.max(0, Math.min(beats.length - 1, to));
		reach = Math.max(reach, k);
		phase = 'after';
		t = 1;
		ask = null;
	}
	function next() {
		if (ask !== null) return;
		const n = k + 1;
		if (n >= beats.length) {
			playing = false;
			return;
		}
		if (askOf(n) && asked[n] === undefined) {
			cancel();
			phase = 'after';
			t = 1;
			ask = n;
			playing = false;
			return;
		}
		fb = null;
		animate(n);
	}
	function prev() {
		fb = null;
		jump(k - 1);
	}
	function answer(i: number) {
		const n = ask;
		if (n === null) return;
		const a = askOf(n);
		asked = { ...asked, [n]: i };
		ask = null;
		fb =
			i < 0 || !a
				? null
				: i === a.a
					? { good: true, head: '✓ 予想どおり', why: a.why }
					: { good: false, head: `✕ 予想とちがった ── 答え：${a.opts[a.a]}`, why: a.why };
		animate(n);
	}
	function afterBeat() {
		if (k === beats.length - 1 && mode === 'watch' && !doneModes[lesson.id]?.watch) {
			markMode('watch');
			toast(
				`見るを終えた。${grows.system ? grows.system + 'の手が 1 つ育つ ── ' : ''}次は「やってみる」`
			);
		}
		if (playing) {
			if (k < beats.length - 1) timer = setTimeout(() => playing && next(), 1100 / speed);
			else playing = false;
		}
	}
	function toggleAuto() {
		playing = !playing;
		if (playing) {
			if (k >= beats.length - 1) jump(0);
			next();
		} else cancel();
	}

	// ---- 知らせ（LS-M7） ----
	let note = $state<string | null>(null);
	let noteTimer: ReturnType<typeof setTimeout> | undefined;
	function toast(s: string) {
		note = s;
		clearTimeout(noteTimer);
		noteTimer = setTimeout(() => (note = null), 4200);
	}

	// ---- 今の出来事 ----
	const beat = $derived(beats[k] ?? beats[0]);
	const step = $derived(beat.step > 0 ? (drawn.explain[beat.step - 1] ?? null) : null);
	const inside = $derived(insideAt(drawn, k, phase, trying ? startHosts : null));
	const changes = $derived(phase === 'after' ? changesAt(drawn, k) : []);
	const head = $derived(
		beat.move
			? {
					k: beat.k,
					from: withTown(nodeOf(beat.move.from)?.label ?? beat.move.from),
					to: withTown(nodeOf(beat.move.to)?.label ?? beat.move.to),
					kind: beat.move.kind,
					slot: kindOf(beat.move.kind)
				}
			: null
	);
	const lastPacket = $derived.by(() => {
		for (let i = k; i >= 1; i--) {
			const b = beats[i];
			const p = b.first && b.move ? drawn.explain[b.step - 1]?.inside?.packet : undefined;
			if (p && b.move && (i < k || phase === 'after'))
				return {
					packet: p,
					k: i,
					from: withTown(nodeOf(b.move.from)?.label ?? b.move.from),
					to: withTown(nodeOf(b.move.to)?.label ?? b.move.to),
					kind: b.move.kind,
					slot: kindOf(b.move.kind)
				};
		}
		return null;
	});
	const rowOf = (n: number) => {
		const b = beats[n];
		const st = drawn.explain[b.step - 1];
		if (b.last || !b.move) return { ...st.log, k: n, slot: kindOf(st.log.kind) };
		return {
			t: st.log.t,
			from: nodeOf(b.move.from)?.label ?? b.move.from,
			to: nodeOf(b.move.to)?.label ?? b.move.to,
			kind: b.move.kind,
			info: b.move.payload,
			size: undefined,
			k: n,
			slot: kindOf(b.move.kind)
		};
	};
	const rows = $derived(beats.slice(1, Math.max(k, reach) + 1).map((b) => rowOf(b.k)));
	const cap = $derived.by(() => {
		if (k === 0 || !step)
			return { n: 0, slot: 1, b: lesson.title, s: `${lesson.goal}（→ で始める）` };
		const r = rowOf(k);
		const what = beat.move ? `「${beat.move.payload}」` : r.info;
		return {
			n: k,
			slot: r.slot,
			b: `${withTown(r.from)}${r.from !== r.to ? ' → ' + withTown(r.to) : ''}：${what}`,
			s: step.town ? `町でいうと：${step.town}` : step.lead
		};
	});
	const bodyText = $derived.by(() => {
		if (!step) return [];
		if (prefs.depth === 1)
			return [step.town ? `町でいうと、${step.town}` : step.lead, step.body[0]];
		if (prefs.depth === 2) return step.body;
		const p = step.inside?.packet;
		if (!p) return [...step.body, ...(step.why ? [`なぜ：${step.why}`] : [])];
		const sizes = p.parts.map(
			(x) => `${x.name} ${x.fields.reduce((a, f) => a + (f.at?.[1] ?? 0), 0)} B`
		);
		const sum = p.parts.flatMap((x) =>
			x.fields.filter((f) => f.k === 'チェックサム').map((f) => `${x.name} のチェックサム ${f.v}`)
		);
		return [
			...step.body,
			`荷物 ${p.size} の内訳は ${sizes.join(' ＋ ')}。外側の層ほど先に読まれる。`,
			...(sum.length > 0
				? [`${sum.join('、')} は、受け手が計算し直して壊れていないかを確かめる。`]
				: [])
		];
	});
	const chapters = $derived(
		lesson.explain.map((s, i) => ({
			n: i + 1,
			title: s.title,
			lead: s.lead,
			beats: watchBeats.filter((b) => b.step === i + 1)
		}))
	);
	const words = $derived(
		geo.nodes
			.filter((n) => n.town)
			.map((n) => {
				const st = lesson.explain.find((s) =>
					s.scene.some((o) => o.op === 'appear' && o.id === n.id)
				);
				return { town: n.town, it: n.label, def: st?.lead ?? '' };
			})
	);
	const work = $derived(
		step?.work ?? lesson.example.lines.find((l) => l.startsWith('$ '))?.slice(2) ?? null
	);
	const title = (id: string) => known.get(id) ?? id;
	const alt = $derived(
		k === 0
			? `${lesson.title} の図。${geo.nodes.map((n) => n.label).join('、')}`
			: `出来事 ${k}：${cap.b}`
	);

	// ---- やってみる ----
	let replay = $state(0);
	async function send(text: string) {
		if (!run || busy) return;
		busy = true;
		const was = run.passed;
		try {
			run = await typeRun(run, run.editor === null ? text.trim() : text);
		} finally {
			busy = false;
		}
		const n = run.steps.length;
		reach = n;
		fb = null;
		animate(n);
		if (run.passed && !was) onpass();
	}
	function resetTry() {
		cancel();
		run = openRun(lesson.practice);
		k = 0;
		reach = 0;
		phase = 'after';
		t = 1;
	}
	function rewindTry(n: number) {
		if (!run) return;
		cancel();
		run = rewindRun(run, n);
		k = Math.min(n, run.steps.length);
		reach = k;
		phase = 'after';
		t = 1;
	}
	const request = $derived(
		grows.requests[0] ? { who: grows.requests[0].client, text: grows.requests[0].symptom } : null
	);

	// ---- 学び方の切り替え（見るの位置は覚えておき、戻ると続きから） ----
	let watchAt = { k: 0, reach: 0 };
	function setMode(m: Mode) {
		if (m === mode) return;
		cancel();
		playing = false;
		ask = null;
		fb = null;
		if (mode === 'watch') watchAt = { k, reach };
		mode = m;
		phase = 'after';
		t = 1;
		if (m === 'watch') {
			k = watchAt.k;
			reach = watchAt.reach;
		} else if (m === 'try') {
			k = run ? run.steps.length : beatsOf(lesson).length - 1;
			reach = k;
		} else {
			k = 0;
			reach = 0;
		}
	}
	function onpass() {
		const before = loadProgress();
		const after = markDone(before, lesson.id);
		saveProgress(after);
		if (after.done.length > before.done.length) {
			hands = after.done.length;
			handsUp = true;
			setTimeout(() => (handsUp = false), 2400);
		}
		markMode('try');
		toast(
			grows.moves.length > 0
				? `合格。街の手「${grows.moves[0]}」が使えるようになった`
				: '合格。修了の記録に残した'
		);
	}

	// ---- 思い出す（LS-R） ----
	let recallPanel = $state<ReturnType<typeof RecallPanel>>();
	function finishRecall(ok: number, n: number) {
		const list = addNote(parseNotes(read(NOTES_KEY)), noteOf(lesson, ok, n));
		write(NOTES_KEY, list);
		notes = list.length;
		markMode('recall');
		toast(`思い出すを終えた（${ok} / ${n}）。手帳に 1 枚残した`);
	}
	function openNotes() {
		showNotes = true;
		queueMicrotask(() => window.scrollTo({ top: 0 }));
	}

	// ---- キー（LS-X3） ----
	function onkeydown(e: KeyboardEvent) {
		if (inField(e.target) || e.ctrlKey || e.altKey || e.metaKey) return;
		if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
			const i = MODES.findIndex((m) => m.id === mode);
			setMode(MODES[(i + (e.key === 'ArrowRight' ? 1 : MODES.length - 1)) % MODES.length].id);
			e.preventDefault();
			return;
		}
		if (mode === 'recall') {
			if (/^[1-9]$/.test(e.key)) {
				recallPanel?.key(Number(e.key) - 1);
				e.preventDefault();
			}
			return;
		}
		if (mode === 'try' && !trying) {
			if (e.key === 'r' || e.key === 'R') {
				replay++;
				e.preventDefault();
			}
			return;
		}
		if (mode === 'try' && (e.key === ' ' || e.key === '-' || e.key === '+' || e.key === '='))
			return;
		if (ask !== null && /^[1-9]$/.test(e.key)) {
			const i = Number(e.key) - 1;
			if (i < (askOf(ask)?.opts.length ?? 0)) answer(i);
			e.preventDefault();
			return;
		}
		switch (e.key) {
			case 'ArrowRight':
				next();
				break;
			case 'ArrowLeft':
				prev();
				break;
			case ' ':
				toggleAuto();
				break;
			case 'r':
			case 'R':
				if (k > 0) animate(k);
				break;
			case 'Home':
				jump(0);
				break;
			case 'End':
				jump(beats.length - 1);
				break;
			case '-':
				setPrefs({ speed: prefs.speed === 2 ? 1 : 0.5 });
				break;
			case '+':
			case '=':
				setPrefs({ speed: prefs.speed === 0.5 ? 1 : 2 });
				break;
			default:
				return;
		}
		e.preventDefault();
		e.stopPropagation();
	}
	const press = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key }));
	const LEVELS = ['初級', '中級', '上級'];
	const DEPTHS: { d: Depth; label: string }[] = [
		{ d: 1, label: 'はじめて' },
		{ d: 2, label: '現場' },
		{ d: 3, label: '中身まで' }
	];
</script>

<svelte:window {onkeydown} />

<div class="learn" data-mode={mode}>
	<header class="top">
		<a class="logo" href={resolve('/')}><b>devlearn</b><small>港町で学ぶ IT</small></a>
		<a class="btn town" href={resolve('/town')} aria-keyshortcuts="G">⌂ 街</a>
		<a class="btn" href={resolve('/map')} aria-keyshortcuts="M">地図</a>
		<span class="fld">{fieldName(lesson.field)}</span>
		<span class="sp"></span>
		<div class="seg" role="group" aria-label="詳しさ">
			<span>詳しさ</span>
			{#each DEPTHS as x (x.d)}
				<button
					type="button"
					aria-pressed={prefs.depth === x.d}
					onclick={() => setPrefs({ depth: x.d })}>{x.label}</button
				>
			{/each}
		</div>
		<div class="meter" aria-label="街の数">
			<span class="k">資金</span><span class="v"
				>{summary ? `${summary.money.toLocaleString('ja-JP')} 円` : '—'}</span
			>
			<span class="k">満足度</span><span class="v">{summary ? `${summary.happy}` : '—'}</span>
			<span class="k">学んだ手</span><span class="v" class:up={handsUp} aria-live="polite"
				>{hands}{handsUp ? ' ＋1' : ''}</span
			>
		</div>
		<button
			type="button"
			class="btn"
			aria-expanded={showNotes}
			onclick={() => (showNotes = !showNotes)}>手帳 {notes}</button
		>
		<button type="button" class="btn" onclick={() => press('t')} aria-keyshortcuts="T">配色</button>
		<button type="button" class="btn" onclick={() => press('?')} aria-keyshortcuts="?">キー</button>
	</header>

	{#if showNotes}
		<section class="panel notes" aria-label="手帳">
			<div class="ph">
				<h2>手帳</h2>
				<small>思い出すを終えると 1 枚増える</small>
			</div>
			<div class="bd">
				{#each parseNotes(read(NOTES_KEY)) as n (n.id)}
					<a class="note" href={resolve('/lesson/[id]', { id: n.id })}
						><b>{n.title}</b><span>{n.point}</span><small>町では：{n.town} ・ {n.score}</small></a
					>
				{:else}
					<p class="tx muted">まだ 1 枚も無い。</p>
				{/each}
			</div>
		</section>
	{/if}

	<section class="lbar">
		<span class="tag">{fieldName(lesson.field)} ・ {LEVELS[lesson.level - 1]}</span>
		<div class="ttl">
			<h1>{lesson.title}</h1>
			<p>
				{lesson.goal}{words.length > 0 ? ` ・ 町：${words.map((w) => w.town).join(' → ')}` : ''}
			</p>
		</div>
		<a class="grow" href={resolve('/town')}>
			<span class="k">この学びで育つ物</span>
			<b>{grows.moves[0] ?? '街で使える知識'}{grows.system ? `（${grows.system}）` : ''}</b>
			<small>
				{#if grows.requests.length > 0}
					効く要望：{grows.requests
						.map((r) => `${r.client}「${r.symptom}」`)
						.join('・')}{grows.more > 0 ? ` ほか ${grows.more} 件` : ''}
				{/if}
			</small>
			<small class="nx">
				{#if !doneModes[lesson.id]?.watch}
					次：見るを最後まで ── 仕組みが分かる
				{:else if !doneModes[lesson.id]?.try}
					次：やってみるで合格 ── 街の手「{grows.moves[0] ?? lesson.title}」が使える
				{:else if !doneModes[lesson.id]?.recall}
					次：思い出す ── 手帳に 1 枚
				{:else}
					3 つとも済んだ ── 街で要望に応える
				{/if}
			</small>
			<span class="go">街で見る →</span>
		</a>
		<div class="modes" role="tablist" aria-label="学び方">
			{#each MODES as m, i (m.id)}
				<button
					type="button"
					role="tab"
					class="mode"
					class:done={doneModes[lesson.id]?.[m.id]}
					aria-selected={mode === m.id}
					aria-current={mode === m.id ? 'page' : undefined}
					onclick={() => setMode(m.id)}
				>
					<i>{doneModes[lesson.id]?.[m.id] ? '✓' : i + 1}</i>{m.label}
				</button>
			{/each}
		</div>
	</section>

	<div class="grid">
		{#if trying && run}
			<aside class="panel rail" aria-label="やること">
				<div class="ph">
					<h2>やること</h2>
					<small>{goals.filter((g) => g.state === 'ok').length} / {goals.length}</small>
				</div>
				<ol class="goals">
					{#each goals as g, i (g.label)}
						<li class={g.state}>
							<span class="m">{g.state === 'ok' ? '✓' : i + 1}</span>
							<span
								><b>{g.label}</b>{#if prefs.depth === 1 || g.state === 'ok'}<small
										>目標 {g.want}{g.state === 'ok'
											? ''
											: ` ・ 今 ${g.got || '（まだ無い）'}`}</small
									>{/if}</span
							>
						</li>
					{/each}
				</ol>
				{#if run.steps.length > 0}
					<div class="ph">
						<h2>打った命令</h2>
						<small>{run.steps.length} 件</small>
					</div>
					<div class="evs">
						{#each run.steps as s, i (i)}
							<button
								type="button"
								class="ev kind-{kindOf(s.code === 0 ? '命令' : 'エラー')}"
								class:on={i + 1 === k}
								onclick={() => jump(i + 1)}
							>
								<span class="n">{i + 1}</span><span>{s.line.split('\n')[0]}</span>
							</button>
						{/each}
					</div>
				{/if}
			</aside>
		{/if}
		{#if mode === 'try' && !trying}
			<aside class="panel rail" aria-label="やること">
				<div class="ph">
					<h2>やること</h2>
					<small>{doneModes[lesson.id]?.try ? '済' : '1 / 1'}</small>
				</div>
				<ol class="goals">
					<li class={doneModes[lesson.id]?.try ? 'ok' : 'cur'}>
						<span class="m">{doneModes[lesson.id]?.try ? '✓' : 1}</span>
						<span
							><b>{lesson.practice.goal}</b><small
								>図で仕組みを確かめ、下の欄に答えを入れて「確かめる」</small
							></span
						>
					</li>
				</ol>
			</aside>
		{/if}
		<aside class="panel rail" aria-label="流れ" hidden={mode !== 'watch'}>
			<div class="ph">
				<h2>流れ</h2>
				<small>{chapters.length} 章 ・ {beats.length - 1} 出来事</small>
			</div>
			<button type="button" class="ch" class:on={k === 0} onclick={() => jump(0)}>
				<i>✓</i><span><b>概要</b><small>{words.map((w) => w.it).join(' → ')}</small></span>
			</button>
			{#each chapters as c (c.n)}
				{@const st =
					beat.step > c.n || (beat.step === c.n && phase === 'after' && beat.last)
						? 'done'
						: beat.step === c.n
							? 'on'
							: 'todo'}
				<div class="chap {st}">
					<button
						type="button"
						class="ch"
						disabled={c.beats[0].k > reach}
						onclick={() => jump(c.beats[0].k)}
					>
						<i>{st === 'done' ? '✓' : c.n}</i><span><b>{c.title}</b><small>{c.lead}</small></span>
					</button>
					<div class="evs">
						{#each c.beats as b (b.k)}
							{@const ghost = b.k > reach}
							<button
								type="button"
								class="ev kind-{kindOf(b.move?.kind ?? lesson.explain[b.step - 1].log.kind)}"
								class:on={b.k === k}
								class:ghost
								disabled={ghost}
								onclick={() => jump(b.k)}
							>
								<span class="n">{b.k}</span><span
									>{ghost ? '？' : (b.move?.payload ?? lesson.explain[b.step - 1].log.info)}</span
								>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</aside>

		<section class="panel stage" aria-label="図">
			<Diagram
				lesson={drawn}
				{geo}
				{k}
				{phase}
				{t}
				view={prefs.view}
				town={prefs.town}
				follow={prefs.follow}
				{kindOf}
				{reduced}
				{reach}
				recall={mode === 'recall'}
				onnode={mode === 'recall' ? (id) => recallPanel?.hit(id) : undefined}
				{alt}
				ongo={(n) => {
					fb = null;
					jump(n);
				}}
				onview={(v) => setPrefs({ view: v })}
				ontown={(on) => setPrefs({ town: on })}
				onfollow={(on) => setPrefs({ follow: on })}
			/>
			{#if trying && run}
				{@const s = k > 0 ? run.steps[k - 1] : null}
				<div class="cap" aria-live="polite">
					<span class="no kind-{s ? kindOf(s.code === 0 ? '命令' : 'エラー') : 1}"
						>{s ? k : '◇'}</span
					>
					<div>
						<b>{s ? `$ ${s.line.split('\n')[0]}` : '町の困りごとを、学んだ命令で直す'}</b><small
							>{s
								? (s.err || s.out).split('\n').find((x) => x.trim()) || '何も出ない（成功）'
								: '打った命令で起きたことが、図に番号つきで残る。中身の板と記録も一緒に変わる'}</small
						>
					</div>
				</div>
			{/if}
			{#if mode === 'watch'}
				<div class="cap" aria-live="polite">
					<span class="no kind-{cap.slot}">{cap.n === 0 ? '◇' : cap.n}</span>
					<div><b>{cap.b}</b><small>{cap.s}</small></div>
				</div>
				<div class="transport">
					<div class="tc">
						<button
							type="button"
							class="btn sq"
							aria-label="前へ"
							aria-keyshortcuts="ArrowLeft"
							disabled={k === 0}
							onclick={prev}>◀</button
						>
						<button
							type="button"
							class="btn pri"
							aria-keyshortcuts="ArrowRight"
							disabled={k >= beats.length - 1 || ask !== null}
							onclick={next}>次へ ▶</button
						>
						<button
							type="button"
							class="btn sq"
							aria-label="もう一度"
							aria-keyshortcuts="R"
							disabled={k === 0}
							onclick={() => animate(k)}>↻</button
						>
					</div>
					<div class="tl" aria-label="出来事の点">
						<span class="base"></span>
						<span
							class="fill"
							style:width="{((beats.length > 1 ? k / (beats.length - 1) : 0) * 100).toFixed(1)}%"
						></span>
						{#each beats as b (b.k)}
							{#if b.k > 0}
								<button
									type="button"
									class="dot kind-{kindOf(b.move?.kind ?? lesson.explain[b.step - 1].log.kind)}"
									class:on={b.k === k}
									class:ghost={b.k > reach}
									style:left="{((b.k / (beats.length - 1)) * 100).toFixed(2)}%"
									disabled={b.k > reach}
									aria-label="出来事 {b.k}"
									onclick={() => jump(b.k)}>{b.k}</button
								>
							{/if}
						{/each}
					</div>
					<div class="tc">
						<button
							type="button"
							class="btn"
							aria-pressed={playing}
							aria-keyshortcuts="Space"
							onclick={toggleAuto}>{playing ? '■ 止める' : '▶ 自動'}</button
						>
						<select
							aria-label="速さ"
							value={String(prefs.speed)}
							onchange={(e) => setPrefs({ speed: Number(e.currentTarget.value) as 0.5 | 1 | 2 })}
						>
							<option value="0.5">0.5×</option>
							<option value="1">1×</option>
							<option value="2">2×</option>
						</select>
						<span class="cnt">{k} / {beats.length - 1}</span>
					</div>
				</div>
			{/if}
		</section>

		<aside class="panel insp" aria-label="台本">
			{#if mode === 'watch'}
				<div class="ph">
					<h2>{k === 0 ? '概要' : `出来事 ${k} / ${beats.length - 1}`}</h2>
					<small>{beat.step > 0 ? `章 ${beat.step} / ${lesson.explain.length}` : ''}</small>
				</div>
				<div class="bd">
					{#if ask !== null}
						{@const a = askOf(ask)}
						{#if a}
							<div class="ask" aria-live="polite">
								<span class="kicker">予想してから進む</span>
								<p class="q">{a.q}</p>
								<div class="opts">
									{#each a.opts as o, i (i)}
										<button type="button" class="opt" onclick={() => answer(i)}
											><kbd>{i + 1}</kbd> {o}</button
										>
									{/each}
								</div>
								<button type="button" class="skip" onclick={() => answer(-1)}>答えずに進む</button>
							</div>
						{/if}
					{/if}
					{#if fb}
						<div class="fb" class:good={fb.good} class:bad={!fb.good} aria-live="polite">
							<b>{fb.head}</b>{fb.why}
						</div>
					{/if}
					{#if k === 0 || !step}
						<span class="kicker">{fieldName(lesson.field)} ・ {LEVELS[lesson.level - 1]}</span>
						<h3>{lesson.title}</h3>
						<p class="sub">目的：{lesson.goal}</p>
						{#if lesson.prereq.length > 0}
							<p class="tx">
								前提（おすすめ。読んでいなくても進める）：{#each lesson.prereq as id, i (id)}{i > 0
										? '・'
										: ''}<a href={resolve('/lesson/[id]', { id })}>{title(id)}</a>{/each}
							</p>
						{/if}
						<div class="sec">
							<h4>言葉（町の呼び名 ＝ IT の名前）</h4>
							<div class="words">
								{#each words as w (w.it)}
									<div class="word">
										<span class="tn">{w.town}</span><span class="it">＝ {w.it}</span><span
											class="df">{w.def}</span
										>
									</div>
								{/each}
							</div>
						</div>
						<button type="button" class="btn pri wide" onclick={next}>見るを始める ▶</button>
					{:else}
						<span class="kicker">{lesson.title}</span>
						<h3>{step.title}</h3>
						<p class="sub">{step.lead}</p>
						{@const r = rowOf(k)}
						<div class="msg">
							<span class="n kind-{r.slot}">{k}</span>
							<div>
								<div class="r1">
									{withTown(r.from)}{r.from !== r.to ? ` → ${withTown(r.to)}` : ''} ・ {r.t}
								</div>
								<div class="r2">{beat.move ? `「${beat.move.payload}」` : step.lead}</div>
								<div class="r3">{r.info}</div>
							</div>
						</div>
						{#each bodyText as line, i (i)}
							<p class="tx">{line}</p>
						{/each}
						<div class="sec">
							<h4>この章の値</h4>
							<dl class="kv">
								{#each step.facts as f (f.k)}
									<dt>{f.k}</dt>
									<dd>{f.v}</dd>
								{/each}
							</dl>
						</div>
						<div class="sec">
							<h4>変わったこと（前 → 後）</h4>
							{#if phase !== 'after'}
								<p class="tx muted">届くと、ここに出る…</p>
							{:else if changes.length === 0}
								<p class="tx muted">図の中身は変わらない（知らせ・確かめるだけ）。</p>
							{:else}
								<div class="chg">
									{#each changes as c, i (i)}
										<span class="ck">{c.who} の {c.k}</span>
										<span class="cv"
											>{#if c.before !== null}<s>{c.before}</s> →
											{/if}<b>{c.after ?? '（無くなった）'}</b></span
										>
									{/each}
								</div>
							{/if}
						</div>
						{#if step.town}
							<div class="town"><b>町では</b>：{step.town}</div>
						{/if}
						{#if work}
							<div class="tip"><b>仕事では</b>{work}</div>
						{/if}
						{#if step.why}
							<div class="tip why"><b>なぜ</b>{step.why}</div>
						{/if}
					{/if}
				</div>
			{:else if mode === 'try' && !trying}
				<div class="ph">
					<h2>やってみる</h2>
					<small>{doneModes[lesson.id]?.try ? '✓ 合格' : '答えは図の下'}</small>
				</div>
				<div class="bd">
					<div class="formreq">
						<div>
							{#if request}<b>{request.who}から</b>「{request.text}」{/if}
							<span class="role">あなたの役目：{lesson.practice.goal}</span>
						</div>
					</div>
					<p class="tx">
						図は、解説の最後の状態。仕組みを見ながら、下の欄で答えを作る。間違えると、なぜ駄目かと次の一手が出る。
					</p>
					{#if doneModes[lesson.id]?.try}
						<button type="button" class="btn pri" onclick={() => setMode('recall')}
							>思い出す ▶</button
						>
					{/if}
				</div>
			{:else if trying && run}
				<div class="ph">
					<h2>やってみる</h2>
					<small>打った回数 {run.steps.length}{run.passed ? ' ・ ✓ 合格' : ''}</small>
				</div>
				<div class="bd">
					<TryPanel
						{lesson}
						{run}
						sel={k}
						depth={prefs.depth}
						{request}
						{busy}
						onsend={(x) => void send(x)}
						onreset={resetTry}
						onrewind={rewindTry}
						onrecall={() => setMode('recall')}
					/>
				</div>
			{:else if mode === 'recall'}
				<div class="ph">
					<h2>思い出す</h2>
					<small>流れ・中身・記録を隠し、図だけ残した</small>
				</div>
				<div class="bd">
					<RecallPanel
						bind:this={recallPanel}
						{lesson}
						{title}
						onfinish={finishRecall}
						onnotes={openNotes}
					/>
				</div>
			{/if}
		</aside>

		{#if mode === 'try' && !trying}
			<div class="practice insidewrap" role="tabpanel" aria-label="答えの欄">
				{#if lesson.practice.form}
					<FormPractice practice={lesson.practice} {replay} {onpass} />
				{:else}
					<p>この実戦の道具は準備中。</p>
				{/if}
			</div>
		{/if}
		{#if mode === 'watch' || trying}
			<div class="insidewrap">
				<InsideBoard
					{inside}
					depth={prefs.depth}
					{head}
					{reduced}
					{slotOfStep}
					{lastPacket}
					ongo={(n) => {
						fb = null;
						jump(n);
					}}
				/>
			</div>
		{/if}
	</div>

	{#if mode === 'watch' || trying}
		<section class="panel rec" aria-label="記録">
			<div class="ph">
				<h2>{trying ? 'あなたの操作の記録' : '記録'}</h2>
				<div class="legend">
					{#each [...slots] as [kind, slot] (kind)}
						<span><i class="kind-{slot}"></i>{kind}</span>
					{/each}
				</div>
			</div>
			<table>
				<thead
					><tr
						><th>番号</th><th>時間</th><th>送り元</th><th>宛先</th><th>種類</th><th>内容</th><th
							>大きさ</th
						></tr
					></thead
				>
				<tbody>
					{#each rows as r (r.k)}
						<tr class:on={r.k === k} onclick={() => jump(r.k)}>
							<td><span class="n0 kind-{r.slot}">{r.k}</span></td>
							<td>{r.t}</td>
							<td><span class="who">{r.from}<small>{townOfLabel(r.from)}</small></span></td>
							<td><span class="who">{r.to}<small>{townOfLabel(r.to)}</small></span></td>
							<td><span class="kd kind-{r.slot}">{r.kind}</span></td>
							<td class="info">{r.info}</td>
							<td>{r.size ?? ''}</td>
						</tr>
					{/each}
					{#if rows.length === 0}
						<tr
							><td colspan="7" class="empty"
								>{trying
									? '命令を打つと、ここに並ぶ。'
									: 'まだ何も起きていない。→ で 1 つ進める。'}</td
							></tr
						>
					{/if}
				</tbody>
			</table>
		</section>
	{/if}

	{#if note}
		<div class="toast" role="status" aria-live="polite">{note}</div>
	{/if}
</div>

<style>
	.learn {
		max-width: 1600px;
		margin: 0 auto;
		padding: 8px 14px 24px;
		font-size: 14px;
	}
	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--dl-border);
	}
	.logo {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: var(--dl-text);
		padding-right: 6px;
	}
	.logo b {
		font: 700 15px var(--dl-font-code);
		letter-spacing: 0.12em;
	}
	.logo small {
		font-size: 11px;
		color: var(--dl-text-muted);
	}
	.fld {
		font-size: 13px;
		color: var(--dl-text-muted);
		padding: 0 6px;
	}
	.sp {
		flex: 1;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 36px;
		padding: 0 12px;
		border-radius: 6px;
		border: 1px solid var(--dl-border-strong);
		background: var(--dl-surface);
		color: var(--dl-text);
		font-size: 13px;
		white-space: nowrap;
		text-decoration: none;
		cursor: pointer;
	}
	.btn:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.btn.pri {
		background: var(--dl-now);
		border-color: var(--dl-now);
		color: var(--dl-surface);
		font-weight: 700;
	}
	.btn.sq {
		width: 40px;
		padding: 0;
	}
	.btn.wide {
		width: 100%;
		margin-top: 12px;
		min-height: 44px;
	}
	.seg {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 2px;
		border: 1px solid var(--dl-border);
		border-radius: 6px;
		background: var(--dl-surface);
	}
	.seg span {
		font-size: 11px;
		color: var(--dl-text-muted);
		padding: 0 6px;
	}
	.seg button {
		min-height: 34px;
		padding: 0 10px;
		font-size: 13px;
		border: 0;
		background: none;
		color: var(--dl-text-muted);
		border-radius: 4px;
		cursor: pointer;
	}
	.seg button[aria-pressed='true'] {
		background: var(--dl-surface-raised);
		color: var(--dl-text);
		font-weight: 700;
		box-shadow: inset 0 0 0 1px var(--dl-border-strong);
	}
	.meter {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 38px;
		padding: 0 12px;
		border: 1px solid var(--dl-border);
		border-radius: 6px;
		background: var(--dl-surface);
	}
	.meter .k {
		font-size: 11px;
		color: var(--dl-text-muted);
	}
	.meter .v {
		font: 700 13px var(--dl-font-code);
	}
	.meter .v.up {
		color: var(--dl-done);
		outline: 2px solid var(--dl-done);
		outline-offset: 2px;
		border-radius: 4px;
	}
	.lbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		padding: 10px 0;
	}
	.tag {
		font: 500 11px var(--dl-font-code);
		padding: 2px 8px;
		border-radius: 4px;
		border: 1px solid var(--dl-now);
		color: var(--dl-now);
	}
	.ttl {
		flex: 1;
		min-width: 240px;
	}
	.ttl h1 {
		margin: 0;
		font-size: 21px;
	}
	.ttl p {
		margin: 2px 0 0;
		color: var(--dl-text-muted);
		font-size: 12.5px;
	}
	.grow {
		display: grid;
		grid-template-columns: 1fr auto;
		column-gap: 10px;
		align-items: baseline;
		padding: 6px 12px;
		border-radius: 8px;
		border: 1px solid var(--dl-border);
		border-left: 3px solid var(--dl-warn);
		background: var(--dl-surface);
		color: var(--dl-text);
		text-decoration: none;
		max-width: 520px;
	}
	.grow .k {
		grid-column: 1 / -1;
		font-size: 11px;
		color: var(--dl-text-muted);
	}
	.grow b {
		font-size: 13.5px;
	}
	.grow small {
		grid-column: 1;
		font-size: 11.5px;
		color: var(--dl-text-muted);
	}
	.grow small.nx {
		color: var(--dl-text);
	}
	.grow .go {
		grid-row: 2;
		grid-column: 2;
		font-size: 12px;
		color: var(--dl-now);
	}
	.modes {
		display: flex;
		gap: 2px;
		padding: 3px;
		border: 1px solid var(--dl-border);
		border-radius: 6px;
		background: var(--dl-surface);
	}
	.mode {
		display: flex;
		align-items: center;
		gap: 7px;
		min-height: 38px;
		padding: 0 12px;
		border-radius: 4px;
		border: 0;
		background: none;
		font-size: 13.5px;
		color: var(--dl-text-muted);
		cursor: pointer;
	}
	.mode i {
		font-style: normal;
		font: 500 11px var(--dl-font-code);
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 1px solid currentColor;
		display: grid;
		place-items: center;
	}
	.mode[aria-selected='true'] {
		background: var(--dl-surface-raised);
		color: var(--dl-text);
		font-weight: 700;
		box-shadow: inset 0 0 0 1px var(--dl-border-strong);
	}
	.mode[aria-selected='true'] i {
		color: var(--dl-now);
	}
	.mode.done i {
		color: var(--dl-done);
		border-color: var(--dl-done);
	}
	.grid {
		display: grid;
		grid-template-columns: 210px minmax(0, 1fr) 340px;
		grid-template-rows: auto 1fr;
		gap: 10px;
		align-items: start;
	}
	.panel {
		background: var(--dl-surface);
		border: 1px solid var(--dl-border);
		border-radius: 8px;
		min-width: 0;
	}
	.ph {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px 12px;
		border-bottom: 1px solid var(--dl-border);
	}
	.ph h2 {
		margin: 0;
		font-size: 14px;
	}
	.ph small {
		font: 500 11px var(--dl-font-code);
		color: var(--dl-text-muted);
	}
	.rail {
		grid-row: 1 / span 2;
		padding-bottom: 6px;
	}
	.stage {
		grid-column: 2;
		grid-row: 1;
		overflow: hidden;
	}
	.insp {
		grid-column: 3;
		grid-row: 1 / span 2;
	}
	.insidewrap {
		grid-column: 2;
		grid-row: 2;
		min-width: 0;
	}
	.learn[data-mode='recall'] .grid {
		grid-template-columns: minmax(0, 1fr) 380px;
	}
	.learn[data-mode='recall'] .stage {
		grid-column: 1;
	}
	.learn[data-mode='recall'] .insp {
		grid-column: 2;
	}
	.ch {
		display: grid;
		grid-template-columns: 26px 1fr;
		gap: 8px;
		width: 100%;
		text-align: left;
		padding: 7px 12px;
		align-items: start;
		border: 0;
		background: none;
		color: var(--dl-text);
		cursor: pointer;
	}
	.ch:disabled {
		cursor: default;
	}
	.ch i {
		font-style: normal;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 1px solid var(--dl-border-strong);
		display: grid;
		place-items: center;
		font: 500 11px var(--dl-font-code);
		color: var(--dl-text-muted);
	}
	.ch b {
		display: block;
		font-size: 13px;
		line-height: 1.45;
	}
	.ch small {
		display: block;
		font-size: 11.5px;
		color: var(--dl-text-muted);
		line-height: 1.4;
	}
	.chap.done .ch i,
	.ch.on i {
		border-color: var(--dl-done);
		color: var(--dl-done);
	}
	.chap.on .ch i {
		background: var(--dl-now);
		border-color: var(--dl-now);
		color: var(--dl-surface);
	}
	.chap.on .ch b {
		color: var(--dl-now);
	}
	.chap.todo .ch b {
		color: var(--dl-text-muted);
	}
	.evs {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: 0 8px 4px 40px;
	}
	.ev {
		display: grid;
		grid-template-columns: 22px 1fr;
		gap: 6px;
		align-items: center;
		text-align: left;
		padding: 3px 6px;
		border-radius: 4px;
		border: 0;
		background: none;
		font-size: 12px;
		color: var(--dl-text-muted);
		cursor: pointer;
	}
	.ev span:last-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ev.on {
		background: color-mix(in srgb, var(--dl-now) 12%, transparent);
		color: var(--dl-text);
	}
	.ev.ghost {
		opacity: 0.5;
		cursor: default;
	}
	.n,
	.no,
	.n0 {
		display: inline-grid;
		place-items: center;
		min-width: 20px;
		height: 20px;
		border-radius: 50%;
		font: 700 11px var(--dl-font-code);
		color: var(--dl-surface);
		background: var(--k-fg);
	}
	.ev.ghost .n {
		background: var(--dl-border-strong);
	}
	.cap {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 12px;
		align-items: center;
		padding: 8px 14px;
		border-top: 1px solid var(--dl-border);
		min-height: 58px;
	}
	.cap .no {
		min-width: 32px;
		height: 32px;
		font-size: 13px;
	}
	.cap b {
		display: block;
		font-size: 15px;
		line-height: 1.5;
	}
	.cap small {
		display: block;
		font-size: 12.5px;
		color: var(--dl-text-muted);
	}
	.transport {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 10px;
		align-items: center;
		padding: 8px 12px;
		border-top: 1px solid var(--dl-border);
		background: var(--dl-surface-raised);
	}
	.tc {
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.tc select {
		min-height: 36px;
		background: var(--dl-surface);
		color: var(--dl-text);
		border: 1px solid var(--dl-border-strong);
		border-radius: 6px;
		font-family: var(--dl-font-code);
		padding: 0 6px;
	}
	.cnt {
		font: 500 12px var(--dl-font-code);
		color: var(--dl-text-muted);
		min-width: 3.6em;
		text-align: right;
	}
	.tl {
		position: relative;
		height: 34px;
		margin: 0 12px;
	}
	.tl .base,
	.tl .fill {
		position: absolute;
		left: 0;
		top: 16px;
		height: 2px;
		background: var(--dl-border-strong);
	}
	.tl .base {
		right: 0;
	}
	.tl .fill {
		background: var(--dl-now);
	}
	.dot {
		position: absolute;
		top: 6px;
		width: 22px;
		height: 22px;
		margin-left: -11px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font: 700 10.5px var(--dl-font-code);
		color: var(--dl-surface);
		background: var(--k-fg);
		border: 2px solid var(--dl-surface-raised);
		padding: 0;
		cursor: pointer;
	}
	.dot.ghost {
		background: var(--dl-border-strong);
		color: var(--dl-text-muted);
		cursor: default;
	}
	.dot.on {
		box-shadow: 0 0 0 3px var(--dl-warn);
	}
	.bd {
		padding: 12px 14px 14px;
	}
	.kicker {
		font: 500 11.5px var(--dl-font-code);
		color: var(--dl-now);
	}
	.insp h3 {
		margin: 4px 0 2px;
		font-size: 19px;
		line-height: 1.45;
	}
	.sub {
		margin: 0 0 10px;
		font-size: 13px;
		color: var(--dl-warn);
	}
	.tx {
		margin: 0 0 10px;
		line-height: 1.85;
		font-size: 14px;
	}
	.muted {
		color: var(--dl-text-muted);
	}
	.msg {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 10px;
		padding: 10px 12px;
		border-radius: 6px;
		border: 1px solid var(--dl-border);
		background: var(--dl-surface-raised);
		margin-bottom: 10px;
	}
	.msg .r1 {
		font-size: 12px;
		color: var(--dl-text-muted);
	}
	.msg .r2 {
		font-size: 14px;
		line-height: 1.6;
	}
	.msg .r3 {
		font: 500 12px var(--dl-font-code);
		color: var(--dl-now);
		word-break: break-all;
		margin-top: 2px;
	}
	.sec {
		margin-top: 12px;
	}
	.sec > h4 {
		margin: 0 0 6px;
		font: 500 11.5px var(--dl-font-code);
		color: var(--dl-text-muted);
		letter-spacing: 0.06em;
	}
	.kv {
		display: grid;
		grid-template-columns: 8em minmax(0, 1fr);
		margin: 0;
		border-top: 1px solid var(--dl-border);
	}
	.kv > * {
		padding: 6px 2px;
		border-bottom: 1px solid var(--dl-border);
		font-size: 13px;
	}
	.kv dt {
		color: var(--dl-text-muted);
	}
	.kv dd {
		margin: 0;
		font-family: var(--dl-font-code);
		word-break: break-all;
	}
	.chg {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		border-top: 1px solid var(--dl-border);
	}
	.chg span {
		padding: 6px 2px;
		border-bottom: 1px solid var(--dl-border);
		font-size: 13px;
	}
	.ck {
		color: var(--dl-text-muted);
		padding-right: 12px !important;
	}
	.cv {
		font-family: var(--dl-font-code);
		word-break: break-all;
	}
	.cv s {
		color: var(--dl-text-muted);
	}
	.cv b {
		color: var(--dl-done);
	}
	.town {
		margin-top: 12px;
		padding: 10px 12px;
		border-radius: 6px;
		border: 1px dashed var(--dl-warn);
		background: color-mix(in srgb, var(--dl-warn) 8%, transparent);
		font-size: 13px;
		line-height: 1.75;
	}
	.town b {
		color: var(--dl-warn);
	}
	.tip {
		margin-top: 10px;
		padding: 10px 12px;
		border-radius: 6px;
		background: color-mix(in srgb, var(--dl-now) 8%, transparent);
		font-size: 13px;
		line-height: 1.75;
	}
	.tip b {
		display: block;
		color: var(--dl-now);
		font-size: 11.5px;
	}
	.words {
		display: grid;
		border-top: 1px solid var(--dl-border);
	}
	.word {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2px 10px;
		padding: 6px 2px;
		border-bottom: 1px solid var(--dl-border);
		font-size: 13px;
	}
	.tn {
		color: var(--dl-warn);
		font-weight: 700;
	}
	.it {
		font-weight: 700;
	}
	.df {
		grid-column: 1 / -1;
		color: var(--dl-text-muted);
		font-size: 12.5px;
	}
	.ask {
		padding: 12px;
		border-radius: 6px;
		border: 1px solid var(--dl-now);
		background: color-mix(in srgb, var(--dl-now) 8%, transparent);
		margin-bottom: 12px;
	}
	.q {
		font-size: 16px;
		font-weight: 700;
		line-height: 1.5;
		margin: 4px 0 10px;
	}
	.opts {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.opt {
		min-height: 44px;
		text-align: left;
		padding: 8px 12px;
		border-radius: 6px;
		border: 1px solid var(--dl-border-strong);
		background: var(--dl-surface);
		color: var(--dl-text);
		font-size: 14px;
		line-height: 1.5;
		cursor: pointer;
	}
	.opt kbd {
		font: 700 11px var(--dl-font-code);
		color: var(--dl-text-muted);
		margin-right: 4px;
	}
	.skip {
		margin-top: 8px;
		font-size: 12.5px;
		color: var(--dl-text-muted);
		text-decoration: underline;
		background: none;
		border: 0;
		cursor: pointer;
		min-height: 32px;
	}
	.goals {
		list-style: none;
		margin: 0;
		padding: 6px 10px 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.goals li {
		display: flex;
		gap: 8px;
		align-items: flex-start;
		font-size: 13px;
		line-height: 1.5;
		color: var(--dl-text-muted);
	}
	.goals li b {
		display: block;
		font-weight: 600;
	}
	.goals li small {
		display: block;
		font-size: 12px;
		font-family: var(--dl-font-code);
		word-break: break-all;
	}
	.goals .m {
		flex: none;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 1px solid var(--dl-border-strong);
		display: grid;
		place-items: center;
		font-size: 12px;
	}
	.goals li.ok {
		color: var(--dl-text);
	}
	.goals li.ok .m {
		border-color: var(--dl-done);
		color: var(--dl-done);
	}
	.goals li.cur {
		color: var(--dl-text);
	}
	.goals li.cur .m {
		border: 2px solid var(--dl-now);
		color: var(--dl-now);
		font-weight: 700;
	}
	.fb {
		margin-bottom: 12px;
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
	.rec {
		margin-top: 10px;
		overflow-x: auto;
	}
	.legend {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		font-size: 12px;
		color: var(--dl-text-muted);
	}
	.legend span {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.legend i {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--k-fg);
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 13px;
	}
	th {
		text-align: left;
		font-weight: 500;
		color: var(--dl-text-muted);
		font-size: 12px;
		padding: 6px 10px;
		border-bottom: 1px solid var(--dl-border);
	}
	td {
		padding: 6px 10px;
		border-bottom: 1px solid var(--dl-border);
		font-family: var(--dl-font-code);
		vertical-align: top;
	}
	td.info {
		min-width: 240px;
	}
	tr {
		cursor: pointer;
	}
	tbody tr:hover {
		background: var(--dl-surface-raised);
	}
	tr.on {
		background: color-mix(in srgb, var(--dl-now) 10%, transparent);
		box-shadow: inset 3px 0 0 var(--dl-now);
	}
	.who {
		display: flex;
		flex-direction: column;
		line-height: 1.3;
	}
	.who small {
		font-family: var(--dl-font);
		font-size: 11px;
		color: var(--dl-text-muted);
	}
	.kd {
		color: var(--k-fg);
		font-weight: 700;
	}
	.empty {
		color: var(--dl-text-muted);
		font-family: var(--dl-font);
	}
	.practice {
		margin-top: 4px;
	}
	.formreq {
		display: flex;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		padding: 10px 12px;
		margin-bottom: 10px;
		border: 1px solid var(--dl-warn);
		border-radius: 6px;
		background: color-mix(in srgb, var(--dl-warn) 8%, transparent);
		font-size: 13.5px;
		line-height: 1.75;
	}
	.formreq .role {
		display: block;
		color: var(--dl-text-muted);
		font-size: 12.5px;
	}
	.notes {
		margin-top: 8px;
	}
	.note {
		display: grid;
		gap: 2px;
		padding: 8px 10px;
		border: 1px solid var(--dl-border);
		border-radius: 6px;
		margin-bottom: 6px;
		color: var(--dl-text);
		text-decoration: none;
	}
	.note span {
		font-size: 13px;
	}
	.note small {
		font-size: 12px;
		color: var(--dl-text-muted);
	}
	.toast {
		position: fixed;
		left: 50%;
		bottom: 20px;
		transform: translateX(-50%);
		z-index: 60;
		padding: 12px 18px;
		border-radius: 8px;
		background: var(--dl-surface);
		border: 1px solid var(--dl-done);
		color: var(--dl-text);
		font-size: 14px;
		box-shadow: var(--dl-shadow);
		max-width: 92vw;
	}
	.kind-1 {
		--k-fg: var(--dl-kind-1-fg);
	}
	.kind-2 {
		--k-fg: var(--dl-kind-2-fg);
	}
	.kind-3 {
		--k-fg: var(--dl-kind-3-fg);
	}
	.kind-4 {
		--k-fg: var(--dl-kind-4-fg);
	}
	.kind-5 {
		--k-fg: var(--dl-kind-5-fg);
	}
	@media (max-width: 1280px) {
		.grid {
			grid-template-columns: 200px minmax(0, 1fr);
		}
		.rail {
			grid-row: auto;
		}
		.insp,
		.insidewrap {
			grid-column: 1 / -1;
			grid-row: auto;
		}
	}
	@media (max-width: 860px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.stage {
			grid-column: 1;
			position: sticky;
			top: 0;
			z-index: 5;
		}
		.insp {
			order: 2;
		}
		.insidewrap {
			order: 3;
		}
		.rail {
			order: 4;
		}
		.cap {
			padding: 6px 10px;
			min-height: 0;
		}
		.cap b {
			font-size: 13px;
		}
		.cap small {
			display: none;
		}
		.transport {
			grid-template-columns: 1fr;
			gap: 6px;
		}
		.tc {
			justify-content: space-between;
		}
		.meter,
		.fld {
			display: none;
		}
		.learn[data-mode='recall'] .grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.learn[data-mode='recall'] .insp {
			grid-column: 1;
		}
		table,
		thead,
		tbody {
			display: block;
		}
		thead {
			display: none;
		}
		tr {
			display: grid;
			grid-template-columns: 28px 1fr auto;
			gap: 2px 8px;
			padding: 8px 10px;
			border-bottom: 1px solid var(--dl-border);
		}
		td {
			border: 0;
			padding: 0;
		}
		td:nth-child(2) {
			grid-column: 3;
			grid-row: 1;
			color: var(--dl-text-muted);
		}
		td:nth-child(3),
		td:nth-child(4) {
			grid-column: 2;
		}
		td:nth-child(5),
		td:nth-child(7) {
			display: none;
		}
		td.info {
			grid-column: 2 / -1;
			min-width: 0;
		}
	}
</style>
