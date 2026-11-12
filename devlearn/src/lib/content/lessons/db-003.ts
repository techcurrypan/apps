// db-003 並べて切る（sql 本物。sql.js の SQLite）。
// 結果の表は全て、実戦の道具（src/lib/tools/sql/run.ts）で打って得た物。solutions.test.ts が例を打ち直して一字ずつ比べる。
// 場面：パン屋の商品の表 items（7 行。src/lib/content/data/bakery.ts）から、値札の高い順・在庫の多い順の上位を出す。
// 経過時刻 t は表を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';
import { ITEMS } from '../data/bakery.ts';

const ITEMS_T = '表 items';
const RES = '結果';

export const db003: Lesson = {
	id: 'db-003',
	field: 'db',
	level: 1,
	title: '並べて切る',
	goal: 'ORDER BY と LIMIT で、並べた上位の行を取り出すことができる',
	prereq: ['db-002'],
	related: [],
	next: ['db-004'],
	explain: [
		{
			n: 1,
			title: '並びは決まっていない',
			lead: 'ORDER BY が無いと、行の並びは約束されない',
			body: [
				'SELECT name, price FROM items; は、今は id の順に 7 行を返す。',
				'これは今たまたまそうなっているだけで、SQL は並びを約束しない。',
				'行を足したり消したりすると、並びが変わることがある。'
			],
			facts: [
				{ k: '行の数', v: '7' },
				{ k: '並び', v: '約束されない' }
			],
			scene: [
				{ op: 'appear', id: 'items', label: ITEMS_T, sub: '7 行', at: [0, 1] },
				{ op: 'appear', id: 'res', label: RES, sub: '並び：不定', at: [3, 1] }
			],
			log: { t: '0s', from: ITEMS_T, to: RES, kind: 'select', info: '7 行。並びは約束されない' },
			why: '表は行の集まりで、並べるには手間がかかる。頼まれた時だけ並べる方が速いので、既定では並べない'
		},
		{
			n: 2,
			title: 'ORDER BY',
			lead: 'ORDER BY 列 で、その列の小さい順に並べる',
			body: [
				'ORDER BY price で並べると、1 行目はコッペパン 100 だ。',
				'最後の行は食パン 280。小さい順を昇順と呼び、ASC と書いてもよい。',
				'文字の列なら、文字の番号の順に並ぶ。'
			],
			facts: [
				{ k: '1 行目', v: 'コッペパン 100' },
				{ k: '7 行目', v: '食パン 280' },
				{ k: '既定の向き', v: 'ASC（小さい順）' }
			],
			scene: [
				{ op: 'appear', id: 'order', label: 'ORDER BY', sub: 'price', at: [1, 1] },
				{ op: 'move', from: 'items', to: 'order', payload: '7 行', kind: 'sort' },
				{ op: 'change', id: 'res', k: '1 行目', v: 'コッペパン 100' }
			],
			log: {
				t: '10s',
				from: 'ORDER BY',
				to: RES,
				kind: 'sort',
				info: 'price の小さい順。先頭は 100'
			}
		},
		{
			n: 3,
			title: 'DESC',
			lead: 'DESC を付けると、大きい順になる',
			body: [
				'ORDER BY price DESC の 1 行目は食パン 280 だ。',
				'2 行目と 3 行目は、メロンパンとカレーパンの 180 が並ぶ。',
				'同じ値どうしの順は、まだ約束されていない。'
			],
			facts: [
				{ k: '1 行目', v: '食パン 280' },
				{ k: '2・3 行目', v: 'メロンパン 180・カレーパン 180' },
				{ k: '同じ値の順', v: '約束されない' }
			],
			scene: [
				{ op: 'change', id: 'order', k: '向き', v: 'DESC' },
				{ op: 'change', id: 'res', k: '1 行目', v: '食パン 280' }
			],
			log: {
				t: '20s',
				from: 'ORDER BY',
				to: RES,
				kind: 'sort',
				info: 'price の大きい順。先頭は 280'
			}
		},
		{
			n: 4,
			title: '2 つの列で並べる',
			lead: '同じ値の時に、次の列で並べる',
			body: [
				'ORDER BY price DESC, name と書くと、price が同じ行は name の順になる。',
				'180 の 2 行は、カレーパン、メロンパンの順に決まる。',
				'並びを毎回同じにしたいときは、最後に重ならない列を足す。'
			],
			facts: [
				{ k: '並べ方', v: 'price DESC, name' },
				{ k: '180 の 2 行', v: 'カレーパン → メロンパン' }
			],
			scene: [
				{ op: 'change', id: 'order', k: '2 つ目の列', v: 'name' },
				{ op: 'change', id: 'res', k: '2 行目', v: 'カレーパン 180' }
			],
			log: {
				t: '30s',
				from: 'ORDER BY',
				to: RES,
				kind: 'sort',
				info: '同じ 180 は name の順にした'
			}
		},
		{
			n: 5,
			title: 'LIMIT',
			lead: 'LIMIT n で、並べた上から n 行だけを残す',
			body: [
				'LIMIT は文の最後に書く。ORDER BY の後で、上から切る。',
				'ORDER BY price DESC, name LIMIT 3 は、食パン・カレーパン・メロンパンの 3 行だ。',
				'LIMIT を ORDER BY の前に書くと syntax error で止まる。'
			],
			facts: [
				{ k: 'LIMIT 3', v: '食パン・カレーパン・メロンパン' },
				{ k: '書く場所', v: '文の最後' },
				{ k: '前に書くと', v: 'Error: near "ORDER": syntax error' }
			],
			scene: [
				{ op: 'appear', id: 'limit', label: 'LIMIT', sub: '3', at: [2, 1] },
				{ op: 'move', from: 'order', to: 'limit', payload: '並べた 7 行', kind: 'cut' },
				{ op: 'change', id: 'res', k: '行', v: '3' }
			],
			log: { t: '40s', from: 'LIMIT', to: RES, kind: 'limit', info: '上から 3 行を残した' }
		},
		{
			n: 6,
			title: '上位 3 件',
			lead: '在庫の多い順の上位 3 つも、同じ形で取れる',
			body: [
				'ORDER BY stock DESC LIMIT 3 は、コッペパン 15・あんパン 12・クリームパン 8 だ。',
				'DESC を忘れると、在庫の少ない順になり、メロンパン 0 が先頭に来る。',
				'並べる列と向きを先に決め、最後に切る。'
			],
			facts: [
				{ k: '在庫の多い 3 つ', v: 'コッペパン 15・あんパン 12・クリームパン 8' },
				{ k: 'DESC を忘れると', v: 'メロンパン 0・チーズパン 3・食パン 5' }
			],
			scene: [
				{ op: 'change', id: 'order', k: '並べ方', v: 'stock DESC' },
				{ op: 'change', id: 'res', k: '1 行目', v: 'コッペパン 15' }
			],
			log: { t: '50s', from: 'LIMIT', to: RES, kind: 'limit', info: '在庫の多い上位 3 つ' }
		}
	],
	example: {
		intro: '並べる向きと列を替え、上から切った（ブラウザの中の本物の SQLite）',
		lines: [
			'sqlite> SELECT name, price FROM items ORDER BY price DESC;',
			'+--------------+-------+',
			'| name         | price |',
			'+--------------+-------+',
			'| 食パン       |   280 |',
			'| メロンパン   |   180 |',
			'| カレーパン   |   180 |',
			'| チーズパン   |   170 |',
			'| クリームパン |   150 |',
			'| あんパン     |   120 |',
			'| コッペパン   |   100 |',
			'+--------------+-------+',
			'sqlite> SELECT name, price FROM items ORDER BY price DESC, name LIMIT 3;',
			'+------------+-------+',
			'| name       | price |',
			'+------------+-------+',
			'| 食パン     |   280 |',
			'| カレーパン |   180 |',
			'| メロンパン |   180 |',
			'+------------+-------+',
			'sqlite> SELECT name, stock FROM items LIMIT 3 ORDER BY stock DESC;',
			'Error: near "ORDER": syntax error'
		]
	},
	practice: {
		goal: '在庫の多い順に、上位 3 つの商品の name と stock を取り出す',
		tool: { name: 'sql', mode: 'real' },
		setup: { sql: ITEMS },
		success: {
			output:
				'+--------------+-------+\n| name         | stock |\n+--------------+-------+\n| コッペパン   |    15 |\n| あんパン     |    12 |\n| クリームパン |     8 |\n+--------------+-------+\n'
		},
		mistakes: [
			{
				when: 'LIMIT を付けなかった',
				why: '並べただけで、7 行が全て出た',
				next: '文の最後に LIMIT 3 を足す',
				match: '| カレーパン'
			},
			{
				when: 'DESC を付けなかった',
				why: '既定は小さい順なので、在庫の少ない物が上に来た',
				next: 'ORDER BY stock DESC と書く',
				match: '| メロンパン'
			},
			{
				when: 'LIMIT を ORDER BY の前に書いた',
				why: 'LIMIT は文の最後に置く決まりだ',
				next: 'ORDER BY stock DESC LIMIT 3 の順に書く',
				match: 'syntax error'
			}
		]
	},
	check: [
		{ ask: '大きい順', how: 'ORDER BY 列 DESC' },
		{ ask: '同じ値の並び', how: 'ORDER BY price DESC, name で 2 つ目の列を足す' },
		{ ask: 'LIMIT の場所', how: '文の最後（ORDER BY の後）' }
	]
};
