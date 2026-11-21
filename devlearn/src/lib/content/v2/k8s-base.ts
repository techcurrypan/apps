// 見本 2（k8s-101）の材料：出典・関数の名前・層の図の箱・中身の板の行。本文は lessons/k8s-101.ts。
// 関数・構造体・設定の名前は、Kubernetes v1.31.0・Linux v6.12・containerd v1.7.22 の tag のソースで確かめた（npm run impl:verify。2026-11-19）。
// 場面：名前空間 shop の Deployment web（3 つ。記憶の上限 128Mi）。node-1（10.0.1.11）と node-2（10.0.1.12）、空きは node-1 が 828 MiB・node-2 が 700 MiB（requests の和を引いた分）。
// 品物の一覧を読み込むと 182 MiB 使うので、3 つとも OOMKilled を繰り返して CrashLoopBackOff になっている。
import type { Host, HostRow, Impl, ImplContext, Layer, Queue, Source } from '../../lesson/types.ts';

const K = 'v1.31.0';
const L = 'v6.12';
const C = 'v1.7.22';
const DAY = '2026-11-19';

const k8s = (id: string, path: string): Source => ({
	id,
	title: `Kubernetes ${K} ${path}`,
	url: `https://github.com/kubernetes/kubernetes/blob/${K}/${path}`,
	kind: 'source',
	checked: DAY
});
const doc = (id: string, title: string, url: string): Source => ({
	id,
	title,
	url,
	kind: 'doc',
	checked: DAY
});
const KD = 'https://kubernetes.io/docs/';

