// 見本 2（k8s-101）のステップ 9〜12：資源不足で Pending・上限を測って直す・requests と limits の代償・実際には。
import type { Step } from '../../lesson/types.ts';
import { B, cp, I, node, row } from './k8s-base.ts';

const N1 = (rows: ReturnType<typeof row>[]) => node('node-1', '10.0.1.11', '棟 1', rows);
const N2 = (rows: ReturnType<typeof row>[]) => node('node-2', '10.0.1.12', '棟 2', rows);
const kl1 = row('kl-1', 0, 'kubelet（node-1）', '動いている');
const kl2 = row('kl-2', 0, 'kubelet（node-2）', '動いている');
const NEW = 'web-v475cz8h8-';

export const s9: Step = {
	n: 9,
	kind: 'fail',
	short: 'Pending',
	title: '求めすぎて Pending',
	lead: '記憶を 1 GiB 求めると、どの node にも入らず動かない',
	body: [
		'番頭が記憶を 1 GiB 求めるよう直すと、新しい Pod は Pending のままだ。',
		'node の空きは 828 MiB と 700 MiB で、更新は 1 つ目で止まる。'
	],
	depth: {
		intro: [
			'番頭は「記憶が足りないなら、うんと多く頼めばよい」と考え、上限も予約も 1 GiB にした。新しい部屋が 1 つ作られたが、どの棟にも入らない。',
			'部屋割り係は「どの棟にも 1 GiB の空きが無い」と書き残し、空きができるのを待つ。古い部屋は消されず、落ち続けたままだ。'
		],
		work: [
			'番頭が requests と limits の記憶を 1Gi にした。新しい ReplicaSet web-88cks584b の Pod mkxdg が作られ、Pending のまま動かない。空きは node-1 が 828 MiB、node-2 が 700 MiB しか無い。',
			'Filter は 2 台とも落とす。FailedScheduling に「0/2 nodes are available: 2 Insufficient memory.」と残る。Pod は unschedulablePods の列に移り、node や Pod が変わるのを待つ。',
			'maxSurge 25% なら 1 個多く作れるが、maxUnavailable 25% は 3 個の 0.75 を切り捨てて 0 個だ。新しい Pod が Ready にならない限り、古い Pod を 1 つも減らさない。'
		],
		deep: [
			'fitsRequest() は記憶の要求 1,073,741,824 B を、allocatable から requests の和を引いた残りと比べる。残りは node-1 が 868,220,928 B（828 MiB）、node-2 が 734,003,200 B（700 MiB）だ。どちらも足りず、Insufficient memory を返す。',
			'入る所が無い Pod は AddUnschedulableIfNotPresent() で unschedulablePods に置かれる。node が足された・Pod が消えた等の出来事が来ると、関係する Pod だけを activeQ か backoffQ へ戻す。何も来なくても、最長 5 分で戻して試し直す。',
			'プリエンプションは、優先度の低い Pod を追い出して入れる道だ。ここでは全ての Pod の優先度が 0 で、追い出しても入らないので「No preemption victims found」になる。',
			'rolloutRolling() は新しい ReplicaSet を maxSurge の分だけ増やす。古い方は、動ける数が欲しい数 − maxUnavailable を割らない分だけ減らす。600 秒（progressDeadlineSeconds）進まないと、理由 ProgressDeadlineExceeded が付く。更新は止めず、待ち続ける。'
		]
	},
	callout: {
		type: 'warn',
		text: 'requests を上げるほど安心、ではない。requests は node の空きから差し引く予約で、入る所が無ければ Pod は 1 秒も動かない。'
	},
	changes: [
		{ mark: '+', text: 'web-88cks584b-mkxdg が Pending' },
		{ mark: '+', text: 'FailedScheduling（2 Insufficient memory）' },
		{ mark: '~', text: '更新は 1 / 3 で止まった' }
	],
	facts: [
		{ k: '求めた記憶', v: '1,024 MiB（1 GiB）' },
		{ k: 'node-1 の空き', v: '828 MiB（3,840 − 3,012）', calc: '3840-3012' },
		{ k: 'node-2 の空き', v: '700 MiB（3,840 − 3,140）', calc: '3840-3140' },
		{ k: 'maxUnavailable', v: '0 個（3 × 25% ＝ 0.75 を切り捨て）' },
		{ k: 'maxSurge', v: '1 個（0.75 を切り上げ）' }
	],
	scene: [
		{ op: 'move', from: 'you', to: 'api', payload: 'requests 1Gi', kind: 'write' },
		{ op: 'move', from: 'sched', to: 'api', payload: 'FailedScheduling', kind: 'bind' }
	],
	log: {
		t: '10:08:05.402',
		from: 'sched',
		to: 'api',
		kind: 'bind',
		info: 'FailedScheduling：0/2 nodes：2 Insufficient memory'
	},
	town: '1 GiB の部屋を頼んだが、どの棟にも空きが無く、部屋割り係が待ちの棚に置く',
	work: 'get events の FailedScheduling と describe node を並べる',
	inside: {
		hosts: [
			cp([
				row('d-web', 0, 'Deployment web', '更新中（1 / 3）', 'warn'),
				row('rs-old', 1, 'ReplicaSet web-6d8f7b9c4', '3 個・Ready 0', 'bad'),
				row('rs-big', 1, 'ReplicaSet web-88cks584b', '1 個・Pending', 'bad'),
				row('s-q', 1, 'unschedulablePods', 'web-88cks584b-mkxdg', 'bad')
			]),
			N1([kl1, row('n1-free', 1, 'allocatable の残り', '828 MiB（1 GiB は入らない）', 'bad')]),
			N2([kl2, row('n2-free', 1, 'allocatable の残り', '700 MiB（1 GiB は入らない）', 'bad')])
		],
		logs: [
			{
				t: '10:08:05',
				src: 'kubectl events',
				text: 'Normal   ScalingReplicaSet   deployment/web   Scaled up replica set web-88cks584b to 1'
			},
			{
				t: '10:08:05',
				src: 'kubectl events',
				text: 'Warning   FailedScheduling   pod/web-88cks584b-mkxdg   0/2 nodes are available: 2 Insufficient memory.'
			}
		]
	},
	metrics: { want: '3 個', ready: '0 個', pending: '1 個' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_fit', 'b_pq', 'b_score'] } },
		{ at: 400, dur: 600, para: 0, do: { op: 'enqueue', queue: 'activeQ', item: 'mkxdg 1Gi' } },
		{ at: 1000, dur: 800, para: 0, do: { op: 'count', metric: 'pending', to: '1 個' } },
		{ at: 1100, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{ at: 1900, dur: 600, para: 1, do: { op: 'dequeue', queue: 'activeQ', item: 'mkxdg 1Gi' } },
		{ at: 2500, dur: 600, para: 1, do: { op: 'enqueue', queue: 'fitq', item: 'node-1 828 ✗' } },
		{ at: 3100, dur: 600, para: 1, do: { op: 'enqueue', queue: 'fitq', item: 'node-2 700 ✗' } },
		{ at: 3700, dur: 600, para: 1, do: { op: 'fail', id: 'b_fit' } },
		{ at: 3800, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{
			at: 4500,
			dur: 600,
			para: 1,
			do: { op: 'move', item: 'mkxdg 1Gi', from: 'activeQ', to: 'unschedQ' }
		},
		{ at: 4600, dur: 400, para: 1, do: { op: 'board', line: 2 } },
		{ at: 5300, dur: 800, para: 2, do: { op: 'camera', fit: ['b_pq', 'ctrl', 'api'] } },
		{
			at: 5700,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'ctrl', text: '古い Pod は減らさない', tone: 'warn' }
		},
		{ at: 5800, dur: 400, para: 2, do: { op: 'board', line: 3 } },
		{ at: 1050, dur: 700, para: 0, do: { op: 'pulse', id: 'b_pq' } }
	],
	loop: [
		// 最後の寄りの中で流す（留まる間も図の中で流れが続く。LS-M4・D1）
		{
			at: 0,
			dur: 800,
			do: { op: 'packet', a: 'sched', b: 'api', label: '入らない', kind: 'bind', stall: true }
		},
		{ at: 900, dur: 600, do: { op: 'pulse', id: 'sched' } },
		{
			at: 1600,
			dur: 800,
			do: { op: 'packet', a: 'api', b: 'you', label: 'Pending', kind: 'status' }
		}
	],
	board: [
		'requests 1Gi の Pod mkxdg',
		'fitsRequest()：828・700 MiB < 1,024 MiB',
		'unschedulablePods で待つ',
		'maxUnavailable 0 個 → 古い方は残る'
	],
	badges: { b_fit: '2 Insufficient memory', ctrl: '古い Pod は減らさない' },
	layers: [B.sq([], [], []), B.flt([])],
	impl: [I.pq, I.fits, I.unsched, I.rolling, I.prioritize],
	refs: [
		'k8s-scheduler',
		'k8s-fit',
		'k8s-sched-queue',
		'k8s-deployment',
		'k8s-deploy-rolling',
		'k8s-resources'
	],
	learns: [5]
};

export const s10: Step = {
	n: 10,
	kind: 'fix',
	short: '直す',
	title: '使う量を測って上限を直す',
	lead: '前のログで 182 MiB と分かる。上限 256Mi・予約 192Mi に直す',
	body: [
		'前のコンテナのログに「96 MiB of 182 MiB」とあり、使う量が分かる。',
		'上限を 256Mi・予約を 192Mi にすると、新しい ReplicaSet の 3 つが Ready になる。'
	],
	depth: {
		intro: [
			'番頭は頼み方を戻し、まず部屋がどれだけ記憶を使うのかを調べる。止められる前の日誌に「182 MiB のうち 96 MiB を読み込んだ」とある。',
			'そこで上限を 256 MiB に、予約を普段の量に近い 192 MiB にした。新しい型紙の部屋が 1 つずつ作られ、古い部屋と入れ替わる。'
		],
		work: [
			'kubectl logs web-6d8f7b9c4-87cwj -n shop --previous は、止められる前のコンテナのログを出す。最後の行の「catalog cache 96 MiB of 182 MiB loaded」で、使う量が 182 MiB と分かる。',
			'set resources で --limits=memory=256Mi と --requests=memory=192Mi を付けて直す。型紙が変わるので、Deployment は新しい ReplicaSet web-v475cz8h8 を作る。',
			'maxSurge 1 個・maxUnavailable 0 個なので、新しい Pod を 1 つ作り、Ready になるたびに古い Pod を 1 つ減らす。3 回の入れ替えで、14 秒ほどで 3 つとも Running・Ready になる。'
		],
		deep: [
			'syncDeployment() は型紙の hash を計算し、getNewReplicaSet() で同じ hash の ReplicaSet を探す。無ければ作り、pod-template-hash のラベルを付ける。今回の hash は v475cz8h8 だ。',
			'rolloutRolling() は 2 つの手を交互に打つ。新しい方を欲しい数 ＋ maxSurge まで増やす手と、古い方を「Ready の和が欲しい数 − maxUnavailable を割らない」分だけ減らす手だ。',
			'減らしてよい数は「Pod の総数 − 欲しい数 ＋ maxUnavailable − 新しい方の Ready でない数」だ。新しい Pod が Ready になると 1 になり、Ready でない古い Pod から先に減らす（cleanupUnhealthyReplicas()）。1 GiB の時は新しい Pod が Ready にならず、0 のままだった。',
			'予約も使う量に近づける。128 MiB のままだと、スケジューラは 182 MiB 使う Pod を 128 MiB と数え、node に詰め込みすぎる。足りなくなった時に追い出されるのも、requests を超えて使う Pod からだ。',
			'1 GiB の ReplicaSet web-88cks584b も古い型紙として扱われ、0 個に減らされる。Pending の Pod は Ready でないので、先に消される。古い ReplicaSet は 0 個のまま残る。revisionHistoryLimit の 10 個まで、rollout undo の戻り先になる。'
		]
	},
	callout: {
		type: 'tip',
		text: '上限は「測った最大 ＋ 余裕」で決める。予約は「普段の量」で決める。どちらも勘で倍にしない。'
	},
	changes: [
		{ mark: '~', text: 'limits.memory 128Mi → 256Mi' },
		{ mark: '~', text: 'requests.memory 128Mi → 192Mi' },
		{ mark: '+', text: '新しい ReplicaSet web-v475cz8h8' },
		{ mark: '~', text: 'Ready 0 → 3 個' }
	],
	facts: [
		{ k: '使う量（ログから）', v: '182 MiB' },
		{ k: '新しい上限', v: '256 MiB（182 MiB に 74 MiB の余裕）', calc: '182+74' },
		{ k: '予約', v: '192 MiB（node-1 の空き 828 MiB に入る）' },
		{ k: '入れ替え', v: '3 回・約 14 秒' }
	],
	scene: [
		{ op: 'move', from: 'you', to: 'api', payload: 'limits 256Mi・requests 192Mi', kind: 'write' },
		{ op: 'move', from: 'api', to: 'ctrl', payload: '型紙が変わった', kind: 'watch' },
		{ op: 'move', from: 'kl2', to: 'api', payload: 'Ready', kind: 'status' }
	],
	log: {
		t: '10:09:44.000',
		from: 'you',
		to: 'api',
		kind: 'write',
		info: 'deployment "web" successfully rolled out（3 / 3 Ready）'
	},
	town: '日誌で使う量を確かめ、部屋の札を 256 MiB に書き換え、部屋を 1 つずつ入れ替える',
	work: 'kubectl rollout status deployment/web -n shop で、入れ替えの終わりを待つ',
	inside: {
		hosts: [
			cp([
				row('d-web', 0, 'Deployment web', '3 / 3 Ready', 'ok'),
				row('rs-old', 1, 'ReplicaSet web-6d8f7b9c4', '0 個（戻り先）'),
				row('rs-big', 1, 'ReplicaSet web-88cks584b', '0 個'),
				row('rs-new', 1, 'ReplicaSet web-v475cz8h8', '3 個・Ready 3', 'ok')
			]),
			N1([
				kl1,
				row('p-8frqg', 1, `${NEW}8frqg`, 'Running・10.244.1.24', 'ok'),
				row('p-m2sg4', 1, `${NEW}m2sg4`, 'Running・10.244.1.26', 'ok')
			]),
			N2([kl2, row('p-w6vzf', 1, `${NEW}w6vzf`, 'Running・10.244.2.25', 'ok')])
		],
		logs: [
			{
				t: '10:09:30',
				src: 'kubectl events',
				text: 'Normal   ScalingReplicaSet   deployment/web   Scaled up replica set web-v475cz8h8 to 1'
			},
			{
				t: '10:09:44',
				src: 'kubectl events',
				text: 'Normal   ScalingReplicaSet   deployment/web   Scaled down replica set web-6d8f7b9c4 to 0 from 1'
			}
		]
	},
	metrics: { want: '3 個', ready: '3 個', pending: '0 個', restarts: '0 回', wait: '0 秒' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['you', 'api', 'kl1'] } },
		{
			at: 400,
			dur: 800,
			para: 0,
			do: { op: 'packet', a: 'kl1', b: 'api', label: 'logs --previous', kind: 'status' }
		},
		{
			at: 1200,
			dur: 800,
			para: 0,
			do: { op: 'packet', a: 'api', b: 'you', label: '182 MiB', kind: 'status' }
		},
		{ at: 1300, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{ at: 2100, dur: 800, para: 1, do: { op: 'camera', fit: ['b_sdep', 'b_roll', 'b_newrs'] } },
		{
			at: 2500,
			dur: 800,
			para: 1,
			do: { op: 'packet', a: 'b_sdep', b: 'b_newrs', label: '型紙 v475cz8h8', kind: 'call' }
		},
		{ at: 3300, dur: 600, para: 1, do: { op: 'enqueue', queue: 'rsq', item: 'v475cz8h8 1' } },
		{ at: 3400, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 4100, dur: 600, para: 2, do: { op: 'dequeue', queue: 'rsq', item: '6d8f7b9c4 3' } },
		{ at: 4700, dur: 600, para: 2, do: { op: 'enqueue', queue: 'rsq', item: 'v475cz8h8 3' } },
		{ at: 4800, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 5500, dur: 900, para: 2, do: { op: 'count', metric: 'ready', to: '3 個' } },
		{ at: 6000, dur: 800, para: 2, do: { op: 'count', metric: 'restarts', to: '0 回' } },
		{
			at: 6500,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'b_roll', text: '3 / 3 Ready', tone: 'ok' }
		},
		{ at: 6600, dur: 400, para: 2, do: { op: 'board', line: 3 } }
	],
	loop: [
		// 最後の寄りの中で流す（留まる間も図の中で流れが続く。LS-M4・D1）
		{
			at: 0,
			dur: 700,
			do: { op: 'packet', a: 'b_sdep', b: 'b_roll', label: '新しい上限', kind: 'call' }
		},
		{
			at: 800,
			dur: 700,
			do: { op: 'packet', a: 'b_roll', b: 'b_newrs', label: '新しい RS', kind: 'call' }
		},
		{ at: 1600, dur: 600, do: { op: 'pulse', id: 'b_newrs' } }
	],
	board: [
		'logs --previous：182 MiB 使う',
		'set resources：上限 256Mi',
		'rolloutRolling()：1 つずつ入れ替え',
		'3 / 3 Ready、入口が戻る'
	],
	badges: { b_roll: '3 / 3 Ready', kl1: 'Running', kl2: 'Running' },
	layers: [B.dep(['6d8f7b9c4 3', '88cks584b 1'])],
	impl: [I.syncDeploy, I.rolling, I.newRS],
	refs: [
		'k8s-deployment',
		'k8s-deploy-ctrl',
		'k8s-deploy-rolling',
		'k8s-deploy-sync',
		'k8s-apps-defaults',
		'kubectl-logs'
	],
	learns: [2, 6]
};

