// 見本 2（learn-standard.md 第 12 章）：Kubernetes「Pod が落ちても元に戻る（宣言と制御ループ）」。
// 関数・構造体・設定の名前は Kubernetes v1.31.0・Linux v6.12・containerd v1.7.22 の tag のソースで確かめた（npm run impl:verify）。
// 材料は src/lib/content/v2/k8s-*.ts。実戦は kubectl の模擬（src/lib/tools/shell/kube.ts・tools-real/worlds/k8s.json）。
import type { Lesson } from '../../lesson/types.ts';
import { sources } from '../v2/k8s-base.ts';
import { s1, s2, s3, s4 } from '../v2/k8s-steps-1.ts';
import { s5, s6, s7, s8 } from '../v2/k8s-steps-2.ts';
import { s9, s10, s11, s12 } from '../v2/k8s-steps-3.ts';
import { s13, s14, s15 } from '../v2/k8s-steps-4.ts';

export const k8s101: Lesson = {
	id: 'k8s-101',
	field: 'k8s',
	level: 3,
	title: 'Pod が落ちても元に戻る仕組み',
	goal: 'Pod が消えてから戻るまでを部品と関数で説明し、落ちる理由を読んで直すことができる',
	prereq: ['ctr-001'],
	related: ['cld-006'],
	next: [],
	tier: 3,
	minutes: 60,
	learn: [
		'欲しい状態を API サーバと etcd に書く仕組み',
		'watch・informer・ワークキューで変化が届く道',
		'ReplicaSet コントローラが差を埋める手順',
		'スケジューラの Filter と Score と bind',
		'kubelet が CRI でコンテナを起こし状態を返す道',
		'OOMKilled・CrashLoopBackOff・Pending の原因',
		'describe・events・logs --previous の読み方'
	],
	metrics: [
		{ key: 'want', label: '欲しい数', unit: '個' },
		{ key: 'ready', label: 'Ready', unit: '個' },
		{ key: 'pending', label: 'Pending', unit: '個' },
		{ key: 'restarts', label: '再起動（87cwj）', unit: '回' },
		{ key: 'wait', label: '次の起こし直しまで', unit: '秒' }
	],
	legend: [
		{ kind: 'write', label: '書き込み（API サーバへ）', style: 'solid' },
		{ kind: 'watch', label: 'watch の知らせ', style: 'dash' },
		{ kind: 'bind', label: '置き場所（bind）', style: 'double' },
		{ kind: 'status', label: '状態の報告', style: 'solid' },
		{ kind: 'cri', label: 'CRI の呼び出し', style: 'dash' },
		{ kind: 'call', label: '関数の呼び出し', style: 'dash' },
		{ kind: 'kill', label: '止める・落ちる', style: 'double' }
	],
	sources,
	terms: [
		{ word: 'Pod', mean: '1 つ以上のコンテナを同じ網と巻で動かす、置き場所の単位' },
		{ word: 'ReplicaSet', mean: '同じ型紙の Pod を決めた数だけ保つ物。差を見て作り・消す' },
		{ word: 'Deployment', mean: '型紙の版を持ち、ReplicaSet を入れ替えて更新する物' },
		{ word: 'etcd', mean: 'API サーバだけが読み書きする、版つきの鍵と値の台帳' },
		{ word: 'watch', mean: '一覧の版の続きから、変化を流し続けてもらう API の使い方' },
		{ word: 'informer', mean: 'watch を受けて手元の写しを直し、関数を呼ぶ client-go の部品' },
		{ word: 'resourceVersion', mean: '物の版の番号。etcd の revision をそのまま使う' },
		{ word: 'requests', mean: '置き場所を決める予約の量。node の空きから引かれる' },
		{ word: 'limits', mean: '使ってよい上限。記憶は超えると止められる' },
		{ word: 'OOMKilled', mean: '記憶の上限を超え、カーネルに SIGKILL で止められた理由' },
		{ word: 'CrashLoopBackOff', mean: '落ちたコンテナを起こし直すのを待っている状態の名前' },
		{ word: 'kubelet', mean: 'node ごとに動き、割り当てられた Pod を CRI で起こす係' },
		{ word: 'CRI', mean: 'kubelet が containerd などに頼む gRPC の決まり' },
		{ word: 'PLEG', mean: 'kubelet がコンテナの変化を 1 秒ごとに問い直して見つける仕組み' },
		{ word: 'QoS', mean: 'requests と limits の付け方で決まる守られ方の順' }
	],
	knobs: [
		{ id: 'restarts', label: '再起動の回数', unit: '回', min: 0, max: 8, step: 1, value: 5 },
		{ id: 'replicas', label: 'レプリカ', unit: '個', min: 1, max: 10, step: 1, value: 3 }
	],
	explain: [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15],
	example: {
		intro:
			'3 つとも RESTARTS 4〜5 回の CrashLoopBackOff。前のコンテナのログの最後は読み込みの途中で終わっている',
		lines: [
			'$ kubectl get pods -n shop',
			'NAME                  READY   STATUS             RESTARTS        AGE',
			'web-6d8f7b9c4-7xk2p   0/1     CrashLoopBackOff   5 (42s ago)     6m12s',
			'web-6d8f7b9c4-b9m4t   0/1     CrashLoopBackOff   5 (42s ago)     6m12s',
			'web-6d8f7b9c4-q2wfz   0/1     CrashLoopBackOff   4 (2m25s ago)   5m12s',
			'$ kubectl logs web-6d8f7b9c4-7xk2p -n shop --previous',
			'2026-11-19T01:05:27.412Z INFO  shop-web 1.4.2 starting (node v22.11.0, pid 1)',
			'2026-11-19T01:05:27.618Z INFO  listening on :8080',
			'2026-11-19T01:05:28.003Z INFO  loading catalog cache (48,210 items)',
			'2026-11-19T01:05:28.871Z INFO  catalog cache 96 MiB of 182 MiB loaded'
		]
	},
	practice: {
		goal: '店の web が 3 つとも落ち続ける。理由を読んで絞り、記憶の上限を直して 3 つを Ready にする',
		tool: { name: 'shell', mode: 'mock' },
		commands: [
			'kubectl get',
			'kubectl describe',
			'kubectl logs',
			'kubectl set',
			'kubectl rollout',
			'kubectl delete',
			'kubectl top'
		],
		setup: { world: 'k8s' },
		success: { k8s: { ready: 3, limitAtLeast: '182Mi' } },
		flow: [{ match: '^kubectl ', from: 'you', to: 'api' }],
		mistakes: [
			{
				when: '名前空間を付けずに見た',
				why: '-n を付けないと default の名前空間を見る。web は shop にある',
				next: 'kubectl get pods -n shop と、-n shop を付けて打つ',
				match: 'No resources found in default namespace.'
			},
			{
				when: '記憶の requests を 1Gi にした',
				why: 'requests は node の空きから引く予約。どの node も空きは 700 MiB で、新しい Pod は入らず Pending になる',
				next: 'requests は 128Mi のまま、limits だけを使う量（182 MiB）より上の 256Mi にする',
				match: 'Insufficient memory'
			},
			{
				when: '上限を少しだけ上げた',
				why: '使う量は 182 MiB。160Mi ではまだ超えるので、新しい Pod も OOMKilled になり、入れ替えが進まない',
				next: 'logs --previous の「of 182 MiB」を見て、上限を 256Mi にする',
				match: 'timed out waiting for the condition'
			},
			{
				when: '命令を打ち間違えた',
				why: 'kubectl に無い命令は動かない',
				next: 'kubectl get pods -n shop のように、get・describe・logs・set と打つ',
				match: 'unknown command'
			}
		]
	},
	check: [
		{
			ask: 'RESTARTS 5・CrashLoopBackOff の Pod。まず何を見るか',
			how: 'describe の Last State と logs --previous',
			kind: 'scene',
			opts: [
				'describe の Last State と logs --previous',
				'Pod を消して様子を見る',
				'node を再起動する'
			]
		},
		{
			ask: '新しい Pod が 10 分 Pending のまま。まず何を見るか',
			how: 'get events の FailedScheduling の文',
			kind: 'scene',
			opts: ['get events の FailedScheduling の文', 'logs --previous', 'イメージの tag']
		},
		{
			ask: '再起動 5 回目の後、次の起こし直しまで何秒待つか',
			how: '160 秒（10 × 2 の 4 乗）',
			kind: 'number'
		},
		{
			ask: '終わりの番号 137 は何を意味するか',
			how: '128 ＋ 9。SIGKILL で外から止められた'
		},
		{
			ask: 'Pod が消えかけた知らせを受け、新しい Pod を作るのはどの部品か',
			how: 'ReplicaSet コントローラ',
			opts: ['kubelet', 'ReplicaSet コントローラ', 'kube-scheduler']
		},
		{
			ask: 'スケジューラが node に入るかを決めるのに足す物は',
			how: 'requests（使う量や limits ではない）'
		},
		{
			ask: 'allocatable 3,840 MiB の node に、requests 256Mi の Pod はいくつ入るか',
			how: '15 個（3,840 ÷ 256）',
			kind: 'number'
		},
		{
			ask: '使う量 182 MiB の web。上限を 160Mi にした。どうなるか',
			how: '新しい Pod も OOMKilled になり、入れ替えが止まる',
			kind: 'scene',
			opts: [
				'新しい Pod も OOMKilled になり、入れ替えが止まる',
				'3 つとも Ready になる',
				'Pending になる'
			]
		}
	],
	map: {
		nodes: {
			you: { icon: 'person', town: '店の番頭' },
			api: { icon: 'api', town: '役場の受付', addr: '10.0.1.10:6443' },
			etcd: { icon: 'etcd', town: '役場の台帳' },
			ctrl: { icon: 'gear', town: '台帳の見張り番' },
			sched: { icon: 'scheduler', town: '部屋割り係' },
			kl1: { icon: 'kubelet', town: '棟 1 の管理人', addr: '10.0.1.11' },
			kl2: { icon: 'kubelet', town: '棟 2 の管理人', addr: '10.0.1.12' }
		},
		zones: [
			{
				label: '制御面',
				note: 'API サーバ・etcd・コントローラ・スケジューラ',
				members: ['api', 'etcd', 'ctrl', 'sched']
			},
			{ label: 'node-1', note: '空き 700 MiB', members: ['kl1'] },
			{ label: 'node-2', note: '空き 700 MiB', members: ['kl2'] }
		],
		links: [
			{ a: 'you', b: 'api', label: 'HTTPS 6443', dir: 'both' },
			{ a: 'api', b: 'etcd', label: 'gRPC（etcd v3）', dir: 'both' },
			{ a: 'ctrl', b: 'api', label: 'watch・作る', dir: 'both' },
			{ a: 'sched', b: 'api', label: 'watch・bind', dir: 'both' },
			{ a: 'kl1', b: 'api', label: 'watch・状態', dir: 'both' },
			{ a: 'kl2', b: 'api', label: 'watch・状態', dir: 'both' }
		]
	},
	teach: {
		myths: [
			{
				wrong: 'Pod を消せば直る',
				right:
					'消すと ReplicaSet が同じ型紙の Pod を作り、同じ理由でまた落ちる。数は戻るが理由は残る。Last State と logs --previous で理由を読む'
			},
			{
				wrong: '終わりの番号 137 はアプリが返した失敗',
				right:
					'137 は 128 ＋ 9 で、外から SIGKILL で止められた印。理由が OOMKilled なら記憶の上限、無ければ猶予切れや手で止めた時'
			},
			{
				wrong: 'requests は使ってよい上限',
				right:
					'requests は置き場所を決める予約で、node の空きから引かれる。止める線は limits。予約を倍にすると node に入る数が半分になる'
			}
		],
		oneMinute:
			'欲しい数は API サーバを通して etcd に書かれる。コントローラ・スケジューラ・kubelet は watch で変化を受け、手元の写しで差を見て、差を埋める書き込みだけをする。Pod が消えると ReplicaSet が作り、スケジューラが requests の入る node に置き、kubelet が CRI で起こす。数は戻るが、上限を超えて OOMKilled になる理由は戻らない。',
		questions: [
			{
				ask: 'RESTARTS 12・Last State OOMKilled・Limits 256Mi。何を見て、何を直すか',
				answer:
					'logs --previous と node の memory.peak で使う量を測り、上限を測った最大 ＋ 余裕にする。漏れなら上げても止まらないので、使う量が時間で増えるかも見る',
				look: '上限を倍にして終えず、使う量を測ってから決めるか'
			},
			{
				ask: '新しい Pod が 10 分 Pending。どこを見るか',
				answer:
					'get events の FailedScheduling の文と、describe node の Allocated resources。Insufficient memory なら requests か node の数、untolerated taint なら tolerations',
				look: 'Pending をログでなく、スケジューラの出来事で読むと分かっているか'
			}
		]
	}
};
