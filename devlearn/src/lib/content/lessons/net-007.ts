// net-007 HTTP のやり取り（shell 模擬。世界 net）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物（Ubuntu 24.04、curl 8.5.0）の記録
// tools-real/recorded/net-007-http.json と一字ずつ比べてある。
// 場面：devbox（192.0.2.10）から、店の Web（shop.example.com = 192.0.2.80）の頁を curl -v で取る。
// 経過時刻 t は curl を打った時を 0ms とした。往復の時間は説明のための例。
import type { Host, Lesson } from '../../lesson/types.ts';
import { getPacket, okPacket, synPacket } from '../inside/net.ts';

// 中身の板の OS の中。pid とつながりの番号は例の値（ステップをまたいで同じ）
const bash = { id: 'bash', depth: 0, what: '-bash', state: 'pid 2140' } as const;
const curl = (state: string) =>
	({ id: 'curl', depth: 1, what: 'curl -v http://shop.example.com/', state }) as const;
const csock = (state: string, tone?: 'ok' | 'warn') =>
	({
		id: 'csock',
		depth: 2,
		what: 'TCP 192.0.2.10:52814 → 192.0.2.80:80',
		state,
		...(tone ? { tone } : {})
	}) as const;
const web = {
	id: 'web',
	depth: 0,
	what: 'yorozu-web',
	state: 'pid 801 ・ LISTEN 0.0.0.0:80'
} as const;
const ssock = (state: string) =>
	({ id: 'ssock', depth: 1, what: 'TCP 192.0.2.80:80 ← 192.0.2.10:52814', state }) as const;
const devbox = (...rows: Host['rows']): Host => ({
	name: 'devbox',
	town: '町長の机',
	addr: '192.0.2.10',
	rows
});
const shop = (...rows: Host['rows']): Host => ({
	name: 'Web',
	town: '店の窓口',
	addr: '192.0.2.80',
	rows
});

const ME = 'curl（devbox）';
const WEB = 'Web 192.0.2.80:80';

