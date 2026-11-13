// cld-008 クラウドの権限（fix・policy）。
// 場面：パン屋の頁を配る係（deploy-bot）に、作った時に何でもできる権限を付けていた。要る操作だけに絞る。
// 方針の書き方は sec-010 と同じ作り物（allow|deny 操作 対象）。特定の事業者の書式は写さない（D-10）。経過時刻 t は見直しを始めた時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const BOT = 'deploy-bot';
const POL = '方針';

export const cld008: Lesson = {
	id: 'cld-008',
	field: 'cld',
	level: 3,
	title: 'クラウドの権限',
	goal: '権限の方針を読み、要る操作だけを許すように直すことができる',
	prereq: ['sec-010', 'cld-004'],
	related: ['sec-008'],
	next: ['cld-009'],
	explain: [
		{
			n: 1,
			title: '方針の書き方',
			lead: '方針は、誰に・どの操作を・どの対象に許すかを行で書く',
			body: [
				'1 行は allow か deny、操作、対象の 3 つだ。* は「全て」、末尾の * は「ここから始まる全て」。',
				'方針は、人にも、自動で動く係（deploy-bot）にも付ける。'
			],
			facts: [
				{ k: '行の形', v: 'allow|deny 操作 対象' },
				{ k: '付ける相手', v: 'deploy-bot（自動で配る係）' }
			],
			scene: [
				{ op: 'appear', id: 'bot', label: BOT, sub: '自動で配る係', at: [0, 1] },
				{ op: 'appear', id: 'pol', label: POL, sub: 'allow * *', at: [3, 1] },
				{ op: 'move', from: 'pol', to: 'bot', payload: '付ける', kind: 'attach' }
			],
			log: { t: '0m', from: POL, to: BOT, kind: 'attach', info: '何でも許す方針が付いていた' }
		},
		{
			n: 2,
			title: '許す操作',
			lead: '係がする仕事から、要る操作を書き出す',
			body: [
				'deploy-bot の仕事は、頁のファイルを倉庫の site/ に置き、web の機械を再起動することだ。',
				'要る操作は put と restart の 2 つだけだ。'
			],
			facts: [
				{ k: '仕事 1', v: '頁を置く（put）' },
				{ k: '仕事 2', v: 'web を再起動（restart）' }
			],
			scene: [
				{ op: 'appear', id: 'site', label: 'storage:site/*', sub: '頁の置き場', at: [6, 0] },
				{ op: 'appear', id: 'web', label: 'compute:web-*', sub: '頁の機械', at: [6, 2] }
			],
			log: {
				t: '2m',
				from: BOT,
				to: 'storage:site/*',
				kind: 'need',
				info: '要る操作は put と restart'
			}
		},
		{
			n: 3,
			title: '対象',
			lead: '操作ごとに、触ってよい対象を絞る',
			body: [
				'put は storage:site/* だけ、restart は compute:web-* だけに許す。',
				'注文の控え storage:orders/* や、db の機械 compute:db-1 は対象にしない。'
			],
			facts: [
				{ k: 'put の対象', v: 'storage:site/*' },
				{ k: 'restart の対象', v: 'compute:web-*' }
			],
			scene: [
				{ op: 'move', from: 'bot', to: 'site', payload: 'put', kind: 'allow' },
				{ op: 'move', from: 'bot', to: 'web', payload: 'restart', kind: 'allow' }
			],
			log: {
				t: '4m',
				from: BOT,
				to: 'compute:web-*',
				kind: 'allow',
				info: '対象を site/ と web-* に絞った'
			}
		},
		{
			n: 4,
			title: '全部を許す誤り',
			lead: 'allow * * は、ほかのどの行よりも広く許してしまう',
			body: [
				'allow * * が残ると、deploy-bot は鍵を読み、db を止め、控えを消せる。',
				'係の鍵が盗まれたら、盗んだ人も同じことができる。'
			],
			facts: [
				{ k: 'allow * * でできる事', v: '鍵を読む・db を止める・消す' },
				{ k: '盗まれた時', v: '盗んだ人も同じ' }
			],
			scene: [
				{ op: 'appear', id: 'sec', label: 'secrets:db-password', sub: '鍵', at: [3, 2] },
				{ op: 'move', from: 'bot', to: 'sec', payload: 'read', kind: 'leak' },
				{ op: 'highlight', id: 'sec' }
			],
			log: {
				t: '5m',
				from: BOT,
				to: 'secrets:db-password',
				kind: 'leak',
				info: '要らない鍵まで読めた'
			},
			why: '1 つの係の鍵が漏れた時の被害は、その係に許した範囲で決まる'
		},
		{
			n: 5,
			title: '絞る',
			lead: 'allow * * を消し、止めておく行と、絞った許す行を並べる',
			body: [
				'1 行目を deny delete * にし、どの対象も消せないようにした。',
				'3 行目の restart を compute:web-* に絞った。'
			],
			facts: [
				{ k: '1 行目', v: 'deny delete *' },
				{ k: '2 行目', v: 'allow put storage:site/*' },
				{ k: '3 行目', v: 'allow restart compute:web-*' }
			],
			scene: [
				{ op: 'change', id: 'pol', k: '1 行目', v: 'deny delete *' },
				{ op: 'change', id: 'pol', k: '3 行目', v: 'allow restart compute:web-*' }
			],
			log: { t: '8m', from: POL, to: BOT, kind: 'fix', info: '要る 2 つだけを許した' }
		},
		{
			n: 6,
			title: '試して止まる',
			lead: '直した後に、許す物と止める物を 1 つずつ試す',
			body: [
				'頁を置くことと web-1 の再起動は通り、鍵を読むことと db-1 の再起動は止まった。',
				'止まった時は、何を止めたかを見て、要る物なら 1 行ずつ足す。'
			],
			facts: [
				{ k: '通った', v: 'put site/・restart web-1' },
				{ k: '止まった', v: 'read 鍵・restart db-1・delete' }
			],
			scene: [
				{ op: 'move', from: 'bot', to: 'sec', payload: 'read', kind: 'deny' },
				{ op: 'change', id: 'sec', k: '結果', v: '止める' }
			],
			log: {
				t: '10m',
				from: BOT,
				to: 'secrets:db-password',
				kind: 'deny',
				info: '鍵を読むことは止まった'
			}
		}
	],
	example: {
		intro: '直した方針に、操作を 1 つずつ流した結果',
		lines: [
			'deny delete *',
			'allow put storage:site/*',
			'allow restart compute:web-*',
			'',
			'put storage:site/index.html      通す',
			'restart compute:web-1            通す',
			'read secrets:db-password         止める（許す行が無い）',
			'restart compute:db-1             止める（許す行が無い）',
			'delete storage:site/index.html   止める（deny の行）'
		]
	},
	practice: {
		goal: 'deploy-bot の方針を直し、頁を置くことと web の再起動だけを許す',
		form: 'fix',
		setup: {
			engine: 'policy',
			lines: [
				{ id: 'p1', text: 'allow * *' },
				{ id: 'p2', text: 'allow put storage:site/*' },
				{ id: 'p3', text: 'allow restart compute:*' }
			],
			options: [
				{ line: 'p1', id: 'nodelete', text: 'deny delete *' },
				{ line: 'p1', id: 'putall', text: 'allow put storage:*' },
				{ line: 'p1', id: 'readall', text: 'allow read *' },
				{ line: 'p3', id: 'web', text: 'allow restart compute:web-*' },
				{ line: 'p3', id: 'allcompute', text: 'allow * compute:*' }
			],
			cases: [
				{
					id: 'put',
					name: '頁を置く put storage:site/index.html',
					input: { action: 'put', target: 'storage:site/index.html' }
				},
				{
					id: 'rweb',
					name: 'web を再起動 restart compute:web-1',
					input: { action: 'restart', target: 'compute:web-1' }
				},
				{
					id: 'orders',
					name: '控えを置く put storage:orders/x.csv',
					input: { action: 'put', target: 'storage:orders/x.csv' }
				},
				{
					id: 'secret',
					name: '鍵を読む read secrets:db-password',
					input: { action: 'read', target: 'secrets:db-password' }
				},
				{
					id: 'rdb',
					name: 'db を再起動 restart compute:db-1',
					input: { action: 'restart', target: 'compute:db-1' }
				}
			]
		},
		success: {
			expect: { put: 'allow', rweb: 'allow', orders: 'deny', secret: 'deny', rdb: 'deny' }
		},
		mistakes: [
			{
				when: 'allow * * を残した',
				why: '全てを許す行が 1 つでもあると、鍵も読め、db も再起動できる',
				next: '1 行目を deny delete * に替える',
				match: 'case:secret:allow'
			},
			{
				when: 'put を倉庫の全てに許した',
				why: '頁の置き場 site/ だけでなく、注文の控えの置き場まで書き換えられる',
				next: '1 行目は deny delete * にし、put は 2 行目の site/ だけにする',
				match: 'p1:putall'
			},
			{
				when: 'restart を機械の全てに許した',
				why: 'web だけでなく、db の機械まで再起動できる',
				next: '3 行目を allow restart compute:web-* にする',
				match: 'case:rdb:allow'
			}
		]
	},
	check: [
		{ ask: '要る操作の見つけ方', how: '係の仕事を書き出し、操作と対象の組にする' },
		{ ask: 'allow * * の危うさ', how: '鍵が漏れた時、何でもできてしまう' },
		{ ask: '直した後', how: '許す物と止める物を 1 つずつ試す' }
	]
};
