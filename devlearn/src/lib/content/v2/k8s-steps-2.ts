// 見本 2（k8s-101）のステップ 5〜8：スケジューラ・kubelet が起こす・OOMKilled・CrashLoopBackOff。
import type { Step } from '../../lesson/types.ts';
import { B, cp, I, node, POD, row } from './k8s-base.ts';

const N1 = (rows: ReturnType<typeof row>[]) => node('node-1', '10.0.1.11', '棟 1', rows);
const N2 = (rows: ReturnType<typeof row>[]) => node('node-2', '10.0.1.12', '棟 2', rows);
const kl1 = row('kl-1', 0, 'kubelet（node-1）', '動いている');
const kl2 = row('kl-2', 0, 'kubelet（node-2）', '動いている');
const b9m4t = row('p-b9m4t', 1, `${POD}b9m4t`, 'CrashLoopBackOff（6 回）', 'bad');
const q2wfz = row('p-q2wfz', 1, `${POD}q2wfz`, 'CrashLoopBackOff（5 回）', 'bad');

export const s5: Step = {
	n: 5,
	kind: 'internals',
	short: '置き場所',
	title: 'スケジューラが node を選ぶ',
	lead: 'requests が入る node を篩い、点を付け、bind で書く',
	body: [
		'nodeName の無い 87cwj が、スケジューラの activeQ に入る。',
		'requests 128 MiB が入る node を篩い、点の高い node-1 に bind する。'
	],
	depth: {
		intro: [
			'新しい部屋 87cwj には、まだどの棟に置くかが決まっていない。部屋割り係が受け取り、棟ごとに「この部屋が入るか」を確かめる。',
			'入る棟が 2 つあれば、空きの多い方に点を多く付ける。決めたら台帳に棟の名前を書く。棟の管理人は、その書き込みを見て部屋を用意する。'
		],
		work: [
			'87cwj は spec.nodeName が空なので、kube-scheduler の informer が受け取り、activeQ に入れる。ScheduleOne() は activeQ から 1 つずつ取り、1 度に 1 つの Pod の行き先を決める。',
			'Filter の段で、node ごとに入るかを確かめる。NodeResourcesFit は requests の和を見る。記憶の要求 128 MiB は、node-1 の空き 828 MiB にも node-2 の 700 MiB にも入る。',
			'Score の段で、通った node に 0〜100 点を付ける。空きの多い node を好む LeastAllocated で、記憶の点は node-1 が 18 点、node-2 が 14 点だ。node-1 に決め、bind で spec.nodeName を書く。'
		],
		deep: [
			'v1.31 の PriorityQueue は 3 つの列を持つ。activeQ は今すぐ試す列、backoffQ は失敗の後に 1 秒から倍に最大 10 秒待つ列だ。unschedulablePods は入る所が無い Pod の列で、最長 5 分で戻す。',
			'schedulePod() は findNodesThatFitPod() で Filter を通す。prioritizeNodes() は各プラグインの点を重みつきで足す。5,000 台の集まりでは、既定で全体の 10%（50% − 5,000 ÷ 125）を調べた所で打ち切る。',
			'fitsRequest() は requests だけを足し、limits と今の使用量は見ない。node の allocatable 3,840 MiB から、置かれた Pod の requests の和を引いた残りと比べる。消す途中の 7xk2p の 128 MiB は、本当に消えて RemovePod() が呼ばれるまで node-1 の和に残る。3,012 MiB にはこの分も入っている。',
			'記憶の点は（空き ÷ allocatable）× 100 で、置いた後の空きで計る。node-1 は 700 ÷ 3,840 で 18 点、node-2 は 572 ÷ 3,840 で 14 点だ。CPU の点と NodeResourcesBalancedAllocation の点も足す。',
			'決まると、手元の写しに「node-1 に置いた」と仮に書き（assume）、次の Pod の計算へ進む。bind は別の goroutine で進む。DefaultBinder の Bind() が pods/binding を POST し、API サーバが spec.nodeName を書く。'
		]
	},
	callout: {
		type: 'point',
		text: 'スケジューラが見るのは requests の和だけ。実際に 182 MiB 使う Pod でも、要求が 128 MiB なら 128 MiB として数えて置く。'
	},
	changes: [
		{ mark: '+', text: 'activeQ に 87cwj' },
		{ mark: '~', text: 'spec.nodeName ＝ node-1' },
		{ mark: '+', text: 'Scheduled の出来事' }
	],
	facts: [
		{
			k: 'node-1 の空き',
			v: '828 MiB（3,840 − 3,012。消す途中の 7xk2p を含む）',
			calc: '3840-3012'
		},
		{ k: 'node-2 の空き', v: '700 MiB（3,840 − 3,140）', calc: '3840-3140' },
		{ k: '記憶の点', v: '18 点（700 ÷ 3,840 × 100）', calc: '700/3840*100' },
		{ k: 'backoffQ の待ち', v: '1 秒から倍に、最大 10 秒' }
	],
	scene: [
		{ op: 'move', from: 'api', to: 'sched', payload: '87cwj（nodeName なし）', kind: 'watch' },
		{ op: 'move', from: 'sched', to: 'api', payload: 'binding node-1', kind: 'bind' }
	],
	log: {
		t: '10:06:12.030',
		from: 'sched',
		to: 'api',
		kind: 'bind',
		info: 'Successfully assigned shop/web-6d8f7b9c4-87cwj to node-1'
	},
	town: '部屋割り係が棟ごとの空き部屋を数え、空きの多い棟 1 に部屋を割り当てる',
	work: 'describe node の Allocated resources で requests の和を読む',
	ask: {
		q: '87cwj は実際には 182 MiB 使う。スケジューラはいくつとして数える？',
		opts: ['182 MiB', '128 MiB（requests）', '0 MiB（まだ動いていない）'],
		a: 1,
		why: 'NodeResourcesFit が足すのは requests だけ。使う量は見ない。'
	},
	inside: {
		packet: {
			name: 'POST /api/v1/namespaces/shop/pods/web-6d8f7b9c4-87cwj/binding',
			size: '約 300 B',
			parts: [
				{
					name: 'Binding',
					fields: [
						{ k: 'metadata.name', v: 'web-6d8f7b9c4-87cwj', level: 1 },
						{ k: 'target.kind', v: 'Node', level: 2 },
						{ k: 'target.name', v: 'node-1', level: 1 }
					]
				}
			]
		},
		hosts: [
			cp([
				row('s-sched', 0, 'kube-scheduler', 'ScheduleOne() の中'),
				row('s-q', 1, 'activeQ', '空（87cwj を取った）'),
				row('rs-old', 1, 'ReplicaSet web-6d8f7b9c4', '3 個・Ready 0')
			]),
			N1([kl1, q2wfz, row('p-87cwj', 1, `${POD}87cwj`, 'Pending → node-1 に決まった', 'warn')]),
			N2([kl2, b9m4t])
		],
		logs: [
			{
				t: '10:06:12',
				src: 'kubectl events',
				text: 'Normal   Scheduled   pod/web-6d8f7b9c4-87cwj   Successfully assigned shop/web-6d8f7b9c4-87cwj to node-1'
			}
		]
	},
	metrics: { pending: '0 個' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_pq', 'b_one', 'b_sp'] } },
		{ at: 400, dur: 600, para: 0, do: { op: 'enqueue', queue: 'activeQ', item: '87cwj' } },
		{ at: 1100, dur: 600, para: 0, do: { op: 'dequeue', queue: 'activeQ', item: '87cwj' } },
		{
			at: 1700,
			dur: 700,
			para: 0,
			do: { op: 'packet', a: 'b_one', b: 'b_sp', label: '87cwj', kind: 'call' }
		},
		{ at: 1800, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{ at: 2500, dur: 800, para: 1, do: { op: 'camera', fit: ['b_sp', 'b_fit', 'b_score'] } },
		{ at: 2900, dur: 600, para: 1, do: { op: 'enqueue', queue: 'fitq', item: 'node-1 828 ✓' } },
		{ at: 3500, dur: 600, para: 1, do: { op: 'enqueue', queue: 'fitq', item: 'node-2 700 ✓' } },
		{ at: 3600, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{
			at: 4300,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_fit', b: 'b_score', label: '2 台', kind: 'call' }
		},
		{
			at: 5000,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'b_score', text: 'node-1 18 点・node-2 14 点' }
		},
		{ at: 5100, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 5800, dur: 800, para: 2, do: { op: 'camera', fit: ['b_score', 'b_bind', 'api'] } },
		{
			at: 6200,
			dur: 800,
			para: 2,
			do: { op: 'packet', a: 'b_bind', b: 'api', label: 'binding node-1', kind: 'bind' }
		},
		{ at: 6300, dur: 800, para: 2, do: { op: 'count', metric: 'pending', to: '0 個' } },
		{ at: 7000, dur: 400, para: 2, do: { op: 'board', line: 3 } },
		{ at: 800, dur: 700, para: 0, do: { op: 'pulse', id: 'b_one' } }
	],
	loop: [
		// 最後の寄りの中で流す（留まる間も図の中で流れが続く。LS-M4・D1）
		{ at: 0, dur: 700, do: { op: 'packet', a: 'api', b: 'etcd', label: 'Binding', kind: 'bind' } },
		{ at: 600, dur: 600, do: { op: 'pulse', id: 'etcd' } },
		{
			at: 1300,
			dur: 700,
			do: { op: 'packet', a: 'etcd', b: 'api', label: '保存した', kind: 'status' }
		}
	],
	board: [
		'activeQ → ScheduleOne()',
		'Filter：requests 128 MiB が入るか',
		'Score：空きの多い node-1',
		'Bind()：spec.nodeName ＝ node-1'
	],
	badges: { b_score: 'node-1 18 点・node-2 14 点' },
	layers: [B.sq([], [], []), B.cyc(), B.flt([]), B.bnd()],
	impl: [I.pq, I.scheduleOne, I.schedulePod, I.findFit, I.fits, I.prioritize, I.bind, I.maxBackoff],
	refs: [
		'k8s-scheduler',
		'k8s-sched-one',
		'k8s-sched-queue',
		'k8s-fit',
		'k8s-binder',
		'k8s-resources'
	],
	learns: [3]
};

export const s6: Step = {
	n: 6,
	kind: 'internals',
	short: '起こす',
	title: 'kubelet がコンテナを起こす',
	lead: 'kubelet が CRI で頼み、cgroup に上限を書く',
	body: [
		'node-1 の kubelet が 87cwj を受け、containerd に CRI で作らせる。',
		'cgroup に memory.max 128 MiB が書かれ、2 秒で Running になる。'
	],
	depth: {
		intro: [
			'棟 1 の管理人は、自分の棟に割り当てられた部屋だけを見ている。87cwj が来たので、部屋の箱（サンドボックス）を作り、中で web の仕事を始めさせる。',
			'部屋には「記憶は 128 MiB まで」という上限の札が貼られる。始まったら、管理人は「動き出した」と役場の台帳に書き戻す。'
		],
		work: [
			'kubelet は nodeName が node-1 の Pod だけを watch する。87cwj は SyncLoop ADD で worker（podWorkerLoop()）に渡る。',
			'SyncPod() は computePodActions() で作る物を決める。RunPodSandbox・CreateContainer・StartContainer を containerd に頼む。',
			'コンテナの cgroup には、limits から memory.max 134,217,728 B（128 MiB）が書かれる。requests の cpu 100m は cpu.weight 4 になる。起動は 2 秒だ。',
			'PLEG が 1 秒ごとの Relist で ContainerStarted を見つけ、syncLoopIteration() が同期を起こす。SyncPod() の中の SetPodStatus() が Running を書き、PATCH で送られる。'
		],
		deep: [
			'syncLoopIteration() は複数の道を待つ。API サーバからの Pod の変化・PLEG の出来事・1 秒ごとの見直し・2 秒ごとの片づけ・probe の結果だ。どれが来ても、該当の Pod を UpdatePod() で worker に知らせる。',
			'computePodActions() は、サンドボックスを作り直すか、どのコンテナを殺し・起こすかを決める。落ちたコンテナを起こし直す時は、先に doBackOff() で待ちの表を見る（ステップ 8）。',
			'startContainer() はイメージがあるかを確かめる（Pulled）。generateLinuxContainerResources() が、記憶の上限と CPU の重みを CRI の形に写す。CreateContainer() と StartContainer() を containerd に送る。containerd は shim を通して runc を起こす。',
			'cpu 100m は shares 102 だ。cgroup v2 では 1 ＋（102 − 2）× 9,999 ÷ 262,142 を切り捨てて cpu.weight 4 になる。Burstable の Pod は /kubepods.slice/kubepods-burstable.slice の下に入る。',
			'Relist() は 1 秒ごとに全てのコンテナの状態を問い、前と比べて出来事を作る。v1.31 の既定は、この問い直す PLEG だ。containerd の出来事を受ける Evented PLEG は alpha で、既定で切られている。'
		]
	},
	callout: {
		type: 'tip',
		text: '上限の実物は node で /sys/fs/cgroup/kubepods.slice/…/memory.max を読むと見える。134217728 と出れば 128 MiB だ。'
	},
	changes: [
		{ mark: '+', text: 'サンドボックスと web のコンテナ' },
		{ mark: '+', text: 'memory.max 134,217,728 B' },
		{ mark: '~', text: '87cwj が Running に' }
	],
	facts: [
		{ k: 'memory.max', v: '134,217,728 B（128 × 1,048,576）', calc: '128*1048576' },
		{ k: 'cpu.weight', v: '4（1 ＋ 100 × 9,999 ÷ 262,142 の切り捨て）' },
		{ k: 'PLEG の間隔', v: '1 秒' },
		{ k: '起きるまで', v: '2 秒' }
	],
	scene: [
		{ op: 'move', from: 'api', to: 'kl1', payload: '87cwj', kind: 'watch' },
		{ op: 'move', from: 'kl1', to: 'api', payload: 'status Running', kind: 'status' }
	],
	log: {
		t: '10:06:14.104',
		from: 'kl1',
		to: 'api',
		kind: 'status',
		info: 'PATCH pods/web-6d8f7b9c4-87cwj/status：Running'
	},
	town: '棟 1 の管理人が部屋の箱を作り、上限の札を貼り、動き出したと台帳に返す',
	work: 'get pods -o wide で NODE と IP、node では crictl ps を見る',
	inside: {
		hosts: [
			cp([row('rs-old', 1, 'ReplicaSet web-6d8f7b9c4', '3 個・Ready 0')]),
			N1([
				kl1,
				row('k-ctd', 1, 'containerd（shim 3 本）', '動いている'),
				q2wfz,
				row('p-87cwj', 1, `${POD}87cwj`, 'Running・10.244.1.24', 'ok'),
				row('g-87cwj', 2, 'cgroup memory.max', '134217728（使用 96 MiB）', 'warn')
			]),
			N2([kl2, b9m4t])
		],
		logs: [
			{
				t: '10:06:14',
				src: 'kubelet',
				text: 'I1119 10:06:14.104228 1873 kubelet.go:2439] "SyncLoop (PLEG): event for pod" pod="shop/web-6d8f7b9c4-87cwj"'
			},
			{
				t: '10:06:14',
				src: 'kubectl events',
				text: 'Normal   Started   pod/web-6d8f7b9c4-87cwj   Started container web'
			}
		]
	},
	metrics: { ready: '0 個', restarts: '0 回' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_iter', 'b_pw', 'b_syncpod'] } },
		{ at: 400, dur: 600, para: 0, do: { op: 'enqueue', queue: 'pw', item: 'ADD 87cwj' } },
		{ at: 1000, dur: 600, para: 0, do: { op: 'dequeue', queue: 'pw', item: 'ADD 87cwj' } },
		{ at: 1100, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 1800,
			dur: 800,
			para: 1,
			do: { op: 'camera', fit: ['b_syncpod', 'b_cpa', 'b_start', 'b_cri'] }
		},
		{
			at: 2200,
			dur: 700,
			para: 1,
			do: { op: 'packet', a: 'b_syncpod', b: 'b_cpa', label: '作る物は？', kind: 'call' }
		},
		{
			at: 2800,
			dur: 700,
			para: 1,
			do: { op: 'packet', a: 'b_syncpod', b: 'b_cri', label: 'RunPodSandbox', kind: 'cri' }
		},
		{ at: 3000, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{
			at: 3500,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_start', b: 'b_res', label: 'limits', kind: 'call' }
		},
		{
			at: 4200,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_start', b: 'b_cri', label: 'CreateContainer', kind: 'cri' }
		},
		{
			at: 4900,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'b_cri', text: 'runc：memory.max 134217728' }
		},
		{ at: 5000, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{
			at: 5400,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_start', b: 'b_cri', label: 'StartContainer', kind: 'cri' }
		},
		{ at: 6100, dur: 800, para: 3, do: { op: 'camera', fit: ['b_iter', 'b_pleg', 'b_sm'] } },
		{
			at: 6500,
			dur: 600,
			para: 3,
			do: { op: 'enqueue', queue: 'plegq', item: 'ContainerStarted' }
		},
		{
			at: 7100,
			dur: 700,
			para: 3,
			do: { op: 'packet', a: 'b_pleg', b: 'b_iter', label: 'ContainerStarted', kind: 'status' }
		},
		{
			at: 7800,
			dur: 700,
			para: 3,
			do: { op: 'packet', a: 'b_iter', b: 'b_sm', label: 'SyncPod → Running', kind: 'status' }
		},
		{ at: 7900, dur: 400, para: 3, do: { op: 'board', line: 3 } },
		{
			at: 8600,
			dur: 450,
			para: 3,
			do: { op: 'badge', id: 'b_sm', text: 'PATCH status', tone: 'ok' }
		}
	],
	loop: [
		{ at: 0, dur: 600, do: { op: 'peek', queue: 'plegq', item: 'ContainerStarted' } },
		{
			at: 1000,
			dur: 700,
			do: { op: 'packet', a: 'b_pleg', b: 'b_cri', label: 'Relist', kind: 'cri' }
		},
		{
			at: 2000,
			dur: 700,
			do: { op: 'packet', a: 'b_pleg', b: 'b_cri', label: 'Relist', kind: 'cri' }
		}
	],
	board: [
		'SyncLoop ADD → podWorkerLoop()',
		'computePodActions() → RunPodSandbox',
		'limits → CreateContainer（runc が memory.max 128 MiB）→ Start',
		'PLEG → syncLoop → SyncPod → SetPodStatus で Running'
	],
	badges: { b_cri: 'runc：memory.max 134217728', b_sm: 'PATCH status' },
	layers: [B.klLoop([]), B.krt(), B.cri(), B.back([])],
	impl: [
		I.loopIter,
		I.workerLoop,
		I.syncPod,
		I.actions,
		I.start,
		I.linuxRes,
		I.cri,
		I.relist,
		I.setStatus,
		I.doBackOff
	],
	refs: [
		'k8s-kubelet',
		'k8s-pod-workers',
		'k8s-kuberuntime',
		'k8s-kr-container',
		'k8s-kr-linux',
		'k8s-cri-api',
		'k8s-pleg',
		'k8s-status',
		'cgroup-v2'
	],
	learns: [4]
};

export const s7: Step = {
	n: 7,
	kind: 'fail',
	short: '落ちた',
	title: '部屋が落ちた：OOMKilled',
	lead: '上限 128 MiB を超え、カーネルが SIGKILL で止める',
	body: [
		'87cwj は品物の一覧を読み、3 秒で上限 128 MiB を超える。',
		'カーネルが SIGKILL で止め、理由は OOMKilled、終わりの番号は 137 だ。'
	],
	depth: {
		intro: [
			'部屋 87cwj は品物の一覧を棚に広げ始める。全部広げるには 182 MiB 要るが、部屋の札には 128 MiB までと書いてある。',
			'札を超えた瞬間、棟の電源係（カーネル）が部屋の仕事を有無を言わさず止める。管理人は「記憶の使いすぎで止められた」と台帳に書く。'
		],
		work: [
			'87cwj は品物の一覧 48,210 件を読み込み、3 秒で 182 MiB に達しようとする。cgroup の memory.max は 128 MiB なので、128 MiB を超えた所でページを確保できなくなる。',
			'カーネルはまず cgroup の中の記憶を取り戻そうとする。取り戻せないと、cgroup の中で 1 つのプロセスを選び SIGKILL で止める。node の dmesg に「Memory cgroup out of memory: Killed process」と残る。',
			'containerd は TaskOOM の出来事を受けて、理由に OOMKilled を書く。終わりの番号は 128 ＋ 9（SIGKILL）＝ 137 だ。PLEG が ContainerDied を見つけ、restartPolicy: Always なので kubelet が起こし直す。'
		],
		deep: [
			'ページを確保するたびに try_charge_memcg() が cgroup の勘定に足す。memory.max を超えると、まず cgroup の中の記憶を取り戻す（reclaim）。それでも足りないと mem_cgroup_out_of_memory() を呼ぶ。',
			'mem_cgroup_out_of_memory() は、その cgroup の中だけで、oom_badness() の点が最も高いプロセスを選ぶ。点は使っている記憶のページ数に oom_score_adj の分を足して決まり、oom_kill_process() が SIGKILL を送る。',
			'cgroup v2 の memory.events の oom_kill が 1 増える。containerd は cgroup の出来事を見張る。TaskOOM を受けた handleEvent() が、そのコンテナの理由を OOMKilled にする。',
			'v1.28 から、cgroup v2 の node では kubelet が memory.oom.group を 1 にする。cgroup の中の 1 つが選ばれると、中の全てのプロセスがまとめて止まり、半分だけ生き残る壊れ方をしない。',
			'Pod の phase は Running のままで、コンテナの state だけが Terminated（OOMKilled・137）になる。1 回目は待たずに起こし直すので、RESTARTS は 1 になり、2 秒後にまた読み込みが始まる。'
		]
	},
	callout: {
		type: 'warn',
		text: '137 は「SIGKILL で止まった」だけを意味する。OOMKilled は OOM killer の印で、limits 未満で出たら node 全体の不足を dmesg で疑う。'
	},
	changes: [
		{ mark: '-', text: '87cwj のコンテナが止められた' },
		{ mark: '+', text: 'Last State：OOMKilled・137' },
		{ mark: '~', text: 'RESTARTS 0 → 1' }
	],
	facts: [
		{ k: '使う記憶', v: '182 MiB（上限 128 MiB を 54 MiB 超える）' },
		{ k: '超える割合', v: '1.42 倍（182 ÷ 128）', calc: '182/128' },
		{ k: '落ちるまで', v: '起きてから 3 秒' },
		{ k: '終わりの番号', v: '137（128 ＋ 9）', calc: '128+9' }
	],
	scene: [{ op: 'move', from: 'kl1', to: 'api', payload: 'OOMKilled', kind: 'status' }],
	log: {
		t: '10:06:17.215',
		from: 'kl1',
		to: 'api',
		kind: 'status',
		info: '87cwj：Terminated・Reason OOMKilled・Exit Code 137。すぐ起こし直す'
	},
	town: '部屋の札の上限を超えた瞬間、電源係が仕事を止め、管理人が理由を台帳に書く',
	work: 'kubectl describe pod の Last State の Reason と Exit Code を読む',
	ask: {
		q: '87cwj の終わりの番号が 137 になるのはなぜ？',
		opts: ['プログラムが 137 を返した', '128 ＋ SIGKILL の 9', 'Kubernetes の決まった番号'],
		a: 1,
		why: 'シグナルで止まったプロセスの終わりの番号は 128 ＋ シグナルの番号。SIGKILL は 9。'
	},
	inside: {
		hosts: [
			cp([row('rs-old', 1, 'ReplicaSet web-6d8f7b9c4', '3 個・Ready 0')]),
			N1([
				kl1,
				row('k-ctd', 1, 'containerd（shim 3 本）', 'TaskOOM を受けた', 'warn'),
				q2wfz,
				row('p-87cwj', 1, `${POD}87cwj`, 'OOMKilled（137）→ 起こし直す', 'bad'),
				row('g-87cwj', 2, 'cgroup memory.events', 'oom_kill 1', 'bad')
			]),
			N2([kl2, b9m4t])
		],
		logs: [
			{
				t: '10:06:17',
				src: 'kernel',
				text: 'Memory cgroup out of memory: Killed process 31337 (node) total-vm:1325412kB, anon-rss:126976kB, file-rss:4096kB'
			},
			{
				t: '10:06:17',
				src: 'kubelet',
				text: 'I1119 10:06:17.215903 1873 kubelet.go:2439] "SyncLoop (PLEG): event for pod" pod="shop/web-6d8f7b9c4-87cwj"'
			}
		]
	},
	metrics: { ready: '0 個', restarts: '1 回' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_charge', 'b_memcg', 'b_kill'] } },
		{
			at: 400,
			dur: 450,
			para: 0,
			do: { op: 'badge', id: 'b_charge', text: '96 → 128 MiB', tone: 'warn' }
		},
		{ at: 1000, dur: 500, para: 0, do: { op: 'pulse', id: 'b_charge' } },
		{ at: 1100, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 1800,
			dur: 700,
			para: 1,
			do: {
				op: 'packet',
				a: 'b_charge',
				b: 'b_memcg',
				label: '上限を超えた',
				kind: 'kill',
				stall: true
			}
		},
		{
			at: 2500,
			dur: 700,
			para: 1,
			do: { op: 'packet', a: 'b_memcg', b: 'b_kill', label: '1 つ選ぶ', kind: 'kill' }
		},
		{ at: 3200, dur: 600, para: 1, do: { op: 'fail', id: 'b_kill' } },
		{ at: 3300, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 4000, dur: 800, para: 2, do: { op: 'camera', fit: ['b_kill', 'b_ctd', 'kl1'] } },
		{
			at: 4400,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_kill', b: 'b_ctd', label: 'TaskOOM', kind: 'kill' }
		},
		{
			at: 5100,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'b_ctd', text: 'OOMKilled・137', tone: 'bad' }
		},
		{ at: 5200, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 5900, dur: 800, para: 2, do: { op: 'count', metric: 'restarts', to: '1 回' } },
		{
			at: 6000,
			dur: 800,
			para: 2,
			do: { op: 'packet', a: 'kl1', b: 'api', label: 'OOMKilled', kind: 'status' }
		},
		{ at: 6900, dur: 400, para: 2, do: { op: 'board', line: 3 } }
	],
	loop: [
		// 最後の寄りの中で流す（留まる間も図の中で流れが続く。LS-M4・D1）
		{
			at: 0,
			dur: 700,
			do: { op: 'packet', a: 'kl1', b: 'api', label: 'OOMKilled', kind: 'status' }
		},
		{ at: 900, dur: 600, do: { op: 'fail', id: 'kl1' } },
		{
			at: 1700,
			dur: 700,
			do: { op: 'packet', a: 'api', b: 'etcd', label: '再起動 1', kind: 'status' }
		}
	],
	board: [
		'try_charge_memcg()：128 MiB を超える',
		'mem_cgroup_out_of_memory() → SIGKILL',
		'containerd：理由 OOMKilled・137',
		'restartPolicy: Always で起こし直す'
	],
	badges: { b_ctd: 'OOMKilled・137', kl1: '87cwj 落ちた' },
	layers: [B.kern(), B.ctd()],
	impl: [I.charge, I.memcgOom, I.oomKill, I.ctdEvent],
	refs: [
		'cgroup-v2',
		'linux-memcontrol',
		'linux-oom',
		'containerd-events',
		'k8s-assign-memory',
		'k8s-pod-lifecycle'
	],
	learns: [5]
};

export const s8: Step = {
	n: 8,
	kind: 'fail',
	short: '待ちが伸びる',
	title: 'CrashLoopBackOff の待ち',
	lead: '起こし直しの待ちは 10 秒から倍に伸び、300 秒で頭打ち',
	body: [
		'落ち続けると、kubelet は起こし直す前の待ちを倍に延ばす。',
		'待っている間の名前が CrashLoopBackOff で、Ready の番地は 0 個になる。'
	],
	depth: {
		intro: [
			'落ちた部屋を管理人がすぐ起こすと、また 5 秒で落ちる。1 分に 12 回も繰り返すと、棟の CPU とイメージの読み込みを無駄に使い、ほかの部屋の邪魔になる。',
			'そこで管理人は、落ちるたびに次に起こすまでの待ちを倍に延ばす。待っている間の札が CrashLoopBackOff だ。'
		],
		work: [
			'1 回目は待たずに起こし直す。また落ちると、kubelet は次を 10 秒待たせる。待ちは 10 → 20 → 40 → 80 → 160 秒と倍に伸び、300 秒で頭打ちになる。',
			'待っている間、コンテナの state は Waiting・理由 CrashLoopBackOff だ。get pods の RESTARTS は「6 (39s ago)」のように、回数と最後に落ちた時（FinishedAt）からの時間を出す。',
			'3 つとも Ready でない。Service web の EndpointSlice には 3 つの番地が ready: false で載り、使える番地は 0 個になる。入口は 503 を返す。Pod 自体は在るので、ReplicaSet は何もしない。'
		],
		deep: [
			'SyncPod() の中の doBackOff() は、getStableKey() の鍵で待ちの表を引く。鍵は Pod の名前・名前空間・UID・コンテナの名前と、コンテナの定義の hash（HashContainer()）だ。最後に落ちた時刻（FinishedAt）から待ちが過ぎていなければ ErrCrashLoopBackOff を返し、起こさない。',
			'待ちの表は client-go の flowcontrol.Backoff だ。初めは 10 秒（backOffPeriod）、上限は 300 秒（MaxContainerBackOff）。IsInBackOffSince() が待ちの中かを答え、Next() が待ちを倍にする。',
			'最後に更新してから 600 秒（上限の 2 倍）落ちなければ、表の行は古いと見なされ、次の失敗は 10 秒から数え直す。公式文書は「10 分動けば待ちを戻す」と書く。',
			'待ちの中の同期は ErrCrashLoopBackOff を返す。先に積まれた ConfigPodSandbox の結果が除外の輪に当たり、同期はエラーになる（v1.31.0。k/k#123602）。pod worker は E の行「Error syncing pod, skipping」を残し、10〜15 秒後（10 秒 × ゆらぎ 0.5）に入れ直す。起こし直しは待ちが明けた後の最初の同期なので、公式の並びより最大 15 秒ほど遅れる。'
		]
	},
	callout: {
		type: 'point',
		text: 'CrashLoopBackOff は理由ではなく、「起こし直しを待っている」状態の名前。本当の理由は Last State の Reason と、前のコンテナのログにある。'
	},
	changes: [
		{ mark: '~', text: '待ち 0 → 10 → 20 秒' },
		{ mark: '~', text: 'STATUS が CrashLoopBackOff' },
		{ mark: '-', text: '使える番地 0 個（3 つとも ready: false）' }
	],
	facts: [
		{ k: '待ちの並び', v: '10・20・40・80・160・300 秒' },
		{
			k: '5 回目までの待ちの和',
			v: '310 秒（10 ＋ 20 ＋ 40 ＋ 80 ＋ 160）',
			calc: '10+20+40+80+160'
		},
		{ k: '数え直すまで', v: '600 秒（300 秒 × 2）', calc: '300*2' },
		{ k: 'Ready の番地', v: '0 個（3 つとも待ち）' }
	],
	scene: [{ op: 'move', from: 'kl1', to: 'api', payload: 'BackOff', kind: 'status' }],
	log: {
		t: '10:06:39.118',
		from: 'kl1',
		to: 'api',
		kind: 'status',
		info: '87cwj：Waiting・CrashLoopBackOff（back-off 20s）。RESTARTS 2'
	},
	town: '管理人は落ちるたびに、次に部屋を起こすまでの待ちを倍に延ばす',
	work: 'kubectl get pods -n shop -w で、RESTARTS と STATUS の移り変わりを流して見る',
	inside: {
		hosts: [
			cp([
				row('rs-old', 1, 'ReplicaSet web-6d8f7b9c4', '3 個・Ready 0'),
				row('ep-web', 1, 'EndpointSlice web-…', '番地 3 つ・どれも ready: false', 'bad')
			]),
			N1([
				kl1,
				q2wfz,
				row('p-87cwj', 1, `${POD}87cwj`, 'CrashLoopBackOff（2 回・待ち 20 秒）', 'bad'),
				row('g-87cwj', 2, 'cgroup memory.events', 'oom_kill 3', 'bad')
			]),
			N2([kl2, b9m4t])
		],
		logs: [
			{
				t: '10:06:39',
				src: 'kubelet',
				text: 'E1119 10:06:39.118702 1873 pod_workers.go:1301] "Error syncing pod, skipping" err="… CrashLoopBackOff: \\"back-off 20s …"'
			},
			{
				t: '10:06:39',
				src: 'kubectl events',
				text: 'Warning   BackOff   pod/web-6d8f7b9c4-87cwj   Back-off restarting failed container web in pod web-6d8f7b9c4-87cwj_shop'
			}
		]
	},
	metrics: { ready: '0 個', restarts: '2 回', wait: '20 秒' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_dbo', 'b_ibo', 'b_next2'] } },
		{ at: 400, dur: 600, para: 0, do: { op: 'enqueue', queue: 'boq', item: 'web 10 秒' } },
		{ at: 1100, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 1900,
			dur: 700,
			para: 0,
			do: { op: 'packet', a: 'b_dbo', b: 'b_ibo', label: '待ちの中？', kind: 'call', stall: true }
		},
		{
			at: 2600,
			dur: 450,
			para: 1,
			do: { op: 'badge', id: 'b_ibo', text: 'まだ待ち → BackOff を記して戻る', tone: 'bad' }
		},
		{ at: 2700, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{
			at: 3300,
			dur: 700,
			para: 1,
			do: { op: 'packet', a: 'b_dbo', b: 'b_ibo', label: '待ちが明けた', kind: 'call' }
		},
		{
			at: 4000,
			dur: 700,
			para: 1,
			do: { op: 'packet', a: 'b_ibo', b: 'b_next2', label: 'Next：倍に', kind: 'call' }
		},
		{ at: 4600, dur: 400, para: 1, do: { op: 'board', line: 2 } },
		{ at: 4700, dur: 800, para: 1, do: { op: 'count', metric: 'wait', to: '20 秒' } },
		{ at: 4800, dur: 800, para: 1, do: { op: 'count', metric: 'restarts', to: '2 回' } },
		{ at: 5000, dur: 800, para: 2, do: { op: 'camera', fit: ['b_next2', 'kl1', 'api'] } },
		{
			at: 5400,
			dur: 800,
			para: 2,
			do: { op: 'packet', a: 'kl1', b: 'api', label: 'BackOff', kind: 'status', stall: true }
		},
		{
			at: 6300,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'api', text: 'Ready の番地 0 個', tone: 'bad' }
		},
		{ at: 6400, dur: 400, para: 2, do: { op: 'board', line: 3 } },
		{ at: 1100, dur: 700, para: 0, do: { op: 'pulse', id: 'b_dbo' } },
		{ at: 3100, dur: 700, para: 1, do: { op: 'pulse', id: 'b_ibo' } },
		{ at: 4500, dur: 700, para: 1, do: { op: 'pulse', id: 'b_next2' } }
	],
	loop: [
		// 最後の寄りの中で流す（留まる間も図の中で流れが続く。LS-M4・D1）
		{
			at: 0,
			dur: 900,
			do: { op: 'packet', a: 'kl1', b: 'api', label: 'BackOff', kind: 'status', stall: true }
		},
		{ at: 1000, dur: 600, do: { op: 'fail', id: 'kl1' } },
		{ at: 2000, dur: 600, do: { op: 'pulse', id: 'api' } }
	],
	board: [
		'doBackOff()：表を引く',
		'待ちの中：BackOff を記して戻る（10〜15 秒ごと）',
		'待ちが明けた同期：Next() で 10 → 20 秒、起こす',
		'Ready 0 個 → 入口は 503'
	],
	badges: { api: 'Ready の番地 0 個', b_ibo: 'まだ待ち → BackOff を記して戻る' },
	layers: [B.bo([])],
	impl: [I.syncPod, I.doBackOff, I.inBackOff, I.boNext, I.maxBackOff],
	knobs: ['restarts', 'replicas'],
	refs: ['k8s-pod-lifecycle', 'k8s-kuberuntime', 'k8s-backoff', 'k8s-kubelet', 'k8s-pod-workers'],
	learns: [5]
};
