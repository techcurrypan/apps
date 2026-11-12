// sec-011 だます攻撃を見抜く（段 10-0。pick の見本）。
// 場面：港町の運送屋の配車係に、取引先の銀行を名乗るメールが届く。名前は全て .example（例に使うと決まった名前）で、実在の団体ではない。
// 本物の銀行の名前は minato-bank.example とした。経過時刻 t は、メールが届いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const MAIL = 'メール';
const ME = '配車係';
const BANK = 'minato-bank.example';
const FAKE = 'minato-bank.example.login-check.example';

export const sec011: Lesson = {
	id: 'sec-011',
	field: 'sec',
	level: 1,
	title: 'だます攻撃を見抜く',
	goal: '届いたメールの差出人と URL から、だます攻撃を見抜くことができる',
	prereq: [],
	related: ['net-004'],
	next: ['sec-001'],
	explain: [
		{
			n: 1,
			title: 'メールが届く',
			lead: '銀行を名乗り、すぐの手続きを求めるメール',
			body: [
				'配車係に「口座が止まります。今日中に確かめて」と届いた。',
				'急がせて考える間を奪うのは、だます攻撃のよくある手だ。',
				'これをフィッシング（本物を装って合言葉を盗む攻撃）と呼ぶ。'
			],
			facts: [
				{ k: '件名', v: '【至急】口座の利用を止めます' },
				{ k: '求める事', v: '今日中に下の URL から確かめる' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: '運送屋', at: [0, 0] },
				{ op: 'appear', id: 'mail', label: MAIL, sub: '件名：【至急】', at: [1, 0] },
				{ op: 'move', from: 'mail', to: 'me', payload: '口座が止まります', kind: 'mail' }
			],
			log: { t: '0s', from: MAIL, to: ME, kind: 'mail', info: '【至急】口座の利用を止めます' }
		},
		{
			n: 2,
			title: '差出人の表示',
			lead: '見えている名前は、送る側が自由に書ける',
			body: [
				'受信の一覧には「みなと銀行」と出ている。',
				'この表示名は、送る側が好きな文字を書ける欄だ。',
				'名前が本物らしくても、それだけでは何も確かめていない。'
			],
			facts: [
				{ k: '表示名', v: 'みなと銀行' },
				{ k: '書くのは', v: '送る側（自由に書ける）' }
			],
			scene: [{ op: 'change', id: 'mail', k: '表示名', v: 'みなと銀行' }],
			log: { t: '5s', from: ME, to: MAIL, kind: 'look', info: '表示名は「みなと銀行」' }
		},
		{
			n: 3,
			title: '本当の差出人',
			lead: 'アドレスの @ の後ろを、本物と比べる',
			body: [
				'表示名の横の、本当のアドレスを開いて見る。',
				'今回は minato-bank-support.example で、本物とは別の持ち主だった。',
				'違えば偽物と決まる。同じでも、差出人の欄は偽れるので安心はできない。'
			],
			facts: [
				{ k: '本当のアドレス', v: 'info@minato-bank-support.example' },
				{ k: '本物の名前', v: BANK },
				{ k: '一致', v: 'しない' }
			],
			scene: [
				{ op: 'appear', id: 'bank', label: BANK, sub: '本物の銀行', at: [2, 0] },
				{ op: 'change', id: 'mail', k: '差出人', v: 'minato-bank-support.example' }
			],
			log: {
				t: '15s',
				from: ME,
				to: MAIL,
				kind: 'look',
				info: '差出人は minato-bank-support.example'
			},
			why: '名前は持ち主ごとに登録されるので、似た文字列でも持ち主は別になる'
		},
		{
			n: 4,
			title: '本文の URL',
			lead: '押す前に、飛び先の URL を文字で見る',
			body: [
				'本文の「確かめる」の釦には、飛び先の URL が隠れている。',
				'押さずに、上に重ねるか長押しして、URL を文字で出す。',
				'出てきたのは https://minato-bank.example.login-check.example/ だった。'
			],
			facts: [
				{ k: '釦の文字', v: '確かめる' },
				{ k: '飛び先', v: `https://${FAKE}/` }
			],
			scene: [
				{ op: 'appear', id: 'url', label: '飛び先の URL', sub: FAKE, at: [1, 1] },
				{ op: 'move', from: 'mail', to: 'url', payload: '隠れた飛び先', kind: 'link' }
			],
			log: { t: '25s', from: ME, to: '飛び先の URL', kind: 'look', info: `飛び先は ${FAKE}` }
		},
		{
			n: 5,
			title: '飛び先の名前',
			lead: '名前は右から読む。持ち主は最後の 2 つ',
			body: [
				'名前は . で区切った右の端から、持ち主の範囲が決まる。',
				'右の端は login-check.example で、銀行の名前ではない。',
				'左の minato-bank.example は、ただの飾りの文字だ。'
			],
			facts: [
				{ k: '右の端（持ち主）', v: 'login-check.example' },
				{ k: '左の飾り', v: 'minato-bank.example.' },
				{ k: '本物か', v: '違う' }
			],
			scene: [
				{ op: 'change', id: 'url', k: '持ち主', v: 'login-check.example' },
				{ op: 'highlight', id: 'url' }
			],
			log: {
				t: '40s',
				from: ME,
				to: '飛び先の URL',
				kind: 'warn',
				info: '持ち主は login-check.example。銀行ではない'
			}
		},
		{
			n: 6,
			title: '開かずに確かめる',
			lead: 'メールの道を使わず、自分で本物へ行く',
			body: [
				'URL は押さず、ブックマークから本物の銀行の頁を開く。',
				'本物の頁には、口座を止める知らせは出ていなかった。',
				'メールは会社の窓口に知らせ、消した。'
			],
			facts: [
				{ k: '開いた道', v: `ブックマーク → https://${BANK}/` },
				{ k: '本物の知らせ', v: '無し' },
				{ k: 'メール', v: '窓口に知らせて消した' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'bank', payload: 'ブックマークから', kind: 'safe' },
				{ op: 'vanish', id: 'url' },
				{ op: 'change', id: 'mail', k: '扱い', v: '知らせて消した' }
			],
			log: {
				t: '90s',
				from: ME,
				to: BANK,
				kind: 'safe',
				info: '本物の頁に知らせは無かった。メールは偽物'
			}
		}
	],
	example: {
		intro: 'メールの差出人と飛び先を、本物の名前と並べて比べた（右の端が持ち主）',
		lines: [
			'本物の名前    minato-bank.example',
			'差出人        info@minato-bank-support.example   → 持ち主 minato-bank-support.example  違う',
			'飛び先        minato-bank.example.login-check.example  → 持ち主 login-check.example  違う',
			'自分で開いた  https://minato-bank.example/  → 知らせ 無し'
		]
	},
	practice: {
		goal: '届いたメールの差出人と URL を読み、配車係が次にすることを 1 つ選ぶ',
		form: 'pick',
		setup: {
			situation: [
				'差出人: みなと銀行 <notice@minato-bank.example>',
				'件名: 【至急】お支払いの確認',
				'',
				'本日中に下の URL からログインし、支払いを確かめてください。',
				'確かめない場合、明日から口座を止めます。',
				'',
				'URL: https://minato-bank.example-pay.example/login',
				'',
				'（本物の銀行の名前は minato-bank.example）'
			],
			choices: [
				{
					id: 'open',
					text: '差出人が本物の名前なので、URL を開いてログインする',
					result: '合言葉が example-pay.example の持ち主に渡った'
				},
				{
					id: 'reply',
					text: 'メールに返信して、本物かどうかを尋ねる',
					result: '返信は差出人の側に届き、「本物です」と返ってきた'
				},
				{
					id: 'self',
					text: 'URL は開かず、ブックマークから本物の頁を開いて確かめる',
					result: '本物の頁に支払いの知らせは無く、メールは偽物と分かった'
				},
				{
					id: 'look',
					text: 'URL を開いて、頁の見た目が本物と同じか確かめる',
					result: '見た目は本物と同じだった。頁を開いた記録は相手に残った'
				}
			]
		},
		success: { choice: 'self' },
		mistakes: [
			{
				when: '差出人が本物の名前なので、URL を開いた',
				why: '差出人の欄は送る側が書ける。飛び先の右の端は example-pay.example で、銀行ではない',
				next: 'URL は右の端から読み、持ち主を本物の名前と比べる。違えば開かない',
				match: 'pick:open'
			},
			{
				when: 'メールに返信して尋ねた',
				why: '返信は偽物の側に届く。相手は「本物です」と答えるだけで、何も確かめられない',
				next: 'メールとは別の道（ブックマークや、知っている窓口の番号）で本物に確かめる',
				match: 'pick:reply'
			},
			{
				when: '見た目を確かめるために URL を開いた',
				why: '見た目は写せるので、本物かの証しにならない。開くだけで相手に知られる',
				next: '頁の見た目でなく、URL の右の端の名前で見分ける',
				match: 'pick:look'
			}
		]
	},
	check: [
		{ ask: '表示名', how: '送る側が自由に書けるので、証しにならない' },
		{ ask: 'URL の持ち主', how: '名前の右の端（login-check.example）で決まる' },
		{ ask: '確かめ方', how: 'メールの道を使わず、ブックマークから本物を開く' }
	]
};
