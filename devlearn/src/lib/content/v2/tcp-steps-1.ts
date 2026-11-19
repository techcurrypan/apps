// 見本 1（net-101）のステップ 1〜4：問題・ソケットと skb・接続・send() から送るか待つかまで。
import type { Step } from '../../lesson/types.ts';
import { B, I, synPacket } from './tcp-base.ts';

export const s1: Step = {
	n: 1,
	kind: 'problem',
	short: '戻ったのに',
	title: 'send() は戻ったのに',
	lead: '戻った時点で、データはまだ相手に届いていない',
	body: [
		'send() は 21 µs で戻るが、相手はまだ 1 バイトも受け取っていない。',
		'データはカーネルの中で、ACK が返るまで預けられている。'
	],
	depth: {
		intro: [
			'倉庫の帳場の機械 app-1 が、記録庫の store-1 へ 64 KiB（65,536 B）の帳簿を送る。プログラムの send() は 21 µs で戻り、次の仕事に移る。',
			'だが戻った時点で、store-1 はまだ全部を受け取っていない。受け取ったという知らせ（ACK）が全て返るのは、3 往復ほど後だ。その間、データはどこにいるのか。'
		],
		work: [
			'send() が戻るのは、カーネルがデータを自分の送信キューに写し終えた時だ。相手に届いた時ではない。送信キューの上限 sk_sndbuf は、この接続では 87,040 B から始まる。',
			'送った区切りは、ACK が返るまで再送キューに残る。RTT（往復の時間）は 0.5 ms、cwnd（一度に送ってよい数）は 10 個から始まる。46 個の区切りは 10 → 20 → 16 個の 3 往復で全て ACK される。',
			'このレッスンでは、この 46 個の区切りが、どの関数・どのキュー・どの文脈を通って線に出て、ACK で消えるかを追う。'
		],
		deep: [
			'send() は sendto(2) のシステムコールで、カーネルでは __sys_sendto() から tcp_sendmsg() に入る。データは tcp_sendmsg_locked() が sk_buff（skb）に写し、ソケットの sk_write_queue に並べる。',
			'cwnd が許す分は、同じシステムコールの中で tcp_write_xmit() が送り出す。cwnd の初めの値は TCP_INIT_CWND の 10 個だ（RFC 6928）。残りは ACK が返るたびに、受け取りの softirq から送られる。',
			'送った skb は tcp_rtx_queue（再送キュー）に移り、ACK が来ると tcp_clean_rtx_queue() で外れて解放される。2 つのキューの合計は sk_wmem_queued で数え、sk_sndbuf を超えると send() は待たされる。',
			'sk_sndbuf の 87,040 B は tcp_sndbuf_expand() の式で決まる。1 区切りあたり 4,352 B の見積もりに、初めの 10 個と、速い再送の余裕の 2 倍を掛けた値だ。上限は tcp_wmem の 3 つ目（RAM に応じて 64 KiB〜4 MiB）。'
		]
	},
	callout: {
		type: 'point',
		text: 'send() の戻り値は「カーネルが預かった量」で、「相手に届いた量」ではない。届いたかは ACK で分かる。'
	},
	changes: [
		{ mark: '+', text: '送信キューに 65,536 B が入った' },
		{ mark: '~', text: 'cwnd 10 個から送り始める' }
	],
	facts: [
		{ k: '送る量', v: '65,536 B' },
		{ k: 'send() が戻るまで', v: '21 µs' },
		{ k: '区切りの数', v: '46 個（1,448 B × 45 ＋ 376 B）', calc: '45+1' },
		{ k: 'RTT', v: '0.5 ms' }
	],
	scene: [
		{ op: 'appear', id: 'app', label: 'app-1', sub: '10.0.0.5', at: [0, 0] },
		{ op: 'appear', id: 'sw', label: 'ラックのスイッチ', sub: '10 GbE', at: [1, 0] },
		{ op: 'appear', id: 'peer', label: 'store-1', sub: '10.0.0.9', at: [2, 0] },
		{ op: 'move', from: 'app', to: 'sw', payload: 'データ', kind: 'data' },
		{ op: 'move', from: 'sw', to: 'peer', payload: 'データ', kind: 'data' }
	],
	log: {
		t: '0.000s',
		from: 'app',
		to: 'peer',
		kind: 'data',
		info: 'send(65536) が 21 µs で戻る。届くのは 3 往復の後'
	},
	why: 'send() が届くまで待つと、遠い相手ほどプログラムが止まる。だからカーネルが預かって後で送る',
	town: '帳場は荷を倉の出口に預けた時点で次の仕事に戻る。届いた知らせは後で来る',
	work: 'ss -tim の notsent と unacked で、預けた量と未 ACK を見る',
	ask: {
		q: 'send() が戻った瞬間、65,536 B の大半はどこにある？',
		opts: ['store-1 のメモリ', 'app-1 のカーネルの送信キュー', 'スイッチの中'],
		a: 1,
		why: 'send() はカーネルの送信キューに写し終えた所で戻る。線に出たのは cwnd の 10 個だけ。'
	},
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					{ id: 'p-backup', depth: 0, what: 'backup（pid 4120）', state: 'send() から戻った' },
					{
						id: 'c-store',
						depth: 1,
						what: 'TCP 10.0.0.5:43210 → 10.0.0.9:9000',
						state: 'ESTABLISHED'
					},
					{ id: 'q-wq', depth: 2, what: 'sk_write_queue', state: '65,536 B', tone: 'warn' }
				]
			}
		]
	},
	metrics: { cwnd: '10 個', wq: '65,536 B', rtx: '0 個', rtt: '0.5 ms', qd: '0 B' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['app', 'sw', 'peer'] } },
		{ at: 0, dur: 500, para: 0, do: { op: 'pulse', id: 'app' } },
		{ at: 700, dur: 900, para: 0, do: { op: 'count', metric: 'wq', to: '65,536 B' } },
		{ at: 1000, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 1150,
			dur: 900,
			para: 1,
			do: { op: 'packet', a: 'app', b: 'sw', label: '10 個', kind: 'data' }
		},
		{ at: 1800, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{
			at: 2600,
			dur: 900,
			para: 1,
			do: { op: 'packet', a: 'sw', b: 'peer', label: '10 個', kind: 'data' }
		},
		{
			at: 3500,
			dur: 900,
			para: 1,
			do: { op: 'packet', a: 'peer', b: 'sw', label: 'ACK', kind: 'ack' }
		},
		{ at: 3600, dur: 400, para: 1, do: { op: 'board', line: 2 } },
		{
			at: 4400,
			dur: 900,
			para: 2,
			do: { op: 'packet', a: 'sw', b: 'app', label: 'ACK', kind: 'ack' }
		},
		{ at: 5300, dur: 400, para: 2, do: { op: 'board', line: 3 } },
		{ at: 5400, dur: 500, para: 2, do: { op: 'pulse', id: 'app' } }
	],
	loop: [
		{ at: 0, dur: 900, do: { op: 'packet', a: 'app', b: 'sw', label: 'データ', kind: 'data' } },
		{ at: 900, dur: 900, do: { op: 'packet', a: 'sw', b: 'peer', label: 'データ', kind: 'data' } },
		{ at: 1800, dur: 900, do: { op: 'packet', a: 'peer', b: 'sw', label: 'ACK', kind: 'ack' } },
		{ at: 2700, dur: 900, do: { op: 'packet', a: 'sw', b: 'app', label: 'ACK', kind: 'ack' } }
	],
	board: [
		'send() が 21 µs で戻る',
		'cwnd の 10 個だけ線に出る',
		'store-1 が ACK を返す',
		'ACK で次の 20 個へ'
	],
	badges: { app: 'ESTABLISHED', peer: 'ESTABLISHED' },
	refs: ['linux-tcp', 'linux-tcp-input', 'rfc6928', 'linux-sysctl'],
	learns: []
};

