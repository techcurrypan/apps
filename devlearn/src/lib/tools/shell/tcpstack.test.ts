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
	it('ss -tim（ssh）：pfifo の 30 MB の後ろで rtt が minrtt の 49 倍', () => {
		const [a] = outs(['ss -tim dst 10.0.0.77']);
		expect(a.code).toBe(0);
		expect(a.out.split(String.fromCharCode(10))[0]).toMatch(
			/^State +Recv-Q +Send-Q +Local Address:Port +Peer Address:Port +Process$/
		);
		expect(a.out).toMatch(/^ESTAB +0 +0 +10\.0\.0\.5:22 +10\.0\.0\.77:51022 *$/m);
		expect(a.out).toContain(') ts sack cubic wscale:7,7 ');
		expect(a.out).toContain(' rtt:24.5/');
		expect(a.out).toContain(' send 4.73Mbps ');
		expect(a.out).toContain(' minrtt:0.5\n');
	});
	it('ss：写しの流れは 256 本。1 本は TSQ の下限ほど（117 KB）を手元に置く', () => {
		const [n, h] = outs(['ss -tn dst 10.0.0.9 | wc -l', 'ss -tim dst 10.0.0.9 | head -3']);
		expect(n.out).toBe('257\n');
		expect(h.out).toMatch(/^ESTAB +0 +4052344 +10\.0\.0\.5:43210 +10\.0\.0\.9:9000 *$/m);
		expect(h.out).toContain(
			'	 skmem:(r0,rb131072,t117188,tb4194304,f0,w4194304,o0,bl0,d0) ts sack cubic wscale:7,7 '
		);
		expect(h.out).toContain(' cwnd:83 ');
		expect(h.out).toContain(' send 39.2Mbps ');
		expect(h.out).toContain(' unacked:83 ');
		expect(h.out).toContain(' notsent:3932160 minrtt:0.5');
	});
	it('tc -s qdisc：pfifo に 30 MB', () => {
		const [a] = outs(['tc -s qdisc show dev eth0']);
		expect(a.out).toMatch(/^qdisc pfifo 8001: root refcnt 2 limit 100000p\n/);
		expect(a.out).toContain(' backlog 30000000b 458p requeues 0\n');
	});
	it('tcp_limit_output_bytes を下げても溜まりは減らない（1 本 117 KB で効いていない）', () => {
		const [, b] = outs([
			'sudo sysctl -w net.ipv4.tcp_limit_output_bytes=262144',
			'tc -s qdisc show dev eth0'
		]);
		expect(b.out).toContain(' backlog 30000000b 458p requeues 0\n');
	});
	it('sysctl の読み書き。sudo が無いと書けない', () => {
		const [a, b, c, d] = outs([
			'sysctl net.ipv4.tcp_limit_output_bytes',
			'sysctl -w net.ipv4.tcp_limit_output_bytes=262144',
			'sudo sysctl -w net.ipv4.tcp_limit_output_bytes=262144',
			'sysctl net.ipv4.tcp_limit_output_bytes'
		]);
		expect(a.out).toBe('net.ipv4.tcp_limit_output_bytes = 1048576\n');
		expect(b.err).toBe('sysctl: permission denied on key "net.ipv4.tcp_limit_output_bytes"\n');
		expect(b.code).not.toBe(0);
		expect(c.out).toBe('net.ipv4.tcp_limit_output_bytes = 262144\n');
		expect(d.out).toBe('net.ipv4.tcp_limit_output_bytes = 262144\n');
	});
	it('tc qdisc replace は root だけ。fq に替えると ssh は 0.6 ms、写しの溜まりは残る', () => {
		const [a, b, c, d, e] = outs([
			'tc qdisc replace dev eth0 root fq',
			'sudo tc qdisc replace dev eth0 root fq',
			'tc -s qdisc show dev eth0',
			'ss -tim dst 10.0.0.77',
			'ss -tim dst 10.0.0.9 | head -3'
		]);
		expect(a.err).toBe('RTNETLINK answers: Operation not permitted\n');
		expect(a.code).toBe(2);
		expect(b.code).toBe(0);
		expect(b.out).toBe('');
		expect(c.out).toMatch(/^qdisc fq 8002: root refcnt 2 limit 10000p flow_limit 100p /);
		expect(c.out).toContain(' backlog 30000000b 458p requeues 0\n');
		expect(d.out).toContain(' rtt:0.6/');
		expect(e.out).toContain(' rtt:24.5/');
	});
	it('fq_codel は 5 ms を超えた待ちを削り、写しの rtt も 5.5 ms に縮む', () => {
		const [, b, c, d] = outs([
			'sudo tc qdisc replace dev eth0 root fq_codel',
			'tc -s qdisc show dev eth0',
			'ss -tim dst 10.0.0.77',
			'ss -tim dst 10.0.0.9 | head -3'
		]);
		expect(b.out).toContain(' backlog 6250000b 95p requeues 0\n');
		expect(c.out).toContain(' rtt:0.6/');
		expect(d.out).toContain(' rtt:5.5/');
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
	it('tcp_limit_output_bytes を 130 KB より下げると、1 本 1 塊（66 KB）まで減るが 17 MB 残る（査読 2026-11-19）', () => {
		const [, b, c] = outs([
			'sudo sysctl -w net.ipv4.tcp_limit_output_bytes=65536',
			'tc -s qdisc show dev eth0',
			'ss -tim dst 10.0.0.77'
		]);
		expect(b.out).toContain(' backlog 16896000b 258p requeues 0\n');
		expect(c.out).toContain(' rtt:14.017/');
	});
	it('sysctl：tcp_wmem・tcp_notsent_lowat・tcp_rto_min_us・tcp_ecn を v6.12 の既定で読める', () => {
		const [a] = outs([
			'sysctl net.ipv4.tcp_wmem net.ipv4.tcp_notsent_lowat net.ipv4.tcp_rto_min_us net.ipv4.tcp_ecn'
		]);
		expect(a.out).toBe(
			'net.ipv4.tcp_wmem = 4096\t16384\t4194304\n' +
				'net.ipv4.tcp_notsent_lowat = 4294967295\n' +
				'net.ipv4.tcp_rto_min_us = 200000\n' +
				'net.ipv4.tcp_ecn = 2\n'
		);
	});
	it('カーネルにある qdisc（sfq・cake・fq_pie・bfifo・mq）は作れる。無い名前だけが unknown', () => {
		for (const k of ['sfq', 'cake', 'fq_pie', 'bfifo', 'mq']) {
			const [a, b] = outs([
				`sudo tc qdisc replace dev eth0 root ${k}`,
				'tc -s qdisc show dev eth0'
			]);
			expect(a.code, k).toBe(0);
			expect(b.out, k).toMatch(new RegExp(`^qdisc ${k} 8002: root`));
		}
	});
	it('替えた qdisc の数は 0 から数え、fq_codel は ECN を使わないので捨てた数が出る', () => {
		const [, b] = outs([
			'sudo tc qdisc replace dev eth0 root fq_codel',
			'tc -s qdisc show dev eth0'
		]);
		expect(b.out).not.toContain('81234567890');
		expect(b.out).toMatch(/\(dropped [1-9]\d*, overlimits 0 requeues 0\)/);
		expect(b.out).toContain('new_flows_len 1 old_flows_len 256');
	});
	it('ethtool -l：送り口は combined 1 にしてある（ixgbe の最大は ATR が有効な既定で 63）', () => {
		const [a] = outs(['ethtool -l eth0']);
		expect(a.out).toContain('Pre-set maximums:');
		expect(a.out).toMatch(/Current hardware settings:\n(.*\n)*Combined:\t1\n/);
	});
});
