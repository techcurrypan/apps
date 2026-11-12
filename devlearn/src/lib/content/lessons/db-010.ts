// db-010 トランザクション（sql 本物。sql.js の SQLite）。
// 結果は全て、実戦の道具（src/lib/tools/sql/run.ts）で打って得た物。solutions.test.ts が例を打ち直して一字ずつ比べる。
// 場面：パン屋の会員のポイントの表 accounts。hanako（500）が taro（100）に 300 ポイントを譲る。経過時刻 t は表を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

export const ACCOUNTS =
	'CREATE TABLE accounts (name TEXT PRIMARY KEY, points INTEGER NOT NULL CHECK (points >= 0));\n' +
	"INSERT INTO accounts VALUES ('hanako', 500), ('taro', 100);";

const A = '表 accounts';
const ME = '店の係';

export const db010: Lesson = {
	id: 'db-010',
	field: 'db',
	level: 3,
	title: 'トランザクション',
	goal: 'トランザクションで、途中で失敗した変更を取り消すことができる',
	prereq: ['db-006'],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '振り替え',
			lead: '振り替えは、引くと足すの 2 つの文でできている',
			body: [
				'hanako 500・taro 100 で、合計は 600 ポイントだ。',
				'hanako から 300 を引き、taro に 300 を足す。2 つの UPDATE が要る。',
				'2 つとも終わって、合計は 600 のままのはずだ。'
			],
			facts: [
				{ k: 'hanako', v: '500' },
				{ k: 'taro', v: '100' },
				{ k: '合計', v: '600' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: 'sqlite>', at: [0, 1] },
				{ op: 'appear', id: 'acc', label: A, sub: '合計 600', at: [3, 1] }
			],
			log: { t: '0s', from: ME, to: A, kind: 'plan', info: '300 を振り替える。合計は 600' }
		},
		{
			n: 2,
			title: '引く',
			lead: '1 つ目の文で、hanako から 300 を引く',
			body: [
				'hanako の points を points - 300 に UPDATE すると、changes: 1。',
				'hanako は 200 になった。',
				'この時点では、300 ポイントがどこにも無い。'
			],
			facts: [
				{ k: '答え', v: 'changes: 1' },
				{ k: 'hanako', v: '500 → 200' },
				{ k: '合計', v: '300（途中）' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'acc', payload: 'hanako − 300', kind: 'update' },
				{ op: 'change', id: 'acc', k: 'hanako', v: '200' }
			],
			log: { t: '10s', from: ME, to: A, kind: 'update', info: 'hanako から 300 を引いた' }
		},
		{
			n: 3,
			title: '足す前に失敗',
			lead: '2 つ目の文で名前を打ち誤ると、どこにも足されない',
			body: [
				"WHERE name = 'taroo' と打ち誤ると、changes: 0。合う行が無く、誰にも足されない。",
				'機械が止まったり、網が切れたりしても、同じく 2 つ目が届かない。',
				'1 つ目の引いた結果は、もう表に書き込まれている。'
			],
			facts: [
				{ k: '打った条件', v: "name = 'taroo'" },
				{ k: '答え', v: 'changes: 0' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'acc', payload: 'taroo + 300', kind: 'fail' },
				{ op: 'change', id: 'acc', k: 'taro', v: '100（足されない）' }
			],
			log: { t: '20s', from: ME, to: A, kind: 'fail', info: 'taroo は無い。changes: 0' }
		},
		{
			n: 4,
			title: '食い違う',
			lead: '引いた分だけが残り、合計が減る',
			body: [
				'SELECT * FROM accounts は hanako 200・taro 100 で、合計は 300 だ。',
				'300 ポイントが消え、手で直すには何が起きたかを全て調べる要がある。',
				'2 つの文は「両方するか、どちらもしないか」でなければならない。'
			],
			facts: [
				{ k: 'hanako', v: '200' },
				{ k: 'taro', v: '100' },
				{ k: '合計', v: '600 → 300' }
			],
			scene: [
				{ op: 'change', id: 'acc', k: '合計', v: '300（食い違い）' },
				{ op: 'highlight', id: 'acc' }
			],
			log: { t: '30s', from: A, to: ME, kind: 'conflict', info: '合計が 300 に減った' }
		},
		{
			n: 5,
			title: 'BEGIN と ROLLBACK',
			lead: 'BEGIN から後の変更は、ROLLBACK で全て取り消せる',
			body: [
				'BEGIN; と打つと、トランザクション（まとめて 1 つにする変更）が始まる。',
				'引いた後に失敗に気づいたら、ROLLBACK; と打つ。',
				'SELECT * FROM accounts は hanako 500・taro 100 に戻る。'
			],
			facts: [
				{ k: '始める', v: 'BEGIN;' },
				{ k: '取り消す', v: 'ROLLBACK;' },
				{ k: '戻った値', v: 'hanako 500・taro 100' }
			],
			scene: [
				{ op: 'appear', id: 'tx', label: 'トランザクション', sub: 'BEGIN', at: [1, 2] },
				{ op: 'move', from: 'tx', to: 'acc', payload: 'ROLLBACK', kind: 'rollback' },
				{ op: 'change', id: 'acc', k: '合計', v: '600（戻った）' }
			],
			log: {
				t: '40s',
				from: 'トランザクション',
				to: A,
				kind: 'rollback',
				info: 'ROLLBACK で 500 と 100 に戻した'
			},
			why: 'BEGIN の後の変更は、確定するまで仮の物として持つので、仮の分を捨てれば元の状態が残る'
		},
		{
			n: 6,
			title: 'COMMIT で確定',
			lead: '両方の文が成功したら、COMMIT で確定する',
			body: [
				'BEGIN; の後、引く・足すの 2 つが共に changes: 1 なのを見る。',
				'COMMIT; と打つと、2 つの変更が同時に確定し、hanako 200・taro 400 になる。',
				'確定の後の ROLLBACK は、no transaction is active と返る。'
			],
			facts: [
				{ k: '確定', v: 'COMMIT;' },
				{ k: '結果', v: 'hanako 200・taro 400（合計 600）' },
				{ k: '確定の後の ROLLBACK', v: 'Error: cannot rollback - no transaction is active' }
			],
			scene: [
				{ op: 'move', from: 'tx', to: 'acc', payload: 'COMMIT', kind: 'commit' },
				{ op: 'change', id: 'acc', k: 'taro', v: '400' },
				{ op: 'change', id: 'acc', k: '合計', v: '600' }
			],
			log: {
				t: '50s',
				from: 'トランザクション',
				to: A,
				kind: 'commit',
				info: '2 つを確定。合計は 600 のまま'
			}
		}
	],
	example: {
		intro: '途中で失敗して取り消し、やり直して確定した（ブラウザの中の本物の SQLite）',
		lines: [
			'sqlite> BEGIN;',
			"sqlite> UPDATE accounts SET points = points - 300 WHERE name = 'hanako';",
			'changes: 1',
			"sqlite> UPDATE accounts SET points = points + 300 WHERE name = 'taroo';",
			'changes: 0',
			'sqlite> ROLLBACK;',
			'sqlite> SELECT * FROM accounts;',
			'+--------+--------+',
			'| name   | points |',
			'+--------+--------+',
			'| hanako |    500 |',
			'| taro   |    100 |',
			'+--------+--------+',
			'sqlite> BEGIN;',
			"sqlite> UPDATE accounts SET points = points - 300 WHERE name = 'hanako';",
			'changes: 1',
			"sqlite> UPDATE accounts SET points = points + 300 WHERE name = 'taro';",
			'changes: 1',
			'sqlite> COMMIT;',
			'sqlite> SELECT * FROM accounts;',
			'+--------+--------+',
			'| name   | points |',
			'+--------+--------+',
			'| hanako |    200 |',
			'| taro   |    400 |',
			'+--------+--------+'
		]
	},
	practice: {
		goal: 'BEGIN と COMMIT の間で、hanako から taro に 300 ポイントを振り替え、SELECT * FROM accounts; で確かめる',
		tool: { name: 'sql', mode: 'real' },
		setup: { sql: ACCOUNTS },
		success: {
			output:
				'+--------+--------+\n| name   | points |\n+--------+--------+\n| hanako |    200 |\n| taro   |    400 |\n+--------+--------+\n'
		},
		mistakes: [
			{
				when: '名前を打ち誤り、changes: 0 になった',
				why: 'その文はどの行も変えていない。このまま COMMIT すると、引いた分だけが残る',
				next: 'ROLLBACK; で取り消し、BEGIN; からやり直す',
				match: 'changes: 0'
			},
			{
				when: 'BEGIN を打たずに COMMIT か ROLLBACK を打った',
				why: 'トランザクションが始まっていない。それまでの文は 1 文ずつ確定している',
				next: '記録から 0 に戻し、BEGIN; から打つ',
				match: 'no transaction is active'
			},
			{
				when: '引く数を誤り、ポイントが負になった',
				why: 'points >= 0 の決まりで止まった',
				next: '引く数を 300 にする',
				match: 'CHECK constraint failed'
			}
		]
	},
	check: [
		{ ask: '途中で失敗すると', how: '引いた分だけが残り、合計が 600 から 300 に減る' },
		{ ask: '取り消す', how: 'BEGIN の後に ROLLBACK' },
		{ ask: '確定する', how: '両方 changes: 1 を見て COMMIT' }
	]
};
