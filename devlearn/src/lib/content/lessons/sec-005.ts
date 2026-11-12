// sec-005 SQL インジェクション（sql 本物。sql.js の SQLite）。
// 出力は全て、実戦と同じ道具（ブラウザの中の SQLite）で打って得た物。solutions.test.ts が例を打ち直して一字ずつ比べる。
// 場面：店の係の画面に「会員の名前で探して、メールを出す」窓がある。画面の裏では、打った名前を SQL の文に埋めている。
// 経過時刻 t は窓を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const SETUP = [
	'CREATE TABLE members (id INTEGER PRIMARY KEY, name TEXT NOT NULL, mail TEXT NOT NULL);',
	"INSERT INTO members VALUES (1, 'hanako', 'hanako@example.com'), (2, 'taro', 'taro@example.com'), (3, 'O''Hara', 'ohara@example.com');"
].join('\n');

const BOX = '検索の窓';
const APP = '画面の裏';
const DB = 'members の表';

export const sec005: Lesson = {
	id: 'sec-005',
	field: 'sec',
	level: 2,
	title: 'SQL インジェクション',
	goal: '入力が SQL に混ざる仕組みを確かめ、プレースホルダで防ぐことができる',
	prereq: [],
	related: ['sec-007'],
	next: ['sec-006'],
	explain: [
		{
			n: 1,
			title: '検索の窓',
			lead: '名前を打つと、その会員のメールが 1 行出る',
			body: [
				'係が窓に hanako と打つと、hanako@example.com が 1 行出る。',
				'表 members には 3 人がいて、メールは係にも全員分は見せない決まりだ。',
				'窓に打った字が、裏でどう使われるかを追う。'
			],
			facts: [
				{ k: '打った名前', v: 'hanako' },
				{ k: '出た行', v: 'hanako | hanako@example.com' },
				{ k: '表の行の数', v: '3' }
			],
			scene: [
				{ op: 'appear', id: 'box', label: BOX, sub: 'hanako', at: [0, 1] },
				{ op: 'appear', id: 'db', label: DB, sub: '3 人', at: [3, 1] }
			],
			log: { t: '0s', from: BOX, to: DB, kind: 'search', info: 'hanako を探して 1 行出た' }
		},
		{
			n: 2,
			title: '文字列で SQL を組む',
			lead: '裏では、打った字を SQL の文の中にそのまま埋めている',
			body: [
				"裏では、WHERE name = ' の後に入力をつなぎ、最後に ' を足して文を作る。",
				"hanako を埋めると WHERE name = 'hanako' になり、正しく動く。",
				'入力が、データでなく SQL の文の一部として読まれるのが落とし穴だ。'
			],
			facts: [
				{ k: '組んだ文', v: "SELECT name, mail FROM members WHERE name = 'hanako';" },
				{ k: '入力の置き場', v: "' と ' の間" }
			],
			scene: [
				{ op: 'appear', id: 'app', label: APP, sub: '文字列をつなぐ', at: [1, 1] },
				{ op: 'move', from: 'box', to: 'app', payload: 'hanako', kind: 'input' },
				{ op: 'move', from: 'app', to: 'db', payload: "WHERE name = 'hanako'", kind: 'sql' }
			],
			log: { t: '5s', from: APP, to: DB, kind: 'sql', info: "WHERE name = 'hanako' を送った" }
		},
		{
			n: 3,
			title: '引用符を入れる',
			lead: "名前に ' が入ると、文の区切りが崩れる",
			body: [
				"会員 O'Hara を探すと、文は WHERE name = 'O'Hara' になる。",
				"2 つ目の ' で文字列が終わり、残りの Hara' が SQL として読まれる。",
				'SQLite は Error: near "Hara": syntax error を返す。'
			],
			facts: [
				{ k: '打った名前', v: "O'Hara" },
				{ k: '組んだ文', v: "WHERE name = 'O'Hara'" },
				{ k: '返った物', v: 'Error: near "Hara": syntax error' }
			],
			scene: [
				{ op: 'change', id: 'box', k: '入力', v: "O'Hara" },
				{ op: 'move', from: 'app', to: 'db', payload: "WHERE name = 'O'Hara'", kind: 'error' }
			],
			log: { t: '10s', from: DB, to: APP, kind: 'error', info: 'near "Hara": syntax error' }
		},
		{
			n: 4,
			title: '条件が崩れる',
			lead: "' を使って、文の条件そのものを書き換えられる",
			body: [
				"窓に ' OR '1'='1 と打つと、文は WHERE name = '' OR '1'='1' になる。",
				"'1'='1' はいつも正しいので、OR でつないだ条件は全ての行で正しくなる。",
				'打った者が、検索の条件を書き換えた。'
			],
			facts: [
				{ k: '打った字', v: "' OR '1'='1" },
				{ k: '組んだ文', v: "WHERE name = '' OR '1'='1'" },
				{ k: '条件', v: 'どの行でも正しい' }
			],
			scene: [
				{ op: 'change', id: 'box', k: '入力', v: "' OR '1'='1" },
				{ op: 'move', from: 'app', to: 'db', payload: "WHERE name = '' OR '1'='1'", kind: 'attack' }
			],
			log: { t: '20s', from: APP, to: DB, kind: 'attack', info: "OR '1'='1' で条件が崩れた" }
		},
		{
			n: 5,
			title: '全行が出る',
			lead: '見せない決まりのメールが、全員分出る',
			body: [
				"返った表は hanako・taro・O'Hara の 3 行で、全員のメールが出た。",
				'同じ手で、UNION を足して別の表を読んだり、DELETE を混ぜたりもできる。',
				'これを SQL インジェクション（SQL を差し込む攻撃）と呼ぶ。'
			],
			facts: [
				{ k: '出た行の数', v: '3（全員）' },
				{ k: '漏れた物', v: 'taro@example.com・ohara@example.com' }
			],
			scene: [
				{ op: 'move', from: 'db', to: 'box', payload: '3 行（全員）', kind: 'leak' },
				{ op: 'change', id: 'db', k: '漏れた行', v: '3' }
			],
			log: { t: '20s', from: DB, to: BOX, kind: 'leak', info: '全員のメール 3 行が出た' }
		},
		{
			n: 6,
			title: 'プレースホルダで防ぐ',
			lead: '文と値を別々に渡すと、値は SQL として読まれない',
			body: [
				'文は WHERE name = ? と書き、? の所に入力を値として別に渡す（プレースホルダ）。',
				"' OR '1'='1 は、その 11 字の名前として探され、0 行になる。O'Hara も正しく 1 行出る。",
				"SQLite の端末で同じ形を確かめるには、値の中の ' を '' と 2 つ重ねて書く。"
			],
			facts: [
				{ k: '文', v: 'SELECT name, mail FROM members WHERE name = ?' },
				{ k: "' OR '1'='1 を渡すと", v: '0 行' },
				{ k: "端末での O'Hara の書き方", v: "'O''Hara'" }
			],
			scene: [
				{ op: 'change', id: 'app', k: '作り', v: 'プレースホルダ ?' },
				{ op: 'move', from: 'app', to: 'db', payload: "文 + 値「' OR '1'='1」", kind: 'safe' },
				{ op: 'change', id: 'db', k: '漏れた行', v: '0' }
			],
			log: { t: '30s', from: DB, to: BOX, kind: 'safe', info: '値として探して 0 行' },
			why: '文の形を先に決めてから値を渡すので、値の中に何が入っていても文の形は変わらない'
		}
	],
	example: {
		intro: '裏で組まれる文を端末で打ち、崩れ方と防ぎ方を確かめた（ブラウザの中の本物の SQLite）',
		lines: [
			"sqlite> SELECT name, mail FROM members WHERE name = 'hanako';",
			'+--------+--------------------+',
			'| name   | mail               |',
			'+--------+--------------------+',
			'| hanako | hanako@example.com |',
			'+--------+--------------------+',
			"sqlite> SELECT name, mail FROM members WHERE name = 'O'Hara';",
			'Error: near "Hara": syntax error',
			"sqlite> SELECT name, mail FROM members WHERE name = '' OR '1'='1';",
			'+--------+--------------------+',
			'| name   | mail               |',
			'+--------+--------------------+',
			'| hanako | hanako@example.com |',
			'| taro   | taro@example.com   |',
			"| O'Hara | ohara@example.com  |",
			'+--------+--------------------+',
			"sqlite> SELECT name, mail FROM members WHERE name = ''' OR ''1''=''1';",
			"sqlite> SELECT count(*) FROM members WHERE name = ''' OR ''1''=''1';",
			'+----------+',
			'| count(*) |',
			'+----------+',
			'|        0 |',
			'+----------+'
		]
	},
	practice: {
		goal: "会員 O'Hara の名前とメールを、' を正しく包んで 1 行だけ出す",
		tool: { name: 'sql', mode: 'real' },
		setup: { sql: SETUP },
		success: {
			output:
				'+--------+-------------------+\n' +
				'| name   | mail              |\n' +
				'+--------+-------------------+\n' +
				"| O'Hara | ohara@example.com |\n" +
				'+--------+-------------------+\n'
		},
		mistakes: [
			{
				when: "名前の ' をそのまま書いた",
				why: "' で文字列が終わり、残りが SQL として読まれた。窓の裏で起きていた崩れと同じだ",
				next: "値の中の ' を 2 つ重ね、WHERE name = 'O''Hara' と書く",
				match: 'syntax error'
			},
			{
				when: '条件が全ての行で正しくなり、ほかの会員も出た',
				why: '条件が崩れて、見せない決まりのメールまで出た。値が SQL として読まれている',
				next: "名前を 1 つの値として包み、WHERE name = 'O''Hara' だけにする",
				match: 'hanako@example.com'
			},
			{
				when: '列や表の名前を打ち違えた',
				why: 'その名前の列・表は無い',
				next: 'SELECT name, mail FROM members と書く',
				match: 'no such'
			}
		]
	},
	check: [
		{ ask: '崩れる理由', how: "入力が ' と ' の間に埋められ、文の一部として読まれる" },
		{ ask: '攻撃の結果', how: "' OR '1'='1 で全員の 3 行が出る" },
		{ ask: '防ぎ方', how: 'WHERE name = ? と書き、値を別に渡す' }
	]
};
