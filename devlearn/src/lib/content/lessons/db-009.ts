// db-009 索引で速くする（sql 本物。sql.js の SQLite）。
// 結果は全て、実戦の道具（src/lib/tools/sql/run.ts）で打って得た物。計画は EXPLAIN QUERY PLAN を sqlite3 の端末と同じ木で出す。
// 場面：パン屋の会員のレシートの表 receipts（10000 行）。会員番号で探す画面が遅い。行は決まった式で作る（乱数を使わない）。
// 経過時刻 t は表を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

export const RECEIPTS =
	'CREATE TABLE receipts (id INTEGER PRIMARY KEY, day TEXT NOT NULL, member TEXT NOT NULL, total INTEGER NOT NULL);\n' +
	"WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 10000) INSERT INTO receipts SELECT i, '11-' || printf('%02d', 1 + i % 30), 'm' || printf('%04d', i % 2000), 100 + (i * 37) % 900 FROM n;";

const R = '表 receipts';
const IDX = '索引 idx_member';

export const db009: Lesson = {
	id: 'db-009',
	field: 'db',
	level: 3,
	title: '索引で速くする',
	goal: '索引の有無で、問い合わせの計画がどう変わるかを確かめることができる',
	prereq: ['db-004'],
	related: ['prg-010'],
	next: [],
	explain: [
		{
			n: 1,
			title: '10000 行',
			lead: '会員 m0042 のレシートを探す',
			body: [
				'SELECT COUNT(*) FROM receipts; は 10000 だ。会員は 2000 人いる。',
				"WHERE member = 'm0042' で探すと、5 行が返る。",
				'10000 行から 5 行を見つけるのに、SQLite はどう探したか。'
			],
			facts: [
				{ k: '行の数', v: '10000' },
				{ k: '会員の数', v: '2000' },
				{ k: 'm0042 の行', v: '5（id 42・2042・4042・6042・8042）' }
			],
			scene: [
				{ op: 'appear', id: 'r', label: R, sub: '10000 行', at: [0, 1] },
				{ op: 'appear', id: 'res', label: '結果', sub: '5 行', at: [3, 1] }
			],
			log: { t: '0s', from: R, to: '結果', kind: 'select', info: '10000 行から 5 行を探した' }
		},
		{
			n: 2,
			title: '全部を見る計画',
			lead: 'EXPLAIN QUERY PLAN は、探し方（計画）を見せる',
			body: [
				'問い合わせの前に EXPLAIN QUERY PLAN を付けて打つ。',
				'答えは `--SCAN receipts。1 行目から 10000 行目まで全てを見る計画だ。',
				'行が 10 倍になれば、見る数も 10 倍になる。'
			],
			facts: [
				{ k: '計画', v: 'SCAN receipts' },
				{ k: '見る行', v: '10000（全て）' }
			],
			scene: [
				{ op: 'appear', id: 'plan', label: '計画', sub: 'SCAN', at: [1, 1] },
				{ op: 'move', from: 'r', to: 'plan', payload: '10000 行を順に', kind: 'scan' }
			],
			log: { t: '10s', from: R, to: '計画', kind: 'plan', info: 'SCAN：10000 行を全て見る' }
		},
		{
			n: 3,
			title: '索引を作る',
			lead: '列の値の順に並べた別の表を、索引として持つ',
			body: [
				'CREATE INDEX idx_member ON receipts(member); と打つ。',
				'索引は、member の値の順に並べ、それぞれの行の場所を書いた物だ。',
				'本の後ろの「さくいん」と同じく、並んでいるので半分ずつ絞って探せる。'
			],
			facts: [
				{ k: '文', v: 'CREATE INDEX idx_member ON receipts(member);' },
				{ k: '並べる列', v: 'member' }
			],
			scene: [
				{ op: 'appear', id: 'idx', label: IDX, sub: 'member の順', at: [1, 2] },
				{ op: 'move', from: 'r', to: 'idx', payload: '10000 件を並べる', kind: 'build' }
			],
			log: { t: '20s', from: R, to: IDX, kind: 'index', info: 'member の索引を作った' }
		},
		{
			n: 4,
			title: '計画が変わる',
			lead: '同じ問い合わせが、索引を使って探す計画になる',
			body: [
				'もう一度計画を見ると、SEARCH … USING INDEX idx_member になる。',
				'SEARCH は、索引で目当ての所へ飛ぶ探し方だ。',
				'10000 行なら、半分ずつ絞って 14 回ほどで m0042 に着く。'
			],
			facts: [
				{ k: '計画', v: 'SEARCH receipts USING INDEX idx_member (member=?)' },
				{ k: '絞る回数の目安', v: '約 14 回（2 の 14 乗 = 16384）' }
			],
			scene: [
				{ op: 'change', id: 'plan', k: '探し方', v: 'SEARCH（索引）' },
				{ op: 'move', from: 'idx', to: 'res', payload: 'm0042 の 5 行', kind: 'search' }
			],
			log: { t: '30s', from: IDX, to: '結果', kind: 'plan', info: 'SEARCH：索引で 5 行へ飛んだ' },
			why: '値の順に並んでいれば、真ん中と比べて半分を捨てることを繰り返せるので、全てを見なくて済む'
		},
		{
			n: 5,
			title: '書き込みの手間',
			lead: '索引は、行を足すたびに直す手間がかかる',
			body: [
				'INSERT で 1 行足すと、表と索引の 2 か所に書く。',
				'索引を 3 つ作れば、書く所は 4 か所になる。',
				'探すことの多い列にだけ作る。'
			],
			facts: [
				{ k: '索引 1 つ', v: '書く所 2 か所' },
				{ k: '索引 3 つ', v: '書く所 4 か所' }
			],
			scene: [
				{ op: 'appear', id: 'ins', label: 'INSERT', sub: '1 行', at: [0, 0] },
				{ op: 'move', from: 'ins', to: 'r', payload: '1 行', kind: 'insert' },
				{ op: 'move', from: 'ins', to: 'idx', payload: '1 件', kind: 'insert' }
			],
			log: { t: '40s', from: 'INSERT', to: IDX, kind: 'insert', info: '表と索引の 2 か所に書いた' }
		},
		{
			n: 6,
			title: '索引が効かない形',
			lead: '列の値を加工した条件では、索引の並びを使えない',
			body: [
				"WHERE member LIKE '%42' は、頭が決まらないので SCAN に戻る。",
				"WHERE upper(member) = 'M0042' も、索引は加工前の値なので SCAN だ。",
				"WHERE day = '11-05' は、day に索引が無いので SCAN だ。"
			],
			facts: [
				{ k: "LIKE '%42'", v: 'SCAN receipts' },
				{ k: 'upper(member) = …', v: 'SCAN receipts' },
				{ k: "day = '11-05'", v: 'SCAN receipts（索引なし）' }
			],
			scene: [
				{ op: 'change', id: 'plan', k: '探し方', v: 'SCAN（索引が効かない）' },
				{ op: 'move', from: 'r', to: 'plan', payload: '10000 行を順に', kind: 'scan' }
			],
			log: { t: '50s', from: R, to: '計画', kind: 'plan', info: '加工した条件では SCAN に戻った' }
		}
	],
	example: {
		intro: '同じ問い合わせの計画を、索引を作る前と後で見比べた（ブラウザの中の本物の SQLite）',
		lines: [
			'sqlite> SELECT COUNT(*) FROM receipts;',
			'+----------+',
			'| COUNT(*) |',
			'+----------+',
			'|    10000 |',
			'+----------+',
			"sqlite> EXPLAIN QUERY PLAN SELECT * FROM receipts WHERE member = 'm0042';",
			'QUERY PLAN',
			'`--SCAN receipts',
			'sqlite> CREATE INDEX idx_member ON receipts(member);',
			"sqlite> EXPLAIN QUERY PLAN SELECT * FROM receipts WHERE member = 'm0042';",
			'QUERY PLAN',
			'`--SEARCH receipts USING INDEX idx_member (member=?)',
			"sqlite> SELECT id, day, total FROM receipts WHERE member = 'm0042';",
			'+------+-------+-------+',
			'| id   | day   | total |',
			'+------+-------+-------+',
			'|   42 | 11-13 |   754 |',
			'| 2042 | 11-03 |   954 |',
			'| 4042 | 11-23 |   254 |',
			'| 6042 | 11-13 |   454 |',
			'| 8042 | 11-03 |   654 |',
			'+------+-------+-------+',
			"sqlite> EXPLAIN QUERY PLAN SELECT * FROM receipts WHERE member LIKE '%42';",
			'QUERY PLAN',
			'`--SCAN receipts'
		]
	},
	practice: {
		goal: "日付で探す WHERE day = '11-05' が索引を使うように索引 idx_day を作り、EXPLAIN QUERY PLAN SELECT * FROM receipts WHERE day = '11-05'; で確かめる",
		tool: { name: 'sql', mode: 'real' },
		setup: { sql: RECEIPTS },
		success: { output: 'QUERY PLAN\n`--SEARCH receipts USING INDEX idx_day (day=?)\n' },
		mistakes: [
			{
				when: '索引を作らずに、または別の列に作って計画を見た',
				why: 'day の索引が無いので、10000 行を全て見る SCAN のままだ',
				next: 'CREATE INDEX idx_day ON receipts(day); を打ってから、計画を見る',
				match: 'SCAN receipts'
			},
			{
				when: '同じ名前の索引をもう一度作った',
				why: 'idx_day は既にある',
				next: 'そのまま EXPLAIN QUERY PLAN を打つ',
				match: 'already exists'
			},
			{
				when: '列の名前を打ち違えた',
				why: 'receipts の列は id・day・member・total だ',
				next: 'receipts(day) と書く',
				match: 'no such column'
			}
		]
	},
	check: [
		{ ask: '索引の無い計画', how: 'SCAN receipts（全ての行を見る）' },
		{ ask: '索引のある計画', how: 'SEARCH receipts USING INDEX idx_member (member=?)' },
		{ ask: '効かない形', how: "LIKE '%42' や upper(member) は SCAN に戻る" }
	]
};
