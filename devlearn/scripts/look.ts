// 画面を自分の目で確かめるための道具（CI では走らせない）。
// 手元の Chrome を DevTools の口から操作し、キーだけでレッスンを動かして確かめ、画面を撮る。
//   npx tsx scripts/look.ts <URL の根> <撮った画面の置き場>
// 例: npx tsx scripts/look.ts https://devlearn.techcurrybread.workers.dev docs/progress/shots
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CHROME, sleep, Tab } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '');
const outDir = process.argv[3] ?? 'docs/progress/shots';
const lessonId = process.argv[4] ?? 'git-001';
const PORT = 9333;

type Report = { ok: boolean; name: string; detail: string };
const results: Report[] = [];
const check = (name: string, ok: boolean, detail = '') => {
	results.push({ ok, name, detail });
	console.log(`${ok ? 'OK ' : 'NG '} ${name}${detail ? `  ${detail}` : ''}`);
};

// どの表し方が、どのステップを指しているか
const POINTERS = `(() => {
	const q = (s) => document.querySelector(s);
	const num = (s, a) => { const e = q(s); return e ? Number(e.getAttribute(a)) : null; };
	const count = q('[data-testid="progress-count"]')?.textContent ?? '';
	return {
		grid: num('.grid', 'data-step'),
		text: num('section.text', 'data-step'),
		facts: num('section.facts', 'data-step'),
		log: num('section.log', 'data-step'),
		logCurrent: num('section.log tr[aria-current="step"]', 'data-row'),
		logRows: document.querySelectorAll('section.log tbody tr').length,
		progress: Number(count.split('/')[0]),
		progressCurrent: Number(q('.progress button[aria-current="step"]')?.textContent?.replace(/\\D/g, '')),
		latest: num('.latest', 'data-step'),
		title: q('#step-title')?.textContent?.replace(/\\s+/g, ' ').trim() ?? ''
	};
})()`;

