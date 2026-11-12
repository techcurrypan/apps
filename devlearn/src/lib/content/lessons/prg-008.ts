// prg-008 非同期の順番（本物の JavaScript）。
// 出力は全て、実戦の道具（src/lib/tools/js/run.ts）で走らせて得た物（solutions.test.ts が例を流して確かめる）。
// 道具は setTimeout を本当には待たず、作り物の時計を進める（tools.md 3.4）。Date.now の差が、本物で待ったときと同じ ms になる。
// 場面：パン屋の窯。焼き上がりを待つ間に次の仕事をする。経過時刻 t は最初の窯に入れた時を 0ms とした。
import type { Lesson } from '../../lesson/types.ts';

const MAIN = '本筋';
const OVEN = '窯（setTimeout）';
const OUT = '出力';

export const prg008: Lesson = {
	id: 'prg-008',
	field: 'prg',
	level: 2,
	title: '非同期の順番',
	goal: 'Promise と await で、処理が進む順番を追うことができる',
	prereq: ['prg-007'],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '時間のかかる処理',
			lead: '焼き上がりは 3000ms 後。その間、手を止めたくない',
			body: [
				'bake(name, ms) は、ms の後に name を返す関数とする。',
				'中では setTimeout（時間が来たら呼ぶ仕組み）を使う。',
				'食パンは 3000ms、あんパンは 1000ms で焼ける。'
			],
			facts: [
				{ k: '食パン', v: '3000ms' },
				{ k: 'あんパン', v: '1000ms' },
				{ k: '使う仕組み', v: 'setTimeout(…, ms)' }
			],
			scene: [
				{ op: 'appear', id: 'main', label: MAIN, sub: '上から順に走る', at: [0, 0] },
				{ op: 'appear', id: 'oven', label: OVEN, sub: '時間が来たら呼ぶ', at: [2, 0] }
			],
			log: { t: '0ms', from: MAIN, to: OVEN, kind: 'define', info: 'bake を用意した' }
		},
		{
			n: 2,
			title: 'Promise を受け取る',
			lead: 'bake はすぐに「後で値が入る約束」を返す',
			body: [
				"bake('食パン', 3000) は、焼き上がりを待たずにすぐ戻る。",
				'戻るのは Promise（後で値が入る約束）で、まだ中身は無い。',
				'約束の状態は pending、待っている、だ。'
			],
			facts: [
				{ k: '戻った物', v: 'Promise { <pending> }' },
				{ k: '窯の予定', v: '3000ms に 食パン' }
			],
			scene: [
				{ op: 'appear', id: 'p1', label: 'Promise', sub: '食パン pending', at: [1, 1] },
				{ op: 'move', from: 'main', to: 'oven', payload: '食パン 3000ms', kind: 'schedule' }
			],
			log: { t: '0ms', from: MAIN, to: OVEN, kind: 'schedule', info: '食パンを 3000ms で予約した' }
		},
		{
			n: 3,
			title: '先に次の行が走る',
			lead: '.then に頼んだ仕事は後回し。本筋は次の行へ進む',
			body: [
				'.then((n) => console.log(…)) は、約束が果たされた後の仕事を頼むだけだ。',
				'本筋は待たずに次の行へ進み、0ms 次の行が先に走る と出す。',
				'書いた順と、出力の順がずれる。'
			],
			facts: [
				{ k: '1 行目の出力', v: '0ms 次の行が先に走る' },
				{ k: '食パンの then', v: 'まだ走らない' }
			],
			scene: [
				{ op: 'appear', id: 'out', label: OUT, sub: 'console.log', at: [0, 2] },
				{ op: 'move', from: 'main', to: 'out', payload: '0ms 次の行が先に走る', kind: 'log' }
			],
			log: { t: '0ms', from: MAIN, to: OUT, kind: 'log', info: '本筋が先に 1 行出した' },
			why: '待つ間も他の仕事ができるよう、時間のかかる物は後で知らせる形にしている'
		},
		{
			n: 4,
			title: 'await で待つ',
			lead: 'await は、約束が果たされるまで本筋をそこで止める',
			body: [
				"const a = await bake('あんパン', 1000); と書く。",
				'本筋は 1000ms までここで待ち、a に あんパン が入る。',
				'次の行は 1000ms あんパン 焼けた（await）を出す。'
			],
			facts: [
				{ k: '待った長さ', v: '1000ms' },
				{ k: 'a', v: "'あんパン'" },
				{ k: '2 行目の出力', v: '1000ms あんパン 焼けた（await）' }
			],
			scene: [
				{ op: 'move', from: 'oven', to: 'main', payload: 'あんパン', kind: 'resolve' },
				{ op: 'change', id: 'main', k: '時刻', v: '1000ms' }
			],
			log: {
				t: '1000ms',
				from: OVEN,
				to: MAIN,
				kind: 'resolve',
				info: 'あんパンが焼け、本筋が続いた'
			}
		},
		{
			n: 5,
			title: '2 つを並べて待つ',
			lead: 'Promise.all は、全てがそろうまで待つ',
			body: [
				'Promise.all([…]) に 1000ms の 2 つを渡し、await する。',
				'2 つは同時に窯に入るので、1000ms 待てば両方がそろう。',
				'結果は渡した順の配列で、2000ms に出る。'
			],
			facts: [
				{ k: '渡した物', v: 'メロンパン 1000ms・クロワッサン 1000ms' },
				{ k: 'そろった時刻', v: '2000ms' },
				{ k: '3 行目の出力', v: "2000ms [ 'メロンパン', 'クロワッサン' ]" }
			],
			scene: [
				{ op: 'appear', id: 'all', label: 'Promise.all', sub: '2 つ', at: [1, 0] },
				{
					op: 'move',
					from: 'all',
					to: 'main',
					payload: '[ メロンパン, クロワッサン ]',
					kind: 'resolve'
				},
				{ op: 'change', id: 'main', k: '時刻', v: '2000ms' }
			],
			log: { t: '2000ms', from: 'Promise.all', to: MAIN, kind: 'resolve', info: '2 つがそろった' }
		},
		{
			n: 6,
			title: '済んだら then が走る',
			lead: '3000ms で食パンが焼け、頼んであった then が走る',
			body: [
				'本筋の行は全て終わったが、窯には食パンが残っている。',
				'3000ms に約束が果たされ、then の仕事が走る。',
				'最初に頼んだ仕事が、出力では最後になった。'
			],
			facts: [
				{ k: '4 行目の出力', v: '3000ms 食パン 焼けた（then）' },
				{ k: 'Promise の状態', v: 'pending → fulfilled' }
			],
			scene: [
				{ op: 'change', id: 'p1', k: '状態', v: 'fulfilled' },
				{ op: 'move', from: 'p1', to: 'out', payload: '3000ms 食パン 焼けた（then）', kind: 'log' }
			],
			log: {
				t: '3000ms',
				from: 'Promise',
				to: OUT,
				kind: 'log',
				info: '食パンの then が最後に走った'
			}
		}
	],
	example: {
		intro: 'then と await と Promise.all を並べ、出た時刻を付ける。下の 12 行を走らせた',
		lines: [
			'const t0 = Date.now();',
			"const at = () => Date.now() - t0 + 'ms';",
			'function bake(name, ms) {',
			'  return new Promise((resolve) => setTimeout(() => resolve(name), ms));',
			'}',
			"bake('食パン', 3000).then((n) => console.log(at(), n, '焼けた（then）'));",
			"console.log(at(), '次の行が先に走る');",
			"const a = await bake('あんパン', 1000);",
			"console.log(at(), a, '焼けた（await）');",
			"const both = await Promise.all([bake('メロンパン', 1000), bake('クロワッサン', 1000)]);",
			'console.log(at(), both);',
			'▶ 出力',
			'0ms 次の行が先に走る',
			'1000ms あんパン 焼けた（await）',
			"2000ms [ 'メロンパン', 'クロワッサン' ]",
			'3000ms 食パン 焼けた（then）'
		]
	},
	practice: {
		goal: '2 つの店の在庫を並べて待ち、両方がそろってから合計を出す',
		tool: { name: 'js', mode: 'real' },
		setup: {
			code: "function fetchStock(shop, ms, n) {\n  return new Promise((resolve) => setTimeout(() => resolve(n), ms));\n}\n// 2 つを並べて待ち、そろってから足して出す\nconst a = fetchStock('東店', 2000, 5);\nconst b = fetchStock('西店', 1000, 3);\nconsole.log('合計', a + b);\n"
		},
		success: { output: '合計 8\n' },
		mistakes: [
			{
				when: 'await を付けずに足した',
				why: 'a と b はまだ約束（Promise）で、数ではない。足すと文字としてつながる',
				next: 'const [x, y] = await Promise.all([a, b]); で中身を取り出してから足す',
				match: '[object Promise]'
			},
			{
				when: 'Promise.all の結果をそのまま出した',
				why: 'Promise.all の結果は、渡した順の配列だ。[ 5, 3 ] のままでは足していない',
				next: '配列の 2 つを取り出して x + y を出す',
				match: '[ 5, 3 ]'
			}
		]
	},
	check: [
		{ ask: 'then の仕事', how: '約束が果たされた後に走る。本筋は待たない' },
		{ ask: 'await', how: '約束が果たされるまで、本筋をそこで止める' },
		{ ask: 'Promise.all', how: '全てがそろった時に、渡した順の配列で返る' }
	]
};
