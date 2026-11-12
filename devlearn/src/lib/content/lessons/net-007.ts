// net-007 HTTP のやり取り（shell 模擬。世界 net）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物（Ubuntu 24.04、curl 8.5.0）の記録
// tools-real/recorded/net-007-http.json と一字ずつ比べてある。
// 場面：devbox（192.0.2.10）から、店の Web（shop.example.com = 192.0.2.80）の頁を curl -v で取る。
// 経過時刻 t は curl を打った時を 0ms とした。往復の時間は説明のための例。
import type { Lesson } from '../../lesson/types.ts';

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
			log: { t: '1ms', from: ME, to: WEB, kind: 'HTTP', info: 'GET / HTTP/1.1', size: '78 B' }
		},
		{
			n: 4,
			title: '要求のヘッダ',
			lead: '要求の行の下に、名前: 値 の添え書きが続く',
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
			log: { t: '2ms', from: WEB, to: ME, kind: 'HTTP', info: 'HTTP/1.1 200 OK', size: '170 B' }
		},
		{
			n: 6,
			title: '応答の本体',
			lead: '空の行の後が、頁そのもの',
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
	]
};
