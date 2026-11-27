// 10-P 手順 8 の確かめ：公開 URL の /kit の「思い出す」で、5 種の問い（並べる・図を押す・選ぶ・数・説明）に答えると
// 当たり外れと理由が出て、最後に点と手帳の 1 枚が出るかを測る（CI では走らせない）。
//   npx tsx scripts/look-recall.ts [本番の URL の根]
import { writeFileSync } from 'node:fs';
import { openChrome, sleep } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, '');
const OUT = 'docs/progress/shots/phase-10-P';

async function main() {
	const { tab, chrome } = await openChrome(9363, { gpu: false, headless: true });
	try {
		await tab.size(1440, 900, false);
		await tab.go(`${base}/kit`);
		await sleep(2000);
		const P = `document.querySelector('.recall')`;
		const F = `document.querySelector('.recall-pair .lab-fig')`;
		const res = () =>
			tab.eval<string>(`(${P}.querySelector('.res')||{textContent:''}).textContent.trim()`);
		const next = () =>
			tab.eval(
				`[...${P}.querySelectorAll('button')].find(b=>b.textContent.includes('次の問い')||b.textContent.includes('点を見る')).click()`
			);
		const fill = (sel: string, v: string) =>
			tab.eval(`(() => { const i = ${P}.querySelector('${sel}');
				const proto = i.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
				Object.getOwnPropertyDescriptor(proto, 'value').set.call(i, ${JSON.stringify(v)});
				i.dispatchEvent(new Event('input', { bubbles: true })); ${P}.querySelector('form').requestSubmit(); })()`);
		const got: [string, string][] = [];
		// 1 並べる：崩したまま答える → 外れと理由
		await tab.eval(
			`[...${P}.querySelectorAll('button')].find(b=>b.textContent.includes('これで答える')).click()`
		);
		await sleep(150);
		got.push(['並べる', await res()]);
		await next();
		await sleep(150);
		// 2 図を押す：光っている物の数と、再送キューを押す
		const lit = await tab.eval<number>(`${F}.querySelectorAll('g.can').length`);
		await tab.eval(`document.querySelector('.recall-pair').scrollIntoView({block:'start'})`);
		await sleep(800);
		await tab.shot(`${OUT}/recall-hit.png`);
		await tab.eval(
			`${F}.querySelector('g[data-obj="rtx"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`
		);
		await sleep(200);
		got.push(['図を押す', await res()]);
		const green = await tab.eval<number>(
			`[...${F}.querySelectorAll('ellipse')].filter(e=>e.style.stroke.includes('green')).length`
		);
		await next();
		await sleep(150);
		// 3 選ぶ
		await tab.eval(`${P}.querySelectorAll('.opts button')[1].click()`);
		await sleep(150);
		got.push(['選ぶ', await res()]);
		await next();
		await sleep(150);
		// 4 数
		await fill('input', '14,480');
		await sleep(150);
		got.push(['数', await res()]);
		await next();
		await sleep(150);
		// 5 説明
		await fill('textarea', '送信キューに写した所で戻るから。');
		await sleep(150);
		got.push(['説明', await res()]);
		await next();
		await sleep(200);
		const score = await tab.eval<string>(`${P}.querySelector('h3').textContent`);
		const note = await tab.eval<number>(`${P}.querySelectorAll('.note li').length`);
		await tab.eval(`document.querySelector('.recall-pair').scrollIntoView({block:'start'})`);
		await sleep(800);
		await tab.shot(`${OUT}/recall-end.png`);
		const want = ['外れ', '当たり', '当たり', '当たり', '当たり'];
		const okAns = got.every(([, r], i) => r.startsWith(want[i]) && r.length > 6);
		const okEnd = score.includes('4 / 5') && note >= 3;
		writeFileSync(
			`${OUT}/recall.json`,
			JSON.stringify({ base, got, lit, green, score, note }, null, 1)
		);
		const show: [boolean, string][] = [
			[
				okAns,
				`5 種に答えると当たり外れと理由（${got.map(([k, r]) => `${k}:${r.slice(0, 2)}`).join('・')}）`
			],
			[
				lit === 4 && green === 1,
				`図を押す問いで 4 つが光り、答えると正しい物が緑（光 ${lit}・緑 ${green}）`
			],
			[okEnd, `最後に点（${score}）と手帳の 1 枚（${note} 行）`]
		];
		for (const [ok, t] of show) console.log(`${ok ? 'o' : 'x'} ${t}`);
		if (show.some(([ok]) => !ok)) process.exitCode = 1;
	} finally {
		chrome.kill();
	}
}
void main();
