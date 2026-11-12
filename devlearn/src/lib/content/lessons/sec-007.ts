// sec-007 CSRF と Cookie（fix。仕組み cookie）。
// 場面：店の会員の頁（shop.example.com）で、ポイントを人に送れる。hanako は入ったまま、罠のサイト（trap.example.net）を開く。
// SameSite の振る舞いは、今の主なブラウザの既定（RFC 6265bis の草案に沿う物）を自分の言葉でまとめた。経過時刻 t は hanako が入った時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const HANA = 'hanako のブラウザ';
const SHOP = '店 shop.example.com';
const TRAP = '罠 trap.example.net';

export const sec007: Lesson = {
	id: 'sec-007',
	field: 'sec',
	level: 2,
	title: 'CSRF と Cookie',
	goal: 'Cookie の属性で、他のサイトからの勝手な要求を防ぐことができる',
	prereq: ['sec-006'],
	related: ['net-008'],
	next: [],
	explain: [
		{
			n: 1,
			title: '入ったまま',
			lead: '入った印は Cookie に入り、店への要求に毎回付く',
			body: [
				'hanako が店に入ると、店は Set-Cookie: session=7f3a を返す。',
				'ブラウザはこの Cookie を覚え、shop.example.com への要求に毎回付ける。',
				'店は session=7f3a を見て「hanako からの要求だ」と判断する。'
			],
			facts: [
				{ k: '店が返した', v: 'Set-Cookie: session=7f3a; SameSite=None; Secure' },
				{ k: '付く先', v: 'shop.example.com への全ての要求' }
			],
			scene: [
				{ op: 'appear', id: 'hana', label: HANA, sub: '入ったまま', at: [0, 1] },
				{ op: 'appear', id: 'shop', label: SHOP, sub: 'ポイント送り', at: [3, 1] },
				{ op: 'move', from: 'shop', to: 'hana', payload: 'session=7f3a', kind: 'cookie' }
			],
			log: { t: '0s', from: SHOP, to: HANA, kind: 'cookie', info: 'session=7f3a を覚えた' }
		},
		{
			n: 2,
			title: '別のサイトの罠',
			lead: '罠の頁に、店へ送る隠れたフォームがある',
			body: [
				'hanako は入ったまま、別のタブで trap.example.net を開く。',
				'罠の頁には、店の /send に「500 ポイントを evil に送る」と POST するフォームが隠れている。',
				'頁を開いた途端に、フォームが自動で送られる。'
			],
			facts: [
				{ k: '罠の頁', v: 'trap.example.net' },
				{ k: '送り先', v: 'POST https://shop.example.com/send' },
				{ k: '中身', v: 'to=evil&points=500' }
			],
			scene: [
				{ op: 'appear', id: 'trap', label: TRAP, sub: '隠れたフォーム', at: [1, 0] },
				{ op: 'move', from: 'trap', to: 'hana', payload: '自動で送るフォーム', kind: 'trap' }
			],
			log: { t: '60s', from: TRAP, to: HANA, kind: 'trap', info: '隠れたフォームが読み込まれた' }
		},
		{
			n: 3,
			title: 'Cookie が付いて送られる',
			lead: '送り元が罠の頁でも、店宛てには店の Cookie が付く',
			body: [
				'ブラウザは POST /send を店に送り、宛先が店なので session=7f3a を付ける。',
				'SameSite=None は「どのサイトから始まった要求にも付ける」の意味だ。',
				'店から見ると、hanako 本人の要求と見分けがつかない。'
			],
			facts: [
				{ k: '要求', v: 'POST /send to=evil&points=500' },
				{ k: '付いた Cookie', v: 'session=7f3a' },
				{ k: 'SameSite', v: 'None（全てに付ける）' }
			],
			scene: [
				{
					op: 'move',
					from: 'hana',
					to: 'shop',
					payload: 'POST /send + session=7f3a',
					kind: 'csrf'
				},
				{ op: 'change', id: 'hana', k: '送った物', v: 'POST /send' }
			],
			log: {
				t: '61s',
				from: HANA,
				to: SHOP,
				kind: 'csrf',
				info: '罠から始まった POST に Cookie が付いた'
			}
		},
		{
			n: 4,
			title: '送金が通る',
			lead: '店は hanako の頼みとして受け付けてしまう',
			body: [
				'店は session=7f3a を見て、hanako の 500 ポイントを evil に送る。',
				'hanako は何も押していない。罠の頁を開いただけだ。',
				'これを CSRF（他のサイトから利用者になりすまして要求を送らせる攻撃）と呼ぶ。'
			],
			facts: [
				{ k: '店の判断', v: 'hanako の頼み' },
				{ k: '動いたポイント', v: '500（hanako → evil）' }
			],
			scene: [
				{ op: 'change', id: 'shop', k: 'hanako のポイント', v: '1200 → 700' },
				{ op: 'change', id: 'shop', k: '受け付け', v: '通った' }
			],
			log: { t: '61s', from: SHOP, to: SHOP, kind: 'csrf', info: '500 ポイントが evil に送られた' }
		},
		{
			n: 5,
			title: 'SameSite で止める',
			lead: 'Lax なら、他のサイトから始まった POST に Cookie を付けない',
			body: [
				'Cookie を Set-Cookie: session=7f3a; SameSite=Lax; Secure に直す。',
				'Lax は、他のサイトからの要求には付けない。ただしリンクで頁を開く GET には付ける。',
				'Strict はリンクで来た時にも付けず、hanako が入っていない扱いになる。'
			],
			facts: [
				{ k: '直した Cookie', v: 'SameSite=Lax; Secure' },
				{ k: '罠からの POST', v: 'Cookie が付かない → 止まる' },
				{ k: 'リンクで開く GET', v: 'Lax は付く・Strict は付かない' }
			],
			scene: [
				{ op: 'change', id: 'hana', k: 'Cookie', v: 'SameSite=Lax' },
				{
					op: 'move',
					from: 'hana',
					to: 'shop',
					payload: 'POST /send（Cookie なし）',
					kind: 'blocked'
				},
				{ op: 'change', id: 'shop', k: '受け付け', v: '止まった' }
			],
			log: {
				t: '120s',
				from: HANA,
				to: SHOP,
				kind: 'blocked',
				info: 'Lax なので Cookie が付かず止まった'
			},
			why: 'Cookie が付くかを要求の始まった頁で分ければ、罠の頁は店の印を借りられなくなる'
		},
		{
			n: 6,
			title: '確かめの値',
			lead: '送るフォームに、店だけが知る値を入れて確かめる',
			body: [
				'店は送金のフォームに、毎回変わる確かめの値（例 csrf=9c1e）を入れて渡す。',
				'受け付けでは、値が合わない POST を断る。罠の頁はこの値を知らない。',
				'SameSite と合わせて二重に守ると、古いブラウザでも止まる。'
			],
			facts: [
				{ k: '確かめの値', v: 'csrf=9c1e（フォームごと）' },
				{ k: '罠からの POST', v: '値が無い → 断る' }
			],
			scene: [
				{ op: 'change', id: 'shop', k: '確かめの値', v: '見る' },
				{ op: 'move', from: 'trap', to: 'shop', payload: '値の無い POST', kind: 'blocked' }
			],
			log: { t: '180s', from: SHOP, to: TRAP, kind: 'blocked', info: '確かめの値が無いので断った' }
		}
	],
	example: {
		intro: '4 つの要求に、直す前と後で Cookie が付くか',
		lines: [
			'要求                                     None; Secure   Lax; Secure   Strict; Secure',
			'店の画面から POST /send（同じサイト）    付く           付く          付く',
			'罠の頁から POST /send（他のサイト）      付く           付かない      付かない',
			'罠の頁の画像が GET /send（他のサイト）   付く           付かない      付かない',
			'他のサイトのリンクで店の頁を開く（GET）  付く           付く          付かない'
		]
	},
	practice: {
		goal: '入ったままの客が罠の頁を開いても、ポイントが勝手に送られないように直す。リンクで来た客は入ったままにする',
		form: 'fix',
		setup: {
			engine: 'cookie',
			lines: [
				{ id: 'c', text: 'Set-Cookie: session=7f3a; SameSite=None; Secure' },
				{ id: 't', text: '確かめの値：見ない' }
			],
			options: [
				{ line: 'c', id: 'lax', text: 'Set-Cookie: session=7f3a; SameSite=Lax; Secure' },
				{ line: 'c', id: 'strict', text: 'Set-Cookie: session=7f3a; SameSite=Strict; Secure' },
				{ line: 'c', id: 'nosecure', text: 'Set-Cookie: session=7f3a; SameSite=None' },
				{ line: 't', id: 'look', text: '確かめの値：見る' }
			],
			cases: [
				{
					id: 'shop',
					name: '店の画面から送る（POST・値あり）',
					input: { site: 'same', method: 'POST', top: 'yes', token: 'yes', op: 'send' }
				},
				{
					id: 'trap',
					name: '罠の頁のフォームから送る（POST）',
					input: { site: 'other', method: 'POST', top: 'yes', token: 'no', op: 'send' }
				},
				{
					id: 'img',
					name: '罠の頁の画像が GET /send を呼ぶ',
					input: { site: 'other', method: 'GET', top: 'no', token: 'no', op: 'send' }
				},
				{
					id: 'link',
					name: '他のサイトのリンクで店の頁を開く（GET）',
					input: { site: 'other', method: 'GET', top: 'yes', token: 'no', op: 'view' }
				}
			]
		},
		success: { expect: { shop: 'pass', trap: 'stop', img: 'stop', link: 'pass' } },
		mistakes: [
			{
				when: 'SameSite=Strict にした',
				why: '罠は止まるが、リンクで来た客にも Cookie が付かず、入っていない扱いになる',
				next: 'リンクの GET には付ける SameSite=Lax にする',
				match: 'c:strict'
			},
			{
				when: 'Secure を外した',
				why: 'SameSite=None の Cookie は Secure が無いとブラウザが受け取らない。店の画面からも送れなくなる',
				next: 'Secure は残し、SameSite を Lax にする',
				match: 'case:shop:stop'
			},
			{
				when: 'どちらの行も直さなかった',
				why: 'SameSite=None で罠の POST にも Cookie が付き、確かめの値も見ないので、送金が通る',
				next: 'Cookie を SameSite=Lax にするか、確かめの値を見るようにする',
				match: 'case:trap:pass'
			}
		]
	},
	check: [
		{ ask: '罠が通る理由', how: '他のサイトから始まった POST にも Cookie が付く（SameSite=None）' },
		{ ask: 'Lax と Strict の違い', how: 'リンクで開く GET に、Lax は付け、Strict は付けない' },
		{ ask: 'もう一つの守り', how: 'フォームの確かめの値を受け付けで確かめる' }
	]
};
