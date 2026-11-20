// Kubernetes の模擬（見本 2 の実戦。docs/tools.md 3.2）：kubectl の get・describe・logs・delete・set resources・rollout status・top。
// 世界（tools-real/worlds/k8s.json）の Deployment と、打った手と、模擬の時計から、Pod の様子を決まった式で計算する（乱数なし）。
//   - コンテナは起きて 2 秒で動き、使う記憶が上限（limits.memory）を超えると 3 秒で OOMKilled（exit 137）になる
//   - kubelet は落ちたコンテナを、1 回目は待たずに、その後 10s → 20s → 40s … 300s と待つ間を倍にして起こし直す（CrashLoopBackOff）
//   - 新しい Pod は、要求（requests.memory）が入る空きのある node に置く。どこにも入らなければ Pending
//   - kubectl を 1 回打つと、模擬の時計が 5 秒進む（打つ間に時間が経つ）
// 出力の形は Kubernetes v1.31 の kubectl（表は Go の tabwriter。get は余白 3・最小幅 6、describe は余白 2）と、
// 公式文書（kubernetes.io「Debug Running Pods」「Assign Memory Resources to Containers and Pods」）に合わせた（decisions.md 2026-11-19）。
import { fail, type Cmd, type CmdResult, type ShellState } from './run.ts';

export type K8sNode = {
	name: string;
	ip: string;
	allocMi: number;
	usedMi: number;
	podCidr: string;
};
export type K8sWorld = {
	ns: string;
	now: string;
	nodes: K8sNode[];
	deploy: {
		name: string;
		replicas: number;
		image: string;
		port: number;
		cpuReq: string;
		memReq: string;
		memLimit: string;
		peakMi: number;
		rsHash: string;
		created: string;
	};
	pods: { suffix: string; node: string; ip: string; created?: number }[];
};
/** ReplicaSet（Pod の型紙 1 つ） */
export type KRs = { hash: string; memReq: string; memLimit: string; created: number; rev: number };
/** Pod。時刻は全て Deployment を作った時からの秒 */
export type KPod = {
	name: string;
	rs: string;
	node: string | null;
	ip: string;
	created: number;
	gone?: number;
};
export type K8sState = {
	w: K8sWorld;
	now: number;
	rss: KRs[];
	cur: string;
	pods: KPod[];
	seq: number; // 作った Pod の数（名前と番地を決める）
	rollout?: { at: number; stuck: boolean };
};

const START = 2; // 起きるまで（イメージは node にある）
const RUN = 3; // OOMKilled になるまで動く秒
const STEP = 5; // kubectl 1 回で進む秒
// kuberuntime_manager.go doBackOff（v1.31）：1 回目に落ちた時は記録が無いので待たずに起こし直し（Next で 10 秒を記す）、
// 2 回目からは落ちた時刻から 10・20・40… 秒待つ。上限 300 秒（MaxContainerBackOff）
const BACKOFF = [0, 10, 20, 40, 80, 160, 300];
/** k 回起こし直した後に落ちた時、次に起こすまでの秒 */
export const backoffAt = (k: number) => BACKOFF[Math.min(k, BACKOFF.length - 1)];
// doBackOff を通るのは Pod の同期が走る時だけ。落ちた時の PLEG の出来事（ContainerDied）で 1 回、
// 待ちだけで止まった同期はエラーにならない（kubelet.go SyncPod）ので、その後は見直し（--sync-frequency 既定 1 分。
// pod_workers.go completeWork）ごとに 1 回。本物はゆらぎ（最大 1.5 倍）が付くが、模擬は決まった 60 秒で数える
const RESYNC = 60;
/** 長さ w 秒の待ちの間に、待ちの中で同期が走って BackOff を記す回数 */
const syncsIn = (w: number) => 1 + Math.floor(Math.max(0, w - 1) / RESYNC);

export function initialK8s(w: K8sWorld): K8sState {
	const base = Date.parse(w.deploy.created);
	const now = Math.round((Date.parse(w.now) - base) / 1000);
	const rs: KRs = {
		hash: w.deploy.rsHash,
		memReq: w.deploy.memReq,
		memLimit: w.deploy.memLimit,
		created: 0,
		rev: 1
	};
	const pods = w.pods.map((p) => ({
		name: `${w.deploy.name}-${rs.hash}-${p.suffix}`,
		rs: rs.hash,
		node: p.node,
		ip: p.ip,
		created: p.created ?? 0
	}));
	return { w, now, rss: [rs], cur: rs.hash, pods, seq: pods.length };
}

