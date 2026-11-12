// lnx-005 パイプとリダイレクト（shell 模擬）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物の bash（Ubuntu 24.04）の記録 tools-real/recorded/lnx-005-pipe.json と一字ずつ比べてある。
// 場面：パン屋の注文を 1 行 1 品で書いた orders.txt（6 行）。品ごとの数を数えて多い順に並べる。経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const TERM = '端末';
const ORDERS = 'orders.txt';

export const lnx005: Lesson = {
	id: 'lnx-005',
	field: 'lnx',
	level: 2,
	title: 'パイプとリダイレクト',
	goal: 'パイプとリダイレクトで、出力を次の命令やファイルへ渡すことができる',
	prereq: ['lnx-003'],
	related: [],
	next: ['lnx-006'],
	explain: [
		{
			n: 1,
			title: '出力は画面へ',
			lead: '命令の出力は、何もしなければ端末の画面に出る',
			body: [
				'echo hello と打つと、hello が画面に出る。',
				'命令の出力の出口を、標準出力と呼ぶ。',
				'標準出力は、ふだんは端末の画面につながっている。'
			],
			facts: [
				{ k: 'コマンド', v: 'echo hello' },
				{ k: '出口', v: '標準出力 → 画面' }
			],
			scene: [
				{ op: 'appear', id: 'echo', label: 'echo', sub: '命令', at: [0, 0] },
				{ op: 'appear', id: 'term', label: TERM, sub: '画面', at: [2, 0] },
				{ op: 'move', from: 'echo', to: 'term', payload: 'hello', kind: 'stdout' }
			],
			log: { t: '0s', from: 'echo', to: TERM, kind: 'stdout', info: 'hello を画面に出した' }
		},
		{
			n: 2,
			title: '> でファイルへ',
			lead: '> ファイル名 で、出口を画面からファイルへ替える',
			body: [
				'echo hello > out.txt と打つと、画面には何も出ない。',
				'出力は out.txt に入り、cat out.txt が hello を返す。',
				'> は、前の中身を消してから書く。'
			],
			facts: [
				{ k: 'コマンド', v: 'echo hello > out.txt' },
				{ k: '画面', v: '（何も出ない）' },
				{ k: 'out.txt', v: 'hello' }
			],
			scene: [
				{ op: 'appear', id: 'out', label: 'out.txt', sub: 'ファイル', at: [1, 1] },
				{ op: 'move', from: 'echo', to: 'out', payload: 'hello', kind: 'redirect' }
			],
			log: {
				t: '6s',
				from: 'echo',
				to: 'out.txt',
				kind: 'redirect',
				info: 'hello を out.txt に書いた',
				size: '6 B'
			}
		},
		{
			n: 3,
			title: '>> で足す',
			lead: '>> は、前の中身を残して末尾に足す',
			body: [
				'echo world >> out.txt と打つ。',
				'cat out.txt は hello と world の 2 行を返す。',
				'> と書き誤ると hello が消えるので、記録を足すときは >> を使う。'
			],
			facts: [
				{ k: 'コマンド', v: 'echo world >> out.txt' },
				{ k: 'out.txt', v: 'hello / world（2 行）' }
			],
			scene: [
				{ op: 'move', from: 'echo', to: 'out', payload: 'world', kind: 'append' },
				{ op: 'change', id: 'out', k: '中身', v: 'hello / world' }
			],
			log: {
				t: '12s',
				from: 'echo',
				to: 'out.txt',
				kind: 'append',
				info: 'world を末尾に足した',
				size: '6 B'
			}
		},
		{
			n: 4,
			title: 'パイプで次の命令へ',
			lead: '| は、左の出力を右の命令の入力につなぐ',
			body: [
				'sort orders.txt は、6 行を名前の順に並べて出す。',
				'sort orders.txt | uniq -c と打つと、並べた結果が uniq に渡る。',
				'uniq -c は、続けて同じ行をまとめ、数を付ける。'
			],
			facts: [
				{ k: 'コマンド', v: 'sort orders.txt | uniq -c' },
				{ k: '返った値', v: '3 bread / 1 jam / 2 milk' }
			],
			scene: [
				{ op: 'appear', id: 'orders', label: ORDERS, sub: '6 行', at: [0, 2] },
				{ op: 'appear', id: 'sort', label: 'sort', sub: '並べる', at: [1, 2] },
				{ op: 'appear', id: 'uniq', label: 'uniq -c', sub: 'まとめて数える', at: [2, 2] },
				{
					op: 'move',
					from: 'sort',
					to: 'uniq',
					payload: 'bread bread bread jam milk milk',
					kind: 'pipe'
				}
			],
			log: {
				t: '20s',
				from: 'sort',
				to: 'uniq -c',
				kind: 'pipe',
				info: '並べた 6 行を uniq に渡した'
			},
			why: 'uniq は続けて並んだ同じ行しかまとめないので、先に sort で同じ物を隣に集める'
		},
		{
			n: 5,
			title: '3 つつなぐ',
			lead: 'もう 1 つ | を足し、数の多い順に並べ直す',
			body: [
				'sort orders.txt | uniq -c | sort -rn と打つ。',
				'-n は数として、-r は大きい方から並べる指示だ。',
				'3 bread・2 milk・1 jam の順になる。'
			],
			facts: [
				{ k: 'コマンド', v: 'sort orders.txt | uniq -c | sort -rn' },
				{ k: '1 行目', v: '      3 bread' },
				{ k: '最後の行', v: '      1 jam' }
			],
			scene: [
				{ op: 'appear', id: 'sort2', label: 'sort -rn', sub: '多い順', at: [3, 2] },
				{ op: 'move', from: 'uniq', to: 'sort2', payload: '3 bread 1 jam 2 milk', kind: 'pipe' },
				{ op: 'move', from: 'sort2', to: 'term', payload: '3 bread 2 milk 1 jam', kind: 'stdout' }
			],
			log: { t: '30s', from: 'sort -rn', to: TERM, kind: 'stdout', info: '多い順に 3 行を出した' }
		},
		{
			n: 6,
			title: '2> でエラーを分ける',
			lead: 'エラーは別の出口。2> でそちらだけをファイルへ送る',
			body: [
				'エラーの文は、標準エラー出力という別の出口から出る。',
				'ls nothere 2> err.txt と打つと、画面には何も出ない。',
				'エラーの文は err.txt に入り、cat err.txt で読める。'
			],
			facts: [
				{ k: 'コマンド', v: 'ls nothere 2> err.txt' },
				{ k: 'err.txt', v: "ls: cannot access 'nothere': No such file or directory" },
				{ k: '終了コード', v: '2' }
			],
			scene: [
				{ op: 'appear', id: 'err', label: 'err.txt', sub: '標準エラー出力', at: [3, 1] },
				{ op: 'move', from: 'term', to: 'err', payload: 'cannot access', kind: 'stderr' }
			],
			log: {
				t: '40s',
				from: 'ls',
				to: 'err.txt',
				kind: 'stderr',
				info: 'エラーだけを err.txt に分けた'
			}
		}
	],
	example: {
		intro:
			'ファイルへ書き、足し、3 つの命令をつなぎ、エラーを分けた（模擬は本物の bash の記録と比べ済み）',
		lines: [
			'$ echo hello > out.txt',
			'$ echo world >> out.txt',
			'$ cat out.txt',
			'hello',
			'world',
			'$ sort orders.txt | uniq -c',
			'      3 bread',
			'      1 jam',
			'      2 milk',
			'$ sort orders.txt | uniq -c | sort -rn',
			'      3 bread',
			'      2 milk',
			'      1 jam',
			'$ ls nothere 2> err.txt',
			'$ cat err.txt',
			"ls: cannot access 'nothere': No such file or directory"
		]
	},
	practice: {
		goal: 'sales.txt の品ごとの数を多い順に並べ、top.txt に書く',
		tool: { name: 'shell', mode: 'mock' },
		setup: { files: { 'sales.txt': 'an\nan\nmelon\nan\ncroissant\nmelon\nan\n' } },
		success: { files: { 'top.txt': '      4 an\n      2 melon\n      1 croissant\n' } },
		mistakes: [
			{
				when: '| の後にファイルの名前を書いた',
				why: '| の右は命令でなければならない。top.txt という命令は無いので command not found になる',
				next: 'ファイルへ書くのは > だ。… | sort -rn > top.txt と書く',
				match: 'command not found'
			},
			{
				when: 'sort をせずに uniq -c した',
				why: 'uniq は続けて並んだ同じ行しかまとめない。離れた an が別々に数えられる',
				next: 'sort sales.txt | uniq -c | sort -rn > top.txt と、先に sort を置く',
				match: '2 an'
			},
			{
				when: '読むファイルの名前を打ち誤った',
				why: 'その名前のファイルは無い。sort は cannot read と返す',
				next: 'ls で名前を確かめ、sales.txt と打ち直す',
				match: 'cannot read'
			}
		]
	},
	check: [
		{ ask: '> と >> の違い', how: '> は前を消して書き、>> は末尾に足す' },
		{ ask: '| の右', how: '命令。左の出力がその入力になる' },
		{ ask: 'top.txt の 1 行目', how: 'cat top.txt の 1 行目が「      4 an」' }
	]
};
