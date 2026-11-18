// 見本 1（net-101）のステップ 9〜12：喪失と再送 / 溜まりすぎと受信窓 0 / 直す / 代償（CUBIC と BBR・塊の大きさ）。
import type { Step } from '../../lesson/types.ts';
import { B, I } from './tcp-base.ts';

const conn = {
	id: 'c-store',
	depth: 1 as const,
	what: 'TCP 10.0.0.5:43210 → 10.0.0.9:9000',
	state: 'ESTABLISHED'
};

export const s9: Step = {
	n: 9,
	kind: 'fail',
	short: '1 個落ちた',
	title: '1 個落ちたら：速い再送と RTO',
	lead: '後ろが届けば 1 往復で直る。最後が落ちると 200 ms 待つ',
	body: [
		'スイッチで D2 が 1 個落ちると、store-1 は D3〜D5 を SACK で知らせる。',
		'RACK が D2 を失ったと決めて送り直す。後ろが無いと 200 ms の RTO を待つ。'
	],
	depth: {
		intro: [
			'スイッチの待ち行列があふれ、D1〜D5 のうち D2 だけが捨てられた。store-1 には D1 と D3〜D5 が届き、「D2 が抜けている」と ACK で知らせる。',
			'app-1 は控えの D2 を送り直す。ここまで 1 往復と少し、0.6 ms ほどで直る。'
		],
		work: [
			'store-1 は「725,449 番の手前まで受け取った」という同じ ACK を、SACK（どこが届いたか）付きで 3 回返す。重複 ACK だ。',
			'v6.12 の既定（tcp_recovery=1）では、RACK が送った時刻で喪失を決める。D2 より後に送った D3 が届いているので、D2 は待ち 0.125 ms（min_rtt の 1/4）を過ぎて失われたと決まる。',
			'tcp_retransmit_skb() が再送キューの D2 の写しを作って送り直す。CUBIC は cwnd を 0.7 倍の 280 個に下げる。',
			'落ちたのが最後の区切りで後ろが無いと、重複 ACK が返らない。TLP（最後の確かめの送り）も効かなければ、RTO の 200 ms を待ち、cwnd は 1 個からやり直す。'
		],
		deep: [
			'tcp_ack() の中の tcp_fastretrans_alert() が回復に入るかを決める。tcp_time_to_recover() は、RACK を使う時は lost_out（失ったと決めた数）だけを見る。重複 ACK が 3 つ（tp->reordering の既定 3）という RFC 5681 の決まりは、RACK を切った時の道だ。',
			'RACK（RFC 8985）は、SACK された区切りの中で最も後に送った物の時刻より、reo_wnd 以上前に送った未 ACK を失ったとする。reo_wnd は既定で min_rtt の 1/4 で、並び替えを見ると広がる。',
			'回復の間は PRR（Proportional Rate Reduction）が 1 ACK ごとに送ってよい数を決める。CUBIC の ssthresh は cwnd × 717/1024 で 280 だ。',
			'RTO は srtt ＋ 4 × rttvar だが、Linux は rttvar に tcp_rto_min の 200 ms を下限として持つ。だから RTT 0.5 ms でも RTO は約 200 ms で、RTT の 400 倍だ。',
			'RTO が切れると、tcp_retransmit_timer() から tcp_enter_loss() で cwnd を 1 にする。再送キューの先頭から送り直す。続けて切れると RTO は 2 倍ずつ伸び、上限は 120 秒（TCP_RTO_MAX）だ。'
		]
	},
	callout: {
		type: 'warn',
		text: '1 個の喪失の値段は場所で 300 倍違う。途中なら約 0.6 ms、最後なら 200 ms。小さい応答ほど最後が落ちやすい。'
	},
	changes: [
		{ mark: '-', text: 'D2 がスイッチで捨てられた' },
		{ mark: '+', text: '重複 ACK 3 つ（SACK 付き）' },
		{ mark: '~', text: 'cwnd 400 → 280 個' }
	],
	facts: [
		{ k: 'RACK の待ち', v: '0.125 ms（min_rtt 0.5 ms ÷ 4）', calc: '0.5/4' },
		{ k: '新しい cwnd', v: '280 個（400 × 717 ÷ 1,024）', calc: '400*717/1024' },
		{ k: 'RTO', v: '200 ms（下限 tcp_rto_min）' },
		{ k: 'RTO と RTT の比', v: '400 倍（200 ÷ 0.5）', calc: '200/0.5' }
	],
	scene: [
		{ op: 'move', from: 'app', to: 'sw', payload: 'D1〜D5', kind: 'data' },
		{ op: 'move', from: 'sw', to: 'peer', payload: 'D1・D3〜D5', kind: 'data' },
		{ op: 'move', from: 'peer', to: 'sw', payload: '重複 ACK', kind: 'ack' },
		{ op: 'move', from: 'sw', to: 'app', payload: '重複 ACK', kind: 'ack' }
	],
	log: {
		t: '6.000s',
		from: 'peer',
		to: 'app',
		kind: 'ack',
		info: '重複 ACK 725449・SACK {726897:731241}。D2 を送り直す'
	},
	town: '1 箱だけ道で落ちた。後ろの箱が届いた知らせで気づき、控えから 1 箱だけ出し直す',
	work: 'nstat -az TcpRetransSegs TcpExtTCPTimeouts で再送と RTO の数を見る',
	ask: {
		q: 'D2 が落ちた。直るまでの時間は？',
		opts: ['約 0.6 ms（後ろの ACK で気づく）', '200 ms（RTO を待つ）', '1 秒'],
		a: 0,
		why: 'D3〜D5 が届いて SACK が返るので、RACK が 1 往復ほどで気づく。RTO を待つのは後ろが無い時。'
	},
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					conn,
					{ id: 's-cwnd', depth: 2, what: 'snd_cwnd', state: '280（回復の中）', tone: 'warn' },
					{ id: 's-retrans', depth: 2, what: 'retrans', state: '0/1', tone: 'warn' }
				]
			}
		],
		logs: [
			{
				t: '10:15:06.000510',
				src: 'tcpdump',
				text: '10:15:06.000510 IP 10.0.0.9.9000 > 10.0.0.5.43210: Flags [.], ack 725449, win 502, options [nop,nop,TS val 9004 ecr 7001,nop,nop,sack 1 {726897:731241}], length 0'
			},
			{
				t: '10:15:06.000640',
				src: 'tcpdump',
				text: '10:15:06.000640 IP 10.0.0.5.43210 > 10.0.0.9.9000: Flags [.], seq 725449:726897, ack 1, win 502, options [nop,nop,TS val 7002 ecr 9004], length 1448'
			},
			{
				t: '10:15:06.001150',
				src: 'tcpdump',
				text: '10:15:06.001150 IP 10.0.0.9.9000 > 10.0.0.5.43210: Flags [.], ack 731241, win 502, options [nop,nop,TS val 9005 ecr 7002], length 0'
			}
		]
	},
	metrics: { cwnd: '280 個', rtx: '280 個' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['app', 'sw', 'peer'] } },
		{
			at: 400,
			dur: 800,
			para: 0,
			do: { op: 'packet', a: 'app', b: 'sw', label: 'D1〜D5', kind: 'data' }
		},
		{
			at: 1200,
			dur: 900,
			para: 0,
			do: { op: 'packet', a: 'sw', b: 'peer', label: 'D2', kind: 'data', drop: true }
		},
		{
			at: 1300,
			dur: 900,
			para: 0,
			do: { op: 'packet', a: 'sw', b: 'peer', label: 'D1・D3〜D5', kind: 'data' }
		},
		{ at: 1700, dur: 600, para: 0, do: { op: 'fail', id: 'sw' } },
		{
			at: 2300,
			dur: 450,
			para: 0,
			do: { op: 'badge', id: 'peer', text: 'D2 が無い・SACK 3〜5', tone: 'warn' }
		},
		{ at: 2400, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 2800,
			dur: 800,
			para: 0,
			do: { op: 'packet', a: 'peer', b: 'sw', label: '重複 ACK ×3', kind: 'ack' }
		},
		{
			at: 3600,
			dur: 800,
			para: 1,
			do: { op: 'packet', a: 'sw', b: 'app', label: '重複 ACK ×3', kind: 'ack' }
		},
		{ at: 4400, dur: 900, para: 1, do: { op: 'camera', fit: ['b_ack', 'b_wx', 'b_tx'] } },
		{
			at: 4800,
			dur: 450,
			para: 1,
			do: { op: 'badge', id: 'b_ack', text: 'RACK：D2 を失った', tone: 'bad' }
		},
		{ at: 4900, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 5400, dur: 600, para: 2, do: { op: 'clone', item: 'D2', as: 'D2r' } },
		{ at: 6000, dur: 400, para: 2, do: { op: 'dequeue', queue: 'rtx', item: 'D2r' } },
		{ at: 6100, dur: 800, para: 2, do: { op: 'count', metric: 'cwnd', to: '280 個' } },
		{ at: 6200, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 6600, dur: 900, para: 2, do: { op: 'camera', fit: ['app', 'sw', 'peer'] } },
		{
			at: 7000,
			dur: 800,
			para: 2,
			do: { op: 'packet', a: 'app', b: 'sw', label: 'D2 再送', kind: 'retx' }
		},
		{
			at: 7800,
			dur: 800,
			para: 2,
			do: { op: 'packet', a: 'sw', b: 'peer', label: 'D2 再送', kind: 'retx' }
		},
		{
			at: 8600,
			dur: 800,
			para: 3,
			do: { op: 'packet', a: 'peer', b: 'sw', label: 'ACK 731241', kind: 'ack' }
		},
		{ at: 8700, dur: 450, para: 3, do: { op: 'badge', id: 'peer', text: '全部そろった' } },
		{
			at: 9400,
			dur: 800,
			para: 3,
			do: { op: 'packet', a: 'sw', b: 'app', label: 'ACK 731241', kind: 'ack' }
		},
		{ at: 9500, dur: 800, para: 3, do: { op: 'count', metric: 'rtx', to: '280 個' } },
		{ at: 9600, dur: 400, para: 3, do: { op: 'board', line: 3 } }
	],
	loop: [
		{ at: 0, dur: 800, do: { op: 'packet', a: 'app', b: 'sw', label: 'D2', kind: 'data' } },
		{
			at: 800,
			dur: 800,
			do: { op: 'packet', a: 'sw', b: 'peer', label: 'D2', kind: 'data', drop: true }
		},
		{ at: 1700, dur: 800, do: { op: 'packet', a: 'app', b: 'sw', label: 'D2 再送', kind: 'retx' } },
		{ at: 2500, dur: 800, do: { op: 'packet', a: 'sw', b: 'peer', label: 'D2 再送', kind: 'retx' } }
	],
	board: [
		'スイッチで D2 だけ落ちる',
		'SACK：D3〜D5 は届いた → RACK が D2 を失ったと決める',
		'tcp_retransmit_skb()：D2 を送り直す・cwnd 280',
		'後ろが無ければ RTO 200 ms・cwnd 1 から'
	],
	badges: { sw: 'あふれて 1 個捨てた', peer: '全部そろった' },
	layers: [B.tcp(['D1', 'D2', 'D3', 'D4', 'D5']), B.rcv()],
	impl: [
		I.wxSoft,
		I.tx,
		I.v4rcv,
		I.est,
		I.ack,
		I.fastAlert,
		I.retrans,
		I.rtoTimer,
		I.enterLoss,
		I.cubic
	],
	refs: [
		'rfc8985',
		'rfc5681',
		'rfc6298',
		'linux-tcp-input',
		'linux-tcp-timer',
		'linux-tcp-cubic',
		'linux-net-tcp-h',
		'linux-sysctl'
	],
	learns: [5]
};