// ---- 数と時刻 ----
/** "128Mi" "1Gi" "200M" → Mi。読めなければ null */
export function mebi(q: string): number | null {
	const m = /^(\d+(?:\.\d+)?)(Mi|Gi|Ki|M|G|k)?$/.exec(q.trim());
	if (!m) return null;
	const n = Number(m[1]);
	const u = m[2] ?? '';
	const f: Record<string, number> = {
		'': 1 / 1048576,
		Ki: 1 / 1024,
		Mi: 1,
		Gi: 1024,
		k: 1000 / 1048576,
		M: 1e6 / 1048576,
		G: 1e9 / 1048576
	};
	return n * f[u];
}
/** k8s.io/apimachinery の duration.HumanDuration と同じ丸め */
export function human(sec: number): string {
	if (sec < 0) return '0s';
	if (sec < 120) return `${sec}s`;
	const m = Math.floor(sec / 60);
	if (m < 10) return sec % 60 === 0 ? `${m}m` : `${m}m${sec % 60}s`;
	if (m < 180) return `${m}m`;
	const h = Math.floor(m / 60);
	if (h < 8) return m % 60 === 0 ? `${h}h` : `${h}h${m % 60}m`;
	if (h < 48) return `${h}h`;
	return `${Math.floor(h / 24)}d`;
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const two = (n: number) => String(n).padStart(2, '0');
/** describe の時刻（RFC 1123Z。日本時間 +0900） */
function rfc1123(k: K8sState, sec: number): string {
	const d = new Date(Date.parse(k.w.deploy.created) + sec * 1000 + 9 * 3600 * 1000);
	return `${DAYS[d.getUTCDay()]}, ${two(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())} +0900`;
}
/** ログの時刻（UTC の ISO 8601） */
function iso(k: K8sState, sec: number, ms: number): string {
	return new Date(Date.parse(k.w.deploy.created) + sec * 1000 + ms).toISOString();
}

// ---- 名前（pod-template-hash と Pod の後ろの 5 字。kube の SafeEncodeString と同じ字の並び） ----
const SAFE = 'bcdfghjklmnpqrstvwxz2456789';
function fnv(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h;
}
function safe(n: number, len: number): string {
	let out = '';
	let x = n;
	for (let i = 0; i < len; i++) {
		out += SAFE[x % SAFE.length];
		x = (Math.floor(x / SAFE.length) ^ fnv(out)) >>> 0;
	}
	return out;
}

// ---- Go の text/tabwriter（セルは \t で終わる物だけが列になる。続く行の同じ列で幅をそろえる） ----
export function tabwrite(text: string, padding: number, minwidth = 0): string {
	const lines = text.split('\n').map((l) => {
		const cells = l.split('\t');
		return { cells: cells.slice(0, -1), rest: cells.at(-1) ?? '' };
	});
	const widths: number[][] = lines.map(() => []);
	const fmt = (from: number, to: number, col: number) => {
		let i = from;
		while (i < to) {
			if (lines[i].cells.length <= col) {
				i++;
				continue;
			}
			let j = i;
			let w = 0;
			while (j < to && lines[j].cells.length > col) {
				w = Math.max(w, lines[j].cells[col].length + padding);
				j++;
			}
			w = Math.max(w, minwidth);
			for (let x = i; x < j; x++) widths[x][col] = w;
			fmt(i, j, col + 1);
			i = j;
		}
	};
	fmt(0, lines.length, 0);
	return lines
		.map((l, i) => l.cells.map((c, col) => c.padEnd(widths[i][col])).join('') + l.rest)
		.join('\n');
}
const table = (rows: string[][]) =>
	tabwrite(
		rows.map((r) => r.map((c, i) => (i < r.length - 1 ? `${c}\t` : c)).join('')).join('\n'),
		3,
		6
	) + '\n';

// ---- Pod の様子（時刻からの純粋な計算） ----
export type PodView = {
	status: string; // STATUS の列
	ready: boolean;
	restarts: number;
	lastCrash: number | null; // 最後に落ちた時刻
	runStart: number | null; // 今の（または最後の）回が起きた時刻
	runs: number; // 起きた回数
	backoffTicks: number; // 待つ間に BackOff を記した回数
	state: 'running' | 'waiting' | 'terminated' | 'pending';
};
export function rsOf(k: K8sState, hash: string): KRs {
	return k.rss.find((r) => r.hash === hash) ?? k.rss[0];
}
const oomOf = (k: K8sState, rs: KRs) => (mebi(rs.memLimit) ?? Infinity) < k.w.deploy.peakMi;

export function podView(k: K8sState, p: KPod): PodView {
	const t = k.now - p.created;
	const base = {
		ready: false,
		restarts: 0,
		lastCrash: null,
		runStart: null,
		runs: 0,
		backoffTicks: 0
	};
	if (!p.node) return { ...base, status: 'Pending', state: 'pending' };
	if (t < START) return { ...base, status: 'ContainerCreating', state: 'waiting' };
	const rs = rsOf(k, p.rs);
	if (!oomOf(k, rs))
		return {
			...base,
			status: 'Running',
			ready: true,
			runStart: p.created + START,
			runs: 1,
			state: 'running'
		};
	// 落ちては起き直す。s：今の回が起きた時刻（作ってからの秒）
	let s = START;
	let k2 = 0;
	let ticks = 0;
	for (;;) {
		const crash = s + RUN;
		if (t < crash)
			return {
				status: 'Running',
				ready: true,
				restarts: k2,
				lastCrash: k2 > 0 ? p.created + s - backoffAt(k2 - 1) : null,
				runStart: p.created + s,
				runs: k2 + 1,
				backoffTicks: ticks,
				state: 'running'
			};
		const next = crash + backoffAt(k2);
		if (t < next) {
			const waited = t - crash;
			return {
				status: k2 === 0 ? 'OOMKilled' : 'CrashLoopBackOff',
				ready: false,
				restarts: k2,
				lastCrash: p.created + crash,
				runStart: p.created + s,
				runs: k2 + 1,
				backoffTicks: ticks + (k2 === 0 ? 0 : syncsIn(waited + 1)),
				state: k2 === 0 ? 'terminated' : 'waiting'
			};
		}
		if (k2 > 0) ticks += syncsIn(backoffAt(k2));
		k2++;
		s = next;
	}
}
const live = (k: K8sState) =>
	k.pods.filter((p) => p.created <= k.now && (p.gone ?? Infinity) > k.now);

// ---- 置き場所（スケジューラの「空きの多い node」） ----
// 消す途中の Pod の requests は、kubelet が止めて本当に消える（スケジューラの RemovePod）まで node の勘定に残る
const HOLD = 2;
function freeOf(k: K8sState, node: K8sNode, at: number): number {
	const used = k.pods
		.filter((p) => p.node === node.name && p.created <= at && (p.gone ?? Infinity) + HOLD > at)
		.reduce((a, p) => a + (mebi(rsOf(k, p.rs).memReq) ?? 0), 0);
	return node.allocMi - node.usedMi - used;
}
function newPod(k: K8sState, rs: KRs, at: number): { k: K8sState; pod: KPod } {
	const want = mebi(rs.memReq) ?? 0;
	let best: K8sNode | null = null;
	for (const n of k.w.nodes)
		if (freeOf(k, n, at) >= want && (!best || freeOf(k, n, at) > freeOf(k, best, at))) best = n;
	const seq = k.seq + 1;
	const pod: KPod = {
		name: `${k.w.deploy.name}-${rs.hash}-${safe(fnv(`${rs.hash}/${seq}`), 5)}`,
		rs: rs.hash,
		node: best?.name ?? null,
		ip: best ? `${best.podCidr}.${20 + seq}` : '',
		created: at
	};
	return { k: { ...k, seq, pods: [...k.pods, pod] }, pod };
}

// ---- 引数 ----
type Args = { pos: string[]; flags: Map<string, string> };
const VALUED = new Set([
	'n',
	'namespace',
	'o',
	'output',
	'c',
	'container',
	'l',
	'selector',
	'timeout'
]);
const ALIAS: Record<string, string> = {
	namespace: 'n',
	output: 'o',
	container: 'c',
	selector: 'l',
	p: 'previous'
};
function parseArgs(args: string[]): Args {
	const pos: string[] = [];
	const flags = new Map<string, string>();
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a.startsWith('--')) {
			const [name, v] = a.slice(2).split(/=(.*)/s);
			const key = ALIAS[name] ?? name;
			if (v !== undefined) flags.set(key, v);
			else if (VALUED.has(name)) flags.set(key, args[++i] ?? '');
			else flags.set(key, 'true');
		} else if (a.startsWith('-') && a.length > 1) {
			const name = a[1];
			const key = ALIAS[name] ?? name;
			if (VALUED.has(name))
				flags.set(key, a.length > 2 ? a.slice(2).replace(/^=/, '') : (args[++i] ?? ''));
			else flags.set(key, 'true');
		} else pos.push(a);
	}
	return { pos, flags };
}

