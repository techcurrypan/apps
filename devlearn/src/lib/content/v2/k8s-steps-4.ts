// 見本 2（k8s-101）のステップ 13〜15：運用（describe・events・logs --previous の読み方）・教えるとき・まとめ。
import type { Step } from '../../lesson/types.ts';
import { cp, node, POD, row } from './k8s-base.ts';

const N1 = (rows: ReturnType<typeof row>[]) => node('node-1', '10.0.1.11', '棟 1', rows);
const kl1 = row('kl-1', 0, 'kubelet（node-1）', '動いている');

export const s13: Step = {
	n: 13,
	kind: 'ops',
	short: '読む順',
	title: '落ちた Pod を読む順',
	lead: 'get pods・describe・logs・events の順に絞る',
	body: [
		'get pods で STATUS と RESTARTS、describe で Last State の理由を読む。',
		'logs --previous で落ちる前の行、get events で周りの出来事を読む。'
	],
	depth: {
		intro: [
			'落ち続ける部屋の調べ方には順がある。まず全部の部屋の札を眺め、次に 1 つの部屋の記録を開き、止められる前の日誌を読み、最後に周りの出来事を並べる。',
			'この順なら、命令 4 つ・5 分ほどで「数の問題か・置き場所の問題か・中身の問題か」を分けられる。どの段で何が分かるかを、1 つずつ見る。'
		],
		work: [
			'kubectl get pods -n shop で STATUS と RESTARTS を見る。「CrashLoopBackOff・6 (39s ago)」なら落ちて待っている。Pending なら置き場所、ImagePullBackOff ならイメージの問題だ。',
			'kubectl describe pod で Last State を読む。「Terminated・Reason OOMKilled・Exit Code 137」なら上限、「Error・Exit Code 1」ならプログラムの失敗だ。Limits と Requests も同じ画面にある。',
			'logs --previous で落ちる前の最後の行を読む。SIGKILL ではエラーの行が残らず、「96 MiB of 182 MiB」で途切れる。',
			'get events は 1 時間分しか残らない。REASON（BackOff・FailedScheduling）と回数（x30）で止まった所を見る。'
		],
		deep: [
			'get pods の STATUS は、コンテナの state の理由をそのまま出す。Waiting なら CrashLoopBackOff など、Terminated なら OOMKilled・Error が出る。phase の Running とは別の物を出している。',
			'describe の Events は同じ出来事をまとめ「62s (x30 over 6m4s)」と出す。数は kubelet の手元で数えるが、API への更新は client-go の events_cache.go で間引かれる。Pod ごとに 25 件、その後は 300 秒に 1 件だ。7xk2p は手元で BackOff 35 だが、API には x30 で止まり、Age も遅れる。',
			'kubectl logs は kubelet の /containerLogs を通して、node のファイルを読む。道は /var/log/pods/<名前空間>_<名前>_<UID>/<コンテナ>/<回数>.log だ。--previous は 1 つ前の回数のファイルだ。止まったコンテナは 1 つしか残らない（MaxPerPodContainerCount 1）ので、2 回以上前のログは node からも消える。',
			'get events は kubectl が並べ替えず、API が返す名前（<物の名前>.<16 進の時刻>）の順に出る。時刻の順は --sort-by=.lastTimestamp か kubectl events で見る。events は --event-ttl（既定 1 時間）で消えるので、kubernetes-event-exporter などで貯めておく。',
			'kubectl top pod は metrics-server が要る。上限で止められた回の memory.peak は上限と同じ数しか出ず、起こし直すと cgroup も新しくなる。本当の量は、上限を一時的に上げた 1 つの Pod の memory.peak か、アプリのヒープの指標で測る。このログが 182 MiB と総量を書くのは特別な場合だ。'
		]
	},
	callout: {
		type: 'tip',
		text: 'まず describe の Last State と logs。待ちの間は --previous 無しでも落ちた回のログが出る。起こし直した後は今の回に替わるので --previous を付ける。'
	},
	changes: [
		{ mark: '+', text: 'STATUS・RESTARTS で症状を分ける' },
		{ mark: '+', text: 'Last State で理由（OOMKilled・137）' },
		{ mark: '+', text: 'logs --previous で落ちる前の行' }
	],
	facts: [
		{ k: 'events が残る長さ', v: '1 時間（--event-ttl の既定）' },
		{ k: '--previous で読める', v: '1 つ前の回だけ' },
		{ k: 'まとめた出来事（API に届いた数）', v: 'BackOff x30 over 6m4s・手元では 35' },
		{ k: '絞るまで', v: '命令 4 つ・約 5 分' }
	],
	scene: [
		{ op: 'move', from: 'you', to: 'api', payload: 'describe・logs・events', kind: 'write' },
		{ op: 'move', from: 'api', to: 'kl1', payload: 'containerLogs', kind: 'watch' }
	],
	log: {
		t: '10:21:00',
		from: 'you',
		to: 'api',
		kind: 'write',
		info: 'get pods → describe → logs --previous → get events で原因を絞る'
	},
	town: '部屋の札・部屋の記録・止められる前の日誌・周りの出来事の順に読む',
	work: 'describe pod の Last State から Restart Count までを読む',
	inside: {
		packet: {
			name: 'GET /api/v1/namespaces/shop/pods/web-6d8f7b9c4-87cwj/log?previous=true',
			size: '約 380 B（応答 4 行）',
			parts: [
				{
					name: 'kubectl → API サーバ → kubelet',
					fields: [
						{
							k: 'API サーバの道',
							v: '/api/v1/namespaces/shop/pods/web-6d8f7b9c4-87cwj/log',
							level: 1
						},
						{ k: 'previous', v: 'true（1 つ前の回）', level: 1 },
						{
							k: 'kubelet の道',
							v: '10.0.1.11:10250 /containerLogs/shop/web-6d8f7b9c4-87cwj/web',
							level: 2
						},
						{
							k: 'node のファイル',
							v: '/var/log/pods/shop_web-6d8f7b9c4-87cwj_…/web/2.log',
							level: 3
						}
					]
				}
			]
		},
		hosts: [
			cp([row('a-api', 0, 'kube-apiserver', 'kubelet へ取り次ぐ')]),
			N1([
				kl1,
				row('p-87cwj', 1, `${POD}87cwj`, 'CrashLoopBackOff（2 回）', 'bad'),
				row('f-log', 2, '/var/log/pods/…/web/2.log', '4 行（読み込みの途中で終わる）', 'warn')
			])
		],
		logs: [
			{
				t: '10:21:00',
				src: 'stdout',
				text: '2026-11-19T01:06:32.871Z INFO  catalog cache 96 MiB of 182 MiB loaded'
			}
		]
	},
	metrics: { want: '3 個', ready: '0 個' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['you', 'api', 'kl1'] } },
		{
			at: 400,
			dur: 800,
			para: 0,
			do: { op: 'packet', a: 'you', b: 'api', label: 'get pods', kind: 'write' }
		},
		{ at: 1200, dur: 450, para: 0, do: { op: 'badge', id: 'you', text: 'CrashLoopBackOff・6' } },
		{ at: 1300, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 2000,
			dur: 800,
			para: 1,
			do: { op: 'packet', a: 'you', b: 'api', label: 'describe', kind: 'write' }
		},
		{
			at: 2800,
			dur: 450,
			para: 1,
			do: { op: 'badge', id: 'api', text: 'OOMKilled・137', tone: 'bad' }
		},
		{ at: 2900, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{
			at: 3600,
			dur: 800,
			para: 2,
			do: { op: 'packet', a: 'api', b: 'kl1', label: 'logs --previous', kind: 'watch' }
		},
		{
			at: 4400,
			dur: 800,
			para: 2,
			do: { op: 'packet', a: 'kl1', b: 'api', label: '96 of 182 MiB', kind: 'status' }
		},
		{
			at: 5000,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'api', b: 'you', label: '4 行', kind: 'status' }
		},
		{ at: 4500, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{
			at: 5800,
			dur: 800,
			para: 3,
			do: { op: 'packet', a: 'you', b: 'api', label: 'get events', kind: 'write' }
		},
		{
			at: 6600,
			dur: 450,
			para: 3,
			do: { op: 'badge', id: 'you', text: 'BackOff x30（手元 35）', tone: 'warn' }
		},
		{ at: 6700, dur: 400, para: 3, do: { op: 'board', line: 3 } }
	],
	loop: [
		{
			at: 0,
			dur: 800,
			do: { op: 'packet', a: 'you', b: 'api', label: 'get pods -w', kind: 'write' }
		},
		{ at: 1000, dur: 800, do: { op: 'packet', a: 'api', b: 'you', label: '知らせ', kind: 'watch' } }
	],
	board: [
		'get pods：CrashLoopBackOff・6 回',
		'describe：OOMKilled・137・Limits 128Mi',
		'logs --previous：96 of 182 MiB で終わる',
		'get events：BackOff x30（間引き後）'
	],
	badges: { you: 'BackOff x30（手元 35）', api: 'OOMKilled・137' },
	refs: [
		'k8s-debug-pod',
		'kubectl-describe',
		'kubectl-logs',
		'kubectl-events',
		'k8s-pod-lifecycle'
	],
	learns: [6]
};