export const s11: Step = {
	n: 11,
	kind: 'tradeoff',
	short: '代償',
	title: '予約と上限の代償',
	lead: '予約を大きくすれば守られるが、node に入る数が減る',
	body: [
		'requests は予約で、大きいほど node に入る Pod が減る。',
		'limits は上限だ。cpu と記憶の両方で requests と同じにすると Guaranteed になり、最後まで守られる。'
	],
	depth: {
		intro: [
			'予約を多く取るほど、その部屋は守られる。だが棟の部屋の数は予約の和で決まるので、予約を倍にすれば、置ける部屋は半分になる。',
			'上限を予約より上にすると、空いている時は多く使えるが、棟が足りなくなった時に先に追い出される。どちらを選ぶかは、数で決める。'
		],
		work: [
			'node の allocatable は 3,840 MiB だ。requests 192 MiB なら web の Pod は 20 個入るが、limits と同じ 256 MiB なら 15 個に減る。予約を上げた分だけ、同じ数を動かす node の費用も上がる。',
			'cpu と記憶の両方で requests ＝ limits なら QoS は Guaranteed で、oom_score_adj は −997 だ。今の web は cpu の limits が無いので、記憶を 256Mi / 256Mi にそろえても Burstable のまま 954 だ。',
			'上限を外すと、1 つの Pod の漏れが node の記憶を食べる。memory.available が 100 MiB を割ると、kubelet が Pod を追い出す（Evicted）。上限は、隣の Pod を守る壁でもある。'
		],
		deep: [
			'ComputePodQOS() は、全てのコンテナが CPU と記憶で requests ＝ limits なら Guaranteed にする。どれも無ければ BestEffort、それ以外は Burstable だ。今の web は cpu に limits が無いので、記憶をそろえても Burstable だ。',
			'GetContainerOOMScoreAdjust() は、Burstable に 1000 − 1000 × requests ÷ 記憶を付ける。記憶 4 GiB・requests 192 MiB では 1000 − 46 ＝ 954 だ（46.875 を切り捨て）。BestEffort の 1000 の次に止められやすい。',
			'node の記憶が足りなくなると、kubelet は memory.available が既定の 100 Mi を割った所で追い出しを始める。順は、使う量が requests を超えている Pod から、優先度と超えた量の順だ。',
			'CPU の limits は CFS の上限（cpu.max）で、超えると止められずに待たされる（throttled）。記憶の limits は超えると止められる。CPU には requests だけ、記憶には requests と limits の 2 つを付ける現場が多い。'
		]
	},
	callout: {
		type: 'point',
		text: '予約（requests）は置き場所と追い出しの順を決め、上限（limits）は止める線を決める。両方を数で決め、根拠のログと指標を残す。'
	},
	changes: [
		{ mark: '~', text: '192Mi なら 20 個、256Mi なら 15 個' },
		{ mark: '+', text: 'QoS：Burstable（oom_score_adj 954）' },
		{ mark: '~', text: 'cpu も記憶もそろえて Guaranteed なら −997' }
	],
	facts: [
		{ k: '192 MiB で入る数', v: '20 個（3,840 ÷ 192）', calc: '3840/192' },
		{ k: '256 MiB で入る数', v: '15 個（3,840 ÷ 256）', calc: '3840/256' },
		{ k: 'Burstable の oom_score_adj', v: '954（1000 − 1000 × 192 ÷ 4,096 の切り捨て）' },
		{ k: '追い出しの線', v: 'memory.available 100 MiB' }
	],
	scene: [{ op: 'move', from: 'sched', to: 'api', payload: '入る数', kind: 'bind' }],
	log: {
		t: '10:12:00',
		from: 'sched',
		to: 'api',
		kind: 'bind',
		info: 'requests 192Mi なら node 1 台に 20 個、256Mi なら 15 個'
	},
	town: '予約を倍にすれば守られるが、1 つの棟に置ける部屋は半分になる',
	work: 'get pod -o yaml の status.qosClass で QoS を確かめる',
	ask: {
		q: 'requests を 192Mi から 256Mi にすると、node 1 台に入る web の数は？',
		opts: ['20 個のまま', '15 個に減る', '30 個に増える'],
		a: 1,
		why: '入る数は allocatable ÷ requests。3,840 ÷ 256 ＝ 15。'
	},
	inside: {
		hosts: [
			cp([row('rs-new', 1, 'ReplicaSet web-v475cz8h8', '3 個・Ready 3', 'ok')]),
			N1([
				kl1,
				row('p-8frqg', 1, `${NEW}8frqg`, 'Burstable・oom_score_adj 954', 'warn'),
				row('p-m2sg4', 1, `${NEW}m2sg4`, 'Burstable・oom_score_adj 954', 'warn'),
				row('n1-free', 1, 'allocatable の残り', '700 MiB')
			]),
			N2([kl2, row('p-w6vzf', 1, `${NEW}w6vzf`, 'Burstable・oom_score_adj 954', 'warn')])
		]
	},
	metrics: { want: '3 個', ready: '3 個' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['sched', 'kl1', 'kl2'] } },
		{ at: 400, dur: 450, para: 0, do: { op: 'badge', id: 'kl1', text: '192Mi なら 20 個' } },
		{
			at: 1000,
			dur: 450,
			para: 0,
			do: { op: 'badge', id: 'kl2', text: '256Mi なら 15 個', tone: 'warn' }
		},
		{ at: 1100, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{ at: 1900, dur: 800, para: 1, do: { op: 'camera', fit: ['b_qos', 'b_adj'] } },
		{
			at: 2300,
			dur: 700,
			para: 1,
			do: { op: 'packet', a: 'b_qos', b: 'b_adj', label: 'Burstable', kind: 'call' }
		},
		{
			at: 3000,
			dur: 450,
			para: 1,
			do: { op: 'badge', id: 'b_adj', text: '954（Guaranteed は −997）', tone: 'warn' }
		},
		{ at: 3100, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 3900, dur: 800, para: 2, do: { op: 'camera', fit: ['kl1', 'kl2', 'api'] } },
		{
			at: 4300,
			dur: 800,
			para: 2,
			do: {
				op: 'packet',
				a: 'kl2',
				b: 'api',
				label: 'Evicted（上限なし）',
				kind: 'kill',
				drop: true
			}
		},
		{ at: 4400, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 5300, dur: 400, para: 2, do: { op: 'board', line: 3 } },
		{ at: 1050, dur: 700, para: 0, do: { op: 'pulse', id: 'kl2' } },
		{ at: 1250, dur: 600, para: 0, do: { op: 'pulse', id: 'sched' } }
	],
	loop: [
		// 最後の寄りの中で流す（留まる間も図の中で流れが続く。LS-M4・D1）
		{ at: 0, dur: 900, do: { op: 'packet', a: 'sched', b: 'api', label: '入る数', kind: 'bind' } },
		{ at: 1000, dur: 600, do: { op: 'pulse', id: 'kl1' } },
		{ at: 1300, dur: 600, do: { op: 'pulse', id: 'kl2' } }
	],
	board: [
		'入る数 ＝ 3,840 ÷ requests',
		'Burstable は 954、Guaranteed は −997',
		'上限なし → 漏れが node を食べる',
		'requests と limits を数で決める'
	],
	badges: { b_adj: '954（Guaranteed は −997）' },
	layers: [
		{
			id: 'qos',
			label: 'QoS と OOM の点（kubelet）',
			boxes: [
				{ id: 'b_qos', impl: I.qos.name },
				{ id: 'b_adj', impl: I.oomAdj.name }
			]
		}
	],
	impl: [I.qos, I.oomAdj],
	refs: ['k8s-qos', 'k8s-resources', 'k8s-qos-helper', 'k8s-qos-policy', 'k8s-eviction'],
	learns: [5]
};

