// lnx-002 ファイルを作り、写し、消す（shell 模擬）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物の bash（Ubuntu 24.04）の記録 tools-real/recorded/lnx-002-files.json と一字ずつ比べてある。
// 場面：パン屋の品書き menu.txt がある作業場所 /home/learner/demo。今日の注文の紙を作り、古い品書きを箱にしまう。経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const TERM = '端末';
const DEMO = 'demo';

export const lnx002: Lesson = {
	id: 'lnx-002',
	field: 'lnx',
	level: 1,
	title: 'ファイルを作り、写し、消す',
	goal: 'touch・cp・mv・rm で、ファイルの木を変えることができる',
	prereq: ['lnx-001'],
	related: [],
	next: ['lnx-003', 'lnx-004'],
	explain: [
		{
			n: 1,
			title: 'touch で作る',
			lead: 'touch は、中身が空のファイルを作る',
			body: [
				'demo には menu.txt が 1 つだけある。',
				'touch order.txt と打つと、空の order.txt ができる。',
				'touch は何も返さない。うまくいった命令は黙っているのが決まりだ。'
			],
			facts: [
				{ k: 'コマンド', v: 'touch order.txt' },
				{ k: 'ls の結果', v: 'menu.txt  order.txt' },
				{ k: 'order.txt の大きさ', v: '0 B' }
			],
			scene: [
				{ op: 'appear', id: 'term', label: TERM, sub: 'learner@demo $', at: [0, 0] },
				{ op: 'appear', id: 'demo', label: DEMO, sub: '/home/learner/demo', at: [1, 0] },
				{ op: 'appear', id: 'menu', label: 'menu.txt', sub: '10 B', at: [1, 1] },
				{ op: 'appear', id: 'order', label: 'order.txt', sub: '0 B', at: [2, 1] }
			],
			log: {
				t: '0s',
				from: TERM,
				to: 'order.txt',
				kind: 'touch',
				info: '空の order.txt を作った',
				size: '0 B'
			}
		},
		{
			n: 2,
			title: 'cp で写す',
			lead: 'cp 元 先 で、中身ごと別の名前に写す',
			body: [
				'cp menu.txt menu-old.txt と打つ。cp は copy、写すの略だ。',
				'中身 bread 120 を持つ menu-old.txt ができ、menu.txt も残る。',
				'ファイルは 3 つになった。'
			],
			facts: [
				{ k: 'コマンド', v: 'cp menu.txt menu-old.txt' },
				{ k: 'menu-old.txt の中身', v: 'bread 120' },
				{ k: 'ファイルの数', v: '3' }
			],
			scene: [
				{ op: 'appear', id: 'old', label: 'menu-old.txt', sub: '10 B', at: [3, 1] },
				{ op: 'move', from: 'menu', to: 'old', payload: 'bread 120', kind: 'cp' }
			],
			log: {
				t: '6s',
				from: 'menu.txt',
				to: 'menu-old.txt',
				kind: 'cp',
				info: '中身を写した。元も残る',
				size: '10 B'
			}
		},
		{
			n: 3,
			title: 'mv で名前を変える',
			lead: 'mv 元 新しい名前 で、名前だけを替える',
			body: [
				'mv order.txt today.txt と打つ。mv は move、動かすの略だ。',
				'同じ場所の中で動かすと、名前を替えたことになる。',
				'order.txt はもう無く、today.txt がある。'
			],
			facts: [
				{ k: 'コマンド', v: 'mv order.txt today.txt' },
				{ k: '前の名前', v: 'order.txt（無くなる）' },
				{ k: '新しい名前', v: 'today.txt' }
			],
			scene: [{ op: 'change', id: 'order', k: '名前', v: 'today.txt' }],
			log: {
				t: '12s',
				from: 'order.txt',
				to: 'today.txt',
				kind: 'mv',
				info: '名前を today.txt に替えた'
			}
		},
		{
			n: 4,
			title: 'mkdir で入れ物',
			lead: 'mkdir で、ファイルを入れるディレクトリを作る',
			body: [
				'mkdir archive と打つ。mkdir は make directory の略だ。',
				'古い品書きをしまう箱として使う。',
				'ls には archive・menu.txt・menu-old.txt・today.txt が並ぶ。'
			],
			facts: [
				{ k: 'コマンド', v: 'mkdir archive' },
				{ k: '中身', v: '空' }
			],
			scene: [{ op: 'appear', id: 'archive', label: 'archive', sub: 'ディレクトリ', at: [2, 2] }],
			log: { t: '18s', from: TERM, to: 'archive', kind: 'mkdir', info: 'archive を作った' }
		},
		{
			n: 5,
			title: 'mv で移す',
			lead: '先にディレクトリを書くと、その中へ移る',
			body: [
				'mv menu-old.txt archive/ と打つ。',
				'先がディレクトリなので、名前はそのまま、中へ移る。',
				'ls archive が menu-old.txt を返し、demo からは消える。'
			],
			facts: [
				{ k: 'コマンド', v: 'mv menu-old.txt archive/' },
				{ k: 'ls の結果', v: 'archive  menu.txt  today.txt' },
				{ k: 'ls archive の結果', v: 'menu-old.txt' }
			],
			scene: [
				{ op: 'move', from: 'old', to: 'archive', payload: 'menu-old.txt', kind: 'mv' },
				{ op: 'vanish', id: 'old' },
				{ op: 'change', id: 'archive', k: '中身', v: 'menu-old.txt' }
			],
			log: {
				t: '25s',
				from: 'menu-old.txt',
				to: 'archive',
				kind: 'mv',
				info: 'archive の中へ移した'
			}
		},
		{
			n: 6,
			title: 'rm で消す',
			lead: 'rm でファイルを消す。ディレクトリには -r が要る',
			body: [
				'rm today.txt でファイルを消す（rm は remove の略）。',
				'rm archive は、Is a directory で断られる。',
				'中身ごと消すには rm -r archive と打つ（-r は中まで辿る）。'
			],
			facts: [
				{ k: 'rm archive', v: "rm: cannot remove 'archive': Is a directory" },
				{ k: 'rm -r archive', v: '中身ごと消えた' },
				{ k: 'ls の結果', v: 'menu.txt' }
			],
			scene: [
				{ op: 'vanish', id: 'order' },
				{ op: 'move', from: 'term', to: 'archive', payload: 'rm -r', kind: 'rm' },
				{ op: 'vanish', id: 'archive' }
			],
			log: {
				t: '33s',
				from: TERM,
				to: 'archive',
				kind: 'rm',
				info: 'today.txt と archive を消した'
			},
			why: '中身ごと一度に消える危うさがあるので、ディレクトリを消すときだけ -r で意図を書かせる'
		},
		{
			n: 7,
			title: '消した物は戻らない',
			lead: 'rm した物は、ごみ箱に入らずに無くなる',
			body: [
				'rm はごみ箱に入れず、その場で消す。',
				'cp archive/menu-old.txt back.txt は、もう写す元が無いので断られる。',
				'消す前に ls で名前を確かめるのが、事故を防ぐ一番の手だ。'
			],
			facts: [
				{ k: 'コマンド', v: 'cp archive/menu-old.txt back.txt' },
				{ k: '返った値', v: "cp: cannot stat 'archive/menu-old.txt': No such file or directory" },
				{ k: '終了コード', v: '1' }
			],
			scene: [
				{ op: 'change', id: 'demo', k: '残った物', v: 'menu.txt' },
				{ op: 'highlight', id: 'menu' }
			],
			log: {
				t: '40s',
				from: TERM,
				to: DEMO,
				kind: 'error',
				info: '消した物は写せない。cannot stat'
			}
		}
	],
	example: {
		intro: '作る・写す・名前を変える・移す・消すを順に打った（模擬は本物の bash の記録と比べ済み）',
		lines: [
			'$ touch order.txt',
			'$ ls',
			'menu.txt  order.txt',
			'$ cp menu.txt menu-old.txt',
			'$ mv order.txt today.txt',
			'$ mkdir archive',
			'$ mv menu-old.txt archive/',
			'$ ls',
			'archive  menu.txt  today.txt',
			'$ ls archive',
			'menu-old.txt',
			'$ rm today.txt',
			'$ rm archive',
			"rm: cannot remove 'archive': Is a directory",
			'$ rm -r archive',
			'$ ls',
			'menu.txt',
			'$ cp archive/menu-old.txt back.txt',
			"cp: cannot stat 'archive/menu-old.txt': No such file or directory"
		]
	},
	practice: {
		goal: 'archive を作って品書きの写しを menu-1110.txt としてしまい、下書き draft.txt を消す',
		tool: { name: 'shell', mode: 'mock' },
		setup: {
			files: { 'menu.txt': 'bread 120\n', 'draft.txt': 'memo\n' }
		},
		success: {
			exists: ['menu.txt', 'archive/menu-1110.txt'],
			absent: ['draft.txt'],
			files: { 'archive/menu-1110.txt': 'bread 120\n' }
		},
		mistakes: [
			{
				when: 'archive を作る前に、archive/menu-1110.txt へ写した',
				why: '写す先のディレクトリ archive がまだ無い。cp は入れ物を作らない',
				next: '先に mkdir archive を打ってから、cp menu.txt archive/menu-1110.txt を打つ',
				match: 'cannot create regular file'
			},
			{
				when: '写す元の名前を誤った（cp menu.tx … など）',
				why: 'その名前のファイルは無い。cp は cannot stat と返し、何も写さない',
				next: 'ls で名前を確かめ、menu.txt と打ち直す',
				match: 'cannot stat'
			},
			{
				when: 'rm で archive を消そうとした',
				why: 'rm は -r が無いとディレクトリを消さない。消すのは draft.txt だけでよい',
				next: 'rm draft.txt と打つ',
				match: 'Is a directory'
			}
		]
	},
	check: [
		{ ask: '写しができたか', how: 'ls archive が menu-1110.txt を返す' },
		{ ask: '元が残ったか', how: 'ls に menu.txt がある（cp は元を残す）' },
		{ ask: '下書きが消えたか', how: 'ls に draft.txt が無い' }
	]
};
