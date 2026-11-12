// prg-005 配列を変換する（本物の JavaScript）。
// 出力は全て、実戦の道具（src/lib/tools/js/run.ts）で走らせて得た物（solutions.test.ts が例を流して確かめる）。
// 場面：パン屋の値札。税抜きの値段の並びから、税込みの並びと、200 円未満の並びを作る。経過時刻 t は作業を始めた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const OUT = '出力';

export const prg005: Lesson = {
	id: 'prg-005',
	field: 'prg',
	level: 2,
	title: '配列を変換する',
	goal: 'map と filter で、配列の中身がどう変わるかを追うことができる',
	prereq: ['prg-004'],
	related: ['db-002'],
	next: ['prg-006'],
	explain: [
		{
			n: 1,
			title: '配列を置く',
			lead: '3 つの値段を、1 つの配列に並べる',
			body: [
				'const prices = [120, 250, 80]; と書く。',
				'配列は、値を順に並べて 1 つの名前で持つ入れ物だ。',
				'番号は 0 から始まり、prices[1] は 250 だ。'
			],
			facts: [
				{ k: 'prices', v: '[ 120, 250, 80 ]' },
				{ k: 'prices.length', v: '3' },
				{ k: 'prices[1]', v: '250' }
			],
			scene: [{ op: 'appear', id: 'prices', label: 'prices', sub: '[ 120, 250, 80 ]', at: [0, 0] }],
			log: {
				t: '0s',
				from: 'prices',
				to: 'prices',
				kind: 'array',
				info: '3 つの値段を並べた',
				size: '3 件'
			}
		},
		{
			n: 2,
			title: 'map で 1 つずつ変える',
			lead: 'map に渡した関数が、要素ごとに 1 回ずつ呼ばれる',
			body: [
				'prices.map((p) => p + Math.floor(p * 0.1)) と書く。',
				'(p) => … は名前の無い関数で、p に 120・250・80 が順に入る。',
				'1 回目は 120 + 12 で、132 が返る。'
			],
			facts: [
				{ k: '1 回目', v: 'p = 120 → 132' },
				{ k: '2 回目', v: 'p = 250 → 275' },
				{ k: '3 回目', v: 'p = 80 → 88' }
			],
			scene: [
				{ op: 'appear', id: 'map', label: 'map', sub: 'p + 1 割', at: [1, 0] },
				{ op: 'move', from: 'prices', to: 'map', payload: '120', kind: 'map' },
				{ op: 'change', id: 'map', k: '呼んだ回数', v: '3' }
			],
			log: {
				t: '1s',
				from: 'prices',
				to: 'map',
				kind: 'map',
				info: '要素ごとに 3 回呼んだ',
				size: '3 件'
			}
		},
		{
			n: 3,
			title: '新しい配列ができる',
			lead: '返った値を同じ順に並べた、別の配列ができる',
			body: [
				'map は返った値を同じ順で並べ、新しい配列にして返す。',
				'taxed は [ 132, 275, 88 ] になる。',
				'件数は元と同じ 3 件だ。'
			],
			facts: [
				{ k: 'taxed', v: '[ 132, 275, 88 ]' },
				{ k: '件数', v: '3 → 3' }
			],
			scene: [
				{ op: 'appear', id: 'taxed', label: 'taxed', sub: '[ 132, 275, 88 ]', at: [2, 0] },
				{ op: 'move', from: 'map', to: 'taxed', payload: '132, 275, 88', kind: 'array' }
			],
			log: {
				t: '1s',
				from: 'map',
				to: 'taxed',
				kind: 'array',
				info: 'taxed ができた',
				size: '3 件'
			}
		},
		{
			n: 4,
			title: 'filter で残す',
			lead: 'true を返した要素だけが残る',
			body: [
				'taxed.filter((p) => p < 200) は、要素ごとに p < 200 を確かめる。',
				'132 は true、275 は false、88 は true になる。',
				'true の物だけを並べた [ 132, 88 ] が返る。'
			],
			facts: [
				{ k: '条件', v: 'p < 200' },
				{ k: '275', v: 'false（落ちる）' },
				{ k: 'cheap', v: '[ 132, 88 ]' }
			],
			scene: [
				{ op: 'appear', id: 'filter', label: 'filter', sub: 'p < 200', at: [3, 0] },
				{ op: 'move', from: 'taxed', to: 'filter', payload: '132, 275, 88', kind: 'filter' },
				{ op: 'appear', id: 'cheap', label: 'cheap', sub: '[ 132, 88 ]', at: [4, 0] }
			],
			log: {
				t: '2s',
				from: 'taxed',
				to: 'cheap',
				kind: 'filter',
				info: '275 が落ち、2 件が残った',
				size: '2 件'
			}
		},
		{
			n: 5,
			title: 'つなげて使う',
			lead: 'map の結果に、そのまま filter を続けて書ける',
			body: [
				'map も filter も配列を返すので、点でつなげて書ける。',
				'prices.map(…).filter(…) は、上の 2 行と同じ結果になる。',
				'左から順に、1 段ずつ配列が作られる。'
			],
			facts: [
				{ k: '書いた物', v: 'prices.map(…).filter(…)' },
				{ k: '結果', v: '[ 132, 88 ]' },
				{ k: '作られた配列', v: '2 つ（taxed と cheap）' }
			],
			scene: [
				{ op: 'move', from: 'prices', to: 'cheap', payload: 'map → filter', kind: 'chain' },
				{ op: 'highlight', id: 'cheap' }
			],
			log: {
				t: '3s',
				from: 'prices',
				to: 'cheap',
				kind: 'chain',
				info: 'map と filter をつなげて同じ結果',
				size: '2 件'
			}
		},
		{
			n: 6,
			title: '元の配列は変わらない',
			lead: 'map と filter は新しい配列を作り、元を書き換えない',
			body: [
				'最後に prices を出すと、[ 120, 250, 80 ] のままだ。',
				'元が残るので、同じ prices から別の変換もやり直せる。',
				'元を書き換える sort や push とは、ここが違う。'
			],
			facts: [
				{ k: 'prices', v: '[ 120, 250, 80 ]（そのまま）' },
				{ k: '書き換えない', v: 'map / filter' },
				{ k: '書き換える', v: 'push / sort' }
			],
			scene: [
				{ op: 'appear', id: 'out', label: OUT, sub: 'console.log', at: [2, 1] },
				{ op: 'move', from: 'prices', to: 'out', payload: '[ 120, 250, 80 ]', kind: 'log' }
			],
			log: { t: '4s', from: 'prices', to: OUT, kind: 'log', info: 'prices は元のまま' },
			why: '元を書き換えないと、どの段で何が変わったかを後から追える'
		}
	],
	example: {
		intro: '税込みにして 200 円未満を残し、元の配列も出す。下の 6 行を走らせた',
		lines: [
			'const prices = [120, 250, 80];',
			'const taxed = prices.map((p) => p + Math.floor(p * 0.1));',
			'const cheap = taxed.filter((p) => p < 200);',
			'console.log(taxed);',
			'console.log(cheap);',
			'console.log(prices);',
			'▶ 出力',
			'[ 132, 275, 88 ]',
			'[ 132, 88 ]',
			'[ 120, 250, 80 ]'
		]
	},
	practice: {
		goal: '在庫が 1 個以上の品だけを残し、名前の配列にして出す',
		tool: { name: 'js', mode: 'real' },
		setup: {
			code: "const items = [\n  { name: 'あんパン', stock: 0 },\n  { name: '食パン', stock: 4 },\n  { name: 'メロンパン', stock: 2 }\n];\n// 在庫が 1 個以上の品だけを残し、名前の配列にして console.log で出す\n"
		},
		success: { output: "[ '食パン', 'メロンパン' ]\n" },
		mistakes: [
			{
				when: 'map だけで名前にし、filter で残さなかった',
				why: '在庫が 0 のあんパンも残る。map は件数を変えない',
				next: '先に filter((x) => x.stock > 0) で残し、その後で map する',
				match: "'あんパン'"
			},
			{
				when: 'filter だけで、名前にしなかった',
				why: '残った物は品の全体（name と stock）のままだ。名前だけの並びになっていない',
				next: '後ろに .map((x) => x.name) をつなげる',
				match: 'stock:'
			},
			{
				when: '先に map で名前にしてから filter した',
				why: '名前の文字列には stock が無い。x.stock は undefined で、undefined > 0 は全て false になる',
				next: 'filter を先に、map を後に並べ替える',
				match: '[]'
			}
		]
	},
	check: [
		{ ask: 'map の件数', how: '元と同じ（3 件 → 3 件）' },
		{ ask: 'filter の件数', how: 'true を返した物だけ（3 件 → 2 件）' },
		{ ask: '元の配列', how: 'map と filter の後も変わらない' }
	]
};
