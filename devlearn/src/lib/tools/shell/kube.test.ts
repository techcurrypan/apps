// Kubernetes の模擬（見本 2 の実戦。docs/tools.md 3.2）：kubectl の get・describe・logs・delete・set resources・rollout status。
// 出力の形は Kubernetes v1.31 の kubectl と公式文書（kubernetes.io の「Debug Pods」「Assign Memory Resources」）に合わせた。
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { start, typeLine } from '../session.ts';
import { shellCommands } from './commands.ts';
import { shellTool } from './run.ts';
import { learnerWorld } from './world.ts';
import { worldFs, worldK8s, type WorldSpec } from './worlds.ts';
import { backoffAt, containerId, kubeletOccurrences, throughSpamFilter } from './kube.ts';

const runIn = (lines: string[]) => {
	const w = JSON.parse(readFileSync('tools-real/worlds/k8s.json', 'utf8')) as WorldSpec;
	const tool = shellTool<null>(shellCommands<null>());
	const init = { ...learnerWorld<null>(null, worldFs(w)), k8s: worldK8s(w) };
	return lines.reduce(typeLine, start(tool, init));
};
const outs = (lines: string[]) => runIn(lines).entries;
const last = (lines: string[]) => outs(lines).at(-1)!;

describe('kubectl の模擬', () => {
	it('get pods：3 つとも OOMKilled を繰り返して CrashLoopBackOff', () => {
		const a = last(['kubectl get pods -n shop']);
		expect(a.code).toBe(0);
		const rows = a.out.trimEnd().split('\n');
		expect(rows[0]).toMatch(/^NAME {3,}READY {3}STATUS {3,}RESTARTS {3,}AGE$/);
		expect(rows).toHaveLength(4);
		expect(rows[1]).toMatch(
			/^web-6d8f7b9c4-7xk2p {3}0\/1 {5}CrashLoopBackOff {3}6 \(39s ago\) {3,}6m12s$/
		);
	});
	it('名前空間を付け忘れると default を見る', () => {
		expect(last(['kubectl get pods']).out).toBe('No resources found in default namespace.\n');
		expect(last(['kubectl get pods --namespace=shop']).out).toContain('web-6d8f7b9c4-b9m4t');
	});
	it('describe pod：Last State が OOMKilled・Exit Code 137、BackOff の出来事', () => {
		const a = last(['kubectl describe pod web-6d8f7b9c4-7xk2p -n shop']);
		expect(a.code).toBe(0);
		expect(a.out).toContain('Name:             web-6d8f7b9c4-7xk2p\n');
		expect(a.out).toContain('Controlled By:  ReplicaSet/web-6d8f7b9c4\n');
		expect(a.out).toMatch(/ {4}State: {10}Waiting\n {6}Reason: {7}CrashLoopBackOff\n/);
		expect(a.out).toMatch(
			/ {4}Last State: {5}Terminated\n {6}Reason: {7}OOMKilled\n {6}Exit Code: {4}137\n/
		);
		expect(a.out).toContain('    Restart Count:  6\n');
		expect(a.out).toMatch(/ {4}Limits:\n {6}memory: {2}128Mi\n/);
		expect(a.out).toMatch(
			/Warning {2}BackOff .*Back-off restarting failed container web in pod web-6d8f7b9c4-7xk2p_shop/
		);
	});
	it('logs --previous：落ちる前の行は普通に見える（SIGKILL なのでエラーの行が無い）', () => {
		const a = last(['kubectl logs web-6d8f7b9c4-7xk2p -n shop --previous']);
		expect(a.code).toBe(0);
		expect(a.out).toContain('loading catalog cache');
		expect(a.out).not.toMatch(/error/i);
	});
	it('無い Pod は NotFound', () => {
		const a = last(['kubectl describe pod web-x -n shop']);
		expect(a.code).toBe(1);
		expect(a.err).toBe('Error from server (NotFound): pods "web-x" not found\n');
	});
	it('delete pod：ReplicaSet が新しい Pod を作るが、また落ちる', () => {
		const r = outs(['kubectl delete pod web-6d8f7b9c4-7xk2p -n shop', 'kubectl get pods -n shop']);
		expect(r[0].out).toBe('pod "web-6d8f7b9c4-7xk2p" deleted\n');
		expect(r[1].out).not.toContain('7xk2p');
		const rows = r[1].out.trimEnd().split('\n');
		expect(rows).toHaveLength(4);
		expect(r[1].out).toMatch(/web-6d8f7b9c4-\w{5} {3}0\/1 {5}(CrashLoopBackOff|OOMKilled)/);
	});
	it('set resources で上限を上げると、新しい ReplicaSet の 3 つが Running になる', () => {
		const r = outs([
			'sudo -n true',
			'kubectl set resources deployment web -n shop --limits=memory=256Mi',
			'kubectl rollout status deployment/web -n shop',
			'kubectl get pods -n shop',
			'kubectl get deploy -n shop'
		]);
		expect(r[1].out).toBe('deployment.apps/web resource requirements updated\n');
		expect(r[2].out.trimEnd().split('\n').at(-1)).toBe('deployment "web" successfully rolled out');
		const rows = r[3].out.trimEnd().split('\n').slice(1);
		expect(rows).toHaveLength(3);
		for (const x of rows) expect(x).toMatch(/^web-\w+-\w{5} {3}1\/1 {5}Running {3}0 {10}\d+s$/);
		expect(r[3].out).not.toContain('6d8f7b9c4');
		expect(r[4].out).toMatch(/^web {4}3\/3 {5}3 {12}3 {11}6m\d+s\n$/m);
	});
	it('要求を大きくしすぎると、新しい Pod は Pending（Insufficient memory）', () => {
		const r = outs([
			'kubectl set resources deployment web -n shop --limits=memory=1Gi --requests=memory=1Gi',
			'kubectl get pods -n shop'
		]);
		expect(r[1].out).toMatch(/ {3}0\/1 {5}Pending {3,}0 /);
		const name = r[1].out.match(/^(web-\w+-\w{5}) +0\/1 +Pending/m)![1];
		const d = last([
			'kubectl set resources deployment web -n shop --limits=memory=1Gi --requests=memory=1Gi',
			`kubectl describe pod ${name} -n shop`
		]);
		expect(d.out).toContain(
			'0/2 nodes are available: 2 Insufficient memory. preemption: 0/2 nodes are available: 2 No preemption victims found for incoming pod.'
		);
	});
	it('上限が少しだけ上がっても、まだ足りなければ新しい Pod も落ちる', () => {
		const r = outs([
			'kubectl set resources deployment web -n shop --limits=memory=160Mi',
			'kubectl rollout status deployment/web -n shop --timeout=60s'
		]);
		expect(r[1].code).toBe(1);
		expect(r[1].err).toBe('error: timed out waiting for the condition\n');
	});
	it('get events：kubectl は並べ替えず、API の返す名前（<物の名前>.<時刻の 16 進>）の順。--sort-by と kubectl events は時刻の順', () => {
		const objs = (out: string) =>
			out
				.trimEnd()
				.split('\n')
				.slice(1)
				.map((l) => l.split(/ {2,}/)[3]);
		const g = objs(last(['kubectl get events -n shop']).out);
		expect(g[0]).toBe('pod/web-6d8f7b9c4-7xk2p');
		expect(g.at(-1)).toBe('deployment/web');
		// Pod の行が全て済んでから ReplicaSet、最後に Deployment（'-' は '.' より前）
		expect(g.indexOf('replicaset/web-6d8f7b9c4')).toBeGreaterThan(
			g.lastIndexOf('pod/web-6d8f7b9c4-q2wfz')
		);
		const ages = (out: string) =>
			out
				.trimEnd()
				.split('\n')
				.slice(1)
				.map((l) => l.split(/ {2,}/)[0]);
		const toSec = (x: string) =>
			[...x.matchAll(/(\d+)([hms])/g)].reduce(
				(t, m) => t + Number(m[1]) * ({ h: 3600, m: 60, s: 1 } as Record<string, number>)[m[2]],
				0
			);
		for (const line of [
			'kubectl get events -n shop --sort-by=.lastTimestamp',
			'kubectl events -n shop'
		]) {
			const r = last([line]);
			expect(r.code, line).toBe(0);
			const t = ages(r.out).map(toSec);
			expect(t, line).toEqual([...t].sort((x, y) => y - x));
		}
	});
	it('get events：OOMKilled ではなく BackOff が出る', () => {
		const a = last(['kubectl get events -n shop']);
		expect(a.out.split('\n')[0]).toMatch(/^LAST SEEN {3}TYPE {6}REASON {6,}OBJECT {3,}MESSAGE$/);
		expect(a.out).toContain('Warning   BackOff');
		expect(a.out).toContain('Normal    Scheduled');
	});
	it('top は metrics-server が無いので使えない', () => {
		const a = last(['kubectl top pod -n shop']);
		expect(a.code).toBe(1);
		expect(a.err).toBe('error: Metrics API not available\n');
	});
	it('知らない命令', () => {
		const a = last(['kubectl gett pods']);
		expect(a.code).toBe(1);
		expect(a.err.startsWith('error: unknown command "gett" for "kubectl"')).toBe(true);
		expect(a.err).toContain('Did you mean this?' + String.fromCharCode(10, 9) + 'get');
	});
	it('再起動の待ち：1 回目に落ちた後は待たずに起こし直し、その後 10・20・40・80・160 秒、上限 300 秒（kuberuntime_manager.go doBackOff。査読 2026-11-19）', () => {
		expect([0, 1, 2, 3, 4, 5, 6, 7].map(backoffAt)).toEqual([0, 10, 20, 40, 80, 160, 300, 300]);
	});
	it('get pods：CrashLoopBackOff の行は、落ちてからの時間が待ちより短い（N 回の後の待ちは backoffAt(N)）', () => {
		const rows = last(['kubectl get pods -n shop']).out.trimEnd().split('\n').slice(1);
		for (const r of rows) {
			const m = /CrashLoopBackOff\s+(\d+) \((?:(\d+)m)?(\d+)s ago\)/.exec(r);
			expect(m).not.toBeNull();
			const ago = Number(m![2] ?? 0) * 60 + Number(m![3]);
			expect(ago).toBeLessThan(backoffAt(Number(m![1])));
		}
	});
	it('logs：CrashLoopBackOff で待っている間は、--previous が無くても前の回のログが出る（kubelet_pods.go validateContainerLogStatus。査読 2026-11-19）', () => {
		const a = last(['kubectl logs web-6d8f7b9c4-7xk2p -n shop']);
		expect(a.code).toBe(0);
		expect(a.out).toContain('loading catalog cache');
	});
});

