// 10-P 手順 5 の測り：構図の移り変わりで物が飛ばずに動くか（learn-standard.md 16.1 LS3-S5）。
//   npx tsx scripts/look-move.ts [本番の URL の根]
// 公開 URL の /kit の「構図の移り変わり」の見本を 0.1 秒ごとに 8 秒測り、物（data-obj）の外枠の中心が
// 0.1 秒で動いた量が、その移り変わりの全体の動きの 1/4 を超えないこと（0.9 秒で滑らかに動く）を確かめる。
// 記録は docs/progress/shots/phase-10-P/move.json。飛んだ物があれば終わりの値 1
import { mkdirSync, writeFileSync } from 'node:fs';
import { openChrome, sleep } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, '');
const OUT = 'docs/progress/shots/phase-10-P';
type Snap = { step: number; objs: Record<string, [number, number, number]> };

const SNAP = `(() => {
	const d = document.querySelector('.demo');
	const out = {};
	for (const g of d.querySelectorAll('[data-obj]')) {
		const r = g.getBoundingClientRect();
		const op = parseFloat(g.closest('[opacity]')?.getAttribute('opacity') ?? '1');
		out[g.getAttribute('data-obj')] = [r.x + r.width / 2, r.y + r.height / 2, op];
	}
	return { step: Number(d.getAttribute('data-demo-step')), objs: out };
})()`;

async function main() {
	mkdirSync(OUT, { recursive: true });
	const { tab, chrome } = await openChrome(9360, { gpu: false, headless: true });
	const snaps: Snap[] = [];
	try {
		await tab.size(1440, 900, false);
		await tab.go(`${base}/kit`);
		await sleep(2500);
		await tab.eval(`document.querySelector('.demo').scrollIntoView()`);
		for (let i = 0; i < 80; i++) {
			const s = await tab.eval<Snap>(SNAP);
			if (!s)
				throw new Error(
					'見本が読めない：' +
						JSON.stringify(
							await tab.eval('[!!document.querySelector(".demo"), location.href, document.title]')
						)
				);
			snaps.push(s);
			await sleep(100);
		}
	} finally {
		chrome.kill();
	}
	// 移り変わりごとに、続けて出る物の全体の動きと、0.1 秒の最大の動きを比べる
	let bad = 0;
	let moves = 0;
	const rows: { id: string; total: number; maxStep: number; ok: boolean }[] = [];
	let start = 0;
	for (let i = 1; i <= snaps.length; i++) {
		if (i < snaps.length && snaps[i].step === snaps[start].step) continue;
		const seg = snaps.slice(Math.max(0, start - 1), i);
		const ids = Object.keys(seg[0]?.objs ?? {}).filter((id) => seg.every((s) => s.objs[id]));
		for (const id of ids) {
			const a = seg[0].objs[id];
			const b = seg[seg.length - 1].objs[id];
			const total = Math.hypot(b[0] - a[0], b[1] - a[1]);
			if (total < 20) continue;
			let maxStep = 0;
			for (let k = 1; k < seg.length; k++) {
				const p = seg[k - 1].objs[id];
				const q = seg[k].objs[id];
				maxStep = Math.max(maxStep, Math.hypot(q[0] - p[0], q[1] - p[1]));
			}
			const ok = maxStep <= total / 4;
			rows.push({ id, total: +total.toFixed(1), maxStep: +maxStep.toFixed(1), ok });
			moves++;
			if (!ok) bad++;
			console.log(
				`${ok ? 'o' : '×'} ${id} 全体 ${total.toFixed(0)}px・0.1 秒の最大 ${maxStep.toFixed(0)}px`
			);
		}
		start = i;
	}
	if (!moves) {
		console.log('× 動いた物が無い（見本が無いか、止まっている）');
		bad++;
	}
	writeFileSync(`${OUT}/move.json`, JSON.stringify({ base, rows }, null, 1));
	console.log(bad ? `× ${bad} 件` : `o 飛んだ物は無い（${moves} 件の動き）`);
	process.exit(bad ? 1 : 0);
}
main();
