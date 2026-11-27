// 10-P 手順 4 の測り：札の字は寄っても引いても画面の上で 13〜15px か（learn-standard.md 16.3）。
//   npx tsx scripts/look-uik.ts [本番の URL の根]
// 公開 URL の /kit の「字の大きさ」の 3 つの図（倍率 0.5・1・2）で、札の種類ごとに字の画面の上の大きさを測る。
// 画面の上の大きさ ＝ 字の大きさ（図の単位）× 図の 1 単位が画面で何 px か（getScreenCTM）。
// 記録は docs/progress/shots/phase-10-P/uik.json。1 つでも範囲の外なら終わりの値 1
import { mkdirSync, writeFileSync } from 'node:fs';
import { labelOk, type LabelKind } from '../src/lib/ui/scene/label/uik.ts';
import { openChrome, sleep } from './lib/cdp.ts';

const args = process.argv.slice(2);
/** --kit：部品集の全ての字の画面の上の大きさを小さい順に並べる（判定者の目測を確かめる） */
const KIT = args.includes('--kit');
const base = (
	args.find((a) => !a.startsWith('--')) ?? 'https://devlearn.techcurrybread.workers.dev'
).replace(/\/$/, '');
const OUT = 'docs/progress/shots/phase-10-P';

type Row = { zoom: number; kind: LabelKind; text: string; px: number; ok: boolean };

const MEASURE = `(() => {
	const out = [];
	for (const st of document.querySelectorAll('.stage[data-zoom]')) {
		const zoom = Number(st.getAttribute('data-zoom'));
		for (const g of st.querySelectorAll('g[data-lk]')) {
			for (const t of g.querySelectorAll('text')) {
				const m = t.getScreenCTM();
				const fs = parseFloat(getComputedStyle(t).fontSize);
				out.push({ zoom, kind: g.getAttribute('data-lk'), text: t.textContent.trim(), px: fs * Math.hypot(m.a, m.b) });
			}
		}
	}
	return out;
})()`;

const KIT_ALL = `[...document.querySelectorAll('section[data-scheme=light] svg text')].map((t) => {
	const m = t.getScreenCTM();
	return [parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b), t.textContent.trim().slice(0, 30)];
})`;

async function main() {
	mkdirSync(OUT, { recursive: true });
	const { tab, chrome } = await openChrome(9358, { gpu: false, headless: true });
	let bad = 0;
	try {
		await tab.size(1440, 900, false);
		await tab.go(`${base}/kit`);
		await sleep(2500);
		if (KIT) {
			const all = await tab.eval<[number, string][]>(KIT_ALL);
			for (const [px, t] of all.sort((a, b) => a[0] - b[0])) console.log(px.toFixed(1), t);
			return;
		}
		const raw = await tab.eval<Omit<Row, 'ok'>[]>(MEASURE);
		const rows: Row[] = (raw ?? []).map((r) => ({
			...r,
			px: +r.px.toFixed(2),
			ok: labelOk(r.kind, r.px)
		}));
		const zooms = new Set(rows.map((r) => r.zoom));
		for (const z of [0.5, 1, 2])
			if (!zooms.has(z)) {
				console.log(`× 倍率 ${z} の図が無い`);
				bad++;
			}
		for (const r of rows) {
			console.log(`${r.ok ? 'o' : '×'} 倍率 ${r.zoom} ${r.kind} 「${r.text}」 ${r.px}px`);
			if (!r.ok) bad++;
		}
		writeFileSync(`${OUT}/uik.json`, JSON.stringify({ base, rows }, null, 1));
		console.log(bad ? `× ${bad} 件` : `o 全て範囲の中（${rows.length} 件）`);
	} finally {
		chrome.kill();
	}
	process.exit(bad ? 1 : 0);
}
main();
