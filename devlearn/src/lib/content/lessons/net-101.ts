// 見本 1（learn-standard.md 第 12 章・curriculum-standard.md 6.2）：TCP で送って ACK が返るまで（Linux v6.12 のカーネルの中）。
// 関数・構造体・設定の名前は Linux v6.12 の tag のソースで確かめた（npm run impl:verify）。材料は src/lib/content/v2/。
import type { Lesson } from '../../lesson/types.ts';
import { sources } from '../v2/tcp-base.ts';
import { s1, s2, s3, s4 } from '../v2/tcp-steps-1.ts';
import { s5, s6, s7, s8 } from '../v2/tcp-steps-2.ts';
import { s9, s10, s11, s12 } from '../v2/tcp-steps-3.ts';
import { s13, s14, s15, s16 } from '../v2/tcp-steps-4.ts';

export const net101: Lesson = {
	id: 'net-101',
	field: 'net',
	level: 3,
	title: 'カーネルの中の TCP 送信と ACK',
	goal: 'send() から ACK で送りが続くまでを、カーネルの関数とキューと文脈で説明できる',
	prereq: ['net-005'],
	related: ['net-007'],
	next: [],
	tier: 3,
	minutes: 60,
	learn: [
		'skb と送信キュー・再送キューの役目',
		'tcp_write_xmit() が送るか待つかを決める 6 つの関所',
		'IP・近隣・qdisc・ドライバ・TSO を通る下り道',
		'ACK が NAPI と GRO を通って送りを続けさせる道',
		'プロセス・hardirq・softirq（tasklet を含む）の文脈の違い',
		'喪失と溜まりすぎの症状・原因・直し方',
		'ss・nstat・tc・ethtool で数を読む'
	],
	metrics: [
		{ key: 'cwnd', label: 'cwnd', unit: '個' },
		{ key: 'wq', label: '送信キュー', unit: 'B' },
		{ key: 'rtx', label: '未 ACK（再送キュー）', unit: '個' },
		{ key: 'rtt', label: 'RTT', unit: 'ms' },
		{ key: 'qd', label: 'qdisc の backlog', unit: 'B' }
	],
	legend: [
		{ kind: 'data', label: 'データの区切り', style: 'solid' },
		{ kind: 'ack', label: 'ACK', style: 'dash' },
		{ kind: 'call', label: '関数の呼び出し', style: 'dash' },
		{ kind: 'syn', label: 'つなぐ（SYN）', style: 'double' },
		{ kind: 'retx', label: '送り直し', style: 'double' },
		{ kind: 'probe', label: '窓の確かめ', style: 'solid' }
	],
	sources,
	terms: [
		{
			word: 'skb',
			mean: 'カーネルがデータの塊を持つ入れ物（struct sk_buff）。頭の余白と断片の表を持つ'
		},
		{ word: 'cwnd', mean: '確かめずに一度に送ってよい区切りの数。ACK で増え、喪失で減る' },
		{ word: 'RTT', mean: '送ってから ACK が返るまでの往復の時間' },
		{ word: 'MSS', mean: '1 つの区切りに載せるデータの最大。ここでは 1,448 B' },
		{ word: 'TSO', mean: '大きな skb を NIC が MSS ごとのフレームに割る仕組み' },
		{ word: 'GRO', mean: '受け取ったフレームを、続きの物どうし 1 個の skb にまとめる仕組み' },
		{ word: 'NAPI', mean: '割り込みの後、softirq の中で受け取った物をまとめて取り出す仕組み' },
		{ word: 'softirq', mean: '割り込みの後で動く、眠れないカーネルの仕事の文脈' },
		{ word: 'qdisc', mean: 'NIC に渡す前の待ち行列と、出す順の決め方' },
		{
			word: 'TSQ',
			mean: '手元の qdisc と NIC に置く量を、1 本ずつ max(約 1 ms 分, 塊 2 個) に抑える仕組み'
		},
		{ word: 'EDT', mean: 'skb に「出してよい時刻」を書いて、qdisc がその時刻まで待たせる方式' },
		{ word: 'RACK', mean: '送った時刻で喪失を決める仕組み（RFC 8985）' },
		{ word: 'RTO', mean: 'ACK が来ないまま時間切れで送り直すまでの待ち。Linux では下限 200 ms' },
		{ word: 'SACK', mean: '抜けの後ろのどこまで届いたかを知らせる ACK の選択肢' },
		{ word: 'bufferbloat', mean: '待ち行列が大きすぎて、喪失なしに待ちだけが伸びること' }
	],
	knobs: [
		{ id: 'rtt', label: 'RTT', unit: 'ms', min: 0.5, max: 100, step: 0.5, value: 0.5 },
		{ id: 'cwnd', label: 'cwnd', unit: '個', min: 10, max: 800, step: 10, value: 430 },
		{ id: 'loss', label: '喪失', unit: '%', min: 0, max: 5, step: 0.5, value: 0 }
	],
	explain: [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16],
	example: {
		intro:
			'ssh の rtt 24.5 ms が minrtt 0.5 ms の 49 倍なら、どこかの行列で待っている。tc の backlog 30 MB は 10 GbE で 24 ms 分だ',
		lines: [
			'$ ss -tim dst 10.0.0.77',
			'State Recv-Q Send-Q     Local Address:Port  Peer Address:Port Process',
			'ESTAB 0      0                 10.0.0.5:22    10.0.0.77:51022 ',
			'\t skmem:(r0,rb131072,t0,tb87040,f0,w0,o0,bl0,d0) ts sack cubic wscale:7,7 rto:225 rtt:24.5/0.31 ato:40 mss:1448 pmtu:1500 rcvmss:536 advmss:1448 cwnd:10 bytes_sent:184320 bytes_acked:184320 bytes_received:36864 segs_out:2210 segs_in:1630 data_segs_out:1180 data_segs_in:640 send 4.73Mbps lastsnd:12 lastrcv:12 lastack:12 pacing_rate 9.46Mbps delivery_rate 1.2Mbps delivered:1181 app_limited busy:1200ms rcv_space:14480 rcv_ssthresh:64088 minrtt:0.5',
			'$ tc -s qdisc show dev eth0',
			'qdisc pfifo 8001: root refcnt 2 limit 100000p',
			' Sent 81234567890 bytes 1239500 pkt (dropped 0, overlimits 0 requeues 0) ',
			' backlog 30000000b 440p requeues 0'
		]
	},
	practice: {
		goal: '夜の写しの間、ssh が 25 ms 待たされる。数を読んで原因を絞り、出口の qdisc を直す',
		tool: { name: 'shell', mode: 'mock' },
		commands: ['ss', 'tc', 'sysctl', 'nstat', 'ethtool'],
		setup: { world: 'tcp' },
		success: {
			tcp: {
				qdisc: ['fq', 'fq_codel'],
				rttBelow: 2
			}
		},
		mistakes: [
			{
				when: 'sudo を付けずに qdisc を替えた',
				why: 'qdisc を替えるには CAP_NET_ADMIN が要る。learner の権限ではカーネルが断る',
				next: 'sudo tc qdisc replace dev eth0 root fq と打つ',
				match: 'Operation not permitted'
			},
			{
				when: 'sudo を付けずに sysctl -w した',
				why: '/proc/sys の設定を書けるのは root だけ',
				next: 'sudo を付ける。ただし 256 KiB に下げても溜まりは減らず、塊 1 個（66 KB）より下げても 256 本 × 1 個で約 17 MB 残る。qdisc を見る',
				match: 'permission denied on key'
			},
			{
				when: 'qdisc の名前を打ち間違えた',
				why: 'カーネルに無い種類の qdisc は作れない',
				next: 'fq か fq_codel と打つ（sudo tc qdisc replace dev eth0 root fq_codel）',
				match: 'qdisc kind is unknown'
			},
			{
				when: '装置の名前を間違えた',
				why: 'この機械の線は eth0 だけ。eth1 は無い',
				next: 'dev eth0 にして打ち直す',
				match: 'Cannot find device'
			}
		]
	},
	check: [
		{
			ask: 'ssh の ss -tim で rtt:24.5・minrtt:0.5・再送なし。まず何を見るか',
			how: 'tc -s qdisc の backlog',
			kind: 'scene',
			opts: ['tc -s qdisc の backlog', '相手の受信窓だけ', 'NIC の故障の記録']
		},
		{
			ask: 'RTT 0.5 ms の網で、短い応答がときどき 200 ms 止まる。まず疑う物は',
			how: '1 個だけ飛んでいる時の喪失と RTO',
			kind: 'scene',
			opts: ['1 個だけ飛んでいる時の喪失と RTO', 'Nagle の待ち', 'GRO のまとめ']
		},
		{
			ask: 'cwnd 10・MSS 1,448 B。最初の往復で送れるのは何 B か',
			how: '14,480 B（10 × 1,448）',
			kind: 'number'
		},
		{
			ask: 'tcp_transmit_skb() が clone を下へ流し、元の skb を残すのはなぜか',
			how: '元を再送キューに残し、ACK が来なければ送り直すため'
		},
		{
			ask: 'ACK を受けて tcp_write_xmit() を呼び直すのは、どの文脈か',
			how: 'softirq',
			opts: ['プロセス', 'softirq', 'hardirq']
		},
		{
			ask: 'qdisc を pfifo から fq に替えると、ssh の区切りはどうなるか',
			how: '別の列に入り、大きな流れの後ろで待たない'
		},
		{
			ask: '256 本の写しで 30 MB 溜まる。tcp_limit_output_bytes を 256 KiB に下げても減らないのはなぜか',
			how: '1 本が置くのは 2 × truesize の約 130 KB で、上限より下。溜まりは本数で決まる',
			kind: 'scene',
			opts: ['1 本 130 KB で上限が効いていない', '設定が再起動まで効かない', 'fq の時しか効かない']
		},
		{
			ask: '10 GbE で qdisc の backlog が 30 MB。待ちは何 ms か',
			how: '24 ms（30 MB ÷ 1.25 GB/s）',
			kind: 'number'
		}
	],
	map: {
		nodes: {
			app: { icon: 'server', town: '倉庫の帳場', addr: '10.0.0.5' },
			sw: { icon: 'switch', town: '波止場の仕分け所' },
			peer: { icon: 'db', town: '記録庫', addr: '10.0.0.9' }
		},
		zones: [
			{ label: 'データセンター', note: 'RTT 0.5 ms・10 GbE', members: ['app', 'sw', 'peer'] }
		],
		links: [
			{ a: 'app', b: 'sw', label: '10 GbE', dir: 'both' },
			{ a: 'sw', b: 'peer', label: '10 GbE', dir: 'both' }
		]
	},
	teach: {
		myths: [
			{
				wrong: 'send() が戻ったら、相手に届いた',
				right:
					'カーネルの送信キューに預けただけ。届いたかは ACK で分かり、ss の unacked が 0 になって全部届く'
			},
			{
				wrong: '再送はタイマー（RTO）が切れて起きる',
				right:
					'途中の喪失は SACK と RACK で 1 往復のうちに直り、最後の喪失も TLP が約 3 ms で気づく。200 ms の RTO は、1 個だけ飛んでいる時か確かめも落ちた時'
			},
			{
				wrong: '手元の待ち行列を大きくすれば速くなる',
				right:
					'線を使い切った後は待ちが増えるだけ。TSQ は 1 本ずつ max(約 1 ms 分, 塊 2 個) に抑えるが、本数が多いと積もる。fq で分け、fq_codel で削る'
			}
		],
		oneMinute:
			'send() はカーネルに預けるだけ。tcp_write_xmit() が受信窓・cwnd・Nagle・TSO の待ち・TSQ を見て、送ってよい分の skb を切り出す。tcp_transmit_skb() は clone を IP・qdisc・NIC へ流し、元を再送キューに残す。NIC は TSO で MSS ごとに割る。ACK が割り込みから softirq の NAPI と GRO を通って tcp_ack() に届くと、控えを捨て、cwnd を増やして次を送る。',
		questions: [
			{
				ask: 'ss で unacked:430・notsent:2100000・retrans:0/0・cwnd:430。遅い原因はどこか',
				answer:
					'cwnd を使い切り、手元にも 2.1 MB 残る。線か相手の速さが上限。tc の backlog と rtt を続けて見る',
				look: 'cwnd と unacked が同じなら cwnd で止まっている、と読めるか'
			},
			{
				ask: 'RTT 0.5 ms の網で、たまに 200 ms 止まる。何を数えるか',
				answer:
					'nstat の TcpExtTCPTimeouts と TcpExtTCPLossProbes。200 ms は RTO の下限と同じ長さなので、1 個だけ飛んでいる時の喪失を疑う',
				look: '200 ms という数から RTO の下限（tcp_rto_min_us）を思い出せるか'
			}
		]
	}
};
