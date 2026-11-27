// 検査 41〜48（explanation-standard.md 第 3 章。第 3 版・言葉と構図）。
// 第 3 版のレッスン（V3Lesson）だけに当てる。言葉の一覧は分野ごと（src/lib/content/terms/）、
// 専門語の辞書は src/lib/content/terms/jargon.ts。図の物の外枠は REACH（物の中心からの半径。線を止める所と同じ）
import { REACH, type SceneObj } from './scene/draw.ts';
import type { Layout } from './scene/layout.ts';
import type { PodState } from '../ui/scene/kit/paint.ts';
import type { Cue } from './scene/cue.ts';
import type { WireKind } from './scene/wire.ts';
import { firstPerStep, markTerms, type Term } from './terms.ts';

export type V3Kind =
	| 'intro'
	| 'problem'
	| 'mechanism'
	| 'internals'
	| 'fail'
	| 'fix'
	| 'technique'
	| 'tradeoff'
	| 'numbers'
	| 'realworld'
	| 'ops'
	| 'teach'
	| 'summary';
/** 式の分解の部分。pre・post は部分の前後の記号（「(」「, 」「)」。意味の札を持たない） */
export type Anatomy = {
	text: string;
	note?: string;
	term?: string;
	color?: string;
	pre?: string;
	post?: string;
};
export type V3Step = {
	kind: V3Kind;
	title: string;
	/** 本文の段落（詳しさの全ての段） */
	paras: string[];
	/** 図の構図（物の ID → [x, y, 縮尺]）。1000×600 */
	layout: Layout;
	/** このステップで初めて出る言葉（言葉の ID。計算と一致すること。検査 42） */
	first: string[];
	intro?: { terms: string[]; anatomy: Anatomy[]; analogy: string };
	/** 下の帯の短い名前 */
	short?: string;
	/** 段落ごとの始まりの時刻（ms。今の段落が光る） */
	at?: number[];
	/** 動きの長さ（ms）。終わると 2.6 秒置いて繰り返す（LS3-M1） */
	dur?: number;
	/** 物と物を結ぶ線（LS3-K4） */
	links?: { from: string; to: string; kind?: WireKind; both?: boolean }[];
	/** 物から物へ進む荷物（LS3-K5） */
	tokens?: Cue[];
	/** このステップで変わる指標の値 */
	metrics?: Record<string, string>;
	/** 囲み（題・本文） */
	callout?: [string, string];
	/** 変わったこと（+ 足した・- 消えた・~ 変わった） */
	changes?: ['+' | '-' | '~', string][];
	/** 中身まで（実装の名前と数。畳む） */
	deep?: string;
	/** このステップだけの物の名前（言葉をそろえるステップの分かる名前など） */
	names?: Record<string, string>;
	/** 主役（台の色を濃くする） */
	hl?: string[];
	/** Pod の状態（物の ID → 状態。無ければ ready。第 17 章 pod） */
	pods?: Record<string, PodState>;
	/** 黙ったノード（platform の ID。灰の点線で描く） */
	down?: string[];
};
export type V3Lesson = {
	id: string;
	field: string;
	title: string;
	/** できるようになること */
	goal: string;
	/** 上の小さな題（分野・段・見せ方） */
	kick: string;
	/** このレッスンで使う言葉（言葉の ID） */
	terms: string[];
	objs: Record<string, SceneObj>;
	steps: V3Step[];
	metrics?: { key: string; label: string; term?: string; desc?: string }[];
	knobs?: { id: string; label: string; term?: string; desc?: string }[];
	commands?: { cmd: string; term?: string; desc?: string }[];
};
export type Add3 = (check: number, where: string, msg: string) => void;

export const VIEW = { w: 1000, h: 600 } as const;
/** 中に物を乗せる台（重なりを数えない） */
const HOLDERS = new Set(['platform', 'frame']);

