// prg-011 再帰（本物の JavaScript）。
// 出力は全て、実戦の道具（src/lib/tools/js/run.ts）で走らせて得た物（solutions.test.ts が例を流して確かめる）。
// 場面：パンの並べ方の数。3 種のパンを 1 列に並べる並べ方は 3 × 2 × 1 通り。経過時刻 t は呼び出しの順に 0s・1s… と置いた。
import type { Lesson } from '../../lesson/types.ts';

const OUT = '出力';

export const prg011: Lesson = {
	id: 'prg-011',
	field: 'prg',
	level: 3,
	title: '再帰',
	goal: '再帰の呼び出しが積み上がって戻るまでを追うことができる',
	prereq: ['prg-004'],
	related: ['ai-003'],
	next: [],
	explain: [
		{
			n: 1,
			title: '自分を呼ぶ関数',
			lead: 'fact(n) は、中で fact(n - 1) を呼ぶ',
			body: [
				'3 種のパンの並べ方は 3 × 2 × 1 で 6 通りだ。',
				'fact(n) は n × fact(n − 1) と書ける。自分で自分を呼ぶので再帰と言う。',
				'console.log(fact(3)) から始める。'
			],
			facts: [
				{ k: '式', v: 'fact(n) = n × fact(n − 1)' },
				{ k: '求める物', v: 'fact(3)' }
			],
			scene: [
				{ op: 'appear', id: 'f3', label: 'fact(3)', sub: 'n = 3', at: [0, 0] },
				{ op: 'change', id: 'f3', k: '状態', v: '呼んだ' }
			],
			log: { t: '0s', from: '一番外', to: 'fact(3)', kind: 'call', info: '呼んだ 3' }
		},
		{
			n: 2,
			title: '1 段目',
			lead: 'fact(3) は答えを出す前に、fact(2) を呼んで待つ',
			body: [
				'fact(3) は 3 × fact(2) を計算したい。',
				'fact(2) の答えがまだ無いので、fact(2) を呼んでそこで待つ。',
				'待っている fact(3) は、呼び出しの積み重ねに残る。'
			],
			facts: [
				{ k: '待っている物', v: 'fact(3)：3 × ?' },
				{ k: '積み重ねの段', v: '2' }
			],
			scene: [
				{ op: 'appear', id: 'f2', label: 'fact(2)', sub: 'n = 2', at: [1, 1] },
				{ op: 'move', from: 'f3', to: 'f2', payload: '2', kind: 'call' },
				{ op: 'change', id: 'f3', k: '状態', v: '3 × ? を待つ' }
			],
			log: { t: '1s', from: 'fact(3)', to: 'fact(2)', kind: 'call', info: '呼んだ 2' }
		},
		{
			n: 3,
			title: '2 段目',
			lead: 'fact(2) も fact(1) を呼んで待ち、段が積み上がる',
			body: [
				'fact(2) も 2 × fact(1) を計算したいので、fact(1) を呼ぶ。',
				'積み重ねは fact(3)・fact(2)・fact(1) の 3 段になる。',
				'まだどの段も答えを返していない。'
			],
			facts: [
				{ k: '待っている物', v: 'fact(3)：3 × ? / fact(2)：2 × ?' },
				{ k: '積み重ねの段', v: '3' }
			],
			scene: [
				{ op: 'appear', id: 'f1', label: 'fact(1)', sub: 'n = 1', at: [2, 2] },
				{ op: 'move', from: 'f2', to: 'f1', payload: '1', kind: 'call' },
				{ op: 'change', id: 'f2', k: '状態', v: '2 × ? を待つ' }
			],
			log: { t: '2s', from: 'fact(2)', to: 'fact(1)', kind: 'call', info: '呼んだ 1' }
		},
		{
			n: 4,
			title: '止まる条件',
			lead: 'n が 1 なら、もう呼ばずに 1 を返す',
			body: [
				'先頭に if (n === 1) return 1; を置いてある。',
				'fact(1) はここで 1 を返し、新しい段を積まない。',
				'この止まる条件が、積み上がりを終わらせる。'
			],
			facts: [
				{ k: '止まる条件', v: 'n === 1' },
				{ k: 'fact(1) が返す値', v: '1' }
			],
			scene: [
				{ op: 'change', id: 'f1', k: '状態', v: '1 を返す' },
				{ op: 'highlight', id: 'f1' }
			],
			log: { t: '3s', from: 'fact(1)', to: 'fact(1)', kind: 'base', info: '止まる条件。1 を返す' }
		},
		{
			n: 5,
			title: '戻りながら掛ける',
			lead: '返った値で、待っていた段が順に計算を終える',
			body: [
				'fact(2) は 2 × 1 で 2 を返し、戻った 2 2 と出す。',
				'fact(3) は 3 × 2 で 6 を返し、戻った 3 6 と出す。',
				'積んだのと逆の順に、上の段から片付いていく。'
			],
			facts: [
				{ k: 'fact(2)', v: '2 × 1 = 2' },
				{ k: 'fact(3)', v: '3 × 2 = 6' },
				{ k: '戻る順', v: 'fact(1) → fact(2) → fact(3)' }
			],
			scene: [
				{ op: 'move', from: 'f1', to: 'f2', payload: '1', kind: 'return' },
				{ op: 'vanish', id: 'f1' },
				{ op: 'move', from: 'f2', to: 'f3', payload: '2', kind: 'return' },
				{ op: 'vanish', id: 'f2' },
				{ op: 'change', id: 'f3', k: '状態', v: '6 を返す' }
			],
			log: {
				t: '4s',
				from: 'fact(2)',
				to: 'fact(3)',
				kind: 'return',
				info: '戻った 2 2 → 戻った 3 6'
			},
			why: '後から呼んだ段ほど先に答えが出るので、積んだのと逆の順に戻る'
		},
		{
			n: 6,
			title: '止まる条件が無いと',
			lead: '段が際限なく積まれ、RangeError で止まる',
			body: [
				'if (n === 1) を消すと、fact(0)・fact(−1)… と呼び続ける。',
				'積める段には上限があり、超えると止まる。',
				'エラーは RangeError: Maximum call stack size exceeded だ。'
			],
			facts: [
				{ k: '消した行', v: 'if (n === 1) return 1;' },
				{ k: 'エラー', v: 'RangeError: Maximum call stack size exceeded' }
			],
			scene: [
				{ op: 'appear', id: 'out', label: OUT, sub: 'console.log', at: [3, 0] },
				{ op: 'move', from: 'f3', to: 'out', payload: '6', kind: 'log' },
				{ op: 'change', id: 'out', k: '条件を消すと', v: 'RangeError' }
			],
			log: {
				t: '5s',
				from: 'fact(3)',
				to: OUT,
				kind: 'log',
				info: '6 を出した。条件を消すと RangeError'
			}
		}
	],
	example: {
		intro: '呼んだ時と戻った時に出しながら fact(3) を求める。下の 8 行を走らせた',
		lines: [
			'function fact(n) {',
			"  console.log('呼んだ', n);",
			'  if (n === 1) return 1;',
			'  const r = n * fact(n - 1);',
			"  console.log('戻った', n, r);",
			'  return r;',
			'}',
			'console.log(fact(3));',
			'▶ 出力',
			'呼んだ 3',
			'呼んだ 2',
			'呼んだ 1',
			'戻った 2 2',
			'戻った 3 6',
			'6'
		]
	},
	practice: {
		goal: '1 から n までの和を、for を使わず、自分を呼ぶ関数で求める',
		tool: { name: 'js', mode: 'real' },
		setup: {
			code: '// sum(n) は n + sum(n - 1)。sum(0) は 0 にする\nfunction sum(n) {\n}\nconsole.log(sum(4), sum(10));\n'
		},
		success: { output: '10 55\n' },
		mistakes: [
			{
				when: '止まる条件を書かなかった',
				why: 'sum(0)・sum(−1)… と呼び続け、積める段の上限を超える',
				next: '先頭に if (n === 0) return 0; を置く',
				match: 'Maximum call stack size exceeded'
			},
			{
				when: 'n + sum(n - 1) を return しなかった',
				why: '計算しても返さないと、呼んだ側には undefined が戻る',
				next: 'return n + sum(n - 1); と書く',
				match: 'undefined'
			},
			{
				when: 'sum(0) で 1 を返した',
				why: '止まる段の値が 1 多いと、全ての段にその 1 が足されて答えが 1 ずれる',
				next: '0 個の和は 0。if (n === 0) return 0; にする',
				match: '11 56'
			}
		]
	},
	check: [
		{ ask: '積み上がる段', how: 'fact(3) → fact(2) → fact(1) の 3 段' },
		{ ask: '戻る順', how: '積んだのと逆。fact(1) から返る' },
		{ ask: '止まる条件が無いと', how: 'RangeError: Maximum call stack size exceeded' }
	]
};
