// TCP の出口の模擬（net-101 の実戦。docs/tools.md 3.2）：ss -tim・tc（qdisc の表示と替え）・sysctl・nstat・ethtool -k。
// 世界（tools-real/worlds/tcp.json）の qdisc と tcp_limit_output_bytes から、手元の行列と RTT を決まった式で計算する。
// 式はレッスン net-101 のステップ 10・11 と同じ：手元の行列 ÷ 10 GbE（1.25 GB/s）が待ちになり、RTT に足される。
// 出力の形は ss(8)・tc-fq(8)・tc-fq_codel(8)・sysctl(8)・nstat(8)・ethtool(8) の書式に合わせた（decisions.md 2026-11-19）。
import { fail, ok, type Cmd, type ShellState } from './run.ts';

export type Qdisc = 'pfifo' | 'pfifo_fast' | 'fq' | 'fq_codel';
export type TcpWorld = {
	dev: string;
	qdisc: Qdisc;
	pfifoLimit: number;
	sysctl: Record<string, string>;
	offload: { tso: boolean; gro: boolean };
	conn: {
		local: string;
		peer: string;
		minrtt: number;
		cwnd: number;
		ssthresh: number;
		retrans: number;
	};
	ssh: { local: string; peer: string };
};
export type TcpState = TcpWorld & { handle: number };

const LINE_BPS = 1.25e9; // 10 GbE の 1 秒の B
const TSQ_FQ = 1_357_500; // fq の下の TSQ の上限（送る速さ 1.39 GB/s の 1/1024）
const PILE = 30_000_000; // 上限が大きい時に釣り合った行列（net-101 ステップ 10）
const CODEL_TARGET_B = 5_000_000 * 1.25; // 5 ms 分（6.25 MB）
const SKB = 65_536;
const QDISCS: Qdisc[] = ['pfifo', 'pfifo_fast', 'fq', 'fq_codel'];

export function initialTcp(w: TcpWorld): TcpState {
	return { ...w, handle: 0x8001 };
}

/** 手元の行列（qdisc と NIC の B）。決まった式 */
export function backlogOf(t: TcpWorld): number {
	const limit = Number(t.sysctl['net.ipv4.tcp_limit_output_bytes'] ?? '1048576');
	if (t.qdisc === 'fq') return TSQ_FQ;
	const tsq = Math.min(limit, PILE);
	if (t.qdisc === 'fq_codel') return Math.min(tsq, CODEL_TARGET_B);
	return tsq;
}
/** この流れの RTT（ms）＝ 最小 ＋ 手元の行列 ÷ 線の速さ（ペーシングしない qdisc の時） */
export function rttOf(t: TcpWorld): number {
	// fq の下では TCP が skb の時刻を「出してよい時刻」で書き、RTT をそこから測る。fq で待つ分は RTT に入らない
	if (t.qdisc === 'fq') return t.conn.minrtt + 0.012;
	return t.conn.minrtt + (backlogOf(t) / LINE_BPS) * 1000;
}
const fmtMs = (v: number) => String(Math.round(v * 1000) / 1000);

// ---- ss -ti ----
const pad = (s: string, w: number, right = false) => (right ? s.padStart(w) : s.padEnd(w));

function ssInfo(t: TcpState): string {
	const c = t.conn;
	const rtt = rttOf(t);
	const qdepth = backlogOf(t);
	const notsent = 2_100_000;
	const sendq = notsent;
	const head = `${pad('State', 6)}${pad('Recv-Q', 7)}${pad('Send-Q', 9)}${pad('Local Address:Port', 20, true)} ${pad('Peer Address:Port', 18, true)} Process`;
	const row = `${pad('ESTAB', 6)}${pad('0', 7)}${pad(String(sendq), 9)}${pad(c.local, 20, true)} ${pad(c.peer, 18, true)} `;
	const rttvar = t.qdisc === 'fq' ? '0.120' : t.qdisc === 'fq_codel' ? '0.210' : '0.398';
	const rto = Math.max(201, Math.round(200 + rtt));
	const send = ((c.cwnd * 1448 * 8) / (rtt / 1000) / 1e9).toFixed(1);
	const info = [
		`skmem:(r0,rb131072,t${qdepth},tb4194304,f0,w4194304,o0,bl0,d0)`,
		t.sysctl['net.ipv4.tcp_congestion_control'] ?? 'cubic',
		'wscale:7,7',
		`rto:${rto}`,
		`rtt:${fmtMs(rtt)}/${rttvar}`,
		'ato:40 mss:1448 pmtu:1500 rcvmss:536 advmss:1448',
		`cwnd:${c.cwnd} ssthresh:${c.ssthresh}`,
		`send ${send}Gbps`,
		`pacing_rate ${(Number(send) * 1.2).toFixed(1)}Gbps delivery_rate 9.3Gbps`,
		`busy:9000ms unacked:${c.cwnd} retrans:0/${c.retrans}`,
		`rcv_space:14480 rcv_ssthresh:64088 notsent:${notsent} minrtt:${c.minrtt}`
	].join(' ');
	return `${head}\n${row}\n\t ${info}\n`;
}

