// TCP の出口の模擬（net-101 の実戦。docs/tools.md 3.2）：ss -tim・tc（qdisc の表示と替え）・sysctl・nstat・ethtool -k・-l。
// 世界（tools-real/worlds/tcp.json）の qdisc と tcp_limit_output_bytes から、手元の行列と RTT を決まった式で計算する。
// 式はレッスン net-101 のステップ 10・11 と同じ：手元の行列 ÷ 10 GbE（1.25 GB/s）が待ちになり、RTT に足される。
// 出力の形は ss(8)・tc-fq(8)・tc-fq_codel(8)・sysctl(8)・nstat(8)・ethtool(8) の書式に合わせた（decisions.md 2026-11-19）。
import { fail, ok, type Cmd, type ShellState } from './run.ts';

export type Qdisc =
	'pfifo' | 'pfifo_fast' | 'fq' | 'fq_codel' | 'sfq' | 'cake' | 'fq_pie' | 'bfifo' | 'mq';
export type TcpWorld = {
	dev: string; // 送り口が 1 つの NIC（root に qdisc を 1 つ置く形）
	qdisc: Qdisc;
	pfifoLimit: number;
	sysctl: Record<string, string>;
	offload: { tso: boolean; gro: boolean };
	minrtt: number;
	/** 夜の写し：同じ相手への流れの本数（ポートは firstPort から続く） */
	flows: { count: number; local: string; firstPort: number; peer: string; retrans: number };
	ssh: { local: string; peer: string };
};
export type TcpState = TcpWorld & { handle: number };

const LINE_BPS = 1.25e9; // 10 GbE の 1 秒の B
const PER_FLOW = 30_000_000 / 256; // 1 本が手元に置く量（TSQ の下限 2 × truesize の内。net-101 ステップ 10）
const TRUESIZE = 66_000; // 64 KB の塊 1 個の truesize。TSQ は手元が 0 の時、上限より大きくても 1 個は通す
// qdisc が数える塊 1 個の長さ（qdisc_pkt_len_init()：45 区切りの GSO の skb に、区切りごとの頭 66 B を足す。65,226 ＋ 44 × 66）
const SKB = 68_130;
const MSS = 1448;
const QDISCS: Qdisc[] = [
	'pfifo',
	'pfifo_fast',
	'fq',
	'fq_codel',
	'sfq',
	'cake',
	'fq_pie',
	'bfifo',
	'mq'
];
/** 流れごとに列を分ける qdisc（新しい流れの ssh は写しの後ろに並ばない） */
const PER_FLOW_QDISC: Qdisc[] = ['fq', 'fq_codel', 'sfq', 'cake', 'fq_pie'];
/** 溜まりの上限（B）。AQM は目標の待ち × 線の速さ、大きさで切る物はその上限。上限の無い物は Infinity */
const CAP: Record<Qdisc, number> = {
	pfifo: Infinity, // limit 100000p（世界の設定）で 30 MB は入る
	pfifo_fast: Infinity,
	mq: Infinity, // 子は pfifo_fast
	fq: Infinity,
	fq_codel: 0.005 * LINE_BPS, // target 5ms（6.25 MB）
	cake: 0.005 * LINE_BPS, // 既定の target 5ms
	fq_pie: 0.015 * LINE_BPS, // target 15ms
	sfq: 127 * SKB, // limit 127p
	bfifo: 1_514_000 // limit は tx_queue_len 1000 × psched_mtu 1514（sch_fifo.c fifo_init()）
};

export function initialTcp(w: TcpWorld): TcpState {
	return { ...w, handle: 0x8001 };
}

/**
 * TSQ が流れごとに置かせる量の和（B）。決まった式（net-101 ステップ 10・11）：
 * 上限は流れ 1 本ずつ max(2 × truesize, 速さ ÷ 1024) と tcp_limit_output_bytes の小さい方。1 本 39 Mbps では 2 × truesize が効く。
 * 上限を塊 1 個より下げても、手元が 0 の時の 1 個は通る（tcp_small_queue_check() は「超えたら」止める）。溜まりは本数 × 1 本の量
 */
