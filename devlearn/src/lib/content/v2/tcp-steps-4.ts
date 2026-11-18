// 見本 1（net-101）のステップ 13〜16：実際には / 運用 / 教えるとき / まとめ。
import type { Step } from '../../lesson/types.ts';
import { B, I } from './tcp-base.ts';

const conn = {
	id: 'c-store',
	depth: 1 as const,
	what: 'TCP 10.0.0.5:43210 → 10.0.0.9:9000',
	state: 'ESTABLISHED'
};

export const s13: Step = {
	n: 13,
	kind: 'realworld',
	short: '実際には',
	title: '実際の機械と設定',
	lead: 'systemd の fq_codel・BBR と fq・nginx',
	body: [
		'Ubuntu などは systemd が既定の qdisc を fq_codel にしている。',
		'nginx は keep-alive のつながりで Nagle を切り、ファイルを送る時は TCP_CORK で詰める。'
	],
	depth: {
		intro: [
			'ここまでの仕組みは、普段使う機械でそのまま動いている。何も設定しない Ubuntu でも、qdisc は fq_codel、輻輳制御は CUBIC、TSO と GRO は入りだ。',
			'使う側は、ここから設定を選び直す。BBR を使うなら fq を組み合わせ、Web サーバの nginx は Nagle を場面で切り替える。'
		],
		work: [
			'カーネルの既定の qdisc は pfifo_fast だ。だが systemd の sysctl.d/50-default.conf が、net.core.default_qdisc を fq_codel にする。多くの配布物は、この設定で起きる。',
			'BBR を発表した Google の論文（ACM Queue 2016）は、BBR がペーシングを前提にすることを示した。Linux では fq の EDT が、そのペーシングを手元で守る役を持つ。',
			'nginx は keep-alive のつながりで tcp_nodelay（既定 on）により TCP_NODELAY を立て、Nagle の待ちを消す。sendfile と tcp_nopush では TCP_CORK で頭と中身を 1 つの区切りに詰める。'
		],
		deep: [
			'50-default.conf の default_qdisc の 1 行は、起きた後に作られる qdisc の既定を決める。多くの送り口を持つ NIC では、根に mq が置かれ、送り口ごとの子にこの既定が付く。',
			'ixgbe（Intel 82599 などの 10 GbE）は TSO・GRO・送り口ごとの割り込み（MSI-X）を持つ。ethtool -k eth0 で、tcp-segmentation-offload と generic-receive-offload を見る。両方 on なら、このレッスンの道で動いている。',
			'64 KiB の TSO の上限は gso_max_size で決まる。BIG TCP を使うと、v6.12 の GSO_MAX_SIZE の 524,280 B まで 1 個の skb にできる。1 個の skb で層を下りる回数がさらに減る。',
			'TCP_NODELAY は tcp_nagle_test() の Nagle の判断を外す。TCP_CORK は小さい区切りを MSS まで溜める（最大 200 ms）。nginx は 2 つを場面で切り替え、応答の頭と本文を 1 つの区切りに詰める。'
		]
	},
	callout: {
		type: 'tip',
		text: 'qdisc は「機械ごと」の設定、輻輳制御は「つながりごと」に選べる（setsockopt の TCP_CONGESTION）。'
	},
	changes: [
		{ mark: '+', text: 'systemd：default_qdisc = fq_codel' },
		{ mark: '+', text: 'BBR はペーシング（fq）と組む' },
		{ mark: '+', text: 'nginx：TCP_NODELAY と TCP_CORK' }
	],
	facts: [
		{ k: 'カーネルの既定の qdisc', v: 'pfifo_fast（systemd が fq_codel にする）' },
		{ k: 'TSO の上限', v: '65,536 B（BIG TCP で 524,280 B まで）' },
		{ k: 'TCP_CORK の待ちの上限', v: '200 ms' }
	],
	scene: [{ op: 'change', id: 'app', k: 'qdisc', v: 'fq_codel（systemd の既定）' }],
	log: {
		t: '8.000s',
		from: 'app',
		to: 'app',
		kind: 'kernel',
		info: 'net.core.default_qdisc = fq_codel（systemd 50-default.conf）'
	},
	town: '町の多くの帳場は、出口の係の決まりを役場の標準（fq_codel）のまま使っている',
	work: 'sysctl net.core.default_qdisc と tc qdisc show で今の係を見る',
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					conn,
					{ id: 's-defq', depth: 1, what: 'net.core.default_qdisc', state: 'fq_codel' },
					{ id: 's-cc', depth: 2, what: 'tcp_congestion_control', state: 'cubic（v6.12 の既定）' },
					{ id: 's-offload', depth: 1, what: 'eth0 の TSO・GRO', state: 'on・on' }
				]
			}
		]
	},
	metrics: { cwnd: '430 個' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_dev', 'b_drv', 'b_tso'] } },
		{
			at: 400,
			dur: 450,
			para: 0,
			do: { op: 'badge', id: 'b_dev', text: 'default_qdisc = fq_codel' }
		},
		{ at: 500, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 1200,
			dur: 700,
			para: 0,
			do: { op: 'packet', a: 'b_dev', b: 'b_drv', label: '64 KiB', kind: 'data' }
		},
		{ at: 2000, dur: 450, para: 1, do: { op: 'badge', id: 'b_tso', text: 'TSO on・最大 64 KiB' } },
		{ at: 2100, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 2900, dur: 900, para: 2, do: { op: 'camera', fit: ['b_sendmsg', 'b_wx', 'b_tx'] } },
		{
			at: 3300,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'b_wx', text: 'TCP_NODELAY：Nagle を外す' }
		},
		{ at: 3400, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{
			at: 4000,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_wx', b: 'b_tx', label: '小さい応答', kind: 'data' }
		}
	],
	loop: [
		{
			at: 0,
			dur: 700,
			do: { op: 'packet', a: 'b_dev', b: 'b_drv', label: '64 KiB', kind: 'data' }
		},
		{ at: 800, dur: 700, do: { op: 'packet', a: 'b_wx', b: 'b_tx', label: '応答', kind: 'data' } }
	],
	board: [
		'systemd：default_qdisc = fq_codel',
		'ixgbe：TSO・GRO・MSI-X',
		'nginx：tcp_nodelay・tcp_nopush'
	],
	badges: {
		b_dev: 'default_qdisc = fq_codel',
		b_tso: 'TSO on・最大 64 KiB',
		b_wx: 'TCP_NODELAY：Nagle を外す'
	},
	layers: [B.sys([]), B.tcp([]), B.qd([]), B.drv([], [])],
	impl: [I.sendto, I.sendmsg, I.wx, I.tx, I.nagle, I.devq, I.drv, I.tso],
	refs: ['systemd-sysctl', 'bbr', 'nginx-core', 'man-tcp', 'linux-ixgbe', 'man-ethtool'],
	learns: [2]
};

