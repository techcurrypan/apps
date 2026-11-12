// db-011 NULL の扱い（sql 本物。sql.js の SQLite）。
// 結果は全て、実戦の道具（src/lib/tools/sql/run.ts）で打って得た物。solutions.test.ts が例を打ち直して一字ずつ比べる。
// 場面：パン屋の口コミの表 reviews（5 行）。星（1〜5）を付けずに書いた口コミは、stars が NULL になっている。
// 経過時刻 t は表を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

export const REVIEWS =
	'CREATE TABLE reviews (id INTEGER PRIMARY KEY, item TEXT NOT NULL, stars INTEGER);\n' +
	"INSERT INTO reviews VALUES (1, 'あんパン', 5), (2, 'あんパン', 3), (3, '食パン', NULL), (4, 'あんパン', NULL), (5, '食パン', 4);";

const R = '表 reviews';
const RES = '結果';

export const db011: Lesson = {
	id: 'db-011',
	field: 'db',
	level: 2,
	title: 'NULL の扱い',
	goal: 'NULL を含む比較と集計の結果を予想することができる',
	prereq: ['db-002'],
	related: [],
	next: ['db-004'],
	explain: [
		{
			n: 1,
			title: '値が無い',
			lead: 'NULL は「値が無い・分からない」の印で、0 でも空の字でもない',
			body: [
				'reviews の 5 行のうち、星を付けずに書いた id 3 と 4 の stars は NULL だ。',
				'0 点とは違う。0 は「0 という値がある」、NULL は「値そのものが無い」だ。',
				'NULL は、比べても計算しても、ふつうの値と違う振る舞いをする。'
			],
			facts: [
				{ k: '行の数', v: '5' },
				{ k: 'stars が NULL の行', v: 'id 3・4' },
				{ k: '0 との違い', v: '0 は値がある・NULL は無い' }
			],
			scene: [
				{ op: 'appear', id: 'r', label: R, sub: '5 行・NULL 2 つ', at: [0, 1] },
				{ op: 'appear', id: 'res', label: RES, sub: '—', at: [3, 1] }
			],
			log: { t: '0s', from: R, to: RES, kind: 'look', info: 'id 3 と 4 の stars が NULL' }
		},
		{
			n: 2,
			title: '= NULL は何も返さない',
			lead: 'NULL と = で比べると、結果は「正しい」にならない',
			body: [
				'SELECT id FROM reviews WHERE stars = NULL; は、1 行も返さない。',
				'NULL = NULL は「分からない」になり、WHERE は「正しい」の行だけを残すからだ。',
				'空の結果を見て「NULL の行は無い」と思い込むのが、よくある誤りだ。'
			],
			facts: [
				{ k: 'WHERE stars = NULL', v: '0 行' },
				{ k: 'NULL = NULL', v: '分からない（NULL）' }
			],
			scene: [
				{ op: 'appear', id: 'where', label: 'WHERE', sub: 'stars = NULL', at: [1, 1] },
				{ op: 'move', from: 'r', to: 'where', payload: '5 行', kind: 'scan' },
				{ op: 'change', id: 'res', k: '行', v: '0' }
			],
			log: { t: '10s', from: 'WHERE', to: RES, kind: 'filter', info: '= NULL では 0 行' },
			why: '値が分からない物どうしは、等しいとも違うとも言えないので、比べた結果も分からないにする決まりだから'
		},
		{
			n: 3,
			title: 'IS NULL',
			lead: 'NULL かどうかは、IS NULL で確かめる',
			body: [
				'WHERE stars IS NULL は、id 3 と 4 の 2 行を返す。',
				'逆に、値のある行は IS NOT NULL で、id 1・2・5 の 3 行だ。',
				'NULL を探すときは、= でなく IS を使う。'
			],
			facts: [
				{ k: 'IS NULL', v: 'id 3・4' },
				{ k: 'IS NOT NULL', v: 'id 1・2・5' }
			],
			scene: [
				{ op: 'change', id: 'where', k: '条件', v: 'stars IS NULL' },
				{ op: 'change', id: 'res', k: '行', v: '2（id 3・4）' }
			],
			log: { t: '20s', from: 'WHERE', to: RES, kind: 'filter', info: 'IS NULL で 2 行' }
		},
		{
			n: 4,
			title: '比べると不明',
			lead: 'NULL を含む比べは、正しいでも誤りでもなく NULL になる',
			body: [
				'SELECT id, stars > 3 AS high は、id 1 が 1（正しい）、id 2 が 0（誤り）だ。',
				'id 3 と 4 は、星が無く 3 より大きいか分からないので NULL だ。',
				'WHERE stars <> 5 も NULL の行を出さず、id 2 と 5 だけだ。'
			],
			facts: [
				{ k: 'stars > 3（id 1）', v: '1' },
				{ k: 'stars > 3（id 3）', v: 'NULL' },
				{ k: 'WHERE stars <> 5', v: 'id 2・5（NULL の行は出ない）' }
			],
			scene: [
				{ op: 'change', id: 'where', k: '条件', v: 'stars <> 5' },
				{ op: 'change', id: 'res', k: '行', v: '2（id 2・5）' }
			],
			log: { t: '30s', from: 'WHERE', to: RES, kind: 'filter', info: '<> 5 でも NULL の行は出ない' }
		},
		{
			n: 5,
			title: 'COUNT と NULL',
			lead: 'COUNT(*) は行を数え、COUNT(列) は値のある行だけを数える',
			body: [
				'SELECT COUNT(*), COUNT(stars) は 5 と 3 を返す。',
				'COUNT(*) は行の数、COUNT(stars) は stars が NULL でない行の数だ。',
				'星の付いていない口コミは、5 − 3 = 2 件と分かる。'
			],
			facts: [
				{ k: 'COUNT(*)', v: '5' },
				{ k: 'COUNT(stars)', v: '3' },
				{ k: '星なし', v: '2' }
			],
			scene: [
				{ op: 'appear', id: 'agg', label: '集計', sub: 'COUNT', at: [2, 2] },
				{ op: 'move', from: 'r', to: 'agg', payload: '5 行', kind: 'count' },
				{ op: 'change', id: 'agg', k: 'COUNT(stars)', v: '3' }
			],
			log: { t: '40s', from: '集計', to: RES, kind: 'count', info: 'COUNT(*) 5・COUNT(stars) 3' }
		},
		{
			n: 6,
			title: 'AVG と NULL',
			lead: 'AVG は NULL の行を飛ばして、値のある行だけで割る',
			body: [
				'AVG(stars) は 4。(5 + 3 + 4) ÷ 3 だ。',
				'NULL を 0 点として 5 行で割ると (5 + 3 + 4) ÷ 5 = 2.4 になる。',
				'どちらで見るかを決めてから集計する。'
			],
			facts: [
				{ k: 'AVG(stars)', v: '4（12 ÷ 3）' },
				{ k: 'SUM(stars) * 1.0 / COUNT(*)', v: '2.4（12 ÷ 5）' }
			],
			scene: [
				{ op: 'change', id: 'agg', k: 'AVG(stars)', v: '4' },
				{ op: 'change', id: 'res', k: '0 点として割ると', v: '2.4' }
			],
			log: {
				t: '50s',
				from: '集計',
				to: RES,
				kind: 'avg',
				info: 'AVG は 4。NULL を 0 とすれば 2.4'
			}
		}
	],
	example: {
		intro: 'NULL を = と IS で探し、数えて、平均を出した（ブラウザの中の本物の SQLite）',
		lines: [
			'sqlite> SELECT * FROM reviews;',
			'+----+----------+-------+',
			'| id | item     | stars |',
			'+----+----------+-------+',
			'|  1 | あんパン |     5 |',
			'|  2 | あんパン |     3 |',
			'|  3 | 食パン   | NULL  |',
			'|  4 | あんパン | NULL  |',
			'|  5 | 食パン   |     4 |',
			'+----+----------+-------+',
			'sqlite> SELECT id FROM reviews WHERE stars = NULL;',
			'sqlite> SELECT id FROM reviews WHERE stars IS NULL;',
			'+----+',
			'| id |',
			'+----+',
			'|  3 |',
			'|  4 |',
			'+----+',
			'sqlite> SELECT COUNT(*), COUNT(stars), AVG(stars) FROM reviews;',
			'+----------+--------------+------------+',
			'| COUNT(*) | COUNT(stars) | AVG(stars) |',
			'+----------+--------------+------------+',
			'|        5 |            3 |          4 |',
			'+----------+--------------+------------+'
		]
	},
	practice: {
		goal: '星の付いていない口コミの id と item を出す',
		tool: { name: 'sql', mode: 'real' },
		setup: { sql: REVIEWS },
		success: {
			output:
				'+----+----------+\n| id | item     |\n+----+----------+\n|  3 | 食パン   |\n|  4 | あんパン |\n+----+----------+\n'
		},
		mistakes: [
			{
				when: 'IS NOT NULL と書いた',
				why: 'IS NOT NULL は、値のある行を残す。星の付いた 3 行が出た',
				next: 'WHERE stars IS NULL と書く',
				match: '|  1 |'
			},
			{
				when: '列の名前を打ち違えた',
				why: 'reviews の列は id・item・stars だ',
				next: 'SELECT id, item FROM reviews WHERE stars IS NULL; と書く',
				match: 'no such column'
			}
		]
	},
	check: [
		{ ask: '= NULL の結果', how: '0 行（NULL = NULL は分からない）' },
		{ ask: 'NULL の探し方', how: 'WHERE stars IS NULL で id 3・4' },
		{ ask: 'AVG と NULL', how: 'NULL を飛ばして 3 行で割り、4' }
	]
};
