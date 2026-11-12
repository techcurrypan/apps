// 段 10-0 の確かめ：実戦の画面の全種類（道具 5 つ・形 5 つ）の見本を、公開 URL でキーボードだけで通す（CI では走らせない）。
// レッスンごとに：実戦の段まで Shift + → で行く → 操作できる物が全て Tab で届く → わざと間違えて「なぜ」「次の一手」→ 解き方で合格
// → 携帯の幅と明暗の両方ではみ出さない。撮った画面は <置き場>/phase-10-0-<レッスン>-*.png
//   npx tsx scripts/look-practice.ts <URL の根> <撮った画面の置き場>
import { join } from 'node:path';
import { FORM_SOLUTIONS, SOLUTIONS } from '../src/lib/content/solutions.ts';
import { lessons } from '../src/lib/content/lessons.ts';
import type { FormAnswer } from '../src/lib/practice/forms.ts';
import { openChrome, sleep, type Tab } from './lib/cdp.ts';

const base = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '');
const outDir = process.argv[3] ?? 'docs/progress/shots';
const only = process.argv[4];
const PORT = 9336;

const results: { ok: boolean; name: string }[] = [];
const check = (name: string, ok: boolean, detail = '') => {
	results.push({ ok, name });
	console.log(`${ok ? 'OK ' : 'NG '} ${name}${detail ? `  ${detail}` : ''}`);
};

async function press(tab: Tab, key: string, opts: { ctrl?: boolean } = {}) {
	const codes: Record<string, [string, number, string?]> = {
		Enter: ['Enter', 13, '\r'],
		' ': ['Space', 32, ' '],
		ArrowDown: ['ArrowDown', 40],
		ArrowUp: ['ArrowUp', 38],
		Tab: ['Tab', 9]
	};
	const [code, kc, text] = codes[key];
	const modifiers = opts.ctrl ? 2 : 0;
	await tab.send('Input.dispatchKeyEvent', {
		type: 'keyDown',
		key,
		code,
		windowsVirtualKeyCode: kc,
		text: opts.ctrl ? undefined : text,
		modifiers
	});
	await tab.send('Input.dispatchKeyEvent', {
		type: 'keyUp',
		key,
		code,
		windowsVirtualKeyCode: kc,
		modifiers
	});
	await sleep(40);
}
const focus = (tab: Tab, sel: string) =>
	tab.eval<boolean>(
		`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.focus(); return document.activeElement === e; })()`
	);

/** 実戦の段で、Tab を押して届く物の印を集める（一周するまで） */
async function tabStops(tab: Tab): Promise<string[]> {
	await tab.eval('document.activeElement?.blur(); document.body.focus()');
	const seen: string[] = [];
	for (let i = 0; i < 80; i++) {
		await press(tab, 'Tab');
		const id = await tab.eval<string>(`(() => {
			const e = document.activeElement; if (!e || e === document.body) return '';
			if (!e.closest('[role="tabpanel"]')) return 'outside';
			return e.id || e.getAttribute('data-k') || (e.tagName + ':' + (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 20));
		})()`);
		if (id) seen.push(id);
	}
	return seen;
}