const KINDS: Record<string, string> = {
	po: 'pods',
	pod: 'pods',
	pods: 'pods',
	deploy: 'deployments',
	deployment: 'deployments',
	deployments: 'deployments',
	rs: 'replicasets',
	replicaset: 'replicasets',
	replicasets: 'replicasets',
	ev: 'events',
	event: 'events',
	events: 'events',
	no: 'nodes',
	node: 'nodes',
	nodes: 'nodes'
};
/** "deployment/web" "deployment web" を [種類, 名前] に */
function target(pos: string[]): [string | undefined, string | undefined] {
	const [a, b] = pos;
	if (a?.includes('/')) {
		const [kind, name] = a.split('/');
		return [KINDS[kind] ?? kind, name];
	}
	return [a ? (KINDS[a] ?? a) : undefined, b];
}

// ---- kubectl ----
const MOCK_NOTE = (what: string) =>
	`（模擬の kubectl は get・describe pod・logs・delete pod・set resources・rollout status を扱う。${what} は扱わない）\n`;
const TOP = [
	'annotate',
	'api-resources',
	'api-versions',
	'apply',
	'attach',
	'auth',
	'autoscale',
	'certificate',
	'cluster-info',
	'completion',
	'config',
	'cordon',
	'cp',
	'create',
	'debug',
	'delete',
	'describe',
	'diff',
	'drain',
	'edit',
	'events',
	'exec',
	'explain',
	'expose',
	'get',
	'help',
	'kustomize',
	'label',
	'logs',
	'options',
	'patch',
	'plugin',
	'port-forward',
	'proxy',
	'replace',
	'rollout',
	'run',
	'scale',
	'set',
	'taint',
	'top',
	'uncordon',
	'version',
	'wait'
];
function lev(a: string, b: string): number {
	const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
	for (let j = 1; j <= b.length; j++) d[0][j] = j;
	for (let i = 1; i <= a.length; i++)
		for (let j = 1; j <= b.length; j++)
			d[i][j] = Math.min(
				d[i - 1][j] + 1,
				d[i][j - 1] + 1,
				d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
			);
	return d[a.length][b.length];
}

