// db-002 条件で絞る（sql 本物。sql.js の SQLite）。
// 結果の表は全て、実戦の道具（src/lib/tools/sql/run.ts）で打って得た物。solutions.test.ts が例を打ち直して一字ずつ比べる。
// 場面：パン屋の商品の表 items（7 行。src/lib/content/data/bakery.ts）から、朝の仕込みに要る行だけを探す。経過時刻 t は表を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';
import { ITEMS } from '../data/bakery.ts';

const ITEMS_T = '表 items';
const RES = '結果';

export const db002: Lesson = {
	id: 'db-002',
	field: 'db',
	level: 1,
	title: '条件で絞る',
	goal: 'WHERE で、条件に合う行だけを取り出すことができる',
	prereq: ['db-001'],
	related: ['prg-005'],
	next: ['db-003', 'db-011'],
	explain: [
		{
			n: 1,
			title: '全行',
			lead: 'SELECT * FROM items は、7 行を全て返す',
			body: [
				'表 items には 7 つの商品がある。列は id・name・kind・price・stock の 5 つだ。',
				'kind は種類で、菓子・食事・惣菜の 3 つがある。',
				'全てを見るのではなく、要る行だけを取り出したい。'
			],
			facts: [
				{ k: '行の数', v: '7' },
				{ k: '列', v: 'id・name・kind・price・stock' },
				{ k: 'kind', v: '菓子・食事・惣菜' }
			],
			scene: [
				{ op: 'appear', id: 'items', label: ITEMS_T, sub: '7 行', at: [0, 1] },
				{ op: 'appear', id: 'res', label: RES, sub: '7 行', at: [3, 1] }
			],
			log: { t: '0s', from: ITEMS_T, to: RES, kind: 'select', info: 'SELECT * で 7 行' }
		},
		{
			n: 2,
			title: 'WHERE で比べる',
			lead: 'WHERE の後に、行ごとに確かめる条件を書く',
			body: [
				'SELECT name, price FROM items WHERE price >= 170; は 4 行を返す。',
				'SQLite は 7 行を 1 つずつ見て、price >= 170 が正しい行だけを残す。',
				'比べる印は = <> < <= > >= の 6 つだ。<> は「等しくない」だ。'
			],
			facts: [
				{ k: '条件', v: 'price >= 170' },
				{ k: '残った行', v: '食パン・メロンパン・カレーパン・チーズパン' },
				{ k: '行の数', v: '7 → 4' }
			],
			scene: [
				{ op: 'appear', id: 'where', label: 'WHERE', sub: 'price >= 170', at: [1, 1] },
				{ op: 'move', from: 'items', to: 'where', payload: '7 行', kind: 'scan' },
				{ op: 'change', id: 'res', k: '行', v: '4' }
			],
			log: { t: '10s', from: 'WHERE', to: RES, kind: 'filter', info: 'price >= 170 で 4 行' }
		},
		{
			n: 3,
			title: 'AND で絞る',
			lead: 'AND は、両方の条件が正しい行だけを残す',
			body: [
				"WHERE kind = '菓子' AND price >= 150 は、クリームパンとメロンパンの 2 行だ。",
				"文字の値は '菓子' のように ' で囲む。囲まないと列の名前と読まれる。",
				'AND を足すほど、行は減る。'
			],
			facts: [
				{ k: '条件', v: "kind = '菓子' AND price >= 150" },
				{ k: '残った行', v: 'クリームパン 150・メロンパン 180' },
				{ k: "' を付けないと", v: 'Error: no such column: 菓子' }
			],
			scene: [
				{ op: 'change', id: 'where', k: '条件', v: "kind = '菓子' AND price >= 150" },
				{ op: 'change', id: 'res', k: '行', v: '2' }
			],
			log: { t: '20s', from: 'WHERE', to: RES, kind: 'filter', info: 'AND で 2 行に絞った' }
		},
		{
			n: 4,
			title: 'OR で広げる',
			lead: 'OR は、どちらかの条件が正しければ残す',
			body: [
				"WHERE kind = '惣菜' OR stock = 0 は 3 行を返す。",
				'惣菜のカレーパン・チーズパンと、在庫 0 のメロンパンだ。',
				'AND と OR を混ぜると AND が先に組になる。迷ったら ( ) で囲む。'
			],
			facts: [
				{ k: '条件', v: "kind = '惣菜' OR stock = 0" },
				{ k: '残った行', v: 'メロンパン・カレーパン・チーズパン' },
				{ k: '先に組む方', v: 'AND（OR より先）' }
			],
			scene: [
				{ op: 'change', id: 'where', k: '条件', v: "kind = '惣菜' OR stock = 0" },
				{ op: 'change', id: 'res', k: '行', v: '3' }
			],
			log: { t: '30s', from: 'WHERE', to: RES, kind: 'filter', info: 'OR で 3 行に広げた' },
			why: '掛け算が足し算より先なのと同じく、AND を先に組むと決めておけば、同じ文はいつも同じ意味になる'
		},
		{
			n: 5,
			title: 'LIKE で探す',
			lead: 'LIKE は、文字の一部が合う行を探す',
			body: [
				"WHERE name LIKE 'クリーム%' は、クリームパンの 1 行を返す。",
				'% は「何文字でも何でもよい」、_ は「ちょうど 1 文字」の印だ。',
				"'%パン' なら、名前がパンで終わる 7 行全てに当たる。"
			],
			facts: [
				{ k: '条件', v: "name LIKE 'クリーム%'" },
				{ k: '%', v: '0 文字以上の何でも' },
				{ k: '_', v: 'ちょうど 1 文字' }
			],
			scene: [
				{ op: 'change', id: 'where', k: '条件', v: "name LIKE 'クリーム%'" },
				{ op: 'change', id: 'res', k: '行', v: '1' }
			],
			log: { t: '40s', from: 'WHERE', to: RES, kind: 'filter', info: "LIKE 'クリーム%' で 1 行" }
		},
		{
			n: 6,
			title: '結果の行数',
			lead: '条件を変えるたびに、残る行の数を確かめる',
			body: [
				"菓子で在庫のある物は WHERE kind = '菓子' AND stock > 0 で 2 行だ。",
				'思ったより多い・少ないときは、条件を 1 つずつ外して数を見る。',
				'元の表は 7 行のまま変わらない。WHERE は取り出す行を選ぶだけだ。'
			],
			facts: [
				{ k: '条件', v: "kind = '菓子' AND stock > 0" },
				{ k: '残った行', v: 'あんパン 12・クリームパン 8' },
				{ k: '元の表', v: '7 行のまま' }
			],
			scene: [
				{ op: 'change', id: 'where', k: '条件', v: "kind = '菓子' AND stock > 0" },
				{ op: 'change', id: 'res', k: '行', v: '2' },
				{ op: 'change', id: 'items', k: '行', v: '7（変わらない）' }
			],
			log: { t: '50s', from: 'WHERE', to: RES, kind: 'filter', info: '菓子で在庫のある物は 2 行' }
		}
	],
	example: {
		intro: '条件を替えながら、残る行を見比べた（ブラウザの中の本物の SQLite）',
		lines: [
			'sqlite> SELECT name, price FROM items WHERE price >= 170;',
			'+------------+-------+',
			'| name       | price |',
			'+------------+-------+',
			'| 食パン     |   280 |',
			'| メロンパン |   180 |',
			'| カレーパン |   180 |',
			'| チーズパン |   170 |',
			'+------------+-------+',
			"sqlite> SELECT name, price FROM items WHERE kind = '菓子' AND price >= 150;",
			'+--------------+-------+',
			'| name         | price |',
			'+--------------+-------+',
			'| クリームパン |   150 |',
			'| メロンパン   |   180 |',
			'+--------------+-------+',
			'sqlite> SELECT name FROM items WHERE kind = 菓子;',
			'Error: no such column: 菓子',
			"sqlite> SELECT name, kind FROM items WHERE kind = '惣菜' OR stock = 0;",
			'+------------+------+',
			'| name       | kind |',
			'+------------+------+',
			'| メロンパン | 菓子 |',
			'| カレーパン | 惣菜 |',
			'| チーズパン | 惣菜 |',
			'+------------+------+',
			"sqlite> SELECT name FROM items WHERE name LIKE 'クリーム%';",
			'+--------------+',
			'| name         |',
			'+--------------+',
			'| クリームパン |',
			'+--------------+'
		]
	},
	practice: {
		goal: '惣菜パンと、在庫が 0 の商品の、name と kind を取り出す',
		tool: { name: 'sql', mode: 'real' },
		setup: { sql: ITEMS },
		success: {
			output:
				'+------------+------+\n| name       | kind |\n+------------+------+\n| メロンパン | 菓子 |\n| カレーパン | 惣菜 |\n| チーズパン | 惣菜 |\n+------------+------+\n'
		},
		mistakes: [
			{
				when: "文字の値を ' で囲まなかった",
				why: '囲まない字は、列の名前として読まれる。惣菜という名前の列は無い',
				next: "kind = '惣菜' と、' で囲む",
				match: 'no such column'
			},
			{
				when: '列を * で全て出した',
				why: '行は合っていても、要るのは name と kind の 2 列だけだ',
				next: 'SELECT name, kind FROM items と、列を 2 つ書く',
				match: '| id '
			},
			{
				when: '表の名前を打ち違えた',
				why: 'その名前の表は無い',
				next: '表の名前を items にする',
				match: 'no such table'
			}
		]
	},
	check: [
		{ ask: 'AND の結果', how: "kind = '菓子' AND price >= 150 で 2 行" },
		{ ask: 'OR の結果', how: "kind = '惣菜' OR stock = 0 で 3 行" },
		{ ask: '文字の値の書き方', how: "' で囲む（'菓子'）" }
	]
};
