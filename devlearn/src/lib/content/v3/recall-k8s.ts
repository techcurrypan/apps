// 思い出す（Kubernetes：紙から Pod が起きるまでと、落ちた時）。名前と既定値は Kubernetes v1.31 の文書で確かめる（確認日 2026-11-28）
import type { RecallSet } from '../../learn/recall3.ts';

export const RECALL_K8S: RecallSet = {
	qs: [
		{
			k: 'order',
			q: 'kubectl apply から Pod が起きるまでを、動く順に並べる',
			items: [
				'kube-apiserver が etcd に書く',
				'ReplicaSet のループが Pod の紙を作る',
				'kube-scheduler が置き場を書く（bind）',
				'kubelet が containerd に起こさせる',
				'readiness probe が通って Ready'
			],
			start: [
				'kubelet が containerd に起こさせる',
				'kube-scheduler が置き場を書く（bind）',
				'readiness probe が通って Ready',
				'kube-apiserver が etcd に書く',
				'ReplicaSet のループが Pod の紙を作る'
			],
			why: '帳簿に書く → 差を見て紙を作る → 置き場を決める → そのノードの kubelet が起こす → 確かめが通って客を受ける。'
		},
		{
			k: 'hit',
			q: '「web を 3 つ」という望む状態が書き留められている所はどこ？図の物を押す',
			hits: ['api', 'etcd', 'ctrl', 'n2'],
			ans: 'etcd',
			why: 'etcd が帳簿。kube-apiserver は入口で、自分では持たない。'
		},
		{
			k: 'pick',
			q: 'Pod の終わり方が OOMKilled・Exit Code 137。まず何を変える？',
			opts: ['Pod を消して作り直す', 'メモリの limits を山より上にする', 'ノードを足す'],
			ans: 1,
			why: '上限に届いて殺されている。作り直しても同じ上限でまた殺される。'
		},
		{
			k: 'num',
			q: 'CrashLoopBackOff の待ちは 10 秒から倍に延びる。5 回目の起こし直しの前の待ちは何秒？',
			ans: 160,
			unit: '秒',
			why: '10 → 20 → 40 → 80 → 160。上限は 300 秒。'
		},
		{
			k: 'text',
			q: 'ノードの電源が落ちても、その上の Pod がすぐ作り直されないのはなぜ？ 1〜2 文で',
			keys: [
				['40', 'NotReady', '届かない'],
				['300', '耐える', 'taint', '待つ']
			],
			model:
				'Lease が 40 秒届かないとノードは NotReady になり、Pod はさらに 300 秒 taint に耐えてから追い出される。短い切断で大量に作り直さないため。',
			why: '40 秒で NotReady、300 秒の我慢の後に追い出し、ReplicaSet が作り直す。'
		}
	],
	note: [
		'apply は望む状態を etcd に書くだけ。動かすのは係たち',
		'係は watch で観て、比べて、差だけ動く（controller・scheduler・kubelet）',
		'OOMKilled・137 は上限の問題。CrashLoopBackOff は待っている様子で、原因ではない',
		'ノードが黙ると 40 秒で NotReady、300 秒で追い出し、別のノードで作り直す'
	]
};
