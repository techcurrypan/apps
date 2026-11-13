// cld-002 サービスの形（sort）。
// 場面：パン屋が、注文の頁・日々の帳簿・メール・写真の縮小を、それぞれどの形で借りるかを決める。特定の事業者の名前は使わない（D-10）。
// 経過時刻 t は選び始めた日を 0d とした。
import type { Lesson } from '../../lesson/types.ts';

const LINE = '受け持ちの境';

export const cld002: Lesson = {
	id: 'cld-002',
	field: 'cld',
	level: 1,
	title: 'サービスの形',
	goal: 'IaaS・PaaS・SaaS・サーバーレスを、受け持つ範囲で見分けることができる',
	prereq: ['cld-001'],
	related: ['ctr-001'],
	next: ['cld-005', 'cld-007'],
	explain: [
		{
			n: 1,
			title: '機械を借りる IaaS',
			lead: 'IaaS は、仮想の機械と網を借りる。OS から上は自分で受け持つ',
			body: [
				'仮想の機械を 1 台借り、OS を入れて、道具を自分で置く。',
				'自由が利く代わりに、OS の更新も自分でする。'
			],
			facts: [
				{ k: '借りる物', v: '仮想の機械・網・ディスク' },
				{ k: '自分の受け持ち', v: 'OS・道具・データ' }
			],
			scene: [
				{ op: 'appear', id: 'iaas', label: 'IaaS', sub: '機械を借りる', at: [0, 0] },
				{ op: 'appear', id: 'line', label: LINE, sub: 'OS の下', at: [3, 0] },
				{ op: 'move', from: 'iaas', to: 'line', payload: 'OS から上は自分', kind: 'duty' }
			],
			log: { t: '0d', from: 'IaaS', to: LINE, kind: 'duty', info: 'OS から上を受け持つ' }
		},
		{
			n: 2,
			title: '実行の場を借りる PaaS',
			lead: 'PaaS は、道具を動かす場を借りる。自分は道具とデータだけ',
			body: [
				'書いた道具を渡すと、OS や動かす仕組みは事業者が用意する。',
				'OS の更新は事業者がする。自分は道具の中身とデータを受け持つ。'
			],
			facts: [
				{ k: '渡す物', v: '書いた道具' },
				{ k: '自分の受け持ち', v: '道具・データ' }
			],
			scene: [
				{ op: 'appear', id: 'paas', label: 'PaaS', sub: '動かす場を借りる', at: [0, 1] },
				{ op: 'change', id: 'line', k: 'PaaS', v: '道具の下' }
			],
			log: { t: '1d', from: 'PaaS', to: LINE, kind: 'duty', info: '道具とデータを受け持つ' }
		},
		{
			n: 3,
			title: '使える物を借りる SaaS',
			lead: 'SaaS は、出来上がった道具を、頁から使う',
			body: [
				'メールや表計算を、頁を開いて使う。入れる物も更新する物も無い。',
				'自分の受け持ちは、誰に使わせるかと、置いたデータだ。'
			],
			facts: [
				{ k: '使い方', v: '頁を開く' },
				{ k: '自分の受け持ち', v: '使う人の権限・データ' }
			],
			scene: [
				{ op: 'appear', id: 'saas', label: 'SaaS', sub: '道具を使う', at: [0, 2] },
				{ op: 'change', id: 'line', k: 'SaaS', v: '権限とデータの下' }
			],
			log: { t: '2d', from: 'SaaS', to: LINE, kind: 'duty', info: '権限とデータだけ' }
		},
		{
			n: 4,
			title: '関数だけ置く',
			lead: 'サーバーレスは、関数を置き、呼ばれた時だけ動かす',
			body: [
				'写真が届いた時に縮める関数を置くと、届くたびに動いて止まる。',
				'動いた回数と時間の分だけ払う。動く機械の数は事業者が決める。'
			],
			facts: [
				{ k: '置く物', v: '関数 1 つ' },
				{ k: '払う分', v: '呼ばれた回数と時間' }
			],
			scene: [
				{ op: 'appear', id: 'fn', label: 'サーバーレス', sub: '関数を置く', at: [6, 1] },
				{ op: 'move', from: 'fn', to: 'line', payload: '呼ばれた時だけ', kind: 'call' }
			],
			log: { t: '3d', from: 'サーバーレス', to: LINE, kind: 'call', info: '呼ばれた時だけ動く' },
			why: '待つ間は機械を持たないので、たまにしか動かない仕事ほど安く済む'
		},
		{
			n: 5,
			title: '受け持ちの差',
			lead: '上の形ほど、事業者の受け持ちが増え、自分の自由は減る',
			body: [
				'IaaS → PaaS → SaaS の順に、自分が受け持つ範囲は狭くなる。',
				'どの形でも、権限とデータは自分の受け持ちとして残る。'
			],
			facts: [
				{ k: '自分の受け持ち', v: 'IaaS ＞ PaaS ＞ SaaS' },
				{ k: 'どれでも残る物', v: '権限・データ' }
			],
			scene: [
				{ op: 'change', id: 'line', k: '並び', v: 'IaaS ＞ PaaS ＞ SaaS' },
				{ op: 'highlight', id: 'line' }
			],
			log: { t: '4d', from: 'IaaS', to: 'SaaS', kind: 'compare', info: '受け持ちは順に狭くなる' }
		},
		{
			n: 6,
			title: '選ぶ',
			lead: '変えたい所と、任せたい所で選ぶ',
			body: [
				'特別な道具を入れたい注文の機械は IaaS、帳簿の道具は PaaS にした。',
				'メールは SaaS、写真の縮小はサーバーレスにした。'
			],
			facts: [
				{ k: '注文の機械', v: 'IaaS' },
				{ k: '帳簿', v: 'PaaS' },
				{ k: 'メール・写真', v: 'SaaS・サーバーレス' }
			],
			scene: [
				{ op: 'move', from: 'iaas', to: 'fn', payload: '店の 4 つ', kind: 'choose' },
				{ op: 'change', id: 'fn', k: '選んだ物', v: '写真の縮小' }
			],
			log: { t: '5d', from: 'パン屋', to: '4 つの形', kind: 'choose', info: '仕事ごとに形を選んだ' }
		}
	],
	example: {
		intro: '形ごとに、使う人が受け持つ物（○）',
		lines: [
			'受け持つ物       IaaS  PaaS  SaaS  サーバーレス',
			'機械・網の線     -     -     -     -',
			'OS の更新        ○     -     -     -',
			'動かす仕組み     ○     -     -     -',
			'書いた道具       ○     ○     -     ○（関数）',
			'権限・データ     ○     ○     ○     ○'
		]
	},
	practice: {
		goal: 'パン屋の 6 つの使い方を、IaaS・PaaS・SaaS・サーバーレスに振り分ける',
		form: 'sort',
		setup: {
			items: [
				{ id: 'vm', text: '仮想の機械を借り、OS を入れて注文の道具を置く' },
				{ id: 'app', text: '書いた帳簿の道具を渡すと、動かす場が用意される' },
				{ id: 'mail', text: '頁を開いて、店のメールを読み書きする' },
				{ id: 'thumb', text: '写真が届くたびに、縮める関数が動いて止まる' },
				{ id: 'sheet', text: '頁を開いて、売上の表を皆で書く' },
				{ id: 'disk', text: '仮想のディスクを足して、機械につなぐ' }
			],
			bins: [
				{ id: 'iaas', label: 'IaaS（機械を借りる）' },
				{ id: 'paas', label: 'PaaS（動かす場を借りる）' },
				{ id: 'saas', label: 'SaaS（道具を使う）' },
				{ id: 'fn', label: 'サーバーレス（関数を置く）' }
			]
		},
		success: {
			bins: { vm: 'iaas', app: 'paas', mail: 'saas', thumb: 'fn', sheet: 'saas', disk: 'iaas' }
		},
		mistakes: [
			{
				when: '道具を渡すだけの帳簿を IaaS に入れた',
				why: 'OS を入れていない。動かす場は事業者が用意している',
				next: '帳簿を PaaS に入れる',
				match: 'app:iaas'
			},
			{
				when: '関数が呼ばれた時だけ動く物を PaaS に入れた',
				why: '動かす場を常に借りておらず、呼ばれた時だけ動く',
				next: '写真の縮小をサーバーレスに入れる',
				match: 'thumb:paas'
			},
			{
				when: '頁を開いて使う表を PaaS に入れた',
				why: '自分の道具を渡していない。出来上がった道具を使っている',
				next: '売上の表を SaaS に入れる',
				match: 'sheet:paas'
			}
		]
	},
	check: [
		{ ask: 'OS を自分で更新する形', how: 'IaaS' },
		{ ask: '書いた道具を渡す形', how: 'PaaS（関数だけならサーバーレス）' },
		{ ask: 'どの形でも残る受け持ち', how: '権限とデータ' }
	]
};