const sources: Source[] = [
	doc(
		'k8s-pod-lifecycle',
		'Kubernetes「Pod Lifecycle」',
		`${KD}concepts/workloads/pods/pod-lifecycle/`
	),
	doc('k8s-controller', 'Kubernetes「Controllers」', `${KD}concepts/architecture/controller/`),
	doc(
		'k8s-replicaset',
		'Kubernetes「ReplicaSet」',
		`${KD}concepts/workloads/controllers/replicaset/`
	),
	doc(
		'k8s-deployment',
		'Kubernetes「Deployments」',
		`${KD}concepts/workloads/controllers/deployment/`
	),
	doc(
		'k8s-resources',
		'Kubernetes「Resource Management for Pods and Containers」',
		`${KD}concepts/configuration/manage-resources-containers/`
	),
	doc(
		'k8s-scheduler',
		'Kubernetes「Kubernetes Scheduler」',
		`${KD}concepts/scheduling-eviction/kube-scheduler/`
	),
	doc(
		'k8s-qos',
		'Kubernetes「Pod Quality of Service Classes」',
		`${KD}concepts/workloads/pods/pod-qos/`
	),
	doc(
		'k8s-assign-memory',
		'Kubernetes「Assign Memory Resources to Containers and Pods」',
		`${KD}tasks/configure-pod-container/assign-memory-resource/`
	),
	doc(
		'k8s-debug-pod',
		'Kubernetes「Debug Running Pods」',
		`${KD}tasks/debug/debug-application/debug-running-pod/`
	),
	doc(
		'k8s-api-concepts',
		'Kubernetes「Kubernetes API Concepts」',
		`${KD}reference/using-api/api-concepts/`
	),
	doc('k8s-nodes', 'Kubernetes「Nodes」', `${KD}concepts/architecture/nodes/`),
	doc(
		'k8s-taints',
		'Kubernetes「Taints and Tolerations」',
		`${KD}concepts/scheduling-eviction/taint-and-toleration/`
	),
	doc('k8s-disruptions', 'Kubernetes「Disruptions」', `${KD}concepts/workloads/pods/disruptions/`),
	doc(
		'k8s-kcm',
		'Kubernetes「kube-controller-manager」',
		`${KD}reference/command-line-tools-reference/kube-controller-manager/`
	),
	doc(
		'k8s-eviction',
		'Kubernetes「Node-pressure Eviction」',
		`${KD}concepts/scheduling-eviction/node-pressure-eviction/`
	),
	doc('kubectl-describe', 'kubectl describe', `${KD}reference/kubectl/generated/kubectl_describe/`),
	doc('kubectl-logs', 'kubectl logs', `${KD}reference/kubectl/generated/kubectl_logs/`),
	doc('kubectl-events', 'kubectl events', `${KD}reference/kubectl/generated/kubectl_events/`),
	doc(
		'cgroup-v2',
		'Linux「Control Group v2」',
		'https://docs.kernel.org/admin-guide/cgroup-v2.html'
	),
	doc('etcd-api', 'etcd v3.5「etcd API」', 'https://etcd.io/docs/v3.5/learning/api/'),
	k8s('k8s-rs', 'pkg/controller/replicaset/replica_set.go'),
	k8s('k8s-rs-utils', 'pkg/controller/replicaset/replica_set_utils.go'),
	k8s('k8s-ctrl-utils', 'pkg/controller/controller_utils.go'),
	k8s('k8s-deploy-ctrl', 'pkg/controller/deployment/deployment_controller.go'),
	k8s('k8s-deploy-rolling', 'pkg/controller/deployment/rolling.go'),
	k8s('k8s-deploy-sync', 'pkg/controller/deployment/sync.go'),
	k8s('k8s-apps-defaults', 'pkg/apis/apps/v1/defaults.go'),
	k8s('k8s-sched-one', 'pkg/scheduler/schedule_one.go'),
	k8s('k8s-sched-queue', 'pkg/scheduler/internal/queue/scheduling_queue.go'),
	k8s('k8s-fit', 'pkg/scheduler/framework/plugins/noderesources/fit.go'),
	k8s('k8s-binder', 'pkg/scheduler/framework/plugins/defaultbinder/default_binder.go'),
	k8s('k8s-kubelet', 'pkg/kubelet/kubelet.go'),
	k8s('k8s-pod-workers', 'pkg/kubelet/pod_workers.go'),
	k8s('k8s-pleg', 'pkg/kubelet/pleg/generic.go'),
	k8s('k8s-kuberuntime', 'pkg/kubelet/kuberuntime/kuberuntime_manager.go'),
	k8s('k8s-kr-container', 'pkg/kubelet/kuberuntime/kuberuntime_container.go'),
	k8s('k8s-kr-linux', 'pkg/kubelet/kuberuntime/kuberuntime_container_linux.go'),
	k8s('k8s-status', 'pkg/kubelet/status/status_manager.go'),
	k8s('k8s-qos-policy', 'pkg/kubelet/qos/policy.go'),
	k8s('k8s-qos-helper', 'pkg/apis/core/v1/helper/qos/qos.go'),
	k8s('k8s-cri-api', 'staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto'),
	k8s('k8s-backoff', 'staging/src/k8s.io/client-go/util/flowcontrol/backoff.go'),
	k8s('k8s-reflector', 'staging/src/k8s.io/client-go/tools/cache/reflector.go'),
	k8s('k8s-fifo', 'staging/src/k8s.io/client-go/tools/cache/delta_fifo.go'),
	k8s('k8s-informer', 'staging/src/k8s.io/client-go/tools/cache/shared_informer.go'),
	k8s('k8s-workqueue', 'staging/src/k8s.io/client-go/util/workqueue/queue.go'),
	k8s('k8s-ratelimit', 'staging/src/k8s.io/client-go/util/workqueue/default_rate_limiters.go'),
	k8s('k8s-create', 'staging/src/k8s.io/apiserver/pkg/endpoints/handlers/create.go'),
	k8s('k8s-delete', 'staging/src/k8s.io/apiserver/pkg/endpoints/handlers/delete.go'),
	k8s('k8s-rest-delete', 'staging/src/k8s.io/apiserver/pkg/registry/rest/delete.go'),
	k8s('k8s-registry', 'staging/src/k8s.io/apiserver/pkg/registry/generic/registry/store.go'),
	k8s('k8s-etcd3', 'staging/src/k8s.io/apiserver/pkg/storage/etcd3/store.go'),
	k8s('k8s-cacher', 'staging/src/k8s.io/apiserver/pkg/storage/cacher/cacher.go'),
	k8s('k8s-nodelifecycle', 'pkg/controller/nodelifecycle/node_lifecycle_controller.go'),
	k8s('k8s-tolerations', 'plugin/pkg/admission/defaulttolerationseconds/admission.go'),
	{
		id: 'linux-memcontrol',
		title: `Linux ${L} mm/memcontrol.c`,
		url: `https://github.com/torvalds/linux/blob/${L}/mm/memcontrol.c`,
		kind: 'source',
		checked: DAY
	},
	{
		id: 'linux-oom',
		title: `Linux ${L} mm/oom_kill.c`,
		url: `https://github.com/torvalds/linux/blob/${L}/mm/oom_kill.c`,
		kind: 'source',
		checked: DAY
	},
	{
		id: 'containerd-events',
		title: `containerd ${C} pkg/cri/server/events.go`,
		url: `https://github.com/containerd/containerd/blob/${C}/pkg/cri/server/events.go`,
		kind: 'source',
		checked: DAY
	}
];

