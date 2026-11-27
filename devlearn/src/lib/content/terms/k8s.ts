// k8s 分野の言葉（explanation-standard.md 第 10 章）。説明は平易な言葉で 1〜2 文・80 字以内。
// 出典：Kubernetes v1.31 の文書（Pods・Nodes・Controllers・ReplicaSet・Deployments・kube-scheduler・
// Pod Lifecycle・Resource Management・Pod QoS・Taints and Tolerations・Kubernetes API Concepts）と
// v1.31.0 のソース（pkg/controller・pkg/scheduler・pkg/kubelet）。確認日 2026-11-28
import type { Term } from '../../learn/terms.ts';

const KD = 'https://kubernetes.io/docs/';
const k8s = (id: string, t: string, m: string[], d: string, refs?: string[]): Term => ({
	id,
	t,
	m,
	d,
	field: 'k8s',
	first: 'k8s-101',
	...(refs ? { refs } : {})
});

export const K8S_TERMS: Term[] = [
	// 言葉をそろえるステップ
	k8s(
		'container',
		'コンテナ',
		['コンテナ'],
		'アプリと、動くのに要る部品を 1 つに包んで、他と分けて動かす物。どの機械でも同じに動く。'
	),
	k8s(
		'pod',
		'Pod',
		['Pod', 'pod'],
		'コンテナを 1 つ以上まとめた、動かす単位の最小の箱。中のコンテナは同じ IP 番地を使う。',
		[`${KD}concepts/workloads/pods/`]
	),
	k8s('node', 'ノード', ['ノード'], 'Pod を実際に動かす 1 台の機械。実機でも仮想の機械でもよい。', [
		`${KD}concepts/architecture/nodes/`
	]),
	k8s(
		'cluster',
		'クラスタ',
		['クラスタ'],
		'何台ものノードと、それらをまとめて操る部品の集まり。1 つの大きな機械のように使う。'
	),
	k8s(
		'kubectl',
		'kubectl',
		['kubectl'],
		'手元の端末から、クラスタに頼みごとを送る命令。中身は HTTP の要求。'
	),
	k8s(
		'desired',
		'望む状態',
		['望む状態'],
		'「こうあってほしい」と書いた姿。Kubernetes は今の姿をこれに近づけ続ける。'
	),
	k8s(
		'manifest',
		'マニフェスト（YAML）',
		['マニフェスト', 'YAML', 'web.yaml', '-f web.yaml'],
		'望む状態を書いた設定の紙。字下げで入れ子を表す書き方で書く。'
	),
	k8s(
		'apply',
		'apply',
		['apply'],
		'kubectl の命令の 1 つ。「紙に書いたとおりの状態にして」と頼む。'
	),
	k8s(
		'etcd',
		'etcd',
		['etcd'],
		'望む状態と今の様子を全て書き留める帳簿。キーと値で持ち、何台かで写しを持ち合う。'
	),
	k8s(
		'apiserver',
		'kube-apiserver',
		['kube-apiserver', 'apiserver'],
		'クラスタのただ 1 つの入口。頼みを確かめてから etcd に書き、変わった事を皆に知らせる。'
	),
	k8s(
		'deploy',
		'Deployment',
		['Deployment'],
		'「この Pod を何個、どの版で」を書く紙の種類。版の入れ替えも受け持つ。',
		[`${KD}concepts/workloads/controllers/deployment/`]
	),
	k8s('replicas', 'replicas', ['replicas'], '同じ Pod を何個動かしたいかの数。望む数。'),
	// 仕組み
	k8s(
		'ctrl',
		'controller-manager',
		['kube-controller-manager', 'controller-manager', 'controller'],
		'数を合わせる係を何十も束ねたプログラム。差を見つけると紙を書き足す。',
		[`${KD}concepts/architecture/controller/`]
	),
	k8s(
		'loop',
		'制御ループ',
		['制御ループ'],
		'観る・比べる・動くを止まらずに繰り返す形。差が無ければ何もしない。'
	),
	k8s(
		'watch',
		'watch',
		['watch'],
		'変わった所だけを、続けて知らせてもらう頼み方。毎回全部を読み直さずに済む。',
		[`${KD}reference/using-api/api-concepts/`]
	),
	k8s(
		'rs',
		'ReplicaSet',
		['ReplicaSet'],
		'同じ Pod をちょうど決めた数だけ保つ紙。Deployment が作る。',
		[`${KD}concepts/workloads/controllers/replicaset/`]
	),
	k8s(
		'sched',
		'kube-scheduler',
		['kube-scheduler', 'scheduler'],
		'置き場の決まっていない Pod に、動かすノードを決めて書く係。',
		[`${KD}concepts/scheduling-eviction/kube-scheduler/`]
	),
	k8s(
		'filter',
		'ふるい（Filter）',
		['ふるい', 'Filter'],
		'入らないノードを候補から外す段。CPU やメモリの空きが足りないノードを外す。'
	),
	k8s(
		'score',
		'点付け（Score）',
		['Score'],
		'ふるいに残ったノードに点を付ける段。一番高いノードを選ぶ。'
	),
	k8s(
		'bind',
		'bind',
		['bind'],
		'Pod の紙に、選んだノードの名前（nodeName）を書くこと。起こすのは別の係。'
	),
	k8s(
		'kubelet',
		'kubelet',
		['kubelet'],
		'各ノードで動く係。自分の所に来た Pod を起こし、見張り、様子を書き戻す。',
		[`${KD}reference/command-line-tools-reference/kubelet/`]
	),
	k8s(
		'cri',
		'containerd と CRI',
		['containerd', 'CRI'],
		'コンテナを実際に作って動かすプログラムと、kubelet がそれに頼む時の決まった窓口。'
	),
	k8s('cni', 'CNI', ['CNI'], 'Pod に IP 番地を配り、線をつなぐ部品を呼ぶ決まり。'),
	k8s(
		'probe',
		'readiness probe',
		['readiness probe'],
		'客を受けてよいかを、決まった間隔で確かめる問い合わせ。通るまで客を回さない。'
	),
	k8s('ready', 'Ready', ['Ready'], '客を受けてよい状態。この状態の Pod にだけ客が回る。', [
		`${KD}concepts/workloads/pods/pod-lifecycle/`
	]),
	// 失敗と直し方
	k8s(
		'limits',
		'limits',
		['limits.memory', 'limits'],
		'コンテナが使ってよい量の上限。メモリが超えると殺される。',
		[`${KD}concepts/configuration/manage-resources-containers/`]
	),
	k8s(
		'cgroup',
		'cgroup',
		['cgroup'],
		'Linux で、プロセスの組ごとにメモリや CPU の使う量を区切る仕組み。'
	),
	k8s(
		'oom',
		'OOM killer',
		['OOM killer'],
		'メモリが足りなくなった時に、プロセスを選んで殺す Linux の仕組み。'
	),
	k8s(
		'oomk',
		'OOMKilled',
		['OOMKilled'],
		'メモリの上限を超えて OOM killer に殺された、という終わり方。終了コードは 137。'
	),
	k8s(
		'backoff',
		'CrashLoopBackOff',
		['CrashLoopBackOff'],
		'落ちては起こし直すを繰り返し、待ち時間を倍に延ばしている状態。待ちの上限は 5 分。',
		[`${KD}concepts/workloads/pods/pod-lifecycle/`]
	),
	k8s('lease', 'Lease', ['Lease'], 'ノードが生きている印。kubelet が 10 秒ごとに書き直す。', [
		`${KD}concepts/architecture/nodes/`
	]),
	k8s(
		'notready',
		'NotReady',
		['NotReady'],
		'様子が届かなくなったノードの状態。新しい Pod はそこに置かれない。'
	),
	k8s(
		'taint',
		'taint',
		['taint'],
		'ノードに付ける「近寄るな」の札。耐えると書いた Pod だけが置かれ、残れる。',
		[`${KD}concepts/scheduling-eviction/taint-and-toleration/`]
	),
	k8s(
		'requests',
		'requests',
		['requests'],
		'コンテナのために取っておく量。置き場を決める時、この数で空きを数える。',
		[`${KD}concepts/configuration/manage-resources-containers/`]
	),
	k8s(
		'qos',
		'QoS クラス',
		['QoS'],
		'requests と limits の書き方で決まる Pod の格。メモリが尽きそうな時、低い格から追い出される。',
		[`${KD}concepts/workloads/pods/pod-qos/`]
	),
	k8s(
		'describe',
		'kubectl describe',
		['describe'],
		'1 つの物の詳しい様子と、最近の出来事を並べて出す命令。'
	),
	k8s(
		'events',
		'Events',
		['Events'],
		'部品がしたことの記録。誰が（From）、何を（Reason）したかが時刻の順に並ぶ。'
	),
	k8s(
		'laststate',
		'Last State',
		['Last State'],
		'コンテナの 1 つ前の終わり方。理由と終了コードが出る。'
	)
];
