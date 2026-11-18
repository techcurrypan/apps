// 見本 1（net-101）の材料：出典・関数の名前・層の図の箱・本物のバイト列。本文は lessons/net-101.ts。
// 関数・構造体・設定の名前は、全て Linux v6.12 の tag のソースで確かめた（npm run impl:verify。2026-11-19）。
// 場面：同じデータセンターの 2 台。app-1（10.0.0.5）が store-1（10.0.0.9:9000）へ帳簿を送る。RTT 0.5 ms、10 GbE（ixgbe）。
import { tcpOptions, tcpPacket } from '../../lesson/packet.ts';
import type { Impl, ImplContext, Layer, Queue, Source } from '../../lesson/types.ts';

const V = 'v6.12';
const DAY = '2026-11-19';
const GH = `https://github.com/torvalds/linux/blob/${V}/`;

const linux = (id: string, path: string): Source => ({
	id,
	title: `Linux ${V} ${path}`,
	url: GH + path,
	kind: 'source',
	checked: DAY
});

const sources: Source[] = [
	{
		id: 'rfc9293',
		title: 'RFC 9293 Transmission Control Protocol (TCP)',
		url: 'https://www.rfc-editor.org/rfc/rfc9293',
		kind: 'rfc',
		checked: DAY
	},
	{
		id: 'rfc5681',
		title: 'RFC 5681 TCP Congestion Control',
		url: 'https://www.rfc-editor.org/rfc/rfc5681',
		kind: 'rfc',
		checked: DAY
	},
	{
		id: 'rfc6928',
		title: "RFC 6928 Increasing TCP's Initial Window",
		url: 'https://www.rfc-editor.org/rfc/rfc6928',
		kind: 'rfc',
		checked: DAY
	},
	{
		id: 'rfc6298',
		title: "RFC 6298 Computing TCP's Retransmission Timer",
		url: 'https://www.rfc-editor.org/rfc/rfc6298',
		kind: 'rfc',
		checked: DAY
	},
	{
		id: 'rfc8985',
		title: 'RFC 8985 The RACK-TLP Loss Detection Algorithm for TCP',
		url: 'https://www.rfc-editor.org/rfc/rfc8985',
		kind: 'rfc',
		checked: DAY
	},
	{
		id: 'rfc9438',
		title: 'RFC 9438 CUBIC for Fast and Long-Distance Networks',
		url: 'https://www.rfc-editor.org/rfc/rfc9438',
		kind: 'rfc',
		checked: DAY
	},
	{
		id: 'rfc8290',
		title: 'RFC 8290 The Flow Queue CoDel Packet Scheduler and AQM Algorithm',
		url: 'https://www.rfc-editor.org/rfc/rfc8290',
		kind: 'rfc',
		checked: DAY
	},
	{
		id: 'rfc7323',
		title: 'RFC 7323 TCP Extensions for High Performance',
		url: 'https://www.rfc-editor.org/rfc/rfc7323',
		kind: 'rfc',
		checked: DAY
	},
	{
		id: 'bbr',
		title: 'Cardwell ほか「BBR: Congestion-Based Congestion Control」ACM Queue 14(5), 2016',
		url: 'https://research.google/pubs/bbr-congestion-based-congestion-control-2/',
		kind: 'paper',
		checked: DAY
	},
	{
		id: 'man-ss',
		title: 'ss(8)',
		url: 'https://man7.org/linux/man-pages/man8/ss.8.html',
		kind: 'man',
		checked: DAY
	},
	{
		id: 'man-tc-fq',
		title: 'tc-fq(8)',
		url: 'https://man7.org/linux/man-pages/man8/tc-fq.8.html',
		kind: 'man',
		checked: DAY
	},
	{
		id: 'man-ethtool',
		title: 'ethtool(8)',
		url: 'https://man7.org/linux/man-pages/man8/ethtool.8.html',
		kind: 'man',
		checked: DAY
	},
	{
		id: 'man-tcp',
		title: 'tcp(7)',
		url: 'https://man7.org/linux/man-pages/man7/tcp.7.html',
		kind: 'man',
		checked: DAY
	},
	{
		id: 'nginx-core',
		title: 'nginx ngx_http_core_module（tcp_nodelay・tcp_nopush）',
		url: 'https://nginx.org/en/docs/http/ngx_http_core_module.html',
		kind: 'doc',
		checked: DAY
	},
	{
		id: 'systemd-sysctl',
		title: 'systemd sysctl.d/50-default.conf',
		url: 'https://github.com/systemd/systemd/blob/main/sysctl.d/50-default.conf',
		kind: 'source',
		checked: DAY
	},
	linux('linux-socket', 'net/socket.c'),
	linux('linux-tcp', 'net/ipv4/tcp.c'),
	linux('linux-tcp-output', 'net/ipv4/tcp_output.c'),
	linux('linux-tcp-input', 'net/ipv4/tcp_input.c'),
	linux('linux-tcp-ipv4', 'net/ipv4/tcp_ipv4.c'),
	linux('linux-tcp-timer', 'net/ipv4/tcp_timer.c'),
	linux('linux-tcp-offload', 'net/ipv4/tcp_offload.c'),
	linux('linux-tcp-cubic', 'net/ipv4/tcp_cubic.c'),
	linux('linux-tcp-cong', 'net/ipv4/tcp_cong.c'),
	linux('linux-tcp-bbr', 'net/ipv4/tcp_bbr.c'),
	linux('linux-ip-output', 'net/ipv4/ip_output.c'),
	linux('linux-ip-input', 'net/ipv4/ip_input.c'),
	linux('linux-neigh', 'include/net/neighbour.h'),
	linux('linux-dev', 'net/core/dev.c'),
	linux('linux-gro', 'net/core/gro.c'),
	linux('linux-skbuff-c', 'net/core/skbuff.c'),
	linux('linux-sock', 'net/core/sock.c'),
	linux('linux-skbuff', 'include/linux/skbuff.h'),
	linux('linux-tcp-h', 'include/linux/tcp.h'),
	linux('linux-sock-h', 'include/net/sock.h'),
	linux('linux-net-tcp-h', 'include/net/tcp.h'),
	linux('linux-sch-generic', 'net/sched/sch_generic.c'),
	linux('linux-fq', 'net/sched/sch_fq.c'),
	linux('linux-fq-codel', 'net/sched/sch_fq_codel.c'),
	linux('linux-ixgbe', 'drivers/net/ethernet/intel/ixgbe/ixgbe_main.c'),
	linux('linux-sysctl', 'Documentation/networking/ip-sysctl.rst')
];