function fn(
	name: string,
	where: string,
	ref: string,
	kind: Impl['kind'] = 'function',
	project = 'kubernetes',
	version = K,
	context: ImplContext | undefined = 'user'
): Impl {
	return { name, kind, where, project, version, ref, ...(context ? { context } : {}) };
}
const kern = (name: string, where: string, ref: string): Impl =>
	fn(name, where, ref, 'function', 'linux', L, undefined);

const RS = 'pkg/controller/replicaset/replica_set.go';
const CU = 'pkg/controller/controller_utils.go';
const SQ = 'pkg/scheduler/internal/queue/scheduling_queue.go';
const KL = 'pkg/kubelet/kubelet.go';
const KR = 'pkg/kubelet/kuberuntime/kuberuntime_manager.go';
const CG = 'staging/src/k8s.io/client-go/tools/cache/';
const I = {
	create: fn(
		'createHandler()',
		'staging/src/k8s.io/apiserver/pkg/endpoints/handlers/create.go',
		'k8s-create'
	),
	store: fn(
		'GuaranteedUpdate()',
		'staging/src/k8s.io/apiserver/pkg/storage/etcd3/store.go',
		'k8s-etcd3'
	),
	storeCreate: fn(
		'Create()',
		'staging/src/k8s.io/apiserver/pkg/storage/etcd3/store.go',
		'k8s-etcd3'
	),
	cacher: fn(
		'dispatchEvents()',
		'staging/src/k8s.io/apiserver/pkg/storage/cacher/cacher.go',
		'k8s-cacher'
	),
	tolerations: fn(
		'defaultNotReadyTolerationSeconds',
		'plugin/pkg/admission/defaulttolerationseconds/admission.go',
		'k8s-tolerations',
		'setting'
	),
	listWatch: fn('ListAndWatch()', `${CG}reflector.go`, 'k8s-reflector'),
	fifo: fn('DeltaFIFO', `${CG}delta_fifo.go`, 'k8s-fifo', 'struct'),
	pop: fn('Pop()', `${CG}delta_fifo.go`, 'k8s-fifo'),
	handleDeltas: fn('HandleDeltas()', `${CG}shared_informer.go`, 'k8s-informer'),
	wqAdd: fn('Add()', 'staging/src/k8s.io/client-go/util/workqueue/queue.go', 'k8s-workqueue'),
	rateLimiter: fn(
		'DefaultTypedControllerRateLimiter()',
		'staging/src/k8s.io/client-go/util/workqueue/default_rate_limiters.go',
		'k8s-ratelimit'
	),
	updatePod: fn('updatePod()', RS, 'k8s-rs'),
	deleteRes: fn(
		'DeleteResource()',
		'staging/src/k8s.io/apiserver/pkg/endpoints/handlers/delete.go',
		'k8s-delete'
	),
	beforeDelete: fn(
		'BeforeDelete()',
		'staging/src/k8s.io/apiserver/pkg/registry/rest/delete.go',
		'k8s-rest-delete'
	),
	graceful: fn(
		'updateForGracefulDeletionAndFinalizers()',
		'staging/src/k8s.io/apiserver/pkg/registry/generic/registry/store.go',
		'k8s-registry'
	),
	killPod: fn('KillPod()', KR, 'k8s-kuberuntime'),
	next: fn('processNextWorkItem()', RS, 'k8s-rs'),
	syncRS: fn('syncReplicaSet()', RS, 'k8s-rs'),
	manage: fn('manageReplicas()', RS, 'k8s-rs'),
	slowStart: fn('slowStartBatch()', RS, 'k8s-rs'),
	satisfied: fn('SatisfiedExpectations()', CU, 'k8s-ctrl-utils'),
	expect: fn('ExpectCreations()', CU, 'k8s-ctrl-utils'),
	createPods: fn('CreatePods()', CU, 'k8s-ctrl-utils'),
	calcStatus: fn(
		'calculateStatus()',
		'pkg/controller/replicaset/replica_set_utils.go',
		'k8s-rs-utils'
	),
	pq: fn('PriorityQueue', SQ, 'k8s-sched-queue', 'struct'),
	maxBackoff: fn('DefaultPodMaxBackoffDuration', SQ, 'k8s-sched-queue', 'setting'),
	unsched: fn('AddUnschedulableIfNotPresent()', SQ, 'k8s-sched-queue'),
	scheduleOne: fn('ScheduleOne()', 'pkg/scheduler/schedule_one.go', 'k8s-sched-one'),
	schedulePod: fn('schedulePod()', 'pkg/scheduler/schedule_one.go', 'k8s-sched-one'),
	findFit: fn('findNodesThatFitPod()', 'pkg/scheduler/schedule_one.go', 'k8s-sched-one'),
	prioritize: fn('prioritizeNodes()', 'pkg/scheduler/schedule_one.go', 'k8s-sched-one'),
	fits: fn('fitsRequest()', 'pkg/scheduler/framework/plugins/noderesources/fit.go', 'k8s-fit'),
	bind: fn(
		'Bind()',
		'pkg/scheduler/framework/plugins/defaultbinder/default_binder.go',
		'k8s-binder'
	),
	loopIter: fn('syncLoopIteration()', KL, 'k8s-kubelet'),
	syncPod: fn('SyncPod()', KL, 'k8s-kubelet'),
	maxBackOff: fn('MaxContainerBackOff', KL, 'k8s-kubelet', 'setting'),
	workerLoop: fn('podWorkerLoop()', 'pkg/kubelet/pod_workers.go', 'k8s-pod-workers'),
	relist: fn('Relist()', 'pkg/kubelet/pleg/generic.go', 'k8s-pleg'),
	actions: fn('computePodActions()', KR, 'k8s-kuberuntime'),
	doBackOff: fn('doBackOff()', KR, 'k8s-kuberuntime'),
	start: fn(
		'startContainer()',
		'pkg/kubelet/kuberuntime/kuberuntime_container.go',
		'k8s-kr-container'
	),
	linuxRes: fn(
		'generateLinuxContainerResources()',
		'pkg/kubelet/kuberuntime/kuberuntime_container_linux.go',
		'k8s-kr-linux'
	),
	cri: fn(
		'CreateContainer()',
		'staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto',
		'k8s-cri-api'
	),
	setStatus: fn('SetPodStatus()', 'pkg/kubelet/status/status_manager.go', 'k8s-status'),
	inBackOff: fn(
		'IsInBackOffSince()',
		'staging/src/k8s.io/client-go/util/flowcontrol/backoff.go',
		'k8s-backoff'
	),
	boNext: fn('Next()', 'staging/src/k8s.io/client-go/util/flowcontrol/backoff.go', 'k8s-backoff'),
	syncDeploy: fn(
		'syncDeployment()',
		'pkg/controller/deployment/deployment_controller.go',
		'k8s-deploy-ctrl'
	),
	rolling: fn('rolloutRolling()', 'pkg/controller/deployment/rolling.go', 'k8s-deploy-rolling'),
	newRS: fn('getNewReplicaSet()', 'pkg/controller/deployment/sync.go', 'k8s-deploy-sync'),
	oomAdj: fn('GetContainerOOMScoreAdjust()', 'pkg/kubelet/qos/policy.go', 'k8s-qos-policy'),
	qos: fn('ComputePodQOS()', 'pkg/apis/core/v1/helper/qos/qos.go', 'k8s-qos-helper'),
	monitor: fn(
		'monitorNodeHealth()',
		'pkg/controller/nodelifecycle/node_lifecycle_controller.go',
		'k8s-nodelifecycle'
	),
	charge: kern('try_charge_memcg()', 'mm/memcontrol.c', 'linux-memcontrol'),
	memcgOom: kern('mem_cgroup_out_of_memory()', 'mm/memcontrol.c', 'linux-memcontrol'),
	oomKill: kern('oom_kill_process()', 'mm/oom_kill.c', 'linux-oom'),
	ctdEvent: fn(
		'handleEvent()',
		'pkg/cri/server/events.go',
		'containerd-events',
		'function',
		'containerd',
		C
	)
};

