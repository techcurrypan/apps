// 見本 1（net-101）のステップ 5〜8：clone と再送キュー・IP と近隣 / qdisc とドライバと TSO / ACK の受け取り / 送り終えた後と TSQ。
import type { Step } from '../../lesson/types.ts';
import { ackPacket, B, I } from './tcp-base.ts';

const conn = {
	id: 'c-store',
	depth: 1 as const,
	what: 'TCP 10.0.0.5:43210 → 10.0.0.9:9000',
	state: 'ESTABLISHED'
};

export const s5: Step = {
	n: 5,
	kind: 'internals',
	short: 'clone',
	title: 'clone して再送キューへ',
	lead: '線に出るのは写しの表。元の skb は ACK まで再送キューに残る',
	body: [
		'tcp_transmit_skb() は A1 を clone し、写しに TCP の頭を付けて IP へ渡す。',
		'元の A1 は再送キューへ移り、ACK が来るまで残る。'
	],
	depth: {
		intro: [
			'A1 をそのまま下へ流すと、途中で落ちた時に送り直す物が手元に残らない。そこでカーネルは A1 の「写しの表」を作り、写しの方を下へ流す。',
			'元の A1 は再送キューで ACK を待つ。写しは線に出たら捨てられる。中身のページは 1 つで、2 つの表が同じページを指す。'
		],
		work: [
			'tcp_transmit_skb() は skb_clone() で A1 の写し A1c を作る。写しは 256 B ほどの頭書きだけで、14,480 B のデータは写さない。',
			'写しに TCP の頭 32 B（時刻の印を含む）を付け、ip_queue_xmit() へ渡す。元の A1 は tcp_event_new_data_sent() で送信キューから再送キューへ移り、未 ACK は 10 個になる。',
			'IP の層は経路を引き、頭 20 B を付ける。宛先 10.0.0.9 は同じ網なので、次の機械は相手そのものだ。',
			'neigh_output() は近隣の表で 10.0.0.9 の MAC を引く。表が REACHABLE なら、作り置きの Ethernet の頭 14 B を写して次へ進む。'
		],
		deep: [
			'v6.12 の tcp_write_xmit() は tcp_transmit_skb(sk, skb, 1, gfp) を呼ぶ。3 つ目の 1 が clone_it だ。元の skb が下の層でまだ使われていれば pskb_copy()、そうでなければ skb_clone() で写しを作る。',
			'写しには skb->destructor = tcp_wfree が付く。写しの truesize は sk_wmem_alloc に足され、線に出て解放される時に tcp_wfree() で引かれる。この数が、後で見る TSQ の物差しになる。',
			'tcp_event_new_data_sent() は __skb_unlink() で送信キューから外す。tcp_rbtree_insert() で tcp_rtx_queue に入れる。packets_out に 10 を足し、再送の時計（RTO）が止まっていれば動かす。',
			'ip_queue_xmit() は sk の経路の控え（sk_dst_cache）を使い、無ければ引き直す。頭を付けて ip_local_out() に渡し、netfilter の OUTPUT と POSTROUTING を通す。その後 ip_finish_output2() から neigh_output() へ進む。',
			'近隣の表が REACHABLE なら neigh_hh_output() で頭を写すだけで済む。表に無いか古ければ neigh_resolve_output() が skb を近隣の待ち行列に置き、ARP の問いを送る。答えが来るまで、この skb は待つ。'
		]
	},
	callout: {
		type: 'tip',
		text: '再送キューの元の skb と、線に出る写しは、同じデータのページを共有する。だから送り直しても、ユーザーのデータを写し直さない。'
	},
	changes: [
		{ mark: '+', text: '写し A1c が IP へ下りた' },
		{ mark: '~', text: 'A1 が送信キューから再送キューへ' },
		{ mark: '+', text: '頭 32 ＋ 20 ＋ 14 B が付いた' }
	],
	facts: [
		{ k: '写しの頭書き', v: '約 256 B（データは写さない）' },
		{ k: '未 ACK', v: '10 個（14,480 B）' },
		{ k: '送信キューの残り', v: '51,056 B' },
		{ k: '次の機械', v: '10.0.0.9 = 52:54:00:00:00:09（REACHABLE）' }
	],
	scene: [{ op: 'change', id: 'app', k: '再送キュー', v: '10 個' }],
	log: {
		t: '0.010s',
		from: 'app',
		to: 'app',
		kind: 'kernel',
		info: 'A1 を clone。A1c は IP へ、A1 は再送キューへ（未 ACK 10 個）'
	},
	town: '荷の控えを帳場に残し、写しの送り状を付けた荷だけを台車に載せる',
	work: 'ip neigh show 10.0.0.9 で REACHABLE か、FAILED かを見る',
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					{ id: 'p-backup', depth: 0, what: 'backup（pid 4120）', state: 'send() の中（syscall）' },
					conn,
					{ id: 'q-wq', depth: 2, what: 'sk_write_queue', state: 'A2 17,376・B 31,856・C 1,824' },
					{ id: 'q-rtx', depth: 2, what: 'tcp_rtx_queue', state: 'A1（10 個）', tone: 'warn' },
					{ id: 'n-store', depth: 1, what: '近隣 10.0.0.9', state: '52:54:00:00:00:09 REACHABLE' }
				]
			}
		]
	},
	metrics: { wq: '51,056 B', rtx: '10 個' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_sendmsg', 'b_wx', 'b_tx'] } },
		{
			at: 400,
			dur: 700,
			para: 0,
			do: { op: 'packet', a: 'b_wx', b: 'b_tx', label: 'A1', kind: 'data' }
		},
		{ at: 1200, dur: 600, para: 0, do: { op: 'clone', item: 'A1 14480', as: 'A1c' } },
		{ at: 1300, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{ at: 1900, dur: 450, para: 1, do: { op: 'badge', id: 'b_tx', text: 'TCP の頭 32 B' } },
		{ at: 2400, dur: 400, para: 1, do: { op: 'dequeue', queue: 'wq', item: 'A1c' } },
		{
			at: 2500,
			dur: 800,
			para: 1,
			do: { op: 'packet', a: 'b_tx', b: 'b_ip', label: 'A1c', kind: 'data' }
		},
		{ at: 3300, dur: 700, para: 1, do: { op: 'move', item: 'A1 14480', from: 'wq', to: 'rtx' } },
		{ at: 3400, dur: 800, para: 1, do: { op: 'count', metric: 'rtx', to: '10 個' } },
		{ at: 3500, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 3700, dur: 800, para: 1, do: { op: 'count', metric: 'wq', to: '51,056 B' } },
		{ at: 4400, dur: 900, para: 2, do: { op: 'camera', fit: ['b_tx', 'b_ip', 'b_neigh'] } },
		{
			at: 4700,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'b_ip', text: 'IP の頭 20 B・宛先 10.0.0.9' }
		},
		{ at: 4800, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{
			at: 5300,
			dur: 800,
			para: 3,
			do: { op: 'packet', a: 'b_ip', b: 'b_neigh', label: 'A1c', kind: 'data' }
		},
		{
			at: 6100,
			dur: 450,
			para: 3,
			do: { op: 'badge', id: 'b_neigh', text: 'REACHABLE・Ethernet 14 B' }
		},
		{ at: 6200, dur: 400, para: 3, do: { op: 'board', line: 3 } }
	],
	loop: [
		{ at: 0, dur: 600, do: { op: 'peek', queue: 'rtx', item: 'A1 14480' } },
		{ at: 800, dur: 800, do: { op: 'packet', a: 'b_tx', b: 'b_ip', label: '写し', kind: 'data' } },
		{
			at: 1600,
			dur: 800,
			do: { op: 'packet', a: 'b_ip', b: 'b_neigh', label: '写し', kind: 'data' }
		}
	],
	board: [
		'skb_clone()：表だけを写す',
		'元の A1 → tcp_rtx_queue（未 ACK 10 個）',
		'ip_queue_xmit()：経路と IP の頭',
		'neigh_output()：MAC を引いて頭を写す'
	],
	badges: { b_neigh: 'REACHABLE・Ethernet 14 B' },
	layers: [B.sys(['A1 14480', 'A2 17376', 'B 31856', 'C 1824']), B.tcp([]), B.ip()],
	impl: [I.sendto, I.sendmsg, I.wx, I.tx, I.clone, I.newData, I.ipq, I.ipf2, I.neigh],
	refs: ['linux-tcp-output', 'linux-ip-output', 'linux-neigh', 'linux-skbuff-c'],
	learns: [0, 2]
};