/** 関数・構造体の名前（版は全て v6.12） */
function fn(
	name: string,
	where: string,
	ref: string,
	context?: ImplContext,
	kind: Impl['kind'] = 'function'
): Impl {
	return { name, kind, where, project: 'linux', version: V, ref, ...(context ? { context } : {}) };
}
const I = {
	sendto: fn('__sys_sendto()', 'net/socket.c', 'linux-socket', 'syscall'),
	sendmsg: fn('tcp_sendmsg_locked()', 'net/ipv4/tcp.c', 'linux-tcp', 'syscall'),
	push: fn('tcp_push()', 'net/ipv4/tcp.c', 'linux-tcp', 'syscall'),
	wx: fn('tcp_write_xmit()', 'net/ipv4/tcp_output.c', 'linux-tcp-output', 'syscall'),
	wxSoft: fn('tcp_write_xmit()', 'net/ipv4/tcp_output.c', 'linux-tcp-output', 'softirq'),
	tx: fn('tcp_transmit_skb()', 'net/ipv4/tcp_output.c', 'linux-tcp-output', 'syscall'),
	defer: fn('tcp_tso_should_defer()', 'net/ipv4/tcp_output.c', 'linux-tcp-output', 'syscall'),
	tsqCheck: fn('tcp_small_queue_check()', 'net/ipv4/tcp_output.c', 'linux-tcp-output', 'syscall'),
	nagle: fn('tcp_nagle_test()', 'net/ipv4/tcp_output.c', 'linux-tcp-output', 'syscall'),
	newData: fn('tcp_event_new_data_sent()', 'net/ipv4/tcp_output.c', 'linux-tcp-output', 'syscall'),
	clone: fn('skb_clone()', 'net/core/skbuff.c', 'linux-skbuff-c', 'syscall'),
	connect: fn('tcp_v4_connect()', 'net/ipv4/tcp_ipv4.c', 'linux-tcp-ipv4', 'syscall'),
	tcpConnect: fn('tcp_connect()', 'net/ipv4/tcp_output.c', 'linux-tcp-output', 'syscall'),
	ipq: fn('ip_queue_xmit()', 'net/ipv4/ip_output.c', 'linux-ip-output', 'syscall'),
	ipf2: fn('ip_finish_output2()', 'net/ipv4/ip_output.c', 'linux-ip-output', 'syscall'),
	neigh: fn('neigh_output()', 'include/net/neighbour.h', 'linux-neigh', 'syscall'),
	devq: fn('__dev_queue_xmit()', 'net/core/dev.c', 'linux-dev', 'syscall'),
	fqEnq: fn('fq_enqueue()', 'net/sched/sch_fq.c', 'linux-fq', 'syscall'),
	fqDeq: fn('fq_dequeue()', 'net/sched/sch_fq.c', 'linux-fq', 'syscall'),
	direct: fn('sch_direct_xmit()', 'net/sched/sch_generic.c', 'linux-sch-generic', 'syscall'),
	drv: fn(
		'ixgbe_xmit_frame_ring()',
		'drivers/net/ethernet/intel/ixgbe/ixgbe_main.c',
		'linux-ixgbe',
		'syscall'
	),
	tso: fn('ixgbe_tso()', 'drivers/net/ethernet/intel/ixgbe/ixgbe_main.c', 'linux-ixgbe', 'syscall'),
	irq: fn(
		'ixgbe_msix_clean_rings()',
		'drivers/net/ethernet/intel/ixgbe/ixgbe_main.c',
		'linux-ixgbe',
		'hardirq'
	),
	rxAction: fn('net_rx_action()', 'net/core/dev.c', 'linux-dev', 'softirq'),
	poll: fn(
		'ixgbe_poll()',
		'drivers/net/ethernet/intel/ixgbe/ixgbe_main.c',
		'linux-ixgbe',
		'softirq'
	),
	gro: fn('napi_gro_receive()', 'net/core/gro.c', 'linux-gro', 'softirq'),
	groTcp: fn('tcp_gro_receive()', 'net/ipv4/tcp_offload.c', 'linux-tcp-offload', 'softirq'),
	ipRcv: fn('ip_rcv()', 'net/ipv4/ip_input.c', 'linux-ip-input', 'softirq'),
	v4rcv: fn('tcp_v4_rcv()', 'net/ipv4/tcp_ipv4.c', 'linux-tcp-ipv4', 'softirq'),
	est: fn('tcp_rcv_established()', 'net/ipv4/tcp_input.c', 'linux-tcp-input', 'softirq'),
	ack: fn('tcp_ack()', 'net/ipv4/tcp_input.c', 'linux-tcp-input', 'softirq'),
	clean: fn('tcp_clean_rtx_queue()', 'net/ipv4/tcp_input.c', 'linux-tcp-input', 'softirq'),
	backlog: fn('tcp_add_backlog()', 'net/ipv4/tcp_ipv4.c', 'linux-tcp-ipv4', 'softirq'),
	release: fn('release_sock()', 'net/core/sock.c', 'linux-sock', 'syscall'),
	cleanTx: fn(
		'ixgbe_clean_tx_irq()',
		'drivers/net/ethernet/intel/ixgbe/ixgbe_main.c',
		'linux-ixgbe',
		'softirq'
	),
	consume: fn('napi_consume_skb()', 'net/core/skbuff.c', 'linux-skbuff-c', 'softirq'),
	wfree: fn('tcp_wfree()', 'net/ipv4/tcp_output.c', 'linux-tcp-output', 'softirq'),
	tasklet: fn('tcp_tasklet_func()', 'net/ipv4/tcp_output.c', 'linux-tcp-output', 'tasklet'),
	tsqHandler: fn('tcp_tsq_handler()', 'net/ipv4/tcp_output.c', 'linux-tcp-output', 'tasklet'),
	releaseCb: fn('tcp_release_cb()', 'net/ipv4/tcp_output.c', 'linux-tcp-output', 'syscall'),
	retrans: fn('tcp_retransmit_skb()', 'net/ipv4/tcp_output.c', 'linux-tcp-output', 'softirq'),
	rtoTimer: fn('tcp_retransmit_timer()', 'net/ipv4/tcp_timer.c', 'linux-tcp-timer', 'softirq'),
	fastAlert: fn('tcp_fastretrans_alert()', 'net/ipv4/tcp_input.c', 'linux-tcp-input', 'softirq'),
	enterLoss: fn('tcp_enter_loss()', 'net/ipv4/tcp_input.c', 'linux-tcp-input', 'softirq'),
	cubic: fn('cubictcp_cong_avoid()', 'net/ipv4/tcp_cubic.c', 'linux-tcp-cubic', 'softirq'),
	slowStart: fn('tcp_slow_start()', 'net/ipv4/tcp_cong.c', 'linux-tcp-cong', 'softirq'),
	pacing: fn('tcp_update_pacing_rate()', 'net/ipv4/tcp_input.c', 'linux-tcp-input', 'softirq'),
	skb: fn('sk_buff', 'include/linux/skbuff.h', 'linux-skbuff', undefined, 'struct'),
	shinfo: fn('skb_shared_info', 'include/linux/skbuff.h', 'linux-skbuff', undefined, 'struct'),
	tcpSock: fn('tcp_sock', 'include/linux/tcp.h', 'linux-tcp-h', undefined, 'struct'),
	sock: fn('sock', 'include/net/sock.h', 'linux-sock-h', undefined, 'struct'),
	limitOut: fn(
		'tcp_limit_output_bytes',
		'Documentation/networking/ip-sysctl.rst',
		'linux-sysctl',
		undefined,
		'setting'
	),
	initCwnd: fn('TCP_INIT_CWND', 'include/net/tcp.h', 'linux-net-tcp-h', undefined, 'setting')
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
const SNDBUF = 'sk_sndbuf 87,040 B';
const B = {
	mem: (skb: string[], frags: string[]) =>
		band('mem', '構造体（つながり 1 本の持ち物）', [
			box('b_sock', I.tcpSock),
			box('b_skb', I.skb, [
				q('skbv', '線形部（head〜end）', skb),
				q('frags', 'frags（最大 17 個）', frags)
			])
		]),
	sys: (wq: string[], extra: Box[] = []) =>
		band('sys', 'システムコール（プロセスの文脈）', [
			box('b_send', I.sendto),
			box('b_sendmsg', I.sendmsg, [q('wq', '送信キュー', wq, SNDBUF)]),
			...extra
		]),
	tcp: (rtx: string[]) =>
		band('tcp', 'TCP の出口', [
			box('b_wx', I.wx),
			box('b_tx', I.tx, [q('rtx', '再送キュー', rtx)])
		]),
	ip: () => band('ip', 'IP と近隣', [box('b_ip', I.ipq), box('b_neigh', I.neigh)]),
	qd: (fq: string[], pf?: string[]) =>
		band('qd', 'qdisc（線に出る前の待ち行列）', [
			box('b_dev', I.devq, [
				q('qfq', 'fq（送る時刻の順）', fq),
				...(pf ? [q('qpf', 'pfifo（来た順）', pf)] : [])
			])
		]),
	drv: (ring: string[], wire: string[]) =>
		band('drv', 'ドライバと NIC', [
			box('b_drv', I.drv, [q('ring', '送信リング', ring, '記述子 512 個')]),
			box('b_tso', I.tso, [q('wire', '線に出たフレーム', wire)])
		]),
	irq: () => band('irq', '割り込み（hardirq）', [box('b_irq', I.irq)]),
	rx: (gro: string[]) =>
		band('rx', 'softirq（NET_RX）：NAPI と GRO', [
			box('b_poll', I.poll),
			box('b_gro', I.gro, [q('gro', 'GRO の束', gro)])
		]),
	rcv: () =>
		band('rcv', 'TCP の受け取り', [box('b_v4', I.v4rcv), box('b_est', I.est), box('b_ack', I.ack)]),
	done: (tsq: string[]) =>
		band('done', '送り終えた後（TSQ）', [
			box('b_wfree', I.wfree),
			box('b_tsq', I.tasklet, [q('tsq', 'TSQ を待つ sock', tsq)])
		])
};

// ---- 本物のバイト列（検査 21） ----
const APP = { mac: '52:54:00:00:00:05', ip: '10.0.0.5', port: 43210 };
const STORE = { mac: '52:54:00:00:00:09', ip: '10.0.0.9', port: 9000 };
const ISN = 2717001000;
const PEER_ISN = 1593000000;
const synPacket = tcpPacket({
	name: 'TCP SYN（app-1 → store-1）',
	src: APP,
	dst: STORE,
	seq: ISN,
	ack: 0,
	flags: ['SYN'],
	window: 64240,
	ipId: 0x6a1c,
	options: tcpOptions({ mss: 1460, sack: true, ts: [3000, 0], ws: 7 })
});
const ackPacket = tcpPacket({
	name: 'TCP ACK（store-1 → app-1。ack 14481 番まで受け取った）',
	src: STORE,
	dst: APP,
	seq: PEER_ISN + 1,
	ack: ISN + 1 + 14480,
	flags: ['ACK'],
	window: 502,
	ipId: 0x1f40,
	options: tcpOptions({ ts: [5004, 3011] })
});

export { APP, STORE, ISN, PEER_ISN, sources, I, B, synPacket, ackPacket };