export function pileOf(t: TcpWorld): number {
	const lim = Number(t.sysctl['net.ipv4.tcp_limit_output_bytes'] ?? '1048576');
	// 手元が上限を「超えたら」止めるので、置ける塊は floor(上限 ÷ truesize) ＋ 1 個。qdisc ではそれぞれ SKB として数える
	const per = Math.min(PER_FLOW, SKB * (Math.floor(lim / TRUESIZE) + 1));
	return Math.round(t.flows.count * per);
}
/** 手元の行列（qdisc の B）。fq は流れを分けるだけで溜まりは残る。AQM（fq_codel・cake・fq_pie）は目標の待ちを超えた分を捨てる */
export function backlogOf(t: TcpWorld): number {
	return Math.min(pileOf(t), CAP[t.qdisc]);
}
/** 溜まりきらずに捨てた塊の数（AQM と大きさの上限。来た順の列では 0） */
export function droppedOf(t: TcpWorld): number {
	return Math.round((pileOf(t) - backlogOf(t)) / SKB);
}
/** 写しの流れの RTT（ms）＝ 最小 ＋ 手元の行列 ÷ 線の速さ */
export function copyRttOf(t: TcpWorld): number {
	return t.minrtt + (backlogOf(t) / LINE_BPS) * 1000;
}
/** ssh の RTT（ms）。来た順の列では写しの後ろに並ぶ。流れごとの列（fq・fq_codel・sfq・cake・fq_pie）では新しい流れとして先に出る */
export function rttOf(t: TcpWorld): number {
	if (PER_FLOW_QDISC.includes(t.qdisc)) return t.minrtt + 0.1;
	return copyRttOf(t);
}
const fmtMs = (v: number) => String(Math.round(v * 1000) / 1000);
/** ss(8) の帯域の書き方（iproute2 ss.c の sprint_bw：有効数字 3 桁） */
export function bw(bps: number): string {
	const g = (v: number) => String(Number(v.toPrecision(3)));
	if (bps >= 1e12) return `${g(bps / 1e12)}T`;
	if (bps >= 1e9) return `${g(bps / 1e9)}G`;
	if (bps >= 1e6) return `${g(bps / 1e6)}M`;
	if (bps >= 1e3) return `${g(bps / 1e3)}k`;
	return g(bps);
}

// ---- ss -t[i][m] ----
const pad = (s: string, w: number, right = false) => (right ? s.padStart(w) : s.padEnd(w));
const HEAD = `${pad('State', 6)}${pad('Recv-Q', 7)}${pad('Send-Q', 9)}${pad('Local Address:Port', 20, true)} ${pad('Peer Address:Port', 18, true)} Process\n`;
const row = (sendq: number, local: string, peer: string) =>
	`${pad('ESTAB', 6)}${pad('0', 7)}${pad(String(sendq), 9)}${pad(local, 20, true)} ${pad(peer, 18, true)} \n`;

