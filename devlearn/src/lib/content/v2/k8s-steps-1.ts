// 見本 2（k8s-101）のステップ 1〜4：問題・DELETE が API サーバと etcd を通る道・watch と informer・ReplicaSet の調整。
import type { Step } from '../../lesson/types.ts';
import { B, cp, I, node, POD, row } from './k8s-base.ts';

const N1 = (rows: ReturnType<typeof row>[]) => node('node-1', '10.0.1.11', '棟 1', rows);
const N2 = (rows: ReturnType<typeof row>[]) => node('node-2', '10.0.1.12', '棟 2', rows);
const kl1 = row('kl-1', 0, 'kubelet（node-1）', '動いている');
const kl2 = row('kl-2', 0, 'kubelet（node-2）', '動いている');
const b9m4t = row('p-b9m4t', 1, `${POD}b9m4t`, 'CrashLoopBackOff（6 回）', 'bad');
const q2wfz = row('p-q2wfz', 1, `${POD}q2wfz`, 'CrashLoopBackOff（5 回）', 'bad');

export const s1: Step = {
	n: 1,
	kind: 'problem',
	short: '戻るのに',
	title: '消しても戻る Pod',
	lead: '消した Pod は 2 秒で戻る。だが 3 つとも落ち続けている',
	body: [
		'web の Pod を 1 つ消すと、2 秒ほどで同じ型の Pod が戻る。',
		'だが戻った Pod も 5 秒で落ち、3 つとも Ready にならない。'
	],
	depth: {
		intro: [
			'店の web は、同じ型の Pod を 3 つ動かすと決めてある。番頭が落ち続ける Pod を 1 つ消すと、2 秒ほどで新しい Pod が現れた。誰も作れと言っていないのに、数が 3 に戻る。',
			'ところが新しい Pod も 5 秒で落ちる。数を戻す仕組みは、落ちる理由までは直さない。誰が・何を見て・どう戻すのかを追い、落ちる理由も突き止める。'
		],
		work: [
			'get pods -n shop では、3 つとも READY 0/1・CrashLoopBackOff・RESTARTS 5〜6 回だ。Deployment web の欲しい数は 3 個、Ready は 0 個になる。',
			'番頭が 7xk2p を消すと、ReplicaSet web-6d8f7b9c4 の生きている Pod が 2 個に減る。コントローラが差の 1 個を見つけ、87cwj を作る。スケジューラが node-1 に置き、kubelet が 2 秒で起こす。',
			'87cwj も品物の一覧を読んで 182 MiB を使い、上限 128 MiB を超えて 5 秒目に落ちる。数は戻るが Ready は 0 個のままで、入口は 503 を返し続ける。'
		],
		deep: [
			'欲しい数は Deployment の spec.replicas: 3 で、etcd の /registry/deployments/shop/web にある。今の数は ReplicaSet と Pod の status にあり、status を書くのは受け持つ部品だ。',
			'数を戻すのは kube-controller-manager の中の ReplicaSet コントローラだ。Pod が消えかけた知らせを watch で受け、syncReplicaSet() で欲しい数 3 と生きている数 2 を比べ、差の 1 個を作る。',
			'作られた Pod には spec.nodeName が無い。kube-scheduler が node を決めて bind する。その node の kubelet が、containerd に CRI でコンテナを作らせる。どの部品も互いを直に呼ばず、API サーバの記録だけを見て動く。',
			'落ちる理由は数とは別の所にある。コンテナの cgroup の memory.max は 134,217,728 B（128 MiB）だ。上限を超えるとカーネルが SIGKILL で止め、終わりの番号は 137（128 ＋ 9）になる。'
		]
	},
	callout: {
		type: 'point',
		text: '自己修復が戻すのは「数」で、「落ちる理由」ではない。同じ型紙の Pod は、同じ理由で落ちる。'
	},
	changes: [
		{ mark: '-', text: '7xk2p を消した' },
		{ mark: '+', text: '87cwj が node-1 に作られた' },
		{ mark: '~', text: 'Ready は 0 / 3 のまま' }
	],
	facts: [
		{ k: '欲しい数（spec.replicas）', v: '3 個' },
		{ k: '戻るまで', v: '約 2 秒（作る → 置く → 起こす）' },
		{ k: '落ちるまで', v: '5 秒（起動 2 秒 ＋ 読み込み 3 秒）', calc: '2+3' },
		{ k: '使う記憶 / 上限', v: '182 MiB / 128 MiB' }
	],
	scene: [
		{ op: 'appear', id: 'you', label: '番頭の kubectl', sub: 'shop の担当', at: [0, 1] },
		{ op: 'appear', id: 'api', label: 'kube-apiserver', sub: '10.0.1.10:6443', at: [1, 1] },
		{ op: 'appear', id: 'etcd', label: 'etcd', sub: '/registry/…', at: [1, 2] },
		{
			op: 'appear',
			id: 'ctrl',
			label: 'kube-controller-manager',
			sub: 'ReplicaSet ほか',
			at: [1, 0]
		},
		{ op: 'appear', id: 'sched', label: 'kube-scheduler', sub: '置き場所を決める', at: [2, 0] },
		{ op: 'appear', id: 'kl1', label: 'kubelet（node-1）', sub: '10.0.1.11', at: [3, 1] },
		{ op: 'appear', id: 'kl2', label: 'kubelet（node-2）', sub: '10.0.1.12', at: [3, 2] },
		{ op: 'move', from: 'you', to: 'api', payload: 'DELETE 7xk2p', kind: 'write' },
		{ op: 'move', from: 'api', to: 'ctrl', payload: '消えかけの知らせ', kind: 'watch' }
	],
	log: {
		t: '10:06:12',
		from: 'you',
		to: 'api',
		kind: 'write',
		info: 'pod "web-6d8f7b9c4-7xk2p" deleted。2 秒で 87cwj が現れる'
	},
	why: '人が数を見張り続けなくてよいように、欲しい数を書いておき、部品が差を埋め続ける',
	town: '役場の台帳に「部屋 3 つ」と書けば、見張り番が欠けた部屋を足す',
	work: 'kubectl get pods -n shop の READY と RESTARTS を並べて見る',
	ask: {
		q: '7xk2p を消した 2 秒後、web の Pod はいくつある？',
		opts: ['2 個のまま', '3 個に戻る', '4 個に増える'],
		a: 1,
		why: 'ReplicaSet コントローラが欲しい数 3 との差 1 を見つけ、新しい Pod を作るから。'
	},
	inside: {
		hosts: [
			cp([
				row('d-web', 0, 'Deployment web', '欲しい 3・Ready 0', 'bad'),
				row('rs-old', 1, 'ReplicaSet web-6d8f7b9c4', '3 個（87cwj を足した）')
			]),
			N1([kl1, q2wfz, row('p-87cwj', 1, `${POD}87cwj`, 'Running（2 秒目）', 'warn')]),
			N2([kl2, b9m4t])
		],
		logs: [
			{
				t: '10:06:12',
				src: 'kubectl events',
				text: 'Normal   SuccessfulCreate   replicaset/web-6d8f7b9c4   Created pod: web-6d8f7b9c4-87cwj'
			}
		]
	},
	metrics: { want: '3 個', ready: '0 個', pending: '0 個', restarts: '0 回', wait: '0 秒' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['you', 'api', 'ctrl', 'kl1', 'kl2'] } },
		{
			at: 500,
			dur: 450,
			para: 0,
			do: { op: 'badge', id: 'kl1', text: '2 つ落ちている', tone: 'bad' }
		},
		{
			at: 700,
			dur: 450,
			para: 0,
			do: { op: 'badge', id: 'kl2', text: '1 つ落ちている', tone: 'bad' }
		},
		{ at: 1000, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 1600,
			dur: 900,
			para: 1,
			do: { op: 'packet', a: 'you', b: 'api', label: 'DELETE 7xk2p', kind: 'write' }
		},
		{
			at: 2500,
			dur: 900,
			para: 1,
			do: { op: 'packet', a: 'api', b: 'ctrl', label: '消えかけ', kind: 'watch' }
		},
		{ at: 2600, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{
			at: 3400,
			dur: 900,
			para: 1,
			do: { op: 'packet', a: 'ctrl', b: 'api', label: 'Pod を作る', kind: 'write' }
		},
		{
			at: 4300,
			dur: 900,
			para: 1,
			do: { op: 'packet', a: 'api', b: 'sched', label: 'nodeName なし', kind: 'watch' }
		},
		{
			at: 5200,
			dur: 900,
			para: 1,
			do: { op: 'packet', a: 'sched', b: 'api', label: 'bind node-1', kind: 'bind' }
		},
		{
			at: 6100,
			dur: 900,
			para: 1,
			do: { op: 'packet', a: 'api', b: 'kl1', label: '87cwj', kind: 'watch' }
		},
		{ at: 6200, dur: 400, para: 1, do: { op: 'board', line: 2 } },
		{
			at: 7100,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'kl1', text: '87cwj Running', tone: 'ok' }
		},
		{ at: 8200, dur: 600, para: 2, do: { op: 'fail', id: 'kl1' } },
		{ at: 8300, dur: 400, para: 2, do: { op: 'board', line: 3 } },
		{
			at: 8900,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'kl1', text: '87cwj も落ちた', tone: 'bad' }
		}
	],
	loop: [
		{ at: 0, dur: 900, do: { op: 'packet', a: 'api', b: 'ctrl', label: 'watch', kind: 'watch' } },
		{ at: 300, dur: 900, do: { op: 'packet', a: 'api', b: 'kl1', label: 'watch', kind: 'watch' } },
		{ at: 600, dur: 900, do: { op: 'packet', a: 'api', b: 'kl2', label: 'watch', kind: 'watch' } },
		{
			at: 1800,
			dur: 900,
			do: { op: 'packet', a: 'kl1', b: 'api', label: '落ちた', kind: 'status' }
		}
	],
	board: [
		'3 つとも CrashLoopBackOff',
		'7xk2p を消す → 差 1 を見つける',
		'87cwj を作り node-1 に置く',
		'87cwj も 5 秒で落ちる'
	],
	badges: { kl1: '87cwj も落ちた', kl2: '1 つ落ちている' },
	refs: ['k8s-controller', 'k8s-replicaset', 'k8s-pod-lifecycle'],
	learns: []
};