export const s14: Step = {
	n: 14,
	kind: 'ops',
	short: '運用',
	title: '数を読む道具',
	lead: 'ss・nstat・tc・ethtool・bpftrace で数を読む',
	body: [
		'ss -tim で cwnd・rtt・unacked・notsent・retrans を読む。',
		'nstat の再送の数、tc -s qdisc の backlog、ethtool -k の TSO と GRO を並べて見る。'
	],
	depth: {
		intro: [
			'遅いと言われたら、まず 4 つの数を見る。往復の時間（rtt）・飛んでいる数（unacked）・まだ出ていない量（notsent）・送り直した数（retrans）だ。',
			'ss -tim はつながり 1 本ずつの数、nstat は機械全体の数、tc -s qdisc は出口の行列の数を出す。'
		],
		work: [
			'ss -tim の rtt:0.512/0.098 は平均と揺れ、minrtt は最小だ。rtt が minrtt の 2 倍を超えるなら、どこかの行列で待っている。',
			'retrans:0/12 は「今の再送 / これまでの再送」だ。nstat -az TcpRetransSegs を 10 秒あけて 2 回取り、送った区切りの 1% を超えたら回線か相手を疑う。',
			'tc -s qdisc show dev eth0 の backlog を見る。10 GbE で 1.25 MB（1 ms 分）を超え続けるなら、手元の溜まりすぎだ。drops と overlimits も見る。',
			'ethtool -k eth0 で tcp-segmentation-offload と generic-receive-offload を確かめる。関数の中まで見る時は bpftrace で tcp_retransmit_skb を数える。'
		],
		deep: [
			'ss -tim の skmem の t は sk_wmem_alloc、tb は sk_sndbuf、w は sk_wmem_queued だ。w が tb に張り付き、notsent が 1 MB を超えるなら、アプリが送り込む速さに線が追いついていない。',
			'busy:・rwnd_limited:・sndbuf_limited: は、送りが止まっていた時間とその理由の内訳だ（tcp_chrono）。rwnd_limited が大きければ相手の受信窓、sndbuf_limited なら手元の sk_sndbuf が止めている。',
			'nstat の TcpExtTCPTimeouts は RTO の回数、TcpExtTCPLossProbes は TLP の回数だ。RTO の数が速い再送の数を超えるなら、最後の区切りが落ちる形か、相手が 200 ms 以上止まっている。',
			"bpftrace -e 'kprobe:tcp_retransmit_skb { @[comm] = count(); }' で、送り直したプロセスを数える。kprobe はカーネルの関数の入口に置くので、関数名は今の版のソースで確かめる。",
			'設定は /proc/sys/net/ipv4/ の下で見る。tcp_wmem・tcp_limit_output_bytes・tcp_congestion_control の 3 つだ。qdisc の既定は /proc/sys/net/core/default_qdisc だ。sysctl -a | grep tcp_ で一覧できる。'
		]
	},
	callout: {
		type: 'point',
		text: '目安：retrans が送った数の 1% 超、rtt が minrtt の 2 倍超、backlog が 1 ms 分超。この 3 つでほとんどの遅さの入口が分かる。'
	},
	changes: [
		{ mark: '+', text: 'ss -tim：rtt・cwnd・unacked・notsent' },
		{ mark: '+', text: 'nstat：TcpRetransSegs の増え方' },
		{ mark: '+', text: 'tc -s qdisc：backlog・drops' }
	],
	facts: [
		{ k: '再送の目安', v: '送った区切りの 1%' },
		{ k: '行列の目安', v: '1.25 MB（10 GbE の 1 ms 分）', calc: '10000000000/8/1000/1000000' },
		{ k: 'rtt の目安', v: 'minrtt の 2 倍' }
	],
	scene: [{ op: 'change', id: 'app', k: 'ss -tim', v: 'rtt 0.512・cwnd 430' }],
	log: {
		t: '9.000s',
		from: 'app',
		to: 'app',
		kind: 'kernel',
		info: 'ss -tim：rtt 0.512/0.098・cwnd 430・retrans 0/1・notsent 2100000'
	},
	town: '遅いと言われたら、往復の時間・道の上の数・出口の行列・出し直しの数の 4 つを帳面で見る',
	work: 'ss -tim dst 10.0.0.9・nstat -az・tc -s qdisc・ethtool -k eth0',
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					conn,
					{ id: 's-ss', depth: 2, what: 'ss -tim', state: 'rtt:0.512/0.098 cwnd:430 unacked:430' },
					{ id: 's-retrans', depth: 2, what: 'retrans', state: '0/1' },
					{
						id: 'd-qdisc',
						depth: 1,
						what: 'qdisc fq（eth0）',
						state: 'backlog 1357Kb 21p',
						tone: 'ok'
					}
				]
			}
		]
	},
	metrics: { rtt: '0.5 ms', qd: '1,357,500 B' },
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b_wx', 'b_tx', 'b_sendmsg'] } },
		{ at: 400, dur: 450, para: 0, do: { op: 'badge', id: 'b_tx', text: 'rtt 0.512・minrtt 0.5' } },
		{ at: 500, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{ at: 1000, dur: 1000, para: 0, do: { op: 'count', metric: 'rtt', to: '0.5 ms' } },
		{
			at: 2100,
			dur: 450,
			para: 1,
			do: { op: 'badge', id: 'b_wx', text: 'retrans 0/1（1% 未満）' }
		},
		{ at: 2200, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 2900, dur: 900, para: 2, do: { op: 'camera', fit: ['b_dev', 'b_drv', 'b_tso'] } },
		{
			at: 3300,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'b_dev', text: 'backlog 1357Kb・drops 0' }
		},
		{ at: 3400, dur: 1000, para: 2, do: { op: 'count', metric: 'qd', to: '1,357,500 B' } },
		{ at: 3500, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 4500, dur: 450, para: 3, do: { op: 'badge', id: 'b_tso', text: 'tso on・gro on' } },
		{ at: 4600, dur: 400, para: 3, do: { op: 'board', line: 3 } },
		{
			at: 5200,
			dur: 700,
			para: 3,
			do: { op: 'packet', a: 'b_dev', b: 'b_drv', label: '数える', kind: 'data' }
		}
	],
	loop: [
		{
			at: 0,
			dur: 700,
			do: { op: 'packet', a: 'b_dev', b: 'b_drv', label: '64 KiB', kind: 'data' }
		},
		{ at: 800, dur: 700, do: { op: 'packet', a: 'b_wx', b: 'b_tx', label: 'skb', kind: 'data' } }
	],
	board: [
		'ss -tim：rtt と minrtt を比べる',
		'nstat：TcpRetransSegs の増え方 ÷ 送った数',
		'tc -s qdisc：backlog が 1 ms 分を超えるか',
		'ethtool -k・bpftrace で中を確かめる'
	],
	badges: {
		b_tx: 'rtt 0.512・minrtt 0.5',
		b_wx: 'retrans 0/1（1% 未満）',
		b_dev: 'backlog 1357Kb・drops 0',
		b_tso: 'tso on・gro on'
	},
	layers: [B.sys([]), B.tcp([]), B.qd([]), B.drv([], [])],
	impl: [I.sendto, I.sendmsg, I.wx, I.tx, I.retrans, I.devq, I.drv, I.tso, I.limitOut],
	refs: ['man-ss', 'man-tc-fq', 'man-ethtool', 'linux-sysctl', 'linux-tcp-output'],
	learns: [6]
};