export const net007: Lesson = {
	id: 'net-007',
	field: 'net',
	level: 1,
	title: 'HTTP のやり取り',
	goal: 'curl -v で、HTTP の要求と応答の中身を読むことができる',
	prereq: ['net-004'],
	related: ['prg-008', 'prg-012'],
	next: ['net-008', 'net-009'],
	explain: [
		{
			n: 1,
			title: 'curl を打つ',
			lead: 'curl は URL を受け取り、頁の中身を端末に出す',
			town: '町長が机で、店の頁を取ってきてと頼みを書く。',
			work: 'curl -v で、裏のやり取りを見ながら頁を取る',
			inside: {
				hosts: [devbox(bash, curl('pid 2187 ・ 名前を引いている')), shop(web)]
			},
			body: [
				'curl http://shop.example.com/ は、頁の中身（本体）の 3 行だけを出す。',
				'-v（詳しく）を付けると、裏で交わした要求と応答も出る。',
				'-v の行は標準エラーに出るので、本体だけをファイルに分けられる。'
			],
			facts: [
				{ k: '打った物', v: 'curl -v http://shop.example.com/' },
				{ k: '本体の 2 行目', v: '<title>shop</title>' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: '192.0.2.10', at: [0, 1] },
				{ op: 'change', id: 'me', k: 'URL', v: 'http://shop.example.com/' }
			],
			log: { t: '0ms', from: ME, to: ME, kind: 'cmd', info: 'curl -v http://shop.example.com/' }
		},
		{
			n: 2,
			title: '接続する',
			lead: '* の行は、curl 自身の動きの知らせ',
			town: '店の窓口と、話せる回線をつなぐ。',
			work: '接続できないときは * Trying の行で止まる。口と番号を確かめる',
			ask: {
				q: '名前が番号に変わった。次に curl は何をする？',
				opts: [
					'192.0.2.80 の 80 番へ、TCP の接続を申し込む',
					'すぐに GET / の文字を送る',
					'もう一度 DNS に名前を聞く'
				],
				a: 0,
				why: 'HTTP の文字は TCP の接続の上を流れる。先に接続（SYN）を作る'
			},
			inside: {
				packet: synPacket(),
				hosts: [
					devbox(bash, curl('pid 2187'), csock('ESTABLISHED', 'ok')),
					shop(web, ssock('ESTABLISHED'))
				],
				logs: [
					{ t: '0.4ms', src: 'curl', text: '* IPv4: 192.0.2.80' },
					{ t: '0.4ms', src: 'curl', text: '*   Trying 192.0.2.80:80...' },
					{
						t: '0.5ms',
						src: 'tcpdump',
						text: '09:01:00.000412 IP 192.0.2.10.52814 > 192.0.2.80.80: Flags [S], seq 3121694311, win 64240, length 0'
					},
					{ t: '0.9ms', src: 'curl', text: '* Connected to shop.example.com (192.0.2.80) port 80' }
				]
			},
			body: [
				'* IPv4: 192.0.2.80 で、名前が番号に変わったと分かる。',
				'* Trying 192.0.2.80:80... の後、* Connected で TCP の接続ができた。',
				'http:// の URL は、番号を書かなければ 80 番に行く。'
			],
			facts: [
				{ k: '名前の答え', v: '* IPv4: 192.0.2.80' },
				{ k: '接続', v: '* Connected to shop.example.com (192.0.2.80) port 80' }
			],
			scene: [
				{ op: 'appear', id: 'web', label: WEB, sub: 'yorozu-web/1.0', at: [3, 1] },
				{ op: 'move', from: 'me', to: 'web', payload: 'TCP 接続', kind: 'tcp' }
			],
			log: { t: '1ms', from: ME, to: WEB, kind: 'TCP', info: 'port 80 に接続した' }
		},
		{
			n: 3,
			title: '要求の行',
			lead: '> の行は、curl が送った物。1 行目が要求の行',
			town: '注文書の 1 行目に「品書きをください」と書いて渡す。',
			work: 'curl -X POST で方法を変えられる。-v で要求の行を確かめる',
			inside: {
				packet: getPacket(),
				hosts: [
					devbox(bash, curl('pid 2187 ・ 応答を待つ'), csock('ESTABLISHED ・ 79 B 送った', 'ok')),
					shop(web, ssock('ESTABLISHED ・ GET / を読んだ'))
				],
				logs: [
					{ t: '1.0ms', src: 'curl', text: '> GET / HTTP/1.1' },
					{
						t: '1.2ms',
						src: 'tcpdump',
						text: '09:01:00.001208 IP 192.0.2.10.52814 > 192.0.2.80.80: Flags [P.], seq 1:80, ack 1, win 502, length 79'
					}
				]
			},
			body: [
				'> GET / HTTP/1.1 は「/ の頁をくれ、話し方は HTTP/1.1」の意味だ。',
				'GET は取る、/ は場所（パス）だ。',
				'要求は人が読める文字で書かれ、行の終わりは CR LF の 2 字だ。'
			],
			facts: [
				{ k: '要求の行', v: 'GET / HTTP/1.1' },
				{ k: '方法', v: 'GET（取る）' },
				{ k: '場所', v: '/' }
			],
			scene: [
				{ op: 'appear', id: 'req', label: '要求', sub: 'GET / HTTP/1.1', at: [1, 0] },
				{ op: 'move', from: 'me', to: 'web', payload: 'GET /', kind: 'request' }
			],
			log: { t: '1ms', from: ME, to: WEB, kind: 'HTTP', info: 'GET / HTTP/1.1', size: '133 B' }
		},
		{
			n: 4,
			title: '要求のヘッダ',
			lead: '要求の行の下に、名前: 値 の添え書きが続く',
			town: '注文書に宛名（Host）と、頼んだ人の名乗りを添える。',
			work: 'curl -H "Host: 名前" で宛名を変え、同じ機械の別の場所を試す',
			inside: {
				logs: [
					{ t: '1.2ms', src: 'curl', text: '> Host: shop.example.com' },
					{ t: '1.2ms', src: 'curl', text: '> User-Agent: curl/8.5.0' },
					{ t: '1.2ms', src: 'curl', text: '> Accept: */*' }
				]
			},
			body: [
				'> Host: shop.example.com は、どの名前の場所に宛てたかを示す。',
				'User-Agent: curl/8.5.0 は送り手の名乗り、Accept: */* は何でも受けるの意味だ。',
				'空の行 > で、要求が終わったと知らせる。'
			],
			facts: [
				{ k: 'Host', v: 'shop.example.com' },
				{ k: 'User-Agent', v: 'curl/8.5.0' },
				{ k: 'Accept', v: '*/*' }
			],
			scene: [
				{ op: 'change', id: 'req', k: 'Host', v: 'shop.example.com' },
				{ op: 'change', id: 'req', k: 'User-Agent', v: 'curl/8.5.0' }
			],
			log: { t: '1ms', from: ME, to: WEB, kind: 'HTTP', info: 'Host: shop.example.com を添えた' },
			why: '1 つの番号の機械が、名前の違う場所をいくつも受け持つので、どの名前宛てかを Host で知らせる'
		},
		{
			n: 5,
			title: '応答の行',
			lead: '< の行は、Web から返った物。1 行目が状態',
			town: '店から「承知した（200）」の返事と、品物の説明が届く。',
			work: 'curl -I で頭だけを取り、状態と Server を素早く見る',
			ask: {
				q: '要求が届いた。次に Web から何が返る？',
				opts: [
					'状態の行と頭、空の行、そして本体',
					'本体の 3 行だけ',
					'何も返らない（届いたら終わり）'
				],
				a: 0,
				why: '応答も要求と同じ形で、状態の行・頭・空の行・本体の順に並ぶ'
			},
			inside: {
				packet: okPacket(),
				hosts: [
					devbox(
						bash,
						curl('pid 2187 ・ 本体を書き出す'),
						csock('ESTABLISHED ・ 216 B 受けた', 'ok')
					),
					shop(web, ssock('ESTABLISHED ・ 200 を返した'), {
						id: 'page',
						depth: 1,
						what: '/srv/shop/index.html',
						state: '読んだ 51 B'
					})
				],
				logs: [
					{
						t: '2.0ms',
						src: 'tcpdump',
						text: '09:01:00.002031 IP 192.0.2.80.80 > 192.0.2.10.52814: Flags [P.], seq 1:217, ack 80, win 509, length 216'
					},
					{ t: '2.0ms', src: 'curl', text: '< HTTP/1.1 200 OK' },
					{ t: '2.0ms', src: 'curl', text: '< Server: yorozu-web/1.0' },
					{ t: '2.0ms', src: 'curl', text: '< Content-Length: 51' }
				]
			},
			body: [
				'< HTTP/1.1 200 OK は「うまくいった」の印だ。200 を状態コードと呼ぶ。',
				'続く Server: yorozu-web/1.0 は、Web の機械の名乗りだ。',
				'Content-Length: 51 は、この後の本体が 51 バイトという知らせだ。'
			],
			facts: [
				{ k: '応答の行', v: 'HTTP/1.1 200 OK' },
				{ k: 'Server', v: 'yorozu-web/1.0' },
				{ k: 'Content-Length', v: '51' }
			],
			scene: [
				{ op: 'appear', id: 'res', label: '応答', sub: '200 OK', at: [2, 2] },
				{ op: 'move', from: 'web', to: 'me', payload: '200 OK', kind: 'response' }
			],
			log: { t: '2ms', from: WEB, to: ME, kind: 'HTTP', info: 'HTTP/1.1 200 OK', size: '270 B' }
		},
		{
			n: 6,
			title: '応答の本体',
			lead: '空の行の後が、頁そのもの',
			town: '品物（頁）を受け取り、回線はしばらく開けておく。',
			work: 'curl -o file で本体だけをファイルに残す',
			inside: {
				hosts: [
					devbox(bash, { ...csock('TIME-WAIT ・ curl が終わり、閉じた', 'warn'), depth: 1 }),
					shop(web)
				],
				logs: [
					{ t: '2.1ms', src: 'curl', text: '* Connection #0 to host shop.example.com left intact' }
				]
			},
			body: [
				'< の空の行の後に、本体の 3 行 51 バイトが標準出力に出る。',
				'* Connection #0 … left intact は、接続を閉じずに残したの意味だ。',
				'名前の誤りは curl: (6)、待つ者のいない口は curl: (7) で止まる。'
			],
			facts: [
				{ k: '本体', v: '<!doctype html> / <title>shop</title> / <p>welcome</p>' },
				{ k: '名前の誤り', v: 'curl: (6) Could not resolve host' },
				{ k: '口の誤り', v: "curl: (7) … Couldn't connect to server" }
			],
			scene: [
				{ op: 'change', id: 'res', k: '本体', v: '51 B' },
				{ op: 'change', id: 'me', k: '受け取った頁', v: '<title>shop</title>' }
			],
			log: {
				t: '2ms',
				from: WEB,
				to: ME,
				kind: 'HTTP',
				info: '本体 51 B を受け取った',
				size: '51 B'
			}
		}
	],
	example: {
		intro: '頁を詳しく取り、誤った名前と口でも打った（模擬は本物の記録と比べ済み）',
		lines: [
			'$ curl http://shop.example.com/',
			'<!doctype html>',
			'<title>shop</title>',
			'<p>welcome</p>',
			'$ curl -v http://shop.example.com/',
			'<!doctype html>',
			'<title>shop</title>',
			'<p>welcome</p>',
			'* Host shop.example.com:80 was resolved.',
			'* IPv6: (none)',
			'* IPv4: 192.0.2.80',
			'*   Trying 192.0.2.80:80...',
			'* Connected to shop.example.com (192.0.2.80) port 80',
			'> GET / HTTP/1.1',
			'> Host: shop.example.com',
			'> User-Agent: curl/8.5.0',
			'> Accept: */*',
			'> ',
			'< HTTP/1.1 200 OK',
			'< Server: yorozu-web/1.0',
			'< Date: Tue, 10 Nov 2026 00:01:00 GMT',
			'< Content-Type: text/html; charset=utf-8',
			'< Cache-Control: no-cache',
			'< Content-Length: 51',
			'< ',
			'* Connection #0 to host shop.example.com left intact',
			'$ curl http://nosuch.example.com/',
			'curl: (6) Could not resolve host: nosuch.example.com',
			'$ curl http://192.0.2.80:8081/',
			"curl: (7) Failed to connect to 192.0.2.80 port 8081 after 0 ms: Couldn't connect to server"
		]
	},
	practice: {
		goal: 'curl -v で shop.example.com の応答を読み、Web の名乗り（Server の値）を server.txt に書く',
		tool: { name: 'shell', mode: 'mock' },
		commands: ['curl', 'echo'],
		setup: { world: 'net' },
		success: { files: { 'server.txt': 'yorozu-web/1.0\n' } },
		mistakes: [
			{
				when: '名前を打ち誤った',
				why: 'その名前は DNS に無く、curl は番号を決められなかった（6 は名前の誤りの番号）',
				next: 'curl -v http://shop.example.com/ と打ち直す',
				match: 'Could not resolve host'
			},
			{
				when: '80 番でない口を書いた',
				why: 'Web の機械はその口で待ち受けていないので、接続を断られた（7 は接続の誤りの番号）',
				next: ':8080 などを消し、http://shop.example.com/ と書く',
				match: "Couldn't connect to server"
			}
		]
	},
	check: [
		{ ask: '要求の行', how: '> GET / HTTP/1.1' },
		{ ask: 'どの名前宛てか', how: '> Host: shop.example.com' },
		{ ask: '応答の状態と名乗り', how: '< HTTP/1.1 200 OK と < Server: yorozu-web/1.0' }
	],
	map: {
		nodes: {
			me: { icon: 'laptop', town: '町長の机', addr: '192.0.2.10' },
			web: { icon: 'server', town: '店の窓口', addr: '192.0.2.80' },
			req: { icon: 'file', town: '注文書' },
			res: { icon: 'file', town: '返事と品物' }
		},
		zones: [
			{ label: 'devbox の中', note: '192.0.2.10', members: ['me', 'req'] },
			{ label: '店の Web の中', note: '192.0.2.80', members: ['web', 'res'] }
		],
		links: [{ a: 'me', b: 'web', label: '頁を頼む・届ける', dir: 'both' }]
	}
};
