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
		const res = { base, before, after, halved, ans, answered, described };
		writeFileSync(OUT, JSON.stringify(res, null, 1));
		console.log(`${halved ? 'o' : 'x'} RTT 30→15 ms で 1 MB の時間が 210→105 ms`);
		console.log(`${answered ? 'o' : 'x'} 予想の問いの当たり・外れと理由`);
		console.log(`${described ? 'o' : 'x'} つまみに説明`);
		if (!halved || !answered || !described) process.exitCode = 1;
	} finally {
		chrome.kill();
	}
}
void main();
