// 学習画面 第 3 版の測り（learn-standard.md 第 16〜18・20・21 章）。look-learn.ts の --scene・--loop・--hover・--terms・--perf が使う。
// 判定は純粋な関数（単体テスト learn3-measure.test.ts）。頁の中で読む物は、試作 learn11 と本番で同じ窓口 window.__l3 を通す。
// 試作には窓口が無いので、PROTO_SHIM で試作の window.__s と SCN から作る（試作のファイルは書き換えない）。

export type Box = { x: number; y: number; w: number; h: number };
export type Res = Record<string, true | string>;

/** 見せ方の型（learn-standard.md 14.1）。物の数と幅の線は型で変わる */
export type ViewType = 'stack' | 'cluster' | 'memory' | 'chart' | string;
/** 型ごとの線。試作 learn11（下限）の同じ型で測った一番小さい値を下回らない（decisions.md「自分で決めたこと」） */
export const RULE: Record<string, { min: number; max: number; width: number; gap: number }> = {
	stack: { min: 3, max: 6, width: 150, gap: 0.05 },
	cluster: { min: 3, max: 6, width: 90, gap: 0.05 },
	memory: { min: 1, max: 6, width: 150, gap: 0 },
	chart: { min: 1, max: 6, width: 150, gap: 0 }
};

export type SceneSnap = {
	type?: ViewType;
	step: number;
	kind: string;
	last: boolean;
	stage: Box;
	objs: { id: string; box: Box }[];
	texts: { s: string; box: Box; px: number; owner: string | null }[];
};

const EPS = 2; // 画面の px の丸め
function overlap(a: Box, b: Box): boolean {
	return (
		Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > EPS &&
		Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > EPS
	);
}
/** 2 つの物の隙間。中心を結ぶ向きで、物の外形を外枠に内接する楕円と見て測る（等角の物は斜めに並ぶので、外枠の四角の隙間では狭く出る） */
export function sep(a: Box, b: Box): number {
	const ax = a.x + a.w / 2,
		ay = a.y + a.h / 2,
		bx = b.x + b.w / 2,
		by = b.y + b.h / 2;
	const d = Math.hypot(bx - ax, by - ay);
	if (d === 0) return -Math.min(a.w, b.w);
	const ux = (bx - ax) / d,
		uy = (by - ay) / d;
	const ext = (r: Box) => 1 / Math.sqrt((ux / (r.w / 2)) ** 2 + (uy / (r.h / 2)) ** 2);
	return d - ext(a) - ext(b);
}
/** 物の上の記号（ƒ・?・✓・⇉ など 1〜2 字の印）。札の字ではない */
const glyph = (s: string) => /^[^A-Za-z0-9぀-ヿ一-鿿]{1,2}$/u.test(s);
const r1 = (v: number) => Math.round(v * 10) / 10;

/** LS3-S1・S3・S4、16.3（字の大きさ）、はみ出し 0 */
export function judgeScene(s: SceneSnap): Res {
	const n = s.objs.length;
	const rule = RULE[s.type ?? 'stack'] ?? RULE.stack;
	const max = s.last ? 8 : rule.max;
	const out: Res = {};
	out.S1 = n >= rule.min && n <= max ? true : `物 ${n} 個（${rule.min}〜${max}）`;
	const minW = n > 6 ? Math.min(110, rule.width) : rule.width;
	const bad: string[] = [];
	for (const o of s.objs) if (o.box.w < minW) bad.push(`${o.id} 幅 ${r1(o.box.w)}`);
	for (let i = 0; i < n; i++)
		for (let j = i + 1; j < n; j++) {
			const a = s.objs[i];
			const b = s.objs[j];
			// 試作 learn11（下限）の一番近い組は物の幅の 0.08 倍（tcp の 2 番目）。0.05 倍を線にする（decisions.md「自分で決めたこと」）
			const need = rule.gap * Math.min(a.box.w, b.box.w);
			const d = sep(a.box, b.box);
			if (d < need - EPS) bad.push(`${a.id}-${b.id} 間 ${r1(d)} < ${r1(need)}`);
		}
	out.S3 = bad.length ? bad.slice(0, 4).join('・') : true;
	const clash: string[] = [];
	// 重なりを数える札：名前の札（13px 以上・記号 1 字を除く）。線の上を飛ぶ荷物の名前（12〜13px）は通り過ぎるので数えない
	const names = s.texts.filter((t) => t.px >= 13 && !glyph(t.s));
	for (let i = 0; i < names.length; i++) {
		const t = names[i];
		for (let j = i + 1; j < names.length; j++) {
			const u = names[j];
			if (t.owner !== null && t.owner === u.owner) continue;
			if (overlap(t.box, u.box)) clash.push(`「${t.s}」と「${u.s}」`);
		}
		for (const o of s.objs)
			if (o.id !== t.owner && t.owner !== null && overlap(t.box, o.box))
				clash.push(`「${t.s}」と ${o.id}`);
	}
	for (let i = 0; i < n; i++)
		for (let j = i + 1; j < n; j++)
			if (overlap(s.objs[i].box, s.objs[j].box)) clash.push(`${s.objs[i].id} と ${s.objs[j].id}`);
	out.S4 = clash.length ? clash.slice(0, 4).join('・') : true;
	const font: string[] = [];
	for (const t of s.texts) {
		if (glyph(t.s)) continue;
		if (t.px < 12 - 0.25) font.push(`「${t.s}」${r1(t.px)}px`);
	}
	out.字 = font.length ? font.slice(0, 4).join('・') : true;
	const st = s.stage;
	const outs = [...s.objs.map((o) => ({ s: o.id, box: o.box })), ...s.texts].filter(
		(o) =>
			o.box.x < st.x - EPS ||
			o.box.y < st.y - EPS ||
			o.box.x + o.box.w > st.x + st.w + EPS ||
			o.box.y + o.box.h > st.y + st.h + EPS
	);
	out.はみ出し = outs.length
		? outs
				.slice(0, 4)
				.map((o) => o.s)
				.join('・')
		: true;
	return out;
}

