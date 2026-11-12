// prg-001 値と変数（段 10-0。js の見本。本物の JavaScript）。
// 出力は全て、このブラウザの JavaScript（実戦の道具 src/lib/tools/js/run.ts）で走らせて得た物。
// 場面：パン屋の棚に 12 個のパンがある。売れた数を引いて、棚の数を追う。経過時刻 t は店を開けた時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const CODE = '書いた物';
const OUT = '出力';

export const prg001: Lesson = {
	id: 'prg-001',
	field: 'prg',
	level: 1,
	title: '値と変数',
	goal: '変数に入れた値と、書き換えた後の値を追うことができる',
	prereq: [],
	related: ['prg-012'],
	next: ['prg-002'],
	explain: [
		{
			n: 1,
			title: '箱を 1 つ用意する',
			lead: 'let で、名前の付いた入れ物（変数）を作る',
			body: [
				'let stock; と書くと、stock という名前の変数ができる。',
				'変数は、値を入れておく名前付きの箱だ。',
				'まだ何も入れていないので、console.log(stock) は undefined を出す。'
			],
			facts: [
				{ k: '書いた物', v: 'let stock;' },
				{ k: 'stock の中身', v: 'undefined' },
				{ k: '出力', v: 'undefined' }
			],
			scene: [
				{ op: 'appear', id: 'code', label: CODE, sub: 'JavaScript', at: [0, 0] },
				{ op: 'appear', id: 'stock', label: 'stock', sub: '変数', at: [1, 0] },
				{ op: 'change', id: 'stock', k: '中身', v: 'undefined' }
			],
			log: {
				t: '0m',
				from: CODE,
				to: 'stock',
				kind: 'let',
				info: 'stock を作った。中身は undefined'
			}
		},
		{
			n: 2,
			title: '値を入れる',
			lead: '= の右の値が、左の変数に入る',
			body: [
				'let stock = 12; と書くと、作ると同時に 12 が入る。',
				'= は「等しい」ではなく、右の値を左の箱に入れる、という意味だ。',
				'棚のパンは 12 個、と覚えさせたことになる。'
			],
			facts: [
				{ k: '書いた物', v: 'let stock = 12;' },
				{ k: 'stock の中身', v: '12' },
				{ k: '値の種類', v: 'number（数）' }
			],
			scene: [
				{ op: 'move', from: 'code', to: 'stock', payload: '12', kind: 'assign' },
				{ op: 'change', id: 'stock', k: '中身', v: '12' }
			],
			log: { t: '0m', from: CODE, to: 'stock', kind: 'assign', info: 'stock に 12 を入れた' }
		},
		{
			n: 3,
			title: '値を読み出す',
			lead: '名前を書くと、その時の中身が読まれる',
			body: [
				'console.log(stock) は、stock の今の中身を出力に出す。',
				'出力は 12 だ。名前の stock ではなく、中身の 12 が出る。'
			],
			facts: [
				{ k: '書いた物', v: 'console.log(stock);' },
				{ k: '読んだ値', v: '12' },
				{ k: '出力の行', v: '12' }
			],
			scene: [
				{ op: 'appear', id: 'out', label: OUT, sub: 'console.log', at: [2, 0] },
				{ op: 'move', from: 'stock', to: 'out', payload: '12', kind: 'read' }
			],
			log: { t: '1m', from: 'stock', to: OUT, kind: 'log', info: '12 を出力した' }
		},
		{
			n: 4,
			title: '書き換える',
			lead: '右を先に計算し、その答えで箱の中身を入れ替える',
			body: [
				'3 個売れたので stock = stock - 3; と書く。',
				'先に右の stock - 3 を計算する。今の中身 12 から 3 を引いて 9 だ。',
				'その 9 が stock に入り、前の 12 は消える。'
			],
			facts: [
				{ k: '書いた物', v: 'stock = stock - 3;' },
				{ k: '右の計算', v: '12 - 3 = 9' },
				{ k: 'stock の中身', v: '12 → 9' }
			],
			scene: [
				{ op: 'move', from: 'stock', to: 'code', payload: '12', kind: 'read' },
				{ op: 'move', from: 'code', to: 'stock', payload: '9', kind: 'assign' },
				{ op: 'change', id: 'stock', k: '中身', v: '9' }
			],
			log: {
				t: '25m',
				from: CODE,
				to: 'stock',
				kind: 'assign',
				info: 'stock を 12 から 9 に書き換えた'
			},
			why: '箱 1 つに入る値は 1 つだけなので、新しい値を入れると前の値は残らない。だから右を先に読んでおく'
		},
		{
			n: 5,
			title: '別の変数に写す',
			lead: 'let copy = stock; で、今の値が copy にも入る',
			body: [
				'閉店前の数を控えるため、let copy = stock; と書く。',
				'copy には stock の今の中身 9 が写る。箱は 2 つになった。'
			],
			facts: [
				{ k: '書いた物', v: 'let copy = stock;' },
				{ k: 'copy の中身', v: '9' },
				{ k: 'stock の中身', v: '9' }
			],
			scene: [
				{ op: 'appear', id: 'copy', label: 'copy', sub: '変数', at: [1, 1] },
				{ op: 'move', from: 'stock', to: 'copy', payload: '9', kind: 'assign' },
				{ op: 'change', id: 'copy', k: '中身', v: '9' }
			],
			log: { t: '50m', from: 'stock', to: 'copy', kind: 'assign', info: 'copy に 9 を写した' }
		},
		{
			n: 6,
			title: '写した後に元を変える',
			lead: '元を書き換えても、写した方は変わらない',
			body: [
				'全部売れたので stock = 0; と書く。',
				'console.log(copy, stock) の出力は 9 0 だ。',
				'copy には 9 という値が写っただけで、stock とはつながっていない。'
			],
			facts: [
				{ k: '書いた物', v: 'stock = 0;  console.log(copy, stock);' },
				{ k: '出力の行', v: '9 0' },
				{ k: 'copy の中身', v: '9 のまま' }
			],
			scene: [
				{ op: 'change', id: 'stock', k: '中身', v: '0' },
				{ op: 'move', from: 'copy', to: 'out', payload: '9 0', kind: 'read' },
				{ op: 'highlight', id: 'copy' }
			],
			log: { t: '1h', from: 'copy', to: OUT, kind: 'log', info: 'copy は 9、stock は 0 を出力した' }
		},
		{
			n: 7,
			title: '書き換えられない箱',
			lead: 'const で作った変数に入れ直すと、エラーになる',
			body: [
				'値段のように変えない物は const price = 120; と書く。',
				'price = 150; と入れ直すと、TypeError で止まる。',
				'エラーの文は Assignment to constant variable.、定数への代入、だ。',
				'const は、うっかり書き換えるのを止めるための作り方だ。'
			],
			facts: [
				{ k: '書いた物', v: 'const price = 120;  price = 150;' },
				{ k: 'エラー', v: 'TypeError: Assignment to constant variable.' },
				{ k: 'price の中身', v: '120 のまま' }
			],
			scene: [
				{ op: 'appear', id: 'price', label: 'price', sub: 'const', at: [2, 1] },
				{ op: 'change', id: 'price', k: '中身', v: '120' },
				{ op: 'move', from: 'code', to: 'price', payload: '150', kind: 'error' }
			],
			log: {
				t: '1h5m',
				from: CODE,
				to: 'price',
				kind: 'error',
				info: 'const の price には入れ直せない'
			}
		},
		{
			n: 8,
			title: '無い名前は読めない',
			lead: '作っていない名前を読むと、ReferenceError で止まる',
			body: [
				'console.log(stok) のように打ち違えると、ReferenceError で止まる。',
				'エラーの文は stok is not defined、stok は定義されていない、だ。',
				'stok という箱は作っていないので、読む物が無い。'
			],
			facts: [
				{ k: '書いた物', v: 'console.log(stok);' },
				{ k: 'エラー', v: 'ReferenceError: stok is not defined' },
				{ k: '出力の行', v: '0 行' }
			],
			scene: [
				{ op: 'move', from: 'code', to: 'out', payload: 'stok', kind: 'error' },
				{ op: 'change', id: 'out', k: 'エラー', v: 'ReferenceError' }
			],
			log: {
				t: '1h6m',
				from: CODE,
				to: OUT,
				kind: 'error',
				info: 'stok は無い名前。何も出力しなかった'
			}
		}
	],
	example: {
		intro: '棚の数を書き換え、写した後に元を 0 にする。下の 5 行を走らせた',
		lines: [
			'let stock = 12;',
			'stock = stock - 3;',
			'let copy = stock;',
			'stock = 0;',
			'console.log(copy, stock);',
			'▶ 出力',
			'9 0'
		]
	},
	practice: {
		goal: '12 個から 5 個売れた後の数を stock に入れ、console.log で出す',
		tool: { name: 'js', mode: 'real' },
		setup: { code: 'let stock = 12;\n// 5 個売れた。stock を書き換えて、console.log で出す\n' },
		success: { output: '7\n' },
		mistakes: [
			{
				when: '変数の名前を打ち違えた（stok など）',
				why: 'その名前の変数は作っていない。JavaScript は ReferenceError: … is not defined で止まる',
				next: '1 行目の let stock の名前と同じ綴りで書き直す',
				match: 'is not defined'
			},
			{
				when: 'const で作り直してから書き換えた',
				why: 'const の変数には入れ直せない。TypeError: Assignment to constant variable. で止まる',
				next: 'let stock = 12; のまま、stock = stock - 5; と書き換える',
				match: 'Assignment to constant variable'
			}
		]
	},
	check: [
		{ ask: '書き換えた後の値', how: 'console.log(stock) が 7 を出す' },
		{
			ask: '写した値は元とつながらないか',
			how: 'copy に写してから stock を変えても、copy は前の値を出す'
		},
		{ ask: '無い名前を読むと', how: 'ReferenceError: … is not defined が出る' }
	]
};
