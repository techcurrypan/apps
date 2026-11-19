// 10-R 手順 9 の判定に渡す連続画像（learn-standard.md 0.3・第 11 章 C-1〜C-14）を撮る。
// 本番は第 2 版の見本 2 本（net-101・k8s-101）、試作は learn10.html。どの場面も入った瞬間から 0.25 秒ごとに 8 枚。
//   npx tsx scripts/look-judge.ts <本番の URL の根> [置き場（既定 .ref/judge）]
// 置き場は git に入れない（.ref/）。判定の記録に場面の名前を書き、代表の 1 枚だけを docs/progress/shots/phase-10-R/ に写す。
import { copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve as res } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openChrome, sleep, type Tab } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, '');
const out = process.argv[3] ?? '.ref/judge';
const keep = 'docs/progress/shots/phase-10-R';
mkdirSync(out, { recursive: true });
mkdirSync(keep, { recursive: true });
const PROTO = pathToFileURL(res('docs/prototype/learn/learn10.html')).href;

type Opt = { phone?: boolean; light?: boolean; reduced?: boolean };
type Prod = {
	lesson: string;
	step: number;
	before?: (t: Tab) => Promise<void>;
	after?: (t: Tab) => Promise<void>;
	wait?: number;
};
type Scene = {
	id: string;
	prod: Prod;
	proto?: { hash: string; next: number; after?: (t: Tab) => Promise<void> };
	opt?: Opt;
};

const click = (t: Tab, sel: string, text: string) =>
	t.eval(
		`[...document.querySelectorAll(${JSON.stringify(sel)})].find(b => b.textContent.includes(${JSON.stringify(text)}))?.click()`
	);
async function typeLine(t: Tab, line: string) {
	await t.eval(
		`(() => { const i = document.querySelector('#try-line, #tin'); if (!i) return; i.focus(); const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(i), 'value').set; set.call(i, ${JSON.stringify(line)}); i.dispatchEvent(new Event('input', { bubbles: true })); (i.form ?? document.querySelector('#tf'))?.requestSubmit(); })()`
	);
	await sleep(2600);
}
const deep = (t: Tab) => click(t, '.seg button', '中身まで').then(() => sleep(300));

const SCENES: Scene[] = [
	{ id: 'C-1', prod: { lesson: 'net-101', step: 0 }, proto: { hash: '#net', next: 0 } },
	{ id: 'C-2', prod: { lesson: 'net-101', step: 2 }, proto: { hash: '#net', next: 3 } },
	{ id: 'C-3', prod: { lesson: 'net-101', step: 3 }, proto: { hash: '#net', next: 5 } },
	{
		id: 'C-4',
		prod: { lesson: 'net-101', step: 5, before: deep, wait: 4000 },
		proto: { hash: '#net', next: 9 }
	},
	{ id: 'C-4b', prod: { lesson: 'net-101', step: 4 } },
	{ id: 'C-4c', prod: { lesson: 'net-101', step: 7 } },
	{ id: 'C-4d', prod: { lesson: 'net-101', step: 8 } },
	{ id: 'C-5', prod: { lesson: 'k8s-101', step: 3, wait: 6000 }, proto: { hash: '#k8s', next: 2 } },
	{ id: 'C-6', prod: { lesson: 'k8s-101', step: 7 }, proto: { hash: '#k8s', next: 4 } },
	{ id: 'C-7', prod: { lesson: 'k8s-101', step: 11 } },
	{
		id: 'C-8',
		prod: {
			lesson: 'net-101',
			step: 0,
			after: async (t) => {
				await t.key('ArrowRight');
				await sleep(600);
			}
		},
		proto: { hash: '#net', next: 2 }
	},
	{
		id: 'C-9',
		prod: {
			lesson: 'k8s-101',
			step: 0,
			after: async (t) => {
				await click(t, '.l2-modes button', 'やってみる');
				await sleep(600);
				for (const l of [
					'kubectl get pods -n shop',
					'kubectl describe pod web-6d8f7b9c4-7xk2p -n shop',
					'kubectl logs web-6d8f7b9c4-7xk2p -n shop --previous'
				])
					await typeLine(t, l);
			}
		},
		proto: {
			hash: '#k8s',
			next: 0,
			after: async (t) => {
				await t.eval(`window.__l?.setMode('try')`);
				await sleep(500);
				for (const l of [
					'kubectl get pods',
					'kubectl scale deployment shop --replicas=5',
					'kubectl get pods'
				])
					await typeLine(t, l);
			}
		}
	},
	{
		id: 'C-10',
		prod: {
			lesson: 'k8s-101',
			step: 0,
			after: async (t) => {
				await click(t, '.l2-modes button', '思い出す');
				await sleep(800);
			}
		},
		proto: {
			hash: '#k8s',
			next: 0,
			after: async (t) => {
				await t.eval(`window.__l?.setMode('recall')`);
				await sleep(500);
			}
		}
	},
	{
		id: 'C-11',
		prod: {
			lesson: 'k8s-101',
			step: 3,
			before: async (t) => {
				await t.key('f');
				await sleep(400);
			}
		}
	},
	{
		id: 'C-12a',
		prod: { lesson: 'net-101', step: 2 },
		proto: { hash: '#net', next: 3 },
		opt: { phone: true }
	},
	{
		id: 'C-12b',
		prod: { lesson: 'k8s-101', step: 3 },
		proto: { hash: '#k8s', next: 2 },
		opt: { phone: true }
	},
	{ id: 'C-13', prod: { lesson: 'net-101', step: 5, before: deep }, opt: { light: true } },
	{ id: 'C-14a', prod: { lesson: 'net-101', step: 3 }, opt: { reduced: true } },
	{ id: 'C-14b', prod: { lesson: 'k8s-101', step: 7 }, opt: { reduced: true } }
];

