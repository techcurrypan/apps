// cld-005 物を置く倉庫（pick）。
// 場面：パン屋が、品書きの写真と、客の注文の控えを、オブジェクトストレージの入れ物に置く。特定の事業者の名前は使わない（D-10）。
// 経過時刻 t は入れ物を作った時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const BUCKET = '入れ物 bakery-files';

export const cld005: Lesson = {
	id: 'cld-005',
	field: 'cld',
	level: 2,
	title: '物を置く倉庫',
	goal: 'オブジェクトストレージの置き方と公開の範囲を決めることができる',
	prereq: ['cld-002'],
	related: ['sec-010'],
	next: [],
	explain: [
		{
			n: 1,
			title: '入れ物を作る',
			lead: 'オブジェクトストレージは、ファイルを入れ物に名前で置く倉庫だ',
			body: [
				'入れ物 bakery-files を作った。中にフォルダの木は無く、名前と中身の組を置く。',
				'置いた量の分だけ払い、容量の上限を気にしなくてよい。'
			],
			facts: [
				{ k: '入れ物', v: 'bakery-files' },
				{ k: '置き方', v: '名前 → 中身' }
			],
			scene: [{ op: 'appear', id: 'bucket', label: BUCKET, sub: '空', at: [3, 1] }],
			log: { t: '0m', from: 'パン屋', to: BUCKET, kind: 'create', info: '入れ物を作った' }
		},
		{
			n: 2,
			title: '物を置く',
			lead: '名前を付けて置く。/ は名前の一部で、フォルダの代わりに使う',
			body: [
				'menu/bread.jpg と orders/2026-11-13.csv を置いた。',
				'/ で区切ると、一覧のときに前の部分で絞れる。'
			],
			facts: [
				{ k: '置いた物 1', v: 'menu/bread.jpg' },
				{ k: '置いた物 2', v: 'orders/2026-11-13.csv' }
			],
			scene: [
				{ op: 'appear', id: 'photo', label: 'menu/bread.jpg', sub: '品書きの写真', at: [1, 2] },
				{ op: 'appear', id: 'csv', label: 'orders/2026-11-13.csv', sub: '注文の控え', at: [5, 2] },
				{ op: 'change', id: 'bucket', k: '中身', v: '2 つ' }
			],
			log: { t: '2m', from: 'パン屋', to: BUCKET, kind: 'put', info: '写真と注文の控えを置いた' }
		},
		{
			n: 3,
			title: '名前で取り出す',
			lead: '置いた物は、入れ物と名前を指した URL で取り出す',
			body: [
				'URL は入れ物の住所の後に menu/bread.jpg を付けた形になる。',
				'取り出せるかどうかは、入れ物の公開の設定で決まる。'
			],
			facts: [
				{ k: '取り出す形', v: '入れ物の住所/menu/bread.jpg' },
				{ k: '決める物', v: '公開の設定' }
			],
			scene: [
				{ op: 'appear', id: 'guest', label: '客のブラウザ', sub: 'URL を開く', at: [0, 0] },
				{ op: 'move', from: 'guest', to: 'photo', payload: 'GET', kind: 'get' }
			],
			log: {
				t: '3m',
				from: '客のブラウザ',
				to: 'menu/bread.jpg',
				kind: 'get',
				info: '名前で取り出す'
			}
		},
		{
			n: 4,
			title: '既定は非公開',
			lead: '作ったばかりの入れ物は、持ち主のほかは誰も読めない',
			body: [
				'鍵を持たない客が写真の URL を開くと、403（許されない）が返った。',
				'非公開から始め、要る物だけを開けるのが安全だ。'
			],
			facts: [
				{ k: '既定', v: '非公開' },
				{ k: '鍵の無い人の答え', v: '403' }
			],
			scene: [
				{ op: 'change', id: 'bucket', k: '公開', v: '無し（既定）' },
				{ op: 'move', from: 'photo', to: 'guest', payload: '403', kind: 'deny' }
			],
			log: {
				t: '4m',
				from: BUCKET,
				to: '客のブラウザ',
				kind: 'deny',
				info: '既定では誰も読めない'
			},
			why: '既定で開いていると、置いただけの物が気づかないうちに誰にでも読まれる'
		},
		{
			n: 5,
			title: '公開の範囲を絞る',
			lead: '公開するのは、名前の前の部分で絞った物だけにする',
			body: [
				'menu/ で始まる物だけを、誰でも読めるようにした。',
				'orders/ は非公開のままで、客が URL を推しても 403 が返る。'
			],
			facts: [
				{ k: '公開', v: 'menu/ で始まる物を読む' },
				{ k: 'orders/ を開く', v: '403' }
			],
			scene: [
				{ op: 'change', id: 'photo', k: '公開', v: '誰でも読める' },
				{ op: 'move', from: 'photo', to: 'guest', payload: '写真', kind: 'get' }
			],
			log: {
				t: '6m',
				from: 'menu/bread.jpg',
				to: '客のブラウザ',
				kind: 'get',
				info: 'menu/ だけ開いた'
			}
		},
		{
			n: 6,
			title: '期限付きの URL',
			lead: '1 人に一時だけ渡すなら、期限付きの URL を作る',
			body: [
				'会計の人に注文の控えを渡すとき、15 分だけ使える URL を作った。',
				'15 分を過ぎると、同じ URL でも 403 が返る。入れ物は非公開のままだ。'
			],
			facts: [
				{ k: '渡した物', v: 'orders/2026-11-13.csv' },
				{ k: '使える時間', v: '15 分' }
			],
			scene: [
				{ op: 'appear', id: 'acct', label: '会計の人', sub: '期限付きの URL', at: [6, 0] },
				{ op: 'move', from: 'csv', to: 'acct', payload: '15 分だけ', kind: 'get' }
			],
			log: {
				t: '10m',
				from: 'orders/2026-11-13.csv',
				to: '会計の人',
				kind: 'get',
				info: '15 分だけ渡した'
			}
		}
	],
	example: {
		intro: '公開の範囲ごとに、誰が何を読めるか',
		lines: [
			'設定                         menu/bread.jpg    orders/…csv',
			'既定（非公開）               持ち主だけ        持ち主だけ',
			'menu/ を誰でも読める         誰でも            持ち主だけ',
			'入れ物を丸ごと誰でも読める   誰でも            誰でも（漏れる）',
			'期限付きの URL（orders 15分） 持ち主だけ        URL を持つ人が 15 分'
		]
	},
	practice: {
		goal: '品書きの写真は客の頁に出し、注文の控えは漏らさない。公開の設定を 1 つ選ぶ',
		form: 'pick',
		setup: {
			situation: [
				'入れ物 bakery-files に、次の 2 種類を置いている',
				'  menu/…  品書きの写真（店の頁に誰でも見られるよう出したい）',
				'  orders/… 客の名前と住所の入った注文の控え（店の人だけ）',
				'今の設定：既定（非公開）。店の頁の写真が 403 で出ない'
			],
			choices: [
				{
					id: 'all',
					text: '入れ物を丸ごと、誰でも読めるようにする',
					result: '写真は出たが、orders/ の控えも URL を推した人に読まれた'
				},
				{
					id: 'menu',
					text: 'menu/ で始まる物だけ、誰でも読めるようにする',
					result: '写真は出て、orders/ は 403 のままだった'
				},
				{
					id: 'write',
					text: 'menu/ に、誰でも読み書きできるようにする',
					result: '写真は出たが、知らない人に写真を差し替えられた'
				},
				{
					id: 'none',
					text: '非公開のまま、写真を頁に埋め込む',
					result: '客のブラウザは鍵を持たないので、写真は 403 で出ないままだった'
				}
			]
		},
		success: { choice: 'menu' },
		mistakes: [
			{
				when: '入れ物を丸ごと公開した',
				why: '注文の控えまで誰でも読める。名前と住所が漏れる',
				next: '公開を menu/ で始まる物に絞る',
				match: 'pick:all'
			},
			{
				when: '書くことまで許した',
				why: '客に要るのは読むことだけだ。書けると、写真を差し替えられる',
				next: '許すのは読むことだけにする',
				match: 'pick:write'
			},
			{
				when: '非公開のまま頁に出そうとした',
				why: '客のブラウザは鍵を持たないので、読めない',
				next: '頁に出す menu/ だけを、読むことに限って公開する',
				match: 'pick:none'
			}
		]
	},
	check: [
		{ ask: '入れ物の既定', how: '非公開（持ち主だけ）' },
		{ ask: '公開の絞り方', how: '名前の前の部分（menu/）と、読むことだけ' },
		{ ask: '1 人に一時だけ渡す', how: '期限付きの URL' }
	]
};
