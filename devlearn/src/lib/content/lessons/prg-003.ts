// prg-003 繰り返す（本物の JavaScript）。
// 出力は全て、実戦の道具（src/lib/tools/js/run.ts）で走らせて得た物（solutions.test.ts が例を流して確かめる）。
// 場面：パン屋の 3 日分の売れた数を足して、合計を出す。経過時刻 t は締めの作業を始めた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const CODE = '書いた物';
const OUT = '出力';

export const prg003: Lesson = {
	id: 'prg-003',
	field: 'prg',
	level: 1,
	title: '繰り返す',
	goal: 'for 文が回るごとの変数の値を追うことができる',
	prereq: ['prg-002'],
	related: ['lnx-009'],
	next: ['prg-004', 'prg-010'],
	explain: [
		{
			n: 1,
			title: '回す回数を決める',
			lead: 'for の丸括弧に、始め・続ける条件・進め方の 3 つを書く',
			body: [
				'売れた数は配列 sales = [3, 5, 2] に入っている。',
				'for (let i = 0; i < sales.length; i++) と書く。',
				'i は 0 から始まり、3 未満の間だけ回り、1 回ごとに 1 増える。'
			],
			facts: [
				{ k: 'sales', v: '[3, 5, 2]' },
				{ k: 'sales.length', v: '3' },
				{ k: '回る i', v: '0, 1, 2' }
			],
			scene: [
				{ op: 'appear', id: 'code', label: CODE, sub: 'for 文', at: [0, 0] },
				{ op: 'appear', id: 'i', label: 'i', sub: '数える変数', at: [1, 0] },
				{ op: 'appear', id: 'total', label: 'total', sub: '合計', at: [2, 0] },
				{ op: 'change', id: 'total', k: '値', v: '0' }
			],
			log: { t: '0s', from: CODE, to: 'total', kind: 'let', info: 'total を 0 にした。i は 0 から' }
		},
		{
			n: 2,
			title: '1 回目',
			lead: 'i が 0 の回。sales[0] の 3 を足す',
			body: [
				'0 < 3 は true なので、{ } の中が 1 回走る。',
				'total = total + sales[i]; で、0 + 3 が total に入る。',
				'配列の番号は 0 から数えるので、sales[0] は 3 だ。'
			],
			facts: [
				{ k: 'i', v: '0' },
				{ k: 'sales[i]', v: '3' },
				{ k: 'total', v: '0 + 3 = 3' }
			],
			scene: [
				{ op: 'change', id: 'i', k: '値', v: '0' },
				{ op: 'move', from: 'code', to: 'total', payload: '+3', kind: 'add' },
				{ op: 'change', id: 'total', k: '値', v: '3' }
			],
			log: { t: '1s', from: 'i=0', to: 'total', kind: 'loop', info: '1 回目：total は 3' }
		},
		{
			n: 3,
			title: '2 回目',
			lead: 'i++ で i が 1 になり、sales[1] の 5 を足す',
			body: [
				'{ } の終わりで i++ が走り、i は 1 になる。',
				'1 < 3 は true なので、もう 1 回走る。',
				'total は 3 + 5 で 8 になる。'
			],
			facts: [
				{ k: 'i', v: '1' },
				{ k: 'sales[i]', v: '5' },
				{ k: 'total', v: '3 + 5 = 8' }
			],
			scene: [
				{ op: 'change', id: 'i', k: '値', v: '1' },
				{ op: 'move', from: 'code', to: 'total', payload: '+5', kind: 'add' },
				{ op: 'change', id: 'total', k: '値', v: '8' }
			],
			log: { t: '2s', from: 'i=1', to: 'total', kind: 'loop', info: '2 回目：total は 8' }
		},
		{
			n: 4,
			title: '合計が積み上がる',
			lead: '前の回の total に足すので、値が積み上がっていく',
			body: [
				'i が 2 の回で sales[2] の 2 を足し、total は 10 になる。',
				'毎回 total を 0 に戻さないので、前の回の結果に足される。',
				'中で console.log(i, total) すると、回ごとの値が見える。'
			],
			facts: [
				{ k: 'i', v: '2' },
				{ k: 'total', v: '8 + 2 = 10' },
				{ k: '回ごとの出力', v: '0 3 / 1 8 / 2 10' }
			],
			scene: [
				{ op: 'change', id: 'i', k: '値', v: '2' },
				{ op: 'move', from: 'code', to: 'total', payload: '+2', kind: 'add' },
				{ op: 'change', id: 'total', k: '値', v: '10' }
			],
			log: { t: '3s', from: 'i=2', to: 'total', kind: 'loop', info: '3 回目：total は 10' }
		},
		{
			n: 5,
			title: '終わりの条件',
			lead: 'i が 3 になると条件が false になり、繰り返しを抜ける',
			body: [
				'i++ で i は 3 になり、3 < 3 は false になる。',
				'ここで { } には入らず、for の次の行へ進む。',
				'i <= 3 と書くと 4 回目が走り、sales[3] は無いので壊れる。'
			],
			facts: [
				{ k: 'i', v: '3' },
				{ k: '条件', v: '3 < 3 → false' },
				{ k: 'sales[3]', v: 'undefined（無い）' }
			],
			scene: [
				{ op: 'change', id: 'i', k: '値', v: '3' },
				{ op: 'change', id: 'i', k: '条件', v: 'false' },
				{ op: 'highlight', id: 'i' }
			],
			log: {
				t: '4s',
				from: 'i=3',
				to: CODE,
				kind: 'exit',
				info: '3 < 3 が false。繰り返しを抜けた'
			},
			why: '条件を毎回、中を走らせる前に見るので、番号が配列の外に出る前に止まる'
		},
		{
			n: 6,
			title: '回した後の値',
			lead: '抜けた後の total が、全ての回を足した結果',
			body: [
				"for の後で console.log('合計', total) を走らせる。",
				'出力は 合計 10 で、3 + 5 + 2 と同じだ。',
				'回した回数は 3 回、配列の長さと同じだった。'
			],
			facts: [
				{ k: '出力', v: '合計 10' },
				{ k: '回した回数', v: '3' }
			],
			scene: [
				{ op: 'appear', id: 'out', label: OUT, sub: 'console.log', at: [3, 0] },
				{ op: 'move', from: 'total', to: 'out', payload: '合計 10', kind: 'log' }
			],
			log: { t: '5s', from: 'total', to: OUT, kind: 'log', info: '合計 10 を出力した' }
		}
	],
	example: {
		intro: '3 日分を足しながら、回ごとの i と total を出す。下の 6 行を走らせた',
		lines: [
			'const sales = [3, 5, 2];',
			'let total = 0;',
			'for (let i = 0; i < sales.length; i++) {',
			'  total = total + sales[i];',
			'  console.log(i, total);',
			'}',
			"console.log('合計', total);",
			'▶ 出力',
			'0 3',
			'1 8',
			'2 10',
			'合計 10'
		]
	},
	practice: {
		goal: '4 日分の売れた数を for で全て足し、合計を 1 行だけ出す',
		tool: { name: 'js', mode: 'real' },
		setup: {
			code: 'const days = [4, 0, 7, 3];\nlet total = 0;\n// for で days を全て足し、for の後で total を console.log で出す\n'
		},
		success: { output: '14\n' },
		mistakes: [
			{
				when: '条件を i <= days.length と書いた',
				why: '5 回目に days[4] を読む。そこには何も無く undefined で、足すと NaN（数でない）になる',
				next: '条件を i < days.length にする',
				match: 'NaN'
			},
			{
				when: 'console.log を for の { } の中に置いた',
				why: '中に置くと回るたびに出る。途中の値 4・4・11 まで出て、合計の 1 行にならない',
				next: 'console.log(total) を、for の閉じ括弧 } の後へ移す',
				match: '4\n4\n11\n'
			},
			{
				when: 'i を 1 から始めた',
				why: '配列の番号は 0 から始まる。1 から回すと最初の 4 を足し損ね、合計が 10 になる',
				next: 'let i = 0 から始める',
				match: '10\n'
			}
		]
	},
	check: [
		{ ask: '1 回目の i', how: '0（配列の最初の番号）' },
		{ ask: '回る回数', how: 'i < sales.length なら、配列の長さと同じ回数' },
		{ ask: '回ごとの値', how: 'total は 3 → 8 → 10 と積み上がる' }
	]
};
