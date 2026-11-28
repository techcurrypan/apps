// 本物の JavaScript を 1 行ずつ走らせる端末（やってみる。このブラウザの JavaScript そのもの）。
// Node.js の REPL と同じく、宣言は undefined、式はその値を返す。打った行は、エラーにならなかった物だけを覚え、毎回初めから走らせ直す
// （状態は打った行の並びだけで決まる。CLAUDE.md 第 8 章）。乱数と時計は決まった物に替え、止まらない繰り返しは決まった回数で止める（tools/js/guard.ts）。
// 端末の模型 TryScene.run が同期なので、同期の Function と直接の eval で走らせる（tools/js/run.ts は非同期。decisions.md 2026-11-28）
import { guardLoops } from '../tools/js/guard.ts';
import { inspect } from '../tools/js/inspect.ts';
import { JS_CLOCK_BASE, LOOP_LIMIT } from '../tools/js/run.ts';

class LoopStop extends Error {}

export type Ran = { out: string[]; value?: unknown; err?: string; vars: [string, unknown][] };

/** prev（済んだ行）の後に line を走らせ、line の値・書いた物・names の変数の今の値を返す。inject は頁が渡す関数（模擬の標本など） */
export function runRepl(
	prev: string[],
	line: string,
	o: { names?: readonly string[]; inject?: Record<string, unknown> } = {}
): Ran {
	const names = o.names ?? [];
	const inj = Object.entries(o.inject ?? {});
	const out: string[] = [];
	let on = false;
	const log = (...a: unknown[]) => {
		if (on) out.push(a.map((x) => inspect(x, true)).join(' '));
	};
	const console = { log, info: log, warn: log, error: log };
	let steps = 0;
	const __g = () => {
		if (++steps > LOOP_LIMIT) throw new LoopStop();
		return true;
	};
	function* __gi<T>(it: Iterable<T>): Generator<T> {
		for (const v of it) {
			__g();
			yield v;
		}
	}
	let seed = 20261110;
	const FakeMath = Object.create(Math) as Math;
	FakeMath.random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
	const FakeDate = class extends Date {
		constructor(...a: unknown[]) {
			if (a.length === 0) super(JS_CLOCK_BASE);
			else super(...(a as ConstructorParameters<typeof Date>));
		}
		static now() {
			return JS_CLOCK_BASE;
		}
	};
	// 1 行ずつが 1 つの文。次の行の頭が ( や [ でも前の行に続けて読まないよう、; で区切る（自動の ; に頼らない）
	const before = prev.map((l) => guardLoops(l)).join(';\n');
	const probe = `(() => { const r = []; for (const k of ${JSON.stringify(names)}) { let v; try { v = eval(k); } catch { continue; } r.push([k, v]); } return r; })()`;
	const make = (body: string) =>
		new Function(
			'console',
			'__g',
			'__gi',
			'__on',
			'Math',
			'Date',
			...inj.map(([k]) => k),
			body
		) as (...a: unknown[]) => unknown;
	const args = (f: () => void) => [
		console,
		__g,
		__gi,
		f,
		FakeMath,
		FakeDate,
		...inj.map(([, v]) => v)
	];
	let value: unknown;
	let err: string | undefined;
	try {
		// 値は直接の eval で取る（宣言の行は undefined）。書いた物は line の分だけ集める
		value = make(`${before};\n__on();\nreturn eval(${JSON.stringify(guardLoops(line))});`)(
			...args(() => (on = true))
		);
	} catch (e) {
		err =
			e instanceof LoopStop
				? `Uncaught RangeError: 繰り返しが ${LOOP_LIMIT.toLocaleString('en-US')} 回を超えたので止めた`
				: e instanceof Error
					? `Uncaught ${e.name}: ${e.message}`
					: `Uncaught ${inspect(e)}`;
	}
	let vars: [string, unknown][];
	try {
		steps = 0;
		on = false;
		const lines = err
			? before
			: `${before};
${guardLoops(line)}`;
		vars = make(`${lines};
return ${probe};`)(...args(() => {})) as [string, unknown][];
	} catch {
		vars = [];
	}
	return { out, value, err, vars };
}