export const s6: Step = {
	n: 6,
	kind: 'internals',
	short: 'qdisc',
	title: 'qdisc とドライバと TSO',
	lead: 'fq が送る時刻を守り、NIC が 14,480 B を 10 枚に割る',
	body: [
		'写しは qdisc の fq に入り、送る時刻が来たら送信リングへ移る。',
		'NIC は TSO で 14,480 B を 1,514 B のフレーム 10 枚に割って線に出す。'
	],
	depth: {
		intro: [
			'線に出る前に、写しは qdisc という待ち行列を通る。qdisc は、どの流れの荷をいつ出すかを決める係だ。',
			'次に NIC への渡し口（送信リング）に置かれる。NIC は大きな塊を受け取り、線に合う 1,514 B のフレーム 10 枚に自分で割って送る。'
		],
		work: [
			'__dev_queue_xmit() は写しを qdisc の fq に入れる。fq は流れごとに列を分け、skb に書かれた送る時刻（EDT）の順に出す。この 10 個は接続の最初の 10 区切りなので時刻を待たず、すぐ出る。',
			'11 個目からは、TCP が送る速さに合わせて時刻を後ろへずらす。送る速さは cwnd 10 × 1,448 B ÷ 0.5 ms の 2 倍で 57.9 MB/s。直後は貸し（credit）で半分の 125 µs 後だ。',
			'fq に溜まった量（backlog）は tc -s qdisc で見え、今は 0 B だ。fq から出た写しは ixgbe_xmit_frame_ring() が送信リングの記述子に載せる。ixgbe の既定は 512 個だ。',
			'ixgbe_tso() が「MSS 1,448 で割れ」という記述子を書き、NIC が 14,480 B を 10 枚に割る。1 枚は 1,448 ＋ 32 ＋ 20 ＋ 14 ＝ 1,514 B だ。'
		],
		deep: [
			'fq_enqueue() は skb->tstamp を見て fq_skb_cb(skb)->time_to_send に写す。時刻が今より 10 秒（horizon）以上先なら捨てる。流れの列は時刻の順に並び、fq_dequeue() は時刻の来た流れだけを Deficit Round Robin（1 回 2 × MTU）で回す。',
			'TCP は送るたびに tcp_update_skb_after_send() を呼ぶ。tcp_wstamp_ns を len ÷ sk_pacing_rate だけ進める。ただし data_segs_out が 10 未満の間は進めない（最初の 10 区切りはペーシングしない）。空いていた時間の分は、len_ns の半分までを貸し（credit）として引く（EDT の方式）。',
			'sk_pacing_rate は tcp_update_pacing_rate() が決める。元は cwnd × MSS ÷ srtt だ。cwnd が ssthresh の半分より小さい間は tcp_pacing_ss_ratio の 200% を掛ける。それ以外は tcp_pacing_ca_ratio の 120% だ。',
			'fq_codel は流れごとに列を分けるが、時刻ではなく、列に居た時間が 5 ms（target）を 100 ms（interval）超え続けたら捨てる。Ubuntu などは systemd が既定の qdisc を fq_codel にする。',
			'TSO の大きさは tcp_tso_autosize() が決める。元は sk_pacing_rate の 1/1024（約 1 ms 分）で、min_rtt に応じた足し分を加える。上限は gso_max_size の 64 KiB だ。RTT 0.5 ms では min_rtt >> 9 が 0 になり、64 KiB の塊まで許される。'
		]
	},
	callout: {
		type: 'point',
		text: 'CPU は 10 枚分の仕事を 1 回で済ませ、割るのは NIC。送り手の tcpdump は割る前を取るので、14,480 B の 1 行に見える。'
	},
	changes: [
		{ mark: '+', text: 'fq に A1c（時刻＝今）' },
		{ mark: '~', text: '送信リングの記述子に載った' },
		{ mark: '+', text: 'TSO で 1,514 B のフレーム 10 枚' }
	],
	facts: [
		{
			k: '送る速さ（ペーシング）',
			v: '57.9 MB/s（2 × 10 × 1,448 B ÷ 0.5 ms）',
			calc: '2*10*1448/0.0005/1000000'
		},
		{ k: '次の塊の時刻', v: '125 µs 後（14,480 B ÷ 57.9 MB/s の半分）', calc: '14480/57.92/2' },
		{ k: 'フレーム 1 枚', v: '1,514 B（1,448 ＋ 32 ＋ 20 ＋ 14）', calc: '1448+32+20+14' },
		{ k: 'フレームの数', v: '10 枚（14,480 B ÷ 1,448 B）', calc: '14480/1448' }
	],
	scene: [
		{ op: 'move', from: 'app', to: 'sw', payload: 'フレーム 10 枚', kind: 'data' },
		{ op: 'move', from: 'sw', to: 'peer', payload: 'フレーム 10 枚', kind: 'data' }
	],
	log: {
		t: '0.010s',
		from: 'app',
		to: 'peer',
		kind: 'data',
		info: 'TSO：14,480 B を 1,514 B × 10 枚に割って線へ',
		size: '15,140 B'
	},
	town: '出口の係が台車の順番と出る時刻を決め、門で荷を 10 箱に分けて送り出す',
	work: 'tc -s qdisc show dev eth0 で fq の backlog と throttled を見る',
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					conn,
					{ id: 'q-rtx', depth: 2, what: 'tcp_rtx_queue', state: 'A1（10 個）' },
					{ id: 'd-qdisc', depth: 1, what: 'qdisc fq（eth0）', state: 'backlog 0b 0p' },
					{
						id: 'd-ring',
						depth: 1,
						what: 'eth0 送信リング',
						state: '記述子 3 個使用中（文脈・頭・断片）'
					}
				]
			}
		],
		logs: [
			{
				t: '10:15:01.010200',
				src: 'tcpdump',
				text: '10:15:01.010200 IP 10.0.0.5.43210 > 10.0.0.9.9000: Flags [.], seq 1:14481, ack 1, win 502, options [nop,nop,TS val 3010 ecr 5000], length 14480'
			}
		]
	},
	metrics: { qd: '0 B' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_neigh', 'b_dev'] } },
		{
			at: 400,
			dur: 700,
			para: 0,
			do: { op: 'packet', a: 'b_neigh', b: 'b_dev', label: 'A1c', kind: 'data' }
		},
		{ at: 1100, dur: 500, para: 0, do: { op: 'enqueue', queue: 'qfq', item: 'A1c' } },
		{ at: 1200, dur: 450, para: 0, do: { op: 'badge', id: 'b_dev', text: 'time_to_send ＝ 今' } },
		{ at: 1300, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 2000,
			dur: 450,
			para: 1,
			do: { op: 'badge', id: 'b_dev', text: '次の塊は +250 µs', tone: 'warn' }
		},
		{ at: 2100, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 2800, dur: 900, para: 2, do: { op: 'camera', fit: ['b_dev', 'b_drv', 'b_tso'] } },
		{ at: 3200, dur: 700, para: 2, do: { op: 'move', item: 'A1c', from: 'qfq', to: 'ring' } },
		{ at: 3300, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 4100, dur: 700, para: 3, do: { op: 'move', item: 'A1c', from: 'ring', to: 'wire' } },
		{
			at: 4900,
			dur: 800,
			para: 3,
			do: { op: 'split', item: 'A1c', into: ['F1', 'F2', 'F3', 'F4〜9', 'F10'] }
		},
		{ at: 5000, dur: 400, para: 3, do: { op: 'board', line: 3 } },
		{
			at: 5800,
			dur: 900,
			para: 3,
			do: { op: 'packet', a: 'b_tso', b: 'sw', label: '1,514 B × 10', kind: 'data' }
		},
		{
			at: 6700,
			dur: 900,
			para: 3,
			do: { op: 'packet', a: 'sw', b: 'peer', label: '1,514 B × 10', kind: 'data' }
		}
	],
	loop: [
		{ at: 0, dur: 700, do: { op: 'packet', a: 'b_tso', b: 'sw', label: 'F', kind: 'data' } },
		{ at: 300, dur: 700, do: { op: 'packet', a: 'sw', b: 'peer', label: 'F', kind: 'data' } },
		{ at: 900, dur: 600, do: { op: 'peek', queue: 'wire', item: 'F10' } }
	],
	board: [
		'fq_enqueue()：最初の 10 個は時刻＝今',
		'11 個目から len ÷ 57.9 MB/s ずつ後ろ',
		'ixgbe_xmit_frame_ring()：記述子に載せる',
		'TSO：14,480 B → 1,514 B × 10 枚'
	],
	badges: { b_dev: '次の塊は +250 µs' },
	layers: [B.ip(), B.qd([]), B.drv([], [])],
	impl: [I.ipq, I.neigh, I.devq, I.fqEnq, I.fqDeq, I.direct, I.drv, I.tso],
	refs: [
		'linux-fq',
		'linux-fq-codel',
		'linux-tcp-output',
		'linux-tcp-input',
		'linux-ixgbe',
		'man-tc-fq',
		'rfc8290'
	],
	learns: [2]
};