export const s2: Step = {
	n: 2,
	kind: 'mechanism',
	short: 'skb の形',
	title: 'ソケットと sk_buff',
	lead: 'つながり 1 本は tcp_sock、データの塊は skb',
	body: [
		'つながり 1 本ごとに tcp_sock があり、2 つのキューを持つ。',
		'データの塊は sk_buff（skb）で、頭の余白と本体と断片を持つ。'
	],
	depth: {
		intro: [
			'カーネルは、つながり 1 本ごとに 1 つの tcp_sock という入れ物を持つ。中に、まだ送っていない物の列（送信キュー）と、送ったが ACK を待つ物の列（再送キュー）がある。',
			'列に並ぶデータの塊は sk_buff（skb）と呼ぶ。1 個の skb は、64 KiB 近くのデータを 1 つにまとめて持てる。'
		],
		work: [
			'tcp_sock は struct sock を元にした構造体だ。cwnd（snd_cwnd）・RTT（srtt_us）・送った数（packets_out）を持つ。ss -tim の 1 行は、この構造体の値を写した物だ。',
			'skb の本体は head・data・tail・end の 4 つの位置で表す。data から tail までが今の中身で、head から data までは下の層が頭を足すための余白だ。',
			'送る TCP の skb は、線形部には頭だけを置き、データはページの断片（frags）に写す。断片は 1 個の skb に最大 17 個（MAX_SKB_FRAGS）まで持てる。'
		],
		deep: [
			'tcp_sock の先頭は inet_connection_sock、その先頭は inet_sock、さらにその先頭が sock だ。だから同じポインタを sock としても tcp_sock としても読める（tcp_sk() はその型を変えるだけ）。',
			'送信キュー sk_write_queue は sk_buff_head の連結リストで、送る順に並ぶ。再送キュー tcp_rtx_queue は赤黒木（rb_root）だ。SACK で途中の区切りを探すため、番号で O(log n) で引ける形にしてある。',
			'skb は 2 つの部分に分かれる。struct sk_buff は前後の連結と位置を持つ 200 B ほどの頭書きで、データの領域は別に取る。領域の終わり（end）には skb_shared_info があり、frags の表と gso_size（TSO の区切りの大きさ）を持つ。',
			'下の層は skb_push() で data を head の側へずらし、頭を前に書き足す。TCP は 32 B、IP は 20 B、Ethernet は 14 B を足す。写し直しは起きないので、64 KiB の塊でも頭を足す手間は小さい。'
		]
	},
	callout: {
		type: 'tip',
		text: 'skb は「データの写し」ではなく「データの場所の表」。clone すると表だけが 2 つになり、ページは共有のまま。'
	},
	changes: [
		{ mark: '+', text: 'tcp_sock に 2 つのキューが見えた' },
		{ mark: '+', text: 'skb の head・data・tail・end' },
		{ mark: '~', text: 'データはページの断片 3 個に入る' }
	],
	facts: [
		{ k: 'frags の上限', v: '17 個（MAX_SKB_FRAGS）' },
		{ k: '頭の足し分', v: '66 B（TCP 32 ＋ IP 20 ＋ Ethernet 14）', calc: '32+20+14' },
		{ k: '再送キューの形', v: '赤黒木（番号で O(log n)）' }
	],
	scene: [{ op: 'change', id: 'app', k: 'skb', v: '2 個' }],
	log: {
		t: '0.000s',
		from: 'app',
		to: 'app',
		kind: 'kernel',
		info: 'tcp_sock に sk_write_queue と tcp_rtx_queue'
	},
	town: '帳場の 1 本の取引ごとに、出す前の棚と、受け取り待ちの棚が 1 つずつある',
	work: 'ss -tim の cwnd・rtt・unacked は tcp_sock の値を写した物',
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					{
						id: 'c-store',
						depth: 0,
						what: 'TCP 10.0.0.5:43210 → 10.0.0.9:9000',
						state: 'ESTABLISHED'
					},
					{ id: 'q-wq', depth: 1, what: 'sk_write_queue', state: 'skb 2 個・65,536 B' },
					{ id: 'q-rtx', depth: 1, what: 'tcp_rtx_queue', state: '0 個' }
				]
			}
		]
	},
	metrics: { cwnd: '10 個', wq: '65,536 B', rtx: '0 個' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_sock', 'b_skb'] } },
		{
			at: 600,
			dur: 450,
			para: 0,
			do: { op: 'badge', id: 'b_sock', text: 'snd_cwnd 10・srtt 0.5 ms' }
		},
		{ at: 1200, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{ at: 1250, dur: 500, para: 1, do: { op: 'enqueue', queue: 'skbv', item: 'head' } },
		{ at: 2100, dur: 500, para: 1, do: { op: 'enqueue', queue: 'skbv', item: 'data' } },
		{ at: 2500, dur: 500, para: 1, do: { op: 'enqueue', queue: 'skbv', item: 'tail' } },
		{ at: 2900, dur: 500, para: 1, do: { op: 'enqueue', queue: 'skbv', item: 'end' } },
		{ at: 3000, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 3600, dur: 500, para: 2, do: { op: 'enqueue', queue: 'frags', item: 'frag 0' } },
		{ at: 4000, dur: 500, para: 2, do: { op: 'enqueue', queue: 'frags', item: 'frag 1' } },
		{ at: 4400, dur: 500, para: 2, do: { op: 'enqueue', queue: 'frags', item: 'frag 2' } },
		{ at: 4500, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{
			at: 5100,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'b_skb', text: 'len 31,856・gso_size 1,448' }
		}
	],
	loop: [
		{ at: 0, dur: 600, do: { op: 'peek', queue: 'skbv', item: 'data' } },
		{ at: 900, dur: 600, do: { op: 'peek', queue: 'frags', item: 'frag 0' } },
		{ at: 1800, dur: 600, do: { op: 'peek', queue: 'frags', item: 'frag 2' } }
	],
	board: [
		'tcp_sock：cwnd・RTT・2 つのキュー',
		'skb：head・data・tail・end',
		'データはページの断片（frags）へ'
	],
	layers: [B.mem([], []), B.sys([]), B.tcp([])],
	impl: [I.tcpSock, I.sock, I.skb, I.shinfo, I.sendto, I.sendmsg, I.wx, I.tx],
	refs: ['linux-skbuff', 'linux-tcp-h', 'linux-sock-h'],
	learns: [0]
};

