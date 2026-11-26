// 学習画面 第 3 版の測りを、手元の Chrome で流す（look-learn.ts の --scene・--loop・--hover・--terms・--perf。CI では走らせない）
// 相手は 2 つ：試作 learn11（proto:tcp,k8s,mem,stat）と本番（レッスンの ID。公開 URL）。どちらも window.__l3 の窓口で読む。
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openChrome, sleep, type Tab } from './cdp.ts';
import { decodePng, diffRatio, type Img } from './png.ts';
import {
	HOVER_TARGETS,
	PERF_HOOK,
	PROTO_SHIM,
	READ_TIP,
	SNAP_ANATOMY,
	SNAP_METRICS,
	SNAP_SCENE,
	SNAP_SIDE,
	judgeHover,
	judgeLoop,
	judgePerf,
	judgeScene,
	judgeTerms,
	type HoverHit,
	type Res,
	type SceneSnap
} from './learn3-measure.ts';

export const FLAGS3 = ['--scene', '--loop', '--hover', '--terms', '--perf'] as const;
type Flag = (typeof FLAGS3)[number];
type Target = { name: string; url: string; proto: boolean };

const PROTO = pathToFileURL(resolve('docs/prototype/learn/learn11.html')).href;

/** 'proto:tcp,k8s' か 'net-101,k8s-101' を、開く先の一覧にする */
export function targets(spec: string, base: string): Target[] {
	if (spec.startsWith('proto')) {
		const ids = (spec.split(':')[1] || 'tcp,k8s,mem,stat').split(',').filter(Boolean);
		return ids.map((id) => ({ name: `learn11#${id}`, url: `${PROTO}#${id}-still`, proto: true }));
	}
	return spec
		.split(',')
		.filter(Boolean)
		.map((id) => ({ name: id, url: `${base}/lesson/${id}`, proto: false }));
}

async function open(tab: Tab, t: Target): Promise<string> {
	await tab.go(t.url);
	if (!t.proto) {
		await tab.eval('localStorage.clear()');
		await tab.go(t.url);
	}
	await sleep(800);
	if (t.proto) {
		await tab.eval(PROTO_SHIM);
		// 同じファイルで # だけ替えても読み直さないので、レッスンを窓口で替える
		await tab.eval(
			`window.__l3.lesson(${JSON.stringify(t.url.split('#')[1].replace('-still', ''))})`
		);
		await sleep(300);
	}
	const ok = await tab.eval<boolean>('!!window.__l3 && !!window.__l3.svg()');
	return ok ? '' : '第 3 版の画面が無い（window.__l3）';
}

async function svgShot(tab: Tab): Promise<Img | null> {
	const r = await tab.eval<{ x: number; y: number; w: number; h: number } | null>(
		`(() => { const s = window.__l3?.svg(); if (!s) return null; const r = s.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`
	);
	if (!r) return null;
	const res = await tab.send('Page.captureScreenshot', {
		format: 'png',
		clip: { x: r.x, y: r.y, width: Math.max(1, r.w), height: Math.max(1, r.h), scale: 0.5 }
	});
	return decodePng(Buffer.from(String(res.data), 'base64'));
}

async function mouse(tab: Tab, x: number, y: number) {
	await tab.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
}

async function scene(tab: Tab): Promise<Record<string, Res>> {
	const n = await tab.eval<number>('window.__l3.steps');
	const out: Record<string, Res> = {};
	for (let i = 0; i < n; i++) {
		await tab.eval(`window.__l3.go(${i})`);
		await sleep(1500); // 0.9 秒の移り変わりと、物が現れるまで
		const snap = await tab.eval<Omit<SceneSnap, 'step' | 'kind' | 'last'> | null>(SNAP_SCENE);
		if (!snap) {
			out[i + 1] = { 図: '読めない' };
			continue;
		}
		const kind = await tab.eval<string>(`window.__l3.kindLabel(${i})`);
		const type = await tab.eval<string>('window.__l3.type');
		out[i + 1] = judgeScene({ ...snap, type, step: i + 1, kind, last: i === n - 1 });
	}
	return out;
}

async function loop(tab: Tab, step: number): Promise<Res> {
	await tab.eval(`window.__l3.go(${step})`);
	await sleep(1000);
	const diffs: number[] = [];
	let prev = await svgShot(tab);
	let lastT = await tab.eval<number>('window.__l3.t');
	let looped = false;
	for (let i = 0; i < 29; i++) {
		await sleep(1000);
		const cur = await svgShot(tab);
		const t = await tab.eval<number>('window.__l3.t');
		if (t < lastT) looped = true;
		lastT = t;
		if (prev && cur) diffs.push(diffRatio(prev, cur));
		prev = cur;
	}
	await tab.key(' ');
	await sleep(300);
	const tBefore = await tab.eval<number>('window.__l3.t');
	const a = await svgShot(tab);
	await sleep(1500);
	const b = await svgShot(tab);
	await sleep(1500);
	const tAfter = await tab.eval<number>('window.__l3.t');
	await tab.key(' ');
	return judgeLoop({ diffs, tBefore, tAfter, pausedDiff: a && b ? diffRatio(a, b) : 0, looped });
}

