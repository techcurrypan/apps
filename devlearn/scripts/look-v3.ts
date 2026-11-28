// 10-P 手順 9・10 の材料：公開 URL の第 3 版の学習画面（net-101）を、見るの全ステップと 試す・やってみる・思い出す で撮る（CI では走らせない）。
//   npx tsx scripts/look-v3.ts [本番の URL の根] [レッスン ID]
// 撮った物は docs/progress/shots/phase-10-P/v3-<ID>-*.png。あわせて、図の枠の大きさ・はみ出し・次へで進めるかを確かめて表に出す
import { mkdirSync, writeFileSync } from 'node:fs';
import { openChrome, sleep } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, '');
const id = process.argv[3] ?? 'net-101';
const OUT = process.env.KIT_OUT ?? 'docs/progress/shots/phase-10-P';

type Probe = {
	step: string;
	mode: string;
	figW: number;
	figH: number;
	over: number;
	tokens: number;
	dots: number;
	/** 内側のスクロールの量（px。端末の過去の出力 .out は除く。CLAUDE.md 第 9 章） */
	inner: number;
	/** やってみる の端末の大きさ（640×520 以上。LS-P5） */
	term?: string;
};
const PROBE = `(() => {
	const v = document.querySelector('[data-testid=learn-v3]');
	const f = v?.querySelector('.fig')?.getBoundingClientRect();
	const over = [...document.querySelectorAll('.v3 *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.bottom > innerHeight + 1); }).length;
	const inner = Math.max(0, ...[...document.querySelectorAll('.v3 *')].filter((e) => !e.closest('.out') && /auto|scroll/.test(getComputedStyle(e).overflowY)).map((e) => e.scrollHeight - e.clientHeight));
	const tm = document.querySelector('.side div.term')?.getBoundingClientRect();
	return { inner, term: tm ? Math.round(tm.width) + 'x' + Math.round(tm.height) : undefined, step: v?.getAttribute('data-step') ?? '', mode: v?.getAttribute('data-mode') ?? '', figW: Math.round(f?.width ?? 0), figH: Math.round(f?.height ?? 0), over, tokens: document.querySelectorAll('.fig [data-token], .fig g.token').length, dots: document.querySelectorAll('.fig [data-flow]').length };
})()`;

async function main() {
	mkdirSync(OUT, { recursive: true });
	const { tab, chrome } = await openChrome(9358, { gpu: false, headless: true });
	const rows: Probe[] = [];
	try {
		await tab.size(1440, 900, false);
		await tab.scheme(false);
		await tab.go(`${base}/lesson/${id}`);
		await sleep(2500);
		const n = await tab.eval<number>('document.querySelectorAll(".steps button").length');
		for (let i = 0; i < n; i++) {
			await sleep(3000);
			rows.push(await tab.eval<Probe>(PROBE));
			await tab.shot(`${OUT}/v3-${id}-watch-${i + 1}.png`);
			await tab.eval('document.querySelector("[data-testid=next]").click()');
		}
		for (const m of ['lab', 'try', 'quiz']) {
			await sleep(2500);
			rows.push(await tab.eval<Probe>(PROBE));
			await tab.shot(`${OUT}/v3-${id}-${m}.png`);
			await tab.eval('document.querySelector("[data-testid=next]")?.click()');
		}
		await tab.scheme(true);
		await tab.go(`${base}/lesson/${id}`);
		await sleep(3000);
		await tab.shot(`${OUT}/v3-${id}-dark-1.png`);
	} finally {
		chrome.kill();
	}
	writeFileSync(`${OUT}/v3-${id}.json`, JSON.stringify(rows, null, 1));
	for (const r of rows) console.log(JSON.stringify(r));
}
main();