function copyFlow(t: TcpState, i: number, info: boolean, mem: boolean): string {
	const f = t.flows;
	const rtt = copyRttOf(t);
	const rate = LINE_BPS / f.count; // 1 本の B/s（線を等しく分ける）
	const cwnd = Math.round((rate * (rtt / 1000)) / MSS);
	const unackedB = cwnd * MSS;
	const notsent = 3_932_160;
	const head = row(unackedB + notsent, `${f.local}:${f.firstPort + i}`, f.peer);
	if (!info) return head;
	const send = (cwnd * MSS * 8) / (rtt / 1000);
	const fields = [
		...(mem
			? [
					`skmem:(r0,rb131072,t${Math.round(backlogOf(t) / f.count)},tb4194304,f0,w4194304,o0,bl0,d0)`
				]
			: []),
		'ts sack',
		t.sysctl['net.ipv4.tcp_congestion_control'] ?? 'cubic',
		'wscale:7,7',
		`rto:${Math.ceil(200 + rtt)}`,
		`rtt:${fmtMs(rtt)}/${t.qdisc === 'fq_codel' ? '0.412' : '0.398'}`,
		'ato:40 mss:1448 pmtu:1500 rcvmss:536 advmss:1448',
		`cwnd:${cwnd} ssthresh:${Math.round(cwnd * 0.7)}`,
		`send ${bw(send)}bps`,
		`pacing_rate ${bw(send * 1.2)}bps delivery_rate ${bw(rate * 8)}bps`,
		`busy:9000ms unacked:${cwnd} retrans:0/${f.retrans}`,
		`rcv_space:14480 rcv_ssthresh:64088 notsent:${notsent} minrtt:${t.minrtt}`
	];
	return `${head}\t ${fields.join(' ')}\n`;
}
function sshFlow(t: TcpState, info: boolean, mem: boolean): string {
	const head = row(0, t.ssh.local, t.ssh.peer);
	if (!info) return head;
	const rtt = rttOf(t);
	const send = (10 * MSS * 8) / (rtt / 1000);
	const fields = [
		...(mem ? ['skmem:(r0,rb131072,t0,tb87040,f0,w0,o0,bl0,d0)'] : []),
		'ts sack',
		t.sysctl['net.ipv4.tcp_congestion_control'] ?? 'cubic',
		'wscale:7,7',
		`rto:${Math.ceil(200 + rtt)}`,
		`rtt:${fmtMs(rtt)}/${rtt > 2 ? '0.31' : '0.1'}`,
		'ato:40 mss:1448 pmtu:1500 rcvmss:536 advmss:1448',
		'cwnd:10 bytes_sent:184320 bytes_acked:184320 bytes_received:36864 segs_out:2210 segs_in:1630 data_segs_out:1180 data_segs_in:640',
		`send ${bw(send)}bps lastsnd:12 lastrcv:12 lastack:12`,
		`pacing_rate ${bw(send * 2)}bps delivery_rate 1.2Mbps delivered:1181`,
		'app_limited busy:1200ms',
		`rcv_space:14480 rcv_ssthresh:64088 minrtt:${t.minrtt}`
	];
	return `${head}\t ${fields.join(' ')}\n`;
}

export const ssTcp: Cmd<unknown> = (s, args) => {
	const t = s.tcp;
	if (!t) return fail(s, '（この実戦の模擬には TCP の流れが無い）\n', 1);
	const flags = args.filter((a) => a.startsWith('-')).join('');
	if (!flags.includes('t'))
		return fail(s, '（模擬の ss は -t に i・m・n を足した形と「dst 番地」を扱う）\n', 1);
	const info = flags.includes('i');
	const mem = flags.includes('m');
	const rest = args.filter((a) => !a.startsWith('-'));
	const dst = rest[0] === 'dst' ? rest[1] : undefined;
	const copyIp = t.flows.peer.split(':')[0];
	const sshIp = t.ssh.peer.split(':')[0];
	let out = HEAD;
	if (dst === undefined || dst === sshIp) out += sshFlow(t, info, mem);
	if (dst === undefined || dst === copyIp)
		for (let i = 0; i < t.flows.count; i++) out += copyFlow(t, i, info, mem);
	return ok(s, out);
};