export const s3: Step = {
	n: 3,
	kind: 'mechanism',
	short: 'つなぐ',
	title: 'connect() と SYN',
	lead: 'SYN も skb。再送キューに残り、SYN-ACK で消える',
	body: [
		'connect() は SYN の skb を作り、再送キューに入れてから clone を送る。',
		'SYN-ACK が返ると SYN_SENT から ESTABLISHED に変わる。'
	],
	depth: {
		intro: [
			'送る前に、まずつながる。app-1 は「つなぎたい」という区切り（SYN）を送り、store-1 は「いいよ」（SYN-ACK）を返す。app-1 が ACK を返して、3 回のやり取りでつながる。',
			'この 3 回で 0.5 ms、つまり 1 往復かかる。この間にデータはまだ 1 バイトも送れない。'
		],
		work: [
			'connect() はカーネルの tcp_v4_connect() に入り、状態を SYN_SENT にして tcp_connect() を呼ぶ。tcp_connect() はデータの無い skb を作り、SYN の旗を立てる。',
			'SYN の skb はまず再送キューに入り、clone が下の層へ送られる。SYN-ACK が 1 秒（TCP_TIMEOUT_INIT）返らなければ、再送キューの SYN を送り直すためだ。',
			'SYN には選択肢が 20 B 付き、頭は 40 B になる。MSS 1,460・SACK 可・時刻の印・窓の倍率 2^7 を相手に伝える。'
		],
		deep: [
			'tcp_v4_connect() は経路を引き、tcp_set_state(sk, TCP_SYN_SENT) で状態を変える。その後、送り元のポートを inet_hash_connect() で決める。最初の番号（ISN）は、秘密の鍵と 4 つ組の hash に時計の分を足して決める（secure_tcp_seq()）。続けて tcp_connect() へ進む。',
			'tcp_connect() は tcp_stream_alloc_skb() で skb を取る。tcp_init_nondata_skb() に TCPHDR_SYN を渡して SYN を立てる。tcp_rbtree_insert() で tcp_rtx_queue に入れ、tcp_transmit_skb() で clone を送る。',
			'選択肢の並び（MSS・SACK 可・時刻の印・NOP・窓の倍率）は tcp_options_write() の順だ。時刻の印（RFC 7323）は 10 B で、RTT を測ることと、番号が一周した古い区切りを捨てることに使う。',
			'SYN-ACK が来ると tcp_rcv_synsent_state_process() が再送キューの SYN を外し、ESTABLISHED にする。このとき初めて RTT の標本 0.5 ms が取れ、sk_sndbuf が 87,040 B に広がる（tcp_init_buffer_space()）。'
		]
	},
	callout: {
		type: 'warn',
		text: 'SYN が落ちると、次の送り直しは 1 秒後。つながらない時の「1 秒、3 秒、7 秒」の待ちは、この再送の倍々による。'
	},
	changes: [
		{ mark: '+', text: 'SYN の skb が再送キューに入った' },
		{ mark: '~', text: 'CLOSE → SYN_SENT → ESTABLISHED' },
		{ mark: '-', text: 'SYN-ACK で SYN が再送キューから消えた' }
	],
	facts: [
		{ k: 'SYN の大きさ', v: '74 B（Ethernet 14・IP 20・TCP 40）', calc: '14+20+40' },
		{ k: 'つながるまで', v: '1 往復 ＝ 0.5 ms' },
		{ k: 'SYN の再送の初め', v: '1 秒（TCP_TIMEOUT_INIT）' }
	],
	scene: [
		{ op: 'move', from: 'app', to: 'sw', payload: 'SYN', kind: 'syn' },
		{ op: 'move', from: 'sw', to: 'peer', payload: 'SYN', kind: 'syn' },
		{ op: 'move', from: 'peer', to: 'sw', payload: 'SYN-ACK', kind: 'syn' },
		{ op: 'move', from: 'sw', to: 'app', payload: 'SYN-ACK', kind: 'syn' }
	],
	log: {
		t: '0.000s',
		from: 'app',
		to: 'peer',
		kind: 'syn',
		info: 'SYN seq 2717001000、MSS 1460・SACK 可・TS・窓の倍率 7',
		size: '74 B'
	},
	town: '取引の前に「始めてよいか」と「どうぞ」をやり取りする。この 1 往復は荷を運べない',
	work: 'ss -tan で SYN-SENT のまま残るつながりは、相手か経路で SYN が落ちている',
	inside: {
		packet: synPacket,
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					{
						id: 'c-store',
						depth: 0,
						what: 'TCP 10.0.0.5:43210 → 10.0.0.9:9000',
						state: 'ESTABLISHED'
					},
					{ id: 'q-rtx', depth: 1, what: 'tcp_rtx_queue', state: '0 個（SYN は消えた）' },
					{ id: 's-sndbuf', depth: 1, what: 'sk_sndbuf', state: '87,040 B' }
				]
			}
		],
		logs: [
			{
				t: '10:15:01.000100',
				src: 'tcpdump',
				text: '10:15:01.000100 IP 10.0.0.5.43210 > 10.0.0.9.9000: Flags [S], seq 2717001000, win 64240, options [mss 1460,sackOK,TS val 3000 ecr 0,nop,wscale 7], length 0'
			},
			{
				t: '10:15:01.000600',
				src: 'tcpdump',
				text: '10:15:01.000600 IP 10.0.0.9.9000 > 10.0.0.5.43210: Flags [S.], seq 1593000000, ack 2717001001, win 65160, options [mss 1460,sackOK,TS val 5000 ecr 3000,nop,wscale 7], length 0'
			},
			{
				t: '10:15:01.000610',
				src: 'tcpdump',
				text: '10:15:01.000610 IP 10.0.0.5.43210 > 10.0.0.9.9000: Flags [.], ack 1, win 502, options [nop,nop,TS val 3000 ecr 5000], length 0'
			}
		]
	},
	metrics: { wq: '0 B', rtx: '0 個', rtt: '0.5 ms' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_connect', 'b_tx', 'app'] } },
		{ at: 400, dur: 400, para: 0, do: { op: 'context', to: 'syscall', at: 'b_connect' } },
		{ at: 700, dur: 450, para: 0, do: { op: 'badge', id: 'app', text: 'SYN_SENT', tone: 'warn' } },
		{ at: 1100, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 950,
			dur: 800,
			para: 1,
			do: { op: 'packet', a: 'b_connect', b: 'b_tx', label: 'SYN の skb', kind: 'syn' }
		},
		{ at: 2400, dur: 500, para: 1, do: { op: 'enqueue', queue: 'rtx', item: 'SYN' } },
		{ at: 3000, dur: 500, para: 1, do: { op: 'clone', item: 'SYN', as: 'SYN′' } },
		{ at: 3100, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 3600, dur: 400, para: 1, do: { op: 'dequeue', queue: 'rtx', item: 'SYN′' } },
		{
			at: 3700,
			dur: 900,
			para: 2,
			do: { op: 'packet', a: 'app', b: 'sw', label: 'SYN 74 B', kind: 'syn' }
		},
		{
			at: 4600,
			dur: 900,
			para: 2,
			do: { op: 'packet', a: 'sw', b: 'peer', label: 'SYN', kind: 'syn' }
		},
		{
			at: 5500,
			dur: 900,
			para: 2,
			do: { op: 'packet', a: 'peer', b: 'sw', label: 'SYN-ACK', kind: 'syn' }
		},
		{ at: 5600, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{
			at: 6400,
			dur: 900,
			para: 2,
			do: { op: 'packet', a: 'sw', b: 'app', label: 'SYN-ACK', kind: 'syn' }
		},
		{ at: 7300, dur: 500, para: 1, do: { op: 'dequeue', queue: 'rtx', item: 'SYN' } },
		{ at: 7400, dur: 450, para: 2, do: { op: 'badge', id: 'app', text: 'ESTABLISHED' } },
		{ at: 7900, dur: 400, para: 2, do: { op: 'board', line: 3 } }
	],
	loop: 'none',
	loopReason: 'つながるのは 1 回だけの出来事。もう一度（R）で何度でも見られる',
	board: [
		'connect() → tcp_v4_connect()：SYN_SENT',
		'tcp_connect()：SYN の skb を再送キューへ',
		'clone を送る：74 B、選択肢 20 B',
		'SYN-ACK：SYN を外して ESTABLISHED'
	],
	badges: { app: 'ESTABLISHED', peer: 'ESTABLISHED' },
	layers: [B.sys([], [{ id: 'b_connect', impl: I.connect.name }]), B.tcp([])],
	impl: [I.connect, I.tcpConnect, I.tx, I.sendto, I.sendmsg, I.wx],
	refs: ['linux-tcp-ipv4', 'linux-tcp-output', 'rfc9293', 'rfc7323', 'linux-net-tcp-h'],
	learns: [0]
};

