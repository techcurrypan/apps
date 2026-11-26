// D-27 の 5・6、city-standard.md S-6：街のどの板にも閉じ込められないことを、公開 URL で確かめる（CI では走らせない）。
//   npx tsx scripts/look-town-escape.ts [街の URL の根]
// 失敗した章の保存（何もせず 10 日進めた街）と、古い形の保存を置いて開き、
// ×・Esc・板の外・「続ける」・「学習へ」・「新しい街で始める」で抜けられ、時計がまた進むことを見る。
import { START_MINUTE } from '../src/lib/game/clock.ts';
import { openChrome, sleep, type Tab } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, '');
const DAY = 24 * 60;
const FAILED = JSON.stringify({ version: 1, seed: 1, now: START_MINUTE + 10 * DAY, actions: [] });
const OLD = JSON.stringify({ version: 0, seed: 1, now: START_MINUTE, actions: [] });

let bad = 0;
const check = (name: string, ok: boolean, detail = '') => {
	console.log(`${ok ? 'OK ' : 'NG '} ${name}  ${detail}`);
	if (!ok) bad++;
};

async function openWith(tab: Tab, save: string | null) {
	// 街の画面は閉じる時に保存を書き戻すので、街ではない頁で置く
	await tab.go('about:blank');
	await tab.go(`${base}/terms`);
	await tab.eval(
		save === null
			? `localStorage.removeItem('devlearn.town')`
			: `localStorage.setItem('devlearn.town', ${JSON.stringify(save)})`
	);
	await tab.go(`${base}/town`);
	for (let i = 0; i < 100; i++) {
		await sleep(100);
		if (
			await tab.eval<boolean>(
				`!!document.querySelector('#view') && !document.querySelector('.boot')`
			)
		)
			break;
	}
	await sleep(500);
}

const dialog = (tab: Tab) =>
	tab.eval<string>(
		`document.querySelector('.modal [role=dialog]')?.getAttribute('aria-label') ?? ''`
	);
const clickText = (tab: Tab, sel: string, text: string) =>
	tab.eval<boolean>(
		`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.textContent.includes(${JSON.stringify(text)})); if (!b) return false; b.click(); return true; })()`
	);
const saved = (tab: Tab) =>
	tab.eval<{ actions: { action: { type: string } }[] } | null>(
		`JSON.parse(localStorage.getItem('devlearn.town') || 'null')`
	);
/** 時計の字（上の帯）。進んでいれば 2 回で変わる */
const clock = (tab: Tab) =>
	tab.eval<string>(`document.querySelector('.time .d strong')?.textContent ?? ''`);

async function failedExit(tab: Tab, how: string, act: () => Promise<unknown>) {
	await openWith(tab, FAILED);
	check(`${how}：失敗の保存を開くと「章の結果」の板が出る`, (await dialog(tab)) === '章の結果');
	if (how === '続ける') await tab.shot('docs/progress/shots/phase-8r-failed-panel.png');
	await act();
	await sleep(800);
	const d = await dialog(tab);
	check(`${how}：板が閉じた`, d === '', `残った板「${d}」`);
	const s = await saved(tab);
	const cont = !!s?.actions.some((a) => a.action.type === 'continue');
	check(`${how}：記録に「続ける」が残った（次の章へ進んだ）`, cont);
	const c0 = await clock(tab);
	let c1 = c0;
	for (let i = 0; i < 10 && c1 === c0; i++) {
		await sleep(1000);
		c1 = await clock(tab);
	}
	check(`${how}：時計がまた進む`, c0 !== c1, `${c0} → ${c1}`);
	// 開き直しても、もう閉じ込められない
	await tab.go('about:blank');
	await tab.go(`${base}/town`);
	await sleep(2500);
	check(`${how}：開き直しても板は出ない`, (await dialog(tab)) === '');
}

async function main() {
	const { tab, chrome } = await openChrome(9351, { gpu: false, headless: true });
	try {
		await tab.size(1440, 900, false);
		await failedExit(tab, '続ける', () => clickText(tab, '.modal .opt', '続ける'));
		await failedExit(tab, '×', () => tab.eval(`document.querySelector('.modal .x')?.click()`));
		await failedExit(tab, 'Esc', () => tab.key('Escape'));
		await failedExit(tab, '板の外', () =>
			tab.eval(`document.querySelector('[data-testid=modal]')?.click()`)
		);
		// 学習へ：地図へ行ける
		await openWith(tab, FAILED);
		await clickText(tab, '.modal .opt', '学習へ');
		await sleep(1500);
		const path = await tab.eval<string>('location.pathname');
		check('学習へ：地図へ移った', path === '/map', path);
		// 古い保存：「新しい街で始める」が出て、押すと遊び方の板（はじめての街）になる
		await openWith(tab, OLD);
		check('古い保存：「新しい街で始める」の板が出る', (await dialog(tab)) === '新しい街で始める');
		await clickText(tab, '.modal .opt', '新しい街で始める');
		await sleep(3000);
		check('古い保存：押すと、はじめての街の板になる', (await dialog(tab)) === 'はじめに');
		await tab.key('Escape');
		await sleep(500);
		check('はじめに：Esc で閉じる', (await dialog(tab)) === '');
	} finally {
		chrome.kill();
	}
	console.log(bad ? `NG ${bad} 件` : '全て OK');
	process.exit(bad ? 1 : 0);
}
main();
