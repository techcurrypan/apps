// prg-006 同じ物を指す変数（本物の JavaScript）。
// 出力は全て、実戦の道具（src/lib/tools/js/run.ts）で走らせて得た物（solutions.test.ts が例を流して確かめる）。
// 場面：パン屋の注文票。同じ注文票を 2 つの名前で持つと、片方から書いた数が両方に出る。経過時刻 t は受付を始めた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const OBJ = '注文票 #1';
const COPY = '注文票 #2';
const OUT = '出力';

export const prg006: Lesson = {
	id: 'prg-006',
	field: 'prg',
	level: 2,
	title: '同じ物を指す変数',
	goal: '2 つの変数が同じ物を指すとき、書き換えの結果を予想することができる',
	prereq: ['prg-005'],
	related: [],
	next: ['prg-011'],
	explain: [
		{
			n: 1,
			title: '物を 1 つ作る',
			lead: '{ } で、名前の付いた値の組（オブジェクト）を作る',
			body: [
				"const order = { item: '食パン', count: 2 }; と書く。",
				'オブジェクトは、item や count のような名前ごとに値を持つ物だ。',
				'order の中には、この物そのものでなく、物の在りかが入る。'
			],
			facts: [
				{ k: '書いた物', v: "{ item: '食パン', count: 2 }" },
				{ k: 'order.count', v: '2' },
				{ k: 'order が持つ物', v: '注文票 #1 の在りか' }
			],
			scene: [
				{ op: 'appear', id: 'order', label: 'order', sub: '変数', at: [0, 0] },
				{ op: 'appear', id: 'obj', label: OBJ, sub: 'count: 2', at: [2, 0] },
				{ op: 'move', from: 'order', to: 'obj', payload: '指す', kind: 'ref' }
			],
			log: { t: '0s', from: 'order', to: OBJ, kind: 'ref', info: 'order が注文票 #1 を指す' }
		},
		{
			n: 2,
			title: '別の変数に入れる',
			lead: '= で入れると、在りかが写る。物は 1 つのまま',
			body: [
				'const same = order; と書く。',
				'写るのは在りかなので、same も同じ注文票 #1 を指す。',
				'注文票は 1 枚しか無い。'
			],
			facts: [
				{ k: '書いた物', v: 'const same = order;' },
				{ k: '注文票の数', v: '1' },
				{ k: 'order === same', v: 'true' }
			],
			scene: [
				{ op: 'appear', id: 'same', label: 'same', sub: '変数', at: [0, 1] },
				{ op: 'move', from: 'same', to: 'obj', payload: '指す', kind: 'ref' }
			],
			log: { t: '1s', from: 'same', to: OBJ, kind: 'ref', info: 'same も注文票 #1 を指す' }
		},
		{
			n: 3,
			title: '片方から書き換える',
			lead: 'same.count = 5 は、指した先の注文票を書き換える',
			body: [
				'same.count = 5; と書く。',
				'書き換わるのは same という名前ではなく、指した先の注文票 #1 だ。',
				'注文票の count は 2 から 5 になる。'
			],
			facts: [
				{ k: '書いた物', v: 'same.count = 5;' },
				{ k: '注文票 #1 の count', v: '2 → 5' }
			],
			scene: [
				{ op: 'move', from: 'same', to: 'obj', payload: 'count = 5', kind: 'write' },
				{ op: 'change', id: 'obj', k: 'count', v: '5' }
			],
			log: { t: '2s', from: 'same', to: OBJ, kind: 'write', info: '注文票 #1 の count を 5 にした' }
		},
		{
			n: 4,
			title: '両方に変化が出る',
			lead: 'order から読んでも 5。同じ物を見ているから',
			body: [
				'console.log(order.count, same.count) は 5 5 を出す。',
				'order は書き換えていないのに、5 が見える。',
				'2 つの名前が、1 枚の注文票を見ているからだ。'
			],
			facts: [
				{ k: 'order.count', v: '5' },
				{ k: 'same.count', v: '5' },
				{ k: '出力', v: '5 5' }
			],
			scene: [
				{ op: 'appear', id: 'out', label: OUT, sub: 'console.log', at: [3, 1] },
				{ op: 'move', from: 'obj', to: 'out', payload: '5 5', kind: 'log' }
			],
			log: { t: '3s', from: OBJ, to: OUT, kind: 'log', info: 'order からも same からも 5' },
			why: '大きな物を写さずに在りかだけを渡すので、= は物の大きさによらず一瞬で済む'
		},
		{
			n: 5,
			title: '複製を作る',
			lead: '{ ...order } で、中身を写した別の注文票を作る',
			body: [
				'const copy = { ...order }; と書く。',
				'... は、order の名前と値を 1 つずつ新しい物に写す書き方だ。',
				'注文票は 2 枚になり、copy は 2 枚目を指す。'
			],
			facts: [
				{ k: '書いた物', v: 'const copy = { ...order };' },
				{ k: '注文票の数', v: '2' },
				{ k: 'order === copy', v: 'false' }
			],
			scene: [
				{ op: 'appear', id: 'copyv', label: 'copy', sub: '変数', at: [0, 2] },
				{ op: 'appear', id: 'copy', label: COPY, sub: 'count: 5', at: [2, 2] },
				{ op: 'move', from: 'obj', to: 'copy', payload: '中身を写す', kind: 'copy' }
			],
			log: { t: '4s', from: OBJ, to: COPY, kind: 'copy', info: '中身を写して注文票 #2 を作った' }
		},
		{
			n: 6,
			title: '複製は離れている',
			lead: 'copy を書き換えても、order は変わらない',
			body: [
				'copy.count = 9; と書いても、注文票 #1 は 5 のままだ。',
				'console.log(order.count, copy.count) は 5 9 を出す。',
				'ただし ... で写すのは 1 段目だけで、中の物はまだ共有される。'
			],
			facts: [
				{ k: '書いた物', v: 'copy.count = 9;' },
				{ k: '出力', v: '5 9' },
				{ k: 'order === same / copy', v: 'true / false' }
			],
			scene: [
				{ op: 'move', from: 'copyv', to: 'copy', payload: 'count = 9', kind: 'write' },
				{ op: 'change', id: 'copy', k: 'count', v: '9' },
				{ op: 'change', id: 'out', k: '2 行目', v: '5 9' }
			],
			log: { t: '5s', from: 'copy', to: COPY, kind: 'write', info: '注文票 #2 だけが 9 になった' }
		}
	],
	example: {
		intro: '同じ物を指す変数と、複製した変数を書き換える。下の 8 行を走らせた',
		lines: [
			"const order = { item: '食パン', count: 2 };",
			'const same = order;',
			'same.count = 5;',
			'console.log(order.count, same.count);',
			'const copy = { ...order };',
			'copy.count = 9;',
			'console.log(order.count, copy.count);',
			'console.log(order === same, order === copy);',
			'▶ 出力',
			'5 5',
			'5 9',
			'true false'
		]
	},
	practice: {
		goal: '元の品の値段を残したまま、値段だけを替えた特売の品を作る',
		tool: { name: 'js', mode: 'real' },
		setup: {
			code: "const base = { name: '食パン', price: 300 };\n// base を元に price だけ 350 にした sale を作る。base は 300 のまま残す\nconst sale = base;\nsale.price = 350;\nconsole.log(base.price, sale.price);\n"
		},
		success: { output: '300 350\n' },
		mistakes: [
			{
				when: 'const sale = base; のまま書き換えた',
				why: 'sale と base は同じ品を指している。sale から書いた 350 が base にも出る',
				next: 'const sale = { ...base }; で別の品を作ってから、price を書き換える',
				match: '350 350'
			},
			{
				when: '複製した後に price を書き換えなかった',
				why: '複製は元の中身を写すだけなので、sale の price も 300 のままだ',
				next: '複製の後に sale.price = 350; を残す',
				match: '300 300'
			},
			{
				when: 'const の sale に、もう一度 = で入れ直した',
				why: 'const の変数には入れ直せない。TypeError: Assignment to constant variable. で止まる',
				next: '入れ直さず、作るときに const sale = { ...base }; と書く',
				match: 'Assignment to constant variable'
			}
		]
	},
	check: [
		{ ask: '= で写る物', how: 'オブジェクトの在りか。物は 1 つのまま' },
		{ ask: '片方を書き換えたとき', how: '同じ物を指すもう片方にも出る（5 5）' },
		{ ask: '離すには', how: '{ ...order } で複製し、別の物を指させる' }
	]
};
