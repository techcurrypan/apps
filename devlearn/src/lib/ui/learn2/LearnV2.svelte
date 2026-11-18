<script lang="ts">
	// レッスン画面の第 2 版（screen-design.md 第 11 章・learn-standard.md 第 2 版。D-23）。
	// 図が主役：既定の視点で全部読め、どのステップも入ると動きが流れ、続く流れは留まっている間も流れ続ける。
	// 画面に出る物は全て (ステップ, 経過時間) から learn2/timeline.ts が決める。ここは時計を進めて描くだけ。
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { fieldName } from '../../content/fields.ts';
	import { KIND_LABEL, type ImplContext, type Lesson, type Step } from '../../lesson/types.ts';
	import { growsOf } from '../../learn/grow.ts';
	import { beatsOf, insideAt, type Phase } from '../../learn/model.ts';
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
		type Note,
		type Prefs
	} from '../../learn/prefs.ts';
	import { geoOf, lerpView, type View } from '../../learn2/geo.ts';
	import { endOf, frameAt } from '../../learn2/timeline.ts';
	import { KNOB_CALC, knobLoop } from '../../learn2/knobs.ts';
	import { segment } from '../../learn2/terms.ts';
	import { outputAt, withMotion } from '../../learn2/try2.ts';
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
	import { hostOf, tryLesson } from '../../learn/try.ts';
	import { loadProgress, markDone, saveProgress } from '../../progress.ts';
	import { addNote, noteOf } from '../../learn/recall.ts';
	import { inField, prefersReducedMotion } from '../dom.ts';
	import InsideBoard from '../learn/InsideBoard.svelte';
	import TryPanel from '../learn/TryPanel.svelte';
	import RecallPanel from '../learn/RecallPanel.svelte';
	import Stage2 from './Stage2.svelte';
	import Lanes2 from './Lanes2.svelte';

	export type SearchItem = { kind: 'lesson' | 'term'; id: string; title: string; sub: string };
	type Props = {
		lesson: Lesson;
		known: ReadonlyMap<string, string>;
		/** 同じ分野のレッスン（左の目次） */
		course: { id: string; title: string }[];
		/** Ctrl+K の検索の材料（LS-L3） */
		index: SearchItem[];
		/** 用語ごとの「この用語が出るレッスン」 */
		termLessons: Record<string, { id: string; title: string }[]>;
	};
	let { lesson, known, course, index, termLessons }: Props = $props();

	type Mode = 'watch' | 'try' | 'recall';
	const MODES: { id: Mode; label: string }[] = [
		{ id: 'watch', label: '① 見る' },
		{ id: 'try', label: '② やってみる' },
		{ id: 'recall', label: '③ 思い出す' }
	];
	const DEPTHS: { d: Depth; label: string }[] = [
		{ d: 1, label: 'はじめて' },
		{ d: 2, label: '現場' },
		{ d: 3, label: '中身まで' }
	];
	const TIER = ['', '基礎', '現場', '設計と障害対応', '指導'];
	const CTX: Record<ImplContext, string> = {
		user: 'ユーザー空間',
		syscall: 'システムコール',
		hardirq: 'hardirq',
		softirq: 'softirq',
		tasklet: 'tasklet',
		kthread: 'カーネルスレッド',
		other: 'そのほか'
	};

	// ---- 好みと街の数 ----
	let prefs = $state<Prefs>(parsePrefs(null));
	let summary = $state<{ money: number; happy: number } | null>(null);
	let notes = $state<Note[]>([]);
	let hands = $state(0);
	let handsUp = $state(false);
	let reduced = $state(false);
	let showNotes = $state(false);
	$effect(() => {
		const saved = read(PREFS_KEY);
		prefs = parsePrefs(saved);
		// 第 2 版の既定の詳しさは「現場」（explanation-standard.md 2.3 の量の基準）
		if (saved === null) prefs = { ...prefs, depth: 2 };
		summary = parseSummary(read(SUMMARY_KEY));
		notes = parseNotes(read(NOTES_KEY));
		hands = loadProgress().done.length;
		reduced = prefersReducedMotion();
	});
	function setPrefs(p: Partial<Prefs>) {
		prefs = { ...prefs, ...p };
		write(PREFS_KEY, prefs);
	}
	const depthKey = $derived((['intro', 'work', 'deep'] as const)[prefs.depth - 1]);

	// ---- レッスンの形 ----
	const steps = $derived(lesson.explain);
	const N = $derived(steps.length);
	const grows = $derived(growsOf(lesson.id, lesson.field));
	const legendSlot = $derived(
		new Map((lesson.legend ?? []).map((x, i) => [x.kind, { slot: (i % 5) + 1, line: x.style }]))
	);
	const styleOf = (kind: string) => legendSlot.get(kind) ?? { slot: 5, line: 'solid' as const };
	const ctxOfBox = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- $derived.by の中で作って返すだけ（後から書き換えない）
		const m = new Map<string, ImplContext>();
		for (const s of steps) {
			const byName = new Map((s.impl ?? []).map((i) => [i.name, i.context]));
			for (const ly of s.layers ?? [])
				for (const b of ly.boxes) {
					const c = byName.get(b.impl);
					if (c && !m.has(b.id)) m.set(b.id, c);
				}
		}
		return m;
	});
	const labelOf = (id: string) => {
		for (const s of steps)
			for (const op of s.scene) if (op.op === 'appear' && op.id === id) return op.label;
		for (const s of steps)
			for (const ly of s.layers ?? []) for (const b of ly.boxes) if (b.id === id) return b.impl;
		return id;
	};

	// ---- 学び方 ----
	let mode = $state<Mode>('watch');
	let step = $state(0);
	let reach = $state(0);
	let t = $state(0);
	let playing = $state(true);
	let auto = $state(false);
	let full = $state(false);
	let tocOpen = $state(false);
	let doneAt = 0; // 合図が終わってからの時間（自動のため）
	let answered = $state<Record<number, number>>({});
	let wrong = $state<{ step: number; opt: number } | null>(null);
	let feedback = $state<{ good: boolean; text: string } | null>(null);

	// やってみる：打った命令の並び（learn/try.ts）を第 2 版の動きで描く
	useSqlWasm(sqlWasm);
	const hasTool = $derived(runTools.includes(lesson.practice.tool?.name ?? ''));
	let run = $state.raw<Run | null>(null);
	let busy = $state(false);
	let tryStep = $state(0);
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
			? withMotion(
					tryLesson(
						lesson,
						run.steps,
						Array.from({ length: run.steps.length + 1 }, (_, i) => boardOf(run as Run, i)),
						addr
					)
				)
			: null
	);
	const startHosts = $derived(run ? [hostOf(lesson, boardOf(run, 0), addr)] : null);

	// 予想の問いで外したときは、選んだ方へ進みかけて止まる動きを先に流す（LS-M10）
	const knob = $derived(KNOB_CALC[lesson.id]);
	let knobVals = $state<Record<string, number>>({});
	let knobGuess = $state<number | null>(null);
	const knobOut = $derived(knob ? knob.run(knobVals) : null);
	const watchL = $derived.by((): Lesson => {
		let ex = steps;
		if (wrong) {
			const s = steps[wrong.step - 1];
			const first = (s.motion ?? []).find((c) => c.do.op === 'packet');
			const opt = s.ask?.opts[wrong.opt] ?? '';
			if (first && first.do.op === 'packet') {
				const pre = [
					{
						...first,
						at: 0,
						dur: 1100,
						do: { ...first.do, label: `予想：${opt.slice(0, 10)}`, stall: true }
					}
				];
				const shift = (s.motion ?? []).map((c) => ({ ...c, at: c.at + 1600 }));
				ex = steps.map((x, i) =>
					i === wrong!.step - 1 ? { ...x, motion: [shift[0], ...pre, ...shift.slice(1)] } : x
				);
			}
		}
		if (knob && knobOut) ex = ex.map((x) => (x.knobs?.length ? knobLoop(x, knobOut) : x));
		return ex === steps ? lesson : { ...lesson, explain: ex };
	});
	const drawn = $derived(mode === 'try' && tryL ? tryL : watchL);
	const geo = $derived(geoOf(drawn));
	const cur = $derived(mode === 'try' ? tryStep : step);

	// ---- 図の大きさと視点 ----
	let sw = $state(1000);
	let sh = $state(600);
	const insetR = $derived(sw >= 900 && mode === 'watch' ? 300 : 0);
	const frame = $derived(frameAt(drawn, geo, cur, t, { sw, sh, reduced, insetR }));
	let userView = $state<View | null>(null);
	let blend = $state<{ from: View; k: number } | null>(null);
	let lastView: View | null = null;
	const shownView = $derived.by(() => {
		if (userView) return userView;
		if (blend && blend.k < 1) return lerpView(blend.from, frame.view, 1 - Math.pow(1 - blend.k, 3));
		return frame.view;
	});
	$effect(() => {
		lastView = shownView;
	});

	// ---- 時計（requestAnimationFrame。描くだけで状態を決めない） ----
	$effect(() => {
		let raf = 0;
		let last = performance.now();
		const tick = (now: number) => {
			const dt = Math.min(100, now - last);
			last = now;
			if (blend && blend.k < 1) blend = { ...blend, k: Math.min(1, blend.k + dt / 300) };
			if (playing && !pausedByAsk) t += dt * prefs.speed;
			if (auto && mode === 'watch' && frame.done && !pausedByAsk) {
				doneAt += dt;
				const wait = Array.isArray(steps[step - 1]?.loop) ? 2600 : 1200;
				if (doneAt > wait / prefs.speed) {
					doneAt = 0;
					if (step < N) go(step + 1);
					else auto = false;
				}
			} else doneAt = 0;
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	const askOf = (n: number): Step['ask'] | null =>
		mode === 'watch' && n > 0 ? (steps[n - 1]?.ask ?? null) : null;
	const pausedByAsk = $derived(!!askOf(step) && answered[step] === undefined && !reduced);

	function go(n: number, opts: { from?: 'next' | 'jump' | 'back' } = {}) {
		n = Math.max(0, Math.min(N, n));
		const kind = opts.from ?? (n === step + 1 ? 'next' : n < step ? 'back' : 'jump');
		if (kind !== 'next' && lastView) blend = { from: lastView, k: 0 };
		else blend = null;
		userView = null;
		feedback = null;
		if (wrong && wrong.step !== n) wrong = null;
		step = n;
		reach = Math.max(reach, n);
		// 戻るときは前のステップの最後の形へ（300ms の寄りで移る。LS-M6）
		t = kind === 'back' && n > 0 ? endOf(steps[n - 1]) + 1 : 0;
		playing = true;
		doneAt = 0;
	}
	function replay(from = 0) {
		t = from;
		playing = true;
		userView = null;
	}
	function answer(i: number) {
		const a = askOf(step);
		if (!a || answered[step] !== undefined) return;
		answered = { ...answered, [step]: i };
		const good = i === a.a;
		feedback = { good, text: (good ? '当たり。' : `外れ。正しくは「${a.opts[a.a]}」。`) + a.why };
		if (!good) wrong = { step, opt: i };
		t = 0;
		playing = true;
	}
	if (typeof window !== 'undefined')
		(window as unknown as { __learn2: { steps: number; go: (n: number) => void } }).__learn2 = {
			get steps() {
				return N;
			},
			go: (n: number) => {
				mode = 'watch';
				answered = { ...answered, [n]: answered[n] ?? steps[n - 1]?.ask?.a ?? 0 };
				go(n);
			}
		};

	// ---- 拡大・縮小・移動（補助。LS-D9） ----
	let drag: { x: number; y: number; v: View } | null = null;
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- 指の位置は描く物を決めない（拡大の計算だけに使う）
	const pointers = new Map<number, { x: number; y: number }>();
	let pinch: { d: number; v: View } | null = null;
	function zoomBy(f: number, cx = sw / 2, cy = sh / 2) {
		const v = shownView;
		const scale = Math.max(0.4, Math.min(3, v.scale * f));
		const wx = v.x + (cx / sw) * v.w;
		const wy = v.y + (cy / sh) * v.h;
		const w = sw / scale;
		const h = sh / scale;
		userView = { x: wx - (cx / sw) * w, y: wy - (cy / sh) * h, w, h, scale };
	}
	function onwheel(e: WheelEvent) {
		e.preventDefault();
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
	}
	function ondown(e: PointerEvent) {
		if ((e.target as Element).closest('button, .l2-board, .l2-pop')) return;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), v: shownView };
			drag = null;
		} else drag = { x: e.clientX, y: e.clientY, v: shownView };
	}
	function onmove(e: PointerEvent) {
		if (!pointers.has(e.pointerId)) return;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pinch && pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			const f = Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.d);
			const v = pinch.v;
			const scale = Math.max(0.4, Math.min(3, v.scale * f));
			const c = { x: v.x + v.w / 2, y: v.y + v.h / 2 };
			userView = {
				x: c.x - sw / scale / 2,
				y: c.y - sh / scale / 2,
				w: sw / scale,
				h: sh / scale,
				scale
			};
			return;
		}
		if (!drag) return;
		const dx = e.clientX - drag.x;
		const dy = e.clientY - drag.y;
		if (Math.abs(dx) + Math.abs(dy) < 4 && !userView) return;
		userView = { ...drag.v, x: drag.v.x - dx / drag.v.scale, y: drag.v.y - dy / drag.v.scale };
	}
	function onup(e: PointerEvent) {
		pointers.delete(e.pointerId);
		if (pointers.size < 2) pinch = null;
		drag = null;
	}

	// ---- 図の物を押す（LS-I13） ----
	let pop = $state<{
		x: number;
		y: number;
		title: string;
		lines: string[];
		col: 'pk' | 'os' | 'lg';
	} | null>(null);
	function onpick(w: { kind: 'node' | 'packet' | 'box'; id: string; x: number; y: number }) {
		const host = w.x - (stageEl?.getBoundingClientRect().x ?? 0);
		const y = w.y - (stageEl?.getBoundingClientRect().y ?? 0);
		if (w.kind === 'packet')
			pop = {
				x: host,
				y,
				title: `荷物「${w.id}」`,
				lines: ['中身は下の「荷物の中身」に、層ごとの欄とバイト列で出る'],
				col: 'pk'
			};
		else if (w.kind === 'box') {
			const b = geo.boxes.get(w.id);
			const qs = [...geo.queues.values()].filter((q) => q.box === w.id);
			pop = {
				x: host,
				y,
				title: b?.impl ?? w.id,
				lines: [
					`動く文脈：${CTX[ctxOfBox.get(w.id) ?? 'other']}`,
					...qs.map(
						(q) =>
							`${q.label}：${frame.queues.find((x) => x.id === q.id)?.count ?? 0} 個${q.limit ? `（上限 ${q.limit}）` : ''}`
					),
					'出来事の行は下の「ログ」に出る'
				],
				col: 'lg'
			};
		} else {
			const n = geo.nodes.get(w.id);
			const b = frame.badges.find((x) => x.id === w.id);
			pop = {
				x: host,
				y,
				title: n ? `${n.label}${n.town ? `（町：${n.town}）` : ''}` : w.id,
				lines: [
					...(n?.sub ? [n.sub] : []),
					...(b ? [`今の状態：${b.text}`] : []),
					'プロセス・つながり・ファイルは下の「OS の中」に出る'
				],
				col: 'os'
			};
		}
	}
	let stageEl = $state<HTMLElement>();

	// ---- 中身の板（第 1 版の部品をそのまま使う。ステップの最後の出来事で読む） ----
	const beats = $derived(beatsOf(drawn));
	const kOf = (s: number) => {
		let k = 0;
		beats.forEach((b, i) => {
			if (b.step === s) k = i;
		});
		return k;
	};
	const phase = $derived<Phase>(frame.done ? 'after' : frame.packets.length ? 'moving' : 'before');
	const inside = $derived(insideAt(drawn, kOf(cur), phase, mode === 'try' ? startHosts : null));
	const slotOfStep = (n: number) => styleOf(drawn.explain[n - 1]?.log.kind ?? '').slot;
	const head = $derived.by(() => {
		const s = drawn.explain[cur - 1];
		const mv = s?.scene.find((o) => o.op === 'move');
		if (!s || !mv || mv.op !== 'move') return null;
		return {
			k: kOf(cur),
			from: labelOf(mv.from),
			to: labelOf(mv.to),
			kind: mv.kind,
			slot: styleOf(mv.kind).slot
		};
	});
	const lastPacket = $derived.by(() => {
		for (let n = cur; n >= 1; n--) {
			const s = drawn.explain[n - 1];
			const mv = s?.scene.find((o) => o.op === 'move');
			if (s?.inside?.packet && mv && mv.op === 'move' && (n < cur || frame.done))
				return {
					packet: s.inside.packet,
					k: kOf(n),
					from: labelOf(mv.from),
					to: labelOf(mv.to),
					kind: mv.kind,
					slot: styleOf(mv.kind).slot
				};
		}
		return null;
	});
	const stepOfBeat = (k: number) => beats[k]?.step ?? 0;

	// ---- 語り ----
	const S = $derived(cur > 0 ? drawn.explain[cur - 1] : null);
	const paras = $derived(S?.depth ? S.depth[depthKey] : (S?.body ?? []));
	const workN = $derived(S?.depth?.work.length ?? 1);
	/** 「現場」の段落の番号を、今の詳しさの段落に移す */
	const mapPara = (p: number) =>
		paras.length === workN
			? p
			: Math.min(paras.length - 1, Math.round((p * paras.length) / Math.max(1, workN)));
	const shownParas = $derived(new Set(frame.para.shown.map(mapPara)));
	const activePara = $derived(frame.para.active < 0 ? -1 : mapPara(frame.para.active));
	function paraFirstAt(i: number): number {
		const cues = (S?.motion ?? []).filter((c) => c.para !== undefined && mapPara(c.para) === i);
		return cues.length ? Math.min(...cues.map((c) => c.at)) : 0;
	}
	const learned = $derived(
		new Set(
			steps.flatMap((s, i) =>
				i + 1 < step || (i + 1 === step && frame.done) || i + 1 < reach ? (s.learns ?? []) : []
			)
		)
	);
	const words = $derived((lesson.terms ?? []).map((x) => x.word));
	const meanOf = (w: string) => lesson.terms?.find((x) => x.word === w)?.mean ?? '';
	let term = $state<string | null>(null);

	// ---- やってみる ----
	async function send(text: string) {
		if (!run || busy) return;
		busy = true;
		const was = run.passed;
		try {
			run = await typeRun(run, run.editor === null ? text.trim() : text);
		} finally {
			busy = false;
		}
		tryStep = run.steps.length;
		t = 0;
		playing = true;
		if (run.passed && !was) onpass();
	}
	function resetTry() {
		run = openRun(lesson.practice);
		tryStep = 0;
		t = 0;
	}
	function rewindTry(n: number) {
		if (!run) return;
		run = rewindRun(run, n);
		tryStep = Math.min(n, run.steps.length);
		t = 0;
	}
	/** 端末に出力を出してよいか（命令の荷物が届いた後。LS-P4） */
	const outReady = $derived(
		mode !== 'try' || !tryL || t >= outputAt(tryL.explain[tryStep - 1]) || reduced
	);
	const request = $derived(
		grows.requests[0] ? { who: grows.requests[0].client, text: grows.requests[0].symptom } : null
	);
	let toastText = $state('');
	function toast(s: string) {
		toastText = s;
		setTimeout(() => (toastText = ''), 3200);
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
		toast(
			grows.moves.length > 0
				? `合格。街の手「${grows.moves[0]}」が使えるようになった`
				: '合格。修了の記録に残した'
		);
	}
	let recallPanel = $state<ReturnType<typeof RecallPanel>>();
	function finishRecall(ok: number, n: number) {
		const list = addNote(parseNotes(read(NOTES_KEY)), noteOf(lesson, ok, n));
		write(NOTES_KEY, list);
		notes = list;
		toast(`思い出すを終えた（${ok} / ${n}）。手帳に 1 枚残した`);
	}
	function setMode(m: Mode) {
		mode = m;
		t = 0;
		playing = true;
		userView = null;
		pop = null;
	}

	// ---- 検索（Ctrl+K。LS-L3） ----
	let searchOpen = $state(false);
	let q = $state('');
	let qi = $state(0);
	const hits = $derived(
		q.trim()
			? index
					.filter((x) => (x.title + x.sub).toLowerCase().includes(q.trim().toLowerCase()))
					.slice(0, 8)
			: []
	);
	function openHit(h: SearchItem) {
		searchOpen = false;
		if (h.kind === 'lesson') void goto(resolve('/lesson/[id]', { id: h.id }));
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- 道は resolve() で作り、用語の位置（#）だけを足す
		else void goto(resolve('/terms') + `#${encodeURIComponent(h.id)}`);
	}

	// ---- キー（LS-X3） ----
	function onkeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
			searchOpen = !searchOpen;
			q = '';
			e.preventDefault();
			return;
		}
		if (searchOpen) {
			if (e.key === 'Escape') searchOpen = false;
			if (e.key === 'ArrowDown') qi = Math.min(hits.length - 1, qi + 1);
			if (e.key === 'ArrowUp') qi = Math.max(0, qi - 1);
			if (e.key === 'Enter' && hits[qi]) openHit(hits[qi]);
			return;
		}
		if (inField(e.target) || e.ctrlKey || e.altKey || e.metaKey) return;
		if (e.key === 'f' || e.key === 'F') {
			full = !full;
			e.preventDefault();
			return;
		}
		if (e.key === 'Escape') {
			if (full) full = false;
			pop = null;
			term = null;
			tocOpen = false;
			showNotes = false;
			return;
		}
		if (mode === 'recall') {
			if (/^[1-9]$/.test(e.key)) {
				recallPanel?.key(Number(e.key) - 1);
				e.preventDefault();
			}
			return;
		}
		if (mode === 'try') return;
		const a = askOf(step);
		if (a && answered[step] === undefined && /^[1-9]$/.test(e.key)) {
			const i = Number(e.key) - 1;
			if (i < a.opts.length) answer(i);
			e.preventDefault();
			return;
		}
		if (e.key === 'ArrowRight') go(step + 1);
		else if (e.key === 'ArrowLeft') go(step - 1, { from: 'back' });
		else if (e.key === ' ') playing = !playing;
		else if (e.key === 'r' || e.key === 'R') replay();
		else if (e.key === 'Home') go(0);
		else if (e.key === 'End') go(N);
		else return;
		e.preventDefault();
	}
	const desc = $derived(
		cur === 0
			? `${lesson.title} の全体の図`
			: `ステップ ${cur}：${S?.title ?? ''}。${frame.board.find((b) => b.active)?.text ?? S?.lead ?? ''}`
	);
	const fieldLessonNo = $derived(course.findIndex((c) => c.id === lesson.id) + 1);
	const sendTheme = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
	const sendHelp = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
