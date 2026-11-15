// 段 10-R の比べる道具（plan.md 10-R の 1・learn-standard.md 第 0 章・第 11 章）。
// 試作 docs/prototype/learn/learn10.html（手元の Chrome で file://）と本番（URL）を、同じ場面で撮り、数で測れる項目を測る。
//   npx tsx scripts/look-learn.ts <本番の URL の根> [場面 C-1,C-2…] [置き場]
// 撮った画面：<置き場>/<場面>-proto.png・-prod.png（携帯は -phone を付ける）。測った値：<置き場>/measure.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve as res } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openChrome, sleep, type Tab } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, '');
const only = process.argv[3] ? new Set(process.argv[3].split(',')) : null;
const outDir = process.argv[4] ?? 'docs/progress/shots/phase-10-R';
const PROTO = pathToFileURL(res('docs/prototype/learn/learn10.html')).href;
mkdirSync(outDir, { recursive: true });

type Side = 'proto' | 'prod';
type Scene = {
	id: string;
	name: string;
	/** 本番のレッスン */
	lesson: string;
	/** 試作のレッスン（#net など） */
	hash: string;
	/** 場面まで進める */
	run: (tab: Tab, side: Side) => Promise<void>;
	phone?: boolean;
	dark?: boolean;
};

/** 本番：出来事 n まで → で進め、動きを待つ */
async function prodTo(tab: Tab, n: number) {
	for (let i = 0; i < n; i++) {
		await tab.key('ArrowRight');
		await sleep(150);
		// 予想の問いが出たら、1 を押して答える
		const asking = await tab.eval<boolean>('!!document.querySelector(".ask")');
		if (asking) {
			await tab.key('1');
			await sleep(150);
		}
		await sleep(2400);
	}
}
/** 試作：→ で進める（試作は問いでも止まる） */
async function protoTo(tab: Tab, n: number) {
	for (let i = 0; i < n; i++) {
		await tab.key('ArrowRight');
		await sleep(200);
		const asking = await tab.eval<boolean>('!!document.querySelector(".ask .opt")');
		if (asking) {
			await tab.eval('document.querySelector(".ask .opt")?.click()');
			await sleep(200);
		}
		await sleep(2400);
	}
}
async function setDepth(tab: Tab, side: Side, label: string) {
	await tab.eval(
		side === 'prod'
			? `[...document.querySelectorAll('.seg button')].find(b => b.textContent.trim() === ${JSON.stringify(label)})?.click()`
			: `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)})?.click()`
	);
	await sleep(300);
}

const SCENES: Scene[] = [
	{
		id: 'C-1',
		name: '概要',
		lesson: 'net-007',
		hash: '#net',
		run: async () => {}
	},
	{
		id: 'C-2',
		name: '送っている途中',
		lesson: 'net-007',
		hash: '#net',
		run: async (tab, side) => {
			if (side === 'prod') {
				await prodTo(tab, 2);
				await tab.key('ArrowRight');
				await sleep(150);
				if (await tab.eval<boolean>('!!document.querySelector(".ask")')) await tab.key('1');
				await sleep(900);
			} else {
				await protoTo(tab, 3);
				await tab.key('ArrowRight');
				await sleep(900);
			}
		}
	},
	{
		id: 'C-3',
		name: '届いた直後・中身まで',
		lesson: 'net-007',
		hash: '#net',
		run: async (tab, side) => {
			await setDepth(tab, side, '中身まで');
			if (side === 'prod') await prodTo(tab, 3);
			else await protoTo(tab, 4);
			await tab.eval(
				side === 'prod'
					? 'document.querySelectorAll(".pf")[9]?.dispatchEvent(new MouseEvent("mouseenter"))'
					: 'document.querySelectorAll(".pf")[9]?.dispatchEvent(new MouseEvent("mouseenter", {bubbles:true}))'
			);
			await sleep(300);
		}
	},
	{
		id: 'C-4',
		name: '時系列',
		lesson: 'net-007',
		hash: '#net',
		run: async (tab, side) => {
			await tab.key('End');
			if (side === 'prod') await prodTo(tab, 0);
			else await protoTo(tab, 12);
			await tab.eval(
				`[...document.querySelectorAll('button')].find(b => b.textContent.includes('時系列'))?.click()`
			);
			await sleep(500);
		}
	},
	{
		id: 'C-11',
		name: '予想の問い',
		lesson: 'net-007',
		hash: '#net',
		run: async (tab, side) => {
			if (side === 'prod') {
				await prodTo(tab, 1);
				await tab.key('ArrowRight');
			} else {
				await protoTo(tab, 2);
				await tab.key('ArrowRight');
			}
			await sleep(600);
		}
	},
	{
		id: 'C-13',
		name: '携帯（送っている途中）',
		lesson: 'net-007',
		hash: '#net',
		phone: true,
		run: async (tab, side) => SCENES[1].run(tab, side)
	},
	{
		id: 'C-14',
		name: '明（届いた直後・中身まで）',
		lesson: 'net-007',
		hash: '#net',
		dark: false,
		run: async (tab, side) => SCENES[2].run(tab, side)
	}
];

