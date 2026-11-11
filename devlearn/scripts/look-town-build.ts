// 街づくりの操作を、街 /town#still の撮影の口から動かして確かめる（段 8-2b。CI では走らせない）。
//   npx tsx scripts/look-town-build.ts <街の URL の根> <撮った画面の置き場> [名前の頭]
// 9 つの空き区画を住宅地に指定し、速さ 3 で時計を進めて建つのを待ち、東の畑へ道路を引く。
// 終わりに要望に応え、手の記録から作り直した状態が、遊んだ後の状態と一字も違わないことを確かめる（15.9）。
import { openChrome, sleep } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');
const outDir = process.argv[3] ?? 'docs/progress/shots';
const prefix = process.argv[4] ?? 'phase-8';

type Snap = {
	money: number;
	zoned: number;
	placed: number;
	done: number;
	roads: number;
	lots: number;
	pop: string;
};
const SNAP = `(() => { const s = window.__game.state(); const now = window.__game.S.minute;
	return { money: s.money, zoned: s.lots.filter((l) => l.zone).length, placed: s.placed.length,
		done: s.placed.filter((p) => true).length, roads: s.roads.length, lots: s.lots.length,
		pop: document.querySelector('.stat strong')?.textContent ?? '' }; })()`;

async function main() {
	const { tab, chrome } = await openChrome(9335, { gpu: process.env.GPU !== '0' });
	let bad = 0;
	const check = (name: string, ok: boolean, detail: string) => {
		console.log(`${ok ? 'OK ' : 'NG '} ${name}  ${detail}`);
		if (!ok) bad++;
	};
	try {
		await tab.size(1280, 720, false);
		await tab.scheme(true);
		await tab.go(`${base}/town#still`);
		for (let i = 0; i < 300 && !(await tab.eval<boolean>('!!window.__ready')); i++)
			await sleep(200);
		const s0 = await tab.eval<Snap>(SNAP);
		await tab.eval(
			`(() => { const g = window.__game; g.setTool('home'); for (let i = 0; i < 9; i++) g.placeOnLot(i); })()`
		);
		const s1 = await tab.eval<Snap>(SNAP);
		check(
			'9 区画を住宅地に指定した',
			s1.zoned === 9 && s1.money === s0.money - 180,
			`資金 ${s0.money} → ${s1.money}`
		);
		await tab.eval(
			`(() => { const g = window.__game; g.setSpeed(3); g.cam.v = { tx: 200, tz: 125, yaw: 0.6, pitch: 0.6, dist: 150 }; window.__snap(); window.__frame(300, 0.1); })()`
		);
		const s2 = await tab.eval<Snap>(SNAP);
		check(
			'時計を進めると区画に家が建つ',
			s2.placed > 0,
			`建った ${s2.placed} 棟 ・ 人口 ${s2.pop}`
		);
		await tab.eval(
			`(() => { const g = window.__game; g.setSpeed(0); window.__frame(5, 0.05); })()`
		);
		await tab.shot(`${outDir}/${prefix}-build-lots.png`);
		const r = await tab.eval<{
			ok: boolean;
			why: string;
			L: number;
		}>(`(() => { const g = window.__game;
			const a = g.snapPoint([249, -80]); const plan = g.roadPlan(a, { x: 400, z: -80 });
			if (plan.ok) g.addRoad(plan); return { ok: plan.ok, why: plan.why, L: plan.L }; })()`);
		const s3 = await tab.eval<Snap>(SNAP);
		check(
			'東の畑へ道路を引くと、沿いに空き区画ができる',
			r.ok && s3.roads === 1 && s3.lots > 9,
			`${r.L} m ・ 区画 ${s2.lots} → ${s3.lots}`
		);
		const n = await tab.eval<string>(
			`(() => { const g = window.__game; const a = g.snapPoint([249, -80]); return g.roadPlan(a, { x: 150, z: -80 }).why; })()`
		);
		check('街の中には引けない理由が出る', n.includes('街の中には引けない'), n);
		await tab.eval(
			`(() => { const g = window.__game; g.cam.v = { tx: 330, tz: -60, yaw: 0.9, pitch: 0.7, dist: 220 }; window.__snap(); window.__frame(5, 0.05); })()`
		);
		await tab.shot(`${outDir}/${prefix}-build-road.png`);
		const rp = await tab.eval<{ n: number; same: boolean; answered: string }>(`(() => {
			const g = window.__game; g.answer('board', 'out'); g.setSpeed(2); window.__frame(60, 0.1);
			const a = JSON.stringify(g.town()), b = JSON.stringify(g.replayed());
			return { n: g.save().actions.length, same: a === b, answered: JSON.stringify(g.town().answered) }; })()`);
		check(
			'手の記録から作り直すと、遊んだ後と同じ状態になる',
			rp.same && rp.n === 11,
			`記録 ${rp.n} 手 ・ 応えた ${rp.answered}`
		);
	} finally {
		chrome.kill();
	}
	if (bad) process.exit(1);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
