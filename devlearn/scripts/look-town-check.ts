// 段 8-2e：街 /town を手元の Chrome で確かめる（CI では走らせない）。
//   npx tsx scripts/look-town-check.ts <街の URL の根> <撮った画面の置き場> [名前の頭]
// 読み込みの時間（P-6）・1 コマの時間（P-5）・キーボードだけの操作（S-4）・動きを減らす設定（S-5）・
// 携帯の幅（S-3）・WebGL2 が無い端末（P-4）を、順に確かめる。
import { execSync } from 'node:child_process';
import { MOVES } from '../src/lib/game/data.ts';
import { openChrome, sleep, type Tab } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');
const outDir = process.argv[3] ?? 'docs/progress/shots';
const prefix = process.argv[4] ?? 'phase-8';

let bad = 0;
const check = (name: string, ok: boolean, detail: string) => {
	console.log(`${ok ? 'OK ' : 'NG '} ${name}  ${detail}`);
	if (!ok) bad++;
};

/** 手元の機械（記録に残す） */
function machine() {
	const ps = (q: string) => {
		try {
			return execSync(`powershell -NoProfile -Command "${q}"`, { encoding: 'utf8' }).trim();
		} catch {
			return '（取れなかった）';
		}
	};
	return {
		cpu: ps('(Get-CimInstance Win32_Processor | Select-Object -First 1).Name'),
		gpu: ps("(Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name }) -join ' / '")
	};
}

async function fresh(tab: Tab, still: boolean) {
	await tab.go(`${base}/town`);
	await tab.eval(`localStorage.removeItem('devlearn.town')`);
	await tab.go('about:blank');
	await tab.eval(`localStorage.removeItem('devlearn.town')`);
	await tab.go(`${base}/town${still ? '#still' : ''}`);
}

