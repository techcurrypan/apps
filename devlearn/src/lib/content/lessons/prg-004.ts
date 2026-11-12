// prg-004 関数に分ける（本物の JavaScript）。
// 出力は全て、実戦の道具（src/lib/tools/js/run.ts）で走らせて得た物（solutions.test.ts が例を流して確かめる）。
// 場面：パン屋の会計。税抜きの値段から、1 割の税を足した値段を出す。経過時刻 t は会計の作業を始めた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const CODE = '呼ぶ側';
const FN = 'withTax';
const OUT = '出力';

export const prg004: Lesson = {
	id: 'prg-004',
	field: 'prg',
	level: 1,
	title: '関数に分ける',
	goal: '関数に渡した値と返る値を、呼び出しごとに追うことができる',
	prereq: ['prg-003'],
	related: [],
	next: ['prg-005', 'prg-007', 'prg-009'],
	explain: [
		{
			n: 1,
			title: '手順に名前を付ける',
			lead: 'function で、何度も使う手順に名前を付ける',
			body: [
				'税を足す手順は、どの品でも同じだ。',
				'function withTax(price) { … } と書き、手順に withTax と名前を付ける。',
				'書いただけでは、中はまだ 1 度も走らない。'
			],
			facts: [
				{ k: '名前', v: 'withTax' },
				{ k: '受け取る物（引数）', v: 'price' },
				{ k: '走った回数', v: '0' }
			],
			scene: [
				{ op: 'appear', id: 'code', label: CODE, sub: 'console.log(withTax(…))', at: [0, 0] },
				{ op: 'appear', id: 'fn', label: FN, sub: 'function', at: [2, 0] }
			],
			log: {
				t: '0s',
				from: CODE,
				to: FN,
				kind: 'define',
				info: 'withTax を作った。まだ走っていない'
			}
		},
		{
			n: 2,
			title: '値を渡す',
			lead: '呼ぶときの丸括弧の値が、引数 price に入る',
			body: [
				'withTax(120) と呼ぶと、120 が関数へ運ばれる。',
				'関数の中では、price という名前で 120 を読める。',
				'渡す値は呼ぶたびに替えられる。'
			],
			facts: [
				{ k: '呼び方', v: 'withTax(120)' },
				{ k: 'price', v: '120' }
			],
			scene: [
				{ op: 'move', from: 'code', to: 'fn', payload: '120', kind: 'call' },
				{ op: 'change', id: 'fn', k: 'price', v: '120' }
			],
			log: {
				t: '1s',
				from: CODE,
				to: FN,
				kind: 'call',
				info: 'withTax(120) を呼んだ',
				size: '1 個'
			}
		},
		{
			n: 3,
			title: '中で計算する',
			lead: '関数の中だけで使う変数 tax に、税の額を入れる',
			body: [
				'const tax = Math.floor(price * 0.1); で税を求める。',
				'120 * 0.1 は 12.000000000000002 になり、Math.floor で 12 に切り下げる。',
				'小数は 2 進数で持つので、わずかな誤差が出る。'
			],
			facts: [
				{ k: 'price * 0.1', v: '12.000000000000002' },
				{ k: 'Math.floor(…)', v: '12' },
				{ k: 'tax', v: '12' }
			],
			scene: [
				{ op: 'appear', id: 'tax', label: 'tax', sub: '中の変数', at: [3, 0] },
				{ op: 'change', id: 'tax', k: '値', v: '12' }
			],
			log: { t: '1s', from: FN, to: 'tax', kind: 'calc', info: 'tax に 12 を入れた' }
		},
		{
			n: 4,
			title: '値を返す',
			lead: 'return の値が、呼んだ所へ戻る',
			body: [
				'return price + tax; で、120 + 12 の 132 を返す。',
				'withTax(120) と書いた所が、132 に置き換わる。',
				'console.log(withTax(120)) は 132 を出す。'
			],
			facts: [
				{ k: 'return', v: 'price + tax' },
				{ k: '返った値', v: '132' },
				{ k: '出力', v: '132' }
			],
			scene: [
				{ op: 'move', from: 'fn', to: 'code', payload: '132', kind: 'return' },
				{ op: 'appear', id: 'out', label: OUT, sub: 'console.log', at: [1, 1] },
				{ op: 'change', id: 'out', k: '1 行目', v: '132' }
			],
			log: { t: '2s', from: FN, to: CODE, kind: 'return', info: '132 を返した' }
		},
		{
			n: 5,
			title: '2 回呼ぶ',
			lead: '同じ関数を別の値で呼ぶと、別の答えが返る',
			body: [
				'withTax(250) と呼ぶと、今度は price が 250 になる。',
				'tax は 25 で、275 が返る。',
				'1 回目の price や tax は残っておらず、毎回まっさらから走る。'
			],
			facts: [
				{ k: '呼び方', v: 'withTax(250)' },
				{ k: 'tax', v: '25' },
				{ k: '返った値', v: '275' }
			],
			scene: [
				{ op: 'move', from: 'code', to: 'fn', payload: '250', kind: 'call' },
				{ op: 'change', id: 'fn', k: 'price', v: '250' },
				{ op: 'change', id: 'tax', k: '値', v: '25' },
				{ op: 'change', id: 'out', k: '2 行目', v: '275' }
			],
			log: {
				t: '3s',
				from: CODE,
				to: FN,
				kind: 'call',
				info: 'withTax(250) は 275 を返した',
				size: '1 個'
			}
		},
		{
			n: 6,
			title: '中の変数は外から見えない',
			lead: 'tax は関数の中だけの名前。外からは読めない',
			body: [
				'関数の外で typeof tax を出すと undefined になる。',
				'外で console.log(tax) と書くと ReferenceError で止まる。',
				'中の名前が外の名前とぶつからないので、関数を安心して使い回せる。'
			],
			facts: [
				{ k: '外で typeof tax', v: 'undefined' },
				{ k: '外で console.log(tax)', v: 'ReferenceError: tax is not defined' }
			],
			scene: [
				{ op: 'vanish', id: 'tax' },
				{ op: 'change', id: 'out', k: '3 行目', v: 'undefined' }
			],
			log: {
				t: '4s',
				from: CODE,
				to: OUT,
				kind: 'log',
				info: '外から tax は見えない（undefined）'
			},
			why: '中の変数は呼ぶたびに作られ、終わると捨てられるので、外の名前と混ざらない'
		}
	],
	example: {
		intro: '税を足す関数を 2 回呼び、外から tax を覗く。下の 7 行を走らせた',
		lines: [
			'function withTax(price) {',
			'  const tax = Math.floor(price * 0.1);',
			'  return price + tax;',
			'}',
			'console.log(withTax(120));',
			'console.log(withTax(250));',
			'console.log(typeof tax);',
			'▶ 出力',
			'132',
			'275',
			'undefined'
		]
	},
	practice: {
		goal: 'パンを箱に詰めるのに要る箱の数を返す関数を書き、3 回の呼び出しで正しい数を返す',
		tool: { name: 'js', mode: 'real' },
		setup: {
			code: '// 1 箱に size 個入る。count 個を詰めるのに要る箱の数を返す（端数は 1 箱足す。切り上げは Math.ceil）\nfunction boxes(count, size) {\n}\nconsole.log(boxes(10, 4), boxes(8, 4), boxes(1, 6));\n'
		},
		success: { output: '3 2 1\n' },
		mistakes: [
			{
				when: 'return を書かなかった',
				why: 'return が無い関数は undefined を返す。呼んだ所が undefined に置き換わる',
				next: '計算した箱の数を return で返す',
				match: 'undefined'
			},
			{
				when: '割った値をそのまま返した',
				why: '10 / 4 は 2.5 だ。箱は 0.5 箱を使えないので、端数は 1 箱に数える',
				next: 'Math.ceil(count / size) で切り上げる',
				match: '2.5'
			},
			{
				when: 'Math.floor で切り下げた',
				why: '切り下げると端数の 2 個が箱に入らない。10 個に 2 箱、1 個に 0 箱になる',
				next: '切り上げの Math.ceil にする',
				match: '2 2 0'
			}
		]
	},
	check: [
		{ ask: '渡した値の行き先', how: 'withTax(120) の 120 が price に入る' },
		{ ask: '返る値', how: 'return の値が、呼んだ所に置き換わる（132）' },
		{ ask: '中の変数', how: '外からは読めない（typeof tax は undefined）' }
	]
};
