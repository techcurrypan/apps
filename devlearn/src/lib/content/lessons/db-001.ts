// db-001 表から取り出す（段 10-0。sql の見本。本物の SQLite 3.54.0 を sql.js でブラウザの中で動かす）。
// 結果の表は全て、実戦の道具（src/lib/tools/sql/run.ts、sqlite3 の .mode table と同じ形）で打って得た物。
// 場面：パン屋の商品の表 items（4 行）を、開店前に確かめる。経過時刻 t は表を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const ME = 'sqlite>';
const ITEMS = '表 items';
const RES = '結果';

const SETUP =
	'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT, price INTEGER, stock INTEGER);\n' +
	"INSERT INTO items VALUES (1, 'あんパン', 120, 12), (2, '食パン', 280, 5), (3, 'クリームパン', 150, 8), (4, 'メロンパン', 160, 0);";

export const db001: Lesson = {
	id: 'db-001',
	field: 'db',
	level: 1,
	title: '表から取り出す',
	goal: 'SELECT で、表から列を選んで取り出すことができる',
	prereq: [],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '表を開く',
			lead: 'データベースは、名前の付いた表を持つ',
			body: [
				'データベースの中に、items という名前の表が 1 つある。',
				'表は、同じ形の記録を縦に積んだ物だ。ここではパン屋の商品が入っている。'
			],
			facts: [
				{ k: '表の名前', v: 'items' },
				{ k: '列', v: 'id, name, price, stock' },
				{ k: '行の数', v: '4' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: '打つ所', at: [0, 0] },
				{ op: 'appear', id: 'items', label: ITEMS, sub: '4 行 × 4 列', at: [1, 0] }
			],
			log: { t: '0s', from: ME, to: ITEMS, kind: 'open', info: 'items を開いた。4 行ある' }
		},
		{
			n: 2,
			title: '行と列',
			lead: '1 行が商品 1 つ、1 列が項目 1 つ',
			body: [
				'行は横 1 本で、商品 1 つ分の記録だ。1 行目は id 1 のあんパンだ。',
				'列は縦 1 本で、全ての商品に共通の項目だ。price 列には値段が並ぶ。'
			],
			facts: [
				{ k: '1 行目', v: '1 | あんパン | 120 | 12' },
				{ k: 'price 列', v: '120, 280, 150, 160' },
				{ k: 'id', v: '行を見分ける番号（重ならない）' }
			],
			scene: [
				{ op: 'change', id: 'items', k: '1 行目', v: 'あんパン 120 12' },
				{ op: 'change', id: 'items', k: 'price 列', v: '120 280 150 160' }
			],
			log: { t: '10s', from: ITEMS, to: ITEMS, kind: 'read', info: '行は商品、列は項目' }
		},
		{
			n: 3,
			title: 'SELECT * で全部',
			lead: 'SELECT * FROM items; は、全ての列を全ての行で返す',
			body: [
				'SELECT は「取り出せ」、FROM items は「items から」、* は「全ての列」だ。',
				'結果は 4 行 4 列の表で、items の中身そのままだ。',
				'文の終わりには ; を付ける。'
			],
			facts: [
				{ k: '打った文', v: 'SELECT * FROM items;' },
				{ k: '結果の見出し', v: '| id | name | price | stock |' },
				{ k: '結果', v: '4 行 × 4 列' }
			],
			scene: [
				{ op: 'appear', id: 'res', label: RES, sub: '返った表', at: [2, 0] },
				{ op: 'move', from: 'items', to: 'res', payload: '4 行 × 4 列', kind: 'select' }
			],
			log: { t: '25s', from: ITEMS, to: RES, kind: 'select', info: 'SELECT * で 4 行 4 列が返った' }
		},
		{
			n: 4,
			title: '列を選ぶ',
			lead: '* の代わりに列の名前を , で並べる',
			body: [
				'SELECT name, price FROM items; と書くと、2 つの列だけが返る。',
				'列は書いた順に並ぶ。price, name と書けば、price が左に来る。',
				'表の中身は変わらず、取り出し方が変わっただけだ。'
			],
			facts: [
				{ k: '打った文', v: 'SELECT name, price FROM items;' },
				{ k: '結果の見出し', v: '| name | price |' },
				{ k: '結果', v: '4 行 × 2 列' }
			],
			scene: [
				{ op: 'move', from: 'items', to: 'res', payload: 'name, price', kind: 'select' },
				{ op: 'change', id: 'res', k: '列', v: 'name price' }
			],
			log: {
				t: '50s',
				from: ITEMS,
				to: RES,
				kind: 'select',
				info: 'name と price の 2 列が返った'
			},
			why: '要る列だけを返すと、運ぶデータが減り、読む人も目当ての値を探さずに済む'
		},
		{
			n: 5,
			title: '名前を付け替える',
			lead: 'AS で、結果の列に別の見出しを付ける',
			body: [
				'SELECT name AS 品名, price AS 値段 FROM items; と書く。',
				'結果の見出しは 品名 と 値段 になる。表の列の名前は name のままだ。'
			],
			facts: [
				{ k: '打った文', v: 'SELECT name AS 品名, price AS 値段 FROM items;' },
				{ k: '結果の見出し', v: '| 品名 | 値段 |' },
				{ k: '表の列の名前', v: 'name, price（変わらない）' }
			],
			scene: [{ op: 'change', id: 'res', k: '列', v: '品名 値段' }],
			log: {
				t: '1m20s',
				from: ITEMS,
				to: RES,
				kind: 'select',
				info: '見出しを 品名 と 値段 にした'
			}
		},
		{
			n: 6,
			title: '結果の行の数',
			lead: '列を選んでも、行の数は表と同じ 4 行',
			body: [
				'どの文でも結果は 4 行だった。SELECT は列を選ぶが、行を減らさない。',
				'在庫 0 のメロンパンも、結果に出ている。',
				'行を絞るには、次のレッスンの WHERE を使う。'
			],
			facts: [
				{ k: '結果の行の数', v: '4' },
				{ k: '4 行目', v: 'メロンパン | 160' },
				{ k: '行を絞る句', v: 'WHERE（db-002）' }
			],
			scene: [
				{ op: 'change', id: 'res', k: '行の数', v: '4' },
				{ op: 'highlight', id: 'res' }
			],
			log: { t: '1m40s', from: RES, to: ME, kind: 'count', info: '結果は 4 行。行は減っていない' }
		},
		{
			n: 7,
			title: '無い名前はエラー',
			lead: '列や表の名前を打ち違えると、理由つきで止まる',
			body: [
				'SELECT nme FROM items; は Error: no such column: nme と返る。',
				'SELECT name FROM item; は Error: no such table: item と返る。',
				'どちらも結果の表は返らない。名前を表のとおりに直す。'
			],
			facts: [
				{ k: '列の打ち違い', v: 'Error: no such column: nme' },
				{ k: '表の打ち違い', v: 'Error: no such table: item' },
				{ k: '結果', v: '0 行（表が返らない）' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'items', payload: 'nme', kind: 'error' },
				{ op: 'change', id: 'me', k: 'エラー', v: 'no such column' }
			],
			log: { t: '2m', from: ME, to: ITEMS, kind: 'error', info: 'nme という列は無い' }
		}
	],
	example: {
		intro: '商品の表 items から、名前と値段を取り出す',
		lines: [
			'sqlite> SELECT name, price FROM items;',
			'+--------------+-------+',
			'| name         | price |',
			'+--------------+-------+',
			'| あんパン     |   120 |',
			'| 食パン       |   280 |',
			'| クリームパン |   150 |',
			'| メロンパン   |   160 |',
			'+--------------+-------+',
			'sqlite> SELECT nme FROM items;',
			'Error: no such column: nme'
		]
	},
	practice: {
		goal: 'items から、name と stock の 2 列を、この順で取り出す',
		tool: { name: 'sql', mode: 'real' },
		setup: { sql: SETUP },
		success: {
			output:
				'+--------------+-------+\n' +
				'| name         | stock |\n' +
				'+--------------+-------+\n' +
				'| あんパン     |    12 |\n' +
				'| 食パン       |     5 |\n' +
				'| クリームパン |     8 |\n' +
				'| メロンパン   |     0 |\n' +
				'+--------------+-------+\n'
		},
		mistakes: [
			{
				when: '列の名前を打ち違えた（stok など）',
				why: 'その名前の列は items に無い。SQLite は no such column と返す',
				next: 'SELECT * FROM items; で列の名前を確かめ、stock と書き直す',
				match: 'no such column'
			},
			{
				when: '表の名前を打ち違えた（item など）',
				why: 'その名前の表は無い。SQLite は no such table と返す',
				next: '表の名前を items（終わりに s）にして打ち直す',
				match: 'no such table'
			}
		]
	},
	check: [
		{ ask: '2 列だけが返るか', how: '結果の見出しが | name | stock |' },
		{ ask: '行の数', how: '結果が 4 行で、メロンパンの stock が 0' },
		{ ask: '列の並び', how: 'name が左、stock が右に並ぶ' }
	]
};
