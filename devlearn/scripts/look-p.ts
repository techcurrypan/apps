// 10-P 手順 10 の判定の材料（learn-standard.md 15.1 の P-1〜P-9）：試作 learn11 と本番（公開 URL）の同じ場面を、
// 入って 0.6・2.5・5 秒の 3 枚ずつ撮る。P-8 は 4 題の 試す・やってみる・思い出す、P-9 は図の物・ステップの番号・使い方の釦に乗せた時。
//   npx tsx scripts/look-p.ts [公開 URL の根] [置き場（既定 docs/progress/shots/phase-10-P/judge）]
// 判定は作った本人ではない 2 人（learn-standard.md 0.3）。CI では走らせない
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openChrome, sleep, type Tab } from './lib/cdp.ts';
import { PROTO_SHIM } from './lib/learn3-measure.ts';

const base = (process.argv[2] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, '');
const OUT = process.argv[3] ?? 'docs/progress/shots/phase-10-P/judge';
const PROTO = pathToFileURL(resolve('docs/prototype/learn/learn11.html')).href;

/** [場面, 試作の題, 試作のステップ（1 から）, 本番のレッスン, 本番のステップ（0 から）] */
const SCENES: [string, string, number, string, number][] = [
	['P-1', 'tcp', 1, 'net-101', 0],
	['P-2', 'tcp', 4, 'net-101', 3],
	['P-3', 'tcp', 9, 'net-101', 8],
	['P-4', 'k8s', 5, 'k8s-101', 4],
	['P-5', 'k8s', 7, 'k8s-101', 7],
	['P-6', 'mem', 7, 'prg-006', 5],
	['P-7', 'stat', 6, 'sta-019', 5]
];
const PAIRS: [string, string][] = [
	['tcp', 'net-101'],
	['k8s', 'k8s-101'],
	['mem', 'prg-006'],
	['stat', 'sta-019']
];

async function openProto(tab: Tab, lesson: string) {
	await tab.go(`${PROTO}#${lesson}-still`);
	await sleep(1500);
	await tab.eval(PROTO_SHIM);
	await tab.eval(`window.__l3.lesson(${JSON.stringify(lesson)})`);
	await sleep(800);
}
async function openProd(tab: Tab, id: string) {
	await tab.go(`${base}/lesson/${id}`);
	await sleep(2500);
}
async function frames(tab: Tab, name: string, step: number) {
	await tab.eval(`window.__l3.go(${step})`);
	let at = 0;
	for (const t of [600, 2500, 5000]) {
		await sleep(t - at);
		at = t;
		await tab.shot(`${OUT}/${name}-${(t / 1000).toFixed(1)}s.png`);
	}
}
async function mouse(tab: Tab, x: number, y: number) {
	await tab.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
}
/** 図の物・ステップの番号・使い方の釦に乗せて撮る（P-9） */
async function hovers(tab: Tab, name: string) {
	const pts = await tab.eval<{ k: string; x: number; y: number }[]>(`(() => {
		const A = window.__l3; const out = [];
		const id = A.objs()[1] ?? A.objs()[0]; const e = id && A.objEl(id);
		if (e) { const r = e.getBoundingClientRect(); out.push({ k: 'obj', x: r.x + r.width / 2, y: r.y + r.height * 0.45 }); }
		const s = document.querySelectorAll('#steps button, [data-l3-steps] button')[2];
		if (s) { const r = s.getBoundingClientRect(); out.push({ k: 'step', x: r.x + r.width / 2, y: r.y + r.height / 2 }); }
		const m = document.querySelectorAll('#modes button, [data-l3-modes] button')[1];
		if (m) { const r = m.getBoundingClientRect(); out.push({ k: 'mode', x: r.x + r.width / 2, y: r.y + r.height / 2 }); }
		return out; })()`);
	for (const p of pts) {
		await mouse(tab, 2, 2);
		await sleep(300);
		await mouse(tab, p.x, p.y);
		await sleep(700);
		await tab.shot(`${OUT}/${name}-${p.k}.png`);
	}
	await mouse(tab, 2, 2);
}

async function main() {
	mkdirSync(OUT, { recursive: true });
	const { tab, chrome } = await openChrome(9358, { gpu: false, headless: true });
	try {
		await tab.size(1440, 900, false);
		for (const [name, pl, ps, id, step] of SCENES) {
			await openProto(tab, pl);
			await frames(tab, `${name}-proto`, ps - 1);
			await openProd(tab, id);
			await frames(tab, `${name}-prod`, step);
			console.log('撮った', name);
		}
		for (const [pl, id] of PAIRS) {
			for (const m of ['lab', 'try', 'recall']) {
				await openProto(tab, pl);
				await tab.eval(`window.__l3.mode(${JSON.stringify(m)})`);
				await sleep(2500);
				await tab.shot(`${OUT}/P-8-proto-${pl}-${m}.png`);
				await openProd(tab, id);
				await tab.eval(`window.__l3.mode(${JSON.stringify(m)})`);
				await sleep(2500);
				await tab.shot(`${OUT}/P-8-prod-${id}-${m}.png`);
			}
			await openProto(tab, pl);
			await tab.eval('window.__l3.go(3)');
			await sleep(1500);
			await hovers(tab, `P-9-proto-${pl}`);
			await openProd(tab, id);
			await tab.eval('window.__l3.go(3)');
			await sleep(1500);
			await hovers(tab, `P-9-prod-${id}`);
			console.log('撮った P-8・P-9', id);
		}
	} finally {
		chrome.kill();
	}
}
main();