export const s10: Step = {
	n: 10,
	kind: 'fail',
	short: '溜まりすぎ',
	title: '手元に溜まりすぎる',
	lead: 'pfifo と大きすぎる上限で、30 MB が 24 ms 待つ',
	body: [
		'qdisc を pfifo にし、tcp_limit_output_bytes を 256 MiB に上げた。',
		'手元に 30 MB 溜まり、後ろの ssh も 24 ms 待たされる。'
	],
	depth: {
		intro: [
			'「もっと速く送りたい」と、誰かが qdisc を来た順の pfifo に替え、TCP の手元の上限を 256 MiB に上げた。',
			'すると app-1 の出口に 30 MB の荷が積み上がった。同じ出口を通る ssh の小さな区切りも、その後ろに並んで 24 ms 待つ。速さは上がらず、待ちだけが 50 倍になった。'
		],
		work: [
			'pfifo には送る時刻の考えが無く、TCP はペーシングしない（SK_PACING_NONE）。TSQ の上限は tcp_limit_output_bytes で決まり、256 MiB まで手元に積める。',
			'10 GbE は 1 秒に 1.25 GB しか出せない。積んだ 30 MB は、出し切るまで 24 ms かかる。',
			'RTT は 0.5 ms から 24.5 ms に伸びた。cwnd は大きくなったが、線は前から使い切っていて、速さは変わらない。これが bufferbloat（溜まりすぎ）だ。',
			'別の止まり方に受信窓 0 がある。store-1 のディスクが遅れて受け取りの場所が尽きると、win 0 が返る。app-1 は 200 ms 以上の間隔で、窓を確かめる区切り（probe）だけを送る。'
		],
		deep: [
			'tcp_small_queue_check() は SK_PACING_NONE の時、上限に tcp_limit_output_bytes を当てる。既定の 1 MiB は、この溜まりすぎを止めるための値だ。256 MiB にすると、1 本の流れが qdisc と NIC に数十 MB を積める。',
			'pfifo の上限は既定で txqueuelen（1,000 個）だが、ここでは limit 100000 で作られていた。1 個 64 KiB の塊なら 6 GB 分まで入り、実際には上限に届く前に 30 MB で釣り合った。',
			'fq_codel なら、列に居た時間が 5 ms を超え続けた流れの区切りを捨て、TCP に速さを落とさせる。fq なら流れごとの列と送る時刻で、ssh の区切りは大きな流れの後ろに並ばない。',
			'受信窓 0 では、送る側は tcp_send_probe0() で、番号 snd_una − 1・中身 0 B の確かめの区切りを送る。間隔は RTO から倍々に伸びる。窓が開いた ACK が来るまで送信キューは減らず、send() は sk_sndbuf で眠る。',
			'どちらも、線はつながっていて喪失も無いのに待ちだけが伸びる。再送の数（TcpRetransSegs）が 0 でも遅い時は 3 つを見る。ss -tim の rtt、tc -s qdisc の backlog、tcpdump の win だ。'
		]
	},
	callout: {
		type: 'warn',
		text: '待ち行列を大きくしても、線より速くは出せない。増えるのは待ちだけ。bufferbloat は喪失 0 のまま遅くなる。'
	},
	changes: [
		{ mark: '+', text: 'qdisc に 30 MB（backlog）' },
		{ mark: '~', text: 'RTT 0.5 → 24.5 ms' },
		{ mark: '-', text: 'ssh の区切りが 24 ms 待つ' }
	],
	facts: [
		{ k: 'backlog', v: '30,000,000 B' },
		{ k: '出し切るまで', v: '24 ms（30 MB ÷ 1.25 GB/s）', calc: '30000000/1250000000*1000' },
		{ k: 'RTT', v: '24.5 ms（0.5 ＋ 24）', calc: '0.5+24' },
		{
			k: 'tcp_limit_output_bytes',
			v: '268,435,456 B（256 MiB に上げてあった）',
			calc: '256*1024*1024'
		}
	],
	scene: [
		{ op: 'change', id: 'app', k: 'qdisc', v: 'pfifo・backlog 30 MB' },
		{ op: 'move', from: 'app', to: 'sw', payload: 'ssh（24 ms 遅れ）', kind: 'data' }
	],
	log: {
		t: '7.000s',
		from: 'app',
		to: 'sw',
		kind: 'data',
		info: 'qdisc pfifo の backlog 30 MB。RTT 24.5 ms、ssh も 24 ms 待つ'
	},
	town: '出口の前の行列が長すぎて、急ぎの小包まで大きな荷の後ろで待たされる',
	work: 'tc -s qdisc show dev eth0 の backlog が数 MB なら溜まりすぎ',
	ask: {
		q: '手元の上限を 256 倍にした。速さはどうなる？',
		opts: ['256 倍近く速くなる', '変わらず、待ちだけが伸びる', '半分になる'],
		a: 1,
		why: '線の 10 Gbps は前から使い切っている。積んだ分は待ちになるだけ。'
	},
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					conn,
					{
						id: 'd-qdisc',
						depth: 1,
						what: 'qdisc pfifo（eth0）',
						state: 'backlog 30Mb 460p',
						tone: 'bad'
					},
					{
						id: 's-limit',
						depth: 1,
						what: 'tcp_limit_output_bytes',
						state: '268435456',
						tone: 'bad'
					},
					{
						id: 'c-ssh',
						depth: 1,
						what: 'TCP 10.0.0.5:22 → 10.0.0.77:51022',
						state: 'rtt 24.6 ms',
						tone: 'warn'
					}
				]
			}
		],
		logs: [
			{
				t: '10:15:07.000100',
				src: 'tcpdump',
				text: '10:15:07.000100 IP 10.0.0.9.9000 > 10.0.0.5.43210: Flags [.], ack 412880001, win 0, options [nop,nop,TS val 11000 ecr 9500], length 0'
			},
			{
				t: '10:15:07.200300',
				src: 'tcpdump',
				text: '10:15:07.200300 IP 10.0.0.5.43210 > 10.0.0.9.9000: Flags [.], ack 1, win 502, options [nop,nop,TS val 9700 ecr 11000], length 0'
			}
		]
	},
	metrics: { rtt: '24.5 ms', qd: '30,000,000 B' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_wx', 'b_dev'] } },
		{
			at: 400,
			dur: 450,
			para: 0,
			do: { op: 'badge', id: 'b_wx', text: 'TSQ 上限 256 MiB', tone: 'warn' }
		},
		{ at: 500, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{ at: 900, dur: 450, para: 0, do: { op: 'enqueue', queue: 'qpf', item: 'C1 64K' } },
		{ at: 1300, dur: 450, para: 0, do: { op: 'enqueue', queue: 'qpf', item: 'C2 64K' } },
		{ at: 1700, dur: 450, para: 1, do: { op: 'enqueue', queue: 'qpf', item: 'C3 64K' } },
		{ at: 2100, dur: 450, para: 1, do: { op: 'enqueue', queue: 'qpf', item: 'C4 64K' } },
		{ at: 2200, dur: 1200, para: 1, do: { op: 'count', metric: 'qd', to: '30,000,000 B' } },
		{ at: 2300, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 2900, dur: 450, para: 2, do: { op: 'enqueue', queue: 'qpf', item: 'ssh' } },
		{
			at: 3400,
			dur: 1400,
			para: 2,
			do: { op: 'packet', a: 'b_dev', b: 'b_drv', label: 'ssh', kind: 'data', stall: true }
		},
		{ at: 3500, dur: 1000, para: 2, do: { op: 'count', metric: 'rtt', to: '24.5 ms' } },
		{ at: 3600, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{
			at: 4200,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'b_dev', text: 'backlog 30 MB・待ち 24 ms', tone: 'bad' }
		},
		{ at: 4800, dur: 900, para: 3, do: { op: 'camera', fit: ['app', 'sw', 'peer'] } },
		{
			at: 5200,
			dur: 450,
			para: 3,
			do: { op: 'badge', id: 'peer', text: 'win 0（ディスク待ち）', tone: 'bad' }
		},
		{ at: 5300, dur: 400, para: 3, do: { op: 'board', line: 3 } },
		{
			at: 5800,
			dur: 800,
			para: 3,
			do: { op: 'packet', a: 'app', b: 'sw', label: 'probe', kind: 'probe' }
		},
		{
			at: 6600,
			dur: 800,
			para: 3,
			do: { op: 'packet', a: 'sw', b: 'peer', label: 'probe', kind: 'probe' }
		},
		{ at: 7400, dur: 400, para: 3, do: { op: 'board', line: 4 } }
	],
	loop: [
		{ at: 0, dur: 450, do: { op: 'peek', queue: 'qpf', item: 'C1 64K' } },
		{
			at: 500,
			dur: 1400,
			do: { op: 'packet', a: 'b_dev', b: 'b_drv', label: 'ssh', kind: 'data', stall: true }
		},
		{ at: 2000, dur: 800, do: { op: 'packet', a: 'app', b: 'sw', label: 'probe', kind: 'probe' } }
	],
	board: [
		'pfifo・ペーシング無し → TSQ 上限 256 MiB',
		'qdisc に 30 MB ＝ 10 GbE で 24 ms',
		'RTT 0.5 → 24.5 ms、速さは同じ',
		'store-1 の窓 0 → probe だけ送る',
		'喪失 0 のまま遅い'
	],
	badges: { b_dev: 'backlog 30 MB・待ち 24 ms', peer: 'win 0（ディスク待ち）' },
	layers: [B.tcp([]), B.qd([], []), B.drv([], [])],
	impl: [I.wx, I.tx, I.tsqCheck, I.devq, I.direct, I.drv, I.tso, I.limitOut],
	refs: ['linux-tcp-output', 'linux-sysctl', 'linux-fq-codel', 'rfc8290', 'rfc9293'],
	learns: [5]
};

