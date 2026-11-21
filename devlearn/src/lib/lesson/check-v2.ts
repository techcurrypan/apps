// 検査 26〜40（第 2 版。docs/explanation-standard.md 2.3・第 3 章）。v2-scope.ts の表にあるレッスンだけに当てる。
// 検査 39 の「名前がソースにある」は scripts/impl-verify.ts（npm run impl:verify）が確かめる。ここは形だけを見る。
// 検査 40（TCP の 15 項目）は src/lib/content/depth-map.test.ts が確かめる。
import { charCount, sentences } from './check.ts';
import { lessonHash } from './hash.ts';
import type { Cue, Lesson, Step, StepKind } from './types.ts';

type Add = (check: number, where: string, message: string) => void;

export type Review = { date: string; hash: string; items: string[] };
export type V2Options = {
	/** docs/content-sources.md の「一次情報」の表にある URL */
	sources?: ReadonlySet<string>;
	/** 専門家の査読の記録（src/lib/content/reviews/<id>.json） */
	reviews?: Readonly<Record<string, Review>>;
	/** 実戦の解き方（pass：合格まで、alt：もう 1 つの正しい道） */
	solutions?: Readonly<Record<string, { pass: unknown; wrong: unknown; alt?: unknown }>>;
};

const NEED: [StepKind, number][] = [
	['problem', 1],
	['mechanism', 2],
	['internals', 1],
	['fail', 2],
	['fix', 1],
	['tradeoff', 1],
	['realworld', 1],
	['ops', 1],
	['teach', 1]
];
const PRIMARY = new Set(['rfc', 'spec', 'doc', 'man', 'paper', 'source']);
// 数と単位（検査 28）。「3 個」「4380 B」「60 ms」「1%」「2 倍」など
const UNIT = new RegExp(
	'\\d[\\d,.]*\\s*(?:ns|\\u00b5s|us|ms|s\\b|秒|分|時間|日|週|B\\b|KB|KiB|MB|MiB|GB|GiB|TB|bit|ビット|バイト|bps|Kbps|Mbps|Gbps|pps|%|％|回|個|本|件|台|行|倍|段|層|つ|人|字|文字|問|項目|番|号|桁|byte|bytes|packets|segments|Hz|GHz|ドル|円|コア|core|vCPU|MSS|RTT|ステップ|ノード|Pod|レプリカ|世代|年|か月|ページ|MTU)',
	'g'
);
const VAGUE = /速い|遅い|重い|多い|少ない|大きい|小さい/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const where = (s: Step, i: number) => `ステップ ${Number.isInteger(s.n) ? s.n : i + 1}`;
const total = (ps: readonly string[]) => ps.reduce((a, p) => a + charCount(p), 0);
const num = (v: string): number | null => {
	const m = /-?\d[\d,]*(?:\.\d+)?/.exec(v);
	return m ? Number(m[0].replace(/,/g, '')) : null;
};

/** 合図が触る図の物の id（camera・appear・link・packet・badge・pulse・vanish・fail） */
function cueIds(c: Cue): string[] {
	const d = c.do;
	switch (d.op) {
		case 'camera':
			return d.fit;
		case 'appear':
		case 'badge':
		case 'pulse':
		case 'vanish':
		case 'fail':
			return [d.id];
		case 'link':
		case 'packet':
			return [d.a, d.b];
		default:
			return [];
	}
}