export const s15: Step = {
	n: 15,
	kind: 'teach',
	short: '教える',
	title: '教えるときの 3 つの誤解',
	lead: '「戻ったら届いた」「再送は RTO」「大きい行列は速い」を解く',
	body: [
		'新人がよく持つ誤解は 3 つある。送ったら届いた、再送は RTO、行列は大きいほど速い。',
		'図の上で、誤った流れが止まり、正しい流れが流れる所を見せて解く。'
	],
	depth: {
		intro: [
			'教えるときは、言葉より図の上の流れで解く。誤った思い込みのとおりに流すと、どこで食い違うかが見える。',
			'ここでは 3 つの誤解を、1 つずつ図の上で正す。どれも、このレッスンで追った 25 個ほどの関数と 2 つのキューで説明できる。',
			'1 つの誤解に 1 分あれば足りる。'
		],
		work: [
			'誤解 1「send() が戻ったら届いた」。正しくは、送信キューに預けただけ。届いたかは ACK で分かり、ss の unacked が 0 になって初めて全部届いた。',
			'誤解 2「再送はタイマー（RTO）が切れて起きる」。正しくは、大半は SACK と RACK で 1 往復のうちに直る。RTO は最後の区切りが落ちた時の最後の手段で、RTT の 400 倍かかる。',
			'誤解 3「手元の行列を大きくすれば速くなる」。正しくは、線を使い切った後は待ちが増えるだけだ。TSQ と fq が手元を約 1 ms 分に抑えているのは、そのためだ。'
		],
		deep: [
			'1 分で説明するなら：send() はカーネルに預けるだけ。tcp_write_xmit() が cwnd と窓の分だけ skb を切り出し、clone を下へ流し、元を再送キューに残す。ACK が softirq で届くと元を捨て、cwnd を増やして次を送る。',
			'後輩に出す問い 1：「ss で unacked:430、notsent:2100000、retrans:0/0。cwnd は 430。遅い原因はどこか」。答え：cwnd を使い切り、手元にも 2.1 MB 残る。線か相手の速さが上限だ。',
			'後輩に出す問い 2：「RTT 0.5 ms の網で、たまに 200 ms 止まる。何を数えるか」。答え：nstat の TcpExtTCPTimeouts。RTO の下限 200 ms と同じ長さなので、最後の区切りの喪失を疑う。',
			'たとえは「帳場と出口の係」までにとどめる。たとえで「荷物が 1 個ずつ運ばれる」と言うと、TSO と GRO で 10 個を 1 回で扱う中身と食い違う。中身を話すときは skb の数と区切りの数を分けて言う。'
		]
	},
	callout: {
		type: 'point',
		text: '「届いた」は ACK でしか分からない。send()・write() の戻り値、ログの「送った」は、預けた記録にすぎない。'
	},
	changes: [
		{ mark: '-', text: '誤解の流れが止まった' },
		{ mark: '+', text: '正しい流れ：預ける → ACK で消える' },
		{ mark: '+', text: '問い 2 つと 1 分の説明' }
	],
	facts: [
		{ k: '誤解の数', v: '3 つ' },
		{ k: 'RTO と RTT の比', v: '400 倍（200 ms ÷ 0.5 ms）', calc: '200/0.5' },
		{ k: '手元の行列の目安', v: '約 1 ms 分' }
	],
	scene: [
		{ op: 'move', from: 'app', to: 'sw', payload: '預けた分', kind: 'data' },
		{ op: 'move', from: 'sw', to: 'app', payload: 'ACK', kind: 'ack' }
	],
	log: {
		t: '9.000s',
		from: 'app',
		to: 'peer',
		kind: 'data',
		info: '誤解 3 つを図で正す：預ける・速い再送・行列は 1 ms 分'
	},
	town: '新人の帳場係には、荷を出口に預けた時と、届いた知らせが来た時を分けて教える',
	work: '新人には ss -tim の unacked が 0 になるまでを一緒に見せる',
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					conn,
					{ id: 'q-rtx', depth: 2, what: 'tcp_rtx_queue', state: 'ACK で消える控え' },
					{ id: 'q-wq', depth: 2, what: 'sk_write_queue', state: '預けただけの分' }
				]
			}
		]
	},
	motion: [
		{ at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['app', 'sw', 'peer'] } },
		{
			at: 400,
			dur: 1200,
			para: 0,
			do: { op: 'packet', a: 'app', b: 'sw', label: '届いた？（誤）', kind: 'data', stall: true }
		},
		{ at: 500, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{
			at: 1800,
			dur: 800,
			para: 0,
			do: { op: 'packet', a: 'sw', b: 'app', label: 'ACK で分かる', kind: 'ack' }
		},
		{
			at: 2700,
			dur: 800,
			para: 1,
			do: { op: 'packet', a: 'sw', b: 'peer', label: 'RTO を待つ（誤）', kind: 'data', drop: true }
		},
		{ at: 2800, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{
			at: 3600,
			dur: 800,
			para: 1,
			do: { op: 'packet', a: 'app', b: 'sw', label: 'SACK で速い再送', kind: 'retx' }
		},
		{ at: 4500, dur: 900, para: 2, do: { op: 'camera', fit: ['b_wx', 'b_dev'] } },
		{
			at: 4900,
			dur: 450,
			para: 2,
			do: { op: 'badge', id: 'b_dev', text: '行列 30 MB（誤）', tone: 'bad' }
		},
		{ at: 5000, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 5800, dur: 450, para: 2, do: { op: 'badge', id: 'b_dev', text: '1 ms 分で十分（正）' } },
		{ at: 6300, dur: 400, para: 2, do: { op: 'board', line: 3 } }
	],
	loop: [
		{ at: 0, dur: 800, do: { op: 'packet', a: 'app', b: 'sw', label: '預ける', kind: 'data' } },
		{ at: 900, dur: 800, do: { op: 'packet', a: 'sw', b: 'app', label: 'ACK', kind: 'ack' } }
	],
	board: [
		'誤：戻ったら届いた → 正：ACK で分かる',
		'誤：再送は RTO → 正：SACK・RACK で 1 往復',
		'誤：行列は大きいほど速い → 正：待ちが増える',
		'問い：unacked と notsent で原因を言う'
	],
	badges: { b_dev: '1 ms 分で十分（正）' },
	layers: [B.tcp([]), B.qd([])],
	impl: [I.wx, I.tx, I.devq],
	refs: ['rfc8985', 'linux-tcp-output', 'linux-tcp-timer', 'man-ss'],
	learns: [0, 5]
};