export const s4: Step = {
	n: 4,
	kind: 'internals',
	short: '送るか待つ',
	title: 'send() から送るか待つかまで',
	lead: 'skb 3 個を送信キューへ。6 つの関所を見て 10 個だけ送る',
	body: [
		'tcp_sendmsg_locked() が 65,536 B を skb 3 個に写して送信キューへ入れる。',
		'tcp_write_xmit() が cwnd などを見て、最初の 10 個だけを切り出す。'
	],
	depth: {
		intro: [
			'send() の中で、カーネルは帳簿を 3 つの塊（skb）に写して送信キューに並べる。1 つ目の塊が満ちた所で「今いくつ送ってよいか」を確かめ、送ってよい分だけを切り出す。',
			'始めは 10 個（14,480 B）まで。残りの 36 個は、送信キューで次の ACK を待つ。'
		],
		work: [
			'tcp_sendmsg_locked() はプロセスの文脈で動き、データを skb に写して sk_write_queue に並べる。1 個に詰める量（size_goal）は 31,856 B だ。A が満ちると tcp_push_one() を呼ぶ。',
			'tcp_write_xmit() は送信キューの先頭を覗き、6 つの関所を見る。ペーシング・cwnd・受信窓・Nagle・TSO の待ち・TSQ だ。',
			'cwnd は 10 個なので、送ってよいのは 14,480 B。受信窓は SYN-ACK の 65,160 B で、ここは通る。',
			'22 個の A は 10 個分を超えるので、tso_fragment() が A1（14,480 B）と A2（17,376 B）に切る。続けて B（31,856 B）と C（1,824 B）を写し、最後の tcp_push() は cwnd が尽きて何も送らない。'
		],
		deep: [
			'size_goal は tcp_send_mss() から tcp_xmit_size_goal() で決まる。tcp_bound_to_half_wnd() が、相手が見せた最大の窓 65,160 B の半分 32,580 B に切る。1,448 B の倍数に丸めて 22 個分、31,856 B だ。足りなくなると tcp_stream_alloc_skb() で次の skb を取り、tcp_skb_entail() で列の後ろにつなぐ。',
			'データは sk_page_frag() のページに写され、skb の frags に並ぶ。sk_wmem_queued が sk_sndbuf の 87,040 B を超えると sk_stream_wait_memory() で眠る。今回は 65,536 B と頭書きの分で上限の内に収まり、待たずに戻る。',
			'tcp_write_xmit() の輪は v6.12 で次の順だ。tcp_pacing_check()、tcp_cwnd_test()（cwnd − 飛んでいる数）、tcp_snd_wnd_test()（受信窓）。1 区切りなら tcp_nagle_test()、2 区切り以上なら tcp_tso_should_defer() を見る。push_one の時は TSO の待ちを見ない。',
			'送ってよい量が決まると tcp_mss_split_point() で切る位置を決め、tso_fragment() で skb を割る。skb が cwnd の残りより小さい時は、tcp_grow_skb() が次の skb から足りない分を移す（2 往復目で使う）。最後に tcp_small_queue_check()（TSQ）で手元の行列を見て、tcp_transmit_skb() へ進む。',
			'tcp_pacing_check() が待たせるのは、fq の無い BBR のように TCP が自分でペーシングする時だけだ。Nagle は MSS（1,448 B）より小さい区切りを止める。止めるのは、未 ACK の小さい区切りが 1 つ以上ある間だけだ（Minshall の変形。tcp_minshall_check()）。この帳簿では、最後の 376 B は C の後ろの断片で、C ごと 2 個として送られる。'
		]
	},
	callout: {
		type: 'point',
		text: '「送らない」理由は 6 つ。どれで止まったかは ss -tim の busy・rwnd_limited・sndbuf_limited と、cwnd と unacked が等しいか、notsent で見分ける。'
	},
	changes: [
		{ mark: '+', text: 'skb A・B（31,856 B）と C（1,824 B）' },
		{ mark: '~', text: 'A を A1 14,480 B と A2 17,376 B に' },
		{ mark: '~', text: '送ってよい数 10 個を使い切る' }
	],
	facts: [
		{ k: 'size_goal', v: '31,856 B（1,448 B × 22）', calc: '1448*22' },
		{ k: '送ってよい量', v: '14,480 B（cwnd 10 × 1,448 B）', calc: '10*1448' },
		{ k: '受信窓', v: '65,160 B（SYN-ACK の win。倍率を掛けない）' },
		{ k: '残る量', v: '51,056 B（17,376 ＋ 31,856 ＋ 1,824）', calc: '17376+31856+1824' }
	],
	scene: [{ op: 'change', id: 'app', k: '送信キュー', v: '65,536 B' }],
	log: {
		t: '0.010s',
		from: 'app',
		to: 'app',
		kind: 'kernel',
		info: 'tcp_push_one：cwnd 10 で A を A1（10 個）と A2 に割る'
	},
	town: '帳場は荷を 2 箱にまとめて出口の棚に置き、今日運べる 10 箱分だけを台車に載せる',
	work: 'ss -tim の notsent が送信キューに残った量、cwnd が関所の数',
	ask: {
		q: 'cwnd 10・受信窓 65,160 B。最初に線に出るのは何個？',
		opts: ['46 個全部', '10 個', '45 個（受信窓の分）'],
		a: 1,
		why: '受信窓は 45 個分を許すが、cwnd が 10 個までに絞る。小さい方で決まる。'
	},
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					{ id: 'p-backup', depth: 0, what: 'backup（pid 4120）', state: 'send() の中（syscall）' },
					{
						id: 'c-store',
						depth: 1,
						what: 'TCP 10.0.0.5:43210 → 10.0.0.9:9000',
						state: 'ESTABLISHED'
					},
					{ id: 'q-wq', depth: 2, what: 'sk_write_queue', state: 'A2 17,376・B 31,856・C 1,824' },
					{ id: 's-cwnd', depth: 2, what: 'snd_cwnd', state: '10（飛んでいる数 0）' }
				]
			}
		]
	},
	metrics: { cwnd: '10 個', wq: '65,536 B', rtx: '0 個' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['app', 'b_send', 'b_sendmsg'] } },
		{ at: 400, dur: 400, para: 0, do: { op: 'context', to: 'syscall', at: 'b_send' } },
		{
			at: 700,
			dur: 800,
			para: 0,
			do: { op: 'packet', a: 'app', b: 'b_send', label: 'send 65,536', kind: 'call' }
		},
		{
			at: 1500,
			dur: 700,
			para: 0,
			do: { op: 'packet', a: 'b_send', b: 'b_sendmsg', label: 'msghdr', kind: 'call' }
		},
		{ at: 2200, dur: 500, para: 0, do: { op: 'enqueue', queue: 'wq', item: 'A 31856' } },
		{ at: 2700, dur: 800, para: 0, do: { op: 'count', metric: 'wq', to: '65,536 B' } },
		{ at: 3500, dur: 900, para: 1, do: { op: 'camera', fit: ['b_sendmsg', 'b_wx', 'b_tx'] } },
		{
			at: 3800,
			dur: 700,
			para: 1,
			do: { op: 'packet', a: 'b_sendmsg', b: 'b_wx', label: 'tcp_push_one', kind: 'call' }
		},
		{ at: 4500, dur: 600, para: 1, do: { op: 'peek', queue: 'wq', item: 'A 31856' } },
		{ at: 4600, dur: 400, para: 2, do: { op: 'board', line: 0 } },
		{ at: 5000, dur: 400, para: 2, do: { op: 'board', line: 1 } },
		{ at: 5400, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 5800, dur: 400, para: 2, do: { op: 'board', line: 3 } },
		{
			at: 6300,
			dur: 700,
			para: 3,
			do: { op: 'split', item: 'A 31856', into: ['A1 14480', 'A2 17376'] }
		},
		{
			at: 6400,
			dur: 450,
			para: 3,
			do: { op: 'badge', id: 'b_wx', text: '送る 10 個・残り 36 個', tone: 'warn' }
		},
		{ at: 7100, dur: 400, para: 3, do: { op: 'board', line: 4 } },
		{ at: 7200, dur: 600, para: 3, do: { op: 'dequeue', queue: 'wq', item: 'A1 14480' } },
		{ at: 7600, dur: 500, para: 3, do: { op: 'enqueue', queue: 'wq', item: 'B 31856' } },
		{ at: 7900, dur: 500, para: 3, do: { op: 'enqueue', queue: 'wq', item: 'C 1824' } }
	],
	loop: [
		{ at: 0, dur: 600, do: { op: 'peek', queue: 'wq', item: 'A2 17376' } },
		{ at: 900, dur: 600, do: { op: 'peek', queue: 'wq', item: 'B 31856' } }
	],
	board: [
		'ペーシング：cubic と fq では TCP は待たない。受信窓 65,160 B → 通る',
		'cwnd 10 − 飛んでいる 0 → 10 個まで',
		'TSO の待ち：送れる分が揃った → 待たない',
		'TSQ：手元の行列 0 B → 通る',
		'A を割り、A1 の 10 個だけ進む'
	],
	badges: { b_wx: '送る 10 個・残り 36 個' },
	layers: [B.sys([]), B.tcp([])],
	impl: [I.sendto, I.sendmsg, I.push, I.wx, I.tx, I.nagle, I.defer, I.tsqCheck],
	refs: ['linux-tcp', 'linux-tcp-output', 'linux-socket', 'rfc6928'],
	learns: [0, 1]
};
