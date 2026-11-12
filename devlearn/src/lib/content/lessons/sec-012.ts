// sec-012 ログから攻撃を見つける（shell 模擬）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物（Ubuntu 24.04、GNU grep 3.11・coreutils 9.4）の記録
// tools-real/recorded/sec-012-log.json と一字ずつ比べてある。
// 場面：店の Web の 2026-11-10 09:00〜09:02 のアクセスのログ access.log（10 行）を、朝の見回りで読む。
// 経過時刻 t はログを開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

export const ACCESS_LOG = [
	'192.0.2.10 - - [10/Nov/2026:09:00:01 +0900] "GET /index.html HTTP/1.1" 200 512',
	'198.51.100.7 - - [10/Nov/2026:09:00:03 +0900] "POST /login HTTP/1.1" 401 128',
	'198.51.100.7 - - [10/Nov/2026:09:00:04 +0900] "POST /login HTTP/1.1" 401 128',
	'192.0.2.10 - - [10/Nov/2026:09:00:09 +0900] "GET /style.css HTTP/1.1" 200 2048',
	'198.51.100.7 - - [10/Nov/2026:09:00:05 +0900] "POST /login HTTP/1.1" 401 128',
	'203.0.113.5 - - [10/Nov/2026:09:00:20 +0900] "POST /login HTTP/1.1" 401 128',
	'198.51.100.7 - - [10/Nov/2026:09:00:06 +0900] "POST /login HTTP/1.1" 200 256',
	'203.0.113.5 - - [10/Nov/2026:09:01:02 +0900] "GET /admin HTTP/1.1" 403 64',
	'192.0.2.11 - - [10/Nov/2026:09:01:30 +0900] "GET /index.html HTTP/1.1" 200 512',
	'203.0.113.5 - - [10/Nov/2026:09:02:00 +0900] "GET /../../etc/passwd HTTP/1.1" 400 0',
	''
].join('\n');

const LOG = 'access.log';
const ME = '見回りの係';