export const s16: Step = {
	n: 16,
	kind: 'summary',
	short: 'まとめ',
	title: 'まとめ：預ける・切る・流す・消す',
	lead: '46 個の区切りが、関数とキューと文脈を通って ACK で消えるまで',
	body: [
		'send() は預けるだけ。tcp_write_xmit() が cwnd の分だけ切り、clone を下へ流す。',
		'ACK が softirq で届くと再送キューから消え、cwnd が増えて次が流れる。'
	],
	depth: {
		intro: [
			'帳簿の 46 個の区切りは、預けられ、切り出され、写しが線に出て、知らせで控えが消えた。10 GbE を使い切る流れでは、この輪が 1 秒に 80 万回ほどまわる。',
			'どこかで止まれば、数で分かる。cwnd・窓・行列・再送の 4 か所を見ればよい。'
		],
		work: [
			'送る道：send() から tcp_sendmsg_locked() で sk_write_queue へ。tcp_write_xmit() が 5 つの関所を見て切る。tcp_transmit_skb() が clone を IP へ、元を再送キューへ置く。',
			'下る道：ip_queue_xmit() → neigh_output() → fq（送る時刻）→ ixgbe の送信リング。最後に TSO で 1,514 B のフレームに割れる。',
			'戻る道：割り込み → softirq の NAPI → GRO → tcp_v4_rcv() → tcp_ack()。控えを消し、cwnd を増やして tcp_write_xmit() へ戻る。送り終えは tcp_wfree() と TSQ の tasklet が知らせる。'
		],
		deep: [
			'文脈は 4 つ。send() の中はプロセス（眠れる）、割り込みは hardirq（すぐ戻る）だ。取り出しと ACK と解放は softirq、TSQ の再開は tasklet で動く。持ち主が使用中のソケットへの仕事は、backlog と TCP_TSQ_DEFERRED で release_sock() まで持ち越す。',
			'壊れ方は 3 つ見た。1 個の喪失は SACK と RACK で約 0.6 ms、最後の喪失は RTO で 200 ms、溜まりすぎは喪失 0 のまま RTT 24.5 ms。受信窓 0 は probe だけが流れる。',
			'直し方と代償：tcp_limit_output_bytes を 1 MiB に、qdisc を fq に。CUBIC は喪失に弱く、BBR は他の流れを押しのけうる。TSO の塊は CPU と突発の取り引きだ。',
			'次に学ぶとよい物は 3 つ。輻輳制御を数で比べること、TLS の記録が TCP の区切りにどう載るか。そして Kubernetes の Pod の網が、veth と橋でこの道をどう延ばすかだ。',
			'このレッスンの名前は全て Linux v6.12 のソースにある。版が上がると関数が分かれたり名前が変わったりするので、bpftrace で追う前に、使っている版のソースで名前を確かめる。'
		]
	},
	callout: {
		type: 'point',
		text: '学べることの 7 つ全てに ✓ が付いた。分からない所は、ステップの帯の番号から戻って、もう一度（R）で動きを見直す。'
	},
	changes: [
		{ mark: '~', text: '全ての流れがもう一度流れる' },
		{ mark: '+', text: '学べること 7 つに ✓' }
	],
	facts: [
		{ k: '区切り', v: '46 個（3 往復）' },
		{ k: 'cwnd の育ち', v: '56 個（10 → 20 → 40 → 56。ACK された数を足す）', calc: '40+16' },
		{ k: '通った関数', v: '25 個以上' },
		{ k: '文脈', v: '4 つ（プロセス・hardirq・softirq・tasklet）' }
	],
	scene: [
		{ op: 'move', from: 'app', to: 'sw', payload: 'データ', kind: 'data' },
		{ op: 'move', from: 'sw', to: 'peer', payload: 'データ', kind: 'data' },
		{ op: 'move', from: 'peer', to: 'sw', payload: 'ACK', kind: 'ack' },
		{ op: 'move', from: 'sw', to: 'app', payload: 'ACK', kind: 'ack' }
	],
	log: {
		t: '9.000s',
		from: 'app',
		to: 'peer',
		kind: 'data',
		info: '46 個を 3 往復で送り終えた。全ての道をもう一度流す'
	},
	town: '帳場は預け、出口の係が時刻を守って出し、知らせで控えを捨てる。この繰り返しで帳簿が運ばれる',
	work: '迷ったら ss -tim・nstat・tc -s qdisc の 3 つから',
	inside: {
		hosts: [
			{
				name: 'app-1',
				town: '倉庫の帳場',
				addr: '10.0.0.5',
				rows: [
					{ id: 'p-backup', depth: 0, what: 'backup（pid 4120）', state: '送り終えた' },
					conn,
					{ id: 'q-wq', depth: 2, what: 'sk_write_queue', state: '0 B' },
					{ id: 'q-rtx', depth: 2, what: 'tcp_rtx_queue', state: '0 個' }
				]
			}
		]
	},
	metrics: { cwnd: '56 個', wq: '0 B', rtx: '0 個', rtt: '0.5 ms', qd: '0 B' },
	motion: [
		{
			at: 0,
			dur: 900,
			para: 0,
			do: { op: 'camera', fit: ['b_send', 'b_sendmsg', 'b_wx', 'b_tx'] }
		},
		{
			at: 400,
			dur: 700,
			para: 0,
			do: { op: 'packet', a: 'b_send', b: 'b_sendmsg', label: '預ける', kind: 'call' }
		},
		{
			at: 1200,
			dur: 700,
			para: 0,
			do: { op: 'packet', a: 'b_wx', b: 'b_tx', label: '切る', kind: 'data' }
		},
		{ at: 1300, dur: 400, para: 0, do: { op: 'board', line: 0 } },
		{ at: 2100, dur: 900, para: 1, do: { op: 'camera', fit: ['b_ip', 'b_neigh', 'b_dev'] } },
		{
			at: 2500,
			dur: 700,
			para: 1,
			do: { op: 'packet', a: 'b_ip', b: 'b_neigh', label: '下る', kind: 'data' }
		},
		{
			at: 3300,
			dur: 700,
			para: 1,
			do: { op: 'packet', a: 'b_neigh', b: 'b_dev', label: '下る', kind: 'data' }
		},
		{ at: 3400, dur: 400, para: 1, do: { op: 'board', line: 1 } },
		{ at: 4200, dur: 900, para: 2, do: { op: 'camera', fit: ['b_v4', 'b_est', 'b_ack'] } },
		{
			at: 4600,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_v4', b: 'b_est', label: 'ACK', kind: 'ack' }
		},
		{
			at: 5400,
			dur: 700,
			para: 2,
			do: { op: 'packet', a: 'b_est', b: 'b_ack', label: 'ACK', kind: 'ack' }
		},
		{ at: 5500, dur: 400, para: 2, do: { op: 'board', line: 2 } },
		{ at: 6200, dur: 1000, para: 2, do: { op: 'count', metric: 'wq', to: '0 B' } },
		{ at: 6300, dur: 900, para: 2, do: { op: 'camera', fit: ['app', 'sw', 'peer'] } },
		{ at: 6800, dur: 400, para: 2, do: { op: 'board', line: 3 } }
	],
	loop: [
		{ at: 0, dur: 800, do: { op: 'packet', a: 'app', b: 'sw', label: 'データ', kind: 'data' } },
		{ at: 800, dur: 800, do: { op: 'packet', a: 'sw', b: 'peer', label: 'データ', kind: 'data' } },
		{ at: 1600, dur: 800, do: { op: 'packet', a: 'peer', b: 'sw', label: 'ACK', kind: 'ack' } },
		{ at: 2400, dur: 800, do: { op: 'packet', a: 'sw', b: 'app', label: 'ACK', kind: 'ack' } }
	],
	board: [
		'預ける：send() → sk_write_queue',
		'切って流す：tcp_write_xmit() → clone → fq → TSO',
		'消す：ACK → tcp_ack() → 控えを捨てる',
		'4 か所の数：cwnd・窓・行列・再送'
	],
	badges: { app: 'ESTABLISHED', peer: 'ESTABLISHED' },
	layers: [B.sys([]), B.tcp([]), B.ip(), B.qd([]), B.rcv()],
	impl: [I.sendto, I.sendmsg, I.wx, I.tx, I.ipq, I.neigh, I.devq, I.v4rcv, I.est, I.ack],
	refs: ['rfc9293', 'linux-tcp-output', 'linux-tcp-input'],
	learns: [0, 1, 2, 3, 4, 5, 6]
};
