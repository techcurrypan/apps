// 段 9：学びとゲームの接続を、公開 URL で手元の Chrome から辿る（CI では走らせない）。
//   npx tsx scripts/look-link.ts <URL の根> <撮った画面の置き場> [名前の頭]
// 1. トップ・地図・レッスンから街へ、街から地図とレッスンへ行き来できる
// 2. 要望の板から効くレッスンを開き、修了して戻ると、その要望の板で使える手が増えている（前と後を撮る）
// 3. 学ばずに進む道で、1 章を一区切りまで通せる（game-design.md 15.8 の遊び方）
// 5. 行き来しても、読み込み直しても、街の状態と修了の記録が消えない
import { openChrome, sleep, type Tab } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '');
const outDir = process.argv[3] ?? 'docs/progress/shots';
const prefix = process.argv[4] ?? 'phase-9';

let bad = 0;
const check = (name: string, ok: boolean, detail: string) => {
	console.log(`${ok ? 'OK ' : 'NG '} ${name}  ${detail}`);
	if (!ok) bad++;
};

const clickText = (tab: Tab, sel: string, text: string) =>
	tab.eval<boolean>(
		`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.textContent.includes(${JSON.stringify(text)})); if (!b) return false; b.click(); return true; })()`
	);
const path = (tab: Tab) => tab.eval<string>('location.pathname');
async function waitPath(tab: Tab, p: string) {
	for (let i = 0; i < 60; i++) {
		if ((await path(tab)) === p) break;
		await sleep(100);
	}
	await sleep(800);
	return path(tab);
}
type Save = { now: number; actions: unknown[] };
const townSave = (tab: Tab) =>
	tab.eval<Save | null>(`JSON.parse(localStorage.getItem('devlearn.town') ?? 'null')`);

