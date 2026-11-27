// やってみる（Kubernetes）：web の 1 つが落ち続ける。get・describe・top で原因を読み、メモリの上限を直す。
// 出力の形は本物に合わせる（kubectl v1.31 の get pods・describe pod・top pod・set resources・rollout status。確認日 2026-11-28）。
// 数は場面の作り話。registry.example は文書用の名前（RFC 2606）
import type { TryLine, TryResult, TryScene, TryState } from '../../learn/try3.ts';

const o = (text: string, kind: TryLine['kind'] = 'out'): TryLine => ({ text, kind });

const CARDS = [
	'kubectl get pods',
	'kubectl describe pod web-7d9f6c5b8-c4wtn',
	'kubectl top pod',
	'kubectl set resources deployment web --requests=memory=384Mi --limits=memory=384Mi',
	'kubectl rollout status deployment web'
];

const OLD = ['web-7d9f6c5b8-2xk4p', 'web-7d9f6c5b8-8mz7q', 'web-7d9f6c5b8-c4wtn'];
const NEW = ['web-5c8b7f9d6-h2v9r', 'web-5c8b7f9d6-q7nzx', 'web-5c8b7f9d6-x4lmb'];
const pad = (x: string, n: number) => x.padEnd(n);

export const TRY_K8S: TryScene = {
	id: 'k8s',
	ps: 'ops@bastion:~$',
	who: '店のサイトの係',
	req: 'web の 1 つが落ちては起きるを繰り返している。原因を読んで、落ちないように直して。',
	cards: CARDS,
	refs: [
		['kubectl get', 'https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/'],
		[
			'kubectl describe',
			'https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/'
		],
		[
			'kubectl set resources',
			'https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/'
		],
		[
			'Resource Management',
			'https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/'
		]
	],
	tasks: [
		{ t: 'get pods で落ち続ける Pod を見つける', done: (s) => !!s.f.get },
		{ t: 'describe で 1 つ前の終わり方（Last State）を読む', done: (s) => !!s.f.desc },
		{ t: 'top で使っているメモリを見る', done: (s) => !!s.f.top },
		{ t: 'メモリの requests と limits を 384Mi にする', done: (s) => !!s.f.set },
		{ t: 'rollout status で入れ替えが終わったのを確かめる', done: (s) => !!s.f.done },
		{ t: 'もう一度 get pods で 3 つとも Running を確かめる', done: (s) => !!s.f.get2 }
	],
	init: () => ({
		lines: [o('# 名前空間 default の Deployment web（replicas: 3・メモリの上限 256Mi）', 'note')],
		f: {},
		v: { lim: '256Mi' }
	}),
	run(c: string, s: TryState): TryResult {
		const fixed = s.v.lim === '384Mi';
		if (c === 'kubectl get pods' || c === 'kubectl get po') {
			const head = o(
				`${pad('NAME', 22)}${pad('READY', 8)}${pad('STATUS', 19)}${pad('RESTARTS', 16)}AGE`
			);
			if (fixed)
				return {
					f: { get: true, get2: !!s.f.done },
					out: [
						head,
						...NEW.map((n) =>
							o(`${pad(n, 22)}${pad('1/1', 8)}${pad('Running', 19)}${pad('0', 16)}40s`)
						),
						o('# 3 つとも Running・再起動 0。上限を上げた新しい Pod に入れ替わった', 'note')
					]
				};
			return {
				f: { get: true },
				out: [
					head,
					o(`${pad(OLD[0], 22)}${pad('1/1', 8)}${pad('Running', 19)}${pad('0', 16)}42m`),
					o(`${pad(OLD[1], 22)}${pad('1/1', 8)}${pad('Running', 19)}${pad('0', 16)}42m`),
					o(
						`${pad(OLD[2], 22)}${pad('0/1', 8)}${pad('CrashLoopBackOff', 19)}${pad('5 (2m10s ago)', 16)}42m`,
						'err'
					),
					o('# 3 つ目が落ち続けている（図の web-c）。なぜ落ちたかは describe で読む', 'note')
				]
			};
		}
		if (c.startsWith('kubectl describe pod')) {
			const name = c.split(' ')[3] ?? '';
			if (!OLD.includes(name) && !NEW.includes(name))
				return {
					out: [
						o(`Error from server (NotFound): pods "${name}" not found`, 'err'),
						o('次の一手：kubectl get pods で、今ある Pod の名前を写す', 'note')
					]
				};
			return {
				f: { desc: true },
				out: [
					o(`Name:             ${name}`),
					o('Namespace:        default'),
					o('Node:             node-2/10.0.1.12'),
					o('Containers:'),
					o('  web:'),
					o('    State:          Waiting'),
					o('      Reason:       CrashLoopBackOff'),
					o('    Last State:     Terminated', 'hint'),
					o('      Reason:       OOMKilled', 'err'),
					o('      Exit Code:    137', 'err'),
					o('    Restart Count:  5'),
					o('    Limits:'),
					o(`      memory:  ${s.v.lim}`),
					o('    Requests:'),
					o(`      memory:  ${s.v.lim}`),
					o('Events:'),
					o('  Type     Reason     Age                 From               Message'),
					o(
						`  Normal   Scheduled  42m                 default-scheduler  Successfully assigned default/${name} to node-2`
					),
					o('  Normal   Started    3m (x6 over 42m)    kubelet            Started container web'),
					o(
						'  Warning  BackOff    10s (x20 over 40m)  kubelet            Back-off restarting failed container web',
						'err'
					),
					o(
						'# 原因は Last State：上限で殺された（137 = 128 + 9）。BackOff は待っている様子',
						'note'
					)
				]
			};
		}
		if (c === 'kubectl top pod' || c === 'kubectl top pods') {
			const names = fixed ? NEW : OLD;
			const mem = fixed ? ['231Mi', '236Mi', '298Mi'] : ['231Mi', '236Mi', '249Mi'];
			return {
				f: { top: true },
				out: [
					o(`${pad('NAME', 22)}${pad('CPU(cores)', 13)}MEMORY(bytes)`),
					...names.map((n, i) => o(`${pad(n, 22)}${pad(i === 2 ? '4m' : '12m', 13)}${mem[i]}`)),
					o(
						fixed
							? '# 3 つ目は 298Mi まで使っても、上限 384Mi に届かない'
							: '# 3 つ目は一覧の読み込みで山 300Mi まで使う。上限 256Mi に届いて殺される',
						'note'
					)
				]
			};
		}
		const set = /^kubectl set resources (deployment|deploy) web (.+)$/.exec(c);
		if (set) {
			const lim = /--limits=memory=(\d+Mi)/.exec(set[2])?.[1];
			const req = /--requests=memory=(\d+Mi)/.exec(set[2])?.[1];
			if (!lim)
				return {
					out: [
						o('error: you must specify an update to requests or limits', 'err'),
						o('次の一手：--limits=memory=384Mi を付ける（--requests も同じ値に）', 'note')
					]
				};
			const n = parseInt(lim, 10);
			if (n < 320)
				return {
					v: { lim },
					out: [
						o('deployment.apps/web resource requirements updated'),
						o(`# 山 300Mi に ${lim} では足りない。また殺される。320Mi 以上にする`, 'err')
					]
				};
			return {
				f: { set: true },
				v: { lim: '384Mi' },
				out: [
					o('deployment.apps/web resource requirements updated', 'hint'),
					o(
						req === lim
							? '# requests = limits なので QoS は Guaranteed。新しい Pod に順に入れ替わる'
							: '# requests を limits と同じにすると、置き場の数え方と上限が一致する',
						'note'
					)
				]
			};
		}
		if (
			c === 'kubectl rollout status deployment web' ||
			c === 'kubectl rollout status deploy/web'
		) {
			if (!s.f.set)
				return {
					out: [
						o('deployment "web" successfully rolled out'),
						o('# まだ何も変えていない。上限を直してから確かめる', 'note')
					]
				};
			return {
				f: { done: true },
				out: [
					o(
						'Waiting for deployment "web" rollout to finish: 1 of 3 updated replicas are available...'
					),
					o(
						'Waiting for deployment "web" rollout to finish: 2 of 3 updated replicas are available...'
					),
					o('deployment "web" successfully rolled out', 'hint')
				]
			};
		}
		if (c === 'help')
			return {
				out: [
					o(
						'使える命令：kubectl（get pods・describe pod・top pod・set resources・rollout status）・clear'
					),
					o('下の見本を押すと入る。Tab で続きを補う。↑↓ で前に打った命令', 'note')
				]
			};
		if (c.startsWith('kubectl '))
			return {
				out: [
					o(`error: unknown command "${c.split(' ')[1]}" for "kubectl"`, 'err'),
					o('次の一手：help で使える命令を見る。まずは kubectl get pods', 'note')
				]
			};
		return {
			out: [
				o(`bash: ${c.split(' ')[0]}: この場面では使えない`, 'err'),
				o('次の一手：help で使える命令を見る。まずは kubectl get pods', 'note')
			]
		};
	},
	metrics: (s) =>
		s.f.done
			? { want: '3', ready: '3', restarts: '0 回', wait: '—' }
			: { want: '3', ready: '2', restarts: '5 回', wait: '300 秒' }
};