/** 数で測る項目（LS-A4〜A8・LS-D5・D6・LS-X1・X2） */
const MEASURE = `(() => {
	const vw = innerWidth, vh = innerHeight;
	const q = (s) => document.querySelector(s);
	const inView = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh + 1 && r.height > 0; };
	const dia = q('.dia');
	const scrollers = [...document.querySelectorAll('body *')].filter((e) => {
		const cs = getComputedStyle(e);
		if (!/(auto|scroll)/.test(cs.overflowY + cs.overflowX)) return false;
		return e.scrollHeight - e.clientHeight > 1 || (e.scrollWidth - e.clientWidth > 1 && !e.closest('.rec'));
	}).map((e) => e.className || e.tagName);
	let minFont = 99, minAt = '';
	for (const e of document.querySelectorAll('body *')) {
		if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
		const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
		let f = parseFloat(getComputedStyle(e).fontSize);
		const svg = e.closest('svg');
		if (svg && svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width) f = f * (svg.getBoundingClientRect().width / svg.viewBox.baseVal.width);
		if (f < minFont) { minFont = f; minAt = (e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) + ' ' + e.textContent.trim().slice(0, 12); }
	}
	// 図の中の文字の箱と番号の丸の重なり
	const svg = q('.dia svg');
	const boxes = svg ? [...svg.querySelectorAll('text')].filter((t) => !t.closest('.parcel, g[pointer-events="none"]')).map((t) => t.getBoundingClientRect()).filter((r) => r.width > 0) : [];
	let textOverlap = 0;
	for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) textOverlap++; }
	const marks = svg ? [...svg.querySelectorAll('.mark circle:not(.halo), .hitn circle[r="11"]')].map((c) => c.getBoundingClientRect()) : [];
	let markOverlap = 0;
	for (let i = 0; i < marks.length; i++) for (let j = i + 1; j < marks.length; j++) { const a = marks[i], b = marks[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) markOverlap++; }
	return {
		size: vw + 'x' + vh,
		scrollWidth: document.documentElement.scrollWidth,
		diagramH: dia ? Math.round(dia.getBoundingClientRect().height) : 0,
		visible: { diagram: inView(dia), caption: inView(q('.cap')), transport: inView(q('.transport')), insideHead: inView(q('.inside .ih, .inside h3')) },
		innerScroll: scrollers,
		minFont: Math.round(minFont * 10) / 10, minAt,
		textOverlap, markOverlap
	};
})()`;

async function main() {
	const { tab, chrome } = await openChrome(9341);
	const out: Record<string, unknown> = {};
	try {
		for (const s of SCENES) {
			if (only && !only.has(s.id)) continue;
			for (const side of ['proto', 'prod'] as Side[]) {
				const phone = s.phone ?? false;
				await tab.size(phone ? 390 : 1440, phone ? 844 : 960, phone);
				await tab.scheme(s.dark ?? true);
				const url = side === 'proto' ? PROTO + s.hash : `${base}/lesson/${s.lesson}`;
				await tab.go(url);
				// 前の場面の好み（詳しさ・表し方）を消してから始める
				await tab.eval('localStorage.clear()');
				await tab.go(url);
				if (side === 'prod' && s.dark !== false)
					await tab.eval(`document.documentElement.dataset.theme = 'dark'`);
				if (side === 'prod' && s.dark === false)
					await tab.eval(`document.documentElement.dataset.theme = 'light'`);
				await sleep(400);
				await s.run(tab, side);
				const file = join(outDir, `${s.id}-${side}.png`);
				await tab.shot(file);
				const m = await tab.eval<Record<string, unknown>>(MEASURE);
				out[`${s.id}-${side}`] = m;
				console.log(s.id, side, JSON.stringify(m));
			}
		}
	} finally {
		writeFileSync(join(outDir, 'measure.json'), JSON.stringify(out, null, 1));
		chrome.kill();
	}
}

void main();