async function hover(tab: Tab, step: number): Promise<{ res: Res; hits: HoverHit[] }> {
	await tab.eval(`window.__l3.go(${step})`);
	await sleep(1500);
	const ts =
		await tab.eval<{ kind: HoverHit['kind']; id: string; x: number; y: number }[]>(HOVER_TARGETS);
	const hits: HoverHit[] = [];
	for (const t of ts) {
		await mouse(tab, 2, 2);
		await sleep(250);
		const before =
			t.kind === 'obj'
				? await tab.eval<number>(
						`window.__l3.objEl(${JSON.stringify(t.id)})?.getBoundingClientRect().y ?? 0`
					)
				: 0;
		await mouse(tab, t.x, t.y);
		await sleep(400);
		const tip = await tab.eval<string>(READ_TIP(t.x, t.y));
		const after =
			t.kind === 'obj'
				? await tab.eval<number>(
						`window.__l3.objEl(${JSON.stringify(t.id)})?.getBoundingClientRect().y ?? 0`
					)
				: 0;
		hits.push({ kind: t.kind, id: t.id, tip: tip.slice(0, 80), lift: before - after });
	}
	await mouse(tab, 2, 2);
	return { res: judgeHover(hits), hits };
}

async function terms(tab: Tab): Promise<Res> {
	const n = await tab.eval<number>('window.__l3.steps');
	await tab.eval('window.__l3.go(0)');
	await sleep(1500);
	type Side = { shown: string[]; big: number; marks: number; dup: number; analogy: boolean } | null;
	const s0 = await tab.eval<Side>(SNAP_SIDE);
	const kind0 = await tab.eval<string>('window.__l3.kindLabel(0)');
	const anatomy = await tab.eval<number>(SNAP_ANATOMY);
	const objs0 = await tab.eval<number>('window.__l3.objs().length');
	const met = await tab.eval<{ n: number; tips: number }>(SNAP_METRICS);
	const steps = [];
	for (let i = 1; i < n; i++) {
		await tab.eval(`window.__l3.go(${i})`);
		await sleep(400);
		const s = await tab.eval<Side>(SNAP_SIDE);
		const fresh = await tab.eval<string[]>(`window.__l3.fresh(${i})`);
		steps.push({
			step: i + 1,
			fresh,
			shown: s?.shown ?? [],
			marks: s?.marks ?? 0,
			dupMarks: s?.dup ?? 0
		});
	}
	return judgeTerms({
		kind0,
		anatomy,
		objs0,
		bigTerms: s0?.big ?? 0,
		analogy: s0?.analogy ?? false,
		steps,
		metrics: met.n,
		metricTips: met.tips
	});
}

async function perf(tab: Tab, step: number): Promise<Res> {
	await tab.eval(`window.__l3.go(${step})`);
	await tab.eval(PERF_HOOK);
	await sleep(10000);
	const ms = await tab.eval<number[]>('window.__perf.slice()');
	const r = judgePerf(ms);
	return {
		八ms: r.ok ? true : `平均 ${r.avg} ms（${r.n} コマ・95% ${r.p95} ms）`,
		平均: `${r.avg} ms・95% ${r.p95} ms・${r.n} コマ` as string
	};
}

/** 測りを流して、落ちた件数を返す */
export async function measure3(
	flag: Flag,
	spec: string,
	base: string,
	outDir: string
): Promise<number> {
	const { tab, chrome } = await openChrome(9343);
	const out: Record<string, unknown> = {};
	let bad = 0;
	const step = Number(process.env.STEP ?? 3); // --loop・--hover・--perf を測るステップ（0 から。既定は 4 番目）
	try {
		await tab.scheme(false);
		await tab.size(1440, 900, false);
		for (const t of targets(spec, base)) {
			const err = await open(tab, t);
			if (err) {
				bad++;
				console.log(`${t.name} × ${err}`);
				out[t.name] = err;
				continue;
			}
			let res: Record<string, Res>;
			if (flag === '--scene') res = await scene(tab);
			else if (flag === '--loop') res = { [step + 1]: await loop(tab, step) };
			else if (flag === '--hover') {
				const h = await hover(tab, step);
				res = { [step + 1]: h.res };
				out[`${t.name}-hits`] = h.hits;
			} else if (flag === '--terms') res = { 全体: await terms(tab) };
			else res = { [step + 1]: await perf(tab, step) };
			out[t.name] = res;
			for (const [st, r] of Object.entries(res))
				for (const [k, v] of Object.entries(r)) {
					if (k === '平均') {
						console.log(`${t.name} ${st} ${v}`);
						continue;
					}
					if (v !== true) bad++;
					console.log(`${t.name} ${st} ${k} ${v === true ? 'o' : '× ' + v}`);
				}
		}
	} finally {
		mkdirSync(outDir, { recursive: true });
		writeFileSync(
			join(outDir, `${flag.slice(2)}-${spec.replace(/[^\w,-]/g, '_')}.json`),
			JSON.stringify(out, null, 1)
		);
		console.log(bad === 0 ? '全て満たす' : `満たさない ${bad} 件`);
		chrome.kill();
	}
	return bad;
}