async function main() {
	const { tab, chrome } = await openChrome(9360, { gpu: true });
	try {
		await tab.size(1280, 800, false);
		await tab.scheme(true);
		await tab.go(`${base}/`);
		await tab.eval(`localStorage.clear()`);

		// ---------- 1. 行き来 ----------
		await tab.go(`${base}/`);
		const steps: string[] = [];
		await clickText(tab, 'a', '街で遊ぶ');
		steps.push(`トップ → ${await waitPath(tab, '/town')}`);
		await clickText(tab, '.opt', '町を見て回る');
		await clickText(tab, 'a.tomap', '地図');
		steps.push(`街 → ${await waitPath(tab, '/map')}`);
		await clickText(tab, 'a', '街で遊ぶ');
		steps.push(`地図 → ${await waitPath(tab, '/town')}`);
		await tab.go(`${base}/map`);
		await clickText(tab, 'a', 'add と commit');
		steps.push(`地図 → ${await waitPath(tab, '/lesson/git-001')}`);
		await clickText(tab, 'a.totown', '街へ');
		steps.push(`レッスン → ${await waitPath(tab, '/town')}`);
		await tab.key('g');
		steps.push(`街で G → ${await waitPath(tab, '/map')}`);
		await tab.key('g');
		steps.push(`地図で G → ${await waitPath(tab, '/town')}`);
		check(
			'1 トップ・地図・レッスンから街へ、街から地図へ行き来できる（G でも）',
			steps
				.join(' ')
				.match(/\/town|\/map|\/lesson\/git-001/g)
				?.join(',') === '/town,/map,/town,/lesson/git-001,/town,/map,/town',
			steps.join(' ・ ')
		);

		// ---------- 2. 要望の板 → レッスン → 修了 → 戻る ----------
		await sleep(1000);
		await tab.key('n');
		await sleep(300);
		await clickText(tab, '.toast button', '送る');
		await sleep(1500);
		const opened = await clickText(tab, '.req', '町内会長');
		await sleep(800);
		const before = await tab.eval<{ learned: string[]; link: boolean }>(`(() => {
			const d = document.querySelector('.req4');
			const learned = [...d.querySelectorAll('.mv.good strong')].map((x) => x.textContent);
			return { learned, link: !!d.querySelector('.lessons a[href*="git-001"]') };
		})()`);
		await tab.shot(`${outDir}/${prefix}-req-before.png`);
		const saved0 = await townSave(tab);
		await clickText(tab, '.lessons a', 'git-001');
		const atLesson = await waitPath(tab, '/lesson/git-001');
		const saved1 = await townSave(tab);
		check(
			'2a 要望の板（町内会長）に効くレッスン git-001 の道があり、開ける。開いても街の状態が残る',
			opened &&
				before.link &&
				atLesson === '/lesson/git-001' &&
				!!saved1 &&
				JSON.stringify(saved1.actions) === JSON.stringify(saved0?.actions) &&
				saved1.now >= (saved0?.now ?? 0),
			`前の学んだ手 [${before.learned.join('、')}] ・ 保存 ${saved1?.now} 分 / 手 ${saved1?.actions.length}`
		);
		// 実戦：add と commit で合格する
		await tab.key('ArrowRight', true);
		await tab.key('ArrowRight', true);
		const typeIn = async (text: string) => {
			await tab.eval('document.getElementById("tool-line").focus()');
			await tab.send('Input.insertText', { text });
			await tab.key('Enter');
			await sleep(250);
		};
		await typeIn('git add hello.txt');
		await typeIn('git commit -m "first commit"');
		await sleep(1200);
		const progress = await tab.eval<string>(`localStorage.getItem('devlearn.progress') ?? ''`);
		// 「次」の段へ
		for (let i = 0; i < 4; i++) await tab.key('ArrowRight', true);
		await sleep(400);
		const nextText = await tab.eval<string>(
			`document.querySelector('#town-return')?.closest('section')?.textContent ?? ''`
		);
		await tab.shot(`${outDir}/${prefix}-lesson-next.png`);
		check(
			'2b レッスンを修了すると、「次」の段に「街へ戻る」と、増える手の名前が出る',
			progress.includes('git-001') &&
				nextText.includes('記録されたかを確かめる') &&
				nextText.includes('修了した'),
			nextText.replace(/\s+/g, ' ').slice(0, 90)
		);
		await clickText(tab, '#town-return ~ a, section.town a', '街へ戻る');
		await waitPath(tab, '/town');
		await sleep(1500);
		const toast = await tab.eval<string>(
			`[...document.querySelectorAll('.toast')].map((x) => x.textContent).join(' / ')`
		);
		await tab.shot(`${outDir}/${prefix}-town-gained.png`);
		await clickText(tab, '.req', '町内会長');
		await sleep(800);
		const after = await tab.eval<{ learned: string[]; fresh: string; ok: boolean }>(`(() => {
			const d = document.querySelector('.req4');
			const f = d.querySelector('.mv.fresh');
			return { learned: [...d.querySelectorAll('.mv.good strong')].map((x) => x.textContent),
				fresh: f ? f.textContent.replace(/\\s+/g, ' ') : '', ok: !!f && !f.disabled };
		})()`);
		await tab.shot(`${outDir}/${prefix}-req-after.png`);
		check(
			'2c 街に戻ると「使える手が増えた」と効く要望が出て、要望の板に新しい手が前 → 後で現れ、打てる',
			toast.includes('使える手が増えた') &&
				toast.includes('町内会長') &&
				after.ok &&
				after.fresh.includes('前：学んでいない → 後：使える') &&
				after.learned.length > before.learned.length,
			`知らせ「${toast.slice(0, 70)}」 ・ 学んだ手 ${before.learned.length} → ${after.learned.length}`
		);
		// 打ってみる
		await clickText(tab, '.mv.fresh', '記録されたかを確かめる');
		await sleep(600);
		const savedBeforeReload = await townSave(tab);
		await tab.key('Escape');

		// ---------- 5. 読み込み直しても消えない ----------
		await tab.go(`${base}/town`);
		await sleep(2500);
		const saved2 = await townSave(tab);
		const progress2 = await tab.eval<string>(`localStorage.getItem('devlearn.progress') ?? ''`);
		const toast2 = await tab.eval<string>(
			`[...document.querySelectorAll('.toast')].map((x) => x.textContent).join(' / ')`
		);
		check(
			'5 読み込み直しても、街の手の記録と修了の記録が同じ。同じ手を二度は知らせない',
			JSON.stringify(saved2?.actions) === JSON.stringify(savedBeforeReload?.actions) &&
				(saved2?.actions.length ?? 0) > (saved1?.actions.length ?? 0) &&
				progress2.includes('git-001') &&
				!toast2.includes('使える手が増えた'),
			`手 ${saved2?.actions.length} ・ 修了 ${progress2}`
		);
	} finally {
		chrome.kill();
	}

	// ---------- 3. 学ばずに 1 章を通す（#still の撮影の口で、本番の手の釦を順に押す） ----------
	{
		const { tab, chrome } = await openChrome(9361, { gpu: true });
		try {
			await tab.size(1280, 720, false);
			await tab.go(`${base}/town#still`);
			for (let i = 0; i < 300 && !(await tab.eval<boolean>('!!window.__ready')); i++)
				await sleep(200);
			const r = await tab.eval<{
				days: string[];
				chapter: string;
				grade: string;
				sat: number;
				outs: number;
			}>(`(() => {
				const g = window.__game; g.setLearned([]);
				const DAY = 1440, days = []; let outs = 0;
				const st = () => g.town();
				const cday = () => Math.floor((st().minute - st().chapterStart) / DAY) + 1;
				const play = (id, label) => { g.openReq(id); const d = g.ui.dialog; if (!d || d.kind !== 'req') return false;
					const k = d.moves.findIndex((m) => m.label === label && m.ok); if (k < 0) return false; g.doMove(k); return true; };
				for (let day = 0; day < 9 && st().desk.chapter === 1 && st().desk.result !== 'failed'; day++) {
					if (day > 0) g.nextMorning();
					if (st().desk.chapter !== 1) break;
					g.setSpeed(3); window.__frame(15, 0.05); g.setSpeed(0); // 9:00
					for (let k = 0; k < 40; k++) {
						const open = st().desk.requests.filter((x) => x.status === 'open').sort((a, b) => a.due - b.due || (a.id < b.id ? -1 : 1));
						let did = false;
						for (const q of open) {
							const tries = !q.confirmed ? ['様子を聞く'] : q.doubt > 0 ? ['示す（根拠を見せる）', '頼み込む'] : ['手探りで直す'];
							if (tries.some((t) => play(q.id, t))) { did = true; break; }
						}
						if (!did) break;
					}
					for (const q of st().desk.requests) if (q.status === 'open' && q.due <= cday() && play(q.id, '外に頼む')) outs++;
					g.closeDlg();
					days.push(cday() + ' 日目 満足度 ' + st().desk.clientSat);
				}
				g.nextMorning();
				const c = st().chapters[0];
				return { days, chapter: String(st().desk.chapter), grade: c ? String(c.grade) : '', sat: c ? c.sat : -1, outs };
			})()`);
			await tab.shot(`${outDir}/${prefix}-nolearn-chapter.png`);
			check(
				'3 学ばずに（修了 0 本で）1 章を締めまで通し、合格して 2 章に入る',
				r.chapter === '2' && ['合格', '良', '優'].includes(r.grade),
				`${r.days.join(' → ')} ・ 1 章 ${r.grade}（依頼主の満足度 ${r.sat}）・ 外に頼んだ ${r.outs} 件 ・ 今 ${r.chapter} 章`
			);
		} finally {
			chrome.kill();
		}
	}
	if (bad) process.exit(1);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