export const sec012: Lesson = {
	id: 'sec-012',
	field: 'sec',
	level: 3,
	title: 'ログから攻撃を見つける',
	goal: 'アクセスのログを grep で絞り、攻撃の跡を見つけることができる',
	prereq: ['lnx-006', 'net-008'],
	related: ['sec-009'],
	next: [],
	explain: [
		{
			n: 1,
			title: 'アクセスのログ',
			lead: 'Web は、受けた要求を 1 件 1 行で書き残す',
			body: [
				'access.log には、2 分の間に受けた要求が 10 行ある（wc -l で 10）。',
				'1 行が 1 回の要求で、誰が・いつ・何を頼み・どう答えたかが並ぶ。',
				'10 行なら目で読めるが、本物の店では 1 日に何十万行にもなる。'
			],
			facts: [
				{ k: 'wc -l access.log', v: '10 access.log' },
				{ k: '期間', v: '09:00:01〜09:02:00' }
			],
			scene: [
				{ op: 'appear', id: 'log', label: LOG, sub: '10 行', at: [1, 1] },
				{ op: 'appear', id: 'me', label: ME, sub: '朝の見回り', at: [0, 1] }
			],
			log: { t: '0s', from: ME, to: LOG, kind: 'open', info: '10 行のログを開いた' }
		},
		{
			n: 2,
			title: '1 行の並び',
			lead: '空白で区切ると、1 番目が送り元、9 番目が状態コード',
			body: [
				'2 行目の 198.51.100.7 … "POST /login HTTP/1.1" 401 128 を空白で区切る。',
				'1 番目が送り元、4 番目が時刻、7 番目が場所、9 番目が状態コードだ。',
				"cut -d ' ' -f 1,9 で、送り元と状態コードだけを並べられる。"
			],
			facts: [
				{ k: '1 番目', v: '198.51.100.7（送り元）' },
				{ k: '7 番目', v: '/login（場所）' },
				{ k: '9 番目', v: '401（状態コード）' }
			],
			scene: [
				{ op: 'change', id: 'log', k: '区切り', v: '空白・1=送り元・9=状態' },
				{ op: 'appear', id: 'cut', label: 'cut', sub: "-d ' ' -f", at: [2, 0] }
			],
			log: { t: '30s', from: LOG, to: 'cut', kind: 'parse', info: '1 番目と 9 番目を取り出せる' }
		},
		{
			n: 3,
			title: '401 の行を絞る',
			lead: '合言葉の誤りは 401。grep で、その行だけを残す',
			body: [
				"grep ' 401 ' access.log は 4 行を返す。全て POST /login だ。",
				'前後に空白を付けて探すのは、時刻や大きさの中の 401 を拾わないためだ。',
				"grep -c ' 401 ' で数だけを出すと 4 になる。"
			],
			facts: [
				{ k: "grep ' 401 '", v: '4 行' },
				{ k: '場所', v: '全て POST /login' }
			],
			scene: [
				{ op: 'appear', id: 'grep', label: 'grep', sub: "' 401 '", at: [2, 1] },
				{ op: 'move', from: 'log', to: 'grep', payload: '10 行', kind: 'pipe' },
				{ op: 'change', id: 'grep', k: '残った行', v: '4' }
			],
			log: { t: '60s', from: LOG, to: 'grep', kind: 'filter', info: '401 の行は 4 行' }
		},
		{
			n: 4,
			title: '送り元で数える',
			lead: 'cut・sort・uniq -c で、送り元ごとの回数にする',
			body: [
				"grep ' 401 ' access.log | cut -d ' ' -f 1 で、送り元だけの 4 行になる。",
				'sort で同じ送り元を隣に集め、uniq -c で隣り合う同じ行を数える。',
				'結果は 3 198.51.100.7 と 1 203.0.113.5 だ。'
			],
			facts: [
				{ k: '198.51.100.7', v: '3 回' },
				{ k: '203.0.113.5', v: '1 回' }
			],
			scene: [
				{ op: 'appear', id: 'count', label: 'sort | uniq -c', sub: '送り元ごと', at: [3, 1] },
				{ op: 'move', from: 'grep', to: 'count', payload: '送り元 4 行', kind: 'pipe' },
				{ op: 'change', id: 'count', k: '198.51.100.7', v: '3' }
			],
			log: {
				t: '90s',
				from: 'grep',
				to: 'sort | uniq -c',
				kind: 'count',
				info: '198.51.100.7 が 3 回'
			},
			why: 'uniq は隣り合う同じ行しかまとめないので、先に sort で同じ送り元を隣に集める'
		},
		{
			n: 5,
			title: '一つの送り元に集まる',
			lead: 'sort -rn と head で、最も多い送り元を 1 行で出す',
			body: [
				'sort -rn は行頭の数で大きい順に並べ、head -n 1 で一番上を残す。',
				'198.51.100.7 は 4 秒で 3 回失敗し、4 回目の 09:00:06 に 200 で入れた。',
				'合言葉を当てずっぽうに試し、当てた跡だ。この利用者の合言葉を替えさせる。'
			],
			facts: [
				{ k: '一番多い送り元', v: '      3 198.51.100.7' },
				{ k: '4 回目の行', v: '09:00:06 "POST /login" 200' }
			],
			scene: [
				{
					op: 'appear',
					id: 'attacker',
					label: '198.51.100.7',
					sub: '3 回失敗の後に成功',
					at: [4, 1]
				},
				{ op: 'move', from: 'count', to: 'attacker', payload: '一番多い', kind: 'found' }
			],
			log: {
				t: '120s',
				from: 'sort | uniq -c',
				to: '198.51.100.7',
				kind: 'found',
				info: '3 回失敗し 4 回目に入った'
			}
		},
		{
			n: 6,
			title: '時刻の並び',
			lead: 'もう一つの送り元は、別の手で探っている',
			body: [
				'403 と 400 の行を grep -E で絞り、送り元・場所・状態を出すと 2 行だ。',
				'203.0.113.5 が /admin（403）と /../../etc/passwd（400）を順に試している。',
				'管理の頁や、見せない場所のファイルを探る跡だ。送り元ごとに時刻で並べて読む。'
			],
			facts: [
				{ k: '09:01:02', v: '203.0.113.5 /admin 403' },
				{ k: '09:02:00', v: '203.0.113.5 /../../etc/passwd 400' }
			],
			scene: [
				{ op: 'appear', id: 'prober', label: '203.0.113.5', sub: '場所を探る', at: [4, 2] },
				{ op: 'change', id: 'prober', k: '試した場所', v: '/admin・/../../etc/passwd' }
			],
			log: {
				t: '150s',
				from: LOG,
				to: '203.0.113.5',
				kind: 'found',
				info: '/admin と /../../etc/passwd を試した'
			}
		}
	],
	example: {
		intro: '401 の行を絞り、送り元ごとに数え、ほかの探りも見つけた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ wc -l access.log',
			'10 access.log',
			"$ grep ' 401 ' access.log",
			'198.51.100.7 - - [10/Nov/2026:09:00:03 +0900] "POST /login HTTP/1.1" 401 128',
			'198.51.100.7 - - [10/Nov/2026:09:00:04 +0900] "POST /login HTTP/1.1" 401 128',
			'198.51.100.7 - - [10/Nov/2026:09:00:05 +0900] "POST /login HTTP/1.1" 401 128',
			'203.0.113.5 - - [10/Nov/2026:09:00:20 +0900] "POST /login HTTP/1.1" 401 128',
			"$ grep ' 401 ' access.log | cut -d ' ' -f 1 | sort | uniq -c | sort -rn",
			'      3 198.51.100.7',
			'      1 203.0.113.5',
			"$ grep -E ' (403|400) ' access.log | cut -d ' ' -f 1,7,9",
			'203.0.113.5 /admin 403',
			'203.0.113.5 /../../etc/passwd 400'
		]
	},
	practice: {
		goal: '合言葉の誤り（401）を最も多く出した送り元を、回数とともに 1 行だけ出す',
		tool: { name: 'shell', mode: 'mock' },
		setup: { files: { 'access.log': ACCESS_LOG } },
		success: { output: '      3 198.51.100.7\n' },
		mistakes: [
			{
				when: '401 で絞らずに、全ての行の送り元を数えた',
				why: '成功した行も数えたので、198.51.100.7 が 4 回になった。数えたいのは失敗だけだ',
				next: "先頭に grep ' 401 ' access.log | を置き、401 の行だけを数える",
				match: '      4 198.51.100.7'
			},
			{
				when: 'cut に -f を付けなかった',
				why: 'cut は、何番目を取り出すか（-f）が無いと動かない',
				next: "cut -d ' ' -f 1 と、1 番目を指す",
				match: 'you must specify a list'
			},
			{
				when: 'cut -f 0 と書いた',
				why: 'cut の番号は 1 から数える',
				next: '送り元は 1 番目なので -f 1 と書く',
				match: 'fields are numbered from 1'
			},
			{
				when: 'ファイルの名前を打ち誤った',
				why: 'その名前のファイルは無い',
				next: 'ls で名前を確かめ、access.log と書く',
				match: 'No such file or directory'
			}
		]
	},
	check: [
		{ ask: '401 の行の数', how: "grep -c ' 401 ' access.log が 4" },
		{ ask: 'uniq -c の前に sort する理由', how: 'uniq は隣り合う同じ行しかまとめない' },
		{ ask: '当てられた跡', how: '198.51.100.7 は 3 回の 401 の後に 200 で入った' }
	]
};
