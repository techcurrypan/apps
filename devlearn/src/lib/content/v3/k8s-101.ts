// 見本 2（第 3 版）：Kubernetes「Pod が落ちても戻る（宣言と制御ループ）」。試作 learn11 の #k8s が下限（learn-standard.md 第 15・20 章）。
// 名前と既定値は Kubernetes v1.31 の文書と v1.31.0 のソースで確かめた（確認日 2026-11-28）：
//   CrashLoopBackOff の待ち 10 s から倍・上限 300 s（Pod Lifecycle）、Lease は 10 s ごと・node-monitor-grace-period 40 s（Nodes・kube-controller-manager）、
//   NoExecute の tolerationSeconds 既定 300 s（Taints and Tolerations）、BurstReplicas = 500・slowStartBatch（pkg/controller/replicaset）、
//   終了コード 137 = 128 + 9（SIGKILL）。数の確かめ：2,048 ÷ 384 = 5.33 → 5 個、2,048 ÷ 256 = 8 個、3.8 + 0.25 = 4.05 > 4
import type { V3Lesson } from '../../learn/check-v3.ts';

export const K8S_101_V3: V3Lesson = {
	id: 'k8s-101',
	field: 'k8s',
	title: 'Pod が落ちても元に戻る仕組み',
	goal: '「3 つ動かして」と書いた紙から、Pod が起き、落ち、戻るまでを、係と帳簿と待ち時間で説明できる',
	kick: 'Kubernetes ・ 段 3（設計と障害対応）・ 見せ方：クラスタと係',
	terms: [
		'container',
		'pod',
		'node',
		'cluster',
		'kubectl',
		'desired',
		'manifest',
		'apply',
		'etcd',
		'apiserver',
		'deploy',
		'replicas',
		'ctrl',
		'loop',
		'watch',
		'rs',
		'sched',
		'filter',
		'score',
		'bind',
		'kubelet',
		'cri',
		'cni',
		'probe',
		'ready',
		'limits',
		'cgroup',
		'oom',
		'oomk',
		'backoff',
		'lease',
		'notready',
		'taint',
		'requests',
		'qos',
		'describe',
		'events',
		'laststate'
	],
	objs: {
		kubectl: { kind: 'laptop', name: 'kubectl（あなたの端末）', tone: 'gray', term: 'kubectl' },
		api: { kind: 'hex', name: 'kube-apiserver', tone: 'teal', glyph: '⇄', term: 'apiserver' },
		etcd: { kind: 'db', name: 'etcd（帳簿）', tone: 'purple', term: 'etcd' },
		ctrl: {
			kind: 'block',
			name: 'controller-manager',
			tone: 'blue',
			glyph: '↻',
			term: 'ctrl'
		},
		sched: { kind: 'block', name: 'kube-scheduler', tone: 'blue', glyph: '⌖', term: 'sched' },
		kubelet: { kind: 'func', name: 'kubelet（node-2）', tone: 'blue', glyph: 'ƒ', term: 'kubelet' },
		crt: { kind: 'func', name: 'containerd', tone: 'gray', glyph: '▣', term: 'cri' },
		oom: { kind: 'func', name: 'OOM killer（Linux）', tone: 'red', glyph: '!', term: 'oom' },
		n1: { kind: 'platform', name: 'node-1', tone: 'green', term: 'node' },
		n2: { kind: 'platform', name: 'node-2', tone: 'green', term: 'node' },
		n3: { kind: 'platform', name: 'node-3', tone: 'green', term: 'node' },
		pa: { kind: 'pod', name: 'web-a', term: 'pod' },
		pb: { kind: 'pod', name: 'web-b', term: 'pod' },
		pc: { kind: 'pod', name: 'web-c', term: 'pod' },
		pd: { kind: 'pod', name: 'web-d', term: 'pod' }
	},
	metrics: [
		{ key: 'want', label: '望む数', term: 'replicas' },
		{ key: 'ready', label: 'Ready', term: 'ready' },
		{ key: 'restarts', label: '再起動', desc: 'コンテナを起こし直した回数。' },
		{ key: 'wait', label: '次の起こし直しまで', term: 'backoff' }
	],
	steps: [
		{
			kind: 'intro',
			short: '言葉',
			title: '始める前に：言葉をそろえる',
			intro: {
				terms: [
					'container',
					'pod',
					'node',
					'cluster',
					'kubectl',
					'desired',
					'manifest',
					'apply',
					'etcd',
					'apiserver',
					'deploy',
					'replicas'
				],
				anatomy: [
					{ text: 'kubectl', note: '頼む道具', term: 'kubectl', color: '#6ea0ff' },
					{ pre: ' ', text: 'apply', note: 'この状態にして', term: 'apply', color: '#f0a252' },
					{
						pre: ' ',
						text: '-f web.yaml',
						note: '望む状態を書いた紙',
						term: 'manifest',
						color: '#5fd0a0'
					}
				],
				analogy:
					'クラスタは店の本部。あなたは「店員を 3 人置いて」と注文票を出すだけ。休んだ人が出ると、本部の係が代わりを手配する。'
			},
			paras: [
				'Pod が落ちても元に戻る仕組みを追う。',
				'コンテナを包んだ箱が Pod、Pod を動かす機械がノード、ノードの集まりがクラスタ。',
				'あなたは kubectl apply -f web.yaml と打つ。上の札を左から見てほしい。紙は Deployment で、replicas: 3 という望む状態を書く。',
				'紙は入口の kube-apiserver が受け取り、帳簿の etcd に書く。後は係が今の姿を望む状態に近づける。'
			],
			at: [0, 1500, 3000, 5000],
			dur: 7600,
			layout: {
				kubectl: [140, 330],
				api: [440, 300, 0.85],
				etcd: [440, 500, 0.62],
				n2: [770, 380, 0.62],
				pa: [770, 372, 0.6]
			},
			names: { pa: 'Pod', n2: 'ノード' },
			links: [
				{ from: 'kubectl', to: 'api' },
				{ from: 'api', to: 'etcd' },
				{ from: 'api', to: 'n2', kind: 'watch' }
			],
			tokens: [
				{ name: 'web.yaml', tone: 'blue', path: ['kubectl', 'api'], at: 3000, d: 1200 },
				{ name: '紙', tone: 'purple', path: ['api', 'etcd'], at: 4300, d: 900 },
				{ name: 'Pod', tone: 'green', path: ['api', 'n2'], at: 5400, d: 1300 }
			],
			metrics: { want: '3', ready: '0', restarts: '0 回', wait: '—' },
			callout: [
				'たとえると',
				'注文票を出せば、本部が人を手配し、休みが出ても代わりを送る。あなたは数を書くだけ。'
			],
			changes: [['+', '登場する物：kubectl・入口・帳簿・ノードと Pod']],
			first: [
				'pod',
				'container',
				'node',
				'cluster',
				'kubectl',
				'apply',
				'manifest',
				'replicas',
				'desired',
				'deploy',
				'apiserver',
				'etcd'
			]
		},
		{
			kind: 'problem',
			short: '問題',
			title: 'Pod が 1 つ消えた。誰が戻したのか',
			paras: [
				'web の Pod を 3 つ動かしている。node-2 の web-a が突然消えた。',
				'誰も命令していないのに、数秒後には node-3 で web-d が動き出し、数は 3 に戻る。',
				'「3 つ」と書いた紙はどこにあり、誰が比べ、誰が置き場を決め、誰が起こしたのか。このレッスンで答える。'
			],
			at: [0, 1800, 3800],
			dur: 6000,
			layout: {
				etcd: [200, 150, 0.6],
				api: [500, 140, 0.62],
				n2: [290, 430, 0.62],
				pa: [290, 422, 0.6],
				n3: [720, 430, 0.62],
				pd: [720, 422, 0.6]
			},
			pods: { pa: 'dead', pd: 'ready' },
			hl: ['pd'],
			links: [
				{ from: 'etcd', to: 'api', both: true },
				{ from: 'api', to: 'n2', kind: 'watch' },
				{ from: 'api', to: 'n3', kind: 'watch' }
			],
			tokens: [
				{ name: '落ちた', tone: 'red', path: ['n2', 'api'], at: 400, d: 1200 },
				{ name: '3 つ', tone: 'purple', path: ['etcd', 'api'], at: 1900, d: 900 },
				{ name: 'web-d', tone: 'green', path: ['api', 'n3'], at: 3000, d: 1400 }
			],
			metrics: { want: '3', ready: '2 → 3', restarts: '0 回', wait: '—' },
			callout: ['ポイント', '誰かが「戻せ」と命令したのではない。紙と今を比べ続ける係がいる。'],
			changes: [
				['-', 'node-2 の web-a が消えた'],
				['+', 'node-3 に web-d が起きた']
			],
			first: []
		},
		{
			kind: 'mechanism',
			short: 'apply',
			title: 'apply：望む状態を帳簿に書くだけ',
			paras: [
				'kubectl apply は、YAML を HTTP の要求にして kube-apiserver に送る。',
				'apiserver は順に、認証（誰か）→ 認可（してよいか）→ 受付の検査（足りない値を補い、規則に合うか見る）を通す。',
				'通れば etcd に書き、新しく作った時は 201 Created を返す。ここで kubectl の仕事は終わる。まだどこでも Pod は動いていない。'
			],
			at: [0, 1500, 3400],
			dur: 5600,
			layout: { kubectl: [150, 330], api: [490, 300], etcd: [830, 330, 0.9] },
			hl: ['api'],
			links: [
				{ from: 'kubectl', to: 'api', both: true },
				{ from: 'api', to: 'etcd' }
			],
			tokens: [
				{ name: 'web.yaml', tone: 'blue', path: ['kubectl', 'api'], at: 200, d: 1200 },
				{ name: '紙', tone: 'purple', path: ['api', 'etcd'], at: 3400, d: 900 },
				{ name: '201', tone: 'green', path: ['api', 'kubectl'], at: 4400, d: 900 }
			],
			metrics: { want: '3', ready: '0' },
			callout: ['注意', '「apply が通った」は「紙が帳簿に載った」の意味。動いたかは別に確かめる。'],
			changes: [
				['+', 'etcd に Deployment web が載った'],
				['~', 'Pod はまだ 0 個']
			],
			deep: '中の順：authentication → authorization（RBAC）→ mutating admission → 形の検査 → validating admission → etcd へ書く。キーは /registry/deployments/default/web（Kubernetes v1.31.0、staging/src/k8s.io/apiserver）。',
			first: []
		},
		{
			kind: 'mechanism',
			short: '数を合わせる',
			title: 'controller が差を見つけて Pod の紙を作る',
			paras: [
				'kube-controller-manager の中では、何十もの制御ループが回る。どれも同じ形で、観る（watch）→ 比べる（望む ↔ 今）→ 動く（差を埋める）。',
				'Deployment のループが「web の ReplicaSet が無い」と見て、ReplicaSet web-7d9f を作る。',
				'次に ReplicaSet のループが「望む 3・今 0」と見て、Pod の紙を 3 枚書く。紙の置き場の欄（nodeName）は空のまま。'
			],
			at: [0, 2000, 3600],
			dur: 6200,
			layout: {
				api: [170, 300, 0.85],
				etcd: [430, 470, 0.7],
				ctrl: [780, 230, 0.85],
				pa: [640, 500, 0.45],
				pb: [740, 500, 0.45],
				pc: [840, 500, 0.45]
			},
			pods: { pa: 'paper', pb: 'paper', pc: 'paper' },
			hl: ['ctrl'],
			links: [
				{ from: 'api', to: 'ctrl', kind: 'watch' },
				{ from: 'api', to: 'etcd' }
			],
			tokens: [
				{ name: 'web が来た', tone: 'purple', path: ['api', 'ctrl'], at: 300, d: 1300 },
				{ name: 'web-7d9f', tone: 'blue', path: ['ctrl', 'api'], at: 2100, d: 1100 },
				{ name: '紙 3 枚', tone: 'purple', path: ['ctrl', 'api', 'etcd'], at: 3800, d: 1800 }
			],
			metrics: { want: '3', ready: '0' },
			callout: ['ポイント', '係は命令を受けて動くのではない。差を見つけて、差の分だけ動く。'],
			changes: [
				['+', 'ReplicaSet web-7d9f'],
				['+', '置き場の無い Pod の紙 3 枚']
			],
			deep: 'ReplicaSet のループは pkg/controller/replicaset の syncReplicaSet()。差を求め、作る数は 1・2・4… と倍に増やす（slowStartBatch）。1 回に作る上限は BurstReplicas = 500（Kubernetes v1.31.0）。',
			first: ['ctrl', 'loop', 'watch', 'rs']
		},
		{
			kind: 'internals',
			short: '置き場',
			title: 'scheduler：ふるいにかけ、点を付け、結ぶ',
			paras: [
				'kube-scheduler は、置き場の欄が空の Pod を watch している。web-a を見つけると、まずふるい（Filter）にかける。',
				'requests の CPU 0.25 が入らないノードを外す。node-1 は 3.8 + 0.25 = 4.05 で 4 を超えるので外れる。',
				'残った node-2・node-3 に点を付け（Score）、高い方に決めて bind する。紙に置き場を書くだけで、起こすのは別の係。'
			],
			at: [0, 1700, 3600],
			dur: 6200,
			layout: {
				sched: [500, 120, 0.72],
				n1: [175, 430, 0.5],
				n2: [500, 450, 0.5],
				n3: [825, 430, 0.5],
				pa: [500, 444, 0.5]
			},
			pods: { pa: 'paper' },
			hl: ['sched', 'n2'],
			links: [
				{ from: 'sched', to: 'n1' },
				{ from: 'sched', to: 'n2' },
				{ from: 'sched', to: 'n3' }
			],
			tokens: [
				{ name: '✗ 4.05 > 4', tone: 'red', path: ['sched', 'n1'], at: 1700, d: 1300 },
				{ name: '点 82', tone: 'orange', path: ['sched', 'n3'], at: 3600, d: 1100 },
				{ name: '点 91', tone: 'green', path: ['sched', 'n2'], at: 3800, d: 1100 },
				{ name: 'bind', tone: 'blue', path: ['sched', 'pa'], at: 5000, d: 900 }
			],
			metrics: { want: '3', ready: '0' },
			callout: [
				'注意',
				'ふるいで全部が外れると Pod は置かれず、Pending のまま待つ。理由は Events に出る。'
			],
			changes: [
				['-', 'node-1 はふるいで外れた'],
				['~', 'web-a の置き場が node-2 に決まった']
			],
			deep: 'ふるいの例：NodeResourcesFit（requests の空き）・TaintToleration・NodeAffinity。点の例：NodeResourcesBalancedAllocation・ImageLocality・PodTopologySpread。bind は Pod の binding という小さな資源に POST する（pkg/scheduler/framework/plugins、v1.31.0）。',
			first: ['sched', 'filter', 'requests', 'score', 'bind']
		},
		{
			kind: 'internals',
			short: 'kubelet',
			title: 'kubelet：自分のノードに来た Pod を起こす',
			paras: [
				'各ノードの kubelet は、置き場が自分の Pod を watch している。web-a に気づくと、containerd に CRI で頼む。',
				'① イメージを取る ② 入れ物を作り、CNI が IP 番地 10.244.1.7 を配る ③ コンテナを起こす。ここまでの状態は ContainerCreating。',
				'起きても、すぐには客は来ない。④ readiness probe（GET /healthz）が通って初めて Ready になる。kubelet はこの様子を apiserver に書き戻す。'
			],
			at: [0, 1800, 4000],
			dur: 6600,
			layout: {
				api: [860, 130, 0.6],
				kubelet: [230, 220, 0.75],
				crt: [230, 450, 0.7],
				n2: [600, 400, 0.85],
				pa: [600, 392, 0.8]
			},
			pods: { pa: 'create' },
			hl: ['kubelet'],
			links: [
				{ from: 'api', to: 'kubelet', kind: 'watch' },
				{ from: 'kubelet', to: 'crt' },
				{ from: 'crt', to: 'pa' }
			],
			tokens: [
				{ name: 'web-a', tone: 'purple', path: ['api', 'kubelet'], at: 200, d: 1400 },
				{ name: '起こして', tone: 'blue', path: ['kubelet', 'crt'], at: 1800, d: 900 },
				{ name: 'コンテナ', tone: 'blue', path: ['crt', 'pa'], at: 2900, d: 1000 },
				{ name: 'Ready', tone: 'green', path: ['kubelet', 'api'], at: 5000, d: 1200 }
			],
			metrics: { want: '3', ready: '0 → 1' },
			callout: ['ポイント', '「起きた」と「客を受けてよい」は別。probe が通るまで客は回らない。'],
			changes: [
				['~', 'web-a：起動中 → Ready'],
				['+', 'IP 番地 10.244.1.7']
			],
			deep: 'kubelet の中では syncPod() が差を埋める（pkg/kubelet/kubelet.go）。CRI の呼び出しは RunPodSandbox → CreateContainer → StartContainer の順。probe の既定は periodSeconds 10・failureThreshold 3（v1.31.0）。',
			first: ['kubelet', 'cri', 'cni', 'probe', 'ready']
		},
		{
			kind: 'internals',
			short: 'watch',
			title: 'watch：変わった所だけを受け取る',
			paras: [
				'係たちは apiserver に「変わったら教えて」と、watch を 1 本ずつ開いている。',
				'etcd に書かれると、apiserver は変わった 1 件を、開いている全ての watch に流す。',
				'係は手元の写しを直し、差の分だけ動く。だから Pod が何千あっても、毎回全部を読み直さない。'
			],
			at: [0, 1500, 3200],
			dur: 5600,
			layout: {
				etcd: [140, 300, 0.72],
				api: [430, 300, 0.85],
				ctrl: [780, 120, 0.68],
				sched: [780, 310, 0.68],
				kubelet: [780, 500, 0.62]
			},
			hl: ['api'],
			links: [
				{ from: 'etcd', to: 'api' },
				{ from: 'api', to: 'ctrl', kind: 'watch' },
				{ from: 'api', to: 'sched', kind: 'watch' },
				{ from: 'api', to: 'kubelet', kind: 'watch' }
			],
			tokens: [
				{ name: '変わった 1 件', tone: 'purple', path: ['etcd', 'api'], at: 1500, d: 1000 },
				{ name: '1 件', tone: 'purple', path: ['api', 'ctrl'], at: 2600, d: 1000 },
				{ name: '1 件', tone: 'purple', path: ['api', 'sched'], at: 2700, d: 1000 },
				{ name: '1 件', tone: 'purple', path: ['api', 'kubelet'], at: 2800, d: 1000 }
			],
			callout: [
				'知っておくと便利',
				'係が全部の様子を読み直すのは、始まった時の 1 回だけ。後は変わった所だけが届く。'
			],
			changes: [['+', 'watch は係ごとに 1 本、開いたまま']],
			deep: 'client-go の informer は、最初に LIST で全部を読み、その resourceVersion から WATCH を続ける。手元の写しは Indexer、仕事は workqueue に積む（同じキーは 1 つにまとまる）。',
			first: []
		},
		{
			kind: 'fail',
			short: 'OOMKilled',
			title: '失敗：メモリの上限で殺され、待ち時間が倍に伸びる',
			paras: [
				'web-c の limits.memory は 256 Mi。使う量が上限に届くと、cgroup の中で Linux の OOM killer がプロセスを殺す。',
				'終わり方は OOMKilled・終了コード 137（128 + 9：SIGKILL）。kubelet はすぐに起こし直す。',
				'また落ちると、待ち時間を 10 → 20 → 40 → 80 → 160 → 300 秒と倍に延ばす（上限 5 分）。これが CrashLoopBackOff。直すのは上限か使う量で、起こし直しでは直らない。'
			],
			at: [0, 2000, 3800],
			dur: 6600,
			layout: {
				oom: [200, 200, 0.72],
				kubelet: [200, 450, 0.68],
				n2: [600, 380, 0.9],
				pc: [600, 372, 0.85]
			},
			pods: { pc: 'dead' },
			hl: ['oom'],
			links: [
				{ from: 'oom', to: 'pc' },
				{ from: 'kubelet', to: 'pc', both: true }
			],
			tokens: [
				{ name: '殺す', tone: 'red', path: ['oom', 'pc'], at: 600, d: 1100 },
				{ name: '終了 137', tone: 'red', path: ['pc', 'kubelet'], at: 1900, d: 1000 },
				{ name: '10 秒後に起こす', tone: 'orange', path: ['kubelet', 'pc'], at: 3100, d: 1100 },
				{ name: '殺す', tone: 'red', path: ['oom', 'pc'], at: 4500, d: 900 },
				{ name: '20 秒待つ', tone: 'orange', path: ['pc', 'kubelet'], at: 5500, d: 800 }
			],
			metrics: { want: '3', ready: '2', restarts: '5 回', wait: '300 秒' },
			callout: [
				'注意',
				'CrashLoopBackOff は原因ではなく、待っている様子。原因は 1 つ前の終わり方に書いてある。'
			],
			changes: [
				['~', 'web-c：落ちた（OOMKilled）'],
				['~', '待ち 10 → 20 → … 秒']
			],
			deep: 'メモリの上限は cgroup v2 の memory.max に書かれる。待ちの倍々は kubelet の backoff（初め 10 s・上限 300 s）で、10 分間落ちずに動けば 0 に戻る（Pod Lifecycle、v1.31）。',
			first: ['limits', 'cgroup', 'oom', 'oomk', 'backoff']
		},
		{
			kind: 'fail',
			short: 'ノードが消える',
			title: '失敗：ノードが黙ると、待ってから別の所で作り直す',
			paras: [
				'node-3 の kubelet は、10 秒ごとに Lease を書き直している。電源が落ちると、それが止まる。',
				'40 秒届かないと、node-3 は NotReady になり、「届かない」の taint が付く。',
				'Pod は既定で 300 秒この taint に耐える。過ぎると追い出され、ReplicaSet のループが「2 つしかない」と見て紙を作り、scheduler が node-2 に置く。'
			],
			at: [0, 1700, 3400],
			dur: 6400,
			layout: {
				etcd: [180, 140, 0.6],
				ctrl: [520, 130, 0.68],
				n2: [290, 430, 0.62],
				pd: [290, 422, 0.6],
				n3: [720, 430, 0.62],
				pb: [720, 422, 0.6]
			},
			pods: { pd: 'create', pb: 'gray' },
			down: ['n3'],
			hl: ['ctrl'],
			links: [
				{ from: 'n3', to: 'ctrl', kind: 'watch' },
				{ from: 'ctrl', to: 'etcd' },
				{ from: 'ctrl', to: 'n2' }
			],
			tokens: [
				{ name: 'Lease ✗', tone: 'red', path: ['n3', 'ctrl'], at: 300, d: 1300 },
				{ name: 'NotReady', tone: 'red', path: ['ctrl', 'etcd'], at: 1800, d: 1000 },
				{ name: '新しい紙', tone: 'purple', path: ['ctrl', 'n2'], at: 3600, d: 1500 }
			],
			metrics: { want: '3', ready: '2 → 3' },
			callout: [
				'代償',
				'すぐ作り直さないのは、短い切断で大量に作り直さないため。その代わり、戻るまで約 6 分かかる。'
			],
			changes: [
				['~', 'node-3：NotReady'],
				['+', 'node-2 に代わりの Pod']
			],
			deep: '印は kube-node-lease の Lease（kubelet が 10 s ごとに更新）。node-monitor-grace-period の既定は 40 s（v1.31）。taint は node.kubernetes.io/unreachable:NoExecute、tolerationSeconds は受付の検査が既定で 300 を足す。',
			first: ['lease', 'notready', 'taint']
		},
		{
			kind: 'tradeoff',
			short: '上限の決め方',
			title: 'requests と limits：置ける数と落ちにくさの取り合い',
			paras: [
				'requests は置き場を決める時の数、limits は使ってよい上限。requests を小さく書くと 1 台に多く詰められる。',
				'でも皆が同時に使うとノードのメモリが尽き、追い出しが起きる。requests と limits を同じにすると QoS クラスが一番上になり、追い出しは最後になる。',
				'web-c の山は 300 Mi。requests = limits = 384 Mi にすると落ちない。代わりに空き 2,048 Mi のノードに置けるのは 5 個（2,048 ÷ 384 = 5.3）で、256 Mi の時の 8 個より減る。'
			],
			at: [0, 1800, 3800],
			dur: 6400,
			layout: {
				sched: [500, 120, 0.65],
				n1: [260, 420, 0.62],
				pa: [260, 412, 0.6],
				n2: [740, 420, 0.62],
				pc: [740, 412, 0.6]
			},
			pods: { pa: 'ready', pc: 'ready' },
			hl: ['pc'],
			links: [
				{ from: 'sched', to: 'n1' },
				{ from: 'sched', to: 'n2' }
			],
			tokens: [
				{ name: '384 Mi', tone: 'blue', path: ['sched', 'n2'], at: 600, d: 1300 },
				{ name: '5 個まで', tone: 'orange', path: ['sched', 'n1'], at: 3800, d: 1300 }
			],
			metrics: { want: '3', ready: '3', restarts: '0 回', wait: '—' },
			callout: ['代償', '上限を上げれば落ちないが、1 台に置ける数が減り、機械の代金が増える。'],
			changes: [
				['~', 'web-c の上限 256 → 384 Mi'],
				['~', '1 台に置ける数 8 → 5']
			],
			deep: 'QoS：全てのコンテナで CPU とメモリが requests = limits なら Guaranteed、どれかに requests か limits があれば Burstable、何も無ければ BestEffort。メモリが足りない時、kubelet は requests を超えて使う Pod から追い出す（Node-pressure Eviction、v1.31）。',
			first: ['qos']
		},
		{
			kind: 'ops',
			short: 'describe',
			title: '運用：describe の Events を、出した係に結ぶ',
			paras: [
				'kubectl describe pod web-c の Events は、どの係が何をしたかの記録。From の欄を見ると、図のどこで起きたかが分かる。',
				'Scheduled は scheduler、Pulling・Created・Started・BackOff は node-2 の kubelet が出した。',
				'原因は Events ではなく、上の Last State にある。Reason: OOMKilled・Exit Code: 137 を読めば、上限の問題だと分かる。'
			],
			at: [0, 1900, 3600],
			dur: 6000,
			layout: {
				kubectl: [150, 330],
				sched: [500, 130, 0.65],
				n2: [560, 430, 0.68],
				pc: [560, 422, 0.65],
				kubelet: [860, 330, 0.62]
			},
			pods: { pc: 'dead' },
			hl: ['kubectl'],
			links: [
				{ from: 'sched', to: 'kubectl', kind: 'watch' },
				{ from: 'kubelet', to: 'kubectl', kind: 'watch' },
				{ from: 'kubelet', to: 'pc' }
			],
			tokens: [
				{ name: 'Scheduled', tone: 'blue', path: ['sched', 'kubectl'], at: 1900, d: 1200 },
				{ name: 'BackOff', tone: 'orange', path: ['kubelet', 'kubectl'], at: 2600, d: 1400 },
				{ name: 'OOMKilled', tone: 'red', path: ['pc', 'kubectl'], at: 3800, d: 1400 }
			],
			callout: [
				'知っておくと便利',
				'Events は既定で 1 時間で消える。古い障害は、残しておいた記録で追う。'
			],
			changes: [['+', 'Events の From を係に結んだ']],
			deep: 'Events は kube-apiserver の --event-ttl（既定 1h）で消える。同じ出来事はまとめられ、count が増える（v1.31）。',
			first: ['describe', 'events', 'laststate']
		},
		{
			kind: 'summary',
			short: 'まとめ',
			title: 'まとめ：3 つの係が差を埋め続ける',
			paras: [
				'書く：kubectl → kube-apiserver → etcd。望む状態を帳簿に書くだけ。',
				'回る：controller（数を合わせる）・scheduler（置き場を決める）・kubelet（起こして見張る）。どれも watch で観て、比べて、差の分だけ動く。',
				'落ちたら：コンテナは kubelet が待ち時間を倍にしつつ起こし直す。ノードは 40 秒で NotReady、300 秒で追い出し、ReplicaSet が作り直す。'
			],
			at: [0, 1600, 3600],
			dur: 6200,
			layout: {
				etcd: [130, 150, 0.55],
				api: [380, 140, 0.6],
				sched: [630, 130, 0.6],
				ctrl: [870, 140, 0.6],
				n2: [300, 440, 0.6],
				pa: [300, 432, 0.58],
				n3: [720, 440, 0.6],
				pd: [720, 432, 0.58]
			},
			links: [
				{ from: 'etcd', to: 'api', both: true },
				{ from: 'api', to: 'sched', kind: 'watch' },
				{ from: 'api', to: 'n2', kind: 'watch' },
				{ from: 'api', to: 'n3', kind: 'watch' }
			],
			tokens: [
				{ name: '望む 3', tone: 'purple', path: ['etcd', 'api'], at: 0, d: 1200 },
				{ name: '置き場', tone: 'blue', path: ['api', 'sched'], at: 1600, d: 1100 },
				{ name: '起こす', tone: 'green', path: ['api', 'n3'], at: 3600, d: 1300 }
			],
			metrics: { want: '3', ready: '3', restarts: '0 回', wait: '—' },
			callout: [
				'1 分で言うと',
				'紙に数を書くと、係が観て比べて差だけ動く。落ちても、係が気づいて戻す。'
			],
			changes: [['+', '書く・回る・落ちたら、の 3 つ']],
			first: []
		}
	]
};
