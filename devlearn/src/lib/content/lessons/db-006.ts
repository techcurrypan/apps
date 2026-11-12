// db-006 行を変える（sql 本物。sql.js の SQLite）。
// 結果は全て、実戦の道具（src/lib/tools/sql/run.ts）で打って得た物。行を変えた文は、sqlite3 の .changes on と同じく changes: N を返す。
// 場面：パン屋の商品の表 items（7 行。src/lib/content/data/bakery.ts）を、朝の仕込みの後に直す。経過時刻 t は表を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';
import { ITEMS } from '../data/bakery.ts';

const I = '表 items';
const ME = '店の係';

export const db006: Lesson = {
	id: 'db-006',
	field: 'db',
	level: 2,
	title: '行を変える',
	goal: 'INSERT・UPDATE・DELETE で、表の行を変えることができる',
	prereq: ['db-002'],
	related: [],
	next: ['db-007', 'db-010'],
	explain: [
		{
			n: 1,
			title: '行を足す',
			lead: 'INSERT INTO 表 VALUES (…) で、1 行を足す',
			body: [
				"INSERT INTO items VALUES (8, 'ベーグル', '食事', 200, 10); と打つ。",
				'答えは changes: 1 で、COUNT(*) は 7 から 8 になる。',
				'値は、表の列の順（id・name・kind・price・stock）に並べる。'
			],
			facts: [
				{ k: '足した行', v: "(8, 'ベーグル', '食事', 200, 10)" },
				{ k: '足した後の答え', v: 'changes: 1' },
				{ k: 'COUNT(*)', v: '7 → 8' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: 'sqlite>', at: [0, 1] },
				{ op: 'appear', id: 'items', label: I, sub: '7 行', at: [3, 1] },
				{ op: 'move', from: 'me', to: 'items', payload: 'INSERT ベーグル', kind: 'insert' },
				{ op: 'change', id: 'items', k: '行', v: '8' }
			],
			log: { t: '0s', from: ME, to: I, kind: 'insert', info: 'ベーグルを足した。changes: 1' }
		},
		{
			n: 2,
			title: '1 行を変える',
			lead: 'UPDATE 表 SET 列 = 値 WHERE 条件 で書き替える',
			body: [
				'UPDATE … SET price = 130 WHERE id = 1; で、あんパンを 130 にする。',
				'答えは changes: 1。WHERE に合った 1 行だけが変わった。',
				'id のように、1 行だけに当たる列で選ぶと確かだ。'
			],
			facts: [
				{ k: '文', v: 'UPDATE items SET price = 130 WHERE id = 1;' },
				{ k: 'あんパンの price', v: '120 → 130' },
				{ k: '答え', v: 'changes: 1' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'items', payload: 'UPDATE id = 1', kind: 'update' },
				{ op: 'change', id: 'items', k: 'あんパン', v: '130' }
			],
			log: { t: '10s', from: ME, to: I, kind: 'update', info: 'あんパンを 130 にした。changes: 1' }
		},
		{
			n: 3,
			title: 'WHERE を忘れると',
			lead: 'WHERE の無い UPDATE は、全ての行を変える',
			body: [
				'UPDATE items SET stock = 0; と打つと、答えは changes: 8 だ。',
				'8 行全ての在庫が 0 になり、SQL は「本当によいか」を聞かない。',
				'元に戻す命令は無い。戻すには、前の値を覚えていなければならない。'
			],
			facts: [
				{ k: '文', v: 'UPDATE items SET stock = 0;' },
				{ k: '答え', v: 'changes: 8' },
				{ k: '全ての stock', v: '0' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'items', payload: 'UPDATE（WHERE なし）', kind: 'danger' },
				{ op: 'change', id: 'items', k: '全ての在庫', v: '0' }
			],
			log: { t: '20s', from: ME, to: I, kind: 'danger', info: 'WHERE を忘れて 8 行が変わった' },
			why: 'SQL は「条件に合う全ての行」に効く決まりで、条件が無ければ全ての行が合うから'
		},
		{
			n: 4,
			title: '行を消す',
			lead: 'DELETE FROM 表 WHERE 条件 で、合う行を消す',
			body: [
				'DELETE FROM items WHERE stock = 0; は、在庫 0 の行を消す。',
				'前の手で全ての在庫が 0 になっていたので、changes: 8 で全部消えた。',
				'消す前の表の状態によって、消える行の数が変わる。'
			],
			facts: [
				{ k: '文', v: 'DELETE FROM items WHERE stock = 0;' },
				{ k: '消した数', v: 'changes: 8' },
				{ k: 'COUNT(*)', v: '8 → 0' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'items', payload: 'DELETE stock = 0', kind: 'delete' },
				{ op: 'change', id: 'items', k: '行', v: '0' }
			],
			log: { t: '30s', from: ME, to: I, kind: 'delete', info: '在庫 0 の 8 行を消した' }
		},
		{
			n: 5,
			title: '変わった行数',
			lead: 'changes: N を見て、思った数と同じかを確かめる',
			body: [
				'1 行を変えるつもりなら changes: 1 のはずだ。',
				'changes: 0 は、WHERE に合う行が無かった印だ。名前の打ち誤りを疑う。',
				'思った数と違えば、すぐ手を止める。'
			],
			facts: [
				{ k: '思った数', v: '1' },
				{ k: 'changes: 0', v: '合う行が無い' },
				{ k: 'changes: 8', v: '全ての行に当たった' }
			],
			scene: [
				{ op: 'appear', id: 'count', label: 'changes', sub: '変わった行の数', at: [2, 2] },
				{ op: 'move', from: 'items', to: 'count', payload: '1 か 0 か 8 か', kind: 'count' }
			],
			log: { t: '40s', from: I, to: 'changes', kind: 'count', info: '変わった数を思った数と比べる' }
		},
		{
			n: 6,
			title: '確かめてから変える',
			lead: '同じ WHERE で SELECT してから、UPDATE・DELETE を打つ',
			body: [
				"まず SELECT … WHERE name = 'メロンパン' で、当たる行が 1 行だと見る。",
				'同じ WHERE のまま、UPDATE … SET stock = 20 と打つ。',
				'終わったら SELECT で全ての行を見て、ほかが変わっていないことを確かめる。'
			],
			facts: [
				{ k: '先に見る', v: "SELECT … WHERE name = 'メロンパン';" },
				{ k: '次に変える', v: 'UPDATE … SET stock = 20 WHERE …' },
				{ k: '答え', v: 'changes: 1' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'items', payload: 'SELECT で 1 行', kind: 'select' },
				{ op: 'move', from: 'me', to: 'items', payload: 'UPDATE で 1 行', kind: 'update' },
				{ op: 'change', id: 'items', k: 'メロンパン', v: '20' }
			],
			log: { t: '50s', from: ME, to: I, kind: 'update', info: '確かめてから 1 行だけ変えた' }
		}
	],
	example: {
		intro: '足し・変え・WHERE を忘れ・消した（ブラウザの中の本物の SQLite）',
		lines: [
			"sqlite> INSERT INTO items VALUES (8, 'ベーグル', '食事', 200, 10);",
			'changes: 1',
			'sqlite> UPDATE items SET price = 130 WHERE id = 1;',
			'changes: 1',
			'sqlite> UPDATE items SET stock = 0;',
			'changes: 8',
			'sqlite> DELETE FROM items WHERE stock = 0;',
			'changes: 8',
			'sqlite> SELECT COUNT(*) FROM items;',
			'+----------+',
			'| COUNT(*) |',
			'+----------+',
			'|        0 |',
			'+----------+'
		]
	},
	practice: {
		goal: 'メロンパンの在庫だけを 20 にし、最後に SELECT name, stock FROM items; で全ての行を確かめる',
		tool: { name: 'sql', mode: 'real' },
		setup: { sql: ITEMS },
		success: {
			output:
				'+--------------+-------+\n| name         | stock |\n+--------------+-------+\n| あんパン     |    12 |\n| 食パン       |     5 |\n| クリームパン |     8 |\n| メロンパン   |    20 |\n| カレーパン   |     6 |\n| コッペパン   |    15 |\n| チーズパン   |     3 |\n+--------------+-------+\n'
		},
		mistakes: [
			{
				when: 'UPDATE に WHERE を付けなかった',
				why: '7 行全ての在庫が 20 になった（changes: 7）',
				next: "記録から 1 つ前に戻し、WHERE name = 'メロンパン' を付けて打ち直す",
				match: 'changes: 7'
			},
			{
				when: 'WHERE の名前を打ち誤った',
				why: 'changes: 0 は、合う行が無かった印だ。何も変わっていない',
				next: "SELECT * FROM items; で名前を確かめ、'メロンパン' と書き直す",
				match: 'changes: 0'
			},
			{
				when: '列の名前を打ち違えた',
				why: 'その名前の列は items に無い',
				next: 'SET stock = 20 と書く',
				match: 'no such column'
			}
		]
	},
	check: [
		{ ask: '1 行だけ変える', how: 'WHERE で 1 行に当たる条件を書き、changes: 1 を見る' },
		{ ask: 'WHERE を忘れた UPDATE', how: '全ての行が変わる（changes: 8）' },
		{ ask: '変える前にすること', how: '同じ WHERE で SELECT して、当たる行を見る' }
	]
};
