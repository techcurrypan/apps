// look-learn.ts の --motion・--layout・--ref（plan.md 10-R 手順 1・learn-standard.md 第 0〜3・6・10 章）。
// 学習画面（第 2 版）は次の印を持つ。第 1 版の画面は持たないので、落ちる（手順 1「今の画面で落ちることを確かめる」）。
//   window.__learn2 = { steps: number; go(n: number): void }（n は 1 から。0 は概要）
//   .l2-dia（図。指標の帯と凡例を含む）・.l2-stage（図の絵）・.l2-top・.l2-head・.l2-toc・.l2-narr・.l2-steps・.l2-inside・.l2-rec
//   [data-fit]（そのステップに関わる物。図の箱の内側に余白 24px で収まる）・[data-label]（図の中の字。互いに重ならない）
//   [data-packet]（荷物。data-link は線の path の id、data-p は 0〜1 の進み）・[data-metric]（指標の値）
//   やってみる：.l2-term（端末）・.l2-term-out（過去の出力）
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sleep, type Tab } from './cdp.ts';
import { decodePng, diffRatio, type Img } from './png.ts';

export type Rect = { x: number; y: number; width: number; height: number };

const DIA = '.l2-stage, .l2-dia, .dia';

async function rectOf(tab: Tab, sel: string): Promise<Rect | null> {
	return tab.eval<Rect | null>(`(() => {
		const e = document.querySelector(${JSON.stringify(sel)});
		if (!e) return null;
		const r = e.getBoundingClientRect();
		return { x: r.x, y: r.y, width: r.width, height: r.height };
	})()`);
}

async function clipShot(tab: Tab, r: Rect): Promise<Img> {
	const res = await tab.send('Page.captureScreenshot', {
		format: 'png',
		clip: { x: r.x, y: r.y, width: Math.max(1, r.width), height: Math.max(1, r.height), scale: 0.5 }
	});
	return decodePng(Buffer.from(String(res.data), 'base64'));
}

/** ステップ n に入る（第 2 版は __learn2.go。第 1 版は → を押す） */
async function enter(tab: Tab, n: number): Promise<void> {
	const v2 = await tab.eval<boolean>('!!window.__learn2');
	if (v2) await tab.eval(`window.__learn2.go(${n})`);
	else await tab.key('ArrowRight');
}

async function stepCount(tab: Tab): Promise<number> {
	return tab.eval<number>(`(() => {
		if (window.__learn2) return window.__learn2.steps;
		// 第 1 版：ステップの帯が無いので、出来事の番号の釦の数
		return document.querySelectorAll('.beats button, .tl button, .steps button').length || 6;
	})()`);
}

export type MotionStep = {
	step: number;
	early: number[]; // 入ってから 0.25 秒ごとの差（6 つ）
	times: number[]; // 撮った時の画面の経過時間（ms）
	late: number[]; // 3〜6 秒の間の差（3 つ）
	m1: boolean; // 6 回のうち 5 回以上が 0.3% 以上
	m4: boolean; // 3〜6 秒の差が全て 0.3% 以上
	packet: { samples: number; maxJump: number; offLine: number } | null; // LS-M8
	counts: Record<string, number>; // LS-M9：指標ごとに通った値の数
};

const PACKET = `(() => {
	const p = document.querySelector('[data-packet]');
	if (!p) return null;
	const path = document.getElementById(p.dataset.link || '');
	const r = p.getBoundingClientRect();
	const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
	let off = 0;
	if (path && path.getTotalLength) {
		const len = path.getTotalLength();
		const pt = path.getPointAtLength(len * Number(p.dataset.p));
		const m = path.getScreenCTM();
		const sx = m.a * pt.x + m.c * pt.y + m.e, sy = m.b * pt.x + m.d * pt.y + m.f;
		off = Math.hypot(sx - cx, sy - cy);
	}
	return { p: Number(p.dataset.p), off };
})()`;

const METRICS = `[...document.querySelectorAll('[data-metric]')].map((e) => [e.dataset.metric, e.textContent.trim()])`;

