// 10-P 手順 8 の確かめ：公開 URL の /kit の「試す」で、つまみを動かすと結果の表が計算し直され、
// 予想の問いに答えると当たり外れと理由が出るかを測る（CI では走らせない）。
//   npx tsx scripts/look-lab.ts [本番の URL の根]
import { writeFileSync } from 'node:fs';
import { openChrome, sleep } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, '');
const OUT = 'docs/progress/shots/phase-10-P/lab.json';

async function main() {
	const { tab, chrome } = await openChrome(9359, { gpu: false, headless: true });
	try {
		await tab.size(1440, 900, false);
		await tab.go(`${base}/kit`);
		await sleep(2000);
		const rows = () =>
			tab.eval<string[]>(
				`[...document.querySelectorAll('.lab')[0].querySelectorAll('.res tr')].map(r=>r.textContent.trim())`
			);
		const before = await rows();
		// TCP の RTT を 30 → 15 ms にする
		await tab.eval(`(() => {
			const i = document.querySelector('.lab [data-knob="rtt"] input');
			const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
			set.call(i, '15'); i.dispatchEvent(new Event('input', { bubbles: true }));
		})()`);
		await sleep(300);
		const after = await rows();
		const time = (rs: string[]) => rs.find((r) => r.startsWith('1 MB が届くまで')) ?? '';
		const halved = time(before).includes('210') && time(after).includes('105');
		// 予想の問い 1 に正しい答え（2 つ目）、問い 2 に外れ（1 つ目）
		await tab.eval(`(() => {
			const ps = document.querySelectorAll('.lab')[0].querySelectorAll('.preds li');
			ps[0].querySelectorAll('button')[1].click();
			ps[1].querySelectorAll('button')[0].click();
		})()`);
		await sleep(300);
		const ans = await tab.eval<string[]>(
			`[...document.querySelectorAll('.lab')[0].querySelectorAll('.ans')].map(a=>a.textContent.trim())`
		);
		const answered = ans.length === 2 && ans[0].startsWith('当たり') && ans[1].startsWith('外れ');
		const described = await tab.eval<boolean>(
			`[...document.querySelectorAll('.lab [data-knob]')].every(l => (l.getAttribute('title')||'').length > 0 && l.querySelector('small').textContent.trim().length > 0)`
		);
		// 図（第 19 章「つまみの値で計算し直した図」）：棒の数が往復の回数と同じ・値を変えると図が変わる・動き続ける
		const bars = () =>
			tab.eval<number>(
				`document.querySelectorAll('.lab-fig')[0].querySelectorAll('[data-obj^="bar-"]').length`
			);
		const barsBefore = await bars();
		await tab.eval(`(() => {
			const i = document.querySelector('.lab [data-knob="loss"] input');
			const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
			set.call(i, '2'); i.dispatchEvent(new Event('input', { bubbles: true }));
		})()`);
		await sleep(300);
		const rtts = Number(
			((await rows()).find((r) => r.startsWith('往復の回数')) ?? '').replace(/\D/g, '')
		);
		const barsAfter = await bars();
		const redrawn = barsBefore === 7 && barsAfter === rtts && barsAfter > 7;
		const shape = () =>
			tab.eval<string>(
				`document.querySelectorAll('.lab-fig')[0].querySelector('svg').innerHTML.length + ':' + [...document.querySelectorAll('.lab-fig')[0].querySelectorAll('[data-obj^="bar-"] path')].slice(-1).map(p=>p.getAttribute('d')).join()`
			);
		await sleep(200);
		const s1 = await shape();
		await sleep(400);
		const s2 = await shape();
		const moving = s1 !== s2;
		// k8s の図：Pod の数が「置けた」と Pending の和、台がノードの数
		const pods = await tab.eval<number>(
			`document.querySelectorAll('.lab-fig')[1].querySelectorAll('g[data-obj^="web-"]').length`
		);
		const nodes = await tab.eval<number>(
			`document.querySelectorAll('.lab-fig')[1].querySelectorAll('[data-term="node"]').length`
		);
		const k8sOk = pods === 4 && nodes === 3;
		for (const [i, n] of [
			[0, 'tcp'],
			[1, 'k8s']
		] as const) {
			await tab.eval(
				`document.querySelectorAll('.lab-pair')[${i}].scrollIntoView({block:'start'})`
			);
			await sleep(1500);
			await tab.shot(`docs/progress/shots/phase-10-P/lab-${n}.png`);
		}
		console.log(
			`${redrawn ? 'o' : 'x'} 喪失率 2% で棒が ${barsBefore} → ${barsAfter} 本（往復 ${rtts} 回）`
		);
		console.log(`${moving ? 'o' : 'x'} 図が動き続ける（棒が育つ）`);
		console.log(`${k8sOk ? 'o' : 'x'} k8s の図：Pod ${pods} 個・台 ${nodes} 台`);
		const res = {
			base,
			before,
			after,
			halved,
			ans,
			answered,
			described,
			barsBefore,
			barsAfter,
			rtts,
			redrawn,
			moving,
			pods,
			nodes
		};
		writeFileSync(OUT, JSON.stringify(res, null, 1));
		console.log(`${halved ? 'o' : 'x'} RTT 30→15 ms で 1 MB の時間が 210→105 ms`);
		console.log(`${answered ? 'o' : 'x'} 予想の問いの当たり・外れと理由`);
		console.log(`${described ? 'o' : 'x'} つまみに説明`);
		if (!halved || !answered || !described || !redrawn || !moving || !k8sOk) process.exitCode = 1;
	} finally {
		chrome.kill();
	}
}
void main();
