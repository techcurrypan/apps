// db-004 集計する（sql 本物。sql.js の SQLite）。
// 結果の表は全て、実戦の道具（src/lib/tools/sql/run.ts）で打って得た物。solutions.test.ts が例を打ち直して一字ずつ比べる。
// 場面：パン屋の売れた記録 sales（11 月 10 日・11 日の 10 行）と商品の表 items（src/lib/content/data/bakery.ts）を、
// 週末の仕込みの量を決めるために集計する。経過時刻 t は表を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';
import { ITEMS, SALES } from '../data/bakery.ts';

const SALES_T = '表 sales';
const RES = '結果';

export const db004: Lesson = {
	id: 'db-004',
	field: 'db',
	level: 2,
	title: '集計する',
	goal: 'GROUP BY と COUNT・SUM・AVG で、組ごとに集計することができる',
	prereq: ['db-003'],
	related: [],
	next: ['db-005'],
	explain: [
		{
			n: 1,
			title: '行を数える',
			lead: 'COUNT(*) は、行の数を 1 つの値にまとめる',
			body: [
				'SELECT COUNT(*) FROM sales; は 10 を返す。売れた記録が 10 行ある。',
				'COUNT のように、多くの行を 1 つの値にまとめる関数を集計関数と呼ぶ。',
				'結果は 1 行 1 列になる。'
			],
			facts: [
				{ k: 'COUNT(*)', v: '10' },
				{ k: '結果の形', v: '1 行 1 列' }
			],
			scene: [
				{ op: 'appear', id: 'sales', label: SALES_T, sub: '10 行', at: [0, 1] },
				{ op: 'appear', id: 'res', label: RES, sub: '10', at: [3, 1] }
			],
			log: { t: '0s', from: SALES_T, to: RES, kind: 'count', info: 'COUNT(*) は 10' }
		},
		{
			n: 2,
			title: '合計',
			lead: 'SUM(列) は、その列の値を全て足す',
			body: [
				'SELECT SUM(qty) FROM sales; は 25 を返す。2 日で 25 個売れた。',
				'COUNT は行の数、SUM は値の和で、qty が 4 の行は COUNT で 1、SUM で 4 と数える。',
				'MIN と MAX は、一番小さい値と大きい値を返す。'
			],
			facts: [
				{ k: 'SUM(qty)', v: '25' },
				{ k: 'COUNT(*)', v: '10（行の数）' }
			],
			scene: [
				{ op: 'appear', id: 'agg', label: '集計', sub: 'SUM(qty)', at: [2, 1] },
				{ op: 'move', from: 'sales', to: 'agg', payload: '10 行の qty', kind: 'sum' },
				{ op: 'change', id: 'res', k: '値', v: '25' }
			],
			log: { t: '10s', from: '集計', to: RES, kind: 'sum', info: 'SUM(qty) は 25' }
		},
		{
			n: 3,
			title: '組に分ける',
			lead: 'GROUP BY 列 は、同じ値の行を 1 つの組にまとめる',
			body: [
				'GROUP BY day は、11-10 の 5 行と 11-11 の 5 行の 2 組に分ける。',
				'SELECT day, SUM(qty) … GROUP BY day は、組ごとに 1 行、12 と 13 を返す。',
				'集計関数は、組の中だけで計算する。'
			],
			facts: [
				{ k: '組', v: '11-10・11-11' },
				{ k: '11-10 の SUM(qty)', v: '12' },
				{ k: '11-11 の SUM(qty)', v: '13' }
			],
			scene: [
				{ op: 'appear', id: 'group', label: 'GROUP BY', sub: 'day', at: [1, 1] },
				{ op: 'move', from: 'sales', to: 'group', payload: '10 行', kind: 'group' },
				{ op: 'change', id: 'res', k: '行', v: '2（日ごと）' }
			],
			log: { t: '20s', from: 'GROUP BY', to: RES, kind: 'group', info: '日ごとに 12 と 13' }
		},
		{
			n: 4,
			title: '組ごとに数える',
			lead: '商品ごとに、売れた回数と個数を並べる',
			body: [
				'GROUP BY item_id にすると、売れた商品 5 つの組になる。',
				'item_id 1（あんパン）は COUNT 3 回・SUM 11 個で、一番多く売れた。',
				'SELECT に書ける列は、GROUP BY の列と集計関数だけにする。'
			],
			facts: [
				{ k: 'item_id 1', v: '3 回・11 個' },
				{ k: 'item_id 2', v: '2 回・5 個' },
				{ k: '組の数', v: '5' }
			],
			scene: [
				{ op: 'change', id: 'group', k: '列', v: 'item_id' },
				{ op: 'change', id: 'res', k: '行', v: '5（商品ごと）' }
			],
			log: { t: '30s', from: 'GROUP BY', to: RES, kind: 'group', info: 'あんパンが 11 個で一番' },
			why: '組には何行もあるので、組をまとめた列か集計の値でないと、どの行の値を出すかが決まらない'
		},
		{
			n: 5,
			title: '平均',
			lead: 'AVG(列) は、組ごとの平均を返す',
			body: [
				'SELECT kind, AVG(price) FROM items GROUP BY kind; は 3 行を返す。',
				'菓子は (120 + 150 + 180) ÷ 3 = 150、惣菜は 175、食事は 190 だ。',
				'平均は割り切れないと小数になる。'
			],
			facts: [
				{ k: '菓子', v: '150' },
				{ k: '惣菜', v: '175' },
				{ k: '食事', v: '190' }
			],
			scene: [
				{ op: 'appear', id: 'items', label: '表 items', sub: '7 行', at: [0, 2] },
				{ op: 'move', from: 'items', to: 'group', payload: 'kind で 3 組', kind: 'group' },
				{ op: 'change', id: 'res', k: '菓子の平均', v: '150' }
			],
			log: { t: '40s', from: '表 items', to: RES, kind: 'avg', info: '種類ごとの平均の値札' }
		},
		{
			n: 6,
			title: 'HAVING で絞る',
			lead: '集計した後の値で組を絞るには、HAVING を使う',
			body: [
				'SUM(qty) AS total で名前を付け、HAVING total >= 4 と書くと、3 組が残る。',
				'WHERE は集計の前の行を絞る。WHERE SUM(qty) >= 4 は misuse of aggregate で止まる。',
				'行を絞るのは WHERE、組を絞るのは HAVING だ。'
			],
			facts: [
				{ k: 'HAVING total >= 4', v: 'item_id 1・2・5 の 3 組' },
				{ k: 'WHERE SUM(qty) >= 4', v: 'Error: misuse of aggregate: SUM()' }
			],
			scene: [
				{ op: 'appear', id: 'having', label: 'HAVING', sub: 'total >= 4', at: [2, 2] },
				{ op: 'move', from: 'group', to: 'having', payload: '5 組', kind: 'filter' },
				{ op: 'change', id: 'res', k: '行', v: '3' }
			],
			log: { t: '50s', from: 'HAVING', to: RES, kind: 'filter', info: '合計 4 以上の 3 組を残した' }
		}
	],
	example: {
		intro: '行を数え、足し、組に分けて集計した（ブラウザの中の本物の SQLite）',
		lines: [
			'sqlite> SELECT COUNT(*), SUM(qty) FROM sales;',
			'+----------+----------+',
			'| COUNT(*) | SUM(qty) |',
			'+----------+----------+',
			'|       10 |       25 |',
			'+----------+----------+',
			'sqlite> SELECT day, SUM(qty) FROM sales GROUP BY day;',
			'+-------+----------+',
			'| day   | SUM(qty) |',
			'+-------+----------+',
			'| 11-10 |       12 |',
			'| 11-11 |       13 |',
			'+-------+----------+',
			'sqlite> SELECT item_id, COUNT(*) AS n, SUM(qty) AS total FROM sales GROUP BY item_id;',
			'+---------+---+-------+',
			'| item_id | n | total |',
			'+---------+---+-------+',
			'|       1 | 3 |    11 |',
			'|       2 | 2 |     5 |',
			'|       3 | 2 |     3 |',
			'|       5 | 2 |     4 |',
			'|       6 | 1 |     2 |',
			'+---------+---+-------+',
			'sqlite> SELECT kind, AVG(price) FROM items GROUP BY kind;',
			'+------+------------+',
			'| kind | AVG(price) |',
			'+------+------------+',
			'| 惣菜 |        175 |',
			'| 菓子 |        150 |',
			'| 食事 |        190 |',
			'+------+------------+',
			'sqlite> SELECT item_id, SUM(qty) FROM sales WHERE SUM(qty) >= 4 GROUP BY item_id;',
			'Error: misuse of aggregate: SUM()'
		]
	},
	practice: {
		goal: 'sales から、商品（item_id）ごとに売れた数の合計を total として出し、合計 4 以上の組だけを残す',
		tool: { name: 'sql', mode: 'real' },
		setup: { sql: `${ITEMS}\n${SALES}` },
		success: {
			output:
				'+---------+-------+\n| item_id | total |\n+---------+-------+\n|       1 |    11 |\n|       2 |     5 |\n|       5 |     4 |\n+---------+-------+\n'
		},
		mistakes: [
			{
				when: '集計の値の条件を WHERE に書いた',
				why: 'WHERE は集計の前の 1 行ずつを見る。その時にはまだ合計が無い',
				next: 'GROUP BY item_id の後に HAVING total >= 4 と書く',
				match: 'misuse of aggregate'
			},
			{
				when: 'HAVING を付けなかった',
				why: '合計が 3 と 2 の組も残った',
				next: '文の最後に HAVING total >= 4 を足す',
				match: '|       3 |'
			},
			{
				when: '列の名前を打ち違えた',
				why: 'その名前の列は sales に無い（列は id・day・item_id・qty）',
				next: 'SUM(qty) AS total と書く',
				match: 'no such column'
			}
		]
	},
	check: [
		{ ask: 'COUNT と SUM の違い', how: 'COUNT(*) は行の数 10、SUM(qty) は和 25' },
		{ ask: '組ごとの集計', how: 'GROUP BY day で 12 と 13' },
		{ ask: '組を絞る', how: 'HAVING（WHERE は集計の前の行を絞る）' }
	]
};