/** LS-M1・M4・M8・M9。1 本のレッスンの全ステップを測る */
export async function motionOf(tab: Tab, url: string): Promise<MotionStep[]> {
	await tab.go(url);
	await tab.eval('localStorage.clear()');
	await tab.go(url);
	await sleep(500);
	const n = await stepCount(tab);
	const out: MotionStep[] = [];
	for (let s = 1; s <= n; s++) {
		await enter(tab, s);
		const t0 = Date.now();
		const r = await rectOf(tab, DIA);
		if (!r) {
			out.push({
				step: s,
				early: [],
				times: [],
				late: [],
				m1: false,
				m4: false,
				packet: null,
				counts: {}
			});
			continue;
		}
		const shots: Img[] = [];
		const times: number[] = [];
		const seen: Record<string, Set<string>> = {};
		for (let i = 0; i <= 6; i++) {
			const wait = t0 + i * 250 - Date.now();
			if (wait > 0) await sleep(wait);
			shots.push(await clipShot(tab, r));
			times.push(Math.round(await tab.eval<number>('window.__learn2?.t ?? -1')));
			for (const [k, v] of await tab.eval<[string, string][]>(METRICS))
				(seen[k] ??= new Set()).add(v);
		}
		const late: Img[] = [];
		for (let i = 0; i < 4; i++) {
			const wait = t0 + 3000 + i * 1000 - Date.now();
			if (wait > 0) await sleep(wait);
			late.push(await clipShot(tab, r));
		}
		// loop: 'none' のステップは「何も流れていない」ことを見せるので、3〜6 秒は数えない（LS-M4）
		const still = await tab.eval<boolean>(`!!window.__learn2?.still?.(${s})`);
		const early = shots.slice(1).map((im, i) => diffRatio(shots[i], im));
		const lateD = late.slice(1).map((im, i) => diffRatio(late[i], im));
		// 荷物：もう一度流して（R）、10 回位置を取る
		await tab.key('r');
		const ps: { p: number; off: number }[] = [];
		const seen2: Record<string, Set<string>> = {};
		for (let i = 0; i < 40 && ps.length < 10; i++) {
			await sleep(45);
			const p = await tab.eval<{ p: number; off: number } | null>(PACKET);
			if (p && p.p > 0 && p.p < 1) ps.push(p);
			for (const [k, v] of await tab.eval<[string, string][]>(METRICS))
				(seen2[k] ??= new Set()).add(v);
		}
		const counts: Record<string, number> = {};
		for (const k of new Set([...Object.keys(seen), ...Object.keys(seen2)]))
			counts[k] = new Set([...(seen[k] ?? []), ...(seen2[k] ?? [])]).size;
		let maxJump = 0;
		for (let i = 1; i < ps.length; i++)
			maxJump = Math.max(maxJump, Math.abs(ps[i].p - ps[i - 1].p));
		out.push({
			step: s,
			early: early.map((d) => Math.round(d * 10000) / 100),
			times,
			late: lateD.map((d) => Math.round(d * 10000) / 100),
			m1: early.filter((d) => d >= 0.003).length >= 5,
			m4: still || (lateD.length > 0 && lateD.every((d) => d >= 0.003)),
			packet: ps.length
				? {
						samples: ps.length,
						maxJump: Math.round(maxJump * 1000) / 1000,
						offLine: Math.round(Math.max(...ps.map((p) => p.off)) * 10) / 10
					}
				: null,
			counts
		});
	}
	return out;
}