export const s14: Step = {
	n: 14,
	kind: 'teach',
	short: '教える',
	title: '教えるときの 3 つの誤解',
	lead: '「再起動すれば直る」「137 はアプリの失敗」「requests は上限」',
	body: [
		'自己修復は数を戻すだけで、同じ型紙の Pod は同じ理由で落ちる。',
		'137 は SIGKILL の印で、requests は上限ではなく予約だ。'
	],
	depth: {
		intro: [
			'新人が最初に誤るのは、言葉の意味だ。「自己修復」「137」「requests」は、どれも名前から思う意味と違う。',
			'先に誤りを口に出させ、それから図のどの動きが本当の意味かを指させる。3 つの誤りを 1 つずつ図で直すと、次から自分で describe を読める。'
		],
		work: [
			'誤解 1「消せば直る」。消すと ReplicaSet が同じ型紙の Pod を作り、同じ 5 秒で落ちる。正しくは「数は戻るが理由は残る。Last State とログで理由を見る」。',
			'誤解 2「137 はアプリが返した」。137 は 128 ＋ 9 で、外から SIGKILL で止められた印だ。OOMKilled は OOM killer に止められた印で、limits に届かずに止まったなら node 全体の不足を疑う。dmesg の Memory cgroup out of memory か Out of memory で分ける。',
			'誤解 3「requests は使ってよい上限」。requests は node の空きから引く予約で、置き場所と追い出しの順を決める。止める線は limits だ。1 分の説明と、後輩への問い 2 つを下に置く。'
		],
		deep: [
			'1 分の説明：欲しい数は API サーバを通して etcd に書かれる。コントローラ・スケジューラ・kubelet は watch で変化を受け、手元の写しで差を見て、差を埋める書き込みだけをする。Pod が落ちても数は戻るが、落ちる理由は戻らない。',
			'問い 1：「RESTARTS 12・Last State OOMKilled・Limits 256Mi。何を見て、何を直すか」。答えは logs --previous を読み、上限を一時的に上げた 1 つの Pod の memory.peak で使う量を測る。上限は測った最大 ＋ 余裕にする。上限を 2 倍にして終える答えは不可だ。',
			'問い 2：「Pending のまま 10 分。どこを見るか」。答えは get events の FailedScheduling の文と、describe node の Allocated resources だ。Insufficient memory なら requests か node の数、untolerated taint なら tolerations を見る。',
			'教える時は、ステップ 4 の差 −1 の動きと、ステップ 8 の待ちが倍に伸びる動きを、つまみで再起動の回数を動かして見せる。待ちの和が 310 秒（下限。実際は同期の間隔の分だけ遅れる）になる計算を、自分で出させる。'
		]
	},
	callout: {
		type: 'warn',
		text: '「とりあえず消して様子を見る」を教えない。消すと前のコンテナのログ（--previous）も一緒に消え、理由が読めなくなる。'
	},
	changes: [
		{ mark: '~', text: '消せば直る → 数は戻るが理由は残る' },
		{ mark: '~', text: '137 はアプリ → SIGKILL の印' },
		{ mark: '~', text: 'requests は上限 → 予約' }
	],
	facts: [
		{ k: '137', v: '137（128 ＋ 9。SIGKILL）', calc: '128+9' },
		{ k: '待ちの和（5 回目まで）', v: '310 秒' },
		{ k: '後輩への問い', v: '2 問（OOMKilled と Pending）' },
		{ k: '1 分の説明', v: '4 文' }
	],
	scene: [{ op: 'move', from: 'you', to: 'api', payload: '問い', kind: 'write' }],
	log: {
		t: '10:30:00',
		from: 'you',
		to: 'api',
		kind: 'write',
		info: '誤解 3 つ：消せば直る・137 はアプリ・requests は上限'
	},
	town: '新人には、言葉の意味の取り違えを先に言わせ、図の動きで直させる',
	work: '新人に describe の Last State を声に出して読ませ、理由と番号を言い分けさせる',
	metrics: { want: '3 個' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['ctrl', 'api', 'kl1'] } },
		{
			at: 400,
			dur: 800,
			para: 0,
			do: { op: 'packet', a: 'ctrl', b: 'api', label: '同じ型紙', kind: 'write' }
		},
		{ at: 1300, dur: 600, para: 0, do: { op: 'fail', id: 'kl1' } },
		{ at: 1400, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 2200,
			dur: 450,
			para: 1,
			do: { op: 'badge', id: 'kl1', text: '137 ＝ 128 ＋ 9', tone: 'bad' }
		},
		{ at: 2300, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 3100, dur: 800, para: 2, do: { op: 'camera', fit: ['sched', 'kl1', 'kl2'] } },
		{ at: 3500, dur: 450, para: 2, do: { op: 'badge', id: 'sched', text: 'requests ＝ 予約' } },
		{ at: 3600, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 4400, dur: 400, para: 2, do: { op: 'board', line: 3 } },
		{ at: 900, dur: 700, para: 0, do: { op: 'pulse', id: 'kl1' } },
		{ at: 4300, dur: 700, para: 2, do: { op: 'pulse', id: 'kl2' } }
	],
	loop: [
		{
			at: 0,
			dur: 800,
			do: { op: 'packet', a: 'ctrl', b: 'api', label: '数を戻す', kind: 'write' }
		},
		{ at: 1000, dur: 600, do: { op: 'fail', id: 'kl1' } },
		{ at: 600, dur: 700, do: { op: 'pulse', id: 'sched' } }
	],
	board: [
		'消せば直る → 同じ理由でまた落ちる',
		'137 → 外から SIGKILL',
		'requests → 予約。止める線は limits',
		'問い：OOMKilled と Pending'
	],
	badges: { kl1: '137 ＝ 128 ＋ 9', sched: 'requests ＝ 予約' },
	refs: ['k8s-pod-lifecycle', 'k8s-resources', 'k8s-debug-pod'],
	learns: [5]
};

