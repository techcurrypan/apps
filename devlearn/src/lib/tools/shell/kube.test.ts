// Kubernetes の模擬（見本 2 の実戦。docs/tools.md 3.2）：kubectl の get・describe・logs・delete・set resources・rollout status。
// 出力の形は Kubernetes v1.31 の kubectl と公式文書（kubernetes.io の「Debug Pods」「Assign Memory Resources」）に合わせた。
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { start, typeLine } from '../session.ts';
import { shellCommands } from './commands.ts';
import { shellTool } from './run.ts';
import { learnerWorld } from './world.ts';
import { worldFs, worldK8s, type WorldSpec } from './worlds.ts';

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
			/^web-6d8f7b9c4-7xk2p {3}0\/1 {5}CrashLoopBackOff {3}5 \(\d+s ago\) {3,}6m12s$/
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
		expect(a.out).toContain('    Restart Count:  5\n');
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
	it('get events：新しい順でなく、時刻の順に並ぶ。OOMKilled ではなく BackOff が出る', () => {
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
});
