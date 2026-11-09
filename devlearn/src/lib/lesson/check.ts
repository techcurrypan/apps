// 説明の中身の検査。docs/explanation-standard.md 第 3 章の 15 項目。
// 1 件でも Problem を返したら、content:check は失敗で終わる。
import type { Lesson, SceneOp, Step } from './types.ts';

export type Problem = {
	lessonId: string;
	check: number; // 第 3 章の番号 1〜15
	where: string; // どこで落ちたか（「ステップ 2」など）
	message: string; // 何が駄目か
};

// 第 4 章の禁止語。「〜するだけ」は「するだけ」で探す。
export const FORBIDDEN_WORDS = [
	'簡単',
	'するだけ',
	'ご存じのとおり',
	'しっかり',
	'とても重要'
] as const;

const LIMIT = {
	lessonTitle: 40,
	stepTitle: 20,
	lead: 40,
	goal: 60,
	sentence: 60,
	logInfo: 60
} as const;

const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });

// 見た目の 1 字を 1 と数える（サロゲート対や結合文字も 1 字）。
export function charCount(s: string): number {
	return Array.from(segmenter.segment(s)).length;
}

const OPEN = new Set(['「', '『', '（', '(']);
const CLOSE = new Set(['」', '』', '）', ')']);
const END = new Set(['。', '！', '？']);

// 終わりの記号だけの切れ端は前の文に付ける（「本当？！」を 1 文と数える）
function push(out: string[], piece: string): void {
	const t = piece.trim();
	if (t === '') return;
	if (out.length > 0 && [...t].every((c) => END.has(c))) out[out.length - 1] += t;
	else out.push(t);
}

// 文に分ける。全角の句点・感嘆符・疑問符で切る。半角の ? や ! はコードの中に
// 現れるので切らない。括弧の中の句点でも切らない。
export function sentences(body: readonly string[]): string[] {
	const out: string[] = [];
	for (const part of body) {
		let depth = 0;
		let cur = '';
		for (const ch of part) {
			cur += ch;
			if (OPEN.has(ch)) depth++;
			else if (CLOSE.has(ch)) depth = Math.max(0, depth - 1);
			else if (END.has(ch) && depth === 0) {
				push(out, cur);
				cur = '';
			}
		}
		push(out, cur);
	}
	return out;
}

const blank = (s: unknown): boolean => typeof s !== 'string' || s.trim() === '';

// 表記の揺れを寄せてから禁止語を探す（「ご存知の通り」→「ご存じのとおり」）。
function normalize(s: string): string {
	return s.replace(/存知/g, '存じ').replace(/通り/g, 'とおり');
}

function strings(v: unknown, out: string[] = []): string[] {
	if (typeof v === 'string') out.push(v);
	else if (Array.isArray(v)) for (const x of v) strings(x, out);
	else if (v !== null && typeof v === 'object') for (const x of Object.values(v)) strings(x, out);
	return out;
}

const STATE_OPS: ReadonlySet<SceneOp['op']> = new Set(['appear', 'move', 'change', 'vanish']);

function opIds(op: SceneOp): string[] {
	return op.op === 'move' ? [op.from, op.to] : [op.id];
}

const stepWhere = (s: Step, i: number) => `ステップ ${Number.isInteger(s.n) ? s.n : i + 1}`;