export type LoopSnap = {
	diffs: number[]; // 30 秒・1 秒ごとの、続く 2 枚の差（0〜1）
	tBefore: number; // 一時停止の直後のステップの時刻
	tAfter: number; // 3 秒後
	pausedDiff: number; // 一時停止の間の 2 枚の差（線の点だけが動く）
	looped: boolean; // 30 秒の間に、ステップの時刻が最初に戻った
};
/** LS3-M1（繰り返し・止まらない）・M2（線の点）・一時停止で止まる */
export function judgeLoop(s: LoopSnap): Res {
	const moving = s.diffs.filter((d) => d >= 0.002).length;
	const need = Math.ceil(s.diffs.length * 0.9);
	const out: Res = {};
	out.M1 =
		s.diffs.length >= 25 && moving >= need && s.looped
			? true
			: `動いた ${moving}/${s.diffs.length}${s.looped ? '' : '・最初に戻らない'}`;
	out.止める =
		Math.abs(s.tAfter - s.tBefore) < 50
			? true
			: `止めても時刻が ${Math.round(s.tAfter - s.tBefore)} ms 進む`;
	out.M2 = s.pausedDiff > 0 ? true : '止めた間に線の点が流れない';
	return out;
}

export type HoverHit = {
	kind: 'obj' | 'step' | 'mode' | 'metric' | 'term' | 'knob' | 'cmd';
	id: string;
	tip: string;
	lift: number;
};
/** LS3-M4・H1〜H5。種類ごとに、乗せた全てに説明が出たか */
export function judgeHover(hits: HoverHit[]): Res {
	const of = (k: HoverHit['kind']) => hits.filter((h) => h.kind === k);
	const tips = (k: HoverHit['kind'], label: string): true | string => {
		const hs = of(k);
		if (!hs.length) return `${label}を測れない`;
		const no = hs.filter((h) => !h.tip.trim());
		return no.length
			? `説明が無い ${no.length}/${hs.length}（${no
					.slice(0, 3)
					.map((h) => h.id)
					.join('・')}）`
			: true;
	};
	const out: Res = {};
	out.H1 = tips('obj', '図の物');
	const objs = of('obj');
	const flat = objs.filter((h) => h.lift < 3);
	out.M4 = !objs.length
		? '図の物を測れない'
		: flat.length
			? `浮かない ${flat.length}/${objs.length}`
			: true;
	out.H2 = tips('step', 'ステップの番号');
	out.H3 = tips('mode', '使い方の釦');
	const h4 = [...of('metric'), ...of('term')];
	out.H4 =
		!of('metric').length || !of('term').length
			? '指標か本文の言葉を測れない'
			: h4.some((h) => !h.tip.trim())
				? `説明が無い ${h4
						.filter((h) => !h.tip.trim())
						.map((h) => h.id)
						.slice(0, 3)
						.join('・')}`
				: true;
	if (of('knob').length || of('cmd').length) {
		const h5 = [...of('knob'), ...of('cmd')];
		const no = h5.filter((h) => !h.tip.trim());
		out.H5 = no.length
			? `説明が無い ${no
					.map((h) => h.id)
					.slice(0, 3)
					.join('・')}`
			: true;
	}
	return out;
}