type R = CmdResult<unknown>;
const tick = (
	s: ShellState<unknown>,
	k: K8sState,
	r: { out?: string; err?: string; code?: number },
	extra = 0
): R => {
	const code = r.code ?? 0;
	return {
		state: { ...s, k8s: { ...k, now: k.now + STEP + extra }, lastCode: code },
		out: r.out ?? '',
		err: r.err ?? '',
		code
	};
};
const notFound = (kind: string, name: string) =>
	`Error from server (NotFound): ${kind} "${name}" not found\n`;

export const kubectl: Cmd<unknown> = (s, args) => {
	const k0 = s.k8s;
	if (!k0) return fail(s, 'kubectl: command not found\n', 127);
	const k = k0;
	const [verb, ...rest] = args;
	if (!verb) return fail(s, MOCK_NOTE('引数なし'), 1);
	const a = parseArgs(rest);
	const ns = a.flags.get('n') ?? 'default';
	const here = ns === k.w.ns;
	switch (verb) {
		case 'get':
			return tick(s, k, get(k, a, here, ns));
		case 'describe': {
			const [kind, name] = target(a.pos);
			if (kind !== 'pods') return fail(s, MOCK_NOTE(`describe ${a.pos[0] ?? ''}`), 1);
			if (!name) return tick(s, k, { err: MOCK_NOTE('名前の無い describe'), code: 1 });
			const p = here ? live(k).find((x) => x.name === name) : undefined;
			if (!p) return tick(s, k, { err: notFound('pods', name), code: 1 });
			return tick(s, k, { out: describePod(k, p) });
		}
		case 'logs': {
			const name = a.pos[0];
			if (!name)
				return tick(s, k, {
					err: "error: expected 'logs [-f] [-p] (POD | TYPE/NAME) [-c CONTAINER]'.\n",
					code: 1
				});
			const p = here ? live(k).find((x) => x.name === name) : undefined;
			if (!p) return tick(s, k, { err: notFound('pods', name), code: 1 });
			return tick(s, k, logsOf(k, p, a.flags.has('previous')));
		}
		case 'delete': {
			const [kind, name] = target(a.pos);
			if (kind !== 'pods') return fail(s, MOCK_NOTE(`delete ${a.pos[0] ?? ''}`), 1);
			const p = here && name ? live(k).find((x) => x.name === name) : undefined;
			if (!p || !name) return tick(s, k, { err: notFound('pods', name ?? ''), code: 1 });
			// 消すと、ReplicaSet が 1 秒で同じ型紙の Pod を作り直す（欲しい数 3 に戻す）
			let k2: K8sState = {
				...k,
				pods: k.pods.map((x) => (x === p ? { ...x, gone: k.now + 1 } : x))
			};
			k2 = newPod(k2, rsOf(k2, p.rs), k.now + 1).k;
			return tick(s, k2, { out: `pod "${name}" deleted\n` }, 1);
		}
		case 'set':
			return setResources(s, k, a);
		case 'rollout':
			return rolloutStatus(s, k, a);
		case 'top':
			return tick(s, k, { err: 'error: Metrics API not available\n', code: 1 });
		default: {
			if (TOP.includes(verb)) return fail(s, MOCK_NOTE(verb), 1);
			const near = TOP.filter((c) => lev(verb, c) <= 2 || c.startsWith(verb));
			const hint = near.length
				? `\n\nDid you mean this?\n${near.map((c) => `\t${c}\n`).join('')}`
				: '\n';
			return fail(s, `error: unknown command "${verb}" for "kubectl"${hint}`, 1);
		}
	}
};