/** LS-A1〜A7・D1・D6・P1・P2・X1・X2。いまの画面を測る */
export const LAYOUT = `(() => {
	const vw = innerWidth, vh = innerHeight;
	const q = (s) => document.querySelector(s);
	const box = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; };
	const inView = (s) => { const e = q(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.height > 0 && r.top >= -1 && r.bottom <= vh + 1 && r.left >= -1 && r.right <= vw + 1; };
	// 図＝指標の帯・出来事の札・絵・凡例を含む枠（LS-A4「図（指標の帯と凡例を含む）」）。はみ出し（LS-D1）は絵の枠で見る
	const dia = q('.l2-dia') || q('.dia');
	const dr = dia ? dia.getBoundingClientRect() : null;
	const stg = q('.l2-stage');
	const sr = stg ? stg.getBoundingClientRect() : dr;
	const scrollers = [...document.querySelectorAll('body *')].filter((e) => {
		if (e.closest('.l2-term-out')) return false;
		const cs = getComputedStyle(e);
		if (!/(auto|scroll)/.test(cs.overflowY + cs.overflowX)) return false;
		if (vw <= 400 && e.closest('.l2-rec') && e.scrollHeight - e.clientHeight <= 1) return false;
		return e.scrollHeight - e.clientHeight > 1 || e.scrollWidth - e.clientWidth > 1;
	}).map((e) => String(e.className.baseVal ?? e.className).slice(0, 40) || e.tagName);
	let minFont = 99, minAt = '', minDia = 99, minDiaAt = '';
	for (const e of document.querySelectorAll('body *')) {
		if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
		const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
		if (r.bottom < 0 || r.top > document.documentElement.scrollHeight) continue;
		const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
		let f = parseFloat(cs.fontSize);
		const svg = e.closest('svg');
		if (svg) { const m = e.getScreenCTM && e.getScreenCTM(); if (m) f = f * Math.hypot(m.a, m.b); }
		const name = String(e.className.baseVal ?? e.className) + ' ' + e.textContent.trim().slice(0, 14);
		if (f < minFont) { minFont = f; minAt = name; }
		if (dia && dia.contains(e) && f < minDia) { minDia = f; minDiaAt = name; }
	}
	// LS-D1：関わる物が図の箱の内側に余白 24px（携帯は 8px）で収まる
	const pad = vw <= 400 ? 8 : 24;
	const outside = dr ? [...document.querySelectorAll('[data-fit]')].filter((e) => {
		const r = e.getBoundingClientRect(); if (!r.width) return false;
		return r.left < sr.left + pad - 1 || r.right > sr.right - pad + 1 || r.top < sr.top + pad - 1 || r.bottom > sr.bottom - pad + 1;
	}).map((e) => e.getAttribute('data-fit')) : ['図が無い'];
	// LS-D6：図の中の字・札・丸が重ならない
	// 絵の中の字は絵の枠で切られた後の見える部分で比べる（枠の外に隠れた部分は見えない）
	const clip = (e, r) => { if (!stg || !stg.contains(e)) return r; const L = Math.max(r.left, sr.left), T = Math.max(r.top, sr.top), R = Math.min(r.right, sr.right), B = Math.min(r.bottom, sr.bottom); return { left: L, top: T, right: R, bottom: B, width: Math.max(0, R - L), height: Math.max(0, B - T) }; };
	const labs = [...document.querySelectorAll('[data-label]')].map((e) => [e.getAttribute('data-label'), clip(e, e.getBoundingClientRect())]).filter(([, r]) => r.width > 0 && r.height > 0);
	const overlaps = [];
	for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
		const a = labs[i][1], b = labs[j][1];
		if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps.push(labs[i][0] + ' × ' + labs[j][0]);
	}
	const term = q('.l2-term-out');
	let termFont = 0, termRows = 0;
	if (term) { const cs = getComputedStyle(term); termFont = parseFloat(cs.fontSize); termRows = Math.floor(term.getBoundingClientRect().height / (parseFloat(cs.lineHeight) || termFont * 1.4)); }
	const rowsAll = [...document.querySelectorAll('.l2-inside [data-row]')].filter((e) => e.getBoundingClientRect().height > 0);
	const insideRows = rowsAll.filter((e) => e.getBoundingClientRect().bottom <= vh + 1).length;
	const insideAll = rowsAll.length;
	return {
		size: vw + 'x' + vh,
		overflowX: document.documentElement.scrollWidth - vw,
		dia: dr ? { w: Math.round(dr.width), h: Math.round(dr.height), area: Math.round((dr.width * dr.height) / (vw * vh) * 100) } : null,
		stage: sr ? { w: Math.round(sr.width), h: Math.round(sr.height) } : null,
		top: box('.l2-top'), head: box('.l2-head'), toc: box('.l2-toc'), narr: box('.l2-narr'), steps: box('.l2-steps'),
		term: box('.l2-term'), termFont, termRows,
		visible: {
			top: inView('.l2-top'), head: inView('.l2-head'), dia: inView('.l2-dia'), metrics: inView('.l2-metrics'), legend: inView('.l2-legend'),
			steps: inView('.l2-steps'), title: inView('.l2-narr h2'), para: inView('.l2-narr .l2-para'), next: inView('.l2-next'), insideHead: inView('.l2-inside .ih')
		},
		insideRows,
		insideAll,
		innerScroll: scrollers,
		minFont: Math.round(minFont * 10) / 10, minAt, minDia: Math.round(minDia * 10) / 10, minDiaAt,
		outside, overlaps
	};
})()`;

export type Layout = {
	size: string;
	overflowX: number;
	dia: { w: number; h: number; area: number } | null;
	stage?: { w: number; h: number } | null;
	toc: { w: number } | null;
	narr: { w: number } | null;
	term: { w: number; h: number } | null;
	termFont: number;
	termRows: number;
	visible: Record<string, boolean>;
	insideRows: number;
	/** そのステップの中身の板の行の数（5 行・2 行に満たないステップは、全部見えれば足りる） */
	insideAll?: number;
	innerScroll: string[];
	minFont: number;
	minDia: number;
	outside: string[];
	overlaps: string[];
};