export function checkV2(l: Lesson, add: Add, opt: V2Options = {}): void {
	const steps = l.explain;
	// 26
	if (steps.length < 10 || steps.length > 16)
		add(26, 'explain', `解説が ${steps.length} ステップ。第 2 版は 10〜16 にする`);
	const kinds = steps.map((s) => s.kind);
	for (const [k, n] of NEED) {
		const c = kinds.filter((x) => x === k).length;
		if (c < n) add(26, 'explain', `種類「${k}」が ${c} つ。${n} つ以上にする`);
	}
	if (kinds.filter((k) => k === 'summary').length !== 1)
		add(26, 'explain', '種類「summary」をちょうど 1 つにする');
	if (kinds[0] !== 'problem') add(26, 'explain', '最初のステップを problem にする');
	if (kinds.at(-1) !== 'summary') add(26, 'explain', '最後のステップを summary にする');

	const nodeIds = new Set(Object.keys(l.map?.nodes ?? {}));
	const sourceIds = new Map((l.sources ?? []).map((s) => [s.id, s]));

	steps.forEach((s, i) => {
		const w = where(s, i);
		// 27
		const d = s.depth;
		if (!d) add(27, w, 'depth（詳しさ 3 段の本文）が無い');
		else {
			const rng = (
				name: string,
				ps: string[],
				pmin: number,
				pmax: number,
				cmin: number,
				cmax: number
			) => {
				if (ps.length < pmin || ps.length > pmax)
					add(27, w, `${name} が ${ps.length} 段落。${pmin}〜${pmax} にする`);
				const c = total(ps);
				if (c < cmin || c > cmax) add(27, w, `${name} が ${c} 字。${cmin}〜${cmax} にする`);
			};
			rng('intro', d.intro, 1, 3, 120, 260);
			rng('work', d.work, 2, 4, 200, 450);
			rng('deep', d.deep, 2, 5, total(d.work) + 150, 100000);
			for (const p of [...d.intro, ...d.work, ...d.deep]) {
				const ss = sentences([p]);
				if (ss.length < 1 || ss.length > 4)
					add(27, w, `段落が ${ss.length} 文。1〜4 文にする：${p.slice(0, 20)}…`);
				for (const x of ss)
					if (charCount(x) > 80)
						add(27, w, `${charCount(x)} 字の文。80 字以内にする：${x.slice(0, 24)}…`);
			}
		}
		if (!s.refs || s.refs.length === 0) add(27, w, 'refs（数と仕様の出典）が無い');
		// 28
		const factText = s.facts.map((f) => f.v).join(' ');
		const valueCount =
			(factText.match(UNIT) ?? []).length + ((d?.work ?? []).join('').match(UNIT) ?? []).length;
		if (valueCount < 2) add(28, w, `具体値（数と単位）が ${valueCount} つ。2 つ以上にする`);
		for (const x of sentences([...(d?.intro ?? []), ...(d?.work ?? []), ...(d?.deep ?? [])]))
			if (VAGUE.test(x) && !/\d/.test(x)) add(28, w, `数の無い言い回し：${x.slice(0, 30)}`);
		// 29
		const mo = s.motion ?? [];
		if (mo.length < 4) add(29, w, `motion が ${mo.length} つ。4 つ以上にする`);
		if (mo[0]?.do.op !== 'camera') add(29, w, '最初の合図を camera にする');
		const paras = d?.work.length ?? 0;
		for (let p = 0; p < paras; p++)
			if (!mo.some((c) => c.para === p)) add(29, w, `段落 ${p + 1} に結び付く合図が無い`);
		const byAt = new Map<number, number>();
		for (const c of mo) byAt.set(c.at, (byAt.get(c.at) ?? 0) + 1);
		for (const [at, n] of byAt)
			if (n >= 3) add(29, w, `${at}ms に合図が ${n} つ重なる。2 つまでにする`);
		const known = new Set(nodeIds);
		for (const ly of s.layers ?? [])
			for (const b of ly.boxes) {
				known.add(b.id);
				for (const q of b.queues ?? []) known.add(q.id);
			}
		const loops = Array.isArray(s.loop) ? s.loop : [];
		for (const c of [...mo, ...loops])
			for (const id of cueIds(c))
				if (!known.has(id)) add(29, w, `合図の「${id}」が図（map・layers）に無い`);
		// 30
		if (s.loop === undefined) add(30, w, 'loop が無い。続く流れを書くか、none と理由を書く');
		if (s.loop === 'none' && !s.loopReason?.trim())
			add(30, w, "loop が 'none' なのに理由（loopReason）が無い");
		if (s.kind === 'fail') {
			const breaks = [...mo, ...loops].some(
				(c) =>
					(c.do.op === 'packet' && (c.do.drop || c.do.stall)) ||
					c.do.op === 'fail' ||
					(c.do.op === 'badge' && c.do.tone === 'bad')
			);
			if (!breaks) add(30, w, '失敗のステップに壊れる合図（drop・stall・fail・bad）が無い');
			if (!s.inside?.logs?.length)
				add(30, w, '失敗のステップに失敗のログの行（inside.logs）が無い');
		}
		// 31
		if (!s.short || charCount(s.short) > 8) add(31, w, 'short を 1〜8 字にする');
		if (!s.callout || !s.callout.text.trim() || charCount(s.callout.text) > 120)
			add(31, w, 'callout を 1 つ（120 字以内）置く');
		const ch = s.changes ?? [];
		if (ch.length < 2 || ch.length > 4) add(31, w, `changes が ${ch.length} 行。2〜4 行にする`);
		for (const c of ch)
			if (charCount(c.text) > 40) add(31, w, `changes の行が 40 字を超える：${c.text}`);
		if (s.board && (s.board.length < 3 || s.board.length > 5))
			add(31, w, `board が ${s.board.length} 行。3〜5 行にする`);
		for (const id of Object.keys(s.badges ?? {}))
			if (!known.has(id)) add(31, w, `badges の「${id}」が図に無い`);
		// 32
		const ms = l.metrics ?? [];
		const mv = s.metrics ?? {};
		for (const k of Object.keys(mv))
			if (!ms.some((m) => m.key === k)) add(32, w, `指標「${k}」が Lesson.metrics に無い`);
		if (ms.some((m) => m.key === 'total') && mv.total !== undefined) {
			const parts = ms.filter((m) => m.sum).map((m) => num(mv[m.key] ?? '0') ?? 0);
			const sum = parts.reduce((a, b) => a + b, 0);
			const t = num(mv.total);
			if (t === null || Math.abs(t - sum) > 1e-6)
				add(32, w, `合計 ${mv.total} が各段の和 ${sum} と合わない`);
		}
		// 指標ごとに、時刻の一番遅い数え上げがステップの値と合うこと（途中の値を段ごとに数えるのはよい）
		const lastCount = new Map<string, Extract<Cue['do'], { op: 'count' }>>();
		for (const c of [...mo].sort((x, y) => x.at - y.at))
			if (c.do.op === 'count') lastCount.set(c.do.metric, c.do);
		for (const d of lastCount.values())
			if (mv[d.metric] !== undefined && mv[d.metric] !== d.to)
				add(
					32,
					w,
					`最後の数え上げ「${d.metric}」の行き先 ${d.to} が、ステップの値 ${mv[d.metric]} と違う`
				);
		// 34（refs）
		for (const r of s.refs ?? [])
			if (!sourceIds.has(r)) add(34, w, `refs の「${r}」が sources に無い`);
		// 39
		const deepTier = (l.tier ?? 0) >= 3;
		if (deepTier && s.kind === 'internals') {
			if ((s.impl ?? []).length < 3)
				add(39, w, `impl が ${(s.impl ?? []).length} つ。3 つ以上にする`);
			if (!s.layers?.length) add(39, w, 'layers（層の図）が無い');
		}
		const implNames = new Set((s.impl ?? []).map((x) => x.name));
		for (const x of s.impl ?? []) {
			const src = sourceIds.get(x.ref);
			if (!src || src.kind !== 'source')
				add(39, w, `impl「${x.name}」の出典が kind: 'source' でない`);
			else if (!src.url.includes(`/${x.version}/`))
				add(39, w, `impl「${x.name}」の出典の URL に版 ${x.version} の tag が無い`);
		}
		const queues = new Set<string>();
		for (const ly of s.layers ?? [])
			for (const b of ly.boxes) {
				if (!implNames.has(b.impl)) add(39, w, `層の箱「${b.impl}」が同じステップの impl に無い`);
				for (const q of b.queues ?? []) queues.add(q.id);
			}
		for (const c of [...mo, ...loops]) {
			const q = c.do;
			if ((q.op === 'enqueue' || q.op === 'dequeue' || q.op === 'peek') && !queues.has(q.queue))
				add(39, w, `キューの合図の「${q.queue}」が layers に無い`);
			if (q.op === 'move' && (!queues.has(q.from) || !queues.has(q.to)))
				add(39, w, `移る合図の「${q.from} → ${q.to}」が layers のキューに無い`);
		}
	});

	// 33
	const learn = l.learn ?? [];
	if (learn.length < 4 || learn.length > 7)
		add(33, 'learn', `学べることが ${learn.length} 項目。4〜7 にする`);
	learn.forEach((t, i) => {
		if (charCount(t) > 40) add(33, 'learn', `学べること ${i + 1} が 40 字を超える`);
		if (!steps.some((s) => s.learns?.includes(i)))
			add(33, 'learn', `学べること ${i + 1} に ✓ を付けるステップが無い`);
	});
	// 34
	const srcs = l.sources ?? [];
	const prim = srcs.filter((s) => PRIMARY.has(s.kind));
	if (prim.length < 3) add(34, 'sources', `一次情報が ${prim.length} 件。3 件以上にする`);
	for (const s of srcs) {
		if (!DATE.test(s.checked)) add(34, 'sources', `「${s.id}」の checked が日付でない`);
		if (opt.sources && !opt.sources.has(s.url))
			add(
				34,
				'sources',
				`「${s.id}」の URL が docs/content-sources.md の一次情報の表に無い：${s.url}`
			);
	}
	// 35
	const t = l.teach;
	if (!t || t.myths.length < 3) add(35, 'teach', '誤解と正しい言い方を 3 つ以上にする');
	if (!t || !t.oneMinute.trim() || charCount(t.oneMinute) > 300)
		add(35, 'teach', '1 分の文を 1〜300 字にする');
	if (!t || t.questions.length < 2) add(35, 'teach', '後輩に出す問いを 2 つ以上にする');
	// 36
	const mk = l.practice.mistakes.length;
	if (mk < 3 || mk > 6) add(36, 'practice.mistakes', `${mk} 件。第 2 版は 3〜6 件にする`);
	if (l.practice.tool) {
		const sol = opt.solutions?.[l.id];
		const pass = Array.isArray(sol?.pass) ? sol.pass : [];
		const alt = Array.isArray(sol?.alt) ? sol.alt : [];
		if (pass.length < 5)
			add(36, 'practice', `解き方の命令が ${pass.length} つ。5 つ以上を要する場面にする`);
		if (alt.length === 0)
			add(36, 'practice', '正しい道が 1 つしか無い。もう 1 つの道（alt）を書く');
	}
	// 37
	const ck = l.check;
	if (ck.length < 6) add(37, 'check', `思い出すが ${ck.length} 問。6 問以上にする`);
	if (ck.filter((c) => c.kind === 'scene').length < 2)
		add(37, 'check', '場面の問いを 2 問以上にする');
	if (ck.filter((c) => c.kind === 'number').length < 1)
		add(37, 'check', '数の問いを 1 問以上にする');
	// 38
	const rv = opt.reviews?.[l.id];
	if (!rv) add(38, 'review', `専門家の査読の記録（src/lib/content/reviews/${l.id}.json）が無い`);
	else {
		if (rv.items.length < 12 || rv.items.some((x) => x !== '合格'))
			add(38, 'review', '査読の 12 項目が全て「合格」になっていない');
		if (rv.hash !== lessonHash(l))
			add(38, 'review', '査読の後に本文が変わった。もう一度査読させる');
	}
}