/** 形の答えを、キーボードで入れる */
async function enterForm(tab: Tab, a: FormAnswer) {
	if (a.kind === 'calc') {
		for (let i = 0; i < a.values.length; i++) {
			await tab.eval(
				`(() => { const e = document.getElementById('calc-${i}'); e.focus(); e.select(); })()`
			);
			await tab.send('Input.insertText', { text: a.values[i] });
		}
	} else if (a.kind === 'order') {
		for (let p = 0; p < a.order.length; p++) {
			for (let guard = 0; guard < 10; guard++) {
				const now = await tab.eval<string[]>(
					`[...document.querySelectorAll('[data-card]')].map((e) => e.getAttribute('data-card'))`
				);
				const i = now.indexOf(a.order[p]);
				if (i <= p) break;
				await focus(tab, `[data-card="${a.order[p]}"] [data-dir="-1"]`);
				await press(tab, 'Enter');
				await sleep(60);
			}
		}
	} else if (a.kind === 'sort' || a.kind === 'fix') {
		const map = a.kind === 'sort' ? a.bins : a.lines;
		const prefix = a.kind === 'sort' ? 'sort-' : 'fix-';
		const ids = await tab.eval<string[]>(
			`[...document.querySelectorAll('select[id^="${prefix}"]')].map((e) => e.id.slice(${prefix.length}))`
		);
		for (const id of ids) {
			const want = map[id];
			const idx = await tab.eval<number>(`(() => {
				const s = document.getElementById('${prefix}${id}');
				const opts = [...s.options];
				return ${want === undefined ? '0' : `opts.findIndex((o) => o.value === ${JSON.stringify(want)})`};
			})()`);
			await focus(tab, `#${prefix}${id}`);
			const cur = await tab.eval<number>(`document.getElementById('${prefix}${id}').selectedIndex`);
			for (let k = cur; k < idx; k++) await press(tab, 'ArrowDown');
			for (let k = cur; k > idx; k--) await press(tab, 'ArrowUp');
		}
	} else if (a.kind === 'pick') {
		const ids = await tab.eval<string[]>(
			`[...document.querySelectorAll('input[name="pick"]')].map((e) => e.value)`
		);
		const cur = await tab.eval<number>(
			`[...document.querySelectorAll('input[name="pick"]')].findIndex((e) => e.checked)`
		);
		const want = ids.indexOf(a.choice);
		if (cur < 0) {
			await focus(tab, 'input[name="pick"]');
			await press(tab, ' ');
			for (let k = 0; k < want; k++) await press(tab, 'ArrowDown');
		} else {
			await focus(tab, 'input[name="pick"]:checked');
			for (let k = cur; k < want; k++) await press(tab, 'ArrowDown');
			for (let k = cur; k > want; k--) await press(tab, 'ArrowUp');
		}
	}
	await focus(tab, '.controls .pri');
	await press(tab, 'Enter');
	await sleep(300);
}

/** 道具の実戦に 1 行（js は書いた物を全部）入れて走らせる */
async function enterTool(tab: Tab, text: string) {
	const isArea = await tab.eval<boolean>(
		`document.getElementById('tool-line')?.tagName === 'TEXTAREA'`
	);
	await tab.eval(
		`(() => { const e = document.getElementById('tool-line'); e.focus(); e.select(); })()`
	);
	await tab.send('Input.insertText', { text });
	await press(tab, 'Enter', { ctrl: isArea });
	for (let i = 0; i < 40; i++) {
		await sleep(150);
		if (
			!(await tab.eval<boolean>(
				`!!document.querySelector('.controls button[type="submit"]')?.disabled`
			))
		)
			break;
	}
	await sleep(250);
}

async function reset(tab: Tab, id: string) {
	await tab.go(`${base}/lesson/${id}`);
	await tab.eval('localStorage.removeItem("devlearn.progress")');
	await tab.go(`${base}/lesson/${id}`);
	// 開いた時は解説の段。実戦の段に着くまで Shift + →
	await tab.eval('document.activeElement?.blur()');
	for (let i = 0; i < 6; i++) {
		const here = await tab.eval<string>(
			`document.querySelector('[role="tabpanel"]')?.getAttribute('aria-label') ?? ''`
		);
		if (here === '実戦') break;
		await tab.key('ArrowRight', true);
		await sleep(150);
	}
	await sleep(400);
}

