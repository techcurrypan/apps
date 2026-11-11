// 要望の解き方を、街 /town#still の撮影の口から動かして確かめる（段 8-2c。CI では走らせない）。
//   npx tsx scripts/look-town-desk.ts <街の URL の根> <撮った画面の置き場> [名前の頭]
// 届いた要望 3 件 → 学んだ手で調べる・示す・直す（仕組みの建物が建つ）→ 外に頼む（次の朝に箱）→ 地下の仕組み → 携帯の幅。
import { MOVES } from '../src/lib/game/data.ts';
import { openChrome, sleep, type Tab } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');
const outDir = process.argv[3] ?? 'docs/progress/shots';
const prefix = process.argv[4] ?? 'phase-8';

type ReqLite = { id: string; truth: string; status: string; doubt: number; confirmed: boolean };

async function ready(tab: Tab) {
	for (let i = 0; i < 300 && !(await tab.eval<boolean>('!!window.__ready')); i++) await sleep(200);
}

async function main() {
	const { tab, chrome } = await openChrome(9336, { gpu: process.env.GPU !== '0' });
	let bad = 0;
	const check = (name: string, ok: boolean, detail: string) => {
		console.log(`${ok ? 'OK ' : 'NG '} ${name}  ${detail}`);
		if (!ok) bad++;
	};
	const reqs = () =>
		tab.eval<ReqLite[]>(
			`window.__game.town().desk.requests.map((r) => ({ id: r.id, truth: r.truth, status: r.status, doubt: r.doubt, confirmed: r.confirmed }))`
		);
	const move = (label: string) =>
		tab.eval<string>(`(() => { const g = window.__game; const d = g.ui.dialog;
			const k = d.moves.findIndex((m) => m.label === ${JSON.stringify(label)});
			if (k < 0) return 'no move: ' + ${JSON.stringify(label)};
			const m = d.moves[k]; if (!m.ok) return 'NG ' + m.why; g.doMove(k); return 'ok'; })()`);
	try {
		await tab.size(1280, 720, false);
		await tab.scheme(true);
		await tab.go(`${base}/town#still`);
		await ready(tab);
		const r0 = await reqs();
		const ui0 = await tab.eval<{ n: number; markers: number; money: number; slots: number }>(
			`({ n: window.__game.ui.reqs.length, markers: document.querySelectorAll('.marker').length, money: window.__game.town().build.money, slots: window.__game.ui.slots })`
		);
		check(
			'始まり：1 日目 8:00 に要望 3 件、印が建物の上に立つ、資金 600',
			r0.length === 3 && ui0.n === 3 && ui0.markers >= 1 && ui0.money === 600,
			`要望 ${ui0.n} 件 ・ 印 ${ui0.markers} ・ 資金 ${ui0.money} ・ 勤務 ${ui0.slots} 時間`
		);
		// 1 件目に効く手だけを学んだことにする
		const r = r0[0];
		const t = MOVES.find((m) => m.tests.includes(r.truth));
		const f = MOVES.find((m) => m.fixes.includes(r.truth));
		const learned = [t?.lesson, f?.lesson].filter(Boolean);
		await tab.eval(`window.__game.setLearned(${JSON.stringify(learned)})`);
		await tab.eval(`window.__game.openReq(${JSON.stringify(r.id)})`);
		const dlg = await tab.eval<{ cands: number; any: number; learned: number; lessons: number }>(
			`(() => { const d = window.__game.ui.dialog; return { cands: d.cands.length, any: d.moves.filter((m) => m.kind === 'any').length, learned: d.moves.filter((m) => m.kind === 'learned').length, lessons: d.lessons.length }; })()`
		);
		check(
			'要望の板：候補 4 札、いつでもの手 5 つ、学んだ手、効くレッスン',
			dlg.cands === 4 && dlg.any === 5 && dlg.learned >= 1 && dlg.lessons >= 1,
			JSON.stringify(dlg)
		);
		await tab.eval(
			`(() => { window.__game.S.minute = 9 * 60; window.__snap(); window.__frame(30, 0.05); })()`
		);
		await sleep(400);
		await tab.shot(`${outDir}/${prefix}-req.png`);
		const a = await move(`${t?.name}（調べる）`);
		const r1 = (await reqs())[0];
		check('学んだ手で調べると、原因が確定する', a === 'ok' && r1.confirmed, a);
		if (r1.doubt > 0) {
			const b = await move('示す（根拠を見せる）');
			check('根拠を示すと、疑いが 0 になる', b === 'ok' && (await reqs())[0].doubt === 0, b);
		}
		await tab.shot(`${outDir}/${prefix}-req-confirmed.png`);
		if (f) {
			const c = await move(`${f.name}（直す）`);
			const sys = await tab.eval<string[]>(`window.__game.town().systems.map((x) => x.field)`);
			check(
				'学んだ手で直すと、その分野の仕組みの建物が建つ',
				c === 'ok' && sys.includes(f.lesson.split('-')[0]),
				`${c} ・ 建った ${sys.join(',')}`
			);
			await tab.eval(
				`(() => { window.__frame(40, 0.05); window.__snap(); window.__frame(40, 0.05); })()`
			);
			await tab.shot(`${outDir}/${prefix}-system-rise.png`);
			await tab.eval(`window.__frame(60, 0.05)`);
			await tab.shot(`${outDir}/${prefix}-system.png`);
		}
		// 2 件目を外に頼む → 次の朝に箱
		const r2 = r0[1];
		await tab.eval(`window.__game.openReq(${JSON.stringify(r2.id)})`);
		const o = await move('外に頼む');
		await tab.eval(`window.__game.nextMorning()`);
		const boxes = await tab.eval<number>(
			`window.__game.town().boxes.reduce((a, b) => a + b.count, 0)`
		);
		const st = (await reqs()).find((x) => x.id === r2.id);
		check(
			'外に頼むと、次の朝に片付き、依頼主の建物の隣に箱が建つ',
			o === 'ok' && st?.status === 'solved' && boxes === 1,
			`${o} ・ ${st?.status} ・ 箱 ${boxes}`
		);
		const n2 = await tab.eval<number>(
			`window.__game.town().desk.requests.filter((x) => x.status === 'open').length`
		);
		check('2 日目の朝に、新しい要望が 3 件届く', n2 >= 3, `受付中 ${n2} 件`);
		await tab.eval(
			`(() => { const g = window.__game; g.setView('infra'); g.cam.v = { tx: 0, tz: 60, yaw: 0.4, pitch: 0.8, dist: 420 }; g.S.minute = 960; window.__snap(); window.__frame(40, 0.05); })()`
		);
		await sleep(300);
		await tab.shot(`${outDir}/${prefix}-infra-desk.png`);
		// 携帯の幅
		await tab.size(390, 844, true);
		await tab.eval(
			`(() => { const g = window.__game; g.setView('ground'); g.S.minute = 10 * 60; window.__frame(5, 0.05); })()`
		);
		const open = (await reqs()).find((x) => x.status === 'open');
		await tab.eval(`window.__game.openReq(${JSON.stringify(open?.id)})`);
		await tab.eval(`window.__frame(10, 0.05)`);
		await sleep(400);
		const sw = await tab.eval<{ w: number; sw: number }>(
			`({ w: innerWidth, sw: document.documentElement.scrollWidth })`
		);
		check('携帯の幅で、要望の板が横にはみ出さない', sw.sw <= sw.w, `${sw.sw} ≤ ${sw.w}`);
		await tab.shot(`${outDir}/${prefix}-mobile-req.png`);
		const c2 = await move('様子を聞く');
		check('携帯の幅で、要望の板から手を打てる', c2 === 'ok', c2);
		await tab.eval(`(() => { window.__game.closeDlg(); window.__frame(10, 0.05); })()`);
		await tab.shot(`${outDir}/${prefix}-mobile.png`);
	} finally {
		chrome.kill();
	}
	if (bad) process.exit(1);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