async function main() {
	const m = machine();
	console.log(`手元の機械：CPU ${m.cpu} ・ GPU ${m.gpu}`);
	// ---------- 読み込みと 1 コマの時間（頭のある Chrome、GPU で描く） ----------
	{
		const { tab, chrome } = await openChrome(9340, { gpu: true, headless: false });
		try {
			await tab.size(1280, 720, false);
			await tab.go(`${base}/town`);
			await tab.eval(`localStorage.removeItem('devlearn.town')`);
			await tab.go('about:blank');
			const t0 = Date.now();
			await tab.send('Page.navigate', { url: `${base}/town` });
			let sawBoot = false;
			let ready = 0;
			for (let i = 0; i < 200; i++) {
				await sleep(50);
				const st = await tab
					.eval<{ boot: string; done: boolean }>(
						`({ boot: document.querySelector('.boot')?.textContent ?? '', done: location.pathname === '/town' && document.readyState === 'complete' && !!document.querySelector('#view') && !document.querySelector('.boot') })`
					)
					.catch(() => ({ boot: '', done: false }));
				if (st.boot.includes('街を描いています')) sawBoot = true;
				if (st.done) {
					ready = Date.now() - t0;
					break;
				}
			}
			check(
				'P-6 読み込みから街が見えるまで 5 秒以内。その間は「街を描いています」',
				ready > 0 && ready <= 5000,
				`${ready} ms ・ 待ちの字 ${sawBoot ? '見えた' : '（短くて取れなかった）'}`
			);
			// 遊び方の板を閉じ、既定のカメラ・昼（始まりの 8:00 から時計を流す）・速さ 1 で 10 秒
			await tab.eval(
				`(() => { const b = [...document.querySelectorAll('.opt')].find((x) => x.textContent.includes('町を見て回る')); b && b.click(); })()`
			);
			await sleep(1500);
			const ms = await tab.eval<{ avg: number; p95: number; n: number }>(`new Promise((res) => {
				const d = []; let last = performance.now(); const end = last + 10000;
				function f(t) { d.push(t - last); last = t; if (t < end) requestAnimationFrame(f); else {
					d.sort((a, b) => a - b); res({ avg: d.reduce((a, b) => a + b, 0) / d.length, p95: d[Math.floor(d.length * 0.95)], n: d.length }); } }
				requestAnimationFrame(f); })`);
			check(
				'P-5 1280×720・既定のカメラ・昼・速さ 1 で、10 秒の平均の 1 コマ 33 ms 以下',
				ms.avg <= 33,
				`平均 ${ms.avg.toFixed(1)} ms ・ 95% ${ms.p95.toFixed(1)} ms ・ ${ms.n} コマ`
			);
		} finally {
			chrome.kill();
		}
	}
	// ---------- キーボードだけ・動きを減らす設定・携帯の幅 ----------
	{
		const { tab, chrome } = await openChrome(9341, { gpu: true });
		try {
			await tab.size(1280, 720, false);
			await tab.scheme(true);
			await fresh(tab, false);
			await sleep(3000);
			const focusBtn = (sel: string, text: string) =>
				tab.eval<boolean>(
					`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.textContent.includes(${JSON.stringify(text)})); if (!b) return false; b.focus(); return true; })()`
				);
			const state = () =>
				tab.eval<string>(`localStorage.getItem('devlearn.town') ?? ''`).then((s) => s);
			// 広い幅の板どうしが重ならない（S-2。8-2e で、操作の案内が道具の帯に隠れていたのを直した）
			const wide = await tab.eval<string[]>(`(() => {
				const r = (s) => { const e = document.querySelector(s); return e && e.offsetParent ? e.getBoundingClientRect() : null; };
				const boxes = { 上: r('.top'), 要望: r('.reqs'), 道具: r('.tools'), 案内: r('.help'), 右: r('.legend') };
				const names = Object.keys(boxes); const out = [];
				for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
					const a = boxes[names[i]], b = boxes[names[j]];
					if (a && b && !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)) out.push(names[i] + '×' + names[j]);
				}
				return out; })()`);
			check(
				'S-2 1280×720：上・要望・道具・操作の案内が重ならない',
				wide.length === 0,
				wide.join(' ') || '重なり無し'
			);
			// 遊び方の板：Enter で閉じる
			await focusBtn('.opt', '町を見て回る');
			await tab.key('Enter');
			await sleep(300);
			const introGone = await tab.eval<boolean>(`!document.querySelector('.intro')`);
			// 時間：Space と 1〜3
			await tab.eval(`document.activeElement && document.activeElement.blur()`);
			await tab.key('3');
			const sp3 = await tab.eval<string>(
				`document.querySelector('.spd[aria-pressed="true"]')?.getAttribute('aria-label') ?? ''`
			);
			await tab.key(' ');
			const sp0 = await tab.eval<string>(
				`document.querySelector('.spd[aria-pressed="true"]')?.getAttribute('aria-label') ?? ''`
			);
			check(
				'S-4 時間：Space で一時停止、3 で速さ 3（遊び方の板は Enter で閉じる）',
				introGone && sp3 === '速さ 3' && sp0 === '一時停止',
				`${sp3} → ${sp0}`
			);
			// 道具：住宅地の釦に焦点 → Enter → ↓ → Enter で区画を指定
			await focusBtn('.tool', '住宅地');
			await tab.key('Enter');
			await sleep(200);
			const pick = await tab.eval<{ n: number; title: string; fit: boolean }>(
				`(() => { const t = document.querySelector('.tools'), p = document.querySelector('.pick'), h = document.querySelector('.hint');
					const a = t.getBoundingClientRect(), b = p.getBoundingClientRect(), c = h ? h.getBoundingClientRect() : null;
					const apart = (x, y) => x.right <= y.left || y.right <= x.left || x.bottom <= y.top || y.bottom <= x.top;
					return { n: document.querySelectorAll('.pick li').length, title: document.querySelector('.pick strong')?.textContent ?? '',
						fit: t.scrollWidth <= t.clientWidth && apart(a, b) && (!c || apart(b, c)) }; })()`
			);
			await tab.key('ArrowDown');
			await tab.key('Enter');
			await sleep(300);
			const zoned = (await state()).includes('"zone"');
			await tab.shot(`${outDir}/${prefix}-kbd-zone.png`);
			check(
				'S-4 道具：住宅地を選ぶと空き区画の一覧が出て、↓ と Enter で指定できる',
				pick.n > 0 && zoned && pick.fit,
				`${pick.title} ・ 見えている行 ${pick.n} ・ 指定 ${zoned} ・ 帯と案内に重ならない ${pick.fit}`
			);
			// 道路：始まりの点を Enter、] で 10 m ずつ伸ばし、Enter で引く
			await focusBtn('.tool', '道路');
			await tab.key('Enter');
			await sleep(800);
			await tab.key('Enter');
			await sleep(200);
			await tab.key(']');
			await tab.key(']');
			const plan = await tab.eval<string>(
				`document.querySelector('.pick .plan')?.textContent ?? ''`
			);
			await tab.key('Enter');
			await sleep(400);
			const road = (await state()).includes('"road"');
			await tab.shot(`${outDir}/${prefix}-kbd-road.png`);
			check(
				'S-4 道路：始まりの点を選び、[ ] で長さ、Enter で引ける（試し引きの長さ・費用か理由が出る）',
				road && plan.length > 0,
				`${plan} ・ 引いた ${road}`
			);
			await tab.key('Escape');
			// 要望：一覧の行に焦点 → Enter で開く → 手の釦に焦点 → Enter → Esc で閉じる
			await focusBtn('.req', '');
			await tab.key('Enter');
			await sleep(400);
			const opened = await tab.eval<boolean>(`!!document.querySelector('.req4')`);
			await focusBtn('.mv:not([disabled])', '様子を聞く');
			await tab.key('Enter');
			await sleep(300);
			const asked = (await state()).includes('"ask"');
			await tab.key('Escape');
			await sleep(200);
			const closed = await tab.eval<boolean>(`!document.querySelector('.req4')`);
			check(
				'S-4 要望の板：Enter で開き、手を打ち、Esc で閉じる',
				opened && asked && closed,
				`開く ${opened} ・ 打つ ${asked} ・ 閉じる ${closed}`
			);
			// 表示：地下の仕組みの釦に焦点 → Enter
			await focusBtn('.tool', '地下の仕組み');
			await tab.key('Enter');
			const infra = await tab.eval<boolean>(`!!document.querySelector('.legend')`);
			check('S-4 表示：地下の仕組みに切り替えられる', infra, String(infra));
			// 街に焦点を置いて Enter：真ん中の建物を選ぶ
			await tab.eval(`document.querySelector('#view').focus()`);
			await tab.key('Enter');
			await sleep(300);
			const sel = await tab.eval<string>(
				`document.querySelector('.info strong')?.textContent ?? (document.querySelector('.req4') ? '要望の板' : '')`
			);
			check('S-4 街に焦点を置いて Enter で、真ん中の建物を選べる', sel.length > 0, sel);
		} finally {
			chrome.kill();
		}
	}
	{
		const { tab, chrome } = await openChrome(9342, { gpu: true });
		try {
			await tab.size(1280, 720, false);
			await tab.send('Emulation.setEmulatedMedia', {
				features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
			});
			await fresh(tab, true);
			for (let i = 0; i < 300 && !(await tab.eval<boolean>('!!window.__ready')); i++)
				await sleep(200);
			const r = await tab.eval<{ id: string; truth: string }>(
				`(() => { const r = window.__game.town().desk.requests[0]; return { id: r.id, truth: r.truth }; })()`
			);
			const t = MOVES.find((x) => x.tests.includes(r.truth));
			const f = MOVES.find((x) => x.fixes.includes(r.truth));
			await tab.eval(
				`window.__game.setLearned(${JSON.stringify([t?.lesson, f?.lesson].filter(Boolean))})`
			);
			const play = (label: string) =>
				tab.eval<string>(`(() => { const g = window.__game; const d = g.ui.dialog;
					const k = d.moves.findIndex((m) => m.label === ${JSON.stringify(label)}); if (k < 0 || !d.moves[k].ok) return 'NG'; g.doMove(k); return 'ok'; })()`);
			await tab.eval(`window.__game.openReq(${JSON.stringify(r.id)})`);
			await play(`${t?.name}（調べる）`);
			if (await tab.eval<boolean>(`window.__game.town().desk.requests[0].doubt > 0`))
				await play('示す（根拠を見せる）');
			await play(`${f?.name}（直す）`);
			const field = f?.lesson.split('-')[0] ?? '';
			const rise = () =>
				tab.eval<number>(
					`(() => { const g = window.__game; const ids = { git: g.city.FEAT.annex.id, db: g.city.FEAT.dbvault.id, sec: g.city.FEAT.gate.id }; const id = ids[${JSON.stringify(field)}] ?? (5000 + ['net','prg','lnx','ctr','ai','sta','cld','ci'].indexOf(${JSON.stringify(field)})); return g.E.getRise(id); })()`
				);
			const hold = await tab.eval<number>(
				`(() => { const v = getComputedStyle(document.documentElement).getPropertyValue('--dl-motion-hold'); const m = /([\\d.]+)\\s*(ms|s)/.exec(v); return m ? (m[2] === 'ms' ? +m[1] / 1000 : +m[1]) : 1.2; })()`
			);
			await tab.eval(`window.__frame(Math.round(${hold} * 0.5 / 0.05), 0.05)`);
			const before = await rise();
			await tab.shot(`${outDir}/${prefix}-rm-before.png`);
			await tab.eval(`window.__frame(Math.round(${hold} * 1.2 / 0.05), 0.05)`);
			const after = await rise();
			await tab.shot(`${outDir}/${prefix}-rm-after.png`);
			check(
				'S-5 動きを減らす設定：建つ様子は、足場の絵（前）と建ち終えた絵（後）を --dl-motion-hold ずつ見せる',
				before === 0 && after === 1,
				`前 ${before} → 後 ${after} ・ hold ${hold} 秒`
			);
		} finally {
			chrome.kill();
		}
	}
	// ---------- 道具や表示を切り替えても、カメラは動かない（D-19・V-14） ----------
	{
		const { tab, chrome } = await openChrome(9345, { gpu: true });
		try {
			await tab.size(1280, 720, false);
			await fresh(tab, true);
			for (let i = 0; i < 300 && !(await tab.eval<boolean>('!!window.__ready')); i++)
				await sleep(200);
			const camOf = () =>
				tab.eval<string>(
					`(() => { const v = window.__game.cam.v; return [v.tx, v.tz, v.yaw, v.pitch, v.dist].map((x) => x.toFixed(3)).join(','); })()`
				);
			const c0 = await camOf();
			const moved: string[] = [];
			for (const name of [
				'道路',
				'住宅地',
				'商業地',
				'公園',
				'取り壊し',
				'選ぶ',
				'地下の仕組み',
				'満足度',
				'地上の街'
			]) {
				await tab.eval(
					`(() => { const b = [...document.querySelectorAll('.tool')].find((x) => x.textContent.trim().startsWith(${JSON.stringify(name)})); b && b.click(); })()`
				);
				await tab.eval(`window.__frame(40, 0.05)`);
				const c = await camOf();
				if (c !== c0) moved.push(`${name}：${c}`);
			}
			check(
				'V-14 道具（選ぶ・道路・住宅地・商業地・公園・取り壊し）と表示を順に押しても、視点の値が変わらない',
				moved.length === 0,
				moved.length ? moved.join(' / ') : `視点 ${c0} のまま`
			);
		} finally {
			chrome.kill();
		}
	}
	{
		const { tab, chrome } = await openChrome(9343, { gpu: true });
		try {
			await tab.size(390, 844, true);
			await fresh(tab, false);
			await sleep(3000);
			await tab.eval(
				`(() => { const b = [...document.querySelectorAll('.opt')].find((x) => x.textContent.includes('町を見て回る')); b && b.click(); })()`
			);
			await sleep(6500); // 届いた知らせが消えるのを待つ
			const lay = await tab.eval<{
				overlaps: string[];
				toolsScroll: boolean;
				pageScroll: boolean;
			}>(`(() => {
				const r = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
				const boxes = { 上: r('.top'), 要望: r('.reqs'), 道具: r('.tools') };
				const names = Object.keys(boxes); const out = [];
				for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
					const a = boxes[names[i]], b = boxes[names[j]];
					if (a && b && !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)) out.push(names[i] + '×' + names[j]);
				}
				const t = document.querySelector('.tools');
				return { overlaps: out, toolsScroll: t.scrollWidth > t.clientWidth && getComputedStyle(t).overflowX !== 'hidden', pageScroll: document.documentElement.scrollWidth > innerWidth };
			})()`);
			await tab.shot(`${outDir}/${prefix}-mobile-check.png`);
			check(
				'S-3 携帯の幅：上・要望の一覧・道具の帯が重ならない。道具の帯だけが横に送れ、画面は横に送らない',
				lay.overlaps.length === 0 && lay.toolsScroll && !lay.pageScroll,
				JSON.stringify(lay)
			);
		} finally {
			chrome.kill();
		}
	}
	// ---------- WebGL2 が無い端末 ----------
	{
		const { tab, chrome } = await openChrome(9344, {
			args: ['--disable-webgl', '--disable-3d-apis']
		});
		try {
			await tab.size(1280, 720, false);
			await fresh(tab, false);
			await sleep(3000);
			const gl = await tab.eval<boolean>(`!!document.createElement('canvas').getContext('webgl2')`);
			const msg = await tab.eval<string>(`document.querySelector('.nogl')?.textContent ?? ''`);
			await tab.eval(
				`(() => { const b = [...document.querySelectorAll('.opt')].find((x) => x.textContent.includes('町を見て回る')); b && b.click(); })()`
			);
			await sleep(300);
			await tab.eval(`document.querySelector('.req')?.click()`);
			await sleep(300);
			const asked = await tab.eval<boolean>(
				`(() => { const b = [...document.querySelectorAll('.mv')].find((x) => x.textContent.includes('様子を聞く')); if (!b || b.disabled) return false; b.click(); return true; })()`
			);
			await sleep(300);
			const noted = await tab.eval<boolean>(`!!document.querySelector('.notes')`);
			await tab.shot(`${outDir}/${prefix}-nogl.png`);
			check(
				'P-4 WebGL2 が無い端末：その旨を出し、要望の一覧と解き方の板で遊べる',
				!gl && msg.includes('WebGL2') && asked && noted,
				`WebGL2 ${gl} ・ ${msg} ・ 手を打てた ${asked && noted}`
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
