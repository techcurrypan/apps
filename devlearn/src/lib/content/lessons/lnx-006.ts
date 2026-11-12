// lnx-006 grep で探す（shell 模擬）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物の bash（Ubuntu 24.04）の記録 tools-real/recorded/lnx-006-grep.json と一字ずつ比べてある。
// 場面：店の仕組みの記録 app.log（6 行）。障害の行を探す。経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const TERM = '端末';
const LOG = 'app.log';

const APP =
	'2026-11-10 09:00:01 INFO start\n2026-11-10 09:00:05 WARN slow response\n2026-11-10 09:01:00 ERROR db timeout\n2026-11-10 09:01:30 info retry\n2026-11-10 09:02:00 ERROR disk full\n2026-11-10 09:03:00 INFO done\n';

export const lnx006: Lesson = {
	id: 'lnx-006',
	field: 'lnx',
	level: 2,
	title: 'grep で探す',
	goal: 'grep と正規表現で、行を絞り込むことができる',
	prereq: ['lnx-005'],
	related: [],
	next: ['lnx-009'],
	explain: [
		{
			n: 1,
			title: 'ログを置く',
			lead: '6 行の記録。どの行に障害が出ているか',
			body: [
				'app.log には、日時・重さの印・中身の順で 6 行ある。',
				'重さの印は INFO（知らせ）・WARN（注意）・ERROR（失敗）だ。',
				'1 行だけ、小文字の info が混じっている。'
			],
			facts: [
				{ k: '行数', v: '6' },
				{ k: '1 行目', v: '2026-11-10 09:00:01 INFO start' }
			],
			scene: [
				{ op: 'appear', id: 'term', label: TERM, sub: 'learner@demo $', at: [0, 0] },
				{ op: 'appear', id: 'log', label: LOG, sub: '6 行', at: [2, 0] }
			],
			log: { t: '0s', from: TERM, to: LOG, kind: 'open', info: 'app.log は 6 行' }
		},
		{
			n: 2,
			title: 'grep で語を探す',
			lead: 'grep 語 ファイル は、その語を含む行だけを出す',
			body: [
				'grep ERROR app.log と打つ。grep は行を絞り込む命令だ。',
				'ERROR を含む 09:01:00 と 09:02:00 の 2 行だけが返る。',
				'含まない 4 行は出ない。'
			],
			facts: [
				{ k: 'コマンド', v: 'grep ERROR app.log' },
				{ k: '1 行目', v: '2026-11-10 09:01:00 ERROR db timeout' },
				{ k: '2 行目', v: '2026-11-10 09:02:00 ERROR disk full' }
			],
			scene: [
				{ op: 'appear', id: 'grep', label: 'grep', sub: 'ERROR', at: [1, 1] },
				{ op: 'move', from: 'log', to: 'grep', payload: '6 行', kind: 'grep' },
				{ op: 'move', from: 'grep', to: 'term', payload: '2 行', kind: 'stdout' }
			],
			log: { t: '8s', from: 'grep', to: TERM, kind: 'grep', info: 'ERROR の 2 行を出した' }
		},
		{
			n: 3,
			title: '-i で大小を無視',
			lead: 'grep は大文字と小文字を分ける。-i で分けなくする',
			body: [
				'grep info app.log は、小文字の info retry の 1 行しか返さない。',
				'grep -i info app.log と打つと、INFO の 2 行も返り 3 行になる。',
				'-i は ignore case、大小を無視するの略だ。'
			],
			facts: [
				{ k: 'grep info', v: '1 行' },
				{ k: 'grep -i info', v: '3 行' }
			],
			scene: [
				{ op: 'change', id: 'grep', k: '探す語', v: '-i info' },
				{ op: 'move', from: 'grep', to: 'term', payload: '3 行', kind: 'stdout' }
			],
			log: { t: '16s', from: 'grep', to: TERM, kind: 'grep', info: '-i で INFO も info も 3 行' }
		},
		{
			n: 4,
			title: '^ と $ で行の端',
			lead: '正規表現の ^ は行の頭、$ は行の終わりを表す',
			body: [
				'探す語には正規表現（文字の並びの型）を書ける。',
				"grep 'done$' app.log は、done で終わる 1 行だけを返す。",
				"grep '^2026' app.log | wc -l は、2026 で始まる行の数 6 を返す。"
			],
			facts: [
				{ k: "grep 'done$'", v: '2026-11-10 09:03:00 INFO done' },
				{ k: "grep '^2026' | wc -l", v: '6' }
			],
			scene: [
				{ op: 'change', id: 'grep', k: '探す語', v: "'done$'" },
				{ op: 'move', from: 'grep', to: 'term', payload: '1 行', kind: 'stdout' }
			],
			log: { t: '25s', from: 'grep', to: TERM, kind: 'grep', info: 'done で終わる 1 行' },
			why: '語がどこにあってもよいと、done を中に含む別の行まで拾う。端を決めると狙いが絞れる'
		},
		{
			n: 5,
			title: '-v で除く',
			lead: '-v は、語を含まない行を出す',
			body: [
				'grep -v INFO app.log と打つ。-v は逆にするの意味だ。',
				'INFO の 2 行が除かれ、残りの 4 行が返る。',
				'小文字の info retry は INFO と違う語なので残る。'
			],
			facts: [
				{ k: 'コマンド', v: 'grep -v INFO app.log' },
				{ k: '返った行数', v: '4' },
				{ k: '残った行', v: 'WARN・ERROR・info・ERROR' }
			],
			scene: [
				{ op: 'change', id: 'grep', k: '探す語', v: '-v INFO' },
				{ op: 'move', from: 'grep', to: 'term', payload: '4 行', kind: 'stdout' }
			],
			log: { t: '33s', from: 'grep', to: TERM, kind: 'grep', info: 'INFO を除いた 4 行' }
		},
		{
			n: 6,
			title: '-c で数える',
			lead: '-c は、当たった行の数だけを返す',
			body: [
				'grep -c ERROR app.log は 2 を返す。',
				'grep -c error app.log は 0 を返し、終了コードは 1 になる。',
				'grep は 1 行も当たらないと、失敗の 1 で終わる。'
			],
			facts: [
				{ k: 'grep -c ERROR', v: '2' },
				{ k: 'grep -c error', v: '0（終了コード 1）' }
			],
			scene: [
				{ op: 'appear', id: 'count', label: '数', sub: '-c', at: [3, 1] },
				{ op: 'move', from: 'grep', to: 'count', payload: '2', kind: 'count' }
			],
			log: { t: '40s', from: 'grep', to: '数', kind: 'count', info: 'ERROR は 2 行' }
		}
	],
	example: {
		intro:
			'語で探し、大小を無視し、行の端で絞り、除き、数えた（模擬は本物の bash の記録と比べ済み）',
		lines: [
			'$ grep ERROR app.log',
			'2026-11-10 09:01:00 ERROR db timeout',
			'2026-11-10 09:02:00 ERROR disk full',
			'$ grep -i info app.log',
			'2026-11-10 09:00:01 INFO start',
			'2026-11-10 09:01:30 info retry',
			'2026-11-10 09:03:00 INFO done',
			"$ grep 'done$' app.log",
			'2026-11-10 09:03:00 INFO done',
			'$ grep -v INFO app.log',
			'2026-11-10 09:00:05 WARN slow response',
			'2026-11-10 09:01:00 ERROR db timeout',
			'2026-11-10 09:01:30 info retry',
			'2026-11-10 09:02:00 ERROR disk full',
			'$ grep -c ERROR app.log',
			'2'
		]
	},
	practice: {
		goal: '店の記録 shop.log で、大小を問わず error を含む行の数を出す',
		tool: { name: 'shell', mode: 'mock' },
		setup: {
			files: {
				'shop.log':
					'09:00 INFO open\n09:12 Error printer offline\n09:30 WARN slow\n10:02 ERROR card reader\n10:15 INFO sale\n11:40 error printer offline\n',
				'app.log': APP
			}
		},
		success: { output: '3\n' },
		mistakes: [
			{
				when: '-i を付けずに数えた',
				why: 'grep は大小を分ける。小文字の error の 1 行しか数えず、Error と ERROR を落とす',
				next: '-i を足し、grep -ci error shop.log と打つ',
				match: '1\n'
			},
			{
				when: '-c を付けずに探した',
				why: '当たった行そのものが並ぶ。求めているのは行の数だ',
				next: '-c を足して、数だけを出す',
				match: 'printer offline'
			},
			{
				when: 'ファイルの名前を打ち誤った',
				why: 'その名前のファイルは無い。grep は No such file or directory を返す',
				next: 'ls で名前を確かめ、shop.log と打ち直す',
				match: 'No such file or directory'
			}
		]
	},
	check: [
		{ ask: '大小を無視', how: 'grep -i' },
		{ ask: '行の終わりで絞る', how: "grep 'done$' app.log が 1 行を返す" },
		{ ask: '当たった数', how: 'grep -ci error shop.log が 3 を返す' }
	]
};