export const s12: Step = {
	n: 12,
	kind: 'realworld',
	short: '実際には',
	title: 'Deployment と node 故障',
	lead: 'node が落ちると、約 5 分 40 秒後に Pod が移る',
	body: [
		'現場では Pod を直に作らず、Deployment が ReplicaSet を通して持つ。',
		'node が落ちると、40 秒で NotReady、さらに 300 秒で Pod が追い出され、代わりが作られる。'
	],
	depth: {
		intro: [
			'実際の現場では、部屋を 1 つずつ作らない。型紙と数を Deployment に書き、型紙ごとに ReplicaSet が数を守る。',
			'棟がまるごと落ちた時は、管理人の返事が途絶える。役場は少し待ってから、その棟の部屋をほかの棟へ移す。待つ長さは数で決まっている。'
		],
		work: [
			'Deployment → ReplicaSet → Pod の持ち主の印（ownerReferences）が連なる。型紙を変えるたびに新しい ReplicaSet が作られ、古い方は revisionHistoryLimit の 10 個まで残る。',
			'node の kubelet は Lease を 10 秒ごとに更新する。40 秒（node-monitor-grace-period）更新が無いと NotReady になる。taint node.kubernetes.io/unreachable が付く。',
			'Pod には 300 秒の tolerations が足されているので、Pod が消されるのは 300 秒後だ。合わせて約 5 分 40 秒、その node の Pod の分だけ数が減る。急ぐ Pod は tolerationSeconds を短くする。'
		],
		deep: [
			'node のライフサイクルのコントローラは monitorNodeHealth() で 5 秒ごとに node の状態を見る。Lease の更新が 40 秒無いと Ready の条件を Unknown にし、NoExecute の taint を付ける。',
			'DefaultTolerationSeconds のアドミッションは、Pod に not-ready と unreachable の 300 秒を足す。秒数は defaultNotReadyTolerationSeconds などで決まる。taint-eviction のコントローラが、その秒数の後で Pod を消す。',
			'追い出された Pod には deletionTimestamp が付くが、kubelet が返事をしないので Terminating のまま残る。ReplicaSet は消す途中の Pod を数えないので、ステップ 4 と同じ道で代わりを作る。StatefulSet の Pod と RWO の巻は、古い Pod が本当に止まったと分かるまで作り直されない。',
			'止まったと分かる道は 2 つだ。node が戻って kubelet が消すか、taint node.kubernetes.io/out-of-service（v1.28 で GA）を付ける。最後の手は --grace-period=0 --force で消すことだ。確かめずに force で消すと、古い Pod が動いたまま同じ巻に 2 つが書く恐れがある。',
			'計画した停止（node の更新・drain）では、PodDisruptionBudget で「同時に止めてよい数」を決める。minAvailable: 2 なら、Ready が 2 つを割る追い出しは断られ、drain は 1 つずつ待ちながら進む。'
		]
	},
	callout: {
		type: 'tip',
		text: 'マネージドの集まりでも、移すまでの長さは node-monitor-grace-period と tolerationSeconds の 2 つで決まる。止まってほしくない Pod は、レプリカを別の node に散らす。'
	},
	changes: [
		{ mark: '+', text: 'Deployment → ReplicaSet → Pod の連なり' },
		{ mark: '~', text: 'node が 40 秒で NotReady' },
		{ mark: '-', text: '300 秒後に Pod が移される' }
	],
	facts: [
		{ k: 'Lease の更新', v: '10 秒ごと' },
		{ k: 'NotReady まで', v: '40 秒（node-monitor-grace-period）' },
		{ k: 'Pod が消されるまで', v: '300 秒（tolerationSeconds）' },
		{ k: '移るまでの合計', v: '340 秒（約 5 分 40 秒）', calc: '40+300' }
	],
	scene: [
		{ op: 'move', from: 'kl2', to: 'api', payload: 'Lease（途絶える）', kind: 'status' },
		{ op: 'move', from: 'ctrl', to: 'api', payload: 'taint unreachable', kind: 'write' }
	],
	log: {
		t: '10:20:00',
		from: 'ctrl',
		to: 'api',
		kind: 'write',
		info: 'node-2 の Lease が 40 秒更新されない → NotReady・taint unreachable'
	},
	town: '棟の管理人の返事が 40 秒途絶えると、役場はさらに 300 秒待ってから部屋を移す',
	work: 'get nodes と describe node の Conditions・Taints を読む',
	inside: {
		hosts: [
			cp([
				row('d-web', 0, 'Deployment web', 'Ready 3 / 3 → 2 / 3', 'warn'),
				row('rs-new', 1, 'ReplicaSet web-v475cz8h8', '3 個（2 個 Ready）', 'warn'),
				row('n-2', 1, 'node node-2', 'NotReady・taint unreachable', 'bad')
			]),
			N1([
				kl1,
				row('p-8frqg', 1, `${NEW}8frqg`, 'Running', 'ok'),
				row('p-m2sg4', 1, `${NEW}m2sg4`, 'Running', 'ok')
			]),
			N2([
				row('kl-2', 0, 'kubelet（node-2）', '返事が無い', 'bad'),
				row('p-w6vzf', 1, `${NEW}w6vzf`, 'Running・0/1 Ready=False（300 秒後に追い出し）', 'bad')
			])
		]
	},
	metrics: { want: '3 個', ready: '2 個' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['ctrl', 'api', 'kl1', 'kl2'] } },
		{
			at: 400,
			dur: 800,
			para: 0,
			do: { op: 'packet', a: 'kl2', b: 'api', label: 'Lease', kind: 'status' }
		},
		{ at: 1300, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 2000,
			dur: 900,
			para: 1,
			do: { op: 'packet', a: 'kl2', b: 'api', label: 'Lease', kind: 'status', drop: true }
		},
		{ at: 3000, dur: 600, para: 1, do: { op: 'fail', id: 'kl2' } },
		{ at: 3100, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{
			at: 3800,
			dur: 800,
			para: 1,
			do: { op: 'packet', a: 'ctrl', b: 'api', label: 'taint', kind: 'write' }
		},
		{ at: 4600, dur: 900, para: 2, do: { op: 'count', metric: 'ready', to: '2 個' } },
		{ at: 4700, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{
			at: 5500,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'kl2', text: '300 秒待って移す', tone: 'bad' }
		},
		{ at: 5600, dur: 400, para: 2, do: { op: 'board', line: 3 } },
		{ at: 700, dur: 700, para: 0, do: { op: 'pulse', id: 'api' } },
		{ at: 3500, dur: 700, para: 1, do: { op: 'pulse', id: 'ctrl' } },
		{ at: 4400, dur: 700, para: 1, do: { op: 'pulse', id: 'kl2' } }
	],
	loop: [
		{ at: 0, dur: 900, do: { op: 'packet', a: 'kl1', b: 'api', label: 'Lease', kind: 'status' } },
		{
			at: 1000,
			dur: 900,
			do: { op: 'packet', a: 'kl2', b: 'api', label: 'Lease', kind: 'status', drop: true }
		}
	],
	board: [
		'kubelet：Lease を 10 秒ごと',
		'40 秒途絶える → NotReady',
		'taint unreachable を付ける',
		'300 秒後に Pod を消し、作り直す'
	],
	badges: { kl2: '300 秒待って移す' },
	layers: [
		{
			id: 'adm',
			label: 'Pod を書く時（kube-apiserver のアドミッション）',
			boxes: [{ id: 'b_tol', impl: I.tolerations.name }]
		},
		{
			id: 'nlc',
			label: 'node の見張り（kube-controller-manager）',
			boxes: [{ id: 'b_mon', impl: I.monitor.name }]
		}
	],
	impl: [I.monitor, I.tolerations],
	refs: [
		'k8s-nodes',
		'k8s-taints',
		'k8s-nodelifecycle',
		'k8s-tolerations',
		'k8s-disruptions',
		'k8s-deployment',
		'k8s-kcm'
	],
	learns: [2]
};
