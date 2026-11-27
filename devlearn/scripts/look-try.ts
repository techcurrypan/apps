// 10-P 手順 8 の確かめ：公開 URL の /kit の「やってみる」で、端末に打つと出力・やることの ✓・図が変わり、
// 履歴（↑）・補完（Tab）・Ctrl+L・命令の見本・公式の説明への道が働くかを測る（CI では走らせない）。
//   npx tsx scripts/look-try.ts [本番の URL の根]
import { writeFileSync } from 'node:fs';
import { openChrome, sleep } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'https://devlearn.techcurrybread.workers.dev').replace(/\/$/, '');
const OUT = 'docs/progress/shots/phase-10-P';

async function main() {
	const { tab, chrome } = await openChrome(9361, { gpu: false, headless: true });
	try {
		await tab.size(1440, 900, false);
		await tab.go(`${base}/kit`);
		await sleep(2000);
		const Q = `document.querySelector('.try')`;
		const setv = (v: string) =>
			tab.eval(`(() => {
				const i = ${Q}.querySelector('input');
				Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(v)});
				i.dispatchEvent(new Event('input', { bubbles: true }));
			})()`);
		const press = (key: string, ctrl = false) =>
			tab.eval(
				`${Q}.querySelector('input').dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, ctrlKey: ${ctrl}, bubbles: true, cancelable: true }))`
			);
		const type = async (v: string) => {
			await setv(v);
			await press('Enter');
			await sleep(150);
		};
		const lines = () =>
			tab.eval<string[]>(`[...${Q}.querySelectorAll('.ln')].map(l => l.textContent)`);
		const done = () => tab.eval<number>(`${Q}.querySelectorAll('.tasks li.done').length`);
		const figText = () =>
			tab.eval<string>(`document.querySelector('.try-pair .lab-fig svg').textContent`);
		const fig0 = await figText();
		await type('ss -tin dst 203.0.113.80');
		const ss = (await lines()).join('\n');
		const first = ss.includes('cwnd:9') && (await done()) === 1;
		await press('ArrowUp');
		const up = await tab.eval<string>(`${Q}.querySelector('input').value`);
		const hist = up === 'ss -tin dst 203.0.113.80';
		await setv('nst');
		await press('Tab');
		const tabv = await tab.eval<string>(`${Q}.querySelector('input').value`);
		const comp = tabv === 'nstat -az TcpExtTCPLostRetransmit';
		await press('Enter');
		await sleep(150);
		await type('ping 203.0.113.80');
		const err = (await lines()).some((l) => l.includes('使えない'));
		await press('l', true);
		await sleep(150);
		const cleared = (await lines()).length === 0;
		// 見本を押すと入る
		await tab.eval(
			`[...${Q}.querySelectorAll('.cards button')].find(b => b.textContent.includes('tc -s qdisc')).click()`
		);
		await sleep(100);
		const card =
			(await tab.eval<string>(`${Q}.querySelector('input').value`)) === 'tc -s qdisc show dev eth0';
		await press('Enter');
		await sleep(150);
		await tab.shot(`${OUT}/try-before.png`);
		for (const c of [
			'sysctl -w net.ipv4.tcp_congestion_control=bbr',
			'tc qdisc replace dev eth0 root fq',
			'ss -tin dst 203.0.113.80'
		])
			await type(c);
		const all = (await done()) === 5;
		const news = await tab.eval<string>(`${Q}.querySelector('.news').textContent.trim()`);
		const fig1 = await figText();
		const figChanged = fig0 !== fig1 && fig1.includes('fq') && fig1.includes('86');
		const refs = await tab.eval<string[]>(`[...${Q}.querySelectorAll('.refs a')].map(a => a.href)`);
		const refOk = refs.length >= 5 && refs.every((u) => u.startsWith('https://'));
		await tab.eval(`document.querySelector('.try-pair').scrollIntoView({block:'start'})`);
		await sleep(1200);
		await tab.shot(`${OUT}/try-after.png`);
		const res = { base, first, hist, comp, err, cleared, card, all, news, figChanged, refOk };
		writeFileSync(`${OUT}/try.json`, JSON.stringify(res, null, 1));
		const show: [boolean, string][] = [
			[first, 'ss を打つと cwnd:9 が出て、やること 1 が ✓'],
			[hist, '↑ で前の命令'],
			[comp, 'Tab で nst → nstat の命令'],
			[err, '知らない命令は使えない理由と次の一手'],
			[cleared, 'Ctrl+L で画面を消す'],
			[card, '命令の見本を押すと入る'],
			[all, `全てのやることが ✓（知らせ：${news}）`],
			[figChanged, '図が命令で変わる（fq・cwnd 86）'],
			[refOk, '公式の説明への道 5 つ（https）']
		];
		for (const [ok, t] of show) console.log(`${ok ? 'o' : 'x'} ${t}`);
		if (show.some(([ok]) => !ok)) process.exitCode = 1;
	} finally {
		chrome.kill();
	}
}
void main();
