// 本物の JavaScript を走らせる道具（docs/tools.md 3.4）。書いた物の全体を、その都度初めから走らせる。
// 本物の言語の動き（値・エラー・Promise の順番）は、このブラウザの JavaScript そのもの。
// 乱数と時計だけは決まった物に替える（同じ物を走らせれば同じ結果。CLAUDE.md 8 章）：
//   Math.random … 決まった種から決まった並び / Date … 場面の始まり 2026-11-10T09:00:00+09:00 から
//   setTimeout … 本当には待たず、作り物の時計を進めて順に呼ぶ / 繰り返し … 決まった回数で止める
import type { Result } from '../session.ts';
import { guardLoops } from './guard.ts';
import { inspect } from './inspect.ts';

export const JS_CLOCK_BASE = 1794268800000;
export const LOOP_LIMIT = 100000;
const TIMER_LIMIT = 1000;

export type JsState = { code: string };
export type JsTool = { run(state: JsState, code: string): Promise<Result & { state: JsState }> };

class LoopLimit extends Error {}

// 決まった種の乱数（mulberry32）。走らせるたびに同じ種から
function seeded(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

type Timer = { id: number; at: number; seq: number; fn: () => void; every: number | null };

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
	...args: string[]
) => (...a: unknown[]) => Promise<unknown>;

// 本物の時計で次の番まで待つ（溜まった Promise の続きを全て流すため。待つ長さは 0）
const realTick = () => new Promise<void>((r) => globalThis.setTimeout(r, 0));

const describe = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : `${inspect(e)}`);

export async function runJs(code: string, prelude = ''): Promise<Result> {
	let out = '';
	let err = '';
	let failed = false;
	const fmt = (args: unknown[]) => args.map((a) => inspect(a, true)).join(' ') + '\n';
	const console = {
		log: (...a: unknown[]) => void (out += fmt(a)),
		info: (...a: unknown[]) => void (out += fmt(a)),
		warn: (...a: unknown[]) => void (err += fmt(a)),
		error: (...a: unknown[]) => void (err += fmt(a))
	};

	let steps = 0;
	let limitHit = false;
	const __g = () => {
		if (++steps > LOOP_LIMIT) {
			limitHit = true;
			throw new LoopLimit();
		}
		return true;
	};
	function* __gi<T>(it: Iterable<T>): Generator<T> {
		for (const v of it) {
			__g();
			yield v;
		}
	}

	let now = JS_CLOCK_BASE;
	const FakeDate = class extends Date {
		constructor(...a: unknown[]) {
			if (a.length === 0) super(now);
			else super(...(a as ConstructorParameters<typeof Date>));
		}
		static now() {
			return now;
		}
	};
	const FakeMath = Object.create(Math) as Math;
	FakeMath.random = seeded(20261110);

	const timers: Timer[] = [];
	let seq = 0;
	const addTimer = (fn: unknown, ms: unknown, every: boolean) => {
		const id = ++seq;
		const d = Math.max(0, Number(ms) || 0);
		if (typeof fn === 'function')
			timers.push({
				id,
				at: now + d,
				seq: id,
				fn: fn as () => void,
				every: every ? Math.max(1, d) : null
			});
		return id;
	};
	const clear = (id: unknown) => {
		const k = timers.findIndex((t) => t.id === id);
		if (k >= 0) timers.splice(k, 1);
	};

	const fail = (e: unknown, inPromise = false) => {
		failed = true;
		err +=
			e instanceof LoopLimit
				? `（模擬の上限）繰り返しが ${LOOP_LIMIT} 回を超えたので止めた。止まらない繰り返しになっていないか確かめる\n`
				: `Uncaught ${inPromise ? '(in promise) ' : ''}${describe(e)}\n`;
	};

	const names = [
		'console',
		'Math',
		'Date',
		'setTimeout',
		'clearTimeout',
		'setInterval',
		'clearInterval',
		'__g',
		'__gi'
	];
	const values: unknown[] = [
		console,
		FakeMath,
		FakeDate,
		(fn: unknown, ms: unknown) => addTimer(fn, ms, false),
		clear,
		(fn: unknown, ms: unknown) => addTimer(fn, ms, true),
		clear,
		__g,
		__gi
	];
	const body = (src: string) => `"use strict";\n${prelude}\n${src}`;
	let fn: (...a: unknown[]) => Promise<unknown>;
	try {
		// 書き方の誤りは、見張りを入れる前の物で見る（本物の言い方のまま出すため）
		new AsyncFunction(...names, body(code));
		fn = new AsyncFunction(...names, body(guardLoops(code)));
	} catch (e) {
		fail(e);
		return { out, err, code: 1 };
	}

	// 一番外の await が作り物の時計を待つこともあるので、外の終わりを待たずに時計を回す。
	// 外が待ったまま、もう呼ぶ物が無ければ、そこで終わる（本物でも、それ以上は何も起きない）
	fn(...values).catch((e: unknown) => fail(e));
	await realTick();
	for (let k = 0; k < TIMER_LIMIT && timers.length > 0; k++) {
		timers.sort((a, b) => a.at - b.at || a.seq - b.seq);
		const t = timers.shift() as Timer;
		now = t.at;
		if (t.every !== null) timers.push({ ...t, at: t.at + t.every, seq: ++seq });
		try {
			t.fn();
		} catch (e) {
			fail(e);
			if (e instanceof LoopLimit) break;
		}
		await realTick();
	}
	// 書いた物の try が上限の知らせを受け止めても、止めたことは知らせる
	if (limitHit && !failed) fail(new LoopLimit());
	return { out, err, code: failed ? 1 : 0 };
}

export function jsTool(prelude = ''): JsTool {
	return {
		async run(_state, code) {
			const r = await runJs(code, prelude);
			return { ...r, state: { code } };
		}
	};
}
