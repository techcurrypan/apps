// db-005 表をつなぐ（sql 本物。sql.js の SQLite）。
// 結果の表は全て、実戦の道具（src/lib/tools/sql/run.ts）で打って得た物。solutions.test.ts が例を打ち直して一字ずつ比べる。
// 場面：売れた記録 sales には商品の番号 item_id しか無い。商品の表 items（src/lib/content/data/bakery.ts）とつないで名前を出す。
// 経過時刻 t は表を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';
import { ITEMS, SALES } from '../data/bakery.ts';

const S = '表 sales';
const I = '表 items';
const RES = '結果';

export const db005: Lesson = {
	id: 'db-005',
	field: 'db',
	level: 2,
	title: '表をつなぐ',
	goal: 'JOIN で 2 つの表を、対応する行どうしでつなぐことができる',
	prereq: ['db-004'],
	related: [],
	next: ['db-008'],
	explain: [
		{
			n: 1,
			title: '2 つの表',
			lead: '売れた記録には番号だけ、名前は商品の表にある',
			body: [
				'sales の 1 行は (7, 11-11, 1, 5)。item_id 1 の商品が 5 個売れた、の意味だ。',
				'item_id 1 が何のパンかは、items の id 1 の行を見ないと分からない。',
				'名前を sales に毎回書かないのは、名前を変えた時に 1 か所で済ませるためだ。'
			],
			facts: [
				{ k: 'sales の行', v: 'id 7・day 11-11・item_id 1・qty 5' },
				{ k: 'items の id 1', v: 'あんパン' }
			],
			scene: [
				{ op: 'appear', id: 's', label: S, sub: '10 行', at: [0, 0] },
				{ op: 'appear', id: 'i', label: I, sub: '7 行', at: [0, 2] }
			],
			log: { t: '0s', from: S, to: I, kind: 'look', info: 'item_id 1 は items の id 1' }
		},
		{
			n: 2,
			title: '対応する列',
			lead: 'sales.item_id と items.id が、同じ商品を指す',
			body: [
				'つなぐ鍵は、sales の item_id と items の id だ。',
				'両方の表に id という列があるので、s.id・i.id のように表の名前を前に付ける。',
				'FROM sales s の s は、表に付けた短い呼び名だ。'
			],
			facts: [
				{ k: 'つなぐ条件', v: 'i.id = s.item_id' },
				{ k: '呼び名', v: 's = sales・i = items' }
			],
			scene: [
				{ op: 'change', id: 's', k: '鍵', v: 'item_id' },
				{ op: 'change', id: 'i', k: '鍵', v: 'id' }
			],
			log: { t: '10s', from: S, to: I, kind: 'key', info: 'item_id と id でつなぐ' }
		},
		{
			n: 3,
			title: 'INNER JOIN',
			lead: 'JOIN … ON 条件 は、条件が合う行どうしを横に並べる',
			body: [
				'ON i.id = s.item_id でつなぐと、sales の 10 行に商品の行が付く。',
				"WHERE s.day = '11-11' で絞ると 5 行。食パン 3・あんパン 5・コッペパン 2…と名前が出る。",
				'JOIN だけを書くと INNER JOIN の意味だ。'
			],
			facts: [
				{ k: 'つないだ行の数', v: '10' },
				{ k: '11-11 の行', v: '5（食パン 3・あんパン 5 …）' }
			],
			scene: [
				{ op: 'appear', id: 'join', label: 'JOIN', sub: 'i.id = s.item_id', at: [1, 1] },
				{ op: 'move', from: 's', to: 'join', payload: '10 行', kind: 'join' },
				{ op: 'move', from: 'i', to: 'join', payload: '7 行', kind: 'join' },
				{ op: 'appear', id: 'res', label: RES, sub: '10 行', at: [3, 1] }
			],
			log: { t: '20s', from: 'JOIN', to: RES, kind: 'join', info: '番号の合う行どうしを並べた' }
		},
		{
			n: 4,
			title: '合わない行は消える',
			lead: 'INNER JOIN は、相手の無い行を出さない',
			body: [
				'items 7 行のうち、メロンパンとチーズパンは一度も売れていない。',
				'GROUP BY i.id で売れた数を足すと、5 行しか出ず、2 つが消える。',
				'「売れなかった商品」を見たいときに、これでは見落とす。'
			],
			facts: [
				{ k: '売れていない商品', v: 'メロンパン・チーズパン' },
				{ k: 'INNER JOIN の組', v: '5 行（2 つが消える）' }
			],
			scene: [
				{ op: 'change', id: 'res', k: '行', v: '5' },
				{ op: 'change', id: 'res', k: '消えた商品', v: 'メロンパン・チーズパン' }
			],
			log: { t: '30s', from: 'JOIN', to: RES, kind: 'drop', info: '売れていない 2 つが消えた' },
			why: 'INNER JOIN は「両方にある組」だけを作る決まりなので、片方にしか無い行は組にならない'
		},
		{
			n: 5,
			title: 'LEFT JOIN',
			lead: 'LEFT JOIN は、左の表の行を全て残す',
			body: [
				'items i LEFT JOIN sales s と、items を左に置く。',
				'items の 7 行は全て残り、相手の無い行は sales の列が空になる。',
				'売れた数を足すと 7 行になり、メロンパンとチーズパンも出る。'
			],
			facts: [
				{ k: '左の表', v: 'items（7 行全て残る）' },
				{ k: '行の数', v: '7' }
			],
			scene: [
				{ op: 'change', id: 'join', k: '種類', v: 'LEFT JOIN（items が左）' },
				{ op: 'change', id: 'res', k: '行', v: '7' }
			],
			log: { t: '40s', from: 'LEFT JOIN', to: RES, kind: 'join', info: 'items の 7 行を全て残した' }
		},
		{
			n: 6,
			title: 'NULL で埋まる',
			lead: '相手の無い所には、値が無い印 NULL が入る',
			body: [
				'メロンパンの sold は NULL と出る。0 ではなく「値が無い」の印だ。',
				'NULL の行を見れば、売れていない商品が分かる。',
				'0 と出したいときは、COALESCE(SUM(s.qty), 0) と書く。'
			],
			facts: [
				{ k: 'メロンパン の sold', v: 'NULL' },
				{ k: 'チーズパン の sold', v: 'NULL' },
				{ k: '0 にする書き方', v: 'COALESCE(SUM(s.qty), 0)' }
			],
			scene: [
				{ op: 'change', id: 'res', k: 'メロンパン', v: 'NULL' },
				{ op: 'highlight', id: 'res' }
			],
			log: { t: '50s', from: 'LEFT JOIN', to: RES, kind: 'null', info: '売れていない 2 つは NULL' }
		}
	],
	example: {
		intro: '番号を名前につなぎ、INNER と LEFT の違いを見た（ブラウザの中の本物の SQLite）',
		lines: [
			"sqlite> SELECT s.day, s.item_id, i.name, s.qty FROM sales s JOIN items i ON i.id = s.item_id WHERE s.day = '11-11';",
			'+-------+---------+--------------+-----+',
			'| day   | item_id | name         | qty |',
			'+-------+---------+--------------+-----+',
			'| 11-11 |       2 | 食パン       |   3 |',
			'| 11-11 |       1 | あんパン     |   5 |',
			'| 11-11 |       6 | コッペパン   |   2 |',
			'| 11-11 |       5 | カレーパン   |   1 |',
			'| 11-11 |       3 | クリームパン |   2 |',
			'+-------+---------+--------------+-----+',
			'sqlite> SELECT i.name, SUM(s.qty) AS sold FROM items i LEFT JOIN sales s ON s.item_id = i.id GROUP BY i.id;',
			'+--------------+------+',
			'| name         | sold |',
			'+--------------+------+',
			'| あんパン     |   11 |',
			'| 食パン       |    5 |',
			'| クリームパン |    3 |',
			'| メロンパン   | NULL |',
			'| カレーパン   |    4 |',
			'| コッペパン   |    2 |',
			'| チーズパン   | NULL |',
			'+--------------+------+'
		]
	},
	practice: {
		goal: '11-11 に売れた記録を、商品の名前 name と売れた数 qty で出す（sales の並びのまま）',
		tool: { name: 'sql', mode: 'real' },
		setup: { sql: `${ITEMS}\n${SALES}` },
		success: {
			output:
				'+--------------+-----+\n| name         | qty |\n+--------------+-----+\n| 食パン       |   3 |\n| あんパン     |   5 |\n| コッペパン   |   2 |\n| カレーパン   |   1 |\n| クリームパン |   2 |\n+--------------+-----+\n'
		},
		mistakes: [
			{
				when: '両方の表にある列を、表の名前を付けずに書いた',
				why: 'id は sales にも items にもある。どちらの id かが決まらない',
				next: 's.item_id・i.id のように、表の呼び名を前に付ける',
				match: 'ambiguous column name'
			},
			{
				when: 'ON を書かなかった、または LEFT JOIN で items を左にした',
				why: '売れていないメロンパンまで出た。全ての組み合わせか、items の全ての行が出ている',
				next: 'FROM sales s JOIN items i ON i.id = s.item_id と書き、WHERE で 11-11 に絞る',
				match: '| メロンパン'
			},
			{
				when: '日付で絞らなかった',
				why: '11-10 の売れた記録も混ざった',
				next: "WHERE s.day = '11-11' を足す",
				match: '|   4 |'
			}
		]
	},
	check: [
		{ ask: 'つなぐ条件', how: 'ON i.id = s.item_id' },
		{ ask: 'INNER JOIN で消える行', how: '相手の無い行（売れていないメロンパン・チーズパン）' },
		{ ask: 'LEFT JOIN の空き', how: '相手の無い列は NULL' }
	]
};