export type TermsSnap = {
	kind0: string; // 最初のステップの種類の札
	anatomy: number; // 式の分解の部分の数
	objs0: number; // 最初のステップの物の数
	bigTerms: number; // 「この教材で使う言葉」の数
	analogy: boolean; // たとえ話の囲み
	steps: { step: number; fresh: string[]; shown: string[]; marks: number; dupMarks: number }[];
	metrics: number;
	metricTips: number;
};
/** LS3-T1〜T7 */
export function judgeTerms(s: TermsSnap): Res {
	const out: Res = {};
	out.T1 = s.kind0.includes('準備') ? true : `最初の種類「${s.kind0}」`;
	out.T2 = s.anatomy >= 2 && s.anatomy <= 6 ? true : `式の分解 ${s.anatomy} 部分（2〜6）`;
	out.T3 = s.objs0 >= 3 && s.objs0 <= 5 ? true : `最初の物 ${s.objs0} 個（3〜5）`;
	out.T4 =
		s.bigTerms >= 10 && s.bigTerms <= 16 && s.analogy
			? true
			: `言葉 ${s.bigTerms}（10〜16）${s.analogy ? '' : '・たとえ無し'}`;
	const t5: string[] = [];
	const t6: string[] = [];
	const seen = new Set<string>();
	for (const st of s.steps) {
		const shown = new Set(st.shown);
		const missing = st.fresh.filter((k) => !shown.has(k));
		const fresh = new Set(st.fresh);
		const again = st.shown.filter((k) => seen.has(k) || !fresh.has(k));
		if (missing.length) t5.push(`${st.step}：出ない ${missing.join('・')}`);
		if (again.length) t5.push(`${st.step}：前に出た ${again.join('・')}`);
		for (const k of st.shown) seen.add(k);
		if (st.dupMarks) t6.push(`${st.step}：同じ段落に 2 回 ${st.dupMarks}`);
		if (st.fresh.length && !st.marks) t6.push(`${st.step}：下線 0`);
	}
	out.T5 = s.steps.length ? (t5.length ? t5.slice(0, 4).join('・') : true) : 'ステップを測れない';
	out.T6 = t6.length ? t6.slice(0, 4).join('・') : true;
	out.T7 =
		s.metrics > 0 && s.metricTips === s.metrics ? true : `指標の説明 ${s.metricTips}/${s.metrics}`;
	return out;
}

/** 第 20 章：1 コマの計算と描画の平均が 8 ms 以内 */
export function judgePerf(ms: number[]): { ok: boolean; avg: number; p95: number; n: number } {
	if (!ms.length) return { ok: false, avg: 0, p95: 0, n: 0 };
	const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
	const p95 = [...ms].sort((a, b) => a - b)[Math.floor(ms.length * 0.95)] ?? 0;
	return { ok: avg <= 8, avg: r1(avg), p95: r1(p95), n: ms.length };
}

// ---- 頁の中で読む物 ----