function get(
	k: K8sState,
	a: Args,
	here: boolean,
	ns: string
): { out?: string; err?: string; code?: number } {
	const [kind, name] = target(a.pos);
	if (!kind) return { err: MOCK_NOTE('種類の無い get'), code: 1 };
	if (kind === 'nodes') {
		const rows = [['NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION']];
		for (const n of k.w.nodes) rows.push([n.name, 'Ready', '<none>', '41d', 'v1.31.2']);
		return { out: table(rows) };
	}
	const empty = { out: `No resources found in ${ns} namespace.\n` };
	if (kind === 'pods') {
		const pods = here ? live(k) : [];
		const pick = name ? pods.filter((p) => p.name === name) : pods;
		if (name && pick.length === 0) return { err: notFound('pods', name), code: 1 };
		if (pick.length === 0) return empty;
		const wide = a.flags.get('o') === 'wide';
		const head = ['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE'];
		const rows = [wide ? [...head, 'IP', 'NODE', 'NOMINATED NODE', 'READINESS GATES'] : head];
		for (const p of pick) {
			const v = podView(k, p);
			const r =
				v.restarts > 0 && v.lastCrash !== null
					? `${v.restarts} (${human(k.now - v.lastCrash)} ago)`
					: String(v.restarts);
			const row = [p.name, v.ready ? '1/1' : '0/1', v.status, r, human(k.now - p.created)];
			rows.push(wide ? [...row, p.ip || '<none>', p.node ?? '<none>', '<none>', '<none>'] : row);
		}
		return { out: table(rows) };
	}
	if (!here) return empty;
	if (kind === 'deployments') {
		const d = k.w.deploy;
		const pods = live(k);
		const upd = pods.filter((p) => p.rs === k.cur);
		const ready = pods.filter((p) => podView(k, p).ready).length;
		const avail = upd.filter((p) => podView(k, p).ready).length;
		const rows = [
			['NAME', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE'],
			[
				d.name,
				`${Math.min(ready, d.replicas)}/${d.replicas}`,
				String(upd.length),
				String(k.rollout ? avail : ready),
				human(k.now)
			]
		];
		return { out: table(rows) };
	}
	if (kind === 'replicasets') {
		const rows = [['NAME', 'DESIRED', 'CURRENT', 'READY', 'AGE']];
		for (const rs of k.rss) {
			const pods = live(k).filter((p) => p.rs === rs.hash);
			const want =
				rs.hash === k.cur ? Math.max(pods.length, k.rollout?.stuck ? 1 : 0) : pods.length;
			rows.push([
				`${k.w.deploy.name}-${rs.hash}`,
				String(want),
				String(pods.length),
				String(pods.filter((p) => podView(k, p).ready).length),
				human(k.now - rs.created)
			]);
		}
		return { out: table(rows) };
	}
	if (kind === 'events') {
		const ev = eventsOf(k);
		if (ev.length === 0) return empty;
		const rows = [['LAST SEEN', 'TYPE', 'REASON', 'OBJECT', 'MESSAGE']];
		for (const e of ev) rows.push([human(k.now - e.last), e.type, e.reason, e.obj, e.msg]);
		return { out: table(rows) };
	}
	return { err: `error: the server doesn't have a resource type "${a.pos[0]}"\n`, code: 1 };
}

// ---- 出来事（events） ----
type Ev = {
	first: number;
	last: number;
	count: number;
	type: string;
	reason: string;
	obj: string;
	from: string;
	msg: string;
};
function podEvents(k: K8sState, p: KPod): Ev[] {
	const v = podView(k, p);
	const e: Ev[] = [];
	const obj = `pod/${p.name}`;
	if (!p.node) {
		const n = k.w.nodes.length;
		e.push({
			first: p.created,
			last: p.created + Math.floor((k.now - p.created) / 60) * 60,
			count: 1 + Math.floor((k.now - p.created) / 60),
			type: 'Warning',
			reason: 'FailedScheduling',
			obj,
			from: 'default-scheduler',
			msg: `0/${n} nodes are available: ${n} Insufficient memory. preemption: 0/${n} nodes are available: ${n} No preemption victims found for incoming pod.`
		});
		return e;
	}
	const one = (at: number, reason: string, from: string, msg: string, type = 'Normal') =>
		e.push({ first: at, last: at, count: 1, type, reason, obj, from, msg });
	one(
		p.created,
		'Scheduled',
		'default-scheduler',
		`Successfully assigned ${k.w.ns}/${p.name} to ${p.node}`
	);
	if (v.runs > 0) {
		const first = p.created + START;
		const last = v.runStart ?? first;
		const d = k.w.deploy;
		for (const [reason, msg] of [
			['Pulled', `Container image "${d.image}" already present on machine`],
			['Created', 'Created container web'],
			['Started', 'Started container web']
		])
			e.push({ first, last, count: v.runs, type: 'Normal', reason, obj, from: 'kubelet', msg });
	}
	if (v.backoffTicks > 0 && v.lastCrash !== null) {
		const firstB = p.created + START + RUN + backoffAt(0) + RUN;
		e.push({
			first: firstB,
			last: Math.max(firstB, k.now - ((k.now - v.lastCrash) % RESYNC)),
			count: v.backoffTicks,
			type: 'Warning',
			reason: 'BackOff',
			obj,
			from: 'kubelet',
			msg: `Back-off restarting failed container web in pod ${p.name}_${k.w.ns}(${uid(p)})`
		});
	}
	return e;
}
const uid = (p: KPod) => {
	const h = (n: number) => fnv(`${p.name}/${n}`).toString(16).padStart(8, '0');
	return `${h(1)}-${h(2).slice(0, 4)}-4${h(3).slice(0, 3)}-a${h(4).slice(0, 3)}-${h(5)}${h(6).slice(0, 4)}`;
};
function eventsOf(k: K8sState): Ev[] {
	const d = k.w.deploy;
	const out: Ev[] = [];
	for (const rs of k.rss) {
		const pods = k.pods.filter((p) => p.rs === rs.hash && p.created <= k.now);
		const n = pods.length;
		if (n === 0) continue;
		out.push({
			first: rs.created,
			last: rs.created,
			count: 1,
			type: 'Normal',
			reason: 'ScalingReplicaSet',
			obj: `deployment/${d.name}`,
			from: 'deployment-controller',
			msg: `Scaled up replica set ${d.name}-${rs.hash} to ${rs.hash === k.cur && k.rollout?.stuck ? 1 : d.replicas}`
		});
		for (const p of pods)
			out.push({
				first: p.created,
				last: p.created,
				count: 1,
				type: 'Normal',
				reason: 'SuccessfulCreate',
				obj: `replicaset/${d.name}-${rs.hash}`,
				from: 'replicaset-controller',
				msg: `Created pod: ${p.name}`
			});
		for (const p of pods.filter(
			(x) => x.gone !== undefined && x.gone <= k.now && x.rs !== k.cur && k.rollout
		))
			out.push({
				first: p.gone!,
				last: p.gone!,
				count: 1,
				type: 'Normal',
				reason: 'SuccessfulDelete',
				obj: `replicaset/${d.name}-${rs.hash}`,
				from: 'replicaset-controller',
				msg: `Deleted pod: ${p.name}`
			});
	}
	for (const p of k.pods.filter((x) => x.created <= k.now)) out.push(...podEvents(k, p));
	return out.sort((x, y) => x.first - y.first);
}

// ---- describe pod ----
function describePod(k: K8sState, p: KPod): string {
	const d = k.w.deploy;
	const rs = rsOf(k, p.rs);
	const v = podView(k, p);
	const cid = (n: number) =>
		`containerd://${fnv(`${p.name}#${n}`).toString(16).padStart(8, '0')}${fnv(`${p.name}@${n}`).toString(16).padStart(8, '0')}`;
	const vol = `kube-api-access-${safe(fnv(p.name), 5)}`;
	const L: string[] = [];
	L.push(`Name:\t${p.name}`, `Namespace:\t${k.w.ns}`, 'Priority:\t0', 'Service Account:\tdefault');
	L.push(
		`Node:\t${p.node ? `${p.node}/${k.w.nodes.find((n) => n.name === p.node)?.ip}` : '<none>'}`
	);
	if (p.node) L.push(`Start Time:\t${rfc1123(k, p.created)}`);
	L.push(`Labels:\tapp=${d.name}`, `\tpod-template-hash=${rs.hash}`, 'Annotations:\t<none>');
	L.push(`Status:\t${p.node ? 'Running' : 'Pending'}`);
	if (p.node) L.push(`IP:\t${p.ip}`, 'IPs:', `  IP:\t${p.ip}`);
	else L.push('IP:\t', 'IPs:\t<none>');
	L.push(`Controlled By:\tReplicaSet/${d.name}-${rs.hash}`);
	L.push('Containers:', `  ${d.name}:`);
	if (p.node && v.runs > 0) L.push(`    Container ID:\t${cid(v.runs)}`);
	L.push(`    Image:\t${d.image}`);
	if (p.node && v.runs > 0)
		L.push(
			`    Image ID:\t${d.image.replace(/:[^:]+$/, '')}@sha256:4f1c9a7e2b8d06c35e91a0d7f2c64b18e9a3d5c07b6f2e1a8c4d9b3e7f05a162`
		);
	L.push(`    Port:\t${d.port}/TCP`, '    Host Port:\t0/TCP');
	const at = (sec: number) => rfc1123(k, sec);
	if (p.node && v.runs > 0) {
		if (v.state === 'running') L.push('    State:\tRunning', `      Started:\t${at(v.runStart!)}`);
		else if (v.state === 'terminated')
			L.push(
				'    State:\tTerminated',
				'      Reason:\tOOMKilled',
				'      Exit Code:\t137',
				`      Started:\t${at(v.runStart!)}`,
				`      Finished:\t${at(v.lastCrash!)}`
			);
		else L.push('    State:\tWaiting', '      Reason:\tCrashLoopBackOff');
		// Last State は、前に落ちた回があるときだけ出る
		if (v.restarts > 0 && v.lastCrash !== null) {
			const st = v.state === 'waiting' ? v.runStart! : v.lastCrash - RUN;
			L.push(
				'    Last State:\tTerminated',
				'      Reason:\tOOMKilled',
				'      Exit Code:\t137',
				`      Started:\t${at(st)}`,
				`      Finished:\t${at(v.lastCrash)}`
			);
		}
		L.push(`    Ready:\t${v.ready ? 'True' : 'False'}`);
		L.push(`    Restart Count:\t${v.restarts}`);
	}
	L.push(
		'    Limits:',
		`      memory:\t${rs.memLimit}`,
		'    Requests:',
		`      cpu:\t${d.cpuReq}`,
		`      memory:\t${rs.memReq}`
	);
	L.push(
		'    Environment:\t<none>',
		'    Mounts:',
		`      /var/run/secrets/kubernetes.io/serviceaccount from ${vol} (ro)`
	);
	L.push('Conditions:', '  Type\tStatus');
	if (p.node) {
		const r = v.ready ? 'True' : 'False';
		L.push(
			'  PodReadyToStartContainers \tTrue ',
			'  Initialized \tTrue ',
			`  Ready \t${r} `,
			`  ContainersReady \t${r} `,
			'  PodScheduled \tTrue '
		);
	} else L.push('  PodScheduled \tFalse ');
	L.push('Volumes:', `  ${vol}:`);
	L.push(
		'    Type:\tProjected (a volume that contains injected data from multiple sources)',
		'    TokenExpirationSeconds:\t3607',
		'    ConfigMapName:\tkube-root-ca.crt',
		'    ConfigMapOptional:\t<nil>',
		'    DownwardAPI:\ttrue'
	);
	L.push('QoS Class:\tBurstable', 'Node-Selectors:\t<none>');
	L.push(
		'Tolerations:\tnode.kubernetes.io/not-ready:NoExecute op=Exists for 300s',
		'\tnode.kubernetes.io/unreachable:NoExecute op=Exists for 300s'
	);
	const ev = podEvents(k, p);
	L.push('Events:', '  Type\tReason\tAge\tFrom\tMessage', '  ----\t------\t----\t----\t-------');
	for (const e of ev) {
		const age =
			e.count > 1
				? `${human(k.now - e.last)} (x${e.count} over ${human(k.now - e.first)})`
				: human(k.now - e.first);
		L.push(`  ${e.type}\t${e.reason}\t${age}\t${e.from}\t${e.msg}`);
	}
	return tabwrite(L.filter((x) => x !== '').join('\n'), 2) + '\n';
}

// ---- logs ----
function logsOf(
	k: K8sState,
	p: KPod,
	previous: boolean
): { out?: string; err?: string; code?: number } {
	const v = podView(k, p);
	const d = k.w.deploy;
	if (!p.node || v.runs === 0)
		return {
			err: `Error from server (BadRequest): container "${d.name}" in pod "${p.name}" is waiting to start: ${p.node ? 'ContainerCreating' : 'PodInitializing'}\n`,
			code: 1
		};
	const oom = oomOf(k, rsOf(k, p.rs));
	let start: number;
	if (previous) {
		if (v.restarts === 0 && v.state !== 'terminated')
			return {
				err: `Error from server (BadRequest): previous terminated container "${d.name}" in pod "${p.name}" not found\n`,
				code: 1
			};
		start = v.state === 'running' ? v.lastCrash! - RUN : v.runStart!;
	} else start = v.runStart!;
	const lines = [
		[412, `INFO  shop-web ${d.image.split(':').at(-1)} starting (node v22.11.0, pid 1)`],
		[618, `INFO  listening on :${d.port}`],
		[1003, 'INFO  loading catalog cache (48,210 items)'],
		[1871, `INFO  catalog cache 96 MiB of ${d.peakMi} MiB loaded`]
	] as [number, string][];
	if (!oom || (!previous && v.state === 'running' && k.now - start >= RUN))
		lines.push([2655, `INFO  catalog cache ${d.peakMi} MiB loaded`], [2701, 'INFO  ready']);
	const until = oom ? RUN * 1000 : Infinity;
	const seen = k.now - start;
	return {
		out: lines
			.filter(([ms]) => ms < until && ms <= seen * 1000)
			.map(([ms, t]) => `${iso(k, start, ms)} ${t}\n`)
			.join('')
	};
}

// ---- set resources ----
function setResources(s: ShellState<unknown>, k: K8sState, a: Args): R {
	const [sub, ...pos] = a.pos;
	if (sub !== 'resources') return fail(s, MOCK_NOTE(`set ${sub ?? ''}`), 1);
	const [kind, name] = target(pos);
	if (kind !== 'deployments') return fail(s, MOCK_NOTE(`set resources ${pos[0] ?? ''}`), 1);
	const here = (a.flags.get('n') ?? 'default') === k.w.ns;
	if (!here || name !== k.w.deploy.name)
		return tick(s, k, { err: notFound('deployments.apps', name ?? ''), code: 1 });
	const c = a.flags.get('c') ?? a.flags.get('containers');
	if (c && c !== k.w.deploy.name)
		return tick(s, k, { err: `error: unable to find container named ${c}\n`, code: 1 });
	const pick = (v: string | undefined) => {
		const m = /(?:^|,)memory=([^,]+)/.exec(v ?? '');
		return m?.[1];
	};
	const lim = pick(a.flags.get('limits'));
	const req = pick(a.flags.get('requests'));
	if (!a.flags.has('limits') && !a.flags.has('requests'))
		return tick(s, k, {
			err: 'error: you must specify an update to requests or limits (in the form of --requests/--limits)\n',
			code: 1
		});
	for (const q of [lim, req])
		if (q !== undefined && mebi(q) === null)
			return tick(s, k, {
				err: `error: quantities must match the regular expression '^([+-]?[0-9.]+)([eEinumkKMGTP]*[-+]?[0-9]*)$'\n`,
				code: 1
			});
	const cur = rsOf(k, k.cur);
	const memLimit = lim ?? cur.memLimit;
	const memReq = req ?? cur.memReq;
	if ((mebi(memReq) ?? 0) > (mebi(memLimit) ?? Infinity))
		return tick(s, k, {
			err: `The Deployment "${k.w.deploy.name}" is invalid: spec.template.spec.containers[0].resources.requests: Invalid value: "${memReq}": must be less than or equal to memory limit of ${memLimit}\n`,
			code: 1
		});
	if (memLimit === cur.memLimit && memReq === cur.memReq)
		return tick(s, k, {
			out: `deployment.apps/${k.w.deploy.name} resource requirements updated\n`
		});
	return tick(s, rollTo(k, memReq, memLimit), {
		out: `deployment.apps/${k.w.deploy.name} resource requirements updated\n`
	});
}

/**
 * 型紙を替えて入れ替える（RollingUpdate、maxSurge 25%＝1・maxUnavailable 25%＝0）。
 * 新しい Pod を 1 つ作り、それが Ready になってから古い Pod を 1 つ消す。を 3 回。
 * 新しい Pod が Ready にならない（落ちる・Pending）なら、1 つ目で止まり、古い Pod は残る
 */
function rollTo(k: K8sState, memReq: string, memLimit: string): K8sState {
	const d = k.w.deploy;
	const same = k.rss.find((r) => r.memReq === memReq && r.memLimit === memLimit);
	const rev = Math.max(...k.rss.map((r) => r.rev)) + 1;
	const rs: KRs = same
		? { ...same, rev }
		: {
				hash: safe(fnv(`${d.name}|${memReq}|${memLimit}`), 9 + (fnv(memLimit) % 2)),
				memReq,
				memLimit,
				created: k.now,
				rev
			};
	let k2: K8sState = { ...k, rss: [...k.rss.filter((r) => r.hash !== rs.hash), rs], cur: rs.hash };
	const old = live(k2).filter((p) => p.rs !== rs.hash);
	let t = k.now;
	const first = newPod(k2, rs, t);
	k2 = first.k;
	const ok1 = first.pod.node !== null && !oomOf(k2, rs);
	if (!ok1) return { ...k2, rollout: { at: k.now, stuck: true } };
	for (let i = 0; i < old.length; i++) {
		t += START + 1;
		k2 = {
			...k2,
			pods: k2.pods.map((p) => (p === old[i] || p.name === old[i].name ? { ...p, gone: t } : p))
		};
		if (i < Math.max(0, d.replicas - 1)) k2 = newPod(k2, rs, t).k;
	}
	return { ...k2, rollout: { at: k.now, stuck: false } };
}

// ---- rollout status ----
function rolloutStatus(s: ShellState<unknown>, k: K8sState, a: Args): R {
	const [sub, ...pos] = a.pos;
	if (sub !== 'status') return fail(s, MOCK_NOTE(`rollout ${sub ?? ''}`), 1);
	const [kind, name] = target(pos);
	const d = k.w.deploy;
	if (kind !== 'deployments') return fail(s, MOCK_NOTE(`rollout status ${pos[0] ?? ''}`), 1);
	const here = (a.flags.get('n') ?? 'default') === k.w.ns;
	if (!here || name !== d.name)
		return tick(s, k, { err: notFound('deployments.apps', name ?? ''), code: 1 });
	const msg = (n: number) =>
		`Waiting for deployment "${d.name}" rollout to finish: ${n} of ${d.replicas} updated replicas are available...\n`;
	const ready = () => live(k).filter((p) => p.rs === k.cur && podView(k, p).ready).length;
	if (!k.rollout?.stuck) {
		const end = Math.max(k.now, (k.rollout?.at ?? 0) + (START + 1) * d.replicas);
		let out = '';
		for (let n = ready(); n < d.replicas; n++) out += msg(n);
		out += `deployment "${d.name}" successfully rolled out\n`;
		return tick(s, k, { out }, end - k.now);
	}
	// 止まった入れ替え：待つ。--timeout が切れるか、進みの期限（progressDeadlineSeconds 600）を超えると失敗
	const upd = live(k).filter((p) => p.rs === k.cur).length;
	const wait = `Waiting for deployment "${d.name}" rollout to finish: ${upd} out of ${d.replicas} new replicas have been updated...\n`;
	const to = a.flags.get('timeout');
	if (to) {
		const sec =
			Number(/^(\d+)s$/.exec(to)?.[1] ?? /^(\d+)m$/.exec(to)?.[1] ?? 0) *
			(to.endsWith('m') ? 60 : 1);
		return tick(
			s,
			k,
			{ out: wait, err: 'error: timed out waiting for the condition\n', code: 1 },
			sec
		);
	}
	const end = k.rollout.at + 600;
	return tick(
		s,
		k,
		{ out: wait, err: `error: deployment "${d.name}" exceeded its progress deadline\n`, code: 1 },
		Math.max(0, end - k.now)
	);
}

export const k8sCommands: Record<string, Cmd<unknown>> = { kubectl };
