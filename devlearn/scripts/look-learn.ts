// 段 10-R の比べる道具（plan.md 10-R の 1・learn-standard.md 第 0 章・第 11 章）。
// 試作 docs/prototype/learn/learn10.html（手元の Chrome で file://）と本番（URL）を、同じ場面で撮り、数で測れる項目を測る。
//   npx tsx scripts/look-learn.ts <本番の URL の根> [場面 C-1,C-2…] [置き場]
// 撮った画面：<置き場>/<場面>-proto.png・-prod.png（携帯は -phone を付ける）。測った値：<置き場>/measure.json
// 第 2 版（plan.md 10-R 手順 1）：
//   npx tsx scripts/look-learn.ts --motion <URL の根> <レッスン ID,…>   全ステップの動き（LS-M1・M4・M8・M9）→ <置き場>/motion.json
//   npx tsx scripts/look-learn.ts --layout <URL の根> <レッスン ID,…>   1440×900・1920×1080・390×844 の配置（LS-A・D1・D6・P1・P2・X1・X2）→ layout.json
//   npx tsx scripts/look-learn.ts --ref                                 参考サイトの場面 R-1〜R-6 を .ref/ に撮る（リポジトリに入れない）
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve as res } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openChrome, sleep, type Tab } from './lib/cdp.ts';
import { LAYOUT, judgeLayout, motionOf, shootRef, type Layout } from './lib/learn-measure.ts';
import { FLAGS3, measure3 } from './lib/learn3-run.ts';

// 第 3 版の測り（learn-standard.md 第 21 章 3）：npx tsx scripts/look-learn.ts --scene <proto[:tcp,k8s]|レッスンの ID,…> [公開 URL]
const FLAG3 = FLAGS3.find((f) => process.argv[2] === f) ?? null;

const FLAG = ['--motion', '--layout', '--ref'].find((f) => process.argv[2] === f) ?? null;
const argv = FLAG ? process.argv.slice(1) : process.argv;
const base = (argv[2] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, '');
const only = !FLAG && argv[3] ? new Set(argv[3].split(',')) : null;
const outDir = argv[4] ?? 'docs/progress/shots/phase-10-R';
const PROTO = pathToFileURL(res('docs/prototype/learn/learn10.html')).href;
if (!FLAG3) mkdirSync(outDir, { recursive: true });

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
/** 試作：名前の出来事へ飛ぶ（試作の全体の関数 animateTo・BEATS・L を使う） */
async function protoEv(tab: Tab, label: string) {
	await tab.eval(
		`(() => { const X = window.__l; const i = X.L.EV.findIndex((e) => e.label === ${JSON.stringify(label)}); X.animateTo(window.__beats().findIndex((b) => b.p === i), { instant: true }); })()`
	);
	await sleep(900);
}
/** 学び方を替える（見る・やってみる・思い出す） */
async function mode(tab: Tab, side: Side, label: string) {
	await tab.eval(
		side === 'prod'
			? `[...document.querySelectorAll('.modes button')].find(b => b.textContent.includes(${JSON.stringify(label)}))?.click()`
			: `window.__l.setMode(${JSON.stringify({ やってみる: 'try', 思い出す: 'recall', 見る: 'watch' }[label] ?? 'watch')})`
	);
	await sleep(500);
}
/** やってみるで 1 行打つ */
async function type(tab: Tab, side: Side, line: string) {
	const sel = side === 'prod' ? '#try-line' : '#tin';
	await tab.eval(
		`(() => { const i = document.querySelector(${JSON.stringify(sel)}); if (!i) return; i.focus(); const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(i), 'value').set; set.call(i, ${JSON.stringify(line)}); i.dispatchEvent(new Event('input', { bubbles: true })); (i.form ?? document.querySelector('#tf'))?.requestSubmit(); })()`
	);
	await sleep(2600);
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
		id: 'C-5',
		name: '実戦で返事が無い・断られる',
		lesson: 'net-007',
		hash: '#net',
		run: async (tab, side) => {
			await mode(tab, side, 'やってみる');
			if (side === 'prod') await type(tab, side, 'curl -v http://shop.example.com:8080/');
			else {
				await type(tab, side, 'dig shop.minato.example');
				await type(tab, side, 'curl -v http://shop.minato.example/');
			}
		}
	},
	{
		id: 'C-6',
		name: '記録の箱（commit の直後）',
		lesson: 'git-001',
		hash: '#git',
		run: async (tab, side) => {
			if (side === 'prod') await prodTo(tab, 4);
			else await protoEv(tab, 'commit を作る');
		}
	},
	{
		id: 'C-7',
		name: '部屋が落ちた（1 台に集まって遅い）',
		lesson: 'cld-006',
		hash: '#k8s',
		run: async (tab, side) => {
			if (side === 'prod') await prodTo(tab, 2);
			else await protoEv(tab, '部屋が落ちた');
		}
	},
	{
		id: 'C-8',
		name: '自己修復（最後）',
		lesson: 'cld-006',
		hash: '#k8s',
		run: async (tab) => {
			await tab.key('End');
			await sleep(1200);
		}
	},
	{
		id: 'C-9',
		name: '実戦（台数を変える）',
		lesson: 'cld-006',
		hash: '#k8s',
		run: async (tab, side) => {
			await mode(tab, side, 'やってみる');
			if (side === 'proto') {
				await type(tab, side, 'kubectl get pods');
				await type(tab, side, 'kubectl scale deployment shop --replicas=5');
				await type(tab, side, 'kubectl get pods');
			}
		}
	},
	{
		id: 'C-10',
		name: '学習の繰り返し',
		lesson: 'ai-014',
		hash: '#ai',
		run: async (tab, side) => {
			if (side === 'prod') {
				await tab.key('End');
				await sleep(1200);
			} else await protoEv(tab, '繰り返す ×10');
		}
	},
	{
		id: 'C-12',
		name: '思い出す（並べる）',
		lesson: 'cld-006',
		hash: '#k8s',
		run: async (tab, side) => {
			await mode(tab, side, '思い出す');
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
	if (innerWidth < 860) document.querySelector('.stage')?.scrollIntoView();
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
			// PHONE=1 のときは、全ての場面を 390×844 でも撮る（learn-standard.md 第 0 章）
			const sizes = s.phone ? [true] : process.env.PHONE ? [false, true] : [false];
			for (const phone of sizes)
				for (const side of ['proto', 'prod'] as Side[]) {
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
					const name = `${s.id}${phone && !s.phone ? '-phone' : ''}-${side}`;
					await tab.shot(join(outDir, `${name}.png`));
					const m = await tab.eval<Record<string, unknown>>(MEASURE);
					out[name] = m;
					console.log(name, JSON.stringify(m));
				}
		}
	} finally {
		writeFileSync(join(outDir, 'measure.json'), JSON.stringify(out, null, 1));
		chrome.kill();
	}
}