export const s15: Step = {
	n: 15,
	kind: 'summary',
	short: 'まとめ',
	title: 'まとめ：書く・届く・埋める',
	lead: '欲しい状態を書き、watch で届き、差を埋める。理由は自分で読む',
	body: [
		'欲しい状態は API サーバを通して etcd に書かれ、watch で部品に届く。',
		'部品は差を埋めるだけなので、落ちる理由は数とログで自分で読む。'
	],
	depth: {
		intro: [
			'役場の台帳に「部屋 3 つ」と書けば、見張り番・部屋割り係・棟の管理人が、それぞれ台帳を見て欠けた所を埋める。誰も互いに命令しない。',
			'だが部屋が落ちる理由は、誰も直してくれない。札（上限）と日誌（ログ）を読み、使う量を測ってから、自分で札を書き直す。'
		],
		work: [
			'kubectl の DELETE は API サーバで確かめられ、etcd の版を 1 つ進める。変化は watch で配られ、informer がワークキューに鍵を入れる。',
			'ReplicaSet コントローラは差 −1 を見て Pod を作り、スケジューラは requests が入る node に bind する。kubelet は CRI で起こし、cgroup に上限を書く。',
			'上限 128 MiB を 182 MiB が超えて OOMKilled（137）、待ちが 10 秒から倍の CrashLoopBackOff になった。使う量を測って上限 256Mi・予約 192Mi に直すと、3 つが Ready になった。'
		],
		deep: [
			'書く道は DeleteResource() → GuaranteedUpdate() だ。届く道は ListAndWatch() → HandleDeltas() だ。埋める道は syncReplicaSet() → manageReplicas() → ScheduleOne() → Bind() だ。',
			'起こす道は syncLoopIteration() → startContainer() → CreateContainer() だ。戻り道は Relist() → syncLoopIteration() → SyncPod() → SetPodStatus() だ。',
			'壊れた所は try_charge_memcg() → mem_cgroup_out_of_memory() → oom_kill_process() だ。待ちは doBackOff() で 10・20・40・80・160・300 秒。',
			'数の目安：猶予 30 秒、NotReady まで 40 秒、移すまで 300 秒、待ちの上限 300 秒。待ちを戻すまで 600 秒、events は 1 時間、追い出しは 100 MiB を割った時。',
			'次に学ぶとよいこと：probe（liveness・readiness・startup）で Ready を決める道。Service と EndpointSlice と kube-proxy の規則、HPA で数を変える道。'
		]
	},
	callout: {
		type: 'point',
		text: 'Kubernetes の部品は「今の姿を読み、欲しい姿との差を埋める書き込みをする」だけを繰り返す。だから知らせを取りこぼしても、いずれ正しい姿に戻る。'
	},
	changes: [
		{ mark: '+', text: '書く：API サーバと etcd' },
		{ mark: '+', text: '届く：watch と informer' },
		{ mark: '+', text: '埋める：コントローラ・スケジューラ・kubelet' }
	],
	facts: [
		{ k: '通った部品', v: '5 つ（API サーバ・etcd・コントローラ・スケジューラ・kubelet）' },
		{ k: '待ちの上限', v: '300 秒' },
		{ k: '移すまで', v: '340 秒（40 ＋ 300）', calc: '40+300' },
		{ k: '直した上限', v: '256 MiB' }
	],
	scene: [
		{ op: 'move', from: 'you', to: 'api', payload: '欲しい状態', kind: 'write' },
		{ op: 'move', from: 'api', to: 'ctrl', payload: 'watch', kind: 'watch' },
		{ op: 'move', from: 'api', to: 'kl1', payload: 'watch', kind: 'watch' }
	],
	log: {
		t: '10:31:00',
		from: 'api',
		to: 'ctrl',
		kind: 'watch',
		info: '書く → 届く → 埋める。web は 3 / 3 Ready'
	},
	town: '台帳に書けば、見張り番と部屋割り係と管理人が欠けを埋める。落ちる理由は自分で読む',
	work: 'kubectl get deploy,rs,pods -n shop で、欲しい数・型紙・今の数を一度に見る',
	metrics: { want: '3 個', ready: '3 個', pending: '0 個', restarts: '0 回', wait: '0 秒' },
	motion: [
		{
			at: 0,
			dur: 900,
			para: 0,
			do: { op: 'camera', fit: ['you', 'api', 'etcd', 'ctrl', 'sched', 'kl1', 'kl2'] }
		},
		{
			at: 500,
			dur: 800,
			para: 0,
			do: { op: 'packet', a: 'you', b: 'api', label: '欲しい状態', kind: 'write' }
		},
		{
			at: 1300,
			dur: 800,
			para: 0,
			do: { op: 'packet', a: 'api', b: 'etcd', label: 'Txn', kind: 'write' }
		},
		{ at: 1400, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 2200,
			dur: 800,
			para: 1,
			do: { op: 'packet', a: 'api', b: 'ctrl', label: 'watch', kind: 'watch' }
		},
		{
			at: 3000,
			dur: 800,
			para: 1,
			do: { op: 'packet', a: 'sched', b: 'api', label: 'bind', kind: 'bind' }
		},
		{ at: 3100, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{
			at: 3900,
			dur: 800,
			para: 1,
			do: { op: 'packet', a: 'api', b: 'kl1', label: 'watch', kind: 'watch' }
		},
		{ at: 4800, dur: 900, para: 2, do: { op: 'count', metric: 'ready', to: '3 個' } },
		{ at: 4900, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 5800, dur: 450, para: 2, do: { op: 'badge', id: 'kl1', text: 'Ready', tone: 'ok' } },
		{ at: 5900, dur: 450, para: 2, do: { op: 'badge', id: 'kl2', text: 'Ready', tone: 'ok' } },
		{ at: 3700, dur: 700, para: 1, do: { op: 'pulse', id: 'api' } },
		{ at: 4300, dur: 700, para: 1, do: { op: 'pulse', id: 'kl1' } }
	],
	loop: [
		{ at: 0, dur: 900, do: { op: 'packet', a: 'api', b: 'ctrl', label: 'watch', kind: 'watch' } },
		{
			at: 300,
			dur: 900,
			do: { op: 'packet', a: 'api', b: 'sched', label: 'watch', kind: 'watch' }
		},
		{ at: 600, dur: 900, do: { op: 'packet', a: 'api', b: 'kl1', label: 'watch', kind: 'watch' } },
		{ at: 900, dur: 900, do: { op: 'packet', a: 'api', b: 'kl2', label: 'watch', kind: 'watch' } }
	],
	board: [
		'書く：DELETE・PATCH → etcd の版',
		'届く：watch → informer → キュー',
		'埋める：差 −1・bind・CRI',
		'理由は Last State とログで読む'
	],
	badges: { kl1: 'Ready', kl2: 'Ready' },
	refs: ['k8s-controller', 'k8s-pod-lifecycle', 'k8s-resources', 'k8s-nodes', 'k8s-eviction'],
	learns: [0, 1, 2, 3, 4, 5, 6]
};