/** 測った値を項目ごとの合否にする（learn-standard.md の数） */
export function judgeLayout(m: Layout, mode: 'watch' | 'try'): Record<string, string | true> {
	const r: Record<string, string | true> = {};
	const [w] = m.size.split('x').map(Number);
	const ok = (id: string, c: boolean, why: string) => (r[id] = c ? true : why);
	const d = m.dia;
	if (mode === 'watch') {
		if (w >= 1900)
			ok('LS-A1', !!d && d.w >= 1300 && d.h >= 700 && d.area >= 40, `図 ${JSON.stringify(d)}`);
		else if (w >= 1400)
			ok('LS-A1', !!d && d.w >= 940 && d.h >= 520 && d.area >= 40, `図 ${JSON.stringify(d)}`);
		if (w >= 1281) {
			ok('LS-A2', !!m.toc && m.toc.w <= 56, `目次 ${m.toc?.w}`);
			ok('LS-A3', !!m.narr && m.narr.w >= 360 && m.narr.w <= 420, `語り ${m.narr?.w}`);
			const need = ['top', 'head', 'dia', 'metrics', 'legend', 'steps', 'title', 'para', 'next'];
			const miss = need.filter((k) => !m.visible[k]);
			ok('LS-A4', miss.length === 0, `見えない ${miss.join('・')}`);
			if (w >= 1900)
				ok(
					'LS-A5',
					m.visible.insideHead && m.insideRows >= Math.min(5, m.insideAll ?? 5),
					`中身の板 ${m.insideRows} / ${m.insideAll} 行`
				);
			else
				ok(
					'LS-I12',
					m.visible.insideHead && m.insideRows >= Math.min(2, m.insideAll ?? 2),
					`中身の板 ${m.insideRows} / ${m.insideAll} 行`
				);
		}
		ok('LS-D1', m.outside.length === 0, `はみ出す ${m.outside.join('・')}`);
		ok('LS-D6', m.overlaps.length === 0, `重なる ${m.overlaps.slice(0, 4).join('・')}`);
	}
	ok('LS-A6', m.innerScroll.length === 0, `内側のスクロール ${m.innerScroll.join('・')}`);
	if (w <= 400) {
		ok('LS-X1', m.overflowX <= 0 && !!d && d.h >= 300, `横 ${m.overflowX}・図 ${d?.h}`);
		ok('LS-X2', m.minDia >= 11, `図の字 ${m.minDia}`);
	} else {
		ok('LS-A7', m.minFont >= 11 && m.minDia >= 12, `字 ${m.minFont}・図の字 ${m.minDia}`);
	}
	if (mode === 'try' && w >= 1400) {
		ok('LS-P1', !!m.term && m.term.w >= 640 && m.term.h >= 520, `端末 ${JSON.stringify(m.term)}`);
		ok(
			'LS-P2',
			m.termFont >= 13.5 && m.termFont <= 14 && m.termRows >= 28,
			`端末の字 ${m.termFont}・${m.termRows} 行`
		);
	}
	return r;
}

/** 参考サイトの場面（learn-standard.md 第 11 章 R-1〜R-6）。.ref/ にだけ撮る。リポジトリに入れない（0.4） */
export const REF_SCENES: { id: string; hash: string }[] = [
	{ id: 'R-1', hash: '#/request-lifecycle/1' },
	{ id: 'R-2', hash: '#/request-lifecycle/2' },
	{ id: 'R-3', hash: '#/request-lifecycle/3' },
	{ id: 'R-4', hash: '#/consensus/4' },
	{ id: 'R-5', hash: '#/consensus/8' },
	{ id: 'R-6', hash: '#/consensus/10' }
];
export const REF_BASE = 'https://designed-to-scale.vercel.app/';

export async function shootRef(tab: Tab, dir: string): Promise<void> {
	mkdirSync(dir, { recursive: true });
	for (const s of REF_SCENES) {
		await tab.go('about:blank');
		await tab.go(REF_BASE + s.hash);
		await sleep(50);
		for (let i = 0; i < 8; i++) {
			await tab.shot(join(dir, `${s.id}-${i}.png`));
			await sleep(250);
		}
		console.log(s.id);
	}
	// 学習者役の比べ（LS-L1）の教材：2 つの題の全ステップの語りを文として残す（.ref/ の中だけ）
	for (const topic of ['request-lifecycle', 'consensus']) {
		const texts: string[] = [];
		for (let i = 1; i <= 16; i++) {
			await tab.go(`${REF_BASE}#/${topic}/${i}`);
			await sleep(1500);
			const t = await tab.eval<string>('document.body.innerText');
			if (texts.length && t === texts.at(-1)) break;
			texts.push(t);
		}
		writeFileSync(
			join(dir, `${topic}.txt`),
			texts.map((t, i) => `=== ${i + 1}\n${t}`).join('\n\n')
		);
		console.log(topic, texts.length);
	}
}