// ---- 層の図の箱（learn-standard.md LS-D12。箱の id はステップをまたいで同じ） ----
type Box = Layer['boxes'][number];
const q = (id: string, label: string, items: string[], limit?: string): Queue => ({
	id,
	label,
	items,
	...(limit ? { limit } : {})
});
const box = (id: string, impl: Impl, queues?: Queue[]): Box => ({
	id,
	impl: impl.name,
	...(queues ? { queues } : {})
});
const band = (id: string, label: string, boxes: Box[]): Layer => ({ id, label, boxes });
const B = {
	inf: (fifo: string[]) =>
		band('inf', 'informer（kube-controller-manager の中）', [
			box('b_lw', I.listWatch),
			box('b_fifo', I.fifo, [q('fifo', '変化の列（Delta）', fifo)]),
			box('b_hd', I.handleDeltas)
		]),
	wq: (wq: string[]) =>
		band('wq', 'ワークキュー（同じ鍵は 1 つにまとまる）', [
			box('b_del', I.updatePod),
			box('b_wq', I.wqAdd, [q('wq', '調整を待つ鍵', wq)])
		]),
	rs: (exp: string[]) =>
		band('rs', 'ReplicaSet コントローラ（worker 5 本）', [
			box('b_next', I.next),
			box('b_sync', I.syncRS, [q('exp', 'expectations（作ると約束した数）', exp)]),
			box('b_manage', I.manage)
		]),
	apid: () =>
		band('apid', 'kube-apiserver（DELETE の道）', [
			box('b_delres', I.deleteRes),
			box('b_before', I.beforeDelete),
			box('b_grace', I.graceful)
		]),
	etcd: (keys: string[]) =>
		band('etcd', 'etcd（API サーバだけが話す）', [
			box('b_gu', I.store, [q('etcdq', '鍵と版（revision）', keys)])
		]),
	api: () =>
		band('apis', 'kube-apiserver → etcd', [
			box('b_create', I.create),
			box('b_store', I.storeCreate)
		]),
	sq: (active: string[], backoff: string[], unsched: string[]) =>
		band('sq', 'スケジューリングのキュー（kube-scheduler の中）', [
			box('b_pq', I.pq, [
				q('activeQ', 'activeQ（今すぐ試す）', active),
				q('backoffQ', 'backoffQ（1〜10 秒待つ）', backoff),
				q('unschedQ', 'unschedulablePods（入る所が無い）', unsched, '最長 5 分')
			])
		]),
	cyc: () =>
		band('cyc', 'スケジュールの周回（1 度に 1 つ）', [
			box('b_one', I.scheduleOne),
			box('b_sp', I.schedulePod)
		]),
	flt: (fit: string[]) =>
		band('flt', 'Filter と Score', [
			box('b_fit', I.fits, [q('fitq', '入るか（requests と空き）', fit)]),
			box('b_score', I.prioritize)
		]),
	bnd: () => band('bnd', '割り当て（bind）', [box('b_bind', I.bind)]),
	klLoop: (pw: string[]) =>
		band('kl', 'kubelet の syncLoop（node-1）', [
			box('b_iter', I.loopIter),
			box('b_pw', I.workerLoop, [q('pw', 'pod worker の知らせ', pw)]),
			box('b_syncpod', I.syncPod)
		]),
	krt: () =>
		band('krt', 'kuberuntime（CRI の呼び手）', [
			box('b_cpa', I.actions),
			box('b_start', I.start),
			box('b_res', I.linuxRes)
		]),
	cri: () => band('cri', 'containerd（CRI の gRPC）→ runc', [box('b_cri', I.cri)]),
	back: (ev: string[]) =>
		band('back', '状態の戻り道（PLEG は同期を起こすだけ。書くのは SyncPod の中）', [
			box('b_pleg', I.relist, [q('plegq', 'PLEG の出来事（1 秒ごと）', ev)]),
			box('b_sm', I.setStatus)
		]),
	kern: () =>
		band('kern', 'カーネル（cgroup v2 の記憶の勘定）', [
			box('b_charge', I.charge),
			box('b_memcg', I.memcgOom),
			box('b_kill', I.oomKill)
		]),
	ctd: () => band('ctd', 'containerd の出来事', [box('b_ctd', I.ctdEvent)]),
	bo: (tbl: string[]) =>
		band('bo', 'kubelet の待ちの表（flowcontrol.Backoff）', [
			box('b_dbo', I.doBackOff, [q('boq', '鍵ごとの待ち', tbl, '上限 300 秒')]),
			box('b_ibo', I.inBackOff),
			box('b_next2', I.boNext)
		]),
	dep: (rss: string[]) =>
		band('dep', 'Deployment コントローラ', [
			box('b_sdep', I.syncDeploy),
			box('b_roll', I.rolling, [q('rsq', 'ReplicaSet と数', rss)]),
			box('b_newrs', I.newRS)
		])
};

// ---- 中身の板（OS の中）の行。id はステップをまたいで同じ ----
const POD = 'web-6d8f7b9c4-';
const row = (
	id: string,
	depth: 0 | 1 | 2,
	what: string,
	state: string,
	tone?: HostRow['tone']
): HostRow => ({ id, depth, what, state, ...(tone ? { tone } : {}) });
const node = (name: string, addr: string, town: string, rows: HostRow[]): Host => ({
	name,
	town,
	addr,
	rows
});
const cp = (rows: HostRow[]): Host => ({
	name: '制御面',
	town: '役場',
	addr: '10.0.1.10',
	rows
});

export { POD, sources, I, B, row, node, cp };
