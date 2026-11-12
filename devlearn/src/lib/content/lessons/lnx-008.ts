// lnx-008 環境変数と PATH（shell 模擬）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物の bash（Ubuntu 24.04）の記録 tools-real/recorded/lnx-008-env.json と一字ずつ比べてある。
// 場面：learner が自分の道具 mytool を ~/bin に置き、名前だけで呼べるようにする。経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const TERM = '端末';
const PATH0 = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

export const lnx008: Lesson = {
	id: 'lnx-008',
	field: 'lnx',
	level: 2,
	title: '環境変数と PATH',
	goal: '環境変数を設定し、PATH から命令が見つかる順を追うことができる',
	prereq: ['lnx-001'],
	related: [],
	next: ['lnx-009'],
	explain: [
		{
			n: 1,
			title: '変数を置く',
			lead: 'NAME=minato で、シェルに名前付きの値を置く',
			body: [
				'NAME=minato と打つ（= の両側に空白を置かない）。',
				'echo $NAME は minato を返す。$ を付けると中身を読む。',
				'NAME = x と空白を入れると、命令と読まれて command not found になる。'
			],
			facts: [
				{ k: 'コマンド', v: 'NAME=minato' },
				{ k: 'echo $NAME', v: 'minato' },
				{ k: 'NAME = x', v: 'bash: NAME: command not found' }
			],
			scene: [
				{ op: 'appear', id: 'shell', label: 'シェル', sub: 'bash', at: [0, 0] },
				{ op: 'change', id: 'shell', k: 'NAME', v: 'minato' }
			],
			log: { t: '0s', from: TERM, to: 'シェル', kind: 'var', info: 'NAME に minato を置いた' }
		},
		{
			n: 2,
			title: 'export で子へ渡す',
			lead: 'export した変数だけが、そこから動かす命令に渡る',
			body: [
				'bash -c \'echo "[$NAME]"\' は、子の bash を動かして NAME を出す。',
				'export する前は [] で、子には NAME が渡っていない。',
				'export NAME の後は [minato] になる。渡った変数を環境変数と呼ぶ。'
			],
			facts: [
				{ k: 'export する前', v: '[]' },
				{ k: 'export NAME の後', v: '[minato]' }
			],
			scene: [
				{ op: 'appear', id: 'child', label: '子の bash', sub: 'bash -c', at: [2, 0] },
				{ op: 'move', from: 'shell', to: 'child', payload: 'NAME=minato', kind: 'export' },
				{ op: 'change', id: 'child', k: 'NAME', v: 'minato' }
			],
			log: {
				t: '15s',
				from: 'シェル',
				to: '子の bash',
				kind: 'export',
				info: 'export で NAME が子に渡った'
			},
			why: '子は親の環境の写しを受け取るだけなので、渡す物を export で選んで、要らない値を広げない'
		},
		{
			n: 3,
			title: 'PATH の中身',
			lead: 'PATH は、命令を探すディレクトリを : で並べた環境変数',
			body: [
				'echo $PATH は、6 つのディレクトリを : でつないだ並びを返す。',
				'ls と打つと、シェルはこの並びの中から ls という名前のファイルを探す。',
				'which ls は、見つかった場所 /usr/bin/ls を返す。'
			],
			facts: [
				{ k: 'echo $PATH', v: PATH0 },
				{ k: 'which ls', v: '/usr/bin/ls' }
			],
			scene: [
				{ op: 'appear', id: 'path', label: 'PATH', sub: '6 つの場所', at: [1, 1] },
				{ op: 'move', from: 'path', to: 'shell', payload: '/usr/bin/ls', kind: 'lookup' }
			],
			log: {
				t: '25s',
				from: 'PATH',
				to: 'シェル',
				kind: 'lookup',
				info: 'ls は /usr/bin/ls に見つかった'
			}
		},
		{
			n: 4,
			title: '命令を前から探す',
			lead: 'PATH に無い場所の命令は、名前だけでは見つからない',
			body: [
				'~/bin/mytool に台本を置き、chmod +x で実行できるようにした。',
				'mytool と打つと、bash: mytool: command not found になる。',
				'~/bin は PATH の並びに無いので、どこを探しても見つからない。'
			],
			facts: [
				{ k: '置いた場所', v: '/home/learner/bin/mytool' },
				{ k: 'mytool', v: 'bash: mytool: command not found' },
				{ k: '終了コード', v: '127' }
			],
			scene: [
				{ op: 'appear', id: 'mytool', label: 'mytool', sub: '~/bin', at: [3, 1] },
				{ op: 'move', from: 'path', to: 'mytool', payload: '探さない', kind: 'miss' }
			],
			log: { t: '40s', from: 'シェル', to: 'PATH', kind: 'miss', info: 'mytool は PATH の中に無い' }
		},
		{
			n: 5,
			title: 'PATH に足す',
			lead: 'PATH の先頭に ~/bin を足す',
			body: [
				'"$HOME/bin:$PATH" は、前の並びの頭に ~/bin を足した物だ。',
				'その後 which mytool は /home/learner/bin/mytool を返す。',
				'mytool と打つと、my tool が返る。'
			],
			facts: [
				{ k: 'コマンド', v: 'export PATH="$HOME/bin:$PATH"' },
				{ k: 'which mytool', v: '/home/learner/bin/mytool' },
				{ k: 'mytool', v: 'my tool' }
			],
			scene: [
				{ op: 'change', id: 'path', k: '先頭', v: '/home/learner/bin' },
				{ op: 'move', from: 'mytool', to: 'shell', payload: 'my tool', kind: 'run' }
			],
			log: { t: '55s', from: 'mytool', to: TERM, kind: 'run', info: 'PATH に足し、名前で動いた' }
		},
		{
			n: 6,
			title: '先に見つかった方が動く',
			lead: '同じ名前が 2 か所にあれば、PATH で前にある方が動く',
			body: [
				'~/bin に ls という名前の台本を置くと、ls はそれを動かす。',
				'~/bin が /usr/bin より前にあるからだ。',
				'思った物と違う命令が動くときは、which で場所を確かめる。'
			],
			facts: [
				{ k: '~/bin/ls を置いた後の which ls', v: '/home/learner/bin/ls' },
				{ k: '本物の ls を呼ぶ', v: '/usr/bin/ls と場所ごと書く' }
			],
			scene: [
				{ op: 'appear', id: 'myls', label: 'ls（~/bin）', sub: '前にある', at: [3, 2] },
				{ op: 'move', from: 'path', to: 'myls', payload: 'ls', kind: 'lookup' }
			],
			log: {
				t: '70s',
				from: 'PATH',
				to: 'ls（~/bin）',
				kind: 'lookup',
				info: '前にある ~/bin の ls が動く'
			}
		}
	],
	example: {
		intro: '変数を置いて子に渡し、PATH に ~/bin を足した（模擬は本物の bash の記録と比べ済み）',
		lines: [
			'$ NAME=minato',
			'$ echo $NAME',
			'minato',
			`$ bash -c 'echo "[$NAME]"'`,
			'[]',
			'$ export NAME',
			`$ bash -c 'echo "[$NAME]"'`,
			'[minato]',
			'$ echo $PATH',
			PATH0,
			'$ mkdir -p ~/bin',
			`$ printf '#!/bin/bash\\necho "my tool"\\n' > ~/bin/mytool`,
			'$ chmod +x ~/bin/mytool',
			'$ mytool',
			'bash: mytool: command not found',
			'$ export PATH="$HOME/bin:$PATH"',
			'$ which mytool',
			'/home/learner/bin/mytool',
			'$ mytool',
			'my tool'
		]
	},
	practice: {
		goal: '作業場所の tools にある report を、PATH に足して名前だけで動かす',
		tool: { name: 'shell', mode: 'mock' },
		setup: {
			files: { 'tools/report': '#!/bin/bash\necho "report ok"\n' },
			modes: { 'tools/report': '775' }
		},
		success: { output: 'report ok\n' },
		mistakes: [
			{
				when: 'PATH = … と、= の両側に空白を入れた',
				why: '空白があると、PATH という名前の命令と読まれる。そんな命令は無い',
				next: 'export PATH="$HOME/demo/tools:$PATH" と、= の両側を詰めて書く',
				match: 'PATH: command not found'
			},
			{
				when: 'PATH に足す前に report と打った',
				why: 'tools は PATH の並びに無いので、名前だけでは見つからない',
				next: 'export PATH="$HOME/demo/tools:$PATH" を打ってから report と打つ',
				match: 'report: command not found'
			},
			{
				when: 'export $PATH=… と、左の名前に $ を付けた',
				why: '$PATH は中身に置き換わる。export は中身の長い並びを名前として受け取り、名前に使えないと断る',
				next: '置く側の名前には $ を付けない。export PATH="$HOME/demo/tools:$PATH" と書く',
				match: 'not a valid identifier'
			}
		]
	},
	check: [
		{ ask: '子に渡る変数', how: 'export した物だけ' },
		{ ask: '命令を探す順', how: 'PATH の並びの前から。先に見つかった方が動く' },
		{ ask: 'report の場所', how: 'which report が /home/learner/demo/tools/report を返す' }
	]
};
