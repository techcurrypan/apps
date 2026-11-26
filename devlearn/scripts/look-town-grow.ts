// 8-R の手順 6（D-27・A-19b・G-12〜G-15・S-6）：街は空き地から始まり、学ぶと育つことを、公開 URL で確かめる（CI では走らせない）。
//   npx tsx scripts/look-town-grow.ts [街の URL の根]
// 初めて開く → 空き地と遊び方 3 行 → 時計が進んでも失敗しない → 最初のレッスンに合格（学習の記録に修了を置き、窓に戻る）
// → 足場から家が建ち、住民が来る → 次の朝に要望が届く → 応える → 板から抜けられる。撮った画面は docs/progress/shots/ に置く
import { openChrome, sleep, type Tab } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, '');
const SHOT = 'docs/progress/shots/phase-8r-';

let bad = 0;
const check = (name: string, ok: boolean, detail = '') => {
	console.log(`${ok ? 'OK ' : 'NG '} ${name}  ${detail}`);
	if (!ok) bad++;
};

const dialog = (tab: Tab) =>
	tab.eval<string>(
		`document.querySelector('.modal [role=dialog]')?.getAttribute('aria-label') ?? ''`
	);
const dialogText = (tab: Tab) =>
	tab.eval<string>(`document.querySelector('.modal [role=dialog]')?.textContent ?? ''`);
const clickText = (tab: Tab, sel: string, text: string) =>
	tab.eval<boolean>(
		`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.textContent.includes(${JSON.stringify(text)})); if (!b) return false; b.click(); return true; })()`
	);
const stat = (tab: Tab, name: string) =>
	tab.eval<number>(
		`(() => { const s = [...document.querySelectorAll('.stat')].find((x) => x.querySelector('span')?.textContent === ${JSON.stringify(name)}); return s ? Number(s.querySelector('strong').textContent.replace(/[^0-9]/g, '')) : -1; })()`
	);
const reqCount = (tab: Tab) =>
	tab.eval<number>(`document.querySelectorAll('.reqList .req:not(.done)').length`);
const toasts = (tab: Tab) =>
	tab.eval<string>(
		`[...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' ／ ')`
	);
const clock = (tab: Tab) =>
	tab.eval<string>(`document.querySelector('.time .d strong')?.textContent ?? ''`);

async function ready(tab: Tab) {
	for (let i = 0; i < 100; i++) {
		await sleep(100);
		if (
			await tab.eval<boolean>(
				`!!document.querySelector('#view') && !document.querySelector('.boot')`
			)
		)
			break;
	}
	await sleep(800);
}

