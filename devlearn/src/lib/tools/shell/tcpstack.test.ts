// TCP の出口の模擬（net-101 の実戦）：ss -tim・tc・sysctl・nstat・ethtool。
// 本物の出力の形は ss(8)・tc-fq(8)・tc-fq_codel(8)・sysctl(8)・nstat(8)・ethtool(8) の書式に合わせた（decisions.md 2026-11-19）。
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { start, typeLine } from '../session.ts';
import { shellCommands } from './commands.ts';
import { shellTool } from './run.ts';
import { learnerWorld } from './world.ts';
import { worldFs, worldTcp, type WorldSpec } from './worlds.ts';

const runIn = (lines: string[]) => {
	const w = JSON.parse(readFileSync('tools-real/worlds/tcp.json', 'utf8')) as WorldSpec;
	const tool = shellTool<null>(shellCommands<null>());
	const init = { ...learnerWorld<null>(null, worldFs(w)), tcp: worldTcp(w) };
	return lines.reduce(typeLine, start(tool, init));
};
const outs = (lines: string[]) => runIn(lines).entries;

describe('TCP の出口の模擬', () => {
	it('ss -tim：溜まりすぎの間は rtt が minrtt の 49 倍', () => {
		const [a] = outs(['ss -tim dst 10.0.0.9']);
		expect(a.code).toBe(0);
		expect(a.out.split('\n')[0]).toMatch(
			/^State +Recv-Q +Send-Q +Local Address:Port +Peer Address:Port +Process$/
		);
		expect(a.out).toMatch(/^ESTAB +0 +2100000 +10\.0\.0\.5:43210 +10\.0\.0\.9:9000 *$/m);
		expect(a.out).toContain(
			'\t skmem:(r0,rb131072,t30000000,tb4194304,f0,w4194304,o0,bl0,d0) cubic wscale:7,7 '
		);
		expect(a.out).toContain(' rtt:24.5/0.398 ');
		expect(a.out).toContain(' cwnd:430 ssthresh:280 ');
		expect(a.out).toContain(' unacked:430 retrans:0/1 ');
		expect(a.out).toContain(' notsent:2100000 minrtt:0.5');
	});
	it('tc -s qdisc：pfifo に 30 MB', () => {
		const [a] = outs(['tc -s qdisc show dev eth0']);
		expect(a.out).toMatch(/^qdisc pfifo 8001: root refcnt 2 limit 100000p\n/);
		expect(a.out).toContain(' backlog 30000000b 458p requeues 0\n');
	});
	it('sysctl の読み書き。sudo が無いと書けない', () => {
		const [a, b, c, d] = outs([
			'sysctl net.ipv4.tcp_limit_output_bytes',
			'sysctl -w net.ipv4.tcp_limit_output_bytes=1048576',
			'sudo sysctl -w net.ipv4.tcp_limit_output_bytes=1048576',
			'sysctl net.ipv4.tcp_limit_output_bytes'
		]);
		expect(a.out).toBe('net.ipv4.tcp_limit_output_bytes = 268435456\n');
		expect(b.err).toBe('sysctl: permission denied on key "net.ipv4.tcp_limit_output_bytes"\n');
		expect(b.code).not.toBe(0);
		expect(c.out).toBe('net.ipv4.tcp_limit_output_bytes = 1048576\n');
		expect(d.out).toBe('net.ipv4.tcp_limit_output_bytes = 1048576\n');
	});
	it('tc qdisc replace は root だけ。fq に替えると rtt が 0.512 ms に戻る（fq で待つ分は数えない）', () => {
		const [a, b, c, d] = outs([
			'tc qdisc replace dev eth0 root fq',
			'sudo tc qdisc replace dev eth0 root fq',
			'tc -s qdisc show dev eth0',
			'ss -tim dst 10.0.0.9'
		]);
		expect(a.err).toBe('RTNETLINK answers: Operation not permitted\n');
		expect(a.code).toBe(2);
		expect(b.code).toBe(0);
		expect(b.out).toBe('');
		expect(c.out).toMatch(/^qdisc fq 8002: root refcnt 2 limit 10000p flow_limit 100p /);
		expect(c.out).toContain(' backlog 1357500b 21p requeues 0\n');
		expect(d.out).toContain(' rtt:0.512/0.120 ');
	});
	it('fq_codel は手元の上限 1 MiB を戻さないと 5 ms で捨てて釣り合う', () => {
		const e1 = outs(['sudo tc qdisc replace dev eth0 root fq_codel', 'ss -tim dst 10.0.0.9']);
		expect(e1[1].out).toContain(' rtt:5.5/');
		const e2 = outs([
			'sudo sysctl -w net.ipv4.tcp_limit_output_bytes=1048576',
			'sudo tc qdisc replace dev eth0 root fq_codel',
			'ss -tim dst 10.0.0.9'
		]);
		expect(e2[2].out).toContain(' rtt:1.339/');
	});
	it('nstat と ethtool', () => {
		const [a, b] = outs(['nstat -az TcpRetransSegs TcpExtTCPTimeouts', 'ethtool -k eth0']);
		expect(a.out).toBe(
			'#kernel\nTcpRetransSegs                  1                  0.0\nTcpExtTCPTimeouts               0                  0.0\n'
		);
		expect(b.out).toContain('tcp-segmentation-offload: on\n');
		expect(b.out).toContain('generic-receive-offload: on\n');
	});
	it('知らない装置・打ち間違いは本物と同じ言い方', () => {
		const [a, b] = outs(['tc -s qdisc show dev eth1', 'sudo tc qdisc replace dev eth0 root fqq']);
		expect(a.err).toBe('Cannot find device "eth1"\n');
		expect(b.err).toBe('Error: Specified qdisc kind is unknown.\n');
	});
});