// ---- tc ----
function qdiscText(t: TcpState): string {
	const h = `${t.handle.toString(16)}:`;
	const bl = backlogOf(t);
	const p = Math.round(bl / SKB);
	// 起きた時からの qdisc（8001:）は長く数えている。替えた qdisc は 0 から数え、替えてから 1 秒分（1.25 GB）を出した所
	const fresh = t.handle !== 0x8001;
	const sentB = fresh ? 1_250_000_000 : 81_234_567_890;
	const sentP = fresh ? Math.round(sentB / SKB) : 1_239_500;
	const sent = ` Sent ${sentB} bytes ${sentP} pkt (dropped ${droppedOf(t)}, overlimits 0 requeues 0) \n backlog ${bl}b ${p}p requeues 0\n`;
	switch (t.qdisc) {
		case 'pfifo':
			return `qdisc pfifo ${h} root refcnt 2 limit ${t.pfifoLimit}p\n${sent}`;
		case 'pfifo_fast':
			return `qdisc pfifo_fast ${h} root refcnt 2 bands 3 priomap 1 2 2 2 1 2 0 0 1 1 1 1 1 1 1 1\n${sent}`;
		case 'fq':
			return (
				`qdisc fq ${h} root refcnt 2 limit 10000p flow_limit 100p buckets 1024 orphan_mask 1023 bands 3 priomap 1 2 2 2 1 2 0 0 1 1 1 1 1 1 1 1 weights 589824 196608 65536 quantum 3028b initial_quantum 15140b low_rate_threshold 550Kbit refill_delay 40ms timer_slack 10us horizon 10s horizon_drop \n${sent}` +
				'  flows 257 (inactive 1 throttled 0)\n  gc 0 highprio 0 throttled 25 latency 9.7us\n'
			);
		case 'fq_codel':
			return (
				`qdisc fq_codel ${h} root refcnt 2 limit 10240p flows 1024 quantum 1514 target 5ms interval 100ms memory_limit 32Mb ecn drop_batch 64\n${sent}` +
				// 写しの流れは ECN を使わない（tcp_ecn=2 は求められた時だけ使う）ので、印ではなく捨てる
				`  maxpacket ${SKB} drop_overlimit 0 new_flow_count 12 ecn_mark 0\n  new_flows_len 1 old_flows_len ${t.flows.count}\n`
			);
		case 'sfq':
			return `qdisc sfq ${h} root refcnt 2 limit 127p quantum 1514b depth 127 divisor 1024 \n${sent}`;
		case 'cake':
			return `qdisc cake ${h} root refcnt 2 bandwidth unlimited diffserv3 triple-isolate nonat nowash no-ack-filter split-gso rtt 100ms raw overhead 0 \n${sent}`;
		case 'fq_pie':
			return `qdisc fq_pie ${h} root refcnt 2 limit 10240p flows 1024 target 15ms tupdate 16ms alpha 2 beta 20 quantum 1514b memory_limit 32Mb ecn_prob 10\n${sent}`;
		case 'bfifo':
			return `qdisc bfifo ${h} root refcnt 2 limit 1514000b\n${sent}`;
		case 'mq':
			return `qdisc mq ${h} root \n${sent}`;
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
	TcpRetransSegs: t.flows.retrans,
	TcpExtTCPTimeouts: 0,
	TcpExtTCPLossProbes: 0,
	TcpOutSegs: 741812,
	TcpExtTCPSackRecovery: t.flows.retrans
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
	if (args[0] !== '-k' && args[0] !== '-l')
		return fail(s, '（模擬の ethtool は -k と -l の形を扱う）\n', 1);
	if (args[1] !== t.dev)
		return fail(
			s,
			`netlink error: no device matches name (offset 24)\nnetlink error: No such device\n`,
			1
		);
	if (args[0] === '-l')
		// ixgbe_max_channels()（v6.12）：ATR が有効な既定では 63（IXGBE_MAX_FDIR_INDICES）。この機械は送り口を 1 つにしてある
		return ok(
			s,
			`Channel parameters for ${t.dev}:\nPre-set maximums:\nRX:\t\tn/a\nTX:\t\tn/a\nOther:\t\t1\nCombined:\t63\n` +
				'Current hardware settings:\nRX:\t\tn/a\nTX:\t\tn/a\nOther:\t\t1\nCombined:\t1\n'
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
