// prg-002 条件で道を分ける（本物の JavaScript）。
// 出力は全て、実戦の道具（src/lib/tools/js/run.ts）で走らせて得た物（solutions.test.ts が例を流して確かめる）。
// 場面：パン屋の棚の札。残りの数から「売り切れ」「残りわずか」「あり」を決める。経過時刻 t は店を開けた時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const CODE = '書いた物';
const OUT = '出力';

export const prg002: Lesson = {
	id: 'prg-002',
	field: 'prg',
	level: 1,
	title: '条件で道を分ける',
	goal: 'if 文で、入力ごとにどの道を通るかを辿ることができる',
	prereq: ['prg-001'],
	related: [],
	next: ['prg-003'],
	explain: [
		{
			n: 1,
			title: '入力を 1 つ受ける',
			lead: '棚の残りの数を、関数の入力として受け取る',
			body: [
				'function label(stock) { … } と書くと、stock に数を受け取れる。',
				'label(5) と呼ぶと、中では stock が 5 になる。',
				'この数で、棚に出す札の文字を決める。'
			],
			facts: [
				{ k: '書いた物', v: 'function label(stock) { … }' },
				{ k: '呼び方', v: 'label(5)' },
				{ k: 'stock', v: '5' }
			],
			scene: [
				{ op: 'appear', id: 'code', label: CODE, sub: 'JavaScript', at: [0, 0] },
				{ op: 'appear', id: 'stock', label: 'stock', sub: '入力', at: [1, 0] },
				{ op: 'move', from: 'code', to: 'stock', payload: '5', kind: 'call' }
			],
			log: { t: '0m', from: CODE, to: 'stock', kind: 'call', info: 'label(5) を呼んだ。stock は 5' }
		},
		{
			n: 2,
			title: '条件を比べる',
			lead: 'if の丸括弧の中は、true か false になる式',
			body: [
				'if (stock <= 3) の中の stock <= 3 は、比べた結果を返す。',
				'stock が 5 なら 5 <= 3 で、結果は false（偽）だ。',
				'結果は true（真）か false の 2 つしかない。'
			],
			facts: [
				{ k: '条件', v: 'stock <= 3' },
				{ k: 'stock = 5 のとき', v: 'false' },
				{ k: 'stock = 2 のとき', v: 'true' }
			],
			scene: [
				{ op: 'appear', id: 'cond', label: 'stock <= 3', sub: '条件', at: [2, 0] },
				{ op: 'change', id: 'cond', k: '結果', v: 'false' }
			],
			log: { t: '1m', from: 'stock', to: 'stock <= 3', kind: 'compare', info: '5 <= 3 は false' }
		},
		{
			n: 3,
			title: '真の道を通る',
			lead: '条件が true なら、すぐ後の { } の中だけが走る',
			body: [
				'label(2) と呼ぶと、2 <= 3 は true になる。',
				"if のすぐ後の { } の中、return '残りわずか'; が走る。",
				'return で関数は終わり、その下の行は走らない。'
			],
			facts: [
				{ k: '呼び方', v: 'label(2)' },
				{ k: '条件の結果', v: 'true' },
				{ k: '返った値', v: "'残りわずか'" }
			],
			scene: [
				{ op: 'change', id: 'stock', k: '値', v: '2' },
				{ op: 'change', id: 'cond', k: '結果', v: 'true' },
				{ op: 'appear', id: 'yes', label: '真の道', sub: "'残りわずか'", at: [3, 0] },
				{ op: 'move', from: 'cond', to: 'yes', payload: 'true', kind: 'branch' }
			],
			log: {
				t: '2m',
				from: 'stock <= 3',
				to: '真の道',
				kind: 'branch',
				info: "2 <= 3 が true。'残りわずか' を返した"
			}
		},
		{
			n: 4,
			title: '偽の道を通る',
			lead: '条件が false なら、else の { } が走る',
			body: [
				'label(5) では条件が false なので、if の { } を飛ばす。',
				"else { return 'あり'; } の方が走り、'あり' が返る。",
				'どちらか一方の道だけが必ず走る。'
			],
			facts: [
				{ k: '呼び方', v: 'label(5)' },
				{ k: '条件の結果', v: 'false' },
				{ k: '返った値', v: "'あり'" }
			],
			scene: [
				{ op: 'change', id: 'stock', k: '値', v: '5' },
				{ op: 'change', id: 'cond', k: '結果', v: 'false' },
				{ op: 'appear', id: 'no', label: '偽の道（else）', sub: "'あり'", at: [3, 1] },
				{ op: 'move', from: 'cond', to: 'no', payload: 'false', kind: 'branch' }
			],
			log: {
				t: '3m',
				from: 'stock <= 3',
				to: '偽の道（else）',
				kind: 'branch',
				info: "5 <= 3 が false。'あり' を返した"
			}
		},
		{
			n: 5,
			title: 'else if で道を増やす',
			lead: '上から順に条件を見て、最初に true の道だけを通る',
			body: [
				'売り切れの札を足すため、先頭に if (stock === 0) を置く。',
				'次に else if (stock <= 3)、最後に else を置く。',
				'上から順に見て、最初に true になった道だけが走る。'
			],
			facts: [
				{ k: '1 つ目の条件', v: "stock === 0 → '売り切れ'" },
				{ k: '2 つ目の条件', v: "stock <= 3 → '残りわずか'" },
				{ k: 'label(0)', v: "'売り切れ'（2 つ目は見ない）" }
			],
			scene: [
				{ op: 'appear', id: 'zero', label: 'stock === 0', sub: "'売り切れ'", at: [2, 1] },
				{ op: 'change', id: 'stock', k: '値', v: '0' },
				{ op: 'move', from: 'stock', to: 'zero', payload: '0', kind: 'branch' }
			],
			log: {
				t: '4m',
				from: 'stock',
				to: 'stock === 0',
				kind: 'branch',
				info: "0 === 0 が true。'売り切れ' を返した"
			},
			why: '上から見て最初の 1 つで決まるので、0 は 0 <= 3 の道に入らない'
		},
		{
			n: 6,
			title: '境目の値で試す',
			lead: '3 と 4 のように、道が替わる前後の値を試す',
			body: [
				'条件の誤りは、道が替わる境目に出やすい。',
				'stock <= 3 なら 3 は残りわずか、4 はありになる。',
				'< 3 と書き誤ると、3 が「あり」になってしまう。'
			],
			facts: [
				{ k: 'label(3)', v: "'残りわずか'" },
				{ k: 'label(4)', v: "'あり'" },
				{ k: '< 3 と書き誤ると', v: "label(3) が 'あり'" }
			],
			scene: [
				{ op: 'appear', id: 'out', label: OUT, sub: 'console.log', at: [4, 0] },
				{ op: 'move', from: 'code', to: 'out', payload: '売り切れ 残りわずか あり', kind: 'log' }
			],
			log: {
				t: '5m',
				from: CODE,
				to: OUT,
				kind: 'log',
				info: '0・3・4 で、3 つの道を 1 回ずつ通った'
			}
		}
	],
	example: {
		intro: '0・3・4 の 3 つの値で札を決める。下の 10 行を走らせた',
		lines: [
			'function label(stock) {',
			'  if (stock === 0) {',
			"    return '売り切れ';",
			'  } else if (stock <= 3) {',
			"    return '残りわずか';",
			'  } else {',
			"    return 'あり';",
			'  }',
			'}',
			'console.log(label(0), label(3), label(4));',
			'▶ 出力',
			'売り切れ 残りわずか あり'
		]
	},
	practice: {
		goal: '気温で服の札を決める関数を書き、境目の 4 つの値で正しい札が出る',
		tool: { name: 'js', mode: 'real' },
		setup: {
			code: "function wear(temp) {\n  // 30 以上は '暑い'、15 未満は '寒い'、それ以外は 'ちょうどよい' を返す\n}\nconsole.log(wear(31), wear(30), wear(15), wear(14));\n"
		},
		success: { output: '暑い 暑い ちょうどよい 寒い\n' },
		mistakes: [
			{
				when: 'return を書かずに、関数の中で console.log した',
				why: 'return が無い関数は undefined を返す。呼んだ側の console.log には undefined が並ぶ',
				next: "それぞれの道で return '暑い'; のように値を返す",
				match: 'undefined'
			},
			{
				when: '30 以上を temp > 30 と書いた',
				why: '> は「より大きい」で、30 ちょうどは入らない。wear(30) が ちょうどよい になる',
				next: '以上は >= と書く。temp >= 30 にする',
				match: '暑い ちょうどよい ちょうどよい'
			},
			{
				when: '15 未満を temp <= 15 と書いた',
				why: '<= は 15 を含む。15 ちょうどが 寒い の道に入ってしまう',
				next: '未満は < と書く。temp < 15 にする',
				match: '暑い 暑い 寒い 寒い'
			}
		]
	},
	check: [
		{ ask: '条件の結果', how: '丸括弧の中は true か false になる' },
		{ ask: '通る道', how: '上から見て、最初に true になった道だけが走る' },
		{ ask: '境目', how: '30 と 15 の前後の値（31・30・15・14）で試す' }
	]
};