export function checkLesson(lesson: Lesson, known: ReadonlySet<string>): Problem[] {
	const problems: Problem[] = [];
	const add = (check: number, where: string, message: string) =>
		problems.push({ lessonId: lesson.id, check, where, message });
	const steps: Step[] = Array.isArray(lesson.explain) ? lesson.explain : [];

	// 1
	if (steps.length < 5 || steps.length > 9)
		add(1, 'explain', `解説が ${steps.length} ステップ。5〜9 にする`);
	steps.forEach((s, i) => {
		if (s.n !== i + 1) add(1, `ステップ ${i + 1}`, `n が ${s.n}。1 からの連番にする`);
	});

	steps.forEach((s, i) => {
		const w = stepWhere(s, i);
		// 2
		const facts = Array.isArray(s.facts) ? s.facts : [];
		if (facts.length === 0) add(2, w, 'facts が無い。具体値を 1 件以上置く');
		for (const f of facts) if (blank(f.k) || blank(f.v)) add(2, w, 'facts に空の欄がある');
		// 3
		if (!Array.isArray(s.scene) || s.scene.length === 0)
			add(3, w, 'scene が無い。図の変化を 1 件以上置く');
		// 4
		const log: unknown = s.log;
		if (log === null || typeof log !== 'object') {
			add(4, w, 'log が無い');
		} else {
			const r = s.log;
			for (const k of ['t', 'from', 'to', 'kind', 'info'] as const)
				if (blank(r[k])) add(4, w, `log.${k} が空`);
			if (typeof r.info === 'string' && charCount(r.info) > LIMIT.logInfo)
				add(4, w, `log.info が ${charCount(r.info)} 字。${LIMIT.logInfo} 字以内にする`);
		}
		// 5
		const ss = sentences(Array.isArray(s.body) ? s.body : []);
		if (ss.length < 2 || ss.length > 4) add(5, w, `body が ${ss.length} 文。2〜4 文にする`);
		for (const x of ss)
			if (charCount(x) > LIMIT.sentence)
				add(5, w, `${charCount(x)} 字の文がある。${LIMIT.sentence} 字以内にする：${x}`);
		// 6
		if (charCount(s.title ?? '') > LIMIT.stepTitle)
			add(6, w, `title が ${charCount(s.title)} 字。${LIMIT.stepTitle} 字以内にする`);
		if (charCount(s.lead ?? '') > LIMIT.lead)
			add(6, w, `lead が ${charCount(s.lead)} 字。${LIMIT.lead} 字以内にする`);
		if (blank(s.title) || blank(s.lead)) add(6, w, 'title か lead が空');
		// 14
		if (Array.isArray(s.scene) && !s.scene.some((op) => STATE_OPS.has(op.op)))
			add(14, w, '状態を変える操作（appear / move / change / vanish）が無い');
	});

	// 6
	if (charCount(lesson.title ?? '') > LIMIT.lessonTitle || blank(lesson.title))
		add(6, 'title', `レッスンの title は 1〜${LIMIT.lessonTitle} 字にする`);
	if (charCount(lesson.goal ?? '') > LIMIT.goal)
		add(6, 'goal', `goal が ${charCount(lesson.goal)} 字。${LIMIT.goal} 字以内にする`);
	// 7
	if (typeof lesson.goal !== 'string' || !lesson.goal.endsWith('できる'))
		add(7, 'goal', 'goal を「できる」で終える');
	// 8
	if (!steps.some((s) => !blank(s.why))) add(8, 'explain', 'why が 1 件も無い');
	// 9
	for (const text of strings(lesson)) {
		const t = normalize(text);
		for (const word of FORBIDDEN_WORDS)
			if (t.includes(word)) add(9, '文章', `禁止語「${word}」がある：${text}`);
	}
	// 10
	const live = new Set<string>();
	steps.forEach((s, i) => {
		const w = stepWhere(s, i);
		for (const op of Array.isArray(s.scene) ? s.scene : []) {
			if (op.op === 'appear') {
				if (live.has(op.id)) add(10, w, `「${op.id}」は既に出ている`);
				live.add(op.id);
				continue;
			}
			for (const id of opIds(op))
				if (!live.has(id)) add(10, w, `「${id}」は appear していない（または消えた後）`);
			if (op.op === 'vanish') live.delete(op.id);
		}
	});
	// 11
	const mistakes = Array.isArray(lesson.practice?.mistakes) ? lesson.practice.mistakes : [];
	if (mistakes.length < 2 || mistakes.length > 4)
		add(11, 'practice.mistakes', `${mistakes.length} 件。2〜4 件にする`);
	mistakes.forEach((m, i) => {
		if (blank(m.when) || blank(m.why) || blank(m.next))
			add(11, `practice.mistakes ${i + 1}`, 'when / why / next を全て埋める');
	});
	// 12
	const checks = Array.isArray(lesson.check) ? lesson.check : [];
	if (checks.length < 3 || checks.length > 5)
		add(12, 'check', `${checks.length} 件。3〜5 件にする`);
	checks.forEach((c, i) => {
		if (blank(c.ask) || blank(c.how)) add(12, `check ${i + 1}`, 'ask / how を埋める');
	});
	// 13
	for (const key of ['prereq', 'related', 'next'] as const) {
		for (const id of Array.isArray(lesson[key]) ? lesson[key] : []) {
			if (id === lesson.id) add(13, key, '自分自身を指している');
			else if (!known.has(id)) add(13, key, `「${id}」というレッスンは無い`);
		}
	}
	// 15
	for (let i = 1; i < steps.length; i++) {
		const prev = new Set((steps[i - 1].facts ?? []).map((f) => `${f.k}\u0000${f.v}`));
		for (const f of steps[i].facts ?? [])
			if (prev.has(`${f.k}\u0000${f.v}`))
				add(15, stepWhere(steps[i], i), `前のステップと同じ facts「${f.k}: ${f.v}」がある`);
	}

	return problems;
}

export function checkAll(lessons: readonly Lesson[]): Problem[] {
	const known = new Set(lessons.map((l) => l.id));
	const problems: Problem[] = [];
	const seen = new Set<string>();
	for (const l of lessons) {
		if (seen.has(l.id))
			problems.push({ lessonId: l.id, check: 13, where: 'id', message: 'ID が重複している' });
		seen.add(l.id);
		problems.push(...checkLesson(l, known));
	}
	return problems;
}