async function main() {
	const profile = mkdtempSync(join(tmpdir(), 'devlearn-look-'));
	const chrome = spawn(CHROME, [
		'--headless=new',
		`--remote-debugging-port=${PORT}`,
		`--user-data-dir=${profile}`,
		'--no-first-run',
		'--disable-gpu',
		'about:blank'
	]);
	let wsUrl = '';
	for (let i = 0; i < 50 && !wsUrl; i++) {
		await sleep(200);
		try {
			const list = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()) as {
				type: string;
				webSocketDebuggerUrl: string;
			}[];
			wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl ?? '';
		} catch {
			// まだ立ち上がっていない
		}
	}
	const ws = new WebSocket(wsUrl);
	await new Promise((r) => ws.addEventListener('open', r));
	const tab = new Tab(ws);
	await tab.send('Page.enable');
	await tab.send('Runtime.enable');

	const url = `${base}/lesson/${lessonId}`;
	await tab.size(1280, 800, false);
	await tab.scheme(false);
	await tab.go(url);
	const total = await tab.eval<number>('document.querySelectorAll(".progress li").length');
	check('解説のステップの数を読めた', total >= 5, `${total} ステップ`);

	// 1・2・5：順に進む・戻る・飛ぶ、のどれでも、全ての表し方が同じステップ
	const visit: string[] = [];
	for (let i = 1; i < total; i++) visit.push('ArrowRight');
	visit.push('ArrowLeft', 'ArrowLeft', 'Home', String(Math.min(5, total)), '2', 'End', '3');
	let n = 1;
	let allSame = true;
	const notes: string[] = [];
	for (const k of ['Home', ...visit]) {
		await tab.key(k);
		await sleep(150);
		if (k === 'ArrowRight') n = Math.min(total, n + 1);
		else if (k === 'ArrowLeft') n = Math.max(1, n - 1);
		else if (k === 'Home') n = 1;
		else if (k === 'End') n = total;
		else n = Number(k);
		const p = await tab.eval<Record<string, number | string | null>>(POINTERS);
		const nums = [
			'grid',
			'text',
			'facts',
			'log',
			'logCurrent',
			'logRows',
			'progress',
			'progressCurrent',
			'latest'
		];
		const bad = nums.filter((x) => p[x] !== n);
		if (bad.length > 0) {
			allSame = false;
			notes.push(`キー ${k} の後 n=${n}: ${bad.map((b) => `${b}=${p[b]}`).join(' ')}`);
		}
	}
	check('進む・戻る・飛ぶの全てで、全ての表し方が同じステップを指す', allSame, notes.join(' / '));

	// 3・6：move のあるステップで、前 → 動き → 後 と、運ばれる物が途中を通ること
	const moveStep = await tab.eval<number>(`(() => {
		return 3;
	})()`);
	await tab.key(String(moveStep));
	const phases = new Set<string>();
	const xs: number[] = [];
	let maxMoving = 0;
	const t0 = performance.now();
	while (performance.now() - t0 < 4500) {
		const s = await tab.eval<{ phase: string; x: number | null; moving: number }>(`(() => {
			const f = document.querySelector('figure.stage');
			const r = document.querySelector('[data-moving] rect');
			// 動いている物：運ばれる物と、現れる途中・消える途中（薄い）物
			const fading = [...document.querySelectorAll('g.node')].filter((g) => {
				const o = Number(g.getAttribute('opacity'));
				return o > 0 && o < 1;
			}).length;
			const moving = document.querySelectorAll('[data-moving]').length + fading;
			return { phase: f?.dataset.phase ?? '', x: r ? Number(r.getAttribute('x')) : null, moving };
		})()`);
		maxMoving = Math.max(maxMoving, s.moving);
		phases.add(s.phase);
		if (s.x !== null) xs.push(s.x);
		await sleep(40);
	}
	const order = [...phases].join(' → ');
	check(
		'原理 1：動いている物は一度に 1 つだけ',
		maxMoving <= 1,
		`同時に動いた数の最大 ${maxMoving}`
	);
	check(
		'前 → 動き → 後 が見える',
		phases.has('before') && phases.has('op') && phases.has('after'),
		order
	);
	const distinct = new Set(xs.map((x) => Math.round(x))).size;
	check(
		'move が瞬間移動せず、途中の位置を通る',
		distinct >= 5,
		`運ばれる物の位置を ${distinct} 通り観測`
	);

	// 5：留まったまま、もう一度（何度でも）
	for (let i = 1; i <= 2; i++) {
		const before = await tab.eval<Record<string, number>>(POINTERS);
		await tab.key('r');
		await sleep(80);
		const ph = await tab.eval<string>('document.querySelector("figure.stage").dataset.phase');
		let sawAfter = false;
		const t1 = performance.now();
		while (performance.now() - t1 < 4500 && !sawAfter) {
			sawAfter =
				(await tab.eval<string>('document.querySelector("figure.stage").dataset.phase')) ===
				'after';
			await sleep(60);
		}
		const after = await tab.eval<Record<string, number>>(POINTERS);
		check(
			`もう一度（${i} 回目）：ステップは替わらず、前から再生し直して後で止まる`,
			ph === 'before' && sawAfter && before.text === after.text,
			`押した直後=${ph} ステップ ${before.text}→${after.text}`
		);
	}

	// 4：キーボードだけ（Tab で釦に焦点が移る。Space で自動）
	await tab.key('Home');
	await tab.key(' ');
	await sleep(200);
	const auto = await tab.eval<string>(
		'document.querySelector("[aria-pressed]")?.getAttribute("aria-pressed") ?? ""'
	);
	await tab.key(' ');
	check('Space で自動が始まり、もう一度で止まる', auto === 'true', `aria-pressed=${auto}`);
	await tab.key('ArrowRight', true);
	const partAfter = await tab.eval<string>(
		'document.querySelector("[role=tab][aria-selected=true]")?.textContent?.trim() ?? ""'
	);
	await tab.key('ArrowLeft', true);
	const partBack = await tab.eval<string>(
		'document.querySelector("[role=tab][aria-selected=true]")?.textContent?.trim() ?? ""'
	);
	check(
		'Shift + 矢印で段を移る',
		partAfter.includes('例') && partBack.includes('解説'),
		`${partAfter} → ${partBack}`
	);
	await tab.eval(
		'document.activeElement && document.activeElement.blur && document.activeElement.blur()'
	);
	await tab.key('Tab');
	const focus = await tab.eval<string>('document.activeElement?.tagName ?? ""');
	check('Tab で焦点が操作できる物に移る', ['A', 'BUTTON'].includes(focus), focus);

	// 原理 3・7：文の真下に具体値の表。ステップ 2 で記録は 2 行、先のステップの題は出ない
	await tab.size(1280, 800, false);
	await tab.go(url);
	await tab.key('2');
	await sleep(200);
	const p7 = await tab.eval<{ rows: number; aheadTitles: number; adjacent: boolean }>(`(() => {
		const text = document.querySelector('section.text');
		return {
			rows: document.querySelectorAll('section.log tbody tr').length,
			aheadTitles: [...document.querySelectorAll('.progress button')].slice(2)
				.filter((b) => b.title || !b.getAttribute('aria-label').includes('まだ')).length,
			adjacent: text?.nextElementSibling?.matches('section.facts') ?? false
		};
	})()`);
	check('原理 3：文の真下に具体値の表', p7.adjacent);
	check(
		'原理 7：ステップ 2 で記録が 2 行、先のステップの題が出ない',
		p7.rows === 2 && p7.aheadTitles === 0,
		`記録 ${p7.rows} 行・先の題 ${p7.aheadTitles} 件`
	);

	// 原理 8：灰色だけにしても、印と文字で区別できる（撮って目で見る）
	await tab.key('3');
	await tab.eval(`document.documentElement.style.filter = 'grayscale(1)'`);
	await sleep(3500);
	const marks = await tab.eval<string>(
		`[...document.querySelectorAll('.progress button')].map((b) => b.textContent.trim()).join(' ')`
	);
	check(
		'原理 8：進みの帯に、色に頼らない印（✓ ▶）がある',
		marks.includes('✓') && marks.includes('▶'),
		marks
	);
	await tab.shot(join(outDir, 'phase-6-laptop-gray-step3-after.png'));
	await tab.eval(`document.documentElement.style.filter = ''`);

	// 原理 4：ノート PC（1280×800）で、舞台・文の題・記録の最新 1 行が画面の中にある
	await tab.size(1280, 800, false);
	await tab.go(url);
	await tab.key('3');
	await sleep(300);
	const inView = await tab.eval<string[]>(`(() => {
		const out = [];
		for (const [name, sel] of [['舞台', 'figure.stage'], ['文の題', '#step-title'], ['記録の最新', '.latest']]) {
			const r = document.querySelector(sel)?.getBoundingClientRect();
			if (!r || r.bottom > innerHeight || r.height === 0) out.push(name);
		}
		return out;
	})()`);
	check(
		'ノート PC 1280×800：舞台・文・記録の最新が同時に見える',
		inView.length === 0,
		inView.join('・')
	);

	// 7（5 章）：携帯の縦 640px で、舞台・記録の最新 1 行・文の題と要約が同時に見える
	await tab.size(390, 640, true);
	await tab.scheme(false);
	await tab.go(url);
	await tab.key('3');
	await sleep(300);
	const fitH = await tab.eval<{ span: number; bar: number; view: number }>(`(() => {
		const top = document.querySelector('figure.stage').getBoundingClientRect().top;
		const latest = document.querySelector('.latest').getBoundingClientRect().bottom;
		const lead = document.querySelector('section.text .lead').getBoundingClientRect().bottom;
		const bar = document.querySelector('.controls').getBoundingClientRect().height;
		return { span: Math.max(latest, lead) - top, bar, view: innerHeight };
	})()`);
	check(
		'携帯 390×640：舞台・記録の最新・文が 1 画面に収まる',
		fitH.span + fitH.bar <= fitH.view,
		`舞台の上端から文の要約まで ${Math.round(fitH.span)}px ＋ 操作帯 ${Math.round(fitH.bar)}px ／ 画面 ${fitH.view}px`
	);

	// 7・9：幅と明暗。横にはみ出さないこと。撮る
	const sizes: [string, number, number, boolean][] = [
		['laptop', 1280, 800, false],
		['phone', 390, 844, true]
	];
	for (const [name, w, h, mobile] of sizes) {
		for (const dark of [false, true]) {
			await tab.size(w, h, mobile);
			await tab.scheme(dark);
			await tab.go(url);
			await tab.key('3');
			// 運ばれる物が線の途中にある瞬間を待って撮る
			for (let i = 0; i < 100; i++) {
				const t = await tab.eval<number>(
					'(() => { const r = document.querySelector("[data-moving] rect"); return r ? 1 : 0; })()'
				);
				if (t) break;
				await sleep(20);
			}
			const overflow = await tab.eval<number>(
				'document.documentElement.scrollWidth - document.documentElement.clientWidth'
			);
			const bg = await tab.eval<string>('getComputedStyle(document.body).backgroundColor');
			check(
				`${name} ${dark ? '暗' : '明'}：横にはみ出さない`,
				overflow <= 0,
				`はみ出し ${overflow}px・地 ${bg}`
			);
			const file = join(outDir, `phase-6-${name}-${dark ? 'dark' : 'light'}-step3-moving.png`);
			await tab.shot(file);
			await sleep(3500);
			await tab.shot(join(outDir, `phase-6-${name}-${dark ? 'dark' : 'light'}-step3-after.png`));
		}
	}

	// 段 7：実戦（道具）。間違い → なぜと次の一手、合格 → 修了の記録、巻き戻し
	await tab.size(1280, 900, false);
	await tab.scheme(false);
	await tab.go(url);
	await tab.eval('localStorage.removeItem("devlearn.progress")');
	await tab.key('ArrowRight', true);
	await tab.key('ArrowRight', true);
	const typeIn = async (text: string) => {
		await tab.eval('document.getElementById("tool-line").focus()');
		await tab.send('Input.insertText', { text });
		await tab.send('Input.dispatchKeyEvent', {
			type: 'keyDown',
			key: 'Enter',
			code: 'Enter',
			windowsVirtualKeyCode: 13,
			text: '\r'
		});
		await tab.send('Input.dispatchKeyEvent', {
			type: 'keyUp',
			key: 'Enter',
			code: 'Enter',
			windowsVirtualKeyCode: 13
		});
		await sleep(200);
	};
	const hasInput = await tab.eval<boolean>('!!document.getElementById("tool-line")');
	check('Shift + 矢印で実戦の段へ行くと、端末の入力がある', hasInput);
	if (hasInput) {
		await typeIn('git commit -m "first commit"');
		const why = await tab.eval<string>('document.querySelector(".reply.wrong")?.textContent ?? ""');
		check(
			'add をせずに commit すると、なぜ駄目かと次の一手が出る',
			why.includes('なぜ駄目か') && why.includes('次の一手'),
			why.replace(/\s+/g, ' ').slice(0, 60)
		);
		await typeIn('git add hello.tx');
		await typeIn('git add hello.txt');
		await sleep(400);
		await tab.shot(join(outDir, 'phase-7-practice-moving.png'));
		await typeIn('git commit -m "first commit"');
		await sleep(1200);
		const passed = await tab.eval<string>('document.querySelector(".reply.ok")?.textContent ?? ""');
		const saved = await tab.eval<string>('localStorage.getItem("devlearn.progress") ?? ""');
		check(
			'add と commit で合格し、修了がブラウザに残る',
			passed.includes('合格') && saved.includes('git-001'),
			saved
		);
		const term = await tab.eval<string>('document.querySelector(".terminal")?.textContent ?? ""');
		check(
			'端末に本物と同じ形の出力が出る',
			term.includes('(root-commit)') &&
				term.includes("fatal: pathspec 'hello.tx' did not match any files")
		);
		await tab.shot(join(outDir, 'phase-7-practice-passed.png'));
		await tab.eval('document.querySelectorAll(".log ol button")[3].click()');
		await sleep(900);
		const after = await tab.eval<{ passed: boolean; steps: string; commits: string }>(`(() => ({
			passed: !!document.querySelector('.band .ok'),
			steps: document.querySelector('.grid[data-steps]')?.getAttribute('data-steps') ?? '',
			commits: document.querySelector('[aria-label="リポジトリ"]')?.textContent ?? ''
		}))()`);
		check(
			'記録の 3 行目まで戻すと、commit の前の状態に戻る',
			!after.passed && after.steps === '3' && after.commits.includes('記録は無い'),
			JSON.stringify(after)
		);
		await tab.shot(join(outDir, 'phase-7-practice-rewound.png'));
	}

	// 入口と地図も、携帯の幅ではみ出さない
	for (const path of ['/', '/map']) {
		for (const dark of [false, true]) {
			await tab.size(390, 844, true);
			await tab.scheme(dark);
			await tab.go(`${base}${path}`);
			const overflow = await tab.eval<number>(
				'document.documentElement.scrollWidth - document.documentElement.clientWidth'
			);
			check(
				`phone ${dark ? '暗' : '明'} ${path}：横にはみ出さない`,
				overflow <= 0,
				`はみ出し ${overflow}px`
			);
			const name = path === '/' ? 'home' : 'map';
			await tab.shot(join(outDir, `phase-6-phone-${dark ? 'dark' : 'light'}-${name}.png`));
		}
	}

	ws.close();
	chrome.kill();
	const ng = results.filter((r) => !r.ok);
	console.log(`\n${results.length - ng.length} / ${results.length} 件を満たした`);
	process.exit(ng.length === 0 ? 0 : 1);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
