// sec-010 最小権限（fix。仕組み policy）。
// 場面：毎朝 6 時に売上を集計して日報を書く係のプログラム report-bot に、店のファイル置き場の鍵を 1 本渡している。
// 方針の 1 行は「allow|deny 操作 対象」。止める行が 1 つでも当たれば止め、無ければ許す行が当たれば許し、どれにも当たらなければ止める。
// これは多くの権限の仕組みに共通する当て方を取った物で、特定の製品の書式ではない。経過時刻 t は見直しを始めた時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const BOT = 'report-bot';
const KEY = 'report-bot の鍵';

export const sec010: Lesson = {
	id: 'sec-010',
	field: 'sec',
	level: 3,
	title: '最小権限',
	goal: '要る権限だけを渡すように、権限の設定を直すことができる',
	prereq: ['sec-001', 'lnx-004'],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '全権を渡す危うさ',
			lead: '何でもできる鍵は、漏れた時に何でもされる',
			body: [
				'report-bot の方針は allow * * の 1 行で、全ての操作を全ての物に許している。',
				'作った時は「とりあえず動けばよい」と全権にした。',
				'この鍵が漏れると、売上も顧客の名簿も読まれ、消される。'
			],
			facts: [
				{ k: '今の方針', v: 'allow * *' },
				{ k: '許している操作', v: '全て（read・write・delete …）' }
			],
			scene: [
				{ op: 'appear', id: 'bot', label: BOT, sub: '毎朝 6 時', at: [0, 1] },
				{ op: 'appear', id: 'key', label: KEY, sub: 'allow * *', at: [1, 1] }
			],
			log: { t: '0m', from: KEY, to: BOT, kind: 'policy', info: '全ての操作を許している' }
		},
		{
			n: 2,
			title: '要る操作を数える',
			lead: '係が実際に何をするかを、記録から書き出す',
			body: [
				'report-bot の 30 日分の記録を見ると、操作は 2 種類だけだった。',
				'/data/sales/ の売上を読む read と、/reports/daily/ に日報を書く write だ。',
				'delete は 1 回も無く、/data/customers/ には触れていない。'
			],
			facts: [
				{ k: '30 日の操作', v: 'read 30 回・write 30 回' },
				{ k: 'read の対象', v: '/data/sales/*' },
				{ k: 'write の対象', v: '/reports/daily/*' }
			],
			scene: [
				{ op: 'appear', id: 'sales', label: '/data/sales/', sub: '売上', at: [3, 0] },
				{ op: 'appear', id: 'daily', label: '/reports/daily/', sub: '日報', at: [3, 2] },
				{ op: 'appear', id: 'cust', label: '/data/customers/', sub: '顧客の名簿', at: [3, 1] }
			],
			log: { t: '5m', from: BOT, to: KEY, kind: 'audit', info: '要るのは read と write の 2 つ' }
		},
		{
			n: 3,
			title: '読みだけ許す',
			lead: '売上は、読むことだけを、売上の場所にだけ許す',
			body: [
				'allow * * を allow read /data/sales/* に替える。',
				'* で終わる対象は、その場所の下の全てに当たる。',
				'これで /data/customers/list.csv を読もうとしても、どの許す行にも当たらず止まる。'
			],
			facts: [
				{ k: '直した行', v: 'allow read /data/sales/*' },
				{ k: 'read /data/sales/2026-11.csv', v: '許す' },
				{ k: 'read /data/customers/list.csv', v: '止める' }
			],
			scene: [
				{ op: 'change', id: 'key', k: '1 行目', v: 'allow read /data/sales/*' },
				{ op: 'move', from: 'bot', to: 'sales', payload: 'read', kind: 'allow' },
				{ op: 'move', from: 'bot', to: 'cust', payload: 'read', kind: 'deny' }
			],
			log: {
				t: '10m',
				from: BOT,
				to: '/data/customers/',
				kind: 'deny',
				info: '名簿を読む操作が止まった'
			}
		},
		{
			n: 4,
			title: '書きを許す範囲',
			lead: '書くことは、日報の場所にだけ許す',
			body: [
				'2 行目に allow write /reports/daily/* を置く。',
				'/reports/* と広く許すと、月報 /reports/monthly/ まで書き換えられる。',
				'場所は、要る所まで細かく書く。'
			],
			facts: [
				{ k: '2 行目', v: 'allow write /reports/daily/*' },
				{ k: 'write /reports/daily/2026-11-13.txt', v: '許す' },
				{ k: 'write /reports/monthly/2026-10.txt', v: '止める' }
			],
			scene: [
				{ op: 'change', id: 'key', k: '2 行目', v: 'allow write /reports/daily/*' },
				{ op: 'move', from: 'bot', to: 'daily', payload: 'write', kind: 'allow' }
			],
			log: {
				t: '15m',
				from: BOT,
				to: '/reports/daily/',
				kind: 'allow',
				info: '日報の場所にだけ書ける'
			}
		},
		{
			n: 5,
			title: '試して止まる',
			lead: '要らない操作が止まることを、1 つずつ試して確かめる',
			body: [
				'delete /data/sales/2026-11.csv を試すと、許す行が無いので止まる。',
				'deny delete * の行を足すと、ほかの行で誤って許しても delete は必ず止まる。',
				'止める行は、許す行より強い。1 つでも当たれば止める。'
			],
			facts: [
				{ k: 'delete /data/sales/2026-11.csv', v: '止める' },
				{ k: '3 行目', v: 'deny delete *' },
				{ k: '強さ', v: 'deny が allow に勝つ' }
			],
			scene: [
				{ op: 'change', id: 'key', k: '3 行目', v: 'deny delete *' },
				{ op: 'move', from: 'bot', to: 'sales', payload: 'delete', kind: 'deny' }
			],
			log: { t: '20m', from: BOT, to: '/data/sales/', kind: 'deny', info: 'delete は止まった' },
			why: '後から誰かが広い許す行を足しても、止める行が勝つので、消す操作だけは守られ続ける'
		},
		{
			n: 6,
			title: '漏れた時の被害',
			lead: '鍵が漏れても、できるのは売上を読むことと日報を書くことだけ',
			body: [
				'直す前に漏れると、全ての物を読まれ、書き換えられ、消された。',
				'直した後は、売上を読み、日報を書くことしかできない。顧客の名簿は守られる。',
				'これを最小権限（要る分だけを渡す決まり）と呼ぶ。'
			],
			facts: [
				{ k: '直す前に漏れたら', v: '全てを読む・書く・消す' },
				{ k: '直した後に漏れたら', v: '売上を読む・日報を書く だけ' }
			],
			scene: [
				{ op: 'appear', id: 'thief', label: '鍵を盗んだ者', sub: 'report-bot の鍵', at: [1, 0] },
				{ op: 'move', from: 'thief', to: 'cust', payload: 'read', kind: 'deny' },
				{ op: 'change', id: 'cust', k: '守られた', v: 'はい' }
			],
			log: {
				t: '25m',
				from: '鍵を盗んだ者',
				to: '/data/customers/',
				kind: 'deny',
				info: '漏れても名簿は読めない'
			}
		}
	],
	example: {
		intro: '直す前と後の方針で、5 つの操作を試した結果',
		lines: [
			'直す前  allow * *',
			'直した後 allow read /data/sales/* / allow write /reports/daily/* / deny delete *',
			'',
			'操作                                       前      後',
			'read   /data/sales/2026-11.csv             許す    許す',
			'write  /reports/daily/2026-11-13.txt       許す    許す',
			'read   /data/customers/list.csv            許す    止める',
			'delete /data/sales/2026-11.csv             許す    止める',
			'write  /reports/monthly/2026-10.txt        許す    止める'
		]
	},
	practice: {
		goal: 'report-bot の方針を直し、売上を読むことと日報を書くことだけを許す',
		form: 'fix',
		setup: {
			engine: 'policy',
			lines: [
				{ id: 'p1', text: 'allow * *' },
				{ id: 'p2', text: 'allow read /data/*' },
				{ id: 'p3', text: 'allow write /reports/*' }
			],
			options: [
				{ line: 'p1', id: 'sales', text: 'allow read /data/sales/*' },
				{ line: 'p1', id: 'denyall', text: 'deny * *' },
				{ line: 'p1', id: 'readall', text: 'allow read *' },
				{ line: 'p2', id: 'sales', text: 'allow read /data/sales/*' },
				{ line: 'p2', id: 'daily', text: 'allow write /reports/daily/*' },
				{ line: 'p3', id: 'daily', text: 'allow write /reports/daily/*' },
				{ line: 'p3', id: 'nodelete', text: 'deny delete *' }
			],
			cases: [
				{
					id: 'r1',
					name: '売上を読む read /data/sales/2026-11.csv',
					input: { action: 'read', target: '/data/sales/2026-11.csv' }
				},
				{
					id: 'w1',
					name: '日報を書く write /reports/daily/2026-11-13.txt',
					input: { action: 'write', target: '/reports/daily/2026-11-13.txt' }
				},
				{
					id: 'r2',
					name: '名簿を読む read /data/customers/list.csv',
					input: { action: 'read', target: '/data/customers/list.csv' }
				},
				{
					id: 'd1',
					name: '売上を消す delete /data/sales/2026-11.csv',
					input: { action: 'delete', target: '/data/sales/2026-11.csv' }
				},
				{
					id: 'w2',
					name: '月報を書く write /reports/monthly/2026-10.txt',
					input: { action: 'write', target: '/reports/monthly/2026-10.txt' }
				}
			]
		},
		success: { expect: { r1: 'allow', w1: 'allow', r2: 'deny', d1: 'deny', w2: 'deny' } },
		mistakes: [
			{
				when: '1 行目を deny * * にした',
				why: '止める行は許す行に勝つ。全てに当たる deny * * があると、要る操作まで止まる',
				next: '1 行目は allow read /data/sales/* にする',
				match: 'p1:denyall'
			},
			{
				when: 'allow * * を残した',
				why: '全てを許す行が 1 つでもあると、ほかの行をどう直しても、名簿を読むことも消すこともできる',
				next: '1 行目を allow read /data/sales/* に替える',
				match: 'case:d1:allow'
			},
			{
				when: 'read を /data/* や * に広く許した',
				why: '売上の場所だけでなく、顧客の名簿まで読める',
				next: 'read は /data/sales/* だけにする',
				match: 'case:r2:allow'
			},
			{
				when: 'write を /reports/* に広く許したままにした',
				why: '日報だけでなく、月報まで書き換えられる',
				next: 'write は /reports/daily/* だけにする',
				match: 'case:w2:allow'
			}
		]
	},
	check: [
		{ ask: '要る操作', how: 'read /data/sales/* と write /reports/daily/* の 2 つ' },
		{ ask: '止める行の強さ', how: '1 つでも当たれば、許す行があっても止める' },
		{ ask: '漏れた時', how: '売上を読み、日報を書くことしかできない' }
	]
};
