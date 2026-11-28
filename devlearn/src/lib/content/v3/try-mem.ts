// やってみる（mem）：本物の JavaScript を 1 行ずつ打つ（このブラウザの JavaScript そのもの。curriculum.md の prg-006 は js:本物）。
// Node.js の REPL と同じく、宣言は undefined、式はその値を返す（出力の形は Node.js v24.19.0 の REPL に合わせた。確認日 2026-11-28）。
// 打った行は、エラーにならなかった物だけを覚え、毎回初めから走らせ直す（状態は打った行の並びだけで決まる。CLAUDE.md 第 8 章）。
// 乱数と時計は決まった物に替える。止まらない繰り返しは決まった回数で止める（tools/js/guard.ts）
import type { TryLine, TryResult, TryScene, TryState } from '../../learn/try3.ts';
import { inspect } from '../../tools/js/inspect.ts';
import { runRepl } from '../../learn/js-repl.ts';

const o = (text: string, kind: TryLine['kind'] = 'out'): TryLine => ({ text, kind });

/** 図に出す名前（この順に探す） */
const NAMES = ['a', 'b', 'c', 'd', 'e', 'xs', 'ys'];
export type FigName = { name: string; obj: number; vals: string[] };

/** prev の後に line を走らせ、名前ごとの配列の表（同じ物は同じ番号）を作る */
function runLines(prev: string[], line: string) {
	const r = runRepl(prev, line, { names: NAMES });
	const objs: unknown[] = [];
	const fig: FigName[] = r.vars
		.filter((x): x is [string, unknown[]] => Array.isArray(x[1]))
		.map(([name, v]) => {
			if (!objs.includes(v)) objs.push(v);
			return { name, obj: objs.indexOf(v), vals: v.slice(0, 6).map((x) => inspect(x)) };
		});
	return { ...r, fig };
}

const linesOf = (s: TryState): string[] => (s.v.code ? (JSON.parse(s.v.code) as string[]) : []);
/** 図の元：名前ごとに、どの物を指すか（同じ物は同じ番号）と、中身（6 個まで） */
export const memFig = (s: TryState): FigName[] =>
	s.v.fig ? (JSON.parse(s.v.fig) as FigName[]) : [];
const shared = (fig: FigName[], name: string) => {
	const me = fig.find((f) => f.name === name);
	return !!me && fig.some((f) => f.name !== name && f.obj === me.obj);
};
const MUTATE =
	/^(\w+)\s*(?:\.\s*(?:push|pop|shift|unshift|splice|sort|reverse|fill)\s*\(|\[\s*\d+\s*\]\s*=[^=])/;
const COPY = /\[\s*\.\.\.\s*\w+\s*\]|\.slice\(\s*\)|Array\.from\(|structuredClone\(/;
const READ = /^(?:console\.log\(\s*)?(\w+)\s*\)?\s*;?$/;

export const TRY_MEM: TryScene = {
	id: 'mem',
	ps: '>',
	who: '同じ班の新人',
	req: '設定の配列を関数に渡したら、元の設定まで書き換わってしまった。名前と物の関係を手で確かめて、元を守る書き方を見せて。',
	cards: [
		'let a = [1, 2]',
		'let b = a',
		'b.push(3)',
		'a',
		'a === b',
		'let c = [...a]',
		'c.push(4)',
		'structuredClone([[1], 2])'
	],
	refs: [
		[
			'Array.prototype.push',
			'https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/push'
		],
		[
			'厳密等価（===）',
			'https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Strict_equality'
		],
		[
			'スプレッド構文',
			'https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Spread_syntax'
		],
		['structuredClone', 'https://developer.mozilla.org/ja/docs/Web/API/Window/structuredClone'],
		['メモリ管理', 'https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Memory_management']
	],
	tasks: [
		{ t: 'let a = [1, 2] を作り、let b = a で同じ物に名前を足す', done: (s) => !!s.f.alias },
		{ t: 'b を書き換えて、a も変わったのを見る', done: (s) => !!s.f.seen },
		{ t: 'a === b で同じ物か確かめる', done: (s) => !!s.f.is },
		{ t: '写しを作る（[...a]・a.slice()・structuredClone(a)）', done: (s) => !!s.f.copy },
		{ t: '写しを書き換えても a が変わらないのを見る', done: (s) => !!s.f.safe }
	],
	init: () => ({
		lines: [
			o(
				'# 本物の JavaScript（このブラウザ）。1 行ずつ打つと、Node.js の REPL と同じ形で返す',
				'note'
			)
		],
		f: {},
		v: { code: '[]', fig: '[]' }
	}),
	run(c: string, s: TryState): TryResult {
		if (c === 'help')
			return { out: [o('見本の命令を押すか、JavaScript を 1 行打つ。clear で画面を消す', 'hint')] };
		const prev = linesOf(s);
		const r = runLines(prev, c);
		const out = [...r.out.map((x) => o(x)), r.err ? o(r.err, 'err') : o(inspect(r.value))];
		if (r.err) return { out };
		const before = memFig(s);
		const f: Record<string, boolean> = {};
		if (r.fig.length > 1 && r.fig.some((x) => shared(r.fig, x.name))) f.alias = true;
		const mut = MUTATE.exec(c)?.[1];
		if (mut && shared(r.fig, mut)) f.mut = true;
		const read = READ.exec(c)?.[1];
		if (read && s.f.mut && shared(r.fig, read)) f.seen = true;
		if (c.includes('===') && typeof r.value === 'boolean') f.is = true;
		if (COPY.test(c) && r.fig.length > before.length) f.copy = true;
		if (mut && s.f.copy && !shared(r.fig, mut)) {
			const a = r.fig.find((x) => x.name === 'a');
			const a0 = before.find((x) => x.name === 'a');
			if (a && a0 && a.vals.join() === a0.vals.join()) f.safe = true;
		}
		return { out, f, v: { code: JSON.stringify([...prev, c]), fig: JSON.stringify(r.fig) } };
	},
	metrics(s: TryState) {
		const fig = memFig(s);
		const a = fig.find((x) => x.name === 'a');
		const b = fig.find((x) => x.name === 'b');
		return {
			objs: String(new Set(fig.map((x) => x.obj)).size),
			same: a && b ? String(a.obj === b.obj) : '—'
		};
	}
};