export const s2: Step = {
	n: 2,
	kind: 'mechanism',
	short: 'API と台帳',
	title: 'DELETE が etcd に届く',
	lead: '消す願いは API サーバだけが受け、etcd の版を 1 つ進める',
	body: [
		'kubectl delete は API サーバに DELETE を送る。直ぐには消さず、消す時刻を書く。',
		'etcd に書けるのは API サーバだけで、書くたびに版の番号が進む。'
	],
	depth: {
		intro: [
			'kubectl は node にも Pod にも直には触らない。API サーバという 1 つの窓口に「7xk2p を消して」と頼むだけだ。',
			'窓口は頼んだ人と中身を確かめてから、台帳（etcd）に「消す途中」と書く。この書き込みが、ほかの部品が動き出す合図になる。'
		],
		work: [
			'kubectl は DELETE /api/v1/namespaces/shop/pods/web-6d8f7b9c4-7xk2p を送る。道は 6443 番の HTTPS だ。API サーバは認証・認可（RBAC）・アドミッションの順に確かめる。',
			'Pod は直ぐには消えない。猶予 30 秒（terminationGracePeriodSeconds）の印として、metadata.deletionTimestamp を書く。kubelet がコンテナを止め、止めた後で本当に消す。',
			'書き込みは etcd の鍵 /registry/pods/shop/web-6d8f7b9c4-7xk2p に入る。etcd の版（revision）が 81,407 から 81,408 に進み、これがその Pod の resourceVersion になる。'
		],
		deep: [
			'v1.31 の DeleteResource() が DELETE を受け、本文の DeleteOptions を読む。validating のアドミッションを渡して、rest の Delete へ進む。Pod の Delete は registry の Store が受け持つ。',
			'Store は BeforeDelete() で、猶予つきで消すかを決める。猶予があれば updateForGracefulDeletionAndFinalizers() が書く。書くのは deletionTimestamp と deletionGracePeriodSeconds: 30 だ。この時の知らせは DELETED ではなく MODIFIED だ。',
			'書き込みは etcd3 の store の GuaranteedUpdate() が行う。今の版を読み、「mod_revision が読んだ版と同じなら書く」という 1 つの Txn で書く。負ければ読み直して繰り返すので、2 人が同時に直しても片方が消えない。',
			'kubelet はコンテナを止めると、猶予 0 の DELETE をもう一度送る。この時に鍵が消え、知らせは DELETED になる。kubectl delete はその DELETED を待ってから「deleted」と出す。',
			'etcd と直に話すのは API サーバだけだ。コントローラも kubelet も、API サーバの watch と書き込みだけを使う。だから認可と監査の記録が 1 か所にまとまる。'
		]
	},
	callout: {
		type: 'tip',
		text: 'kubectl get pod 7xk2p -o yaml で、消す途中の Pod の metadata.deletionTimestamp と resourceVersion が見える。'
	},
	changes: [
		{ mark: '+', text: 'deletionTimestamp が付いた' },
		{ mark: '~', text: 'etcd の版 81,407 → 81,408' },
		{ mark: '+', text: '知らせ MODIFIED が流れる' }
	],
	facts: [
		{ k: 'API の道', v: 'DELETE /api/v1/namespaces/shop/pods/web-6d8f7b9c4-7xk2p' },
		{ k: 'HTTPS の番', v: '6443 番' },
		{ k: '確かめの段', v: '3 段（認証・認可・アドミッション）' },
		{ k: '猶予', v: '30 秒（terminationGracePeriodSeconds の既定）' },
		{ k: 'etcd の版', v: '81,408（81,407 ＋ 1）', calc: '81407+1' }
	],
	scene: [
		{ op: 'move', from: 'you', to: 'api', payload: 'DELETE', kind: 'write' },
		{ op: 'move', from: 'api', to: 'etcd', payload: 'Txn', kind: 'write' }
	],
	log: {
		t: '10:06:12.002',
		from: 'api',
		to: 'etcd',
		kind: 'write',
		info: 'Txn：7xk2p に deletionTimestamp を書く（rev 81408）'
	},
	town: '役場の受付が名札と許しを確かめ、台帳の部屋の行に「明け渡し中」と書く',
	work: 'get pod -o yaml の deletionTimestamp で、消す途中かを見る',
	inside: {
		packet: {
			name: 'DELETE /api/v1/namespaces/shop/pods/web-6d8f7b9c4-7xk2p',
			size: '約 420 B',
			parts: [
				{
					name: 'HTTP/2 の頭',
					fields: [
						{ k: ':method', v: 'DELETE', level: 1 },
						{ k: ':path', v: '/api/v1/namespaces/shop/pods/web-6d8f7b9c4-7xk2p', level: 1 },
						{ k: 'user-agent', v: 'kubectl/v1.31.0 (linux/amd64)', level: 2 },
						{ k: '認証', v: 'client 証明書の CN＝bantou、O＝shop-ops', level: 2 }
					]
				},
				{
					name: 'DeleteOptions（kubectl が付ける）',
					fields: [
						{ k: 'propagationPolicy', v: 'Background', level: 2 },
						{ k: 'gracePeriodSeconds', v: '（無い → Pod の 30 秒）', level: 3 }
					]
				},
				{
					name: 'etcd に書いた後の Pod',
					fields: [
						{ k: 'metadata.deletionTimestamp', v: '2026-11-19T01:06:42Z（30 秒後）', level: 1 },
						{ k: 'metadata.deletionGracePeriodSeconds', v: '30', level: 2 },
						{ k: 'metadata.resourceVersion', v: '81408', level: 3 }
					]
				}
			]
		},
		hosts: [
			cp([
				row('a-api', 0, 'kube-apiserver', 'DELETE を受けた'),
				row('e-pod', 1, 'etcd /registry/pods/shop/…-7xk2p', 'rev 81408・消す途中', 'warn'),
				row('rs-old', 1, 'ReplicaSet web-6d8f7b9c4', '3 個')
			]),
			N1([kl1, q2wfz, row('p-7xk2p', 1, `${POD}7xk2p`, 'Terminating（猶予 30 秒）', 'warn')]),
			N2([kl2, b9m4t])
		]
	},
	metrics: { want: '3 個', ready: '0 個' },
	motion: [
		{
			at: 0,
			dur: 800,
			para: 0,
			do: { op: 'camera', fit: ['b_delres', 'b_before', 'b_grace', 'b_gu'] }
		},
		{
			at: 400,
			dur: 700,
			para: 0,
			do: { op: 'packet', a: 'b_delres', b: 'b_before', label: 'DELETE', kind: 'write' }
		},
		{
			at: 1100,
			dur: 450,
			para: 0,
			do: { op: 'badge', id: 'b_delres', text: '認証・認可・アドミッション ✓', tone: 'ok' }
		},
		{ at: 1200, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 1900,
			dur: 450,
			para: 1,
			do: { op: 'badge', id: 'b_before', text: '猶予 30 秒 → 消す途中' }
		},
		{
			at: 2400,
			dur: 700,
			para: 1,
			do: { op: 'packet', a: 'b_before', b: 'b_grace', label: 'deletionTimestamp', kind: 'write' }
		},
		{ at: 2500, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{
			at: 3200,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_grace', b: 'b_gu', label: 'Txn', kind: 'write' }
		},
		{
			at: 3900,
			dur: 500,
			para: 2,
			do: { op: 'peek', queue: 'etcdq', item: 'pods/…7xk2p rev 81407' }
		},
		{
			at: 4500,
			dur: 600,
			para: 2,
			do: { op: 'enqueue', queue: 'etcdq', item: 'pods/…7xk2p rev 81408' }
		},
		{ at: 4600, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{
			at: 5300,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'b_gu', text: 'MODIFIED を流す', tone: 'ok' }
		},
		{ at: 5400, dur: 400, para: 2, do: { op: 'board', line: 3 } },
		{ at: 1150, dur: 600, para: 0, do: { op: 'pulse', id: 'b_before' } },
		{ at: 3100, dur: 800, para: 1, do: { op: 'pulse', id: 'b_gu' } },
		{ at: 3900, dur: 700, para: 2, do: { op: 'pulse', id: 'b_grace' } }
	],
	loop: [
		{
			at: 0,
			dur: 700,
			do: { op: 'packet', a: 'b_delres', b: 'b_before', label: '願い', kind: 'write' }
		},
		{
			at: 700,
			dur: 700,
			do: { op: 'packet', a: 'b_before', b: 'b_grace', label: '願い', kind: 'write' }
		},
		{
			at: 1400,
			dur: 700,
			do: { op: 'packet', a: 'b_grace', b: 'b_gu', label: 'Txn', kind: 'write' }
		},
		{ at: 2100, dur: 500, do: { op: 'peek', queue: 'etcdq', item: 'pods/…7xk2p rev 81408' } }
	],
	board: [
		'DeleteResource()：確かめて通す',
		'BeforeDelete()：猶予 30 秒で消す途中に',
		'GuaranteedUpdate()：版を比べて Txn',
		'rev 81408 の MODIFIED が watch へ'
	],
	badges: { b_gu: 'rev 81408' },
	layers: [B.apid(), B.etcd(['pods/…7xk2p rev 81407', 'replicasets/web-6d8f7b9c4 rev 80950'])],
	impl: [I.deleteRes, I.beforeDelete, I.graceful, I.store],
	refs: [
		'k8s-api-concepts',
		'k8s-pod-lifecycle',
		'k8s-delete',
		'k8s-registry',
		'k8s-etcd3',
		'etcd-api'
	],
	learns: [0]
};

export const s3: Step = {
	n: 3,
	kind: 'mechanism',
	short: 'watch',
	title: 'watch が変化を配る',
	lead: '部品は一覧を 1 度取り、その続きの変化を流し続けて受ける',
	body: [
		'コントローラも kubelet も、API サーバに watch を張り続けている。',
		'変化は 1 本の長い応答で流れ、手元の写しとワークキューに入る。'
	],
	depth: {
		intro: [
			'部品たちは、API サーバに何度も「変わった？」と聞きに行くわけではない。最初に一覧を 1 度もらい、あとは「変わったら教えて」という線をつないだままにする。',
			'線を通って「7xk2p が消える途中になった」が届くと、受け手は手元の写しを直し、見直す仕事を 1 つ列に入れる。'
		],
		work: [
			'コントローラ・スケジューラ・kubelet は、最初に一覧（LIST）を取り、その resourceVersion の続きから watch を張る。変化は ADDED・MODIFIED・DELETED の知らせになり、1 本の長い HTTP の応答で流れてくる。',
			'API サーバは etcd の watch を種類ごとに 1 本だけ張り、watch cache に写して、全ての受け手に配る。受け手が 100 本に増えても、etcd への watch は 1 本のままだ。',
			'受け手の中では client-go の informer が知らせを受け、手元の写し（indexer）を直し、登録した関数を呼ぶ。ReplicaSet コントローラの関数は、鍵 shop/web-6d8f7b9c4 をワークキューに入れるだけだ。'
		],
		deep: [
			'Reflector の ListAndWatch() が LIST と watch を行い、知らせを DeltaFIFO に積む。DeltaFIFO は鍵ごとに変化の列（Added・Updated・Deleted）を持つ。Pop() が 1 つの鍵の列をまとめて HandleDeltas() に渡す。',
			'HandleDeltas() は indexer を直してから、登録された関数へ配る。ReplicaSet コントローラでは updatePod() が呼ばれ、deletionTimestamp が付いた Pod を「消えた物」として扱う。kubelet が本当に消すのを待たない。',
			'API サーバの Cacher は etcd からの変化を watch cache の輪に貯め、dispatchEvents() で受け手ごとの通り道へ送る。輪から消えた古い resourceVersion から watch すると 410 Gone が返り、受け手は LIST からやり直す。',
			'ワークキューは同じ鍵を 1 つにまとめ、処理中の鍵は終わるまでほかの worker に渡さない。失敗した鍵は DefaultTypedControllerRateLimiter() の決まりで、5 ms から倍に延ばして入れ直す（上限 1,000 秒）。全体にも 10 件/秒・まとめて 100 件の上限がある。'
		]
	},
	callout: {
		type: 'point',
		text: '知らせは「この鍵を見直して」の合図にすぎない。コントローラは調整のたびに手元の写しから今の姿を読み直すので、知らせを 1 つ取りこぼしても、次の見直しで正しくなる。'
	},
	changes: [
		{ mark: '+', text: 'watch の知らせ MODIFIED（7xk2p）' },
		{ mark: '~', text: '手元の写しの 7xk2p が消える途中に' },
		{ mark: '+', text: 'ワークキューに shop/web-6d8f7b9c4' }
	],
	facts: [
		{ k: '知らせの種類', v: '3 種（ADDED・MODIFIED・DELETED）' },
		{ k: 'etcd への watch', v: '種類ごとに 1 本（受け手が 100 本でも）' },
		{ k: '失敗した鍵の待ち', v: '5 ms から倍に、上限 1,000 秒' },
		{ k: 'ReplicaSet の worker', v: '5 本（--concurrent-replicaset-syncs）' }
	],
	scene: [
		{ op: 'move', from: 'api', to: 'ctrl', payload: 'MODIFIED', kind: 'watch' },
		{ op: 'move', from: 'api', to: 'sched', payload: 'MODIFIED', kind: 'watch' },
		{ op: 'move', from: 'api', to: 'kl1', payload: 'MODIFIED', kind: 'watch' }
	],
	log: {
		t: '10:06:12.003',
		from: 'api',
		to: 'ctrl',
		kind: 'watch',
		info: 'watch：MODIFIED pod shop/web-6d8f7b9c4-7xk2p（rev 81408）'
	},
	town: '台帳が書き直されると、見張り番・部屋割り係・棟の管理人に同じ知らせが届く',
	work: 'kubectl get pods -n shop -w で、同じ知らせを自分の端末にも流せる',
	inside: {
		packet: {
			name: 'watch の知らせ 1 件（JSON の 1 行）',
			size: '約 3.1 KB',
			parts: [
				{
					name: 'WatchEvent',
					fields: [
						{ k: 'type', v: 'MODIFIED', level: 1 },
						{ k: 'object.kind', v: 'Pod', level: 1 },
						{ k: 'object.metadata.name', v: 'web-6d8f7b9c4-7xk2p', level: 1 },
						{ k: 'object.metadata.resourceVersion', v: '81408', level: 2 },
						{ k: 'object.metadata.deletionTimestamp', v: '2026-11-19T01:06:42Z', level: 2 },
						{
							k: 'object.metadata.ownerReferences[0]',
							v: 'ReplicaSet web-6d8f7b9c4（controller: true）',
							level: 3
						}
					]
				}
			]
		},
		hosts: [
			cp([
				row('a-api', 0, 'kube-apiserver', 'watch cache から配る'),
				row('c-kcm', 0, 'kube-controller-manager', 'informer が受けた'),
				row('w-q', 1, 'ワークキュー（replicaset）', 'shop/web-6d8f7b9c4', 'warn'),
				row('rs-old', 1, 'ReplicaSet web-6d8f7b9c4', '3 個')
			]),
			N1([kl1, q2wfz, row('p-7xk2p', 1, `${POD}7xk2p`, 'Terminating（猶予 30 秒）', 'warn')]),
			N2([kl2, b9m4t])
		]
	},
	metrics: { want: '3 個', ready: '0 個' },
	motion: [
		{
			at: 0,
			dur: 800,
			para: 0,
			do: { op: 'camera', fit: ['b_lw', 'b_fifo', 'b_hd', 'b_del', 'b_wq'] }
		},
		{ at: 500, dur: 600, para: 0, do: { op: 'enqueue', queue: 'fifo', item: 'Updated 7xk2p' } },
		{ at: 1100, dur: 450, para: 0, do: { op: 'badge', id: 'b_lw', text: 'rev 81408 の続きから' } },
		{ at: 1200, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{ at: 1900, dur: 500, para: 1, do: { op: 'pulse', id: 'b_lw' } },
		{ at: 2000, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 2700, dur: 500, para: 2, do: { op: 'dequeue', queue: 'fifo', item: 'Updated 7xk2p' } },
		{
			at: 3200,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_hd', b: 'b_del', label: 'updatePod', kind: 'call' }
		},
		{ at: 4000, dur: 600, para: 2, do: { op: 'enqueue', queue: 'wq', item: 'shop/web-6d8f7b9c4' } },
		{ at: 4100, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{
			at: 4800,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'b_wq', text: '同じ鍵は 1 つ', tone: 'ok' }
		},
		{ at: 4900, dur: 400, para: 2, do: { op: 'board', line: 3 } },
		{ at: 1100, dur: 700, para: 0, do: { op: 'pulse', id: 'b_fifo' } }
	],
	loop: [
		{ at: 0, dur: 600, do: { op: 'enqueue', queue: 'fifo', item: 'Updated b9m4t' } },
		{ at: 700, dur: 600, do: { op: 'dequeue', queue: 'fifo', item: 'Updated b9m4t' } },
		{
			at: 1300,
			dur: 700,
			do: { op: 'packet', a: 'b_hd', b: 'b_del', label: '知らせ', kind: 'watch' }
		},
		{ at: 2000, dur: 600, do: { op: 'peek', queue: 'wq', item: 'shop/web-6d8f7b9c4' } },
		{ at: 2600, dur: 600, do: { op: 'enqueue', queue: 'fifo', item: 'Updated q2wfz' } },
		{ at: 3300, dur: 600, do: { op: 'dequeue', queue: 'fifo', item: 'Updated q2wfz' } }
	],
	board: [
		'ListAndWatch()：続きから知らせを受ける',
		'etcd への watch は 1 本、配るのは API サーバ',
		'HandleDeltas() → updatePod()',
		'ワークキューに鍵を 1 つ'
	],
	badges: { b_wq: 'shop/web-6d8f7b9c4' },
	layers: [B.inf([]), B.wq([])],
	impl: [I.listWatch, I.fifo, I.pop, I.handleDeltas, I.updatePod, I.wqAdd, I.cacher, I.rateLimiter],
	refs: [
		'k8s-api-concepts',
		'k8s-reflector',
		'k8s-fifo',
		'k8s-informer',
		'k8s-cacher',
		'k8s-ratelimit',
		'k8s-kcm'
	],
	learns: [1]
};

export const s4: Step = {
	n: 4,
	kind: 'internals',
	short: '差を埋める',
	title: 'ReplicaSet が差を埋める',
	lead: '生きている Pod を数え、足りない 1 個を約束してから作る',
	body: [
		'worker が鍵を取り、syncReplicaSet() で生きている Pod を数える。',
		'差 −1 を見て、作ると約束を書いてから Pod を 1 つ POST する。'
	],
	depth: {
		intro: [
			'見張り番は、列から「web-6d8f7b9c4 を見直して」の札を 1 枚取る。台帳の写しで、その型紙の部屋がいくつ生きているかを数える。',
			'2 つしか無いので、1 つ足すと決める。足す前に「1 つ作る」とメモしておき、同じ部屋を 2 度作らないようにする。'
		],
		work: [
			'worker が processNextWorkItem() でワークキューから鍵を取り、syncReplicaSet() を呼ぶ。手元の写しから、ラベル app=web で持ち主がこの ReplicaSet の Pod を集める。',
			'deletionTimestamp が付いた 7xk2p と、終わった Pod を除くと、生きている Pod は 2 個だ。manageReplicas() は差 2 − 3 ＝ −1 を見て、1 個を作ると決める。',
			'作る前に expectations に「作成 1 個」と書き、CreatePods() で API サーバに Pod を POST する。名前は generateName の web-6d8f7b9c4- に 5 字が足され、87cwj になる。',
			'作った Pod の ADDED が watch で届くと、expectations が 0 に戻る。それまでの調整は数え直さないので、同じ Pod を 2 度作らない。'
		],
		deep: [
			'syncReplicaSet() は最初に SatisfiedExpectations() を見る。約束した作成・削除が全て watch で見えたか、約束から 5 分（ExpectationsTimeout）経っていれば、数え直してよい。',
			'manageReplicas() は差が負なら作る。1 回に作るのは最大 500 個（burstReplicas）で、slowStartBatch() が 1・2・4・8 … と倍に増やして並べて作る。途中で失敗すると残りを作らず、作らなかった数を expectations から引く。',
			'POST /api/v1/namespaces/shop/pods は createHandler() に入り、mutating のアドミッションを通る。ServiceAccount の巻（kube-api-access-jrps5）と、node が落ちても 300 秒待つ tolerations が足される。etcd3 の Create() が新しい鍵を書く。',
			'Pod の ownerReferences には ReplicaSet web-6d8f7b9c4（controller: true）が入る。印があるので、同じラベルを持つ別の ReplicaSet はこの Pod を数えない。ReplicaSet を消すと、ガベージコレクタが印をたどって Pod も消す。',
			'最後に calculateStatus() で replicas・readyReplicas・availableReplicas を数え、status を書く。Pod が 1 つも Ready にならないので、readyReplicas は 0 のままだ。'
		]
	},
	callout: {
		type: 'warn',
		text: '持ち主の無い Pod に同じラベルを付けると、ReplicaSet が自分の数に引き取り、余った分を消す。ラベルは Deployment ごとに分ける。'
	},
	changes: [
		{ mark: '+', text: 'expectations に作成 1 個' },
		{ mark: '+', text: 'Pod 87cwj を POST した' },
		{ mark: '~', text: '生きている Pod 2 → 3 個' }
	],
	facts: [
		{ k: '生きている Pod', v: '2 個（3 − 1）', calc: '3-1' },
		{ k: '作る数', v: '1 個（差 2 − 3 ＝ −1）' },
		{ k: '1 回に作る上限', v: '500 個（burstReplicas）' },
		{ k: '約束の期限', v: '5 分（ExpectationsTimeout）' }
	],
	scene: [
		{ op: 'move', from: 'ctrl', to: 'api', payload: 'POST Pod', kind: 'write' },
		{ op: 'move', from: 'api', to: 'etcd', payload: 'Create', kind: 'write' }
	],
	log: {
		t: '10:06:12.011',
		from: 'ctrl',
		to: 'api',
		kind: 'write',
		info: 'Created pod: web-6d8f7b9c4-87cwj（差 −1 を埋めた）'
	},
	town: '見張り番が台帳の写しで部屋を数え、「1 つ作る」とメモしてから役場に届ける',
	work: 'kubectl get rs -n shop の DESIRED・CURRENT・READY で、3・3・0 の差を読む',
	inside: {
		packet: {
			name: 'POST /api/v1/namespaces/shop/pods（ReplicaSet コントローラから）',
			size: '約 2.4 KB',
			parts: [
				{
					name: 'Pod の metadata',
					fields: [
						{ k: 'generateName', v: 'web-6d8f7b9c4-', level: 1 },
						{ k: 'labels', v: 'app=web・pod-template-hash=6d8f7b9c4', level: 2 },
						{ k: 'ownerReferences', v: 'ReplicaSet web-6d8f7b9c4（controller: true）', level: 2 }
					]
				},
				{
					name: 'Pod の spec（型紙の写し）',
					fields: [
						{ k: 'containers[0].image', v: 'registry.example/shop-web:1.4.2', level: 1 },
						{ k: 'resources.limits.memory', v: '128Mi', level: 1 },
						{ k: 'resources.requests', v: 'cpu 100m・memory 128Mi', level: 2 },
						{ k: 'nodeName', v: '（空。スケジューラが決める）', level: 2 },
						{
							k: 'tolerations（アドミッションが足す）',
							v: 'not-ready・unreachable に 300 秒',
							level: 3
						}
					]
				}
			]
		},
		hosts: [
			cp([
				row('c-kcm', 0, 'kube-controller-manager', 'syncReplicaSet() の中'),
				row('w-q', 1, 'ワークキュー（replicaset）', '空'),
				row('x-exp', 1, 'expectations shop/web-6d8f7b9c4', '作成 1 個を待つ', 'warn'),
				row('rs-old', 1, 'ReplicaSet web-6d8f7b9c4', '3 個・Ready 0')
			]),
			N1([kl1, q2wfz, row('p-7xk2p', 1, `${POD}7xk2p`, 'Terminating（猶予 30 秒）', 'warn')]),
			N2([kl2, b9m4t])
		],
		logs: [
			{
				t: '10:06:12',
				src: 'kubectl events',
				text: 'Normal   SuccessfulCreate   replicaset/web-6d8f7b9c4   Created pod: web-6d8f7b9c4-87cwj'
			}
		]
	},
	metrics: { want: '3 個', ready: '0 個', pending: '1 個' },
	motion: [
		{
			at: 0,
			dur: 800,
			para: 0,
			do: { op: 'camera', fit: ['b_wq', 'b_next', 'b_sync', 'b_manage'] }
		},
		{ at: 400, dur: 600, para: 0, do: { op: 'dequeue', queue: 'wq', item: 'shop/web-6d8f7b9c4' } },
		{
			at: 1000,
			dur: 700,
			para: 0,
			do: { op: 'packet', a: 'b_next', b: 'b_sync', label: '鍵', kind: 'call' }
		},
		{ at: 1100, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 1900,
			dur: 450,
			para: 1,
			do: { op: 'badge', id: 'b_sync', text: '生きている 2 / 欲しい 3', tone: 'warn' }
		},
		{
			at: 2400,
			dur: 700,
			para: 1,
			do: { op: 'packet', a: 'b_sync', b: 'b_manage', label: '差 −1', kind: 'call' }
		},
		{ at: 2500, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 3200, dur: 600, para: 2, do: { op: 'enqueue', queue: 'exp', item: '作成 1' } },
		{
			at: 3900,
			dur: 800,
			para: 2,
			do: { op: 'packet', a: 'b_manage', b: 'b_create', label: 'POST Pod', kind: 'write' }
		},
		{
			at: 4700,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_create', b: 'b_store', label: 'Create', kind: 'write' }
		},
		{ at: 4800, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 4900, dur: 800, para: 2, do: { op: 'count', metric: 'pending', to: '1 個' } },
		{ at: 5800, dur: 500, para: 3, do: { op: 'dequeue', queue: 'exp', item: '作成 1' } },
		{ at: 5900, dur: 400, para: 3, do: { op: 'board', line: 3 } },
		{
			at: 6400,
			dur: 450,
			para: 3,
			do: { op: 'badge', id: 'b_sync', text: '約束を果たした', tone: 'ok' }
		},
		{ at: 1100, dur: 700, para: 0, do: { op: 'pulse', id: 'b_sync' } }
	],
	loop: [
		{ at: 0, dur: 600, do: { op: 'enqueue', queue: 'wq', item: 'shop/web-6d8f7b9c4' } },
		{ at: 700, dur: 600, do: { op: 'dequeue', queue: 'wq', item: 'shop/web-6d8f7b9c4' } },
		{
			at: 1300,
			dur: 700,
			do: { op: 'packet', a: 'b_next', b: 'b_sync', label: '見直し', kind: 'call' }
		},
		{
			at: 2000,
			dur: 700,
			do: { op: 'packet', a: 'b_sync', b: 'b_manage', label: '差 0', kind: 'call' }
		}
	],
	board: [
		'processNextWorkItem()：鍵を 1 つ取る',
		'manageReplicas()：2 − 3 ＝ −1',
		'ExpectCreations(1) → CreatePods()',
		'ADDED が届き、約束が 0 に'
	],
	badges: { b_sync: '約束を果たした' },
	layers: [B.wq(['shop/web-6d8f7b9c4']), B.rs([]), B.api()],
	impl: [
		I.updatePod,
		I.wqAdd,
		I.next,
		I.syncRS,
		I.satisfied,
		I.manage,
		I.slowStart,
		I.expect,
		I.createPods,
		I.create,
		I.storeCreate,
		I.calcStatus
	],
	refs: ['k8s-replicaset', 'k8s-rs', 'k8s-ctrl-utils', 'k8s-rs-utils', 'k8s-create', 'k8s-taints'],
	learns: [2]
};
