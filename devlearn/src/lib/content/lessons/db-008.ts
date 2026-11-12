// db-008 表を分ける（sql 本物。sql.js の SQLite）。
// 結果は全て、実戦の道具（src/lib/tools/sql/run.ts）で打って得た物。solutions.test.ts が例を打ち直して一字ずつ比べる。
// 場面：パン屋の取り置きの注文を、1 枚の表 orders_flat に書いてきた。客の電話番号が注文ごとに繰り返し書かれている。
// 電話番号は作り物の字。経過時刻 t は表を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

export const FLAT =
	'CREATE TABLE orders_flat (order_id INTEGER PRIMARY KEY, day TEXT, customer TEXT, phone TEXT, item TEXT, qty INTEGER);\n' +
	"INSERT INTO orders_flat VALUES (1, '11-10', 'hanako', '000-1111', 'あんパン', 2), (2, '11-10', 'taro', '000-2222', '食パン', 1), " +
	"(3, '11-11', 'hanako', '000-1111', 'カレーパン', 1), (4, '11-11', 'hanako', '000-1111', 'あんパン', 3), (5, '11-11', 'taro', '000-2222', 'あんパン', 1);";

const F = '表 orders_flat';
const C = '表 customers';
const O = '表 orders';

export const db008: Lesson = {
	id: 'db-008',
	field: 'db',
	level: 3,
	title: '表を分ける',
	goal: '重複のある表を、正規化して分けることができる',
	prereq: ['db-005', 'db-007'],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '重複のある表',
			lead: '注文ごとに、客の電話番号を書き写している',
			body: [
				'orders_flat は 5 行。hanako の電話 000-1111 が 3 回、taro の 000-2222 が 2 回書かれている。',
				'同じ事実（hanako の電話は 000-1111）が、3 か所にある。',
				'書く手間だけでなく、直す時に困る。'
			],
			facts: [
				{ k: '行の数', v: '5' },
				{ k: 'hanako の電話', v: '000-1111（3 回）' },
				{ k: 'taro の電話', v: '000-2222（2 回）' }
			],
			scene: [{ op: 'appear', id: 'flat', label: F, sub: '5 行・電話が重複', at: [0, 1] }],
			log: { t: '0s', from: F, to: F, kind: 'look', info: '同じ電話番号が 3 か所にある' }
		},
		{
			n: 2,
			title: '1 か所を変えると食い違う',
			lead: '1 行だけ直すと、同じ客に 2 つの電話番号ができる',
			body: [
				'hanako が電話を 000-9999 に替えた。注文 1 の行だけを UPDATE で直した。',
				'客と電話の組を DISTINCT で出すと 3 行で、hanako が 2 つの番号を持つ。',
				'どちらが正しいか、表からは分からない。'
			],
			facts: [
				{ k: '直した行', v: 'order_id 1 だけ' },
				{ k: 'hanako の電話', v: '000-9999・000-1111（食い違い）' }
			],
			scene: [
				{ op: 'change', id: 'flat', k: 'hanako の電話', v: '000-9999 と 000-1111' },
				{ op: 'highlight', id: 'flat' }
			],
			log: { t: '10s', from: F, to: F, kind: 'conflict', info: 'hanako に電話番号が 2 つできた' }
		},
		{
			n: 3,
			title: '表を分ける',
			lead: '客のことは客の表に、1 人 1 行で置く',
			body: [
				'客の表 customers を、name を主キーにして作る。',
				'INSERT … SELECT DISTINCT customer, phone で写すと、changes: 2。',
				'DISTINCT は、同じ組を 1 つにまとめる。'
			],
			facts: [
				{ k: 'customers', v: 'hanako 000-1111・taro 000-2222' },
				{ k: '答え', v: 'changes: 2' }
			],
			scene: [
				{ op: 'appear', id: 'cust', label: C, sub: '1 人 1 行', at: [3, 0] },
				{ op: 'move', from: 'flat', to: 'cust', payload: 'DISTINCT customer, phone', kind: 'split' }
			],
			log: { t: '20s', from: F, to: C, kind: 'split', info: '客 2 人を 1 行ずつにした' },
			why: '1 つの事実を 1 か所にだけ置けば、直すのも 1 か所で済み、食い違いが起きない'
		},
		{
			n: 4,
			title: 'キーでつなぐ',
			lead: '注文の表には、客の主キーだけを残す',
			body: [
				'注文の表 orders を作り、phone の列は置かない。',
				'customer に REFERENCES customers(name) を付け、客の表の主キーを指す。',
				'INSERT … SELECT で 5 行を写すと changes: 5。'
			],
			facts: [
				{ k: 'orders の列', v: 'order_id・day・customer・item・qty' },
				{ k: '指す先', v: 'customers.name' },
				{ k: '答え', v: 'changes: 5' }
			],
			scene: [
				{ op: 'appear', id: 'ord', label: O, sub: '電話を持たない', at: [3, 2] },
				{ op: 'move', from: 'flat', to: 'ord', payload: '5 行', kind: 'split' },
				{ op: 'move', from: 'ord', to: 'cust', payload: 'customer → name', kind: 'ref' }
			],
			log: { t: '30s', from: F, to: O, kind: 'split', info: '注文 5 行を電話なしで写した' }
		},
		{
			n: 5,
			title: 'JOIN で戻す',
			lead: '元の 1 枚の形は、JOIN でいつでも作れる',
			body: [
				'JOIN customers c ON c.name = o.customer で、注文ごとに電話が付く。',
				'見た目は元の orders_flat と同じだが、電話番号は customers に 1 か所だけある。',
				'分けても、失った事実は無い。'
			],
			facts: [
				{ k: 'つなぐ条件', v: 'c.name = o.customer' },
				{ k: '結果の行', v: '5（元と同じ）' }
			],
			scene: [
				{ op: 'appear', id: 'view', label: 'JOIN の結果', sub: '5 行', at: [5, 1] },
				{ op: 'move', from: 'ord', to: 'view', payload: '5 行', kind: 'join' },
				{ op: 'move', from: 'cust', to: 'view', payload: '電話', kind: 'join' }
			],
			log: { t: '40s', from: O, to: 'JOIN の結果', kind: 'join', info: '電話を付けて 5 行に戻した' }
		},
		{
			n: 6,
			title: '変えるのは 1 か所',
			lead: '電話を替えるのは、customers の 1 行だけ',
			body: [
				"hanako の 1 行を '000-9999' に UPDATE すると changes: 1。",
				'JOIN で見ると、hanako の 3 つの注文が全て 000-9999 になっている。',
				'この形にすることを正規化と呼ぶ。'
			],
			facts: [
				{ k: '直した行', v: 'customers の hanako の 1 行' },
				{ k: '答え', v: 'changes: 1' },
				{ k: 'hanako の注文の電話', v: '3 つとも 000-9999' }
			],
			scene: [
				{ op: 'change', id: 'cust', k: 'hanako', v: '000-9999' },
				{ op: 'change', id: 'view', k: 'hanako の電話', v: '000-9999（3 行とも）' }
			],
			log: {
				t: '50s',
				from: C,
				to: 'JOIN の結果',
				kind: 'update',
				info: '1 行を直すと 3 つの注文に効いた'
			}
		}
	],
	example: {
		intro: '客の表に分け、注文の表から指し、JOIN で戻した（ブラウザの中の本物の SQLite）',
		lines: [
			'sqlite> CREATE TABLE customers (name TEXT PRIMARY KEY, phone TEXT NOT NULL);',
			'sqlite> INSERT INTO customers SELECT DISTINCT customer, phone FROM orders_flat;',
			'changes: 2',
			'sqlite> CREATE TABLE orders (order_id INTEGER PRIMARY KEY, day TEXT, customer TEXT REFERENCES customers(name), item TEXT, qty INTEGER);',
			'sqlite> INSERT INTO orders SELECT order_id, day, customer, item, qty FROM orders_flat;',
			'changes: 5',
			"sqlite> UPDATE customers SET phone = '000-9999' WHERE name = 'hanako';",
			'changes: 1',
			'sqlite> SELECT o.order_id, o.customer, c.phone, o.item FROM orders o JOIN customers c ON c.name = o.customer;',
			'+----------+----------+----------+------------+',
			'| order_id | customer | phone    | item       |',
			'+----------+----------+----------+------------+',
			'|        1 | hanako   | 000-9999 | あんパン   |',
			'|        2 | taro     | 000-2222 | 食パン     |',
			'|        3 | hanako   | 000-9999 | カレーパン |',
			'|        4 | hanako   | 000-9999 | あんパン   |',
			'|        5 | taro     | 000-2222 | あんパン   |',
			'+----------+----------+----------+------------+'
		]
	},
	practice: {
		goal: '客の表 customers (name が主キー, phone) を作って orders_flat から客を重ねずに写し、SELECT * FROM customers; で確かめる',
		tool: { name: 'sql', mode: 'real' },
		setup: { sql: FLAT },
		success: {
			output:
				'+--------+----------+\n| name   | phone    |\n+--------+----------+\n| hanako | 000-1111 |\n| taro   | 000-2222 |\n+--------+----------+\n'
		},
		mistakes: [
			{
				when: 'DISTINCT を付けずに写した',
				why: '注文の 5 行をそのまま写そうとして、2 行目の hanako で主キーが重なった',
				next: 'SELECT DISTINCT customer, phone FROM orders_flat から写す',
				match: 'UNIQUE constraint failed'
			},
			{
				when: '列の名前を打ち違えた',
				why: 'orders_flat の客の列は customer、customers の列は name だ',
				next: 'INSERT INTO customers SELECT DISTINCT customer, phone FROM orders_flat; と書く',
				match: 'no such column'
			},
			{
				when: '表を作る前に写した',
				why: 'customers はまだ無い',
				next: '先に CREATE TABLE customers (name TEXT PRIMARY KEY, phone TEXT NOT NULL); を打つ',
				match: 'no such table'
			}
		]
	},
	check: [
		{ ask: '重複の困る所', how: '1 行だけ直すと、同じ客に電話が 2 つできる' },
		{ ask: '分け方', how: '客は customers に 1 人 1 行、注文は客の主キーだけを持つ' },
		{ ask: '元の形', how: 'JOIN で注文に電話を付ければ戻る' }
	]
};
