// やってみる（stat。sta-019）：本物の JavaScript を 1 行ずつ打ち、標準誤差・標本平均・z 値・信頼区間を自分で出す。
// 計算はこのブラウザの JavaScript そのもの（learn/js-repl.ts）。標本だけは模擬：waits(n, day) が、見るの図と同じ模型
// （learn/stat-sim.ts。指数分布・平均 4 分・種 7）の day 日目の n 人の待ち時間（分）を返す。同じ引数なら同じ値（CLAUDE.md 第 8 章）
import type { TryLine, TryResult, TryScene, TryState } from '../../learn/try3.ts';
import { runRepl } from '../../learn/js-repl.ts';
import { inspect } from '../../tools/js/inspect.ts';
import { sim } from '../../learn/stat-sim.ts';

const o = (text: string, kind: TryLine['kind'] = 'out'): TryLine => ({ text, kind });
const SE = 4 / Math.sqrt(30);
const near = (a: unknown, b: number, eps: number) => typeof a === 'number' && Math.abs(a - b) < eps;

/** 模擬の標本：day 日目（0〜39）の n 人（1〜200）の待ち時間 */
function waits(n: unknown, day: unknown = 0): number[] {
	const nn = Number(n);
	const dd = Number(day);
	if (!Number.isInteger(nn) || nn < 1 || nn > 200)
		throw new RangeError('waits の n は 1〜200 の整数');
	if (!Number.isInteger(dd) || dd < 0 || dd > 39)
		throw new RangeError('waits の day は 0〜39 の整数');
	return sim(nn, 40, 0).firsts[dd].slice();
}

const linesOf = (s: TryState): string[] => (s.v.code ? (JSON.parse(s.v.code) as string[]) : []);
export type StatFig = { day: number | null; n: number; mean: number | null; ci: boolean };
/** 図の元：取った日・人数・出した平均・信頼区間を出したか */
export const statFig = (s: TryState): StatFig =>
	s.v.fig ? (JSON.parse(s.v.fig) as StatFig) : { day: null, n: 30, mean: null, ci: false };

export const TRY_STAT: TryScene = {
	id: 'stat',
	ps: '>',
	who: '窓口の係長',
	req: '今日の 30 人の平均が 4.64 分だった。いつもは 4 分。待ち時間が長くなったと言ってよいか、数で確かめて報告して。',
	cards: [
		'const se = 4 / Math.sqrt(30)',
		'const x = waits(30, 20)',
		'x.length',
		'const m = x.reduce((a, b) => a + b, 0) / x.length',
		'm',
		'(m - 4) / se',
		'[m - 1.96 * se, m + 1.96 * se]'
	],
	refs: [
		[
			'Math.sqrt',
			'https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/sqrt'
		],
		[
			'Array.prototype.reduce',
			'https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce'
		],
		['平均の信頼区間（NIST）', 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda352.htm']
	],
	tasks: [
		{ t: '標準誤差 σ/√n を出す（σ = 4・n = 30）', done: (s) => !!s.f.se },
		{ t: 'waits(30, 20) で今日の 30 人を取る', done: (s) => !!s.f.take },
		{ t: '30 人の平均を出す', done: (s) => !!s.f.mean },
		{ t: 'z 値 (平均 − 4) ÷ 標準誤差 を出す', done: (s) => !!s.f.z },
		{ t: '95% の信頼区間 平均 ± 1.96 × 標準誤差 を出す', done: (s) => !!s.f.ci }
	],
	init: () => ({
		lines: [
			o(
				'# 本物の JavaScript（このブラウザ）。waits(n, day) は模擬の標本：day 日目（0〜39）の n 人の待ち時間（分）',
				'note'
			)
		],
		f: {},
		v: { code: '[]' }
	}),
	run(c: string, s: TryState): TryResult {
		if (c === 'help')
			return { out: [o('見本の命令を押すか、JavaScript を 1 行打つ。clear で画面を消す', 'hint')] };
		const prev = linesOf(s);
		const r = runRepl(prev, c, { names: ['x', 'm', 'se'], inject: { waits } });
		const out = [...r.out.map((x) => o(x)), r.err ? o(r.err, 'err') : o(inspect(r.value))];
		if (r.err) return { out };
		const vars = new Map(r.vars);
		const x = vars.get('x');
		const xs = Array.isArray(x) ? (x as number[]) : null;
		const mean = xs && xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
		const f: Record<string, boolean> = {};
		if (near(r.value, SE, 5e-4)) f.se = true;
		if (/waits\s*\(/.test(c)) f.take = true;
		if (mean !== null && near(r.value, mean, 5e-4)) f.mean = true;
		if (mean !== null && near(r.value, (mean - 4) / SE, 1e-3)) f.z = true;
		const v = r.value;
		if (
			mean !== null &&
			Array.isArray(v) &&
			v.length === 2 &&
			near(v[0], mean - 1.96 * SE, 1e-3) &&
			near(v[1], mean + 1.96 * SE, 1e-3)
		)
			f.ci = true;
		const day = /waits\s*\(\s*(\d+)\s*(?:,\s*(\d+))?/.exec(
			[...prev, c].filter((l) => /waits\s*\(/.test(l)).at(-1) ?? ''
		);
		const old = statFig(s);
		const fig: StatFig = {
			day: day ? Number(day[2] ?? 0) : old.day,
			n: day ? Number(day[1]) : old.n,
			mean: s.f.mean || f.mean ? mean : null,
			ci: !!(s.f.ci || f.ci)
		};
		return { out, f, v: { code: JSON.stringify([...prev, c]), fig: JSON.stringify(fig) } };
	},
	metrics(s: TryState) {
		const g = statFig(s);
		return {
			n: String(g.n),
			se: s.f.se ? `${SE.toFixed(2)} 分` : '?',
			z: g.mean !== null && s.f.z ? ((g.mean - 4) / SE).toFixed(2) : '?'
		};
	}
};
