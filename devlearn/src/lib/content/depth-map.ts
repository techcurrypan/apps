// 検査 40（explanation-standard.md 第 3 章）：TCP を教えるレッスン群が curriculum-standard.md 6.2 の 15 項目を全て持つ。
// 項目ごとに、どのレッスンのどのステップで教えるかと、そのステップの本文・図・中身に必ず出る名前（must）を書く。
// depth-map.test.ts が、ステップが在り、名前が本文（depth）か impl か layers に出ることを確かめる。
export type DepthItem = {
	no: number;
	what: string;
	lesson: string;
	steps: number[];
	must: string[];
};

export const TCP_DEPTH: DepthItem[] = [
	{
		no: 1,
		what: 'ソケットと struct sock / tcp_sock、sk_buff の形',
		lesson: 'net-101',
		steps: [2],
		must: ['tcp_sock', 'sk_buff', 'head', 'tail', 'frags']
	},
	{
		no: 2,
		what: '接続：connect() → SYN の skb → SYN-ACK → ACK。SYN_SENT → ESTABLISHED',
		lesson: 'net-101',
		steps: [3],
		must: ['tcp_connect()', 'SYN_SENT', 'ESTABLISHED']
	},
	{
		no: 3,
		what: '送信：send() → tcp_sendmsg_locked() が skb を作り送信キューへ',
		lesson: 'net-101',
		steps: [4],
		must: ['tcp_sendmsg_locked()', 'sk_write_queue']
	},
	{
		no: 4,
		what: 'tcp_write_xmit()：送るか待つか（受信窓・cwnd・Nagle・TSO の待ち・TSQ）',
		lesson: 'net-101',
		steps: [4],
		must: ['tcp_write_xmit()', 'cwnd', 'Nagle', 'tcp_tso_should_defer()', 'tcp_small_queue_check()']
	},
	{
		no: 5,
		what: 'tcp_transmit_skb()：clone してヘッダ。元は再送キューへ',
		lesson: 'net-101',
		steps: [5],
		must: ['tcp_transmit_skb()', 'skb_clone()', 'tcp_rtx_queue']
	},
	{
		no: 6,
		what: 'IP 層と近隣（ARP）',
		lesson: 'net-101',
		steps: [5],
		must: ['ip_queue_xmit()', 'neigh_output()', 'ARP']
	},
	{
		no: 7,
		what: 'qdisc：fq_codel と fq、EDT でのペーシング、backlog',
		lesson: 'net-101',
		steps: [6],
		must: ['fq', 'fq_codel', 'EDT', 'backlog']
	},
	{
		no: 8,
		what: 'ドライバと NIC：送信リング、TSO で MSS ごとに割れる',
		lesson: 'net-101',
		steps: [6],
		must: ['ixgbe_xmit_frame_ring()', 'TSO', 'MSS']
	},
	{
		no: 9,
		what: '受信：割り込み → softirq → NAPI → GRO → IP → tcp_v4_rcv()',
		lesson: 'net-101',
		steps: [7],
		must: ['NAPI', 'napi_gro_receive()', 'net_rx_action()', 'tcp_v4_rcv()']
	},
	{
		no: 10,
		what: 'tcp_rcv_established() → tcp_ack()：再送キューから外し RTT・cwnd、tcp_write_xmit() へ戻る',
		lesson: 'net-101',
		steps: [7],
		must: ['tcp_rcv_established()', 'tcp_ack()', 'tcp_clean_rtx_queue()', 'tcp_write_xmit()']
	},
	{
		no: 11,
		what: '送信完了 → softirq で解放 → TSQ → tasklet → tcp_write_xmit()',
		lesson: 'net-101',
		steps: [8],
		must: ['tcp_wfree()', 'tcp_tasklet_func()', 'TSQ']
	},
	{
		no: 12,
		what: '実行の文脈と backlog・release_sock()',
		lesson: 'net-101',
		steps: [7, 8],
		must: ['softirq', 'hardirq', 'tasklet', 'release_sock()', 'backlog']
	},
	{
		no: 13,
		what: '失敗：喪失 → 速い再送 / RTO、受信窓 0、溜まりすぎ（bufferbloat）',
		lesson: 'net-101',
		steps: [9, 10],
		must: ['tcp_retransmit_skb()', 'RTO', '重複 ACK', 'bufferbloat', '受信窓 0']
	},
	{
		no: 14,
		what: '輻輳制御：CUBIC と BBR、cwnd とペーシング',
		lesson: 'net-101',
		steps: [11, 12],
		must: ['CUBIC', 'BBR', 'cwnd', 'ペーシング']
	},
	{
		no: 15,
		what: '運用：ss -tim・nstat・tc -s qdisc・ethtool -k・tcp_* の設定・bpftrace',
		lesson: 'net-101',
		steps: [14],
		must: ['ss -tim', 'nstat', 'tc -s qdisc', 'ethtool -k', 'tcp_limit_output_bytes', 'bpftrace']
	}
];