describe('出来事の間引き（client-go events_cache.go。査読 2026-11-21）', () => {
	it('札は 25 個、300 秒に 1 つ戻る。手元の数は先に増え、API には最後に通った時の数と時刻が残る', () => {
		const occ = Array.from({ length: 40 }, (_, i) => ({ at: i * 10, reason: 'BackOff' }));
		const [b] = throughSpamFilter(occ);
		// 0〜240 秒の 25 件が通り、250 秒目は札 0.83 で落ち、300 秒目で札が 1 つ戻って通る（数 31）
		expect(b).toEqual({ reason: 'BackOff', first: 0, last: 300, count: 31 });
	});
	it('鍵は理由を含まない：Pulled・Created・Started・BackOff が同じ 25 個の札を分け合う', () => {
		const occ = [
			...Array.from({ length: 24 }, (_, i) => ({ at: i, reason: 'BackOff' })),
			{ at: 30, reason: 'Pulled' },
			{ at: 30, reason: 'Created' }
		];
		const r = throughSpamFilter(occ);
		expect(r.map((x) => x.reason)).toEqual(['BackOff', 'Pulled']);
	});
	it('describe の 7xk2p：手元では Pulled 7・BackOff 35 だが、API には x5・x30 で止まる', () => {
		const a = last(['kubectl describe pod web-6d8f7b9c4-7xk2p -n shop']);
		expect(a.out).toMatch(/Normal {3}Pulled {5}4m48s \(x5 over 6m10s\) +kubelet/);
		expect(a.out).toMatch(/Warning {2}BackOff {4}62s \(x30 over 6m4s\) +kubelet/);
		const k = runIn([]).initial.k8s!;
		const p = k.pods.find((x) => x.name.endsWith('7xk2p'))!;
		const occ = kubeletOccurrences(k, p);
		expect(occ.filter((o) => o.reason === 'Pulled')).toHaveLength(7);
		expect(occ.filter((o) => o.reason === 'BackOff')).toHaveLength(35);
	});
});

