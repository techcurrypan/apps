// 10-P 手順 3 の判定の材料：本番の部品集（公開 URL の /kit。明暗）と、試作 learn11 の同じ部品が出る場面（P-1〜P-7）を撮る（CI では走らせない）。
//   npx tsx scripts/look-kit.ts [本番の URL の根]
// 撮った物は docs/progress/shots/phase-10-P/kit-*.png・proto-*.png。判定は作った本人ではない 2 人（learn-standard.md 0.3・15.1）
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PROTO_SHIM } from './lib/learn3-measure.ts';
import { openChrome, sleep, type Tab } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, '');
const OUT = 'docs/progress/shots/phase-10-P';
const PROTO = pathToFileURL(resolve('docs/prototype/learn/learn11.html')).href;
/** 比べる場面（learn-standard.md 15.1）。ステップは 1 から */
const SCENES: [string, string, number][] = [
	['P-1', 'tcp', 1],
	['P-2', 'tcp', 4],
	['P-3', 'tcp', 8],
	['P-4', 'k8s', 4],
	['P-5', 'k8s', 6],
	['P-6', 'mem', 6],
	['P-7', 'stat', 5]
];

async function kit(tab: Tab, dark: boolean) {
	await tab.scheme(dark);
	await tab.go(`${base}/kit`);
	await sleep(2500);
	const h = await tab.eval<number>('document.documentElement.scrollHeight');
	await tab.size(1440, Math.min(6000, Math.max(900, h)), false);
	await sleep(800);
	await tab.shot(`${OUT}/kit-${dark ? 'dark' : 'light'}.png`);
	await tab.size(1440, 900, false);
}

async function main() {
	mkdirSync(OUT, { recursive: true });
	const { tab, chrome } = await openChrome(9357, { gpu: false, headless: true });
	try {
		await tab.size(1440, 900, false);
		await kit(tab, false);
		await kit(tab, true);
		await tab.scheme(false);
		for (const [name, lesson, step] of SCENES) {
			await tab.go(`${PROTO}#${lesson}-still`);
			await sleep(1500);
			await tab.eval(PROTO_SHIM);
			await tab.eval(`window.__l3.go(${step - 1})`);
			await sleep(3500);
			await tab.shot(`${OUT}/proto-${name}-${lesson}-${step}.png`);
			console.log('撮った', name, lesson, step);
		}
	} finally {
		chrome.kill();
	}
}
main();
