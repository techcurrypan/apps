// net-005 TCP で接続する（段 10-0。order の見本）。
// 場面：PC（192.0.2.10）のブラウザが、Web の機械（203.0.113.10）の 80 番に接続して頁を取る。
// 番号（seq・ack）は説明のための例で、本物は接続のたびに決まる。経過時刻 t は SYN を送った時を 0ms とした（往復 20ms の網）。
import type { Lesson } from '../../lesson/types.ts';

const CL = 'PC 192.0.2.10';
const SV = 'Web 203.0.113.10';

export const net005: Lesson = {
	id: 'net-005',
	field: 'net',
	level: 1,
	title: 'TCP で接続する',
	goal: '3 回のやり取りで TCP の接続ができる流れを並べることができる',
	prereq: ['net-003'],
	related: [],
	next: ['net-006'],
	explain: [
		{
			n: 1,
			title: '待ち受ける側',
			lead: 'Web の機械は、80 番の口を開けて待っている',
			body: [
				'TCP（届いたかを確かめながら運ぶ決まり）では、先に待つ側がいる。',
				'Web の機械は 80 番のポート（受け口の番号）で LISTEN、待ち受け中だ。',
				'PC 側はまだ何もしていない。'
			],
			facts: [
				{ k: '待つ側', v: '203.0.113.10:80' },
				{ k: '状態', v: 'LISTEN' },
				{ k: 'PC の状態', v: 'CLOSED' }
			],
			scene: [
				{ op: 'appear', id: 'cl', label: CL, sub: 'ブラウザ', at: [0, 0] },
				{ op: 'appear', id: 'sv', label: SV, sub: ':80', at: [2, 0] },
				{ op: 'change', id: 'sv', k: '状態', v: 'LISTEN' }
			],
			log: { t: '0ms', from: SV, to: SV, kind: 'listen', info: '80 番で待ち受けている' }
		},
		{
			n: 2,
			title: 'SYN を送る',
			lead: 'PC が「始めたい」と、最初の番号を付けて送る',
			body: [
				'PC は SYN（同期、始めたいの印）を送る。送り元の口は 50312 番だ。',
				'自分の数え始めの番号 seq=1000 を付ける。',
				'PC は SYN-SENT、返事待ちになる。'
			],
			facts: [
				{ k: '印', v: 'SYN' },
				{ k: '番号', v: 'seq=1000' },
				{ k: '送り元 → 宛先', v: '192.0.2.10:50312 → 203.0.113.10:80' }
			],
			scene: [
				{ op: 'move', from: 'cl', to: 'sv', payload: 'SYN seq=1000', kind: 'syn' },
				{ op: 'change', id: 'cl', k: '状態', v: 'SYN-SENT' }
			],
			log: { t: '0ms', from: CL, to: SV, kind: 'SYN', info: 'SYN seq=1000', size: '60 B' }
		},
		{
			n: 3,
			title: 'SYN+ACK が返る',
			lead: '受け取ったと返し、自分の番号も知らせる',
			body: [
				'Web の機械は SYN と ACK（受け取ったの印）を 1 つにして返す。',
				'ack=1001 は「1000 まで受け取った、次は 1001 をくれ」の意味だ。',
				'自分の数え始めは seq=5000 と知らせる。'
			],
			facts: [
				{ k: '印', v: 'SYN+ACK' },
				{ k: '番号', v: 'seq=5000 ack=1001' },
				{ k: 'Web の状態', v: 'SYN-RECEIVED' }
			],
			scene: [
				{ op: 'move', from: 'sv', to: 'cl', payload: 'SYN+ACK seq=5000 ack=1001', kind: 'synack' },
				{ op: 'change', id: 'sv', k: '状態', v: 'SYN-RECEIVED' }
			],
			log: { t: '10ms', from: SV, to: CL, kind: 'SYN+ACK', info: 'seq=5000 ack=1001', size: '60 B' }
		},
		{
			n: 4,
			title: 'ACK で始まる',
			lead: 'PC が受け取ったと返して、接続ができる',
			body: [
				'PC は ACK ack=5001 を返す。Web の番号 5000 を受け取った印だ。',
				'これで両方が相手の数え始めを知った。両方とも ESTABLISHED、接続済みになる。'
			],
			facts: [
				{ k: '印', v: 'ACK' },
				{ k: '番号', v: 'seq=1001 ack=5001' },
				{ k: '両方の状態', v: 'ESTABLISHED' }
			],
			scene: [
				{ op: 'move', from: 'cl', to: 'sv', payload: 'ACK ack=5001', kind: 'ack' },
				{ op: 'change', id: 'cl', k: '状態', v: 'ESTABLISHED' },
				{ op: 'change', id: 'sv', k: '状態', v: 'ESTABLISHED' }
			],
			log: {
				t: '20ms',
				from: CL,
				to: SV,
				kind: 'ACK',
				info: 'ack=5001。接続ができた',
				size: '52 B'
			},
			why: '両方が相手の数え始めの番号を確かめ合うので、届かなかった物や重なった物を後から見分けられる'
		},
		{
			n: 5,
			title: 'データを運ぶ',
			lead: '接続の上で、頁の要求と答えが行き来する',
			body: [
				'PC は GET / を送る。中身は 78 バイトで、seq は 1001 から始まる。',
				'Web の機械は ack=1079 で受け取りを返し、頁を送り返す。',
				'番号が中身のバイト数だけ進むので、抜けがあれば分かる。'
			],
			facts: [
				{ k: '要求', v: 'GET / （78 B）' },
				{ k: '受け取りの返事', v: 'ack=1079（1001 + 78）' },
				{ k: '答え', v: 'HTTP/1.1 200 OK' }
			],
			scene: [
				{ op: 'move', from: 'cl', to: 'sv', payload: 'GET /', kind: 'data' },
				{ op: 'move', from: 'sv', to: 'cl', payload: '200 OK', kind: 'data' },
				{ op: 'change', id: 'cl', k: '受け取った頁', v: '1 件' }
			],
			log: {
				t: '40ms',
				from: SV,
				to: CL,
				kind: 'DATA',
				info: '頁を受け取った（ack=1079）',
				size: '1.2 KB'
			}
		},
		{
			n: 6,
			title: 'FIN で閉じる',
			lead: '終わりも、印を送り合って閉じる',
			body: [
				'PC は FIN（終わりの印）を送り、Web の機械は ACK で受け取りを返す。',
				'Web の機械も FIN を送り、PC が ACK を返して閉じる。',
				'4 回のやり取りの後、両方とも接続を手放す。'
			],
			facts: [
				{ k: '閉じる印', v: 'FIN → ACK → FIN → ACK' },
				{ k: 'やり取りの数', v: '4' },
				{ k: '最後の状態', v: 'CLOSED' }
			],
			scene: [
				{ op: 'move', from: 'cl', to: 'sv', payload: 'FIN', kind: 'fin' },
				{ op: 'move', from: 'sv', to: 'cl', payload: 'FIN+ACK', kind: 'fin' },
				{ op: 'change', id: 'cl', k: '状態', v: 'CLOSED' },
				{ op: 'change', id: 'sv', k: '状態', v: 'LISTEN' }
			],
			log: { t: '60ms', from: CL, to: SV, kind: 'FIN', info: '接続を閉じた。Web は次を待つ' }
		}
	],
	example: {
		intro: '接続の初めから終わりまでの印と番号（seq・ack は例の値）',
		lines: [
			'  0ms  PC  → Web  SYN      seq=1000',
			' 10ms  Web → PC   SYN+ACK  seq=5000 ack=1001',
			' 20ms  PC  → Web  ACK      seq=1001 ack=5001',
			' 30ms  PC  → Web  GET /    seq=1001 (78 B)',
			' 40ms  Web → PC   200 OK   ack=1079',
			' 60ms  PC  → Web  FIN'
		]
	},
	practice: {
		goal: 'PC が Web の機械に接続して頁を取り、閉じるまでを、起きる順に並べる',
		form: 'order',
		setup: {
			cards: [
				{ id: 'ack', text: 'PC が ACK ack=5001 を返す' },
				{ id: 'data', text: 'PC が GET / を送る' },
				{ id: 'listen', text: 'Web の機械が 80 番で待ち受ける' },
				{ id: 'fin', text: 'PC が FIN を送る' },
				{ id: 'synack', text: 'Web の機械が SYN+ACK seq=5000 ack=1001 を返す' },
				{ id: 'syn', text: 'PC が SYN seq=1000 を送る' }
			]
		},
		success: { orders: [['listen', 'syn', 'synack', 'ack', 'data', 'fin']] },
		mistakes: [
			{
				when: 'SYN+ACK を SYN より前に置いた',
				why: 'SYN+ACK は、届いた SYN への返事だ。SYN が届く前には返せない',
				next: 'PC の SYN を先に置き、その直後に Web の SYN+ACK を置く',
				match: 'synack<syn'
			},
			{
				when: 'GET / を ACK より前に置いた',
				why: '3 回のやり取りが終わるまで接続はできていない。データは ESTABLISHED の後で運ぶ',
				next: 'SYN → SYN+ACK → ACK の 3 枚の後に、GET / を置く',
				match: 'data<ack'
			},
			{
				when: 'SYN を待ち受けより前に置いた',
				why: '待ち受けていない口に SYN が届くと、断りの印（RST）が返り、接続できない',
				next: 'Web の機械が 80 番で待ち受ける札を、一番上に置く',
				match: 'syn<listen'
			}
		]
	},
	check: [
		{ ask: '始めの 3 回', how: 'SYN → SYN+ACK → ACK の順に並ぶ' },
		{ ask: 'ack の意味', how: 'ack=1001 は「次は 1001 番から」の意味' },
		{ ask: 'データを運べる時', how: '両方が ESTABLISHED になった後' }
	]
};
