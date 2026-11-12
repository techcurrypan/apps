// sec-001 認証と認可（段 10-0。sort の見本）。
// 場面：社内の経費の仕組み（https://keihi.example）に、営業の佐野さん（利用者 sano）と経理の利用者 keiri が入る。
// 状態の番号 401・403 は HTTP の決まり（RFC 9110）の意味のまま。経過時刻 t は始業を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const U = '利用者 sano';
const GATE = '入口（認証）';
const TABLE = '権限の表（認可）';

export const sec001: Lesson = {
	id: 'sec-001',
	field: 'sec',
	level: 1,
	title: '認証と認可',
	goal: '認証と認可の違いを、要求ごとに見分けることができる',
	prereq: [],
	related: ['lnx-011'],
	next: [],
	explain: [
		{
			n: 1,
			title: '誰かを確かめる',
			lead: '仕組みは、まず「あなたは誰か」を知る必要がある',
			body: [
				'経費の仕組みを開くと、名前と合言葉を聞かれる。',
				'認証（authentication）は、名乗った人が本人かを確かめることだ。',
				'まだ誰か分からないので、どの頁も見せない。'
			],
			facts: [
				{ k: '開いた頁', v: 'https://keihi.example/' },
				{ k: '名乗った名前', v: 'sano' },
				{ k: '今の状態', v: '誰か分からない' }
			],
			scene: [
				{ op: 'appear', id: 'u', label: U, sub: '営業', at: [0, 0] },
				{ op: 'appear', id: 'gate', label: GATE, sub: '名前と合言葉', at: [1, 0] },
				{ op: 'move', from: 'u', to: 'gate', payload: 'sano', kind: 'login' }
			],
			log: {
				t: '0m',
				from: U,
				to: GATE,
				kind: 'login',
				info: 'sano と名乗った。まだ確かめていない'
			}
		},
		{
			n: 2,
			title: '合言葉で認証',
			lead: '本人しか知らない物を出させ、合えば本人と認める',
			body: [
				'合言葉が登録の物と合ったので、sano 本人と認められた。',
				'その印として、仕組みは時間を区切った鍵（セッション）を渡す。',
				'以後の要求は、この鍵で sano からと分かる。'
			],
			facts: [
				{ k: '確かめた物', v: '合言葉' },
				{ k: '結果', v: '本人と認めた' },
				{ k: '渡した鍵の期限', v: '8 時間' }
			],
			scene: [
				{ op: 'move', from: 'gate', to: 'u', payload: 'セッションの鍵', kind: 'session' },
				{ op: 'change', id: 'u', k: '認証', v: '済み' }
			],
			log: { t: '1m', from: GATE, to: U, kind: 'authn', info: 'sano を本人と認め、鍵を渡した' }
		},
		{
			n: 3,
			title: '何をしてよいか',
			lead: '本人と分かっても、何でもしてよいわけではない',
			body: [
				'sano は経費の申請を出せるが、支払いの確定はできない。',
				'認可（authorization）は、その人にその操作を許すかを決めることだ。',
				'認証が「誰か」、認可が「何をしてよいか」に答える。'
			],
			facts: [
				{ k: '認証の問い', v: 'あなたは誰か' },
				{ k: '認可の問い', v: 'それをしてよいか' },
				{ k: 'sano の役割', v: '申請する人' }
			],
			scene: [
				{ op: 'appear', id: 'tbl', label: TABLE, sub: '役割ごとの操作', at: [2, 0] },
				{ op: 'change', id: 'u', k: '役割', v: '申請する人' }
			],
			log: { t: '3m', from: U, to: TABLE, kind: 'role', info: 'sano の役割は「申請する人」' },
			why: '本人確認と許可を分けておくと、役割が変わっても合言葉はそのまま、表だけを直せば済む'
		},
		{
			n: 4,
			title: '権限の表で認可',
			lead: '役割と操作の表を引いて、許すかを決める',
			body: [
				'sano が「申請を出す」を押すと、表の「申請する人：申請を出す」が許可なので通る。',
				'「支払いを確定」を押すと、表に許可が無いので止められる。'
			],
			facts: [
				{ k: '申請を出す', v: '許可（申請する人）' },
				{ k: '支払いを確定', v: '許可が無い（経理だけ）' },
				{ k: '引いた表の行', v: '2' }
			],
			scene: [
				{ op: 'move', from: 'u', to: 'tbl', payload: '支払いを確定', kind: 'request' },
				{ op: 'change', id: 'tbl', k: '支払いを確定', v: '経理だけ' }
			],
			log: { t: '10m', from: U, to: TABLE, kind: 'authz', info: '支払いの確定は許可が無い' }
		},
		{
			n: 5,
			title: '401 と 403',
			lead: '断られた理由が、状態の番号で分かる',
			body: [
				'合言葉が無い・違うときは 401 Unauthorized、認証ができていない、が返る。',
				'認証は済んだが許可が無いときは 403 Forbidden、禁止、が返る。',
				'401 は名乗り直せば通りうるが、403 は名乗り直しても通らない。'
			],
			facts: [
				{ k: '401 Unauthorized', v: '誰か分からない（認証の失敗）' },
				{ k: '403 Forbidden', v: '誰かは分かるが許可が無い（認可の失敗）' },
				{ k: 'sano の支払いの確定', v: '403' }
			],
			scene: [
				{ op: 'move', from: 'tbl', to: 'u', payload: '403 Forbidden', kind: 'deny' },
				{ op: 'change', id: 'u', k: '最後の返事', v: '403' }
			],
			log: { t: '10m', from: TABLE, to: U, kind: '403', info: '403 Forbidden。許可が無い' }
		},
		{
			n: 6,
			title: '両方そろって通る',
			lead: '経理の keiri は、認証も認可も通る',
			body: [
				'経理の keiri は、合言葉で認証され、役割は「経理」だ。',
				'表の「経理：支払いを確定」は許可なので、200 OK が返る。',
				'どちらか一方だけでは、支払いは確定できない。'
			],
			facts: [
				{ k: '利用者', v: 'keiri' },
				{ k: '認証', v: '済み' },
				{ k: '認可', v: '許可（経理）' },
				{ k: '返事', v: '200 OK' }
			],
			scene: [
				{ op: 'appear', id: 'k', label: '利用者 keiri', sub: '経理', at: [0, 1] },
				{ op: 'move', from: 'k', to: 'tbl', payload: '支払いを確定', kind: 'request' },
				{ op: 'change', id: 'k', k: '最後の返事', v: '200' }
			],
			log: {
				t: '15m',
				from: '利用者 keiri',
				to: TABLE,
				kind: '200',
				info: '認証と認可が通り、支払いを確定した'
			}
		}
	],
	example: {
		intro: '経費の仕組みへの 3 つの要求と、返った状態の番号',
		lines: [
			'合言葉なしで /expenses を開く      → 401 Unauthorized（認証の失敗）',
			'sano が /payments/confirm を押す   → 403 Forbidden（認可の失敗）',
			'keiri が /payments/confirm を押す  → 200 OK（両方通った）'
		]
	},
	practice: {
		goal: '6 つの出来事を、認証の話か認可の話かに振り分ける',
		form: 'sort',
		setup: {
			items: [
				{ id: 'pw', text: 'ログインの画面で合言葉を入れる' },
				{ id: 'otp', text: '携帯に届いた一度きりの番号を入れる' },
				{ id: 'view', text: '営業の人には、承認の画面が出ない' },
				{ id: 'pay', text: '経理の人だけが、支払いを確定できる' },
				{ id: 's401', text: '合言葉が違い、401 が返る' },
				{ id: 's403', text: 'ログインは済んでいるが、403 が返る' }
			],
			bins: [
				{ id: 'authn', label: '認証（誰か）' },
				{ id: 'authz', label: '認可（何をしてよいか）' }
			]
		},
		success: {
			bins: { pw: 'authn', otp: 'authn', view: 'authz', pay: 'authz', s401: 'authn', s403: 'authz' }
		},
		mistakes: [
			{
				when: '403 を認証に入れた',
				why: '403 はログインが済んだ後、許可が無いときに返る。誰かは分かっているので認可の失敗だ',
				next: '「ログインは済んでいる」の札を、認可に入れ直す',
				match: 's403:authn'
			},
			{
				when: '一度きりの番号を認可に入れた',
				why: '一度きりの番号は、本人が携帯を持っていることを確かめる物だ。本人確認なので認証だ',
				next: '「一度きりの番号」の札を、認証に入れ直す',
				match: 'otp:authz'
			},
			{
				when: '経理だけが確定できる、を認証に入れた',
				why: '経理の人も営業の人も本人と確かめた後の話だ。役割で操作を許すかなので認可だ',
				next: '「経理の人だけ」の札を、認可に入れ直す',
				match: 'pay:authn'
			}
		]
	},
	check: [
		{ ask: '認証の問い', how: '「あなたは誰か」に答える' },
		{ ask: '認可の問い', how: '「それをしてよいか」に答える' },
		{ ask: '番号の見分け', how: '401 は認証の失敗、403 は認可の失敗' }
	]
};