export const s7: Step = {
	n: 7,
	kind: 'internals',
	short: 'ACK の道',
	title: 'ACK が送りを続けさせる',
	lead: '割り込み → softirq → tcp_ack() → 次の 20 個',
	body: [
		'ACK は割り込みで知らされ、softirq の NAPI が取り出して TCP へ渡す。',
		'tcp_ack() が A1 を再送キューから外し、cwnd を 20 にして次を送らせる。'
	],
	depth: {
		intro: [
			'store-1 は 10 枚をまとめて受け取り、「14,480 B まで受け取った」という ACK を 1 つ返す。0.5 ms 後、それが app-1 の NIC に着く。',
			'NIC は CPU を呼び、カーネルは ACK を TCP まで運ぶ。TCP は控えの A1 を捨て、次は 20 個を送ってよいと決める。'
		],
		work: [
			'store-1 の側では GRO が 10 枚を 14,480 B の 1 個の skb にまとめる。TCP はまとめた 1 個に ACK を 1 つ返す。',
			'app-1 の NIC は割り込みを上げる。hardirq の ixgbe_msix_clean_rings() は napi_schedule だけをして、すぐ戻る。取り出しは softirq の net_rx_action() が ixgbe_poll() を呼んで行う。',
			'ACK は napi_gro_receive() に入るが、データの無い ACK はまとめない。ip_rcv() を経て tcp_v4_rcv() へ渡る。',
			'tcp_rcv_established() から tcp_ack() が呼ばれ、tcp_clean_rtx_queue() が A1 を外して解放する。未 ACK は 0 個、cwnd は 10 から 20 へ増え、tcp_write_xmit() へ戻る。'
		],
		deep: [
			'NAPI は割り込みのたびに 1 個ずつ取らず、softirq の中で一度に最大 64 個（weight）を取る。net_rx_action() の 1 回の持ち分は netdev_budget の 300 個か、2 jiffy（HZ=1000 なら 2 ms）までだ。残れば次の softirq か ksoftirqd に回す。',
			'tcp_gro_receive() は、ack の番号・選択肢・旗が同じで、番号が続く区切りだけをまとめる（ack_seq を比べる）。ACK だけの区切りは中身が 0 B なので len < mss で flush され、1 個ずつ上へ渡る。',
			'tcp_v4_rcv() はソケットを引き、持ち主のプロセスが使っていなければ（!sock_owned_by_user）tcp_v4_do_rcv() へ進む。使用中なら tcp_add_backlog() で backlog に置き、持ち主が release_sock() で後から処理する。',
			'tcp_ack() は snd_una を進め、tcp_clean_rtx_queue() で再送キューの先頭から ACK された skb を外す。skb に残した送った時刻から RTT の標本を取り（tcp_ack_update_rtt()）、cong_avoid を呼ぶ。時刻の印（TS-ECR）は、再送で送った時刻が使えない時の代わりだ。',
			'スロースタートの間、tcp_slow_start() は cwnd に ACK された数（10）を足す。最後に tcp_data_snd_check() から tcp_push_pending_frames() を経て tcp_write_xmit() へ戻る。A2 の 12 個と、B を割った頭の 8 個で 20 個を送る。'
		]
	},
	callout: {
		type: 'point',
		text: 'TCP の送りを動かしているのは send() ではなく ACK。2 往復目からは、softirq が ACK を受けたついでに送っている。'
	},
	changes: [
		{ mark: '-', text: 'A1 が再送キューから消えた' },
		{ mark: '~', text: 'cwnd 10 → 20 個' },
		{ mark: '+', text: 'A2（12 個）と B1（8 個）を送る' }
	],
	facts: [
		{ k: 'ACK の大きさ', v: '66 B（Ethernet 14・IP 20・TCP 32）', calc: '14+20+32' },
		{ k: 'cwnd', v: '20 個（10 ＋ ACK された 10）', calc: '10+10' },
		{ k: '次に送る量', v: '28,960 B（20 × 1,448 B）', calc: '20*1448' },
		{ k: 'NAPI の 1 回', v: '最大 64 個（weight）' }
	],
	scene: [
		{ op: 'move', from: 'peer', to: 'sw', payload: 'ACK 14481', kind: 'ack' },
		{ op: 'move', from: 'sw', to: 'app', payload: 'ACK 14481', kind: 'ack' }
	],
	log: {
		t: '0.0105s',
		from: 'peer',
		to: 'app',
		kind: 'ack',
		info: 'ACK 14481（10 個分）。A1 を外し、cwnd 20',
		size: '66 B'
	},
	town: '届いた知らせが帳場に着くと、控えを捨て、次は 20 箱を出してよいことになる',
	work: 'ss -tim の cwnd が 10 → 20 → 40 と増え、unacked が減るのを見る',
	inside: {
		packet: ackPacket,
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					conn,
					{ id: 'q-rtx', depth: 2, what: 'tcp_rtx_queue', state: '0 個' },
					{ id: 's-cwnd', depth: 2, what: 'snd_cwnd', state: '20（飛んでいる数 0）' },
					{ id: 'q-wq', depth: 2, what: 'sk_write_queue', state: 'B2 20,272・C 1,824' }
				]
			}
		],
		logs: [
			{
				t: '10:15:01.010712',
				src: 'tcpdump',
				text: '10:15:01.010712 IP 10.0.0.9.9000 > 10.0.0.5.43210: Flags [.], ack 14481, win 502, options [nop,nop,TS val 5010 ecr 3010], length 0'
			}
		]
	},
	metrics: { cwnd: '20 個', rtx: '0 個' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['app', 'sw', 'peer'] } },
		{ at: 300, dur: 450, para: 0, do: { op: 'badge', id: 'peer', text: 'GRO：10 枚 → 1 個' } },
		{
			at: 700,
			dur: 900,
			para: 0,
			do: { op: 'packet', a: 'peer', b: 'sw', label: 'ACK 14481', kind: 'ack' }
		},
		{ at: 800, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 1600,
			dur: 900,
			para: 1,
			do: { op: 'packet', a: 'sw', b: 'b_irq', label: 'ACK', kind: 'ack' }
		},
		{ at: 2500, dur: 900, para: 1, do: { op: 'camera', fit: ['b_irq', 'b_poll', 'b_gro'] } },
		{ at: 2600, dur: 400, para: 1, do: { op: 'context', to: 'hardirq', at: 'b_irq' } },
		{
			at: 3000,
			dur: 700,
			para: 1,
			do: { op: 'packet', a: 'b_irq', b: 'b_poll', label: 'napi_schedule', kind: 'call' }
		},
		{ at: 3700, dur: 400, para: 1, do: { op: 'context', to: 'softirq', at: 'b_poll' } },
		{ at: 3800, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 4200, dur: 500, para: 2, do: { op: 'enqueue', queue: 'gro', item: 'ACK 14481' } },
		{ at: 4700, dur: 600, para: 2, do: { op: 'peek', queue: 'gro', item: 'ACK 14481' } },
		{ at: 4800, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 5400, dur: 400, para: 2, do: { op: 'dequeue', queue: 'gro', item: 'ACK 14481' } },
		{ at: 5500, dur: 900, para: 2, do: { op: 'camera', fit: ['b_v4', 'b_est', 'b_ack'] } },
		{
			at: 5700,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_gro', b: 'b_v4', label: 'ACK', kind: 'ack' }
		},
		{
			at: 6400,
			dur: 600,
			para: 3,
			do: { op: 'packet', a: 'b_v4', b: 'b_est', label: 'ACK', kind: 'ack' }
		},
		{
			at: 7000,
			dur: 600,
			para: 3,
			do: { op: 'packet', a: 'b_est', b: 'b_ack', label: 'ACK', kind: 'ack' }
		},
		{ at: 7600, dur: 900, para: 3, do: { op: 'camera', fit: ['b_ack', 'b_wx', 'b_tx'] } },
		{ at: 8000, dur: 500, para: 3, do: { op: 'dequeue', queue: 'rtx', item: 'A1 14480' } },
		{ at: 8100, dur: 800, para: 3, do: { op: 'count', metric: 'rtx', to: '0 個' } },
		{ at: 8600, dur: 800, para: 3, do: { op: 'count', metric: 'cwnd', to: '20 個' } },
		{ at: 8700, dur: 400, para: 3, do: { op: 'board', line: 3 } },
		{
			at: 9400,
			dur: 700,
			para: 3,
			do: { op: 'packet', a: 'b_ack', b: 'b_wx', label: 'tcp_data_snd_check', kind: 'call' }
		},
		{ at: 10100, dur: 400, para: 3, do: { op: 'context', to: 'softirq', at: 'b_wx' } },
		{
			at: 10300,
			dur: 700,
			para: 3,
			do: { op: 'split', item: 'B 31856', into: ['B1 11584', 'B2 20272'] }
		},
		{ at: 10400, dur: 400, para: 3, do: { op: 'board', line: 4 } }
	],
	loop: [
		{ at: 0, dur: 800, do: { op: 'packet', a: 'sw', b: 'b_irq', label: 'ACK', kind: 'ack' } },
		{
			at: 800,
			dur: 600,
			do: { op: 'packet', a: 'b_irq', b: 'b_poll', label: 'napi', kind: 'call' }
		},
		{ at: 1400, dur: 600, do: { op: 'packet', a: 'b_gro', b: 'b_v4', label: 'ACK', kind: 'ack' } },
		{ at: 2000, dur: 600, do: { op: 'packet', a: 'b_ack', b: 'b_wx', label: '送れ', kind: 'call' } }
	],
	board: [
		'store-1：GRO で 10 枚 → 1 個、ACK を 1 つ',
		'hardirq：napi_schedule だけして戻る',
		'softirq：ixgbe_poll → GRO（ACK はまとめない）',
		'tcp_ack()：A1 を外し、cwnd 10 → 20',
		'tcp_write_xmit()：A2 と B の頭 8 個で 20 個'
	],
	badges: { peer: 'GRO：10 枚 → 1 個', b_wx: '送る 20 個（softirq）' },
	layers: [
		B.sys(['A2 17376', 'B 31856', 'C 1824']),
		B.tcp(['A1 14480']),
		B.irq(),
		B.rx([]),
		B.rcv()
	],
	impl: [
		I.sendto,
		I.sendmsg,
		I.wxSoft,
		I.tx,
		I.irq,
		I.rxAction,
		I.poll,
		I.gro,
		I.groTcp,
		I.ipRcv,
		I.v4rcv,
		I.est,
		I.ack,
		I.clean,
		I.backlog,
		I.release,
		I.slowStart
	],
	refs: [
		'linux-dev',
		'linux-gro',
		'linux-tcp-offload',
		'linux-tcp-ipv4',
		'linux-tcp-input',
		'linux-tcp-cong',
		'linux-ixgbe',
		'rfc5681'
	],
	learns: [3]
};