async function setup(tab: Tab, o: Opt = {}) {
	await tab.size(o.phone ? 390 : 1440, o.phone ? 844 : 900, !!o.phone);
	await tab.send('Emulation.setEmulatedMedia', {
		features: [
			{ name: 'prefers-color-scheme', value: o.light ? 'light' : 'dark' },
			{ name: 'prefers-reduced-motion', value: o.reduced ? 'reduce' : 'no-preference' }
		]
	});
}
async function burst(tab: Tab, name: string, n = 8, every = 250) {
	const t0 = Date.now();
	for (let i = 0; i < n; i++) {
		const w = t0 + i * every - Date.now();
		if (w > 0) await sleep(w);
		await tab.shot(join(out, `${name}-${i}.png`));
	}
}

const { tab, chrome } = await openChrome(9333);
try {
	for (const s of SCENES) {
		await setup(tab, s.opt);
		// 本番
		const url = `${base}/lesson/${s.prod.lesson}`;
		await tab.go('about:blank');
		await tab.go(url);
		await tab.eval('localStorage.clear()');
		await tab.go(url);
		await sleep(600);
		if (s.prod.before) await s.prod.before(tab);
		if (s.prod.step > 0) await tab.eval(`window.__learn2.go(${s.prod.step})`);
		if (s.prod.after) await s.prod.after(tab);
		await burst(tab, `${s.id}-prod`);
		if (s.prod.wait) {
			const w = s.prod.wait - 2000;
			if (w > 0) await sleep(w);
			await burst(tab, `${s.id}-prod-late`, 4, 500);
		}
		copyFileSync(join(out, `${s.id}-prod-4.png`), join(keep, `judge-${s.id}-prod.png`));
		// 試作
		if (s.proto) {
			await tab.go('about:blank');
			await tab.go(PROTO + s.proto.hash);
			await sleep(600);
			for (let i = 0; i < s.proto.next; i++) {
				await tab.key('ArrowRight');
				await sleep(200);
				if (await tab.eval<boolean>('!!document.querySelector(".ask .opt")')) {
					await tab.eval('document.querySelector(".ask .opt")?.click()');
					await sleep(200);
				}
				if (i < s.proto.next - 1) await sleep(1500);
			}
			if (s.proto.after) await s.proto.after(tab);
			await burst(tab, `${s.id}-proto`);
		}
		console.log(s.id);
	}
} finally {
	chrome.kill();
}