async function main() {
	const { tab, chrome } = await openChrome(PORT);
	const list = lessons.filter((l) => !only || l.id === only);
	for (const l of list) {
		const form = l.practice.form;
		const label = `${l.id}（${form ?? `${l.practice.tool?.name}`}）`;
		await tab.size(1280, 900, false);
		await tab.scheme(false);
		await reset(tab, l.id);
		const inPractice = await tab.eval<boolean>(
			`!!document.querySelector('[role="tabpanel"][aria-label="実戦"]')`
		);
		check(`${label}：Shift + → で実戦の段に着く`, inPractice);

		// Tab で届く物
		const stops = await tabStops(tab);
		const need = await tab.eval<string[]>(`(() => {
			const p = document.querySelector('[role="tabpanel"]');
			return [...p.querySelectorAll('input:not([type="radio"]), select, textarea, button:not([disabled]), input[type="radio"]:checked, input[type="radio"]')]
				.filter((e) => !(e.type === 'radio' && e !== p.querySelector('input[type="radio"]')))
				.map((e) => e.id || e.getAttribute('data-k') || (e.tagName + ':' + (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 20)));
		})()`);
		const missing = need.filter((x) => !stops.includes(x));
		check(
			`${label}：操作できる物が全て Tab で届く`,
			missing.length === 0,
			missing.length ? `届かない ${missing.join(' / ')}` : `${need.length} 個`
		);

		// わざと間違える（mistakes の 1 件目）
		if (form) {
			const sol = FORM_SOLUTIONS[l.id];
			await enterForm(tab, sol.wrong[0]);
		} else {
			const sol = SOLUTIONS[l.id];
			for (const line of sol.wrong[0]) await enterTool(tab, line);
		}
		const why = await tab.eval<string>(`document.querySelector('.reply.wrong')?.textContent ?? ''`);
		check(
			`${label}：わざと間違えると、なぜと次の一手が出る`,
			why.includes('なぜ駄目か') &&
				why.includes('次の一手') &&
				why.includes(l.practice.mistakes[0].why.slice(0, 12)),
			why.replace(/\s+/g, ' ').slice(0, 70)
		);
		await sleep(form ? 1200 : 300);
		await tab.shot(join(outDir, `phase-10-0-${l.id}-wrong.png`));

		// 解き方で合格（形は、間違いの答えから入れ直す）
		if (form) await enterForm(tab, FORM_SOLUTIONS[l.id].pass);
		else {
			await reset(tab, l.id);
			for (const line of SOLUTIONS[l.id].pass) await enterTool(tab, line);
		}
		await sleep(form ? 2600 : 900);
		const ok = await tab.eval<string>(`document.querySelector('.reply.ok')?.textContent ?? ''`);
		const saved = await tab.eval<string>('localStorage.getItem("devlearn.progress") ?? ""');
		check(`${label}：解き方で合格し、修了が残る`, ok.includes('合格') && saved.includes(l.id));
		await tab.shot(join(outDir, `phase-10-0-${l.id}-passed.png`));

		// 結果をもう一度流す（R）
		if (form) {
			await tab.eval('document.activeElement?.blur()');
			const run = () =>
				tab.eval<string>(`document.querySelector('.flow')?.getAttribute('data-run') ?? ''`);
			const before = await run();
			await tab.key('R');
			await sleep(100);
			const after = await run();
			const moving = await tab.eval<number>(
				`document.querySelector('.flow')?.getAnimations({ subtree: true }).length ?? 0`
			);
			check(
				`${label}：R で結果をもう一度流す`,
				before !== after && after !== '' && moving > 0,
				`流した回 ${before} → ${after}・動き ${moving}`
			);
		}

		// 携帯の幅・明暗
		for (const dark of [false, true]) {
			await tab.size(390, 844, true);
			await tab.scheme(dark);
			await sleep(300);
			const overflow = await tab.eval<number>(
				'document.documentElement.scrollWidth - document.documentElement.clientWidth'
			);
			check(
				`${label}：携帯の幅 ${dark ? '暗' : '明'} で横にはみ出さない`,
				overflow <= 0,
				`はみ出し ${overflow}px`
			);
			await tab.eval(`document.querySelector('[role="tabpanel"]')?.scrollIntoView()`);
			await tab.shot(join(outDir, `phase-10-0-${l.id}-phone-${dark ? 'dark' : 'light'}.png`));
		}
		await tab.size(1280, 900, false);
		await tab.scheme(true);
		await sleep(200);
		await tab.shot(join(outDir, `phase-10-0-${l.id}-dark.png`));
	}
	chrome.kill();
	const ng = results.filter((r) => !r.ok);
	console.log(`\n${results.length - ng.length} / ${results.length} 件を満たした`);
	process.exit(ng.length === 0 ? 0 : 1);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
