// db-007 主キーと制約（sql 本物。sql.js の SQLite）。
// 結果は全て、実戦の道具（src/lib/tools/sql/run.ts）で打って得た物。solutions.test.ts が例を打ち直して一字ずつ比べる。
// 場面：パン屋の店員の名簿 staff と、勤務の表 shifts を作る。SQLite は外部キーの確かめを PRAGMA foreign_keys = ON で入れる。
// 経過時刻 t は表を作り始めた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const ST = '表 staff';
const SH = '表 shifts';
const ME = '店の係';

export const db007: Lesson = {
	id: 'db-007',
	field: 'db',
	level: 2,
	title: '主キーと制約',
	goal: '主キーと制約で、表に入れてはいけない行を止めることができる',
	prereq: ['db-006'],
	related: [],
	next: ['db-008'],
	explain: [
		{
			n: 1,
			title: '同じ番号の行',
			lead: '決まりの無い表には、同じ番号の行が 2 つ入ってしまう',
			body: [
				'店員の番号 S1 は hanako に配った。そこに taro も S1 で入れると、2 行とも入る。',
				'S1 の勤務を探すと、hanako と taro のどちらか分からない。',
				'入れてはいけない行は、表の側で止めたい。'
			],
			facts: [
				{ k: '1 行目', v: "('S1', 'hanako')" },
				{ k: '2 行目', v: "('S1', 'taro')（同じ番号）" }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: 'sqlite>', at: [0, 1] },
				{ op: 'appear', id: 'staff', label: ST, sub: '決まりなし', at: [3, 1] },
				{ op: 'move', from: 'me', to: 'staff', payload: 'S1 が 2 行', kind: 'insert' }
			],
			log: { t: '0s', from: ME, to: ST, kind: 'insert', info: '同じ S1 が 2 行入った' }
		},
		{
			n: 2,
			title: '主キーを決める',
			lead: 'PRIMARY KEY の列は、1 行を必ず 1 つに決める',
			body: [
				'表を作る時に、code TEXT PRIMARY KEY と書く。',
				'code が主キー（行を見分ける列）だ。表の中で同じ値は 2 つ入らない。',
				'行を指すときは、主キーの値 1 つで足りる。'
			],
			facts: [
				{ k: '主キー', v: 'code' },
				{ k: '決まり', v: '同じ値は入らない' }
			],
			scene: [
				{ op: 'change', id: 'staff', k: '主キー', v: 'code' },
				{ op: 'change', id: 'staff', k: '決まり', v: 'PRIMARY KEY・NOT NULL' }
			],
			log: { t: '10s', from: ME, to: ST, kind: 'create', info: 'code を主キーにして作った' }
		},
		{
			n: 3,
			title: '重ねて入れると止まる',
			lead: '同じ主キーの行は、UNIQUE constraint failed で断られる',
			body: [
				"INSERT INTO staff VALUES ('S1', 'hanako'); は changes: 1 で入る。",
				"続けて ('S1', 'taro') を入れると、UNIQUE constraint failed で止まる。",
				'止まった文は、表を 1 字も変えない。'
			],
			facts: [
				{ k: "('S1', 'hanako')", v: 'changes: 1' },
				{ k: "('S1', 'taro')", v: 'Error: UNIQUE constraint failed: staff.code' },
				{ k: '表の行', v: '1（変わらない）' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'staff', payload: "('S1', 'taro')", kind: 'reject' },
				{ op: 'change', id: 'staff', k: '行', v: '1' }
			],
			log: {
				t: '20s',
				from: ST,
				to: ME,
				kind: 'reject',
				info: 'UNIQUE constraint failed: staff.code'
			},
			why: '確かめを使う側の全てのプログラムに任せると、1 つでも忘れた所から崩れるので、表そのものに持たせる'
		},
		{
			n: 4,
			title: 'NOT NULL',
			lead: 'NOT NULL の列は、空のまま入れられない',
			body: [
				"('S2', NULL) を入れると、NOT NULL constraint failed で止まる。",
				'名前の無い店員は入れない。値を書き忘れた行も同じく止まる。',
				'主キーでない列にも、決まりを 1 つずつ付けられる。'
			],
			facts: [
				{ k: "('S2', NULL)", v: 'Error: NOT NULL constraint failed: staff.name' },
				{ k: '(code) だけ入れる', v: '同じく止まる' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'staff', payload: "('S2', NULL)", kind: 'reject' },
				{ op: 'change', id: 'staff', k: 'name の決まり', v: 'NOT NULL' }
			],
			log: {
				t: '30s',
				from: ST,
				to: ME,
				kind: 'reject',
				info: 'NOT NULL constraint failed: staff.name'
			}
		},
		{
			n: 5,
			title: '外部キー',
			lead: '別の表の主キーにある値だけを、入れられるようにする',
			body: [
				'勤務の表 shifts の code に REFERENCES staff(code) と付ける。',
				'PRAGMA foreign_keys = ON の後、名簿に無い S9 の勤務は入れると止まる。',
				'名簿にいる S1 の勤務なら changes: 1 で入る。'
			],
			facts: [
				{ k: '外部キー', v: 'shifts.code → staff.code' },
				{ k: 'S9 の勤務', v: 'Error: FOREIGN KEY constraint failed' },
				{ k: 'S1 の勤務', v: 'changes: 1' }
			],
			scene: [
				{ op: 'appear', id: 'shifts', label: SH, sub: 'code → staff', at: [3, 2] },
				{ op: 'move', from: 'shifts', to: 'staff', payload: 'S9 はいるか', kind: 'reject' }
			],
			log: { t: '40s', from: SH, to: ST, kind: 'reject', info: '名簿に無い S9 は入らない' }
		},
		{
			n: 6,
			title: '消せない行',
			lead: '指されている行は、消すと食い違うので止まる',
			body: [
				'staff から S1 を DELETE すると、FOREIGN KEY constraint failed で止まる。',
				'S1 の勤務が shifts に残っているので、消すと持ち主の無い勤務ができる。',
				'先に勤務の行を消すか、別の店員に付け替えてから消す。'
			],
			facts: [
				{ k: "DELETE … 'S1'", v: 'Error: FOREIGN KEY constraint failed' },
				{ k: '指している行', v: 'shifts の S1 の勤務' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'staff', payload: 'DELETE S1', kind: 'reject' },
				{ op: 'highlight', id: 'shifts' },
				{ op: 'change', id: 'staff', k: 'S1', v: '残った' }
			],
			log: {
				t: '50s',
				from: ST,
				to: ME,
				kind: 'reject',
				info: '勤務が指しているので S1 は消せない'
			}
		}
	],
	example: {
		intro: '決まりのある表に、入れてはいけない行を入れてみた（ブラウザの中の本物の SQLite）',
		lines: [
			'sqlite> CREATE TABLE staff (code TEXT PRIMARY KEY, name TEXT NOT NULL);',
			"sqlite> INSERT INTO staff VALUES ('S1', 'hanako');",
			'changes: 1',
			"sqlite> INSERT INTO staff VALUES ('S1', 'taro');",
			'Error: UNIQUE constraint failed: staff.code',
			"sqlite> INSERT INTO staff VALUES ('S2', NULL);",
			'Error: NOT NULL constraint failed: staff.name',
			'sqlite> CREATE TABLE shifts (id INTEGER PRIMARY KEY, code TEXT NOT NULL REFERENCES staff(code), day TEXT);',
			'sqlite> PRAGMA foreign_keys = ON;',
			"sqlite> INSERT INTO shifts VALUES (1, 'S9', '11-12');",
			'Error: FOREIGN KEY constraint failed',
			"sqlite> INSERT INTO shifts VALUES (1, 'S1', '11-12');",
			'changes: 1',
			"sqlite> DELETE FROM staff WHERE code = 'S1';",
			'Error: FOREIGN KEY constraint failed'
		]
	},
	practice: {
		goal: "code が重ならず name が空にならない表 staff (code, name) を作り、('S1','hanako')・('S1','taro')・('S2',NULL)・('S2','jiro') を順に入れ、SELECT * FROM staff; で確かめる",
		tool: { name: 'sql', mode: 'real' },
		setup: { sql: '' },
		success: {
			output:
				'+------+--------+\n| code | name   |\n+------+--------+\n| S1   | hanako |\n| S2   | jiro   |\n+------+--------+\n'
		},
		mistakes: [
			{
				when: 'code を主キーにしなかった',
				why: '同じ S1 の taro も入ってしまった',
				next: 'CREATE TABLE で code TEXT PRIMARY KEY と書いて作り直す（記録から 0 に戻せる）',
				match: '| taro'
			},
			{
				when: 'name に NOT NULL を付けなかった',
				why: '名前の無い S2 の行が入った',
				next: 'name TEXT NOT NULL と書いて作り直す',
				match: '| NULL'
			},
			{
				when: '表を作る前に入れた、または表の名前を打ち違えた',
				why: 'その名前の表はまだ無い',
				next: '先に CREATE TABLE staff (…) を打つ',
				match: 'no such table'
			}
		]
	},
	check: [
		{ ask: '同じ主キー', how: 'UNIQUE constraint failed で止まる' },
		{ ask: '空の名前', how: 'NOT NULL constraint failed で止まる' },
		{ ask: '指されている行を消す', how: 'FOREIGN KEY constraint failed で止まる' }
	]
};
