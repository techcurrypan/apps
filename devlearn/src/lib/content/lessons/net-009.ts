// net-009 HTTPS と TLS（order）。
// 場面：PC（192.0.2.10）のブラウザが、店の Web（shop.example.com = 192.0.2.80）の 443 番に HTTPS でつなぐ。TLS 1.3。
// 大きさは、よくある TLS 1.3 の接続での目安。経過時刻 t は TCP の接続ができた時を 0ms とした（往復 20ms の網）。
// 手順の要点は RFC 8446（TLS 1.3）を自分の言葉でまとめた物。
import type { Lesson } from '../../lesson/types.ts';

const BR = 'ブラウザ 192.0.2.10';
const WEB = 'Web 192.0.2.80:443';
const EYE = '途中の機械';

export const net009: Lesson = {
	id: 'net-009',
	field: 'net',
	level: 2,
	title: 'HTTPS と TLS',
	goal: 'TLS で鍵を決め、暗号の通信が始まるまでを並べることができる',
	prereq: ['net-007'],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '平文の危うさ',
			lead: 'HTTP のままでは、途中の機械が中身を読める',
			body: [
				'80 番の HTTP は、要求も応答も人が読める字のまま運ぶ。',
				'途中の機械（共用の無線の親機など）は、POST の中の password=hanako も読める。',
				'書き換えて渡すこともできる。HTTPS は、これを TLS（運ぶ中身を暗号にする決まり）で防ぐ。'
			],
			facts: [
				{ k: 'HTTP', v: '80 番・平文' },
				{ k: '途中で読める物', v: 'POST /login … password=hanako' },
				{ k: 'HTTPS', v: '443 番・TLS で暗号' }
			],
			scene: [
				{ op: 'appear', id: 'br', label: BR, sub: 'shop.example.com へ', at: [0, 1] },
				{ op: 'appear', id: 'web', label: WEB, sub: 'TLS 1.3', at: [3, 1] },
				{ op: 'appear', id: 'eye', label: EYE, sub: '無線の親機', at: [1, 0] }
			],
			log: { t: '0ms', from: BR, to: EYE, kind: 'plain', info: '平文なら password=hanako が読める' }
		},
		{
			n: 2,
			title: 'ClientHello',
			lead: 'TCP の接続の後、ブラウザが話し方の候補と鍵の半分を送る',
			body: [
				'443 番に TCP で接続した後、ブラウザが ClientHello を送る。',
				'中身は、使える暗号の候補と、行きたい名前 shop.example.com だ。',
				'鍵を決めるための自分の公開の値（X25519 の 32 バイト）も入れる。'
			],
			facts: [
				{ k: '印', v: 'ClientHello' },
				{ k: '暗号の候補', v: 'TLS_AES_128_GCM_SHA256 ほか' },
				{ k: '名前（SNI）', v: 'shop.example.com' },
				{ k: '大きさ', v: '約 500 B' }
			],
			scene: [
				{ op: 'move', from: 'br', to: 'web', payload: 'ClientHello', kind: 'hello' },
				{ op: 'change', id: 'br', k: '鍵の半分', v: 'X25519 公開値 a' }
			],
			log: {
				t: '0ms',
				from: BR,
				to: WEB,
				kind: 'TLS',
				info: 'ClientHello（候補・名前・公開値 a）',
				size: '517 B'
			}
		},
		{
			n: 3,
			title: 'ServerHello と証明書',
			lead: 'Web が暗号を 1 つ選び、身元の証明書を返す',
			body: [
				'Web は ServerHello で TLS_AES_128_GCM_SHA256 を選び、自分の公開の値を返す。',
				'続けて、shop.example.com の証明書と、その持ち主である署名を送る。',
				'ブラウザは、名前・期限・認証局の署名を確かめる。合わなければここで止める。'
			],
			facts: [
				{ k: '選んだ暗号', v: 'TLS_AES_128_GCM_SHA256' },
				{ k: '証明書の名前', v: 'shop.example.com' },
				{ k: 'ブラウザが確かめる物', v: '名前・期限・認証局の署名' }
			],
			scene: [
				{ op: 'move', from: 'web', to: 'br', payload: 'ServerHello・証明書', kind: 'hello' },
				{ op: 'appear', id: 'cert', label: '証明書', sub: 'shop.example.com', at: [1, 2] },
				{ op: 'change', id: 'cert', k: '確かめ', v: '名前・期限・署名 ○' }
			],
			log: {
				t: '10ms',
				from: WEB,
				to: BR,
				kind: 'TLS',
				info: 'ServerHello・証明書・署名・Finished',
				size: '2.9 KB'
			}
		},
		{
			n: 4,
			title: '鍵を決める',
			lead: '両方が、相手の公開値と自分の秘密から同じ鍵を作る',
			body: [
				'ブラウザは「Web の公開値 b と自分の秘密」から、鍵の元を計算する。',
				'Web は「ブラウザの公開値 a と自分の秘密」から、同じ鍵の元を得る。',
				'鍵そのものは網を一度も通らない。途中の機械は a と b を見ても鍵を作れない。'
			],
			facts: [
				{ k: '網を通った物', v: '公開値 a・公開値 b' },
				{ k: '網を通らない物', v: '両方の秘密・決まった鍵' },
				{ k: '鍵を決める方法', v: 'X25519（ECDHE）' }
			],
			scene: [
				{ op: 'change', id: 'br', k: '鍵', v: '決まった' },
				{ op: 'change', id: 'web', k: '鍵', v: '決まった（同じ）' },
				{ op: 'change', id: 'eye', k: '見えた物', v: 'a と b だけ' }
			],
			log: { t: '10ms', from: BR, to: BR, kind: 'key', info: '公開値 b と秘密から鍵を作った' },
			why: '鍵そのものを送ると途中で写されるので、公開してよい値だけを交わし、鍵は両端で計算する'
		},
		{
			n: 5,
			title: '暗号の通信',
			lead: 'Finished を交わしたら、HTTP をそのまま暗号にして運ぶ',
			body: [
				'ブラウザは Finished を送り、ここまでのやり取りが改ざんされていないと示す。',
				'その後の GET / は、決まった鍵で暗号にした塊として運ぶ。',
				'途中の機械に見えるのは、宛先 192.0.2.80:443 と塊の大きさだけだ。'
			],
			facts: [
				{ k: '中身', v: 'GET / HTTP/1.1（暗号の中）' },
				{ k: '途中で見える物', v: '192.0.2.80:443・塊の大きさ' },
				{ k: '始まった時', v: '20ms（1 往復の後）' }
			],
			scene: [
				{ op: 'move', from: 'br', to: 'web', payload: 'Finished・暗号の GET /', kind: 'data' },
				{ op: 'change', id: 'eye', k: '見えた物', v: '大きさだけ' }
			],
			log: {
				t: '20ms',
				from: BR,
				to: WEB,
				kind: 'TLS',
				info: 'Finished の後、GET / を暗号で送った',
				size: '120 B'
			}
		},
		{
			n: 6,
			title: '改ざんに気付く',
			lead: '塊ごとの検査の印で、1 ビットの書き換えも見つける',
			body: [
				'暗号の塊には、鍵から作った 16 バイトの検査の印が付く。',
				'途中の機械が 1 ビットでも書き換えると、受け取った側で印が合わない。',
				'受け取った側は bad_record_mac の知らせを送り、接続を切る。'
			],
			facts: [
				{ k: '検査の印', v: '16 B（塊ごと）' },
				{ k: '合わなかったとき', v: 'alert bad_record_mac → 切断' }
			],
			scene: [
				{ op: 'move', from: 'eye', to: 'web', payload: '書き換えた塊', kind: 'tamper' },
				{ op: 'change', id: 'web', k: '検査', v: '合わない → 切る' }
			],
			log: {
				t: '40ms',
				from: WEB,
				to: BR,
				kind: 'alert',
				info: '検査の印が合わず bad_record_mac で切った'
			}
		}
	],
	example: {
		intro: 'HTTPS の接続の初めから、暗号の通信までの印（大きさは目安）',
		lines: [
			'  0ms  ブラウザ → Web  ClientHello      候補・shop.example.com・公開値 a',
			' 10ms  Web → ブラウザ  ServerHello      TLS_AES_128_GCM_SHA256・公開値 b',
			' 10ms  Web → ブラウザ  証明書・署名      shop.example.com',
			' 10ms  ブラウザ        証明書を確かめる  名前・期限・署名 ○',
			' 20ms  ブラウザ → Web  Finished',
			' 20ms  ブラウザ → Web  暗号の塊          （中は GET /）'
		]
	},
	practice: {
		goal: 'ブラウザが shop.example.com に HTTPS でつなぎ、頁を頼むまでを、起きる順に並べる',
		form: 'order',
		setup: {
			cards: [
				{ id: 'verify', text: 'ブラウザが証明書の名前・期限・署名を確かめる' },
				{ id: 'data', text: 'ブラウザが GET / を暗号にして送る' },
				{ id: 'ch', text: 'ブラウザが ClientHello（候補・名前・公開値 a）を送る' },
				{ id: 'tcp', text: 'ブラウザが 443 番に TCP で接続する' },
				{ id: 'fin', text: 'ブラウザが Finished を送る' },
				{ id: 'sh', text: 'Web が ServerHello（選んだ暗号・公開値 b）を返す' },
				{ id: 'cert', text: 'Web が証明書と署名を送る' }
			]
		},
		success: { orders: [['tcp', 'ch', 'sh', 'cert', 'verify', 'fin', 'data']] },
		mistakes: [
			{
				when: '暗号の GET / を Finished より前に置いた',
				why: 'Finished で、やり取りが書き換えられていないと確かめ合うまで、頁の頼みは送らない',
				next: 'Finished の札の後に、GET / の札を置く',
				match: 'data<fin'
			},
			{
				when: '証明書を確かめるのを、証明書が届く前に置いた',
				why: '確かめる物がまだ届いていない。証明書は ServerHello に続いて Web から届く',
				next: 'Web が証明書を送る札の直後に、確かめる札を置く',
				match: 'verify<cert'
			},
			{
				when: 'ServerHello を ClientHello より前に置いた',
				why: 'Web は、ブラウザの候補を見てから 1 つを選ぶ。候補が届く前には選べない',
				next: 'ClientHello を先に、その次に ServerHello を置く',
				match: 'sh<ch'
			},
			{
				when: 'ClientHello を TCP の接続より前に置いた',
				why: 'TLS は TCP の接続の上で話す。接続が無いと ClientHello を運べない',
				next: '443 番への TCP の接続を一番上に置く',
				match: 'ch<tcp'
			}
		]
	},
	check: [
		{ ask: '始めの 2 通', how: 'ClientHello → ServerHello' },
		{ ask: '網を通らない物', how: '決まった鍵（両端で公開値と秘密から計算する）' },
		{ ask: '頁を頼める時', how: 'Finished を送った後' }
	]
};