async function main() {
	const { tab, chrome } = await openChrome(9352, { gpu: false, headless: true });
	try {
		await tab.size(1440, 900, false);
		// はじめての人：街の保存も学習の記録も無い
		await tab.go(`${base}/terms`);
		await tab.eval(
			`localStorage.removeItem('devlearn.town'); localStorage.removeItem('devlearn.progress'); localStorage.removeItem('devlearn.town.known')`
		);
		await tab.go(`${base}/town`);
		await ready(tab);
		check('初めて開く：「はじめに」の板が出る', (await dialog(tab)) === 'はじめに');
		const intro = await dialogText(tab);
		check(
			'はじめに：空き地から・学ぶと建つ・住む人から要望',
			/空き地/.test(intro) && /学ぶと建つ/.test(intro) && /住む人から要望/.test(intro)
		);
		check('はじめに：最初のレッスンへの道がある', /最初のレッスンへ/.test(intro));
		await tab.shot(`${SHOT}intro.png`);
		await tab.key('Escape');
		await sleep(500);
		check('はじめに：Esc で閉じる', (await dialog(tab)) === '');
		check('空き地：人口 0', (await stat(tab, '人口')) === 0, `人口 ${await stat(tab, '人口')}`);
		check('空き地：要望 0 件', (await reqCount(tab)) === 0);
		await tab.shot(`${SHOT}empty.png`);
		// 時計は進む。速く進めても、住民がいない間は失敗しない
		const c0 = await clock(tab);
		await tab.key('3');
		await sleep(12000);
		const c1 = await clock(tab);
		check('時計が進む', c0 !== c1, `${c0} → ${c1}`);
		for (let k = 0; k < 2; k++) {
			await tab.key('n');
			await sleep(400);
			await clickText(tab, '.toast button', '送る');
			await sleep(1500);
		}
		check(
			'空き地のまま朝を 2 回送っても、章の結果の板は出ない',
			(await dialog(tab)) === '',
			await dialog(tab)
		);
		check('空き地のまま朝を送っても、要望は届かない', (await reqCount(tab)) === 0);
		// 最初のレッスンに合格（学習の画面が書く修了の記録と同じ物を置き、窓に戻る）
		await tab.eval(
			`localStorage.setItem('devlearn.progress', JSON.stringify({ v: 1, done: ['net-101'] })); window.dispatchEvent(new Event('focus'))`
		);
		await sleep(1500);
		const t = await toasts(tab);
		check(
			'合格：「○○を学んで … 棟が建ち始めた」の知らせ',
			/を学んで \d+ 棟が建ち始めた/.test(t),
			t.slice(0, 120)
		);
		const saved = await tab.eval<{
			version: number;
			actions: { action: { type: string; lesson?: string } }[];
		}>(`JSON.parse(localStorage.getItem('devlearn.town') || 'null')`);
		check(
			'合格：手の記録に learn が入る（保存の形 2）',
			saved?.version === 2 &&
				saved.actions.some((a) => a.action.type === 'learn' && a.action.lesson === 'net-101')
		);
		await clickText(tab, '.toast button', '見に行く');
		await sleep(2500);
		await tab.shot(`${SHOT}scaffold.png`);
		// 画面の真ん中（見に行った建物）を Enter で選ぶと、札に「○○を学んで建った」
		await tab.eval(`document.querySelector('#view')?.focus()`);
		await tab.key('Enter');
		await sleep(600);
		const info = await tab.eval<string>(`document.querySelector('.info')?.textContent ?? ''`);
		check('建物の札：「○○」を学んで建った', /を学んで建った/.test(info), info.slice(0, 80));
		await tab.key('Escape');
		// 次の朝：家が建ち終え、住民が来て、要望が届く
		await tab.key('n');
		await sleep(400);
		await clickText(tab, '.toast button', '送る');
		await sleep(2500);
		const pop = await stat(tab, '人口');
		check('次の朝：住民が来た', pop > 0, `人口 ${pop}`);
		const n = await reqCount(tab);
		check('次の朝：住民から要望が届いた（1〜3 件）', n >= 1 && n <= 3, `${n} 件`);
		await tab.shot(`${SHOT}first-home.png`);
		// 応える：要望を開いて、学ばずに打てる手（様子を聞く）を打つ
		await tab.eval(`document.querySelector('.reqList .req')?.click()`);
		await sleep(800);
		const d = await dialog(tab);
		check('要望の板が開く', d !== '', d);
		await tab.shot(`${SHOT}request.png`);
		const asked = await clickText(tab, '.modal button', '様子を聞く');
		await sleep(1200);
		check('学ばずに打てる手（様子を聞く）を打てる', asked);
		await tab.key('Escape');
		await sleep(600);
		check('要望の板：Esc で抜ける', (await dialog(tab)) === '');
		// 開き直しても同じ街（記録から作り直す）
		await tab.go('about:blank');
		await tab.go(`${base}/town`);
		await ready(tab);
		check('開き直しても住民がいる', (await stat(tab, '人口')) > 0);
		check(
			'開き直しても板に閉じ込められない',
			(await dialog(tab)) === '' || (await dialog(tab)) === 'はじめに'
		);
	} finally {
		chrome.kill();
	}
	console.log(bad ? `NG ${bad} 件` : '全て OK');
	process.exit(bad ? 1 : 0);
}
main();