</script>

<svelte:window {onkeydown} />

<div class="l2" class:full>
	<!-- 上の帯（48px。LS-A1） -->
	<header class="l2-top">
		<a class="logo" href={resolve('/')}>devlearn</a>
		<a href={resolve('/town')}>街</a>
		<a href={resolve('/map')}>地図</a>
		<a href={resolve('/terms')}>用語集</a>
		<button type="button" class="srch" onclick={() => ((searchOpen = true), (q = ''))}
			>検索 <kbd>Ctrl K</kbd></button
		>
		<span class="sp"></span>
		<div class="seg" role="group" aria-label="詳しさ">
			{#each DEPTHS as d (d.d)}
				<button
					type="button"
					aria-pressed={prefs.depth === d.d}
					onclick={() => setPrefs({ depth: d.d })}>{d.label}</button
				>
			{/each}
		</div>
		<span class="num" title="街の資金（街で最後に見た時点）"
			>資金 {summary ? summary.money.toLocaleString('ja-JP') : '—'}</span
		>
		<span class="num" title="街の満足度">満足度 {summary ? summary.happy : '—'}</span>
		<span class="num" class:up={handsUp} title="やってみるに合格したレッスンの数"
			>学んだ手 {hands}</span
		>
		<button type="button" onclick={() => (showNotes = !showNotes)}>手帳 {notes.length}</button>
		<button type="button" onclick={sendTheme} title="明暗（T）">明暗</button>
		<button type="button" onclick={sendHelp} title="キー（?）">キー</button>
	</header>

	<!-- レッスンの見出し（56px） -->
	<div class="l2-head">
		<div class="ttl">
			<small>{fieldName(lesson.field)} / レッスン {fieldLessonNo || '—'}</small>
			<h1>{lesson.title}</h1>
		</div>
		<p class="goal">{lesson.goal}</p>
		<span class="meta"
			>{lesson.minutes ?? 30} 分 ・ 段 {lesson.tier ?? lesson.level}（{TIER[lesson.tier ?? 0] ??
				''}）・ {N} ステップ</span
		>
		<a class="grow" href={resolve('/town')} title="この学びで育つ物（押すと街へ）">
			育つ物：{grows.moves[0] ?? grows.system ?? '街の仕組み'}{grows.requests[0]
				? ` ・ 効く要望「${grows.requests[0].symptom}」`
				: ''}
		</a>
		<nav class="l2-modes" aria-label="学び方">
			{#each MODES as m (m.id)}
				<button type="button" aria-pressed={mode === m.id} onclick={() => setMode(m.id)}
					>{m.label}</button
				>
			{/each}
		</nav>
	</div>

	<div class="l2-body" class:try={mode === 'try'} class:recall={mode === 'recall'}>
		<!-- 左の目次（畳んだ形 56px。開くと図の上に重なる。LS-A2） -->
		<nav class="l2-toc" class:open={tocOpen} aria-label="同じ分野のレッスン">
			<button type="button" class="tt" onclick={() => (tocOpen = !tocOpen)} aria-expanded={tocOpen}
				>{tocOpen ? '× 閉じる' : '目次'}</button
			>
			<ol>
				{#each course as c, i (c.id)}
					<li class:now={c.id === lesson.id}>
						<a href={resolve('/lesson/[id]', { id: c.id })} title={c.title}>
							<b>{i + 1}</b>{#if tocOpen}<span>{c.title}</span>{:else}<span class="ini"
									>{c.title.slice(0, 1)}</span
								>{/if}
						</a>
					</li>
				{/each}
			</ol>
		</nav>

		<section class="l2-col">
			<div class="l2-dia">
				<!-- 指標の帯（LS-A9） -->
				<div class="l2-metrics">
					{#each lesson.metrics ?? [] as m (m.key)}
						{@const f = frame.metrics.find((x) => x.key === m.key)}
						<span class="mt" class:moving={f?.moving} class:sum={m.key === 'total'}>
							<small>{m.label}</small>
							<b data-metric={m.key}>{f?.text ?? '—'}</b>
						</span>
					{/each}
					<span class="sp"></span>
					{#if mode === 'watch'}
						<button type="button" onclick={() => replay()} title="もう一度（R）">↻ もう一度</button>
						<button type="button" onclick={() => (playing = !playing)} title="一時停止（Space）"
							>{playing ? '❚❚ 一時停止' : '▶ 再生'}</button
						>
						<button
							type="button"
							aria-pressed={auto}
							onclick={() => (auto = !auto)}
							title="全ステップを続けて流す">自動</button
						>
						<div class="seg sm" role="group" aria-label="速さ">
							{#each [0.5, 1, 2] as const as v (v)}
								<button
									type="button"
									aria-pressed={prefs.speed === v}
									onclick={() => setPrefs({ speed: v })}>{v}×</button
								>
							{/each}
						</div>
					{/if}
					<button type="button" onclick={() => (full = !full)} title="図を大きく（F）">⤢</button>
				</div>

				<div
					class="l2-stage"
					bind:this={stageEl}
					bind:clientWidth={sw}
					bind:clientHeight={sh}
					{onwheel}
					onpointerdown={ondown}
					onpointermove={onmove}
					onpointerup={onup}
					onpointercancel={onup}
					role="presentation"
				>
					{#if prefs.view === 'seq' && mode === 'watch'}
						<Lanes2 lesson={drawn} step={cur} label={labelOf} ongo={(n) => go(n)} />
					{:else}
						<Stage2
							lesson={drawn}
							{geo}
							{frame}
							view={shownView}
							town={prefs.town}
							{styleOf}
							contextOf={(id) => ctxOfBox.get(id)}
							{onpick}
							{desc}
						/>
					{/if}
					{#if mode === 'watch' && frame.board.length && prefs.view !== 'seq'}
						<ol class="l2-board" aria-label="出来事の札">
							{#each frame.board as b, i (i)}
								<li class:shown={b.shown} class:active={b.active} data-label="出来事 {i + 1}">
									{b.text}
								</li>
							{/each}
						</ol>
					{/if}
					<div class="zoom">
						<button type="button" onclick={() => zoomBy(1.2)} aria-label="拡大">＋</button>
						<button type="button" onclick={() => zoomBy(1 / 1.2)} aria-label="縮小">−</button>
						{#if userView}<button type="button" class="back" onclick={() => (userView = null)}
								>寄りに戻す</button
							>{/if}
						<button
							type="button"
							aria-pressed={prefs.view === 'seq'}
							onclick={() => setPrefs({ view: prefs.view === 'seq' ? 'map' : 'seq' })}
						>
							{prefs.view === 'seq' ? '◇ 図' : '⇄ 時系列'}
						</button>
						<button
							type="button"
							aria-pressed={prefs.town}
							onclick={() => setPrefs({ town: !prefs.town })}>名札</button
						>
					</div>
					{#if pop}
						<div
							class="l2-pop"
							style:left="{Math.min(pop.x, sw - 280)}px"
							style:top="{Math.min(pop.y, sh - 120)}px"
							role="dialog"
						>
							<b>{pop.title}</b>
							{#each pop.lines as l, i (i)}<p>{l}</p>{/each}
							<button type="button" onclick={() => (pop = null)}>閉じる</button>
						</div>
					{/if}
					{#if mode === 'watch' && askOf(step) && answered[step] === undefined}
						{@const a = askOf(step)!}
						<div class="ask" role="dialog" aria-label="予想の問い">
							<b>予想してから進む：{a.q}</b>
							{#each a.opts as o, i (i)}
								<button type="button" onclick={() => answer(i)}><kbd>{i + 1}</kbd> {o}</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- 凡例（LS-A10。色と線の形） -->
				<div class="l2-legend">
					{#each lesson.legend ?? [] as g (g.kind)}
						{@const st = styleOf(g.kind)}
						<span
							><svg width="34" height="12" aria-hidden="true"
								><line x1="2" y1="6" x2="32" y2="6" class="lg k{st.slot} {g.style}" /></svg
							>{g.label}</span
						>
					{/each}
					{#if ctxOfBox.size}
						{#each [...new Set(ctxOfBox.values())] as c (c)}
							<span class="cxl ctx-{c}"><i></i>{CTX[c]}</span>
						{/each}
					{/if}
				</div>
			</div>

			{#if mode === 'watch'}
				<!-- ステップの帯（LS-T7） -->
				<ol class="l2-steps" aria-label="ステップ">
					{#each steps as s, i (i)}
						<li>
							<button
								type="button"
								class:now={i + 1 === step}
								class:done={i + 1 < step || i + 1 <= reach - 1}
								onclick={() => go(i + 1)}
								title={s.title}
							>
								<b>{i + 1}</b><span>{s.short ?? s.title.slice(0, 8)}</span>
							</button>
						</li>
					{/each}
				</ol>
			{/if}
		</section>

		{#if mode === 'watch'}
			<!-- 右の語り（LS-A3） -->
			<aside class="l2-narr" aria-live="polite">
				{#if step === 0}
					<p class="sn">概要 ・ {N} ステップ ・ {lesson.minutes ?? 30} 分</p>
					<h2>{lesson.title}</h2>
					<p class="l2-para">{lesson.goal}</p>
					<h3>学べること</h3>
					<ul class="learn">
						{#each lesson.learn ?? [] as x, i (i)}<li>{x}</li>{/each}
					</ul>
					{#if lesson.terms?.length}
						<h3>言葉</h3>
						<dl class="words">
							{#each Object.entries(lesson.map?.nodes ?? {})
								.filter(([, n]) => n.town)
								.slice(0, 5) as [id, n] (id)}
								<dt>町の{n.town}</dt>
								<dd>＝ {labelOf(id)}</dd>
							{/each}
							{#each lesson.terms.slice(0, 5) as x (x.word)}
								<dt>{x.word}</dt>
								<dd>{x.mean}</dd>
							{/each}
						</dl>
					{/if}
					<div class="nav">
						<button type="button" class="l2-next primary" onclick={() => go(1)}
							>見るを始める：{steps[0]?.title} →</button
						>
					</div>
				{:else if S}
					<p class="sn">ステップ {step} / {N}</p>
					<span class="kind k-{S.kind}">{KIND_LABEL[S.kind ?? 'mechanism']}</span>
					<h2>{S.title}</h2>
					{#each paras as p, i (i)}
						<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
						<p
							class="l2-para"
							class:on={i === activePara}
							class:hidden={!shownParas.has(i)}
							role="button"
							tabindex="0"
							title="押すと、この段落の動きをもう一度流す"
							onclick={() => replay(paraFirstAt(i))}
							onkeydown={(e) => e.key === 'Enter' && replay(paraFirstAt(i))}
						>
							{#each segment(p, words) as piece, j (j)}
								{#if piece.term}
									<button
										type="button"
										class="term"
										onclick={(e) => (
											(term = term === piece.term ? null : piece.term),
											e.stopPropagation()
										)}>{piece.text}</button
									>
								{:else}{piece.text}{/if}
							{/each}
						</p>
					{/each}
					{#if term}
						<div class="termcard" role="note">
							<b>{term}</b>
							<p>{meanOf(term)}</p>
							<small
								>この用語が出るレッスン：
								{#each (termLessons[term] ?? []).slice(0, 4) as tl, i (tl.id)}{i ? '・' : ''}<a
										href={resolve('/lesson/[id]', { id: tl.id })}>{tl.title}</a
									>{/each}
							</small>
						</div>
					{/if}
					{#if S.callout}
						<div class="callout {S.callout.type}">
							<b
								>{S.callout.type === 'point'
									? 'ポイント'
									: S.callout.type === 'tip'
										? '知っておくと便利'
										: '注意'}</b
							>
							{S.callout.text}
						</div>
					{/if}
					{#if S.knobs?.length && knob && knobOut}
						<div class="knobs">
							<b>実験：{knob.ask}</b>
							{#if knobGuess === null}
								<div class="kg">
									{#each knob.opts as o, i (i)}<button type="button" onclick={() => (knobGuess = i)}
											>{o}</button
										>{/each}
								</div>
							{:else}
								<small
									>あなたの予想：{knob.opts[knobGuess]}（{knobGuess === knob.a
										? '当たり'
										: `答えは「${knob.opts[knob.a]}」`}）</small
								>
								{#each (lesson.knobs ?? []).filter((k) => S.knobs?.includes(k.id)) as k (k.id)}
									<label>
										<span>{k.label} <b>{knobVals[k.id] ?? k.value} {k.unit}</b></span>
										<input
											type="range"
											min={k.min}
											max={k.max}
											step={k.step}
											value={knobVals[k.id] ?? k.value}
											oninput={(e) =>
												(knobVals = {
													...knobVals,
													[k.id]: Number((e.currentTarget as HTMLInputElement).value)
												})}
										/>
									</label>
								{/each}
								<dl>
									{#each knobOut.rows as r (r.k)}<dt>{r.k}</dt>
										<dd>{r.v}</dd>{/each}
								</dl>
								<p class="kn">{knobOut.note}</p>
							{/if}
						</div>
					{/if}
					{#if feedback}<p class="fb" class:good={feedback.good}>{feedback.text}</p>{/if}
					{#if S.changes?.length}
						<ul class="changes" aria-label="変わったこと">
							{#each S.changes as c, i (i)}<li
									class="m{c.mark === '+' ? 'p' : c.mark === '-' ? 'm' : 't'}"
								>
									<b>{c.mark === '~' ? '〜' : c.mark === '-' ? '−' : '＋'}</b>{c.text}
								</li>{/each}
						</ul>
					{/if}
					{#if S.town || S.work}
						<p class="tw">
							{#if S.town}<span><b>町では</b>{S.town}</span>{/if}{#if S.work}<span
									><b>現場では</b>{S.work}</span
								>{/if}
						</p>
					{/if}
					<div class="nav">
						<button type="button" onclick={() => go(step - 1, { from: 'back' })}>← 戻る</button>
						{#if step < N}
							<button type="button" class="l2-next primary" onclick={() => go(step + 1)}
								>次へ：{steps[step]?.title} →</button
							>
						{:else}
							<button type="button" class="l2-next primary" onclick={() => setMode('try')}
								>やってみるへ →</button
							>
						{/if}
					</div>
				{/if}
				<p class="keys">
					<kbd>←</kbd><kbd>→</kbd> ステップ ・ <kbd>R</kbd> もう一度 ・ <kbd>Space</kbd> 一時停止 ・
					<kbd>F</kbd> 図を大きく
				</p>
				<h3>学べること</h3>
				<ul class="learn chk">
					{#each lesson.learn ?? [] as x, i (i)}<li class:ok={learned.has(i)}>
							{learned.has(i) ? '✓' : '□'}
							{x}
						</li>{/each}
				</ul>
				<p class="src">
					出典：{#each lesson.sources ?? [] as s, i (s.id)}{i
							? '・'
							: ''}<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- 外の一次情報（別タブ） --><a
							href={s.url}
							target="_blank"
							rel="noopener noreferrer">{s.title}</a
						>{/each}
				</p>
			</aside>
		{:else if mode === 'try'}
			<aside class="l2-term">
				{#if run}
					<TryPanel
						{lesson}
						{run}
						sel={tryStep}
						depth={prefs.depth}
						{request}
						busy={busy || !outReady}
						big
						onsend={(x) => void send(x)}
						onreset={resetTry}
						onrewind={rewindTry}
						onrecall={() => setMode('recall')}
					/>
				{:else}
					<p>この実戦は道具を使わない形。</p>
				{/if}
			</aside>
		{:else}
			<aside class="l2-narr recall">
				<RecallPanel
					bind:this={recallPanel}
					{lesson}
					title={(id) => known.get(id) ?? id}
					onfinish={finishRecall}
					onnotes={() => (showNotes = true)}
				/>
			</aside>
		{/if}
	</div>

	{#if mode !== 'recall'}
		<!-- 中身の板（全幅。LS-I1・I12） -->
		<div class="l2-inside glow-{pop?.col ?? ''}">
			<InsideBoard
				{inside}
				depth={prefs.depth}
				{head}
				{reduced}
				{slotOfStep}
				{lastPacket}
				ongo={(k) => (mode === 'watch' ? go(stepOfBeat(k)) : rewindTry(stepOfBeat(k)))}
			/>
		</div>
		<!-- 記録（LS-T10） -->
		<div class="l2-rec">
			<table>
				<thead
					><tr
						><th>#</th><th>時間</th><th>送り元</th><th>宛先</th><th>種類</th><th>内容</th><th
							>大きさ</th
						></tr
					></thead
				>
				<tbody>
					{#each drawn.explain.slice(0, Math.max(cur, mode === 'watch' ? reach : cur)) as s, i (i)}
						<tr
							class:now={i + 1 === cur}
							onclick={() => (mode === 'watch' ? go(i + 1) : rewindTry(i + 1))}
						>
							<td>{i + 1}</td><td>{s.log.t}</td><td>{labelOf(s.log.from)}</td><td
								>{labelOf(s.log.to)}</td
							><td>{s.log.kind}</td><td>{s.log.info}</td><td>{s.log.size ?? ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if showNotes}
		<div class="notes" role="dialog" aria-label="手帳">
			<h2>手帳</h2>
			{#each notes as n (n.id)}
				<p>
					<a href={resolve('/lesson/[id]', { id: n.id })}><b>{n.title}</b></a> ・ {n.score}<br
					/><small>{n.point}</small>
				</p>
			{:else}<p>まだ無い。思い出すを終えると 1 枚増える。</p>{/each}
			<button type="button" onclick={() => (showNotes = false)}>閉じる</button>
		</div>
	{/if}
	{#if searchOpen}
		<div class="search" role="dialog" aria-label="検索">
			<!-- svelte-ignore a11y_autofocus -->
			<input bind:value={q} placeholder="レッスンと用語を検索" autofocus oninput={() => (qi = 0)} />
			<ul>
				{#each hits as h, i (h.kind + h.id)}
					<li class:sel={i === qi}>
						<button type="button" onclick={() => openHit(h)}
							>{h.kind === 'lesson' ? 'レッスン' : '用語'} ・ <b>{h.title}</b>
							<small>{h.sub}</small></button
						>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
	{#if toastText}<p class="toast" role="status">{toastText}</p>{/if}
</div>

<style>
	.l2 {
		--peek: 150px;
		--narr: 400px;
		min-height: 100vh;
		background: var(--dl-bg);
		color: var(--dl-text);
		font-size: 14px;
	}
	@media (min-height: 1000px) {
		.l2 {
			--peek: 196px;
		}
	}
	@media (min-width: 1900px) {
		.l2 {
			--narr: 420px;
		}
	}
	button {
		font: inherit;
		color: inherit;
		background: var(--dl-surface);
		border: 1px solid var(--dl-border);
		border-radius: var(--dl-radius);
		padding: 2px 10px;
		cursor: pointer;
		min-height: 30px;
	}
	button[aria-pressed='true'] {
		background: var(--dl-kind-1-bg);
		border-color: var(--dl-kind-1-fg);
		color: var(--dl-kind-1-fg);
		font-weight: 700;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 3px solid var(--dl-focus);
		outline-offset: 2px;
	}
	kbd {
		font-family: var(--dl-font-code);
		font-size: 12px;
		border: 1px solid var(--dl-border-strong);
		border-radius: 4px;
		padding: 0 4px;
	}
	.l2-top {
		height: 48px;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 14px;
		border-bottom: 1px solid var(--dl-border);
		background: var(--dl-surface);
		white-space: nowrap;
		overflow: hidden;
	}
	.l2-top a {
		color: var(--dl-text);
	}
	.logo {
		font-weight: 800;
	}
	.sp {
		flex: 1;
	}
	.num {
		font-family: var(--dl-font-code);
		font-size: 13px;
	}
	.num.up {
		color: var(--dl-done);
		font-weight: 800;
	}
	.seg {
		display: inline-flex;
	}
	.seg button {
		border-radius: 0;
	}
	.seg button:first-child {
		border-radius: var(--dl-radius) 0 0 var(--dl-radius);
	}
	.seg button:last-child {
		border-radius: 0 var(--dl-radius) var(--dl-radius) 0;
	}
	.l2-head {
		height: 56px;
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 0 14px;
		border-bottom: 1px solid var(--dl-border);
		overflow: hidden;
		white-space: nowrap;
	}
	.ttl small {
		display: block;
		color: var(--dl-text-muted);
		font-size: 12px;
		line-height: 1.2;
	}
	.ttl h1 {
		margin: 0;
		font-size: 17px;
		line-height: 1.3;
	}
	.goal {
		margin: 0;
		color: var(--dl-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1 1 0;
		min-width: 0;
	}
	.meta {
		font-size: 12.5px;
		color: var(--dl-text-muted);
	}
	.grow {
		font-size: 12.5px;
		color: var(--dl-kind-3-fg);
		max-width: 300px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.l2-body {
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr) var(--narr);
		min-height: max(560px, calc(100vh - 104px - var(--peek)));
		position: relative;
	}
	.l2-body.try {
		grid-template-columns: 56px minmax(0, 1fr) minmax(640px, 46%);
		min-height: max(600px, calc(100vh - 104px - 40px));
	}
	.l2-toc {
		border-right: 1px solid var(--dl-border);
		background: var(--dl-surface);
		z-index: 5;
		position: relative;
		min-width: 0;
	}
	.l2-toc.open {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 280px;
		box-shadow: var(--dl-shadow);
	}
	.l2-toc .tt {
		width: 100%;
		border: 0;
		border-radius: 0;
		font-size: 12px;
		padding: 4px 0;
	}
	.l2-toc ol {
		list-style: none;
		margin: 0;
		padding: 4px;
	}
	.l2-toc a {
		display: flex;
		gap: 6px;
		align-items: center;
		color: var(--dl-text);
		text-decoration: none;
		font-size: 12px;
		padding: 3px 4px;
		border-radius: 6px;
	}
	.l2-toc li.now a {
		background: var(--dl-kind-1-bg);
		color: var(--dl-kind-1-fg);
	}
	.l2-toc b {
		font-family: var(--dl-font-code);
		min-width: 18px;
		text-align: right;
	}
	.l2-col {
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		min-width: 0;
	}
	.l2-dia {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		min-height: 0;
		border-right: 1px solid var(--dl-border);
	}
	.l2-metrics {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border-bottom: 1px solid var(--dl-border);
		flex-wrap: wrap;
	}
	.mt {
		display: inline-flex;
		flex-direction: column;
		padding: 0 10px;
		border-right: 1px solid var(--dl-border);
		line-height: 1.2;
	}
	.mt small {
		font-size: 11.5px;
		color: var(--dl-text-muted);
	}
	.mt b {
		font-family: var(--dl-font-code);
		font-size: 15px;
	}
	.mt.moving b {
		color: var(--dl-now);
	}
	.mt.sum b {
		color: var(--dl-kind-4-fg);
	}
	.l2-stage {
		position: relative;
		min-height: 0;
		overflow: hidden;
		touch-action: none;
		cursor: grab;
		background:
			radial-gradient(
					circle at 1px 1px,
					color-mix(in oklab, var(--dl-border) 70%, transparent) 1px,
					transparent 0
				)
				0 0 / 22px 22px,
			var(--dl-bg);
	}
	.l2-board {
		position: absolute;
		top: 12px;
		right: 12px;
		width: 272px;
		margin: 0;
		padding: 10px 12px 10px 30px;
		background: color-mix(in oklab, var(--dl-surface-raised) 94%, transparent);
		border: 1px solid var(--dl-border-strong);
		border-radius: var(--dl-radius-box);
		font-size: 13px;
		line-height: 1.45;
		box-shadow: var(--dl-shadow);
	}
	.l2-board li {
		opacity: 0;
		transform: translateY(6px);
		transition:
			opacity 0.25s,
			transform 0.25s;
		margin: 2px 0;
	}
	.l2-board li.shown {
		opacity: 0.75;
		transform: none;
	}
	.l2-board li.active {
		opacity: 1;
		color: var(--dl-now);
		font-weight: 700;
	}
	.zoom {
		position: absolute;
		left: 10px;
		bottom: 10px;
		display: flex;
		gap: 6px;
	}
	.zoom .back {
		border-color: var(--dl-now);
		color: var(--dl-now);
	}
	.l2-pop {
		position: absolute;
		width: 270px;
		background: var(--dl-surface-raised);
		border: 1px solid var(--dl-border-strong);
		border-radius: var(--dl-radius-box);
		padding: 10px 12px;
		box-shadow: var(--dl-shadow);
		z-index: 4;
		font-size: 13px;
	}
	.l2-pop p {
		margin: 4px 0;
	}
	.ask {
		position: absolute;
		left: 50%;
		bottom: 56px;
		transform: translateX(-50%);
		width: min(560px, 90%);
		background: var(--dl-surface-raised);
		border: 2px solid var(--dl-now);
		border-radius: var(--dl-radius-box);
		padding: 12px 14px;
		display: grid;
		gap: 6px;
		box-shadow: var(--dl-shadow);
	}
	.ask button {
		text-align: left;
	}
	.l2-legend {
		display: flex;
		gap: 16px;
		align-items: center;
		padding: 5px 12px;
		border-top: 1px solid var(--dl-border);
		font-size: 12.5px;
		flex-wrap: wrap;
	}
	.l2-legend span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.lg {
		stroke-width: 3;
	}
	.lg.dash {
		stroke-dasharray: 6 4;
	}
	.lg.double {
		stroke-width: 6;
	}
	.lg.k1 {
		stroke: var(--dl-kind-1-fg);
	}
	.lg.k2 {
		stroke: var(--dl-kind-2-fg);
	}
	.lg.k3 {
		stroke: var(--dl-kind-3-fg);
	}
	.lg.k4 {
		stroke: var(--dl-kind-4-fg);
	}
	.lg.k5 {
		stroke: var(--dl-kind-5-fg);
	}
	.cxl i {
		display: inline-block;
		width: 10px;
		height: 14px;
		border-radius: 3px;
		background: var(--c);
	}
	.ctx-syscall {
		--c: var(--dl-kind-1-fg);
	}
	.ctx-hardirq {
		--c: var(--dl-wrong);
	}
	.ctx-softirq {
		--c: var(--dl-kind-4-fg);
	}
	.ctx-tasklet {
		--c: var(--dl-kind-2-fg);
	}
	.ctx-kthread {
		--c: var(--dl-kind-3-fg);
	}
	.ctx-user,
	.ctx-other {
		--c: var(--dl-kind-5-fg);
	}
	.l2-steps {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 6px 8px;
		gap: 4px;
		border-top: 1px solid var(--dl-border);
		border-right: 1px solid var(--dl-border);
		min-height: 56px;
		align-items: stretch;
	}
	.l2-steps li {
		flex: 1 1 0;
		min-width: 0;
	}
	.l2-steps button {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2px;
		font-size: 11.5px;
		line-height: 1.25;
	}
	.l2-steps button b {
		font-family: var(--dl-font-code);
		font-size: 12px;
	}
	.l2-steps button span {
		white-space: nowrap;
		overflow: hidden;
		max-width: 100%;
	}
	.l2-steps button.done {
		border-color: var(--dl-done);
	}
	.l2-steps button.now {
		background: var(--dl-kind-1-bg);
		border-color: var(--dl-now);
		color: var(--dl-now);
		font-weight: 700;
	}
	.l2-narr {
		padding: 12px 18px;
		min-width: 0;
		font-size: 13.5px;
		line-height: 1.6;
	}
	.l2-narr h2 {
		margin: 2px 0 6px;
		font-size: 19px;
		line-height: 1.35;
	}
	.l2-narr h3 {
		font-size: 13px;
		margin: 10px 0 2px;
		color: var(--dl-text-muted);
	}
	.sn {
		margin: 0;
		color: var(--dl-text-muted);
		font-size: 12.5px;
	}
	.kind {
		display: inline-block;
		font-size: 12px;
		font-weight: 700;
		padding: 0 8px;
		border-radius: 10px;
		background: var(--dl-kind-1-bg);
		color: var(--dl-kind-1-fg);
	}
	.k-problem,
	.k-fail {
		background: color-mix(in oklab, var(--dl-wrong) 15%, var(--dl-surface));
		color: var(--dl-wrong);
	}
	.k-fix,
	.k-technique {
		background: var(--dl-kind-3-bg);
		color: var(--dl-kind-3-fg);
	}
	.k-tradeoff,
	.k-numbers {
		background: var(--dl-kind-4-bg);
		color: var(--dl-kind-4-fg);
	}
	.k-internals {
		background: var(--dl-kind-2-bg);
		color: var(--dl-kind-2-fg);
	}
	.l2-para {
		margin: 0 0 6px;
		padding: 2px 6px;
		border-left: 3px solid transparent;
		border-radius: 4px;
		cursor: pointer;
		transition:
			background 0.25s,
			opacity 0.35s;
	}
	.l2-para.on {
		border-left-color: var(--dl-now);
		background: color-mix(in oklab, var(--dl-kind-1-bg) 70%, transparent);
	}
	.l2-para.hidden {
		opacity: 0.18;
	}
	.term {
		all: unset;
		cursor: help;
		border-bottom: 1px dotted var(--dl-kind-2-fg);
	}
	.termcard {
		border: 1px solid var(--dl-kind-2-fg);
		border-radius: var(--dl-radius);
		padding: 6px 10px;
		margin: 4px 0;
		background: var(--dl-kind-2-bg);
	}
	.termcard p {
		margin: 2px 0;
	}
	.callout {
		border-left: 4px solid var(--dl-kind-3-fg);
		background: var(--dl-kind-3-bg);
		padding: 5px 10px;
		border-radius: 4px;
		margin: 6px 0;
		font-size: 13px;
		line-height: 1.5;
	}
	.callout b {
		display: block;
		font-size: 12px;
	}
	.callout.warn {
		border-left-color: var(--dl-warn);
		background: color-mix(in oklab, var(--dl-warn) 12%, var(--dl-surface));
	}
	.callout.tip {
		border-left-color: var(--dl-kind-2-fg);
		background: var(--dl-kind-2-bg);
	}
	.changes {
		list-style: none;
		padding: 0;
		margin: 4px 0;
		font-size: 13px;
		line-height: 1.45;
	}
	.changes b {
		display: inline-block;
		width: 1.4em;
	}
	.changes .mp b {
		color: var(--dl-done);
	}
	.changes .mm b {
		color: var(--dl-wrong);
	}
	.changes .mt b {
		color: var(--dl-warn);
	}
	.tw {
		font-size: 12.5px;
		margin: 4px 0;
		display: grid;
		gap: 2px;
	}
	.tw b {
		margin-right: 6px;
		color: var(--dl-kind-3-fg);
	}
	.nav {
		display: flex;
		gap: 8px;
		margin: 8px 0 4px;
		position: sticky;
		bottom: 0;
		background: var(--dl-bg);
		padding: 4px 0;
	}
	.nav .primary {
		flex: 1;
		background: var(--dl-kind-1-bg);
		border-color: var(--dl-now);
		color: var(--dl-now);
		font-weight: 700;
		text-align: left;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.keys {
		font-size: 12px;
		color: var(--dl-text-muted);
		margin: 0;
	}
	.learn {
		margin: 0;
		padding-left: 0;
		list-style: none;
		font-size: 13px;
		line-height: 1.5;
	}
	.learn.chk li.ok {
		color: var(--dl-done);
	}
	.words {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2px 10px;
		font-size: 13px;
		margin: 0;
	}
	.words dt {
		font-weight: 700;
	}
	.words dd {
		margin: 0;
	}
	.src {
		font-size: 12px;
		color: var(--dl-text-muted);
	}
	.knobs {
		border: 1px solid var(--dl-kind-4-fg);
		border-radius: var(--dl-radius);
		padding: 6px 10px;
		margin: 6px 0;
		font-size: 13px;
	}
	.knobs label {
		display: grid;
		margin: 4px 0;
	}
	.knobs dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0 8px;
		margin: 4px 0;
		font-family: var(--dl-font-code);
	}
	.knobs dd {
		margin: 0;
	}
	.kg {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 4px;
	}
	.fb {
		border-left: 4px solid var(--dl-wrong);
		padding: 4px 8px;
		font-size: 13px;
	}
	.fb.good {
		border-left-color: var(--dl-done);
	}
	.l2-term {
		min-width: 0;
		border-left: 1px solid var(--dl-border);
		display: flex;
		flex-direction: column;
	}
	.l2-inside {
		border-top: 1px solid var(--dl-border);
	}
	.l2-inside.glow-pk :global(.col.pk),
	.l2-inside.glow-os :global(.col.os),
	.l2-inside.glow-lg :global(.col.lg) {
		outline: 3px solid var(--dl-now);
		outline-offset: -3px;
	}
	.l2-rec {
		padding: 6px 12px 24px;
		overflow-x: auto;
	}
	.l2-rec table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12.5px;
	}
	.l2-rec td,
	.l2-rec th {
		border-bottom: 1px solid var(--dl-border);
		padding: 3px 6px;
		text-align: left;
	}
	.l2-rec tr {
		cursor: pointer;
	}
	.l2-rec tr.now {
		background: var(--dl-kind-1-bg);
	}
	.notes,
	.search {
		position: fixed;
		top: 60px;
		left: 50%;
		transform: translateX(-50%);
		width: min(560px, 94vw);
		background: var(--dl-surface-raised);
		border: 1px solid var(--dl-border-strong);
		border-radius: var(--dl-radius-box);
		padding: 14px;
		z-index: 20;
		box-shadow: var(--dl-shadow);
	}
	.search input {
		width: 100%;
		font: inherit;
		padding: 8px;
		box-sizing: border-box;
	}
	.search ul {
		list-style: none;
		padding: 0;
		margin: 6px 0 0;
	}
	.search li button {
		width: 100%;
		text-align: left;
		border: 0;
	}
	.search li.sel button {
		background: var(--dl-kind-1-bg);
	}
	.toast {
		position: fixed;
		bottom: 18px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--dl-surface-raised);
		border: 1px solid var(--dl-done);
		padding: 8px 14px;
		border-radius: var(--dl-radius);
		z-index: 30;
	}
	/* 図だけを大きく（F。LS-A11） */
	.l2.full .l2-top,
	.l2.full .l2-head,
	.l2.full .l2-toc,
	.l2.full .l2-inside,
	.l2.full .l2-rec {
		display: none;
	}
	.l2.full .l2-body {
		grid-template-columns: minmax(0, 1fr) var(--narr);
		min-height: 100vh;
	}
	/* 中くらいの幅（11.9） */
	@media (max-width: 1280px) {
		.l2 {
			--narr: 340px;
		}
		.goal,
		.grow {
			display: none;
		}
	}
	/* 携帯の幅（11.9） */
	@media (max-width: 960px) {
		.l2-top {
			gap: 8px;
			font-size: 12px;
		}
		.l2-top .num,
		.l2-top .srch {
			display: none;
		}
		.l2-head {
			height: auto;
			flex-wrap: wrap;
			padding: 6px 10px;
			white-space: normal;
		}
		.meta {
			display: none;
		}
		.l2-body,
		.l2-body.try {
			display: block;
			min-height: 0;
		}
		.l2-toc {
			display: none;
		}
		.l2-dia {
			position: sticky;
			top: 0;
			z-index: 6;
			background: var(--dl-bg);
			grid-template-rows: auto 330px auto;
			border-right: 0;
			border-bottom: 1px solid var(--dl-border);
		}
		.l2-board {
			display: none;
		}
		.l2-steps {
			overflow-x: auto;
			border-right: 0;
		}
		.l2-steps li {
			flex: 0 0 64px;
		}
		.l2-narr {
			padding: 10px 12px;
		}
		.l2-metrics .seg,
		.l2-metrics button {
			display: none;
		}
	}
</style>
