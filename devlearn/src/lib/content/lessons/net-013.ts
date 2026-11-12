// net-013 HTTP のキャッシュ（shell 模擬。世界 net）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物（Ubuntu 24.04、curl 8.5.0）の記録
// tools-real/recorded/net-013-cache.json と一字ずつ比べてある。
// 場面：店の頁の見た目の決まり style.css（22 バイト）を、ブラウザが取って覚え、使い回す。
// 経過時刻 t は初めて取った時を 0s とした。期限の 1 時間を過ぎた後の行は、説明のための時刻。
import type { Lesson } from '../../lesson/types.ts';

const BR = 'ブラウザ';
const WEB = 'Web shop.example.com';
const BOX = '覚えた style.css';

export const net013: Lesson = {
	id: 'net-013',
	field: 'net',
	level: 3,
	title: 'HTTP のキャッシュ',
	goal: 'キャッシュのヘッダから、応答を使い回せるかを判断することができる',
	prereq: ['net-008'],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '初めての要求',
			lead: '初めは、Web から本体を丸ごと受け取る',
			body: [
				'curl -I で style.css を取ると、HTTP/1.1 200 OK が返る。',
				'Content-Length: 22 で、本体は 22 バイトだ。',
				'受け取った物を手元に覚えておくことを、キャッシュと呼ぶ。'
			],
			facts: [
				{ k: '1 行目', v: 'HTTP/1.1 200 OK' },
				{ k: 'Content-Length', v: '22' }
			],
			scene: [
				{ op: 'appear', id: 'br', label: BR, sub: 'devbox', at: [0, 1] },
				{ op: 'appear', id: 'web', label: WEB, sub: '192.0.2.80', at: [3, 1] },
				{ op: 'move', from: 'web', to: 'br', payload: '200 本体 22 B', kind: 'full' }
			],
			log: {
				t: '0s',
				from: WEB,
				to: BR,
				kind: '200',
				info: 'style.css を丸ごと受け取った',
				size: '22 B'
			}
		},
		{
			n: 2,
			title: 'Cache-Control',
			lead: '使い回してよい時間を、Web が見出しで決める',
			body: [
				'style.css の見出しは Cache-Control: max-age=3600 だ。',
				'3600 秒、つまり 1 時間は、尋ね直さずに使ってよいの意味だ。',
				'頁 / の方は Cache-Control: no-cache で、使う前に毎回確かめよの意味だ。'
			],
			facts: [
				{ k: 'style.css', v: 'Cache-Control: max-age=3600' },
				{ k: '/', v: 'Cache-Control: no-cache' }
			],
			scene: [
				{ op: 'appear', id: 'box', label: BOX, sub: 'max-age=3600', at: [1, 2] },
				{ op: 'change', id: 'box', k: '期限', v: '3600 秒' }
			],
			log: { t: '0s', from: BR, to: BOX, kind: 'store', info: '1 時間は使ってよいと覚えた' },
			why: '見た目の決まりは滅多に変わらないので、毎回運ぶより手元の物を使う方が速く、網も空く'
		},
		{
			n: 3,
			title: '期限内は使い回す',
			lead: '期限の中なら、Web に何も送らない',
			body: [
				'10 分後に同じ頁を開くと、3600 秒の期限の中なので、手元の物を使う。',
				'Web には要求が届かず、運ぶバイト数は 0 だ。',
				'Web の側で中身を替えても、期限の間は古い物が使われる。'
			],
			facts: [
				{ k: '経った時間', v: '600 秒（期限 3600 秒の中）' },
				{ k: '運んだ量', v: '0 B' }
			],
			scene: [
				{ op: 'move', from: 'box', to: 'br', payload: '手元から', kind: 'hit' },
				{ op: 'change', id: 'box', k: '残り', v: '3000 秒' }
			],
			log: {
				t: '600s',
				from: BOX,
				to: BR,
				kind: 'hit',
				info: '期限の中なので手元の物を使った',
				size: '0 B'
			}
		},
		{
			n: 4,
			title: '期限切れ',
			lead: '期限を過ぎたら、まだ使えるかを Web に確かめる',
			body: [
				'1 時間を過ぎると、覚えた物は「古いかもしれない」物になる。',
				'丸ごと取り直す前に、まだ同じかを Web に尋ねる。',
				'尋ねるには、覚えた物の印が要る。'
			],
			facts: [
				{ k: '経った時間', v: '3700 秒（期限を 100 秒過ぎた）' },
				{ k: '覚えた物の状態', v: '古いかもしれない' }
			],
			scene: [{ op: 'change', id: 'box', k: '残り', v: '期限切れ' }],
			log: { t: '3700s', from: BR, to: BOX, kind: 'stale', info: '期限を過ぎた' }
		},
		{
			n: 5,
			title: 'ETag で確かめる',
			lead: '中身の印 ETag を送り、「これと同じか」と尋ねる',
			body: [
				'初めの応答に ETag: "v1" があった。中身ごとに Web が付ける印だ。',
				'要求に If-None-Match: "v1" を添えると、「v1 と違えば送れ」の意味になる。',
				'curl では -H \'If-None-Match: "v1"\' で添える。'
			],
			facts: [
				{ k: '覚えた印', v: 'ETag: "v1"' },
				{ k: '添える見出し', v: 'If-None-Match: "v1"' }
			],
			scene: [
				{ op: 'change', id: 'box', k: 'ETag', v: '"v1"' },
				{ op: 'move', from: 'br', to: 'web', payload: 'If-None-Match: "v1"', kind: 'request' }
			],
			log: { t: '3700s', from: BR, to: WEB, kind: 'GET', info: 'If-None-Match: "v1" を添えた' }
		},
		{
			n: 6,
			title: '304 が返る',
			lead: '同じなら、本体の無い 304 が返る',
			body: [
				'答えは HTTP/1.1 304 Not Modified で、本体が無い。',
				'手元の物をそのまま使い、期限を 3600 秒に戻す。',
				'古い印 "v0" を送ると、違うので 200 と本体 22 バイトが返る。'
			],
			facts: [
				{ k: '"v1" を送った答え', v: 'HTTP/1.1 304 Not Modified' },
				{ k: '"v0" を送った答え', v: 'HTTP/1.1 200 OK（本体 22 B）' }
			],
			scene: [
				{ op: 'move', from: 'web', to: 'br', payload: '304（本体なし）', kind: 'notmod' },
				{ op: 'change', id: 'box', k: '残り', v: '3600 秒' }
			],
			log: {
				t: '3700s',
				from: WEB,
				to: BR,
				kind: '304',
				info: '304 Not Modified。手元の物を使い続ける',
				size: '0 B'
			}
		}
	],
	example: {
		intro: '初めて取り、印を添えて確かめ、古い印でも確かめた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ curl -I http://shop.example.com/style.css',
			'HTTP/1.1 200 OK',
			'Server: yorozu-web/1.0',
			'Date: Tue, 10 Nov 2026 00:00:00 GMT',
			'Content-Type: text/css',
			'Cache-Control: max-age=3600',
			'ETag: "v1"',
			'Content-Length: 22',
			'',
			'$ curl -I -H \'If-None-Match: "v1"\' http://shop.example.com/style.css',
			'HTTP/1.1 304 Not Modified',
			'Server: yorozu-web/1.0',
			'Date: Tue, 10 Nov 2026 00:01:00 GMT',
			'Cache-Control: max-age=3600',
			'ETag: "v1"',
			'',
			'$ curl -I -H \'If-None-Match: "v0"\' http://shop.example.com/style.css',
			'HTTP/1.1 200 OK',
			'Server: yorozu-web/1.0',
			'Date: Tue, 10 Nov 2026 00:02:00 GMT',
			'Content-Type: text/css',
			'Cache-Control: max-age=3600',
			'ETag: "v1"',
			'Content-Length: 22',
			'',
			"$ curl -s -o /dev/null -w '%{http_code}\\n' -H 'If-None-Match: \"v1\"' http://shop.example.com/style.css",
			'304'
		]
	},
	practice: {
		goal: '覚えた style.css（ETag "v1"）がまだ使えるかを Web に確かめ、状態コードだけを出す（-s -o /dev/null -w \'%{http_code}\\n\'）',
		tool: { name: 'shell', mode: 'mock' },
		setup: { world: 'net' },
		success: { output: '304\n' },
		mistakes: [
			{
				when: '印を添えずに、または違う印を添えて尋ねた',
				why: '200 は「違うので丸ごと送った」の答えだ。If-None-Match の印が今の ETag "v1" と合っていない',
				next: '-H \'If-None-Match: "v1"\' を添える。印は二重引用符ごと書く',
				match: '200\n'
			},
			{
				when: '場所を打ち誤った',
				why: '404 は、その場所に頁が無いという答えだ',
				next: '場所を /style.css と見直す',
				match: '404\n'
			},
			{
				when: '名前を打ち誤った',
				why: 'その名前は DNS に無く、curl は番号を決められなかった',
				next: 'http://shop.example.com/style.css と打ち直す',
				match: 'Could not resolve host'
			}
		]
	},
	check: [
		{ ask: '使い回せる時間', how: 'Cache-Control: max-age=3600 で 1 時間' },
		{ ask: '確かめる印', how: 'ETag: "v1" を If-None-Match で送る' },
		{ ask: '同じだったときの答え', how: '304 Not Modified で、本体が無い' }
	]
};
