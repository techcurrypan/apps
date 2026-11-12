// sec-006 XSS（fix。仕組み html）。
// 場面：店の頁に口コミの欄がある。客が書いた名前と本文を、頁の型に埋めて全員に見せる。
// 罠の本文は、読んだ人の Cookie を外へ送る steal() を動かそうとする（steal は説明のための作り物の関数）。
// 経過時刻 t は口コミが書き込まれた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const FORM = '書き込み欄';
const PAGE = '口コミの頁';
const READER = '読んだ客 hanako';
const EVIL = '罠のサイト';

export const sec006: Lesson = {
	id: 'sec-006',
	field: 'sec',
	level: 2,
	title: 'XSS',
	goal: '入力がページの中で動く仕組みを確かめ、出力の変換で防ぐことができる',
	prereq: ['net-007'],
	related: ['sec-005'],
	next: ['sec-007'],
	explain: [
		{
			n: 1,
			title: '書き込み欄',
			lead: '客が書いた名前と本文を、頁に載せて全員に見せる',
			body: [
				'口コミの欄には、名前と本文の 2 つの入力がある。',
				'taro が名前 taro、本文「パンがおいしい」と書くと、頁に 1 件増える。',
				'頁の型は <p>{name} さん</p> と <p>{comment}</p> の 2 行だ。'
			],
			facts: [
				{ k: '入力', v: '名前・本文' },
				{ k: '頁の型', v: '<p>{name} さん</p> / <p>{comment}</p>' }
			],
			scene: [
				{ op: 'appear', id: 'form', label: FORM, sub: '名前・本文', at: [0, 1] },
				{ op: 'appear', id: 'page', label: PAGE, sub: '1 件', at: [2, 1] },
				{ op: 'move', from: 'form', to: 'page', payload: 'パンがおいしい', kind: 'post' }
			],
			log: { t: '0s', from: FORM, to: PAGE, kind: 'post', info: 'taro の口コミが載った' }
		},
		{
			n: 2,
			title: 'そのまま埋める',
			lead: '型の {comment} に、書かれた字をそのまま入れる',
			body: [
				'本文「パンがおいしい」は <p>パンがおいしい</p> になる。',
				'ブラウザは、この行を HTML（頁の書き方）として読む。',
				'書かれた字に < や > があれば、それも HTML の印として読まれる。'
			],
			facts: [
				{ k: '埋めた行', v: '<p>パンがおいしい</p>' },
				{ k: '< と >', v: 'HTML の印として読まれる' }
			],
			scene: [{ op: 'change', id: 'page', k: '埋めた行', v: '<p>パンがおいしい</p>' }],
			log: { t: '1s', from: PAGE, to: PAGE, kind: 'render', info: '<p>パンがおいしい</p> を作った' }
		},
		{
			n: 3,
			title: 'スクリプトが動く',
			lead: '本文に <script> を書くと、読んだ人のブラウザで動く',
			body: [
				'罠の客が本文に <script>steal()</script> と書く。',
				'頁は <p><script>steal()</script></p> になり、steal() が走る。',
				'これを XSS（よそのサイトから字を差し込んでスクリプトを動かす攻撃）と呼ぶ。'
			],
			facts: [
				{ k: '書かれた本文', v: '<script>steal()</script>' },
				{ k: '埋めた行', v: '<p><script>steal()</script></p>' },
				{ k: '結果', v: 'スクリプトが動く' }
			],
			scene: [
				{ op: 'appear', id: 'reader', label: READER, sub: '頁を開く', at: [3, 0] },
				{
					op: 'move',
					from: 'page',
					to: 'reader',
					payload: '<script>steal()</script>',
					kind: 'xss'
				},
				{ op: 'change', id: 'reader', k: '動いた物', v: 'steal()' }
			],
			log: {
				t: '60s',
				from: PAGE,
				to: READER,
				kind: 'xss',
				info: 'hanako のブラウザで steal() が動いた'
			}
		},
		{
			n: 4,
			title: 'Cookie が読まれる',
			lead: '動いたスクリプトは、その店の頁として何でもできる',
			body: [
				'steal() は document.cookie を読み、罠のサイトに送る。',
				'hanako の入ったままの印 session=7f3a が盗まれ、罠の者が hanako として店に入れる。',
				'名前の欄に <img src=x onerror=steal()> と書いても、同じく動く。'
			],
			facts: [
				{ k: '盗まれた物', v: 'session=7f3a' },
				{ k: '送り先', v: '罠のサイト' },
				{ k: '名前の欄の罠', v: '<img src=x onerror=steal()>' }
			],
			scene: [
				{ op: 'appear', id: 'evil', label: EVIL, sub: '盗んだ物を受ける', at: [3, 2] },
				{ op: 'move', from: 'reader', to: 'evil', payload: 'session=7f3a', kind: 'leak' }
			],
			log: {
				t: '61s',
				from: READER,
				to: EVIL,
				kind: 'leak',
				info: 'Cookie session=7f3a を送られた'
			},
			why: 'ブラウザは、頁の中のスクリプトを書いた人で区別せず、その頁の持ち主の物として動かすから'
		},
		{
			n: 5,
			title: '< を変換する',
			lead: '埋める時に、HTML の印になる字を別の書き方に替える',
			body: [
				'< を &lt;、> を &gt;、& を &amp;、" を &quot; に替えてから埋める。',
				'型を <p>{comment|escape}</p> に直すと、罠の < は &lt; になる。',
				'名前の欄も同じく {name|escape} に直す。入力の全ての置き場で替える。'
			],
			facts: [
				{ k: '<', v: '&lt;' },
				{ k: '>', v: '&gt;' },
				{ k: '直した型', v: '<p>{name|escape} さん</p> / <p>{comment|escape}</p>' }
			],
			scene: [
				{ op: 'change', id: 'page', k: '型', v: '{name|escape}・{comment|escape}' },
				{ op: 'change', id: 'page', k: '埋めた行', v: '<p>&lt;script&gt;…</p>' }
			],
			log: {
				t: '120s',
				from: PAGE,
				to: PAGE,
				kind: 'escape',
				info: '< と > を &lt; と &gt; に替えて埋めた'
			}
		},
		{
			n: 6,
			title: '文字として出る',
			lead: '替えた字は、印でなく見たままの字として出る',
			body: [
				'ブラウザは &lt; を < の字として画面に描き、タグとしては読まない。',
				'hanako の画面には <script>steal()</script> という字が見えるだけで、何も動かない。',
				'「パンがおいしい」のような普通の口コミは、替える前と同じに見える。'
			],
			facts: [
				{ k: '画面に見える字', v: '<script>steal()</script>' },
				{ k: '動いた物', v: '（無い）' },
				{ k: '普通の口コミ', v: '変わらない' }
			],
			scene: [
				{ op: 'move', from: 'page', to: 'reader', payload: '字としての <script>', kind: 'safe' },
				{ op: 'change', id: 'reader', k: '動いた物', v: '（無い）' }
			],
			log: {
				t: '180s',
				from: PAGE,
				to: READER,
				kind: 'safe',
				info: '字として出て、何も動かなかった'
			}
		}
	],
	example: {
		intro: '同じ 3 件の口コミを、直す前と後の型で埋めた結果',
		lines: [
			'入力  名前 taro / 本文 パンがおいしい',
			'  前  <p>taro さん</p> <p>パンがおいしい</p>                 → 文字として出る',
			'  後  <p>taro さん</p> <p>パンがおいしい</p>                 → 文字として出る',
			'入力  名前 x / 本文 <script>steal()</script>',
			'  前  <p><script>steal()</script></p>                        → スクリプトが動く',
			'  後  <p>&lt;script&gt;steal()&lt;/script&gt;</p>            → 文字として出る',
			'入力  名前 <img src=x onerror=steal()> / 本文 よい',
			'  前  <p><img src=x onerror=steal()> さん</p>                → スクリプトが動く',
			'  後  <p>&lt;img src=x onerror=steal()&gt; さん</p>          → 文字として出る'
		]
	},
	practice: {
		goal: '口コミの頁の型を直し、どの書き込みでもスクリプトが動かないようにする',
		form: 'fix',
		setup: {
			engine: 'html',
			lines: [
				{ id: 'h', text: '<h2>口コミ</h2>' },
				{ id: 'n', text: '<p>{name} さん</p>' },
				{ id: 'c', text: '<p>{comment}</p>' }
			],
			options: [
				{ line: 'n', id: 'esc', text: '<p>{name|escape} さん</p>' },
				{ line: 'n', id: 'b', text: '<p><b>{name}</b> さん</p>' },
				{ line: 'c', id: 'esc', text: '<p>{comment|escape}</p>' },
				{ line: 'c', id: 'pre', text: '<pre>{comment}</pre>' }
			],
			cases: [
				{
					id: 'plain',
					name: '名前 taro・本文「パンがおいしい」',
					input: { name: 'taro', comment: 'パンがおいしい' }
				},
				{
					id: 'script',
					name: '本文 <script>steal()</script>',
					input: { name: 'x', comment: '<script>steal()</script>' }
				},
				{
					id: 'img',
					name: '名前 <img src=x onerror=steal()>',
					input: { name: '<img src=x onerror=steal()>', comment: 'よい' }
				}
			]
		},
		success: { expect: { plain: 'text', script: 'text', img: 'text' } },
		mistakes: [
			{
				when: '本文を <pre> で囲んだ',
				why: '<pre> は字の並べ方を変えるだけで、中の <script> はそのまま動く',
				next: '本文の行を <p>{comment|escape}</p> に替える',
				match: 'c:pre'
			},
			{
				when: '本文だけを変換し、名前をそのままにした',
				why: '名前も客が書く入力だ。<img … onerror=…> の属性から steal() が動く',
				next: '名前の行も <p>{name|escape} さん</p> に替える',
				match: 'case:img:runs'
			},
			{
				when: '本文を変換しなかった',
				why: '本文の <script> がタグとして読まれ、読んだ人のブラウザで動く',
				next: '本文の行を <p>{comment|escape}</p> に替える',
				match: 'case:script:runs'
			}
		]
	},
	check: [
		{ ask: '動く理由', how: '入力の < > が HTML の印として読まれる' },
		{ ask: '防ぎ方', how: '埋める時に < を &lt;、> を &gt; に替える' },
		{ ask: '替える所', how: '名前と本文、入力を埋める全ての所' }
	]
};
