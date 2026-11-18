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
	lead: '途中なら 1 往復で直る。最後が落ちても TLP が約 3 ms で気づく',
	body: [
		'スイッチで D2 が 1 個落ちると、store-1 は D3〜D5 を SACK で知らせる。',
		'RACK が D2 を失ったと決めて送り直す。最後が落ちた時は TLP が確かめる。'
	],
	depth: {
		intro: [
			'スイッチの待ち行列があふれ、D1〜D5 のうち D2 だけが捨てられた。store-1 には D1 と D3〜D5 が届き、「D2 が抜けている」と ACK で知らせる。',
			'app-1 は控えの D2 を送り直す。ここまで 1 往復と少し、0.6 ms ほどで直る。'
		],
		work: [
			'store-1 は「725,449 番の手前まで受け取った」という ACK を、SACK（どこが届いたか）付きで返す。D3〜D5 の 3 個分だ。受け取り側の GRO が 3 個をまとめると、tcpdump では 1 本に見える。',
			'v6.12 の既定（tcp_recovery=1）では、RACK が送った時刻で喪失を決める。並び替えを見ていない間は、SACK が 3 個（reordering の既定）に届いた所で、待たずに D2 を失ったと決める。',
			'tcp_retransmit_skb() が再送キューの D2 の写しを作って送り直す。CUBIC は cwnd を 0.7 倍の 280 個に下げる。',
			'落ちたのが最後の区切りなら、後ろの ACK が返らない。TLP（確かめの送り）が約 3 ms（2 × srtt ＋ 2 ms）で最後を送り直し、喪失に気づく。200 ms の RTO を待つのは、飛んでいるのが 1 個だけの時か、確かめも落ちた時だ。'
		],
		deep: [
			'tcp_ack() の中の tcp_fastretrans_alert() が回復に入るかを決める。RACK を使う時、tcp_time_to_recover() は lost_out（失ったと決めた数）を見る。RFC 5681 の重複 ACK 3 つの決まりも、RACK の中の近道として残る（TCP_RACK_NO_DUPTHRESH で切れる）。',
			'RACK（RFC 8985）は、送ってからの時間が rack.rtt ＋ reo_wnd を超えた未 ACK を失ったとする。判定は tcp_rack_skb_timeout() だ。reo_wnd は min_rtt の 1/4 だ。並び替えを見ていず SACK が reordering 以上なら、tcp_rack_reo_wnd() は 0 を返す。',
			'回復の間は PRR（Proportional Rate Reduction）が 1 ACK ごとに送ってよい数を決める。CUBIC の ssthresh は cwnd × 717/1024 で 280 だ。',
			'TLP は tcp_schedule_loss_probe() が時計を掛ける。待ちは 2 × srtt に 2 ms（TCP_TIMEOUT_MIN_US）を足した値だ。飛んでいるのが 1 個だけなら、待ちは 2 × srtt ＋ RTO の下限になる。',
			'RTO は srtt ＋ 4 × rttvar だが、rttvar の下限が 200 ms だ。設定は net.ipv4.tcp_rto_min_us（既定 200000）と経路の rto_min。切れると tcp_enter_loss() で cwnd を 1 にし、続けば RTO は倍々で上限 120 秒まで伸びる。'
		]
	},
	callout: {
		type: 'warn',
		text: '1 個の喪失の値段は場所で違う。途中なら約 0.6 ms、最後でも TLP で約 3 ms。飛んでいるのが 1 個だけだと RTO の 200 ms。'
	},
	changes: [
		{ mark: '-', text: 'D2 がスイッチで捨てられた' },
		{ mark: '+', text: 'SACK 付きの ACK（D3〜D5 が届いた）' },
		{ mark: '~', text: 'cwnd 400 → 280 個' }
	],
	facts: [
		{ k: 'RACK の待ち', v: '0 ms（SACK 3 個・並び替えを見ていない）' },
		{ k: '新しい cwnd', v: '280 個（400 × 717 ÷ 1,024）', calc: '400*717/1024' },
		{ k: 'TLP の待ち', v: '3 ms（2 × 0.5 ms ＋ 2 ms）', calc: '2*0.5+2' },
		{ k: 'RTO', v: '200 ms（tcp_rto_min_us の 200,000 µs）', calc: '200000/1000' }
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
		opts: ['約 0.6 ms（後ろの SACK で気づく）', '200 ms（RTO を待つ）', '1 秒'],
		a: 0,
		why: 'D3〜D5 が届いて SACK が返るので、RACK が 1 往復ほどで気づく。RTO を待つのは、飛んでいるのが 1 個だけで TLP も落ちた時。'
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
				text: '10:15:06.000510 IP 10.0.0.9.9000 > 10.0.0.5.43210: Flags [.], ack 725449, win 502, options [nop,nop,TS val 10000 ecr 8000,nop,nop,sack 1 {726897:731241}], length 0'
			},
			{
				t: '10:15:06.000640',
				src: 'tcpdump',
				text: '10:15:06.000640 IP 10.0.0.5.43210 > 10.0.0.9.9000: Flags [.], seq 725449:726897, ack 1, win 502, options [nop,nop,TS val 8000 ecr 10000], length 1448'
			},
			{
				t: '10:15:06.001150',
				src: 'tcpdump',
				text: '10:15:06.001150 IP 10.0.0.9.9000 > 10.0.0.5.43210: Flags [.], ack 731241, win 502, options [nop,nop,TS val 10001 ecr 8000], length 0'
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
	lead: '256 本が pfifo に 30 MB 積み、ssh が 24 ms 待つ',
	body: [
		'backup が 256 本の流れで並べて写し、出口の qdisc は来た順の pfifo だった。',
		'手元に 30 MB 溜まり、後ろの ssh も 24 ms 待たされる。'
	],
	depth: {
		intro: [
			'夜の写しを速めようと、backup が 256 本の流れを並べて store-1 へ写すようにした。出口の qdisc は来た順の pfifo だ。',
			'すると app-1 の出口に 30 MB の荷が積み上がった。同じ出口を通る ssh の小さな区切りも、その後ろに並んで 24 ms 待つ。速さは上がらず、待ちだけが 50 倍になった。'
		],
		work: [
			'TSQ は流れ 1 本ずつの上限だ。どの流れも 2 × truesize（64 KiB の塊 2 個分、約 130 KB）までは手元に置ける。256 本では平均 117 KB ずつ、合わせて 30 MB が pfifo に並ぶ。',
			'10 GbE は 1 秒に 1.25 GB しか出せない。積んだ 30 MB は、出し切るまで 24 ms かかる。',
			'RTT は 0.5 ms から 24.5 ms に伸びた。線は前から使い切っていて、速さは変わらない。これが bufferbloat（溜まりすぎ）だ。',
			'別の止まり方に受信窓 0 がある。store-1 のディスクが遅れて受け取りの場所が尽きると、win 0 が返る。app-1 は RTO から倍々に伸びる間隔で、窓を確かめる区切り（probe）だけを送る。'
		],
		deep: [
			'tcp_small_queue_check() の上限は max(2 × truesize, sk_pacing_rate >> 10) だ。pfifo の下（SK_PACING_NONE）では、さらに tcp_limit_output_bytes（既定 1 MiB）との小さい方になる。',
			'1 本 39 Mbps の流れでは、速さの 1 ms 分は約 5 KB しかない。だから 2 × truesize の約 130 KB が効く。tcp_limit_output_bytes は 1 MiB でも 256 KiB でも効かず、溜まりは本数 × 1 本の量で決まる。',
			'pfifo の上限は既定で txqueuelen（1,000 個）だが、ここでは limit 100000 で作られていた。塊 1 個は約 64 KiB なので、30 MB は 458 個で上限の内に収まり、捨てられない。',
			'受信窓 0 では、送る側は tcp_send_probe0() で、番号 snd_una − 1・中身 0 B の確かめの区切りを送る。窓が開いた ACK が来るまで送信キューは減らず、send() は sk_sndbuf で眠る。',
			'どちらも喪失は無いのに待ちだけが伸びる。再送の数（TcpRetransSegs）が 0 でも遅い時は 3 つを見る。ss -tim の rtt、tc -s qdisc の backlog、tcpdump の win だ。'
		]
	},
	callout: {
		type: 'warn',
		text: '待ち行列を大きくしても、線より速くは出せない。増えるのは待ちだけ。bufferbloat は喪失 0 のまま遅くなる。'
	},
	changes: [
		{ mark: '+', text: 'qdisc に 30 MB（256 本 × 117 KB）' },
		{ mark: '~', text: 'RTT 0.5 → 24.5 ms' },
		{ mark: '-', text: 'ssh の区切りが 24 ms 待つ' }
	],
	facts: [
		{ k: 'backlog', v: '30,000,000 B（256 本 × 約 117 KB）', calc: '256*117187.5' },
		{ k: '出し切るまで', v: '24 ms（30 MB ÷ 1.25 GB/s）', calc: '30000000/1250000000*1000' },
		{ k: 'RTT', v: '24.5 ms（0.5 ＋ 24）', calc: '0.5+24' },
		{ k: '1 本の速さ', v: '39 Mbps（10 Gbps ÷ 256）', calc: '10000/256' }
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
		q: 'tcp_limit_output_bytes を 1 MiB から 256 KiB に下げた。溜まりは？',
		opts: ['4 分の 1 に減る', 'ほぼ変わらない', '増える'],
		a: 1,
		why: '1 本が置くのは 2 × truesize の約 130 KB で、256 KiB より下。上限は効いておらず、溜まりは本数で決まる。'
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
						state: 'backlog 30000000b 458p',
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
				text: '10:15:07.000100 IP 10.0.0.9.9000 > 10.0.0.5.43210: Flags [.], ack 412880001, win 0, options [nop,nop,TS val 11000 ecr 9000], length 0'
			},
			{
				t: '10:15:07.200300',
				src: 'tcpdump',
				text: '10:15:07.200300 IP 10.0.0.5.43210 > 10.0.0.9.9000: Flags [.], ack 1, win 502, options [nop,nop,TS val 9200 ecr 11000], length 0'
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
			do: { op: 'badge', id: 'b_wx', text: '1 本 117 KB × 256 本', tone: 'warn' }
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
		'TSQ：1 本ずつ 2 × truesize まで → 256 本で 30 MB',
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
	title: 'qdisc を fq に替える',
	lead: '流れごとの列で、ssh を 30 MB の後ろに並ばせない',
	body: [
		'qdisc を pfifo から、流れごとに列を分ける fq に替える。',
		'ssh は自分の列ですぐ出る。溜まりそのものを削るなら fq_codel を使う。'
	],
	depth: {
		intro: [
			'直し方は qdisc を替えること。流れごとに列を分ける fq にする。手元の上限の設定は触らなくてよい。',
			'ssh の区切りは自分の列に入り、30 MB の後ろに並ばない。ssh の RTT は 24.5 ms から 0.6 ms に戻り、40 分の 1 になる。'
		],
		work: [
			'sudo tc qdisc replace dev eth0 root fq で替える。この機械の NIC は送り口が 1 つなので、root に 1 つ置けばよい。',
			'fq は流れごとに列を持ち、空から来た新しい流れを先に出す。ssh の区切りは数百 B で、写しの 256 列の 1 巡（約 0.6 ms）を待たずに出る。',
			'写しの 256 本は、fq の中で溜まったままだ。送る速さが線を超える間は時刻を過ぎた荷が並び、写しの RTT は約 24 ms のまま残る。',
			'溜まりそのものを削るなら fq_codel を選ぶ。列に居た時間が 5 ms を 100 ms 超え続けると捨て、写しの流れに cwnd を下げさせる。'
		],
		deep: [
			'fq は流れ（ソケット、または 5 つ組の hash）ごとに列を持つ。fq_dequeue() は新しい流れの列を先に回し、時刻の来た列を Deficit Round Robin で 1 回 3,028 B ずつ回す。1 つの流れは 100 個、全体は 10,000 個まで積める。',
			'__tcp_transmit_skb() は skb の時刻に tcp_wstamp_ns（出してよい時刻）を書き、fq はその時刻まで待たせる。RTT はこの時刻から測るが、時刻を過ぎても線が空かずに待つ分は RTT に入る。',
			'TCP はペーシングの速さ sk_pacing_rate を cwnd と srtt から決め、fq はそれを守るだけだ。BBR は fq が無くても SK_PACING_NEEDED として、TCP の中の hrtimer（tcp_pace_kick()）で同じことをする。',
			'fq_codel の CoDel は、列の頭の区切りが居た時間を見る。target 5 ms を interval 100 ms の間超え続けると、捨て始める。次に捨てるまでの間は interval ÷ √捨てた数 で縮める（RFC 8290）。',
			'替えは再起動で消える。/etc/sysctl.d/ に net.core.default_qdisc=fq を書くと、起きた時の既定が決まる。送り口が 64 個ある NIC では、root の mq の下の 64 個の口にこの既定が付く。'
		]
	},
	callout: {
		type: 'tip',
		text: 'tcp_limit_output_bytes を下げても、本数で積もる溜まりは減らない。効く手は qdisc を替えること。'
	},
	changes: [
		{ mark: '~', text: 'qdisc pfifo → fq（流れごとの列）' },
		{ mark: '~', text: 'ssh の RTT 24.5 → 0.6 ms' },
		{ mark: '~', text: '写しの 30 MB は残る（削るのは fq_codel）' }
	],
	facts: [
		{ k: 'DRR の 1 巡', v: '775,168 B（256 列 × 3,028 B）', calc: '256*3028' },
		{ k: '1 巡の時間', v: '0.62 ms（775,168 B ÷ 1.25 GB/s）', calc: '775168/1250000000*1000' },
		{ k: 'ssh の RTT', v: '0.6 ms（0.5 ＋ 新しい流れの待ち 0.1）', calc: '0.5+0.1' },
		{ k: 'fq の quantum', v: '3,028 B（2 × 1,514）', calc: '2*1514' }
	],
	scene: [
		{ op: 'change', id: 'app', k: 'qdisc', v: 'fq・ssh は別の列' },
		{ op: 'move', from: 'app', to: 'sw', payload: 'ssh（すぐ出る）', kind: 'data' }
	],
	log: {
		t: '8.000s',
		from: 'app',
		to: 'sw',
		kind: 'data',
		info: 'fq に替えた。ssh の RTT 0.6 ms。写しの backlog 30 MB は残る'
	},
	town: '出口の行列を行き先ごとに分けた。急ぎの小包は自分の列ですぐ出る',
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
						state: 'backlog 30000000b 458p',
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
	metrics: { rtt: '0.6 ms', qd: '30,000,000 B' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_wx', 'b_dev', 'b_drv'] } },
		{
			at: 400,
			dur: 450,
			para: 0,
			do: { op: 'badge', id: 'b_wx', text: 'SK_PACING_FQ：時刻を書く' }
		},
		{ at: 500, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{ at: 900, dur: 450, para: 0, do: { op: 'dequeue', queue: 'qpf', item: 'C1 64K' } },
		{ at: 1300, dur: 450, para: 0, do: { op: 'dequeue', queue: 'qpf', item: 'C2 64K' } },
		{ at: 1700, dur: 450, para: 0, do: { op: 'dequeue', queue: 'qpf', item: 'C3 64K' } },
		{ at: 2100, dur: 450, para: 1, do: { op: 'enqueue', queue: 'qfq', item: 'F1 64K' } },
		{ at: 2200, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 2500, dur: 450, para: 1, do: { op: 'enqueue', queue: 'qfq', item: 'F2 64K' } },
		{ at: 2900, dur: 450, para: 1, do: { op: 'enqueue', queue: 'qfq', item: 'ssh 120B' } },
		{ at: 3400, dur: 1000, para: 2, do: { op: 'count', metric: 'rtt', to: '0.6 ms' } },
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
			do: { op: 'badge', id: 'b_dev', text: 'ssh は別の列・0.6 ms' }
		},
		{ at: 4800, dur: 400, para: 3, do: { op: 'board', line: 3 } },
		{ at: 5400, dur: 600, para: 3, do: { op: 'move', item: 'ssh 120B', from: 'qfq', to: 'ring' } },
		{ at: 6100, dur: 600, para: 3, do: { op: 'move', item: 'F1 64K', from: 'qfq', to: 'ring' } },
		{ at: 6800, dur: 400, para: 3, do: { op: 'board', line: 4 } }
	],
	loop: [
		{ at: 0, dur: 500, do: { op: 'peek', queue: 'qfq', item: 'F2 64K' } },
		{
			at: 600,
			dur: 700,
			do: { op: 'packet', a: 'b_dev', b: 'b_drv', label: '1 巡 0.62 ms', kind: 'data' }
		},
		{ at: 1400, dur: 700, do: { op: 'packet', a: 'b_dev', b: 'b_drv', label: 'ssh', kind: 'data' } }
	],
	board: [
		'tc qdisc replace … root fq',
		'新しい流れの列（ssh）を先に回す',
		'ssh の RTT 24.5 → 0.6 ms',
		'写しの 256 列は DRR で 1 巡 0.62 ms',
		'溜まりを削るなら fq_codel'
	],
	badges: { b_dev: 'ssh は別の列・0.6 ms', b_wx: 'SK_PACING_FQ：時刻を書く' },
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
			'塊の大きさは tcp_tso_autosize() が約 1 ms 分に絞る。速さを上げたい時は BIG TCP で 64 KiB の上限を広げる（NIC が対応する時だけ）。ethtool -K で tso を切っても、GSO がソフトで同じ大きさに割って続けて出すので、線の上の突発は減らない。'
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