/** 試作 learn11 に、本番と同じ窓口 window.__l3 を作る（試作は書き換えない。頁を開いた後に流す） */
export const PROTO_SHIM = `(() => {
	if (window.__l3 || !window.__s) return !!window.__l3;
	const X = window.__s;
	window.__l3 = {
		get steps() { return X.L().steps.length; },
		get step() { return X.S.step; },
		get t() { return X.S.t; },
		get playing() { return X.S.playing; },
		go(i) { X.setMode('watch'); X.go(i); },
		mode(m) { X.setMode({ watch: 'watch', lab: 'lab', try: 'try', recall: 'quiz' }[m] || m); },
		lesson(id) { const i = X.LESSONS.findIndex((l) => l.id === id); if (i >= 0) X.setLesson(i); },
		kindLabel(i) { const b = document.querySelectorAll('#steps button')[i]; return b ? (b.dataset.d || '').split('：')[0] : ''; },
		// 今の図に出ている物：構図の表（SCN）の物と、レッスンが直に描く物（Pod・リスト・板）。外側の g[data-term] のうち、立体の面（polygon・path・ellipse）を 2 つ以上持つ物。札（rect と字だけ）は物ではない
		_els() { const svg = document.querySelector('#svg'); const out = [];
			for (const g of svg.querySelectorAll('g[data-term]')) { if (g.parentElement.closest('g[data-term]')) continue; if (g.querySelectorAll('polygon, path, ellipse').length < 2) continue;
				let op = 1; for (let n = g; n && n !== svg; n = n.parentElement) op *= Number(getComputedStyle(n).opacity); if (op < 0.5) continue;
				const r = g.getBoundingClientRect(); if (r.width < 20) continue; out.push(g); }
			return out; },
		// 型（learn-standard.md 14.1）。試作のレッスンごと
		get type() { return { tcp: 'stack', k8s: 'cluster', mem: 'memory', stat: 'chart' }[X.L().id] || 'stack'; },
		// Pod はノードの台に乗る部材で、主な物ではない（数と幅と重なりは台と係で数える）
		objs() { const seen = {}; return this._els().filter((g) => g.dataset.term !== 'pod').map((g) => { const k = g.dataset.term; seen[k] = (seen[k] || 0) + 1; return seen[k] > 1 ? k + '#' + seen[k] : k; }); },
		objEl(id) { const els = this._els().filter((g) => g.dataset.term !== 'pod'); const ids = this.objs(); const i = ids.indexOf(id); return i >= 0 ? els[i] : null; },
		// 物の外枠：物の下の台（最初の g）と字を除いた、立体の部分
		objBox(id) { const g = this.objEl(id); if (!g) return null; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
			[...g.children].forEach((c, i) => { if ((i === 0 && c.tagName === 'g') || c.tagName === 'text') return; const r = c.getBoundingClientRect(); if (!r.width) return; x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); });
			return x1 > x0 ? { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } : g.getBoundingClientRect(); },
		svg() { return document.querySelector('#svg'); },
		fresh(i) { const l = X.L(); const seen = new Set(); const inn = (st) => st.terms || Object.entries(l.terms || {}).filter(([, v]) => (v.m || [v.t]).some((m) => (st.paras.map((p) => String(p.h).replace(/<[^>]+>/g, '')).join(' ') + ' ' + st.title).includes(m))).map(([k]) => k);
			for (let j = 0; j < i; j++) inn(l.steps[j]).forEach((k) => seen.add(k)); return inn(l.steps[i]).filter((k) => !seen.has(k) && l.terms[k]).map((k) => l.terms[k].t); }
	};
	return true;
})()`;

/** 今の画面の図を読む（SceneSnap の中身。step・kind・last は呼ぶ側で足す） */
export const SNAP_SCENE = `(() => {
	const A = window.__l3; if (!A) return null;
	const svg = A.svg(); if (!svg) return null;
	const sr = svg.getBoundingClientRect();
	const bx = (r) => ({ x: r.x - sr.x, y: r.y - sr.y, w: r.width, h: r.height });
	const vis = (e) => { let op = 1; for (let n = e; n && n !== svg; n = n.parentElement) { const cs = getComputedStyle(n); op *= Number(cs.opacity); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return op >= 0.5; };
	const ids = A.objs();
	const objs = ids.map((id) => { const e = A.objEl(id); return e && vis(e) ? { id, box: bx(A.objBox(id)) } : null; }).filter(Boolean);
	const els = new Map(ids.map((id) => [A.objEl(id), id]));
	const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim() && vis(t)).map((t) => {
		let owner = null; for (let n = t.parentElement; n && n !== svg; n = n.parentElement) if (els.has(n)) { owner = els.get(n); break; }
		const m = t.getScreenCTM(); const px = parseFloat(getComputedStyle(t).fontSize) * (m ? Math.hypot(m.a, m.b) : 1);
		return { s: t.textContent.trim().slice(0, 24), box: bx(t.getBoundingClientRect()), px, owner };
	}).filter((t) => t.box.w > 0);
	return { stage: { x: 0, y: 0, w: sr.width, h: sr.height }, objs, texts };
})()`;

/** 言葉の仕組みを読む（今のステップの右の欄） */
export const SNAP_SIDE = `(() => {
	const side = document.querySelector('#side, [data-l3-side]'); if (!side) return null;
	const box = side.querySelector('.terms'); const big = side.querySelector('.terms.big');
	const shown = box ? [...box.querySelectorAll('dt, .chip')].map((d) => d.textContent.trim()) : [];
	const paras = [...side.querySelectorAll('.para')];
	let marks = 0, dup = 0; for (const p of paras) { const ws = [...p.querySelectorAll('.tw')].map((w) => w.textContent.trim()); marks += ws.length; dup += ws.length - new Set(ws).size; }
	const analogy = [...side.querySelectorAll('.callout, .co, aside, div')].some((e) => /^たとえると/.test(e.textContent.trim()));
	return { shown, big: big ? shown.length : 0, marks, dup, analogy };
})()`;

