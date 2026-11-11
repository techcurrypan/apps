// 街 /town を、試作 docs/prototype/minato.html と同じ角度・時刻で撮って並べる（city-standard.md 第 6 章。CI では走らせない）。
//   npx tsx scripts/look-town.ts <街の URL の根> <撮った画面の置き場> [名前の頭]
// 例: npx tsx scripts/look-town.ts https://devlearn.techcurrybread.workers.dev docs/progress/shots phase-8
// 試作は file:/// で開く。どちらも URL の末尾に #still を付け、window.__game で視点と時刻を置き、__frame で描く。
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { openChrome, sleep, type Tab } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');
const outDir = process.argv[3] ?? 'docs/progress/shots';
const prefix = process.argv[4] ?? 'phase-8';
const PORT = 9334;

type View = {
	name: string;
	v: { tx: number; tz: number; yaw: number; pitch: number; dist: number };
	minute: number;
	view: string;
};
// city-standard.md 第 6 章の 5 枚
const VIEWS: View[] = [
	{
		name: 'all',
		v: { tx: 20, tz: -20, yaw: 0.75, pitch: 0.5, dist: 300 },
		minute: 960,
		view: 'ground'
	},
	{
		name: 'plaza',
		v: { tx: 30, tz: -30, yaw: 0.9, pitch: 0.42, dist: 130 },
		minute: 960,
		view: 'ground'
	},
	{
		name: 'harbor',
		v: { tx: 150, tz: 185, yaw: 2.4, pitch: 0.35, dist: 130 },
		minute: 1000,
		view: 'ground'
	},
	{
		name: 'night',
		v: { tx: 20, tz: 0, yaw: 0.6, pitch: 0.42, dist: 380 },
		minute: 1230,
		view: 'ground'
	},
	{
		name: 'infra',
		v: { tx: 0, tz: 60, yaw: 0.4, pitch: 0.8, dist: 420 },
		minute: 960,
		view: 'infra'
	}
];

async function waitReady(tab: Tab) {
	for (let i = 0; i < 300; i++) {
		if (await tab.eval<boolean>('!!window.__ready')) return true;
		await sleep(200);
	}
	return false;
}

async function shoot(tab: Tab, url: string, who: string) {
	await tab.go(url);
	if (!(await waitReady(tab))) throw new Error(`${who}: 街が描けなかった（${url}）`);
	// 届いた要望の知らせが出てから撮る。試作は 1.8 秒後（実時間）、本番は始まりから 20 分後（ゲーム内の時刻）に届くので、
	// どちらにも同じだけ時計を進めて（速さ 1 で 25 コマ × 0.1 秒 = 25 分）、2.6 秒待つ
	await tab.eval('(() => { window.__game.setSpeed(1); window.__frame(25, 0.1); })()');
	await sleep(2600);
	for (const s of VIEWS) {
		await tab.eval(`(() => {
			const g = window.__game;
			g.setSpeed(0);
			g.cam.v = ${JSON.stringify(s.v)};
			g.S.minute = ${s.minute};
			g.setView(${JSON.stringify(s.view)});
			window.__snap();
			window.__frame(40, 0.05);
		})()`);
		await sleep(300);
		await tab.shot(`${outDir}/${prefix}-${s.name}-${who}.png`);
		console.log(`撮った ${prefix}-${s.name}-${who}.png`);
	}
}

/** 2 枚を左右に並べた 1 枚を作り、3D の部分（板を避けた真ん中）で色が 24 より違う点の割合を返す */
async function pair(tab: Tab, left: string, right: string, out: string): Promise<number> {
	const url = (f: string) => 'data:image/png;base64,' + readFileSync(f).toString('base64');
	await tab.go('about:blank');
	const r = await tab.eval<{ png: string; diff: number }>(`(async () => {
		const load = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u; });
		const [a, b] = await Promise.all([load(${JSON.stringify(url(left))}), load(${JSON.stringify(url(right))})]);
		const c = document.createElement('canvas'); c.width = a.width * 2 + 16; c.height = a.height + 40;
		const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
		g.drawImage(a, 0, 40); g.drawImage(b, a.width + 16, 40);
		g.fillStyle = '#fff'; g.font = '20px sans-serif'; g.fillText('試作 minato.html#still', 12, 28); g.fillText('本番 /town#still', a.width + 28, 28);
		const box = [330, 230, 620, 390];
		const da = g.getImageData(box[0], 40 + box[1], box[2], box[3]).data, db = g.getImageData(a.width + 16 + box[0], 40 + box[1], box[2], box[3]).data;
		let n = 0; for (let k = 0; k < da.length; k += 4) if (Math.max(Math.abs(da[k] - db[k]), Math.abs(da[k + 1] - db[k + 1]), Math.abs(da[k + 2] - db[k + 2])) > 24) n++;
		return { png: c.toDataURL(${JSON.stringify(out.endsWith('.jpg') ? 'image/jpeg' : 'image/png')}, 0.88), diff: (100 * n) / (box[2] * box[3]) };
	})()`);
	writeFileSync(out, Buffer.from(r.png.split(',')[1], 'base64'));
	return r.diff;
}

async function main() {
	const { tab, chrome } = await openChrome(PORT, { gpu: process.env.GPU !== '0' });
	try {
		await tab.size(1280, 720, false);
		await tab.scheme(true);
		const proto = pathToFileURL(resolve('docs/prototype/minato.html')).href + '#still';
		// ONLY_PAIR=1 なら撮り直さず、置き場にある 2 枚を並べ直すだけ
		if (process.env.ONLY_PAIR !== '1') {
			await shoot(tab, proto, 'proto');
			await shoot(tab, `${base}/town#still`, 'town');
		}
		if (process.env.PAIR !== '0')
			for (const s of VIEWS) {
				const f = (who: string) => `${outDir}/${prefix}-${s.name}-${who}.png`;
				const d = await pair(tab, f('proto'), f('town'), `${outDir}/${prefix}-${s.name}-pair.jpg`);
				console.log(`並べた ${prefix}-${s.name}-pair.jpg  3D の部分で違う点 ${d.toFixed(2)}%`);
			}
	} finally {
		chrome.kill();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
