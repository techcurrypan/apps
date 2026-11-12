// lnx-007 プロセスを止める（shell 模擬。世界 procs）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物の bash（Ubuntu 24.04）の記録 tools-real/recorded/lnx-007-kill.json と一字ずつ比べてある。
// プロセスの番号は、本物では毎回変わるので、模擬は決まった 5 桁の番号にしてある（docs/tools.md 第 2 章）。
// 場面：店の利用者 shop が、Web（web.py。子に worker.py）と、集計（report.py。TERM を無視する）を動かしている。経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const TERM = '端末';
const PS_HEAD = '    PID    PPID STAT CMD';
const WEB = '  21501       1 Ss   python3 /opt/shop/web.py';
const WORKER = '  21502   21501 S    python3 /opt/shop/worker.py';

export const lnx007: Lesson = {
	id: 'lnx-007',
	field: 'lnx',
	level: 2,
	title: 'プロセスを止める',
	goal: 'ps でプロセスを見つけ、kill でシグナルを送ることができる',
	prereq: ['lnx-001'],
	related: [],
	next: ['lnx-010'],
	explain: [
		{
			n: 1,
			title: '動いているプロセス',
			lead: '動いているプログラムの 1 つ 1 つを、プロセスと呼ぶ',
			body: [
				'プログラムを動かすと、機械の中にプロセス（動いている 1 つの仕事）ができる。',
				'プロセスには、PID（プロセスの番号）が 1 つずつ付く。',
				'店の利用者 shop が、3 つのプロセスを動かしている。'
			],
			facts: [
				{ k: '動かしている人', v: 'shop' },
				{ k: 'プロセスの数', v: '3' }
			],
			scene: [
				{ op: 'appear', id: 'term', label: TERM, sub: 'learner', at: [0, 0] },
				{ op: 'appear', id: 'web', label: 'web.py', sub: 'shop', at: [2, 0] },
				{ op: 'appear', id: 'worker', label: 'worker.py', sub: 'shop', at: [3, 1] },
				{ op: 'appear', id: 'report', label: 'report.py', sub: 'shop', at: [2, 2] }
			],
			log: {
				t: '0s',
				from: TERM,
				to: 'shop',
				kind: 'proc',
				info: 'shop のプロセスが 3 つ動いている'
			}
		},
		{
			n: 2,
			title: 'ps で番号を見る',
			lead: 'ps で、プロセスの番号と親の番号を並べる',
			body: [
				'ps は動いているプロセスを並べる。-u shop で shop の物に絞る。',
				'-o で、出す列を PID・PPID（親の番号）・STAT（状態）・CMD（命令）にする。',
				'report.py の PID は 21506 だ。'
			],
			facts: [
				{ k: 'web.py', v: 'PID 21501・PPID 1' },
				{ k: 'worker.py', v: 'PID 21502・PPID 21501' },
				{ k: 'report.py', v: 'PID 21506・PPID 1' }
			],
			scene: [
				{ op: 'change', id: 'web', k: 'PID', v: '21501' },
				{ op: 'change', id: 'worker', k: 'PID', v: '21502' },
				{ op: 'change', id: 'report', k: 'PID', v: '21506' }
			],
			log: { t: '10s', from: 'ps', to: TERM, kind: 'ps', info: '3 つの PID を並べた' }
		},
		{
			n: 3,
			title: 'kill で TERM を送る',
			lead: 'kill 番号 は、そのプロセスに「終われ」の知らせを送る',
			body: [
				'kill は、名前に反して、シグナル（プロセスへの知らせ）を送る命令だ。',
				'番号だけを書くと、TERM（終わってほしい）を送る。',
				'learner から shop のプロセスへは送れず、Operation not permitted になる。',
				'そこで sudo を付けて送る。'
			],
			facts: [
				{ k: 'kill 21506', v: 'bash: kill: (21506) - Operation not permitted' },
				{ k: 'sudo kill 21506', v: 'TERM を送った（何も返さない）' }
			],
			scene: [
				{ op: 'move', from: 'term', to: 'report', payload: 'TERM', kind: 'signal' },
				{ op: 'change', id: 'report', k: '届いた知らせ', v: 'TERM' }
			],
			log: {
				t: '20s',
				from: TERM,
				to: 'report.py',
				kind: 'TERM',
				info: 'sudo kill 21506 で TERM を送った'
			}
		},
		{
			n: 4,
			title: '終わる',
			lead: 'TERM を受けたプロセスは、片付けてから自分で終わる',
			body: [
				'TERM は「片付けて終わって」という頼みで、多くのプログラムはそれに従う。',
				'ところが ps を見直すと、report.py は 21506 のまま残っている。',
				'report.py は、TERM を無視するように書かれていた。'
			],
			facts: [
				{ k: 'ps の行', v: '21506 1 Ss python3 /opt/shop/report.py' },
				{ k: '残った理由', v: 'TERM を無視する' }
			],
			scene: [
				{ op: 'change', id: 'report', k: '状態', v: 'まだ動いている' },
				{ op: 'highlight', id: 'report' }
			],
			log: {
				t: '30s',
				from: 'ps',
				to: TERM,
				kind: 'ps',
				info: 'report.py は TERM を無視して残った'
			}
		},
		{
			n: 5,
			title: '止まらないとき KILL',
			lead: 'kill -KILL は、プロセスに断る余地を与えずに止める',
			body: [
				'sudo kill -KILL 21506 と打つ。KILL は番号で 9 だ。',
				'KILL はプロセスに届かず、機械の側がその場で消す。',
				'ps を見直すと、report.py の行が消えている。'
			],
			facts: [
				{ k: 'コマンド', v: 'sudo kill -KILL 21506' },
				{ k: 'KILL の番号', v: '9' },
				{ k: 'ps の行数', v: '3 → 2' }
			],
			scene: [
				{ op: 'move', from: 'term', to: 'report', payload: 'KILL', kind: 'signal' },
				{ op: 'vanish', id: 'report' }
			],
			log: { t: '45s', from: TERM, to: 'report.py', kind: 'KILL', info: 'KILL で 21506 を消した' },
			why: 'KILL は片付けの機会を与えないので、書きかけの物が壊れうる。先に TERM を試す'
		},
		{
			n: 6,
			title: '親と子',
			lead: '親を止めても、子は残る。子の新しい親は 1 番',
			body: [
				'worker.py の PPID は 21501 で、web.py が親だ。',
				'sudo kill 21501 で web.py を止めると、worker.py は残る。',
				'残った worker.py の PPID は 1 に替わる。1 番は親を失った子を引き取る。'
			],
			facts: [
				{ k: 'コマンド', v: 'sudo kill 21501' },
				{ k: '残った行', v: '21502 1 S python3 /opt/shop/worker.py' }
			],
			scene: [
				{ op: 'vanish', id: 'web' },
				{ op: 'change', id: 'worker', k: 'PPID', v: '1' }
			],
			log: {
				t: '60s',
				from: TERM,
				to: 'web.py',
				kind: 'TERM',
				info: 'web.py が終わり、worker.py の親は 1 に'
			}
		}
	],
	example: {
		intro: '並べて、TERM を送り、無視されて KILL を送った（模擬は本物の bash の記録と比べ済み）',
		lines: [
			'$ ps -u shop -o pid,ppid,stat,cmd',
			PS_HEAD,
			WEB,
			WORKER,
			'  21506       1 Ss   python3 /opt/shop/report.py',
			'$ kill $(pgrep -f report.py)',
			'bash: kill: (21506) - Operation not permitted',
			'$ sudo kill $(pgrep -f report.py)',
			'$ ps -u shop -o pid,ppid,stat,cmd',
			PS_HEAD,
			WEB,
			WORKER,
			'  21506       1 Ss   python3 /opt/shop/report.py',
			'$ sudo kill -KILL $(pgrep -f report.py)',
			'$ ps -u shop -o pid,ppid,stat,cmd',
			PS_HEAD,
			WEB,
			WORKER
		]
	},
	practice: {
		goal: 'TERM を無視する report.py を止め、最後に ps -u shop -o pid,ppid,stat,cmd で消えたことを確かめる',
		tool: { name: 'shell', mode: 'mock' },
		setup: { world: 'procs' },
		success: { output: `${PS_HEAD}\n${WEB}\n${WORKER}\n` },
		mistakes: [
			{
				when: 'sudo を付けずに kill した',
				why: 'report.py は shop のプロセスだ。learner からは送れず、Operation not permitted で断られる',
				next: 'sudo kill -KILL 21506 と、sudo を付けて送る',
				match: 'Operation not permitted'
			},
			{
				when: '番号を打ち誤った',
				why: 'その番号のプロセスは無い。kill は No such process と返す',
				next: 'ps -u shop -o pid,ppid,stat,cmd で report.py の PID を確かめる',
				match: 'No such process'
			},
			{
				when: 'シグナルの名前を打ち誤った（-KIL など）',
				why: 'その名前のシグナルは無い。kill は invalid signal specification と返す',
				next: '-KILL か、番号の -9 と書く',
				match: 'invalid signal specification'
			}
		]
	},
	check: [
		{ ask: 'report.py の PID', how: 'ps -u shop -o pid,ppid,stat,cmd の 21506' },
		{ ask: 'TERM で止まらないとき', how: 'sudo kill -KILL 21506（-9）' },
		{ ask: '親を止めたときの子', how: '残り、PPID が 1 に替わる' }
	]
};