describe('入れ替えの順（Deployment コントローラ rolling.go・sync.go。査読 2026-11-21）', () => {
	const scaling = (out: string) =>
		out
			.split('\n')
			.filter((l) => l.includes('ScalingReplicaSet'))
			.map((l) => l.replace(/^.*deployment\/web +/, '').trim());
	it('正しい道：新しい方を 1 つ増やし、Ready になるたびに古い方を 1 つ減らす。1 手ごとに出来事', () => {
		const r = outs([
			'kubectl set resources deployment web -n shop --limits=memory=256Mi --requests=memory=192Mi',
			'kubectl rollout status deployment/web -n shop',
			'kubectl get events -n shop'
		]);
		const ev = scaling(r.at(-1)!.out);
		const nw = /Scaled up replica set (web-\w+) to 1$/.exec(ev[1])?.[1];
		expect(ev[0]).toBe('Scaled up replica set web-6d8f7b9c4 to 3');
		expect(nw).toBeDefined();
		expect(ev.slice(1)).toEqual([
			`Scaled up replica set ${nw} to 1`,
			'Scaled down replica set web-6d8f7b9c4 to 2 from 3',
			`Scaled up replica set ${nw} to 2 from 1`,
			'Scaled down replica set web-6d8f7b9c4 to 1 from 2',
			`Scaled up replica set ${nw} to 3 from 2`,
			'Scaled down replica set web-6d8f7b9c4 to 0 from 1'
		]);
	});
	it('1Gi で止まった後に直す：Pending の Pod が surge の枠を使うので、先に古い方を減らし、Pending の Pod は最後に消える。総数は 4 を超えない', () => {
		const lines = [
			'kubectl set resources deployment web -n shop --limits=memory=1Gi --requests=memory=1Gi',
			'kubectl get pods -n shop',
			'kubectl set resources deployment web -n shop --limits=memory=256Mi --requests=memory=192Mi',
			'kubectl rollout status deployment/web -n shop',
			'kubectl get events -n shop'
		];
		const r = runIn(lines);
		const ev = scaling(r.entries.at(-1)!.out);
		const big = /Scaled up replica set (web-\w+) to 1$/.exec(ev[1])?.[1];
		const nw = /Scaled up replica set (web-\w+) to 1 from 0$/.exec(ev[3])?.[1];
		expect(ev.slice(1)).toEqual([
			`Scaled up replica set ${big} to 1`,
			'Scaled down replica set web-6d8f7b9c4 to 2 from 3',
			`Scaled up replica set ${nw} to 1 from 0`,
			'Scaled down replica set web-6d8f7b9c4 to 1 from 2',
			`Scaled up replica set ${nw} to 2 from 1`,
			'Scaled down replica set web-6d8f7b9c4 to 0 from 1',
			`Scaled up replica set ${nw} to 3 from 2`,
			`Scaled down replica set ${big} to 0 from 1`
		]);
		// どの時刻でも Pod の数（消す途中を除く）は 欲しい数 3 ＋ maxSurge 1 を超えない
		const k = r.entries.at(-1)!.state.k8s!;
		const times = [...new Set(k.pods.flatMap((p) => [p.created, p.gone ?? 0]))];
		for (const t of times)
			expect(
				k.pods.filter((p) => p.created <= t && (p.gone ?? Infinity) > t).length,
				`t=${t}`
			).toBeLessThanOrEqual(4);
	});
	it('Ready の古い Pod も、新しい Pod が Ready になるたびに 1 つずつ減る（scaleDownOldReplicaSetsForRollingUpdate）', () => {
		const r = outs([
			'kubectl set resources deployment web -n shop --limits=memory=256Mi --requests=memory=192Mi',
			'kubectl rollout status deployment/web -n shop',
			'kubectl set resources deployment web -n shop --limits=memory=320Mi --requests=memory=256Mi',
			'kubectl rollout status deployment/web -n shop',
			'kubectl get events -n shop'
		]);
		expect(r[3].out).toContain('successfully rolled out');
		const ev = scaling(r.at(-1)!.out);
		const mid = /Scaled up replica set (web-\w+) to 1$/.exec(ev[1])?.[1];
		const nw = /Scaled up replica set (web-\w+) to 1$/.exec(ev[7])?.[1];
		expect(nw).toBeDefined();
		expect(ev.slice(8)).toEqual([
			`Scaled down replica set ${mid} to 2 from 3`,
			`Scaled up replica set ${nw} to 2 from 1`,
			`Scaled down replica set ${mid} to 1 from 2`,
			`Scaled up replica set ${nw} to 3 from 2`,
			`Scaled down replica set ${mid} to 0 from 1`
		]);
	});
	it('rollout status：状態が変わるたびに、本物の DeploymentStatusViewer の順で 1 行ずつ出す', () => {
		const r = outs([
			'kubectl set resources deployment web -n shop --limits=memory=256Mi --requests=memory=192Mi',
			'kubectl rollout status deployment/web -n shop'
		]);
		const w = 'Waiting for deployment "web" rollout to finish: ';
		// kubectl 1 回で 5 秒進む。打った時（2 手進んだ後）の状態から出す
		expect(r[1].out).toBe(
			[
				`${w}1 old replicas are pending termination...`,
				'deployment "web" successfully rolled out',
				''
			].join('\n')
		);
	});
	it('コンテナの ID は containerd と同じ 64 桁の 16 進', () => {
		expect(containerId('web-6d8f7b9c4-87cwj', 1)).toMatch(/^[0-9a-f]{64}$/);
		const a = last(['kubectl describe pod web-6d8f7b9c4-7xk2p -n shop']);
		expect(a.out).toMatch(/Container ID: {3}containerd:\/\/[0-9a-f]{64}\n/);
	});
	it('消した Pod の kubelet は、消した後に出来事を記さない', () => {
		const r = runIn([
			'kubectl delete pod web-6d8f7b9c4-7xk2p -n shop',
			'kubectl set resources deployment web -n shop --limits=memory=256Mi --requests=memory=192Mi',
			'kubectl rollout status deployment/web -n shop',
			'kubectl get pods -n shop',
			'kubectl get pods -n shop',
			'kubectl get pods -n shop'
		]);
		const k = r.entries.at(-1)!.state.k8s!;
		for (const p of k.pods.filter((x) => x.gone !== undefined))
			for (const o of kubeletOccurrences(k, p))
				expect(o.at, p.name).toBeLessThanOrEqual(p.gone! - p.created);
	});
});
