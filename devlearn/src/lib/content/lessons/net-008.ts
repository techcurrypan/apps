// net-008 状態コードとヘッダ（shell 模擬。世界 net）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物（Ubuntu 24.04、curl 8.5.0）の記録
// tools-real/recorded/net-008-status.json と一字ずつ比べてある（端末に出すときの見出しの太字と押せる印も同じ。画面は飾りとして描く）。
// 場面：店の Web（shop.example.com）を作り替えた。古い頁 /old は /new に移し、/error は壊れている。
// 経過時刻 t は最初の curl を打った時を 0s とし、1 行 1 分で進む（Date の行と同じ）。
import type { Lesson } from '../../lesson/types.ts';

const ME = 'curl（devbox）';
const WEB = 'Web shop.example.com';

export const net008: Lesson = {
	id: 'net-008',
	field: 'net',
	level: 2,
	title: '状態コードとヘッダ',
	goal: '状態コードとヘッダから、応答に何が起きたかを判断することができる',
	prereq: ['net-007'],
	related: ['ci-004'],
	next: ['net-013'],
	explain: [
		{
			n: 1,
			title: '200 の応答',
			lead: 'curl -i は、応答の見出しと本体を合わせて出す',
			body: [
				'curl -i http://shop.example.com/ の 1 行目は HTTP/1.1 200 OK だ。',
				'状態コードは 3 桁で、頭の 1 桁が大まかな結果を表す。',
				'2 で始まれば「頼みどおりにできた」だ。'
			],
			facts: [
				{ k: '1 行目', v: 'HTTP/1.1 200 OK' },
				{ k: '頭の 1 桁', v: '2xx = うまくいった' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: 'curl -i', at: [0, 1] },
				{ op: 'appear', id: 'web', label: WEB, sub: '192.0.2.80', at: [3, 1] },
				{ op: 'move', from: 'web', to: 'me', payload: '200 OK', kind: 'ok' }
			],
			log: { t: '0s', from: WEB, to: ME, kind: '200', info: '/ は 200 OK' }
		},
		{
			n: 2,
			title: '301 と Location',
			lead: '3 で始まれば「別の場所へ行け」',
			body: [
				'/old は HTTP/1.1 301 Moved Permanently を返す。ずっと移った、の意味だ。',
				'行き先は見出しの Location: http://shop.example.com/new に書いてある。',
				'curl は既定では付いて行かず、-L を付けると Location の先を取り直す。'
			],
			facts: [
				{ k: '/old の 1 行目', v: 'HTTP/1.1 301 Moved Permanently' },
				{ k: 'Location', v: 'http://shop.example.com/new' },
				{ k: 'curl -L の本体', v: '<title>new</title>' }
			],
			scene: [
				{ op: 'appear', id: 'new', label: '/new', sub: '移った先', at: [2, 0] },
				{ op: 'move', from: 'web', to: 'me', payload: '301 → /new', kind: 'redirect' },
				{ op: 'move', from: 'me', to: 'new', payload: 'GET /new（-L）', kind: 'request' }
			],
			log: { t: '60s', from: WEB, to: ME, kind: '301', info: '/old は /new に移った' }
		},
		{
			n: 3,
			title: '404',
			lead: '4 で始まれば、頼んだ側の誤り',
			body: [
				'/missing は HTTP/1.1 404 Not Found を返す。その場所に頁が無い。',
				'4xx は、頼み方（場所・権限・書き方）を直せば通る見込みがある。',
				'本体の <p>no such page</p> は、人に見せるための添え書きだ。'
			],
			facts: [
				{ k: '/missing の 1 行目', v: 'HTTP/1.1 404 Not Found' },
				{ k: '頭の 1 桁', v: '4xx = 頼んだ側の誤り' }
			],
			scene: [
				{ op: 'appear', id: 'miss', label: '/missing', sub: '無い', at: [2, 2] },
				{ op: 'move', from: 'web', to: 'me', payload: '404', kind: 'client' }
			],
			log: { t: '120s', from: WEB, to: ME, kind: '404', info: '/missing は無い' }
		},
		{
			n: 4,
			title: '500',
			lead: '5 で始まれば、Web の側の誤り',
			body: [
				'/error は HTTP/1.1 500 Internal Server Error を返す。',
				'頼み方は正しくても、Web の中の処理が失敗した。',
				'5xx は、頼む側が直しても通らない。Web の側の記録を調べる。'
			],
			facts: [
				{ k: '/error の 1 行目', v: 'HTTP/1.1 500 Internal Server Error' },
				{ k: '頭の 1 桁', v: '5xx = Web の側の誤り' }
			],
			scene: [
				{ op: 'appear', id: 'err', label: '/error', sub: '壊れている', at: [3, 2] },
				{ op: 'move', from: 'web', to: 'me', payload: '500', kind: 'server' }
			],
			log: { t: '180s', from: WEB, to: ME, kind: '500', info: '/error は Web の中で失敗した' },
			why: '誰が直すべきかを 1 桁目で分けておくと、受け取った側がまず何を調べるかを決められる'
		},
		{
			n: 5,
			title: 'Content-Type',
			lead: '本体が何の形かを、見出しで知らせる',
			body: [
				'/ の Content-Type は text/html; charset=utf-8 だ。',
				'text/html は頁、charset=utf-8 は字の符号の決まりを表す。',
				'受け取る側は、この見出しを見て本体の読み方を決める。'
			],
			facts: [
				{ k: 'Content-Type', v: 'text/html; charset=utf-8' },
				{ k: '字の符号', v: 'utf-8' }
			],
			scene: [
				{ op: 'change', id: 'me', k: 'Content-Type', v: 'text/html' },
				{ op: 'highlight', id: 'web' }
			],
			log: { t: '240s', from: WEB, to: ME, kind: 'header', info: '本体は utf-8 の HTML' }
		},
		{
			n: 6,
			title: '長さと本体',
			lead: '空の行の後の本体の長さが、Content-Length',
			body: [
				'/ の Content-Length は 51 で、本体の 3 行は 51 バイトだ。',
				'curl -I は見出しだけを取り、本体は取らない。',
				"curl -s -o /dev/null -w '%{http_code}\\n' は、状態コードだけを出す。"
			],
			facts: [
				{ k: 'Content-Length', v: '51' },
				{ k: 'curl -I', v: '見出しだけ' },
				{ k: "-w '%{http_code}\\n' で /missing", v: '404' }
			],
			scene: [
				{ op: 'change', id: 'me', k: '本体', v: '51 B' },
				{ op: 'change', id: 'miss', k: '状態コード', v: '404' }
			],
			log: { t: '300s', from: ME, to: ME, kind: 'cmd', info: '状態コードだけを出した：404' }
		}
	],
	example: {
		intro: '4 つの場所に要求し、状態コードと見出しを見比べた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ curl -i http://shop.example.com/',
			'HTTP/1.1 200 OK',
			'Server: yorozu-web/1.0',
			'Date: Tue, 10 Nov 2026 00:00:00 GMT',
			'Content-Type: text/html; charset=utf-8',
			'Cache-Control: no-cache',
			'Content-Length: 51',
			'',
			'<!doctype html>',
			'<title>shop</title>',
			'<p>welcome</p>',
			'$ curl -i http://shop.example.com/old',
			'HTTP/1.1 301 Moved Permanently',
			'Server: yorozu-web/1.0',
			'Date: Tue, 10 Nov 2026 00:01:00 GMT',
			'Content-Type: text/html; charset=utf-8',
			'Location: http://shop.example.com/new',
			'Content-Length: 53',
			'',
			'<!doctype html>',
			'<title>moved</title>',
			'<p>see /new</p>',
			'$ curl -L http://shop.example.com/old',
			'<!doctype html>',
			'<title>new</title>',
			'<p>moved here</p>',
			'$ curl -i http://shop.example.com/missing',
			'HTTP/1.1 404 Not Found',
			'Server: yorozu-web/1.0',
			'Date: Tue, 10 Nov 2026 00:03:00 GMT',
			'Content-Type: text/html; charset=utf-8',
			'Content-Length: 61',
			'',
			'<!doctype html>',
			'<title>not found</title>',
			'<p>no such page</p>',
			'$ curl -I http://shop.example.com/error',
			'HTTP/1.1 500 Internal Server Error',
			'Server: yorozu-web/1.0',
			'Date: Tue, 10 Nov 2026 00:04:00 GMT',
			'Content-Type: text/html; charset=utf-8',
			'Content-Length: 65',
			'',
			"$ curl -s -o /dev/null -w '%{http_code}\\n' http://shop.example.com/missing",
			'404'
		]
	},
	practice: {
		goal: '古い場所 /old が移った先の頁を、curl で 1 回で取る（本体だけを出す）',
		tool: { name: 'shell', mode: 'mock' },
		setup: { world: 'net' },
		success: { output: '<!doctype html>\n<title>new</title>\n<p>moved here</p>\n' },
		mistakes: [
			{
				when: '-i や -I を付けて、見出しも出した',
				why: '見出しの行も出力に混ざり、頁の中身だけにならない（-I は本体を取らない）',
				next: '本体だけを出すので、curl -L http://shop.example.com/old と打つ',
				match: 'Moved Permanently'
			},
			{
				when: '-L を付けずに /old を取った',
				why: '301 の本体は「移った」の添え書きだけだ。curl は既定では Location の先へ行かない',
				next: '-L を付けて、curl -L http://shop.example.com/old と打つ',
				match: '<title>moved</title>'
			},
			{
				when: '場所を打ち誤った',
				why: '404 は、その場所に頁が無いという答えだ。Web は正しく動いている',
				next: '場所を /old と見直す',
				match: '<title>not found</title>'
			}
		]
	},
	check: [
		{ ask: '移った頁', how: '/old は 301 で、Location は http://shop.example.com/new' },
		{ ask: '誰の誤りか', how: '404 は頼んだ側、500 は Web の側' },
		{ ask: '本体の形', how: 'Content-Type: text/html; charset=utf-8' }
	]
};