export const ssTcp: Cmd<unknown> = (s, args) => {
	const t = s.tcp;
	if (!t) return fail(s, '（この実戦の模擬には TCP の流れが無い）\n', 1);
	const flags = args.filter((a) => a.startsWith('-')).join('');
	if (!flags.includes('t') || !flags.includes('i'))
		return fail(s, '（模擬の ss は -ti・-tim・-tin の形を扱う）\n', 1);
	const rest = args.filter((a) => !a.startsWith('-'));
	const dst = rest[0] === 'dst' ? rest[1] : undefined;
	const peerIp = t.conn.peer.split(':')[0];
	if (dst !== undefined && dst !== peerIp)
		return ok(
			s,
			`${pad('State', 6)}${pad('Recv-Q', 7)}${pad('Send-Q', 9)}${pad('Local Address:Port', 20, true)} ${pad('Peer Address:Port', 18, true)} Process\n`
		);
	return ok(s, ssInfo(t));
};

// ---- tc ----
function qdiscText(t: TcpState): string {
	const h = `${t.handle.toString(16)}:`;
	const bl = backlogOf(t);
	const p = t.qdisc === 'fq' ? 21 : Math.round(bl / SKB);
	const sent = ` Sent 81234567890 bytes 1239500 pkt (dropped 0, overlimits 0 requeues 0) \n backlog ${bl}b ${p}p requeues 0\n`;
	switch (t.qdisc) {
		case 'pfifo':
			return `qdisc pfifo ${h} root refcnt 2 limit ${t.pfifoLimit}p\n${sent}`;
		case 'pfifo_fast':
			return `qdisc pfifo_fast ${h} root refcnt 2 bands 3 priomap 1 2 2 2 1 2 0 0 1 1 1 1 1 1 1 1\n${sent}`;
		case 'fq':
			return (
				`qdisc fq ${h} root refcnt 2 limit 10000p flow_limit 100p buckets 1024 orphan_mask 1023 quantum 3028b initial_quantum 15140b low_rate_threshold 550Kbit refill_delay 40ms timer_slack 10us horizon 10s horizon_drop\n${sent}` +
				'  flows 3 (inactive 1 throttled 1)\n  gc 0 highprio 0 throttled 25 latency 9.7us\n'
			);
		case 'fq_codel':
			return (
				`qdisc fq_codel ${h} root refcnt 2 limit 10240p flows 1024 quantum 1514 target 5ms interval 100ms memory_limit 32Mb ecn drop_batch 64\n${sent}` +
				'  maxpacket 65160 drop_overlimit 0 new_flow_count 12 ecn_mark 0\n  new_flows_len 0 old_flows_len 2\n'
			);
	}
}

export const tc: Cmd<unknown> = (s, args) => {
	const t = s.tcp;
	if (!t) return fail(s, '（この実戦の模擬には TCP の流れが無い）\n', 1);
	const a = args.filter((x) => x !== '-s');
	if (a[0] !== 'qdisc') return fail(s, '（模擬の tc は qdisc の show と replace を扱う）\n', 1);
	const devAt = a.indexOf('dev');
	const dev = devAt >= 0 ? a[devAt + 1] : undefined;
	if (dev !== undefined && dev !== t.dev) return fail(s, `Cannot find device "${dev}"\n`, 1);
	const verb = a[1] ?? 'show';
	if (verb === 'show' || verb === 'list' || verb === 'ls') return ok(s, qdiscText(t));
	if (verb === 'replace' || verb === 'add' || verb === 'change') {
		if (s.user !== 'root') return fail(s, 'RTNETLINK answers: Operation not permitted\n', 2);
		const rootAt = a.indexOf('root');
		const kind = rootAt >= 0 ? a[rootAt + 1] : undefined;
		if (kind === undefined)
			return fail(s, '（模擬の tc は「tc qdisc replace dev eth0 root 種類」の形を扱う）\n', 1);
		if (!QDISCS.includes(kind as Qdisc))
			return fail(s, 'Error: Specified qdisc kind is unknown.\n', 2);
		if (verb === 'add') return fail(s, 'Error: Exclusivity flag on, cannot modify.\n', 2);
		const next: TcpState = { ...t, qdisc: kind as Qdisc, handle: t.handle + 1 };
		return ok({ ...s, tcp: next }, '');
	}
	return fail(s, `Command "${verb}" is unknown, try "tc qdisc help".\n`, 1);
};