export const s11: Step = {
	n: 11,
	kind: 'fix',
	short: '直す',
	title: 'fq に戻し、上限を戻す',
	lead: '流れごとの列と送る時刻で、30 MB の行列を消す',
	body: [
		'tcp_limit_output_bytes を 1 MiB に戻し、qdisc を fq にする。',
		'TCP が送る時刻を書き、fq が流れごとにその時刻を守って出す。'
	],
	depth: {
		intro: [
			'直し方は 2 つ。手元の上限を元の 1 MiB に戻し、qdisc を流れごとに列を分ける fq に替える。',
			'fq の下では TCP が荷ごとに「出してよい時刻」を書き、fq がその時刻まで待たせる。行列は 1 ms 分に収まり、ssh の区切りは自分の列ですぐ出る。'
		],
		work: [
			'sysctl -w net.ipv4.tcp_limit_output_bytes=1048576 で上限を戻す。tc qdisc replace dev eth0 root fq で qdisc を替える。',
			'fq の下ではソケットが SK_PACING_FQ になり、TCP は送るたびに次の時刻を len ÷ sk_pacing_rate だけ進める。64 KiB の塊なら、9.3 Gbps で 56 µs ずつ後ろだ。',
			'TSQ の上限は送る速さの約 1 ms 分になり、手元の行列は約 1.36 MB に収まる。fq の中で時刻を待つ分は RTT に数えないので、この流れの RTT は 24.5 ms から 0.512 ms に戻る。',
			'ssh の区切りは fq の別の列に入る。大きな流れの後ろに並ばず、ssh の RTT は 0.5 ms のままだ。'
		],
		deep: [
			'fq は流れ（ソケット、または 5 つ組の hash）ごとに列を持つ。fq_dequeue() は時刻の来た列を Deficit Round Robin で回す。1 回に quantum（2 × 1,514 ＝ 3,028 B）ずつ出す。1 つの流れが積める数は flow_limit の 100 個、全体は 10,000 個だ。',
			'__tcp_transmit_skb() は skb の時刻に tcp_wstamp_ns（出してよい時刻）を書き、RTT はこの時刻から測る。だから fq で時刻まで待つ分は RTT に入らず、pfifo で並んで待つ分は入る。',
			'TCP はペーシングの速さ sk_pacing_rate を cwnd と srtt から決め、fq はそれを守るだけだ。BBR は fq が無くても SK_PACING_NEEDED として、TCP の中の hrtimer（tcp_pace_kick()）で同じことをする。',
			'fq_codel を選ぶ場合は、TCP はペーシングしない。そのため tcp_limit_output_bytes の 1 MiB が手元の上限として効き、CoDel が 5 ms を超えた待ちを捨てて知らせる。',
			'どちらも、sysctl と tc の替えは再起動で消える。/etc/sysctl.d/ に net.core.default_qdisc=fq を書き、起きた時に作られる qdisc の既定を決めておく。'
		]
	},
	callout: {
		type: 'tip',
		text: '上限を戻すだけでも行列は 1 MiB（10 GbE で約 0.8 ms）に縮む。fq を足すと、流れ同士の待たせ合いも消える。'
	},
	changes: [
		{ mark: '~', text: 'tcp_limit_output_bytes 256 MiB → 1 MiB' },
		{ mark: '~', text: 'qdisc pfifo → fq（流れごと・時刻順）' },
		{ mark: '-', text: 'backlog 30 MB → 1.36 MB' },
		{ mark: '~', text: 'RTT 24.5 → 0.512 ms' }
	],
	facts: [
		{ k: '64 KiB の間隔', v: '56 µs（65,536 B ÷ 9.3 Gbps）', calc: '65536*8/9300' },
		{ k: '手元の行列', v: '1,357,500 B（約 1 ms 分）' },
		{ k: 'この流れの RTT', v: '0.512 ms（fq で待つ分は数えない）' },
		{ k: 'fq の quantum', v: '3,028 B（2 × 1,514）', calc: '2*1514' }
	],
	scene: [
		{ op: 'change', id: 'app', k: 'qdisc', v: 'fq・backlog 1.36 MB' },
		{ op: 'move', from: 'app', to: 'sw', payload: 'ssh（すぐ出る）', kind: 'data' }
	],
	log: {
		t: '8.000s',
		from: 'app',
		to: 'sw',
		kind: 'data',
		info: 'fq に替えた。backlog 1.36 MB、RTT 0.512 ms、ssh 0.5 ms'
	},
	town: '出口の行列を行き先ごとに分け、荷ごとに出る時刻を決めた。急ぎの小包は自分の列ですぐ出る',
	work: 'tc qdisc replace dev eth0 root fq と sysctl.d の default_qdisc',
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					conn,
					{
						id: 'd-qdisc',
						depth: 1,
						what: 'qdisc fq（eth0）',
						state: 'backlog 1357Kb 21p',
						tone: 'ok'
					},
					{ id: 's-limit', depth: 1, what: 'tcp_limit_output_bytes', state: '1048576', tone: 'ok' },
					{
						id: 'c-ssh',
						depth: 1,
						what: 'TCP 10.0.0.5:22 → 10.0.0.77:51022',
						state: 'rtt 0.5 ms',
						tone: 'ok'
					}
				]
			}
		]
	},
	metrics: { rtt: '0.5 ms', qd: '1,357,500 B' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_wx', 'b_dev', 'b_drv'] } },
		{
			at: 400,
			dur: 450,
			para: 0,
			do: { op: 'badge', id: 'b_wx', text: 'TSQ 上限 1 MiB → fq では 1 ms 分' }
		},
		{ at: 500, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{ at: 900, dur: 450, para: 0, do: { op: 'dequeue', queue: 'qpf', item: 'C1 64K' } },
		{ at: 1300, dur: 450, para: 0, do: { op: 'dequeue', queue: 'qpf', item: 'C2 64K' } },
		{ at: 1700, dur: 450, para: 0, do: { op: 'dequeue', queue: 'qpf', item: 'C3 64K' } },
		{ at: 2100, dur: 450, para: 1, do: { op: 'enqueue', queue: 'qfq', item: 'C5 +0µs' } },
		{ at: 2200, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 2500, dur: 450, para: 1, do: { op: 'enqueue', queue: 'qfq', item: 'C6 +56µs' } },
		{ at: 2900, dur: 450, para: 1, do: { op: 'enqueue', queue: 'qfq', item: 'C7 +112µs' } },
		{ at: 3400, dur: 1000, para: 2, do: { op: 'count', metric: 'qd', to: '1,357,500 B' } },
		{ at: 3500, dur: 1000, para: 2, do: { op: 'count', metric: 'rtt', to: '0.5 ms' } },
		{ at: 3600, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{
			at: 4600,
			dur: 700,
			para: 3,
			do: { op: 'packet', a: 'b_dev', b: 'b_drv', label: 'ssh（別の列）', kind: 'data' }
		},
		{
			at: 4700,
			dur: 450,
			para: 3,
			do: { op: 'badge', id: 'b_dev', text: 'backlog 1.36 MB・ssh は 0.5 ms' }
		},
		{ at: 4800, dur: 400, para: 3, do: { op: 'board', line: 3 } },
		{ at: 5400, dur: 600, para: 3, do: { op: 'move', item: 'C5 +0µs', from: 'qfq', to: 'ring' } },
		{ at: 6100, dur: 600, para: 3, do: { op: 'move', item: 'C6 +56µs', from: 'qfq', to: 'ring' } },
		{ at: 6800, dur: 400, para: 3, do: { op: 'board', line: 4 } }
	],
	loop: [
		{ at: 0, dur: 500, do: { op: 'peek', queue: 'qfq', item: 'C7 +112µs' } },
		{
			at: 600,
			dur: 700,
			do: { op: 'packet', a: 'b_dev', b: 'b_drv', label: '時刻どおり', kind: 'data' }
		},
		{ at: 1400, dur: 700, do: { op: 'packet', a: 'b_dev', b: 'b_drv', label: 'ssh', kind: 'data' } }
	],
	board: [
		'tcp_limit_output_bytes を 1 MiB に戻す',
		'tc qdisc replace … root fq',
		'手元 30 MB → 1.36 MB、RTT 0.512 ms',
		'ssh は別の列で 0.5 ms',
		'skb の時刻どおりに 56 µs 間隔'
	],
	badges: { b_dev: 'backlog 1.36 MB・ssh は 0.5 ms', b_wx: 'TSQ 上限 1 MiB → fq では 1 ms 分' },
	layers: [B.tcp([]), B.qd([], ['C1 64K', 'C2 64K', 'C3 64K', 'C4 64K']), B.drv([], [])],
	impl: [I.wx, I.tx, I.tsqCheck, I.devq, I.fqEnq, I.fqDeq, I.drv, I.tso, I.limitOut, I.pacing],
	refs: ['linux-fq', 'man-tc-fq', 'linux-tcp-output', 'linux-sysctl', 'systemd-sysctl'],
	learns: [5]
};

export const s12: Step = {
	n: 12,
	kind: 'tradeoff',
	short: '代償',
	title: 'CUBIC と BBR、塊の大きさ',
	lead: '喪失で減らすか、測った速さで送るか。塊は CPU と待ちの取り引き',
	body: [
		'CUBIC は喪失で cwnd を 0.7 倍にし、BBR は測った帯域と RTT で送る。',
		'TSO と GRO の塊は CPU を減らすが、塊の分だけ待ちと突発が増える。'
	],
	depth: {
		intro: [
			'速さの決め方には 2 つの考えがある。落ちたら減らす CUBIC と、線の太さと往復の時間を測ってその分だけ送る BBR だ。',
			'どちらにも得と損がある。落ちる割合が 1% の回線では、CUBIC の速さは 9.3 Gbps から約 0.3 Gbps まで落ちうる。'
		],
		work: [
			'CUBIC（v6.12 の既定）は 1 回の喪失で cwnd を 0.7 倍にし、時間の 3 乗の曲線で戻す。喪失が 1% の回線では、cwnd が育つ前にまた落ちる。',
			'BBR（v6.12 の tcp_bbr.c は版 1）は、届いた速さの最大と RTT の最小を測り、その積の 2 倍を cwnd にする。送る速さを 1.25 倍・0.75 倍・1 倍 × 6 の 8 段で回して試す。',
			'BBR は 1% 程度の喪失では速さを落とさない。代わりに、浅いバッファでは再送が増え、CUBIC と並ぶと帯域を取りすぎることがある。',
			'TSO と GRO の塊を大きくすると、層を下りる回数が 45 分の 1 になり CPU が減る。だが 64 KiB の塊は 10 GbE で 52 µs の突発になり、浅いスイッチではあふれの元になる。'
		],
		deep: [
			'CUBIC（RFC 9438）は、喪失の時の cwnd を W_max とし、W(t) = C × (t − K)^3 ＋ W_max で戻す。C は 0.4、β は Linux で 717/1024 ≈ 0.7 だ。RTT によらず時間で戻るので、RTT の違う流れの間でも公平に近い。',
			'Reno の目安（Mathis の式）では、速さ ≈ MSS ÷ RTT × 1.22 ÷ √p だ。RTT 0.5 ms・喪失 1% なら 1,448 B × 8 ÷ 0.5 ms × 12.2 ≈ 283 Mbps になる。CUBIC は Reno より強いが、喪失 1% で桁が落ちることは変わらない。',
			'BBR v1 の状態は STARTUP（2.885 倍で探る）→ DRAIN → PROBE_BW（8 段の速さ）と進む。10 秒ごとに PROBE_RTT に入り、200 ms の間 cwnd を 4 個に絞る。この間は速さが落ちる。',
			'BBR は送る速さを持つので、fq か TCP の中のペーシングが要る。BBR は Google の Cardwell らが 2016 年に ACM Queue で発表した。同じ年に Linux 4.9 の tcp_bbr.c として入った。',
			'塊の大きさは tcp_tso_autosize() が約 1 ms 分に絞る。速さを上げたい時は BIG TCP で 64 KiB の上限を広げ、待ちを減らしたい時は ethtool -K で tso を切って比べる。'
		]
	},
	callout: {
		type: 'point',
		text: '「BBR にすれば速い」は条件つき。喪失が混雑のせいではない回線で効き、浅いバッファの共有回線では他の流れを押しのけうる。'
	},
	changes: [
		{ mark: '~', text: 'CUBIC：喪失で cwnd × 0.7' },
		{ mark: '~', text: 'BBR：帯域 × RTT × 2 を cwnd に' },
		{ mark: '+', text: 'つまみで RTT・cwnd・喪失を動かせる' }
	],
	facts: [
		{ k: 'CUBIC の β', v: '0.7（717 ÷ 1,024）', calc: '717/1024' },
		{
			k: '喪失 1% の Reno の目安',
			v: '283 Mbps（1,448 × 8 ÷ 0.5 ms × 12.2）',
			calc: '1448*8/0.0005*12.2/1000000'
		},
		{ k: 'BBR の cwnd', v: '帯域 × 最小 RTT × 2' },
		{ k: '64 KiB の突発', v: '52 µs（10 Gbps）', calc: '65536*8/10000' }
	],
	scene: [{ op: 'change', id: 'app', k: '輻輳制御', v: 'cubic' }],
	log: {
		t: '8.000s',
		from: 'app',
		to: 'peer',
		kind: 'data',
		info: 'CUBIC：喪失 1% で桁が落ちる。BBR：落ちないが他を押しのけうる'
	},
	town: '落ちたら減らす運び方と、道の太さを測って運ぶ運び方。どちらも道が混むと得手不得手がある',
	work: 'sysctl net.ipv4.tcp_congestion_control で今の方式を見る',
	knobs: ['rtt', 'cwnd', 'loss'],
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					conn,
					{ id: 's-cc', depth: 2, what: 'tcp_congestion_control', state: 'cubic（v6.12 の既定）' },
					{ id: 's-cwnd', depth: 2, what: 'snd_cwnd', state: '430' }
				]
			}
		]
	},
	metrics: { cwnd: '430 個' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['app', 'sw', 'peer'] } },
		{ at: 400, dur: 450, para: 0, do: { op: 'badge', id: 'app', text: 'CUBIC：喪失 → × 0.7' } },
		{ at: 500, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 900,
			dur: 800,
			para: 0,
			do: { op: 'packet', a: 'app', b: 'sw', label: 'cwnd 430', kind: 'data' }
		},
		{
			at: 1700,
			dur: 800,
			para: 1,
			do: { op: 'packet', a: 'sw', b: 'peer', label: '1.25 倍で試す', kind: 'data' }
		},
		{ at: 1800, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{
			at: 2600,
			dur: 800,
			para: 2,
			do: { op: 'packet', a: 'sw', b: 'peer', label: '1% 落ちる', kind: 'data', drop: true }
		},
		{ at: 2700, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 3500, dur: 1000, para: 2, do: { op: 'count', metric: 'cwnd', to: '430 個' } },
		{
			at: 4600,
			dur: 450,
			para: 3,
			do: { op: 'badge', id: 'sw', text: '64 KiB の突発 52 µs', tone: 'warn' }
		},
		{ at: 4700, dur: 400, para: 3, do: { op: 'board', line: 3 } },
		{ at: 5300, dur: 500, para: 3, do: { op: 'pulse', id: 'sw' } }
	],
	loop: [
		{ at: 0, dur: 800, do: { op: 'packet', a: 'app', b: 'sw', label: '窓', kind: 'data' } },
		{ at: 800, dur: 800, do: { op: 'packet', a: 'sw', b: 'peer', label: '窓', kind: 'data' } }
	],
	board: [
		'CUBIC：落ちたら × 0.7、3 乗で戻す',
		'BBR：帯域 × 最小 RTT × 2、8 段で試す',
		'喪失 1%：Reno の目安で 283 Mbps',
		'塊が大きいほど CPU 減・突発増'
	],
	badges: { app: 'CUBIC：喪失 → × 0.7', sw: '64 KiB の突発 52 µs' },
	refs: ['rfc9438', 'bbr', 'linux-tcp-cubic', 'linux-tcp-bbr', 'linux-tcp-output'],
	learns: [5]
};