/** 指標の帯の数と、説明の有る数 */
export const SNAP_METRICS = `(() => {
	const ms = [...document.querySelectorAll('#metrics .met, [data-l3-metrics] [data-metric]')];
	return { n: ms.length, tips: ms.filter((m) => (m.getAttribute('title') || m.dataset.d || m.querySelector('[title],[data-d],[data-tw]'))).length };
})()`;

/** 式の分解の部分の数（暗い札の上の大きな字）。本番は data-anatomy の部分 */
export const SNAP_ANATOMY = `(() => {
	const svg = window.__l3?.svg(); if (!svg) return 0;
	const p = svg.querySelectorAll('[data-anatomy-part]'); if (p.length) return p.length;
	const m = svg.getScreenCTM();
	// 試作：暗い札の上の大きな字のうち、語の部分（「(」「, 」などの記号は部分に数えない）
	return [...svg.querySelectorAll('text')].filter((t) => parseFloat(getComputedStyle(t).fontSize) * (t.getScreenCTM()?.a ?? 1) >= 22 && /[\\w\\u3040-\\u9fff]/u.test(t.textContent)).length;
})()`;

/** 乗せる所の一覧（画面の座標）。物・ステップの番号・使い方の釦・指標・本文の点線の言葉 */
export const HOVER_TARGETS = `(() => {
	const A = window.__l3; const c = (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 30) }; };
	const out = [];
	// 物の見えている所に乗せる（台の上の Pod など、上に重なる物に当たる点は避ける）。中心に近い点から探す
	const own = (e, x, y) => { const h = document.elementFromPoint(x, y); return !!h && h.closest('[data-obj]') === e; };
	for (const id of A.objs()) { const e = A.objEl(id); if (!e) continue; const r = e.getBoundingClientRect();
		let p = { x: r.x + r.width / 2, y: r.y + r.height * 0.45 };
		if (!own(e, p.x, p.y)) { const c = []; for (let i = 1; i < 10; i++) for (let j = 1; j < 10; j++) c.push({ x: r.x + r.width * i / 10, y: r.y + r.height * j / 10 });
			c.sort((u, v) => Math.hypot(u.x - p.x, u.y - p.y) - Math.hypot(v.x - p.x, v.y - p.y)); p = c.find((q) => own(e, q.x, q.y)) || p; }
		out.push({ kind: 'obj', id, x: p.x, y: p.y }); }
	[...document.querySelectorAll('#steps button, [data-l3-steps] button')].slice(0, 3).forEach((b, i) => out.push({ kind: 'step', id: String(i + 1), ...c(b) }));
	[...document.querySelectorAll('#modes button, [data-l3-modes] button')].forEach((b) => out.push({ kind: 'mode', id: b.textContent.trim().slice(0, 8), ...c(b) }));
	[...document.querySelectorAll('#metrics .met, [data-l3-metrics] [data-metric]')].forEach((m) => out.push({ kind: 'metric', id: m.textContent.trim().slice(0, 10), ...c(m) }));
	[...document.querySelectorAll('#side .tw, [data-l3-side] .tw')].slice(0, 4).forEach((w) => out.push({ kind: 'term', id: w.textContent.trim(), ...c(w) }));
	return out;
})()`;

/** 乗せた後に出ている説明を読む（吹き出し・::after・title・data-d） */
export const READ_TIP = (x: number, y: number) => `(() => {
	const tip = document.querySelector('#tip, .tip, [role="tooltip"]');
	if (tip && tip.offsetParent !== null && tip.textContent.trim()) return tip.textContent.trim();
	let e = document.elementFromPoint(${x}, ${y});
	for (let n = e; n; n = n.parentElement) {
		if (!(n instanceof Element)) break;
		const a = getComputedStyle(n, '::after').content;
		if (a && a !== 'none' && a !== 'normal' && a !== '""') return a.replace(/^"|"$/g, '');
		const t = n.getAttribute('title') || n.getAttribute('data-d') || n.getAttribute('aria-description');
		if (t) return t;
	}
	return '';
})()`;

/** 1 コマの描画の回り（requestAnimationFrame の呼び返し）の時間を集める */
export const PERF_HOOK = `(() => {
	if (window.__perf) { window.__perf.length = 0; return true; }
	window.__perf = [];
	const orig = window.requestAnimationFrame.bind(window);
	window.requestAnimationFrame = (cb) => orig((t) => { const a = performance.now(); cb(t); window.__perf.push(performance.now() - a); });
	return true;
})()`;