const WORD = /[A-Za-z0-9_]/;
/** 専門語が文に出るか（英字は単語の途中では数えない） */
function hasWord(text: string, w: string): boolean {
	for (let i = text.indexOf(w); i >= 0; i = text.indexOf(w, i + 1)) {
		const a = i > 0 && WORD.test(w[0]) && WORD.test(text[i - 1]);
		const j = i + w.length;
		const b = j < text.length && WORD.test(w[w.length - 1]) && WORD.test(text[j]);
		if (!a && !b) return true;
	}
	return false;
}

/** ステップの中で言葉を探す文（本文・図の物の名前・式の分解） */
function stepTexts(l: V3Lesson, s: V3Step): string[] {
	const names = Object.keys(s.layout).map((id) => s.names?.[id] ?? l.objs[id]?.name ?? '');
	const ana = (s.intro?.anatomy ?? []).flatMap((a) => [a.text, a.note ?? '']);
	return [...s.paras, ...names, ...ana].filter(Boolean);
}

const sentences = (d: string) => d.split(/(?<=[。！？])/).filter((x) => x.trim());

export function checkV3(
	l: V3Lesson,
	dict: readonly Term[],
	jargon: readonly string[],
	add: Add3
): void {
	const byId = new Map(dict.map((t) => [t.id, t]));
	const mine = l.terms.map((id) => byId.get(id)).filter((t): t is Term => !!t);
	for (const id of l.terms) if (!byId.has(id)) add(42, 'terms', `言葉「${id}」が分野の一覧に無い`);
	const where = (i: number) => `ステップ ${i + 1}`;
	const texts = l.steps.map((s) => stepTexts(l, s));

	// 41：専門語の辞書の言葉が、このレッスンの言葉で説明されている
	const covered = (w: string) => mine.some((t) => t.m.some((m) => m === w || m.includes(w)));
	const extra = [...(l.metrics ?? []).map((m) => m.label), ...(l.knobs ?? []).map((k) => k.label)];
	texts.forEach((tx, i) => {
		for (const w of jargon)
			if (tx.some((x) => hasWord(x, w)) && !covered(w))
				add(41, where(i), `専門語「${w}」が言葉の一覧に無い`);
	});
	for (const w of jargon)
		if (extra.some((x) => hasWord(x, w)) && !covered(w))
			add(41, 'metrics・knobs', `専門語「${w}」が言葉の一覧に無い`);

	// 42：初めて出る言葉（計算）と、書いた物が合う。一覧の言葉は、どこかのステップに出る
	const firsts = firstPerStep(texts, mine);
	const firstAt = new Map<string, number>();
	firsts.forEach((ids, i) => ids.forEach((id) => firstAt.set(id, i)));
	l.steps.forEach((s, i) => {
		const want = [...firsts[i]].sort().join(',');
		const got = [...s.first].sort().join(',');
		if (want !== got)
			add(42, where(i), `初めて出る言葉が計算（${firsts[i].join('・') || '無し'}）と違う`);
	});
	for (const id of l.terms)
		if (!firstAt.has(id)) add(42, 'terms', `言葉「${id}」がどのステップにも出ない`);

	// 43：説明は 1〜2 文・80 字以内。自分を使わない。それより後で初めて出る専門語を使わない
	for (const t of mine) {
		const n = sentences(t.d).length;
		if (t.d.length > 80 || n < 1 || n > 2)
			add(43, `言葉「${t.id}」`, `説明が ${t.d.length} 字・${n} 文。80 字以内・1〜2 文にする`);
		if (t.m.some((m) => hasWord(t.d, m))) add(43, `言葉「${t.id}」`, '説明に自分自身を使っている');
		const at = firstAt.get(t.id) ?? Infinity;
		for (const p of markTerms(t.d, mine))
			if (p.term && p.term !== t.id && (firstAt.get(p.term) ?? Infinity) > at)
				add(43, `言葉「${t.id}」`, `説明に、まだ出ていない言葉「${p.text}」を使っている`);
	}

	// 44：最初は言葉をそろえるステップ
	const s0 = l.steps[0];
	if (!s0 || s0.kind !== 'intro' || !s0.intro)
		add(44, where(0), "最初のステップを kind: 'intro'（言葉をそろえる）にする");
	else {
		const it = s0.intro;
		if (it.terms.length < 10 || it.terms.length > 16)
			add(44, where(0), `intro.terms が ${it.terms.length} 語。10〜16 語にする`);
		if (it.anatomy.length < 2 || it.anatomy.length > 6)
			add(44, where(0), `式の分解が ${it.anatomy.length} 部分。2〜6 部分にする`);
		for (const a of it.anatomy)
			if (!a.note?.trim() || !a.term || !byId.has(a.term))
				add(44, where(0), `式の分解「${a.text}」に意味の札と言葉の ID を付ける`);
		if (!it.analogy.trim()) add(44, where(0), 'たとえ話の囲みを 1 つ置く');
	}

	// 45：problem の言葉は、intro の言葉か、そのステップの初出にある
	const s1 = l.steps[1];
	if (s1 && s0?.intro) {
		const ok = new Set([...s0.intro.terms, ...s1.first]);
		for (const tx of s1.paras)
			for (const p of markTerms(tx, mine))
				if (p.term && !ok.has(p.term) && (firstAt.get(p.term) ?? 0) >= 1)
					add(45, where(1), `言葉「${p.term}」が intro にも初出にも無い`);
	}

	// 46：図の物は全て吹き出しの言葉を持つ
	const used = new Set(l.steps.flatMap((s) => Object.keys(s.layout)));
	for (const id of used) {
		const o = l.objs[id];
		if (!o) add(46, 'objs', `構図の物「${id}」が objs に無い`);
		else if (!o.term || !byId.has(o.term)) add(46, 'objs', `物「${id}」に吹き出しの言葉が無い`);
	}

	// 47：指標・つまみ・命令の見本に説明
	const has = (x: { term?: string; desc?: string }) =>
		(!!x.term && byId.has(x.term)) || !!x.desc?.trim();
	for (const m of l.metrics ?? [])
		if (!has(m)) add(47, 'metrics', `指標「${m.label}」に吹き出しの説明が無い`);
	for (const k of l.knobs ?? [])
		if (!has(k)) add(47, 'knobs', `つまみ「${k.label}」に吹き出しの説明が無い`);
	for (const c of l.commands ?? [])
		if (!has(c)) add(47, 'commands', `命令の見本「${c.cmd}」に吹き出しの説明が無い`);

	// 48：物は 3〜6 個（intro は 3〜5、summary は 8 まで）。枠の中。重ならない
	l.steps.forEach((s, i) => {
		const ids = Object.keys(s.layout);
		const max = s.kind === 'summary' ? 8 : s.kind === 'intro' ? 5 : 6;
		if (ids.length < 3 || ids.length > max)
			add(48, where(i), `図の物が ${ids.length} 個。3〜${max} 個にする`);
		const at = ids.map((id) => {
			const [x, y, sc = 1] = s.layout[id];
			const k = l.objs[id]?.kind;
			return { id, x, y, r: k ? REACH[k] * sc : 0, hold: !!k && HOLDERS.has(k) };
		});
		for (const a of at)
			if (a.x < 0 || a.x > VIEW.w || a.y < 0 || a.y > VIEW.h)
				add(48, where(i), `物「${a.id}」が 1000×600 の外（${a.x}, ${a.y}）`);
		for (let p = 0; p < at.length; p++)
			for (let q = p + 1; q < at.length; q++) {
				const a = at[p];
				const b = at[q];
				if (a.hold || b.hold) continue;
				if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r)
					add(48, where(i), `物「${a.id}」と「${b.id}」の外枠が重なる`);
			}
	});
}