/** 第 2 版の測り（--motion・--layout・--ref） */
async function measure2(flag: string) {
	const { tab, chrome } = await openChrome(9342);
	const ids = (argv[3] ?? '').split(',').filter(Boolean);
	const out: Record<string, unknown> = {};
	let bad = 0;
	try {
		await tab.scheme(true);
		if (flag === '--ref') {
			await tab.size(1440, 900, false);
			await shootRef(tab, '.ref');
			return;
		}
		for (const id of ids) {
			const url = `${base}/lesson/${id}`;
			if (flag === '--motion') {
				await tab.size(1440, 900, false);
				const steps = await motionOf(tab, url);
				out[id] = steps;
				for (const s of steps) {
					const ok = s.m1 && s.m4;
					if (!ok) bad++;
					console.log(
						`${id} ${String(s.step).padStart(2)} M1 ${s.m1 ? 'o' : 'x'} M4 ${s.m4 ? 'o' : 'x'} 早 ${s.early.join(' ')} 時 ${s.times.join(' ')} 遅 ${s.late.join(' ')} 荷物 ${JSON.stringify(s.packet)} 数 ${JSON.stringify(s.counts)}`
					);
				}
				continue;
			}
			for (const [w, h, phone] of [
				[1440, 900, false],
				[1920, 1080, false],
				[390, 844, true]
			] as const) {
				await tab.size(w, h, phone);
				await tab.go(url);
				await tab.eval('localStorage.clear()');
				await tab.go(url);
				await tab.eval('window.__learn2?.go(3)');
				await sleep(2500);
				// 保存の空の初回に画面が落ちていないこと（2026-11-19、効果の回り続けで 500 になった）
				const err = await tab.eval<string>(
					`document.querySelector('.l2-dia, [data-learn2]') ? '' : document.body.innerText.slice(0, 60)`
				);
				if (err) {
					bad++;
					console.log(`${id} ${w} 画面が開かない × ${JSON.stringify(err)}`);
				}
				const m = await tab.eval<Layout>(LAYOUT);
				const r = judgeLayout(m, 'watch');
				out[`${id}-${w}`] = { m, r };
				// やってみる
				const tried = await tab.eval<boolean>(
					`(() => { const b = [...document.querySelectorAll('.modes button, .l2-modes button')].find((b) => b.textContent.includes('やってみる')); b?.click(); return !!b; })()`
				);
				if (tried) {
					await sleep(1200);
					const mt = await tab.eval<Layout>(LAYOUT);
					const rt = judgeLayout(mt, 'try');
					out[`${id}-${w}-try`] = { m: mt, r: rt };
					for (const [k, v] of Object.entries(rt))
						if (v !== true) {
							bad++;
							console.log(`${id} ${w} やってみる ${k} × ${v}`);
						}
				}
				for (const [k, v] of Object.entries(r)) {
					if (v !== true) bad++;
					console.log(`${id} ${w} ${k} ${v === true ? 'o' : '× ' + v}`);
				}
			}
		}
	} finally {
		if (flag !== '--ref') {
			mkdirSync(outDir, { recursive: true });
			writeFileSync(join(outDir, `${flag.slice(2)}.json`), JSON.stringify(out, null, 1));
			console.log(bad === 0 ? '全て満たす' : `満たさない ${bad} 件`);
		}
		chrome.kill();
	}
}

if (FLAG3)
	void measure3(
		FLAG3,
		process.argv[3] ?? 'proto',
		(process.argv[4] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, ''),
		process.argv[5] ?? 'docs/progress/shots/phase-10-P'
	).then((bad) => (process.exitCode = bad ? 1 : 0));
else if (FLAG) void measure2(FLAG);
else void main();
