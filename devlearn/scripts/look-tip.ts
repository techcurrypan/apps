// 10-P 手順 7 の確かめ：公開 URL の /kit の「構図の移り変わり」の図で、物にマウスを乗せると
// 物が浮き上がり（LS3-M4）、言葉と説明の吹き出し（最大 300px 幅・図の枠から出ない。LS3-H1）が出るかを測る（CI では走らせない）。
//   npx tsx scripts/look-tip.ts [本番の URL の根]
import { writeFileSync } from 'node:fs';
import { openChrome, sleep } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, '');
const OUT = 'docs/progress/shots/phase-10-P/tip.json';

type Probe = { term: string; x: number; y: number };
type Seen = {
	tip: string | null;
	w: number;
	inside: boolean;
	lifted: boolean;
};

async function main() {
	const { tab, chrome } = await openChrome(9358, { gpu: false, headless: true });
	const rows: (Probe & Seen & { ok: boolean })[] = [];
	try {
		await tab.size(1440, 900, false);
		await tab.go(`${base}/kit`);
		await sleep(2500);
		await tab.eval(`document.querySelector('.demo').scrollIntoView({block:'center'}); 0`);
		await sleep(600);
		// 構図が替わる前に測れるよう、物の印をその都度取る
		const ids = await tab.eval<string[]>(
			`[...new Set([...document.querySelectorAll('.demo [data-obj][data-term]')].map(e=>e.getAttribute('data-term')))]`
		);
		for (const term of ids) {
			const p = await tab.eval<Probe | null>(`(() => {
				const el = document.querySelector('.demo [data-obj][data-term="${term}"] [data-body]');
				if (!el) return null;
				const r = el.getBoundingClientRect();
				return { term: '${term}', x: r.left + r.width / 2, y: r.top + r.height / 2 };
			})()`);
			if (!p) continue;
			await tab.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
			await sleep(250);
			const s = await tab.eval<Seen>(`(() => {
				const t = document.querySelector('.demo [role=tooltip]');
				const box = document.querySelector('.demo .s3').getBoundingClientRect();
				const body = document.querySelector('.demo [data-obj][data-term="${term}"] [data-body]');
				const lifted = !!body && /translate\\(0 -8\\)/.test(body.getAttribute('transform') || '');
				if (!t) return { tip: null, w: 0, inside: false, lifted };
				const r = t.getBoundingClientRect();
				const inside = r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5;
				return { tip: t.getAttribute('data-tip'), w: Math.round(r.width), inside, lifted };
			})()`);
			rows.push({ ...p, ...s, ok: s.tip === term && s.w <= 300 && s.inside && s.lifted });
			await tab.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
			await sleep(150);
		}
		const gone = await tab.eval<boolean>(`!document.querySelector('.demo [role=tooltip]')`);
		writeFileSync(OUT, JSON.stringify({ base, rows, goneOnLeave: gone }, null, 1));
		for (const r of rows)
			console.log(
				`${r.ok ? 'o' : 'x'} ${r.term}: 吹き出し ${r.tip} 幅 ${r.w} 枠の中 ${r.inside} 浮き ${r.lifted}`
			);
		console.log(`外すと消える: ${gone ? 'o' : 'x'}`);
		if (!rows.length || rows.some((r) => !r.ok) || !gone) process.exitCode = 1;
	} finally {
		chrome.kill();
	}
}
void main();