// ---- sysctl ----
export const sysctl: Cmd<unknown> = (s, args) => {
	const t = s.tcp;
	if (!t) return fail(s, '（この実戦の模擬には TCP の設定が無い）\n', 1);
	const write = args[0] === '-w';
	const keys = args.filter((x) => !x.startsWith('-'));
	if (keys.length === 0)
		return fail(s, '（模擬の sysctl は「sysctl 名前」と「sysctl -w 名前=値」の形を扱う）\n', 1);
	let out = '';
	let err = '';
	let sys = { ...t.sysctl };
	for (const k of keys) {
		const [name, value] = k.split('=');
		if (!(name in sys)) {
			err += `sysctl: cannot stat /proc/sys/${name.replace(/\./g, '/')}: No such file or directory\n`;
			continue;
		}
		if (write || value !== undefined) {
			if (s.user !== 'root') {
				err += `sysctl: permission denied on key "${name}"\n`;
				continue;
			}
			sys = { ...sys, [name]: value ?? '' };
			out += `${name} = ${value}\n`;
		} else out += `${name} = ${sys[name]}\n`;
	}
	const st: ShellState<unknown> = { ...s, tcp: { ...t, sysctl: sys } };
	return { state: { ...st, lastCode: err ? 255 : 0 }, out, err, code: err ? 255 : 0 };
};

// ---- nstat ----
const COUNTERS = (t: TcpState): Record<string, number> => ({
	TcpRetransSegs: t.conn.retrans,
	TcpExtTCPTimeouts: 0,
	TcpExtTCPLossProbes: 0,
	TcpOutSegs: 741812,
	TcpExtTCPSackRecovery: t.conn.retrans
});
export const nstat: Cmd<unknown> = (s, args) => {
	const t = s.tcp;
	if (!t) return fail(s, '（この実戦の模擬には TCP の数が無い）\n', 1);
	const all = COUNTERS(t);
	const names = args.filter((x) => !x.startsWith('-'));
	const pick = names.length ? names : Object.keys(all);
	const rows = pick
		.filter((n) => n in all)
		.map((n) => `${n.padEnd(32)}${String(all[n]).padEnd(19)}0.0\n`);
	return ok(s, `#kernel\n${rows.join('')}`);
};

// ---- ethtool -k ----
export const ethtool: Cmd<unknown> = (s, args) => {
	const t = s.tcp;
	if (!t) return fail(s, '（この実戦の模擬には NIC が無い）\n', 1);
	if (args[0] !== '-k') return fail(s, '（模擬の ethtool は -k の形を扱う）\n', 1);
	if (args[1] !== t.dev)
		return fail(
			s,
			`netlink error: no device matches name (offset 24)\nnetlink error: No such device\n`,
			1
		);
	const on = (b: boolean) => (b ? 'on' : 'off');
	return ok(
		s,
		[
			`Features for ${t.dev}:`,
			'rx-checksumming: on',
			'tx-checksumming: on',
			'scatter-gather: on',
			`tcp-segmentation-offload: ${on(t.offload.tso)}`,
			`\ttx-tcp-segmentation: ${on(t.offload.tso)}`,
			`\ttx-tcp6-segmentation: ${on(t.offload.tso)}`,
			'generic-segmentation-offload: on',
			`generic-receive-offload: ${on(t.offload.gro)}`,
			'large-receive-offload: off',
			''
		].join('\n')
	);
};

export const tcpCommands: Record<string, Cmd<unknown>> = { tc, sysctl, nstat, ethtool };