export const s8: Step = {
	n: 8,
	kind: 'internals',
	short: 'TSQ',
	title: '送り終えた後と TSQ',
	lead: '手元の行列が 1 ms 分を超えたら止め、送り終えた知らせで再開',
	body: [
		'遠くへの写しで、手元の qdisc と NIC に 1 ms 分より多く溜まると TSQ が止める。',
		'NIC が送り終えると tcp_wfree() が tasklet を予約し、送りを再開させる。'
	],
	depth: {
		intro: [
			'ここでは遠くの拠点 dr-1（RTT 10 ms）への夜の写しを見る。送信の上限 tcp_wmem を 32 MiB に上げてあり、cwnd は 8,600 個まで育った。',
			'手元の出口に荷が溜まりすぎると、ほかの流れの荷が後ろで待たされる。そこで TCP は、出口に置いた量が約 1 ms 分を超えたら新しく置くのをやめる。これが TSQ だ。同じ部屋の store-1（RTT 0.5 ms）では cwnd 400 個の 579 KB が先に効き、TSQ は止めない。'
		],
		work: [
			'tcp_small_queue_check() は、qdisc と NIC にいる自分の写しの量（sk_wmem_alloc）を上限と比べる。上限は送る速さの 1/1024（約 1 ms 分）で、この場面では約 1.46 MB だ。',
			'隣の流れで NIC が混み、C7c〜C9c がリングに残って上限を超えた。TSQ_THROTTLED を立て、送信キューの C10 は止まる。',
			'NIC が C7c を送り終えると割り込みが上がる。softirq の ixgbe_clean_tx_irq() が napi_consume_skb() で解放する。写しに付いた tcp_wfree() が呼ばれ、ソケットを TSQ の列に入れて tasklet を予約する。',
			'tasklet の tcp_tasklet_func() が tcp_write_xmit() を呼び、C10 が送られる。持ち主のプロセスが send() の中なら、release_sock() の時まで送りを持ち越す。'
		],
		deep: [
			'上限は max(2 × skb->truesize, sk_pacing_rate >> sk_pacing_shift) だ（shift の既定は 10）。fq を使い sk_pacing_status が SK_PACING_FQ の時は、これで決まる。pfifo や fq_codel（SK_PACING_NONE）では、さらに tcp_limit_output_bytes で抑える。既定は 1,048,576 B だ。',
			'再送キューが空か 1 個だけなら、上限を超えても送る（tcp_rtx_queue_empty_or_single_skb()）。送り終えの知らせが遅れても、流れが止まりきらないためだ。',
			'tcp_wfree() は写しの truesize を sk_wmem_alloc から引く。TSQF_THROTTLED が立っていれば TSQF_QUEUED に替える。CPU ごとの tsq_tasklet の列に tsq_node をつなぎ、tasklet_schedule() する。',
			'tcp_tasklet_func() は列を外し、tcp_tsq_handler() を呼ぶ。ソケットが使用中でなければ tcp_tsq_write() → tcp_write_xmit() で送る。使用中なら TCP_TSQ_DEFERRED を立て、持ち主の release_sock() → tcp_release_cb() が後で同じ送りをする。',
			'文脈は 3 つある。send() の中（プロセス）・割り込み（hardirq）・softirq で、tasklet は softirq の一種（TASKLET_SOFTIRQ）だ。hardirq は眠れず短く、プロセスの文脈だけが眠れる。backlog と TSQ の持ち越しは、文脈の間で同じソケットを触る順を守る仕組みだ。'
		]
	},
	callout: {
		type: 'warn',
		text: '送りが止まる理由は cwnd だけではない。ss -tim の busy と notsent が多く、cwnd に余裕があるなら、手元の TSQ か qdisc で止まっている。'
	},
	changes: [
		{ mark: '~', text: 'TSQ_THROTTLED：C10 を止めた' },
		{ mark: '-', text: '送り終えた C7c を解放した' },
		{ mark: '+', text: 'tasklet（softirq）から C10 を送った' }
	],
	facts: [
		{ k: 'TSQ の上限', v: '1,459,125 B（1.49 GB/s ÷ 1,024）', calc: '1494144000/1024' },
		{
			k: '送る速さ',
			v: '1.49 GB/s（1.2 × 8,600 × 1,448 B ÷ 10 ms）',
			calc: '1.2*8600*1448/0.01/1000000000'
		},
		{ k: '飛んでいる量', v: '12,452,800 B（8,600 × 1,448 B）', calc: '8600*1448' },
		{ k: 'tcp_limit_output_bytes', v: '1,048,576 B（fq では使わない）' }
	],
	scene: [{ op: 'change', id: 'app', k: 'cwnd', v: '8,600 個' }],
	log: {
		t: '5.000s',
		from: 'app',
		to: 'app',
		kind: 'kernel',
		info: 'TSQ：手元 1.46 MB を超え C10 を止める → 送り終えて再開'
	},
	town: '遠くへ運ぶ日は、出口に置いた荷が 1 ms 分を超えたら置くのをやめ、門を出た知らせで次を置く',
	work: 'ss -tim の notsent と tc -s qdisc の backlog を並べて見る',
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					{ id: 'p-backup', depth: 0, what: 'backup（pid 4120）', state: 'send() の中（syscall）' },
					conn,
					{ id: 's-cwnd', depth: 2, what: 'snd_cwnd', state: '8600' },
					{
						id: 's-tsq',
						depth: 2,
						what: 'sk_tsq_flags',
						state: 'TSQ_THROTTLED → QUEUED',
						tone: 'warn'
					},
					{ id: 'd-ring', depth: 1, what: 'eth0 送信リング', state: 'C8c・C9c' }
				]
			}
		]
	},
	metrics: { cwnd: '8,600 個', wq: '33,554,432 B', rtx: '8,600 個', rtt: '10 ms' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_sendmsg', 'b_wx', 'b_tx'] } },
		{ at: 500, dur: 800, para: 0, do: { op: 'count', metric: 'cwnd', to: '8,600 個' } },
		{ at: 900, dur: 600, para: 0, do: { op: 'peek', queue: 'wq', item: 'C10' } },
		{
			at: 1500,
			dur: 450,
			para: 1,
			do: { op: 'badge', id: 'b_wx', text: 'TSQ_THROTTLED', tone: 'warn' }
		},
		{ at: 1600, dur: 400, para: 1, do: { op: 'board', line: 0 } },
		{ at: 2200, dur: 900, para: 2, do: { op: 'camera', fit: ['b_drv', 'b_irq', 'b_poll'] } },
		{ at: 2600, dur: 500, para: 2, do: { op: 'dequeue', queue: 'ring', item: 'C7c' } },
		{ at: 3100, dur: 400, para: 2, do: { op: 'context', to: 'hardirq', at: 'b_irq' } },
		{ at: 3200, dur: 400, para: 2, do: { op: 'board', line: 1 } },
		{
			at: 3500,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_irq', b: 'b_poll', label: 'napi_schedule', kind: 'call' }
		},
		{ at: 4200, dur: 400, para: 2, do: { op: 'context', to: 'softirq', at: 'b_poll' } },
		{ at: 4600, dur: 900, para: 2, do: { op: 'camera', fit: ['b_poll', 'b_wfree', 'b_tsq'] } },
		{
			at: 4900,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_poll', b: 'b_wfree', label: 'napi_consume_skb', kind: 'call' }
		},
		{ at: 5000, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 5700, dur: 500, para: 2, do: { op: 'enqueue', queue: 'tsq', item: 'sk app-1' } },
		{ at: 6300, dur: 400, para: 3, do: { op: 'context', to: 'tasklet', at: 'b_tsq' } },
		{ at: 6400, dur: 400, para: 3, do: { op: 'board', line: 3 } },
		{ at: 6800, dur: 400, para: 3, do: { op: 'dequeue', queue: 'tsq', item: 'sk app-1' } },
		{ at: 6900, dur: 900, para: 3, do: { op: 'camera', fit: ['b_tsq', 'b_wx', 'b_sendmsg'] } },
		{
			at: 7300,
			dur: 700,
			para: 3,
			do: { op: 'packet', a: 'b_tsq', b: 'b_wx', label: 'tcp_tsq_handler', kind: 'call' }
		},
		{ at: 8000, dur: 400, para: 3, do: { op: 'context', to: 'tasklet', at: 'b_wx' } },
		{ at: 8100, dur: 450, para: 3, do: { op: 'badge', id: 'b_wx', text: '再開（tasklet）' } },
		{ at: 8500, dur: 700, para: 3, do: { op: 'move', item: 'C10', from: 'wq', to: 'rtx' } },
		{ at: 8600, dur: 400, para: 3, do: { op: 'board', line: 4 } }
	],
	loop: [
		{
			at: 0,
			dur: 600,
			do: { op: 'packet', a: 'b_irq', b: 'b_poll', label: 'TX 完了', kind: 'call' }
		},
		{
			at: 700,
			dur: 600,
			do: { op: 'packet', a: 'b_poll', b: 'b_wfree', label: '解放', kind: 'call' }
		},
		{ at: 1400, dur: 600, do: { op: 'packet', a: 'b_tsq', b: 'b_wx', label: '再開', kind: 'call' } }
	],
	board: [
		'手元 1.46 MB を超えた → TSQ_THROTTLED',
		'送り終えた割り込み → napi_schedule',
		'softirq：解放 → tcp_wfree() → tasklet 予約',
		'tasklet：tcp_tasklet_func() → tcp_write_xmit()',
		'使用中なら release_sock() で持ち越し'
	],
	badges: { b_wx: '再開（tasklet）' },
	layers: [
		B.sys(['C10', 'C11']),
		B.tcp(['C7', 'C8', 'C9']),
		B.drv(['C7c', 'C8c', 'C9c'], []),
		B.irq(),
		B.rx([]),
		B.done([])
	],
	impl: [
		I.sendto,
		I.sendmsg,
		I.wx,
		I.tx,
		I.tsqCheck,
		I.drv,
		I.tso,
		I.irq,
		I.poll,
		I.gro,
		I.cleanTx,
		I.consume,
		I.wfree,
		I.tasklet,
		I.tsqHandler,
		I.release,
		I.releaseCb,
		I.limitOut
	],
	refs: ['linux-tcp-output', 'linux-skbuff-c', 'linux-ixgbe', 'linux-sock', 'linux-sysctl'],
	learns: [4]
};
