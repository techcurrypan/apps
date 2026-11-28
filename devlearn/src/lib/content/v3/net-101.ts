// 見本 1：net-101 第 3 版（learn-standard.md 第 15〜19 章。下限は試作 learn11 の #tcp）。
// 出典：Linux v6.6 の net/ipv4/tcp.c・tcp_output.c・tcp_input.c・ip_output.c、net/sched/sch_fq.c、
// RFC 9293（TCP）・RFC 6928（初期 cwnd 10）・RFC 8985（RACK-TLP）・RFC 6937（PRR）・RFC 2018（SACK）。確認日 2026-11-28
// 数の確かめ：MSS 1,448 = 1,500 − 20 − 20 − 12。10 MSS = 14,480 B。64 KiB = 65,536 = 31,856 × 2 + 1,824
import type { V3Lesson } from '../../learn/check-v3.ts';

export const NET_101_V3: V3Lesson = {
	id: 'net-101',
	field: 'net',
	title: 'カーネルの中の TCP 送信と ACK',
	goal: '1 つの send() を、関数とキューの単位で ACK まで追い、遅さと再送の原因を図と数で読める',
	view: 'stack',
	kick: 'ネットワーク ・ 段 3（設計と障害対応）・ 見せ方：層とキュー',
	terms: [
		'app',
		'kernel',
		'syscall',
		'send',
		'fd',
		'buf',
		'byte',
		'socket',
		'tcp',
		'packet',
		'ack',
		'nic',
		'rtt',
		'sendq',
		'skb',
		'mss',
		'sendmsg',
		'cwnd',
		'xmit',
		'txskb',
		'rtxq',
		'ipq',
		'qdisc',
		'edt',
		'ring',
		'tso',
		'irq',
		'softirq',
		'napi',
		'gro',
		'rcvest',
		'tcpack',
		'sack',
		'rack',
		'rto'
	],
	objs: {
		app: {
			kind: 'laptop',
			name: 'send(fd, buf, 65536)',
			tone: 'blue',
			term: 'send',
			desc: 'あなたのプログラム'
		},
		kern: {
			kind: 'func',
			name: 'カーネル（OS の中心）',
			tone: 'blue',
			glyph: 'OS',
			term: 'kernel',
			desc: '部品を動かす係'
		},
		smsg: {
			kind: 'func',
			name: 'tcp_sendmsg_locked()',
			tone: 'blue',
			glyph: 'ƒ',
			term: 'sendmsg',
			desc: 'データを写して小分けにする'
		},
		wq: { kind: 'queue', name: '送信キュー', tone: 'teal', term: 'sendq', desc: '送る順を待つ列' },
		xmit: {
			kind: 'func',
			name: 'tcp_write_xmit()',
			tone: 'blue',
			glyph: '?',
			term: 'xmit',
			desc: '送るか待つかを決める'
		},
		tx: {
			kind: 'func',
			name: 'tcp_transmit_skb()',
			tone: 'blue',
			glyph: 'ƒ',
			term: 'txskb',
			desc: 'TCP の見出しを付ける'
		},
		rtx: { kind: 'queue', name: '再送キュー', tone: 'teal', term: 'rtxq', desc: '返事を待つ控え' },
		ipq: {
			kind: 'func',
			name: 'ip_queue_xmit()',
			tone: 'gray',
			glyph: 'IP',
			term: 'ipq',
			desc: '宛先の見出しを付ける'
		},
		fq: {
			kind: 'queue',
			name: 'qdisc（fq）',
			tone: 'teal',
			term: 'qdisc',
			desc: '送る順と速さを整える'
		},
		ring: {
			kind: 'ring',
			name: '送信リング',
			tone: 'gray',
			term: 'ring',
			desc: 'NIC が読み取る棚'
		},
		nic: { kind: 'nic', name: 'NIC', tone: 'purple', term: 'nic', desc: '線につながる部品' },
		irq: {
			kind: 'func',
			name: '割り込み（hardirq）',
			tone: 'red',
			glyph: '⚡',
			term: 'irq',
			desc: 'NIC が CPU を呼ぶ'
		},
		gro: {
			kind: 'func',
			name: 'NAPI と GRO',
			tone: 'orange',
			glyph: '⇉',
			term: 'gro',
			desc: '着いた塊をまとめる'
		},
		ack: {
			kind: 'func',
			name: 'tcp_ack()',
			tone: 'orange',
			glyph: '✓',
			term: 'tcpack',
			desc: '返事を受けて片付ける'
		},
		rnic: { kind: 'nic', name: '受け手の NIC', tone: 'purple', term: 'nic', desc: '相手の線の口' },
		rgro: {
			kind: 'func',
			name: '受け手の GRO',
			tone: 'orange',
			glyph: '⇉',
			term: 'gro',
			desc: '相手の側でまとめる'
		},
		rtcp: {
			kind: 'func',
			name: 'tcp_rcv_established()',
			tone: 'orange',
			glyph: 'ƒ',
			term: 'rcvest',
			desc: '相手の TCP が受ける'
		},
		rapp: { kind: 'laptop', name: '相手のアプリ', tone: 'blue', term: 'app', desc: '受け取る側' }
	},
	metrics: [
		{ key: 'cwnd', label: 'cwnd', term: 'cwnd' },
		{ key: 'wq', label: '送信キュー', term: 'sendq' },
		{ key: 'flight', label: '未 ACK', term: 'rtxq' },
		{ key: 'rtx', label: '再送', desc: '落ちた塊を送り直した回数。' },
		{ key: 'rtt', label: 'RTT', term: 'rtt' }
	],
	steps: [
		{
			kind: 'intro',
			short: '言葉',
			title: '始める前に：言葉をそろえる',
			intro: {
				terms: [
					'app',
					'kernel',
					'syscall',
					'send',
					'fd',
					'buf',
					'byte',
					'socket',
					'tcp',
					'packet',
					'ack',
					'nic'
				],
				anatomy: [
					{ text: 'send', note: '送る', term: 'send', color: '#6ea0ff' },
					{ pre: '(', text: 'fd', note: 'どの接続か（番号札）', term: 'fd', color: '#f0a252' },
					{ pre: ', ', text: 'buf', note: '送る中身の置き場', term: 'buf', color: '#5fd0a0' },
					{
						pre: ', ',
						text: '65536',
						post: ')',
						note: '送るバイト数',
						term: 'byte',
						color: '#e7c35a'
					}
				],
				analogy:
					'アプリは客、カーネルは窓口の係。send() は「この荷物を送って」という申込書。fd は伝票の番号、buf は荷物の置き場所、65536 は荷物の量。'
			},
			paras: [
				'アプリがデータを送ると、コンピュータの中で何が起きるかを追う。',
				'アプリは部品に直にさわれない。システムコールでカーネルに頼む。',
				'頼む時に書くのが send(fd, buf, 65536)。fd はソケットの番号。上の札を左から見てほしい。',
				'カーネルは TCP の決まりでデータをパケットに分け、NIC から送る。相手は ACK を返す。'
			],
			at: [0, 1500, 3000, 4600],
			dur: 7000,
			layout: { app: [120, 440], kern: [380, 470], nic: [630, 480, 0.85], rapp: [890, 430, 0.85] },
			names: { app: 'アプリ', nic: 'NIC（線につながる部品）' },
			links: [
				{ from: 'app', to: 'kern' },
				{ from: 'kern', to: 'nic' },
				{ from: 'nic', to: 'rapp', both: true }
			],
			tokens: [
				{
					name: 'データ',
					tone: 'blue',
					path: ['app', 'kern', 'nic', 'rapp'],
					at: 300,
					d: 1800,
					gone: true
				},
				{
					name: 'ACK',
					tone: 'green',
					path: ['rapp', 'nic', 'kern'],
					at: 2300,
					d: 1100,
					gone: true
				},
				{
					name: 'データ',
					tone: 'blue',
					path: ['app', 'kern', 'nic', 'rapp'],
					at: 3700,
					d: 1800,
					gone: true
				},
				{ name: 'ACK', tone: 'green', path: ['rapp', 'nic', 'kern'], at: 5700, d: 1100, gone: true }
			],
			metrics: { cwnd: '10 MSS', wq: '0 B', flight: '0 B', rtx: '0 回', rtt: '30 ms' },
			callout: [
				'たとえると',
				'窓口に申込書を出すと、係が荷物を小包に分けて運び、相手から「届いた」の返事が来る。'
			],
			changes: [['+', '登場する 4 つ：アプリ・カーネル・NIC・相手']],
			first: [
				'app',
				'kernel',
				'syscall',
				'send',
				'fd',
				'buf',
				'socket',
				'byte',
				'tcp',
				'packet',
				'nic',
				'ack'
			]
		},
		{
			kind: 'problem',
			short: '問題',
			title: 'send() はすぐ戻るのに、届くのは後',
			paras: [
				'アプリが send() で 64 KB を渡すと、関数は約 40 µs で戻る。でも相手に全部が届くのは、RTT 30 ms の道で 60 ms ほど後になる。',
				'その間、データはカーネルの中の置き場を渡り歩き、ACK が返るたびに次が送られる。最初の置き場が送信キュー。',
				'このレッスンでは、1 つの send() を、関数とキューの単位で、線の向こうの ACK まで追う。'
			],
			at: [0, 1800, 3600],
			dur: 5200,
			layout: { app: [130, 250], wq: [390, 300], nic: [650, 340], rapp: [880, 250] },
			hl: ['wq'],
			links: [
				{ from: 'app', to: 'wq' },
				{ from: 'wq', to: 'nic' },
				{ from: 'nic', to: 'rapp' }
			],
			tokens: [
				{ name: '64 KB', tone: 'blue', path: ['app', 'wq', 'nic', 'rapp'], at: 300, d: 4200 }
			],
			callout: [
				'ポイント',
				'「送った」は「キューに入れた」の意味でしかない。遅さの原因は、どのキューで待っているかで分かる。'
			],
			changes: [
				['+', 'アプリが send(64 KB) を呼ぶ'],
				['~', 'send() は 40 µs で戻る']
			],
			deep: 'Linux v6.6 の道筋：send() → __sys_sendto() → tcp_sendmsg()（ソケットを掴む）→ tcp_sendmsg_locked()。戻るのは中身を写し終えた時で、相手に届いた時ではない（net/ipv4/tcp.c）。',
			first: ['rtt', 'sendq']
		},
		{
			kind: 'mechanism',
			short: 'skb を作る',
			title: 'skb を作って送信キューへ',
			paras: [
				'tcp_sendmsg_locked() は、アプリのデータを skb（カーネルの中の荷札つきの箱）に写す。1 つの skb の大きさは「1 ms で送れる量」を目安に決まり、ここでは 22 MSS = 31,856 B。',
				'64 KB は A・B（各 31,856 B）と C（1,824 B）の 3 つに分かれ、送信キューの後ろに並ぶ。ここまで全部、アプリの頼みの続きとして動く。',
				'送信キューが上限を超えると、send() はここで待たされる。速いアプリが遅い線に詰まるのはこの所。'
			],
			at: [0, 1500, 3000],
			dur: 4200,
			layout: { app: [150, 270], smsg: [470, 300], wq: [800, 300] },
			hl: ['smsg'],
			links: [
				{ from: 'app', to: 'smsg' },
				{ from: 'smsg', to: 'wq' }
			],
			tokens: [
				{ name: '64 KB', tone: 'blue', path: ['app', 'smsg'], at: 0, d: 1200 },
				{ name: 'A', tone: 'blue', path: ['smsg', 'wq'], at: 1300, d: 800 },
				{ name: 'B', tone: 'blue', path: ['smsg', 'wq'], at: 1650, d: 800 },
				{ name: 'C', tone: 'blue', path: ['smsg', 'wq'], at: 2000, d: 800 }
			],
			metrics: { wq: '65,536 B' },
			callout: ['知っておくと便利', 'MSS 1,448 B ＝ 1,500 − IP 20 − TCP 20 − 時刻の付け足し 12。'],
			changes: [
				['+', 'skb A・B・C が送信キューに入った'],
				['~', '送信キュー 0 → 65,536 B']
			],
			deep: '大きさは tcp_send_mss() → tcp_xmit_size_goal() が、tcp_tso_autosize()（ペーシングの速さ × 約 1 ms、最低 2 MSS）から決める。skb は tcp_stream_alloc_skb() で作り、tcp_skb_entail() で送信キューの後ろに付ける。',
			first: ['sendmsg', 'skb', 'mss']
		},
		{
			kind: 'internals',
			short: '送るか待つか',
			title: '送るか待つか：cwnd が 10 MSS しか許さない',
			paras: [
				'tcp_write_xmit() は送信キューの先頭（A）を覗いて、送ってよいかを 4 つの条件で確かめる。',
				'相手の受け口は 64 KB 空いている。でも cwnd（一度に線に出してよい量）は始めは 10 MSS = 14,480 B。まだ ACK が 1 つも返っていないので、これ以上は出せない。',
				'そこで A を A1（14,480 B）と A2（17,376 B）に割り、A1 だけを tcp_transmit_skb() へ送る。A2 は送信キューの先頭に戻る。'
			],
			at: [0, 1200, 3200],
			dur: 5200,
			layout: { wq: [210, 270], xmit: [500, 410], tx: [800, 320] },
			hl: ['xmit'],
			queues: { wq: ['B', 'C'] },
			cards: [
				{
					x: 640,
					y: 30,
					w: 300,
					title: '送ってよいか（4 つ）',
					at: 300,
					rows: [
						{ text: '相手の受け口：64 KB 空き', ok: true },
						{ text: 'cwnd：14,480 B まで → 割る', ok: false },
						{ text: '小さすぎる塊：ではない', ok: true },
						{ text: '下の段の詰まり：無い', ok: true }
					]
				}
			],
			links: [
				{ from: 'wq', to: 'xmit' },
				{ from: 'xmit', to: 'tx' }
			],
			tokens: [
				{ name: 'A', tone: 'blue', path: ['wq', 'xmit'], at: 200, d: 900 },
				{ name: 'A2', tone: 'blue', path: ['xmit', 'wq'], at: 3300, d: 900, gone: true },
				{ name: 'A1', tone: 'blue', path: ['xmit', 'tx'], at: 3500, d: 1000 }
			],
			callout: [
				'注意',
				'「帯域が太いのに遅い」の多くは、始めの cwnd と RTT で決まる。最初の 1 往復で送れるのは 14 KB 余り。'
			],
			changes: [
				['~', 'A を A1・A2 に割った'],
				['+', 'A1 だけ送ると決めた']
			],
			deep: '条件：tcp_snd_wnd_test()（受信窓）・tcp_cwnd_test()（cwnd − 未 ACK）・tcp_nagle_test()・tcp_small_queue_check()（TSQ）。割るのは tso_fragment()。初期の cwnd は TCP_INIT_CWND = 10（include/net/tcp.h、RFC 6928）。',
			first: ['xmit', 'cwnd', 'txskb']
		},
		{
			kind: 'internals',
			short: '写して下へ',
			title: '写して下へ。元は再送キューで ACK を待つ',
			paras: [
				'tcp_transmit_skb() は A1 を写し、写しに TCP の見出し（番号・窓など）を付けて ip_queue_xmit() へ渡す。',
				'元の A1 は再送キューへ移る。線の上で落ちても、ここから送り直せるように、ACK が返るまで消さない。',
				'写しは中身を共有するので、64 KB を 2 回写すわけではない。増えるのは箱の頭（約 240 B）だけ。'
			],
			at: [0, 1700, 3200],
			dur: 4600,
			layout: { xmit: [150, 230], tx: [430, 300], rtx: [760, 200], ipq: [760, 440] },
			hl: ['tx'],
			links: [
				{ from: 'xmit', to: 'tx' },
				{ from: 'tx', to: 'rtx' },
				{ from: 'tx', to: 'ipq' }
			],
			tokens: [
				{ name: 'A1', tone: 'blue', path: ['xmit', 'tx', 'rtx'], at: 0, d: 2400 },
				{ name: 'A1′（写し）', tone: 'purple', path: ['tx', 'ipq'], at: 900, d: 1500 }
			],
			metrics: { wq: '51,056 B', flight: '14,480 B' },
			callout: [
				'ポイント',
				'未 ACK（送ったが確かめられていない量）＝ 再送キューの中身。ss の unacked はここを数えている。'
			],
			changes: [
				['+', 'A1 の写しが IP の係へ'],
				['~', 'A1 が送信キュー → 再送キュー']
			],
			deep: '__tcp_transmit_skb() が skb_clone() し、tcp_options_write() で見出しを書いて queue_xmit（= ip_queue_xmit()）を呼ぶ。元は tcp_event_new_data_sent() → tcp_rbtree_insert() で再送キュー（赤黒木）へ。',
			first: ['ipq', 'rtxq']
		},
		{
			kind: 'mechanism',
			short: 'qdisc',
			title: 'qdisc で「送る時刻」まで待つ',
			paras: [
				'IP の見出し（20 B）を付けた写しは、qdisc（送る前の待ち行列）に入る。fq は塊ごとに送ってよい時刻（EDT）を持たせ、その時刻まで出さない。',
				'時刻は送る速さから決まる。始めは 2 × cwnd ÷ RTT ＝ 約 7.7 Mbps。14,480 B の塊どうしは約 15 ms ずつ空けて出し、まとめて押し出さない。',
				'時刻が来ると、送信リングへ渡る。送信リングは NIC が直接読む置き場。'
			],
			at: [0, 1600, 3200],
			dur: 4800,
			layout: { ipq: [170, 260], fq: [490, 320], ring: [820, 300] },
			hl: ['fq'],
			links: [
				{ from: 'ipq', to: 'fq' },
				{ from: 'fq', to: 'ring' }
			],
			tokens: [
				{ name: 'A1′', tone: 'purple', path: ['ipq', 'fq'], at: 0, d: 700 },
				{ name: 'A1′', tone: 'purple', path: ['fq', 'ring'], at: 3200, d: 900 }
			],
			callout: [
				'知っておくと便利',
				'既定の qdisc は sysctl net.core.default_qdisc で決まる。fq_codel の所も多い。'
			],
			changes: [
				['+', 'IP の見出し 20 B'],
				['~', 'fq で送る時刻まで待った']
			],
			deep: '速さは tcp_update_pacing_rate()：始めは tcp_pacing_ss_ratio（既定 200%）、その後は tcp_pacing_ca_ratio（既定 120%）。fq は sch_fq.c の fq_enqueue() で skb の tstamp を見て、時刻まで流れごとの木に置く。2 × 14,480 × 8 ÷ 0.030 ≈ 7.7 Mbps。',
			first: ['qdisc', 'edt', 'ring']
		},
		{
			kind: 'mechanism',
			short: 'TSO',
			title: 'NIC の TSO で 10 枚に割れて線へ',
			paras: [
				'ドライバは塊を送信リングに置き、NIC に知らせる。14,480 B の塊は線にそのままは乗らない（1 枚 1,500 B まで）。',
				'TSO（分ける仕事を NIC に任せる仕組み）が、塊を MSS 1,448 B ごとの 10 枚のパケットに割り、それぞれに見出しを写して番号を進める。CPU は 1 回渡しただけ。',
				'10 枚は約 1.2 µs（10 Gbps）ずつの間隔で線に出て、受け手へ向かう。'
			],
			at: [0, 1300, 3000],
			dur: 5600,
			layout: { ring: [130, 230], nic: [390, 330], rnic: [830, 300] },
			hl: ['nic'],
			links: [
				{ from: 'ring', to: 'nic' },
				{ from: 'nic', to: 'rnic' }
			],
			tokens: [
				{ name: 'A1′ 14,480 B', tone: 'purple', path: ['ring', 'nic'], at: 0, d: 1200 },
				{ name: '1', tone: 'purple', path: ['nic', 'rnic'], at: 2400, d: 1600 },
				{ name: '2', tone: 'purple', path: ['nic', 'rnic'], at: 2700, d: 1600 },
				{ name: '10', tone: 'purple', path: ['nic', 'rnic'], at: 3000, d: 1600 }
			],
			callout: [
				'ポイント',
				'tcpdump で送り手に 14 KB の大きなパケットが見えるのは TSO のせい。線の上は 1,514 B ずつ。'
			],
			changes: [
				['+', '10 枚のパケット'],
				['~', '塊 14,480 B → 1,514 B × 10']
			],
			deep: 'TSO が使えない時はカーネルの GSO（skb_segment()）が同じ割り方をする。ethtool -k eth0 | grep segmentation で確かめられる。1,448 × 10 = 14,480。',
			first: ['tso']
		},
		{
			kind: 'mechanism',
			short: 'GRO と ACK',
			title: '受け手：GRO でまとめ、ACK を返す',
			paras: [
				'10 枚が届くと、受け手の NIC が割り込みを上げる。割り込みは短く済ませ、残りは softirq（後回しの処理）の NAPI がまとめて拾う。',
				'GRO は同じ流れの続きのパケットを 1 つの大きな塊にまとめ直す。TCP の処理は 10 回でなく 1 回で済む。',
				'tcp_rcv_established() は並びが正しいことを確かめ、ACK（ack = 14,481）を作って返す。ACK は「14,481 番の前までは全部受け取った」の意味。'
			],
			at: [0, 1500, 3000],
			dur: 5600,
			layout: { rnic: [170, 400], rgro: [470, 330], rtcp: [790, 250] },
			hl: ['rgro'],
			links: [
				{ from: 'rnic', to: 'rgro' },
				{ from: 'rgro', to: 'rtcp' },
				{ from: 'rtcp', to: 'rnic', kind: 'ack' }
			],
			tokens: [
				{ name: '10 枚', tone: 'purple', path: ['rnic', 'rgro'], at: 0, d: 1400 },
				{ name: '14,480 B', tone: 'purple', path: ['rgro', 'rtcp'], at: 1600, d: 1200 },
				{ name: 'ACK 14,481', tone: 'green', path: ['rtcp', 'rgro', 'rnic'], at: 3200, d: 1800 }
			],
			metrics: { rtt: '30 ms' },
			callout: [
				'知っておくと便利',
				'受け手は普通 2 枚分ごとに ACK を返す（遅延 ACK）。始めは速く返す「クイック ACK」の時期がある。'
			],
			changes: [
				['+', 'GRO で 1 つの 14,480 B'],
				['+', 'ACK（ack = 14,481）が戻り道へ']
			],
			deep: '受信：napi_poll() → ドライバの poll → napi_gro_receive() → netif_receive_skb() → ip_rcv() → tcp_v4_rcv() → tcp_rcv_established() → __tcp_ack_snd_check()。全て NET_RX の softirq の中。',
			first: ['irq', 'softirq', 'napi', 'gro', 'rcvest']
		},
		{
			kind: 'mechanism',
			short: 'ACK を受ける',
			title: 'ACK を受けて片付け、続きを送る',
			paras: [
				'ACK が送り手の NIC に着くと、ここでも割り込みから softirq へ。アプリの send() とは別の流れで、tcp_ack() が動く。',
				'tcp_ack() は A1 を再送キューから外し、RTT を測る。始めのうちは ACK された分だけ cwnd を増やすので 10 → 20 MSS。',
				'続けて tcp_write_xmit() を softirq の中から呼び、A2 と B の一部（計 28,960 B）を送る。ACK が送りを動かす。'
			],
			at: [0, 2000, 3600],
			dur: 6400,
			layout: {
				irq: [110, 440, 0.9],
				gro: [330, 450, 0.9],
				ack: [560, 360, 0.9],
				rtx: [850, 450, 0.85],
				xmit: [560, 130, 0.9],
				wq: [850, 170, 0.85]
			},
			hl: ['ack'],
			notes: [{ obj: 'ack', text: 'cwnd 10 → 20 MSS', tone: 'green', dx: 0, dy: -95, at: 2600 }],
			cards: [
				{
					x: 20,
					y: 30,
					w: 330,
					title: '誰が呼ぶか（文脈）',
					at: 300,
					rows: [
						{ text: 'アプリの send() ではない' },
						{ text: 'softirq：tcp_ack()' },
						{ text: '→ tcp_data_snd_check()' },
						{ text: '→ tcp_write_xmit()' }
					]
				}
			],
			links: [
				{ from: 'irq', to: 'gro' },
				{ from: 'gro', to: 'ack', kind: 'ack' },
				{ from: 'ack', to: 'rtx', kind: 'ack' },
				{ from: 'ack', to: 'xmit' },
				{ from: 'wq', to: 'xmit' }
			],
			tokens: [
				{ name: 'ACK', tone: 'green', path: ['irq', 'gro', 'ack'], at: 0, d: 1800 },
				{ name: 'A1 を外す', tone: 'green', path: ['ack', 'rtx'], at: 2000, d: 900, gone: true },
				{ name: 'A2', tone: 'blue', path: ['wq', 'xmit'], at: 4000, d: 1000, gone: true },
				{ name: 'B', tone: 'blue', path: ['wq', 'xmit'], at: 4700, d: 1000, gone: true }
			],
			metrics: { cwnd: '20 MSS', wq: '22,096 B', flight: '28,960 B' },
			callout: [
				'ポイント',
				'同じ tcp_write_xmit() が、送る時はアプリの頼みから、ACK の後は softirq から呼ばれる。「アプリが止まっていても送りは進む」理由。'
			],
			changes: [
				['-', 'A1 が再送キューから消えた'],
				['~', 'cwnd 10 → 20 MSS'],
				['+', '次の 28,960 B を送った']
			],
			deep: 'tcp_ack() → tcp_clean_rtx_queue()（外す・RTT の標本）→ tcp_cong_control()（CUBIC の cubictcp_cong_avoid()、始めは tcp_slow_start()）。その後 tcp_data_snd_check() → tcp_push_pending_frames() → tcp_write_xmit()。',
			first: ['tcpack']
		},
		{
			kind: 'fail',
			short: '1 枚落ちる',
			title: '失敗：1 枚落ちると、再送キューから送り直す',
			paras: [
				'次の 20 枚のうち 4 枚目が途中で落ちた（混んだ機器の列があふれた）。受け手には 5 枚目以降が先に届く。',
				'受け手は「まだ 4 枚目の前までしか揃っていない」と同じ ack を返し、SACK で「5〜20 枚目は持っている」と知らせる。',
				'送り手の tcp_ack() は抜けを見つけ、再送キューに残っていた 4 枚目を送り直す。RACK で時刻から抜けを決めるので、RTO（約 200 ms 以上）を待たない。',
				'落ちたのは混雑の印なので、cwnd を 0.7 倍（20 → 14 MSS）にする。'
			],
			at: [0, 1800, 3600, 5200],
			dur: 7000,
			layout: {
				rtx: [150, 170, 0.9],
				ack: [440, 160, 0.9],
				nic: [200, 420, 0.9],
				rnic: [800, 420, 0.9],
				rtcp: [820, 160, 0.9]
			},
			hl: ['rtx'],
			links: [
				{ from: 'nic', to: 'rnic' },
				{ from: 'rnic', to: 'rtcp' },
				{ from: 'rtcp', to: 'ack', kind: 'ack' },
				{ from: 'ack', to: 'rtx' }
			],
			tokens: [
				{ name: '#4 ✕', tone: 'red', path: ['nic', 'rnic'], at: 0, d: 900 },
				{ name: '#5〜20', tone: 'blue', path: ['nic', 'rnic', 'rtcp'], at: 300, d: 1500 },
				{ name: 'dup ACK・SACK', tone: 'green', path: ['rtcp', 'ack'], at: 1900, d: 1300 },
				{ name: '#4 再送', tone: 'red', path: ['rtx', 'nic', 'rnic'], at: 3800, d: 2400 }
			],
			metrics: { cwnd: '14 MSS', rtx: '1 回' },
			callout: [
				'注意',
				'再送キューが無ければ送り直せない。「ACK が来るまで消さない」作りが、落ちても届く TCP の土台。'
			],
			changes: [
				['-', '4 枚目が落ちた'],
				['+', '重なった ACK と SACK'],
				['~', '再送 1 回・cwnd 20 → 14 MSS']
			],
			deep: 'v6.6 の既定の喪失の見つけ方は RACK-TLP（RFC 8985、net.ipv4.tcp_recovery = 1）。送り直しは tcp_retransmit_skb()。減らし方は cubictcp_recalc_ssthresh()（β = 717/1024 ≈ 0.7）と PRR（RFC 6937）。20 × 0.7 = 14。',
			first: ['sack', 'rack', 'rto']
		},
		{
			kind: 'ops',
			short: 'ss で見る',
			title: '運用：ss -ti の数を図に重ねて読む',
			paras: [
				'現場では ss -tin で、1 本の接続の中の数を読む。図のどこを数えているかを結ぶ。',
				'cwnd:14 は tcp_write_xmit() が見る窓、unacked:20 は再送キュー、notsent:22096 は送信キューのまだ送っていない量、retrans:0/1 は送り直しの数。',
				'rtt:30.2/0.8 は平均と揺れ。retrans が増え続ける・cwnd が育たないなら、線の途中の列のあふれを疑う。tc -s qdisc の dropped も見る。'
			],
			at: [0, 1400, 3200],
			dur: 6000,
			layout: {
				xmit: [140, 190, 0.9],
				wq: [400, 160, 0.9],
				rtx: [400, 430, 0.9],
				fq: [140, 450, 0.9]
			},
			links: [
				{ from: 'wq', to: 'xmit' },
				{ from: 'xmit', to: 'fq' },
				{ from: 'xmit', to: 'rtx' }
			],
			tokens: [
				{ name: 'cwnd:14', tone: 'orange', path: ['xmit'], at: 1400, d: 0 },
				{ name: 'notsent', tone: 'orange', path: ['wq'], at: 2000, d: 0 },
				{ name: 'unacked:20', tone: 'orange', path: ['rtx'], at: 2600, d: 0 },
				{ name: 'dropped', tone: 'orange', path: ['fq'], at: 3400, d: 0 }
			],
			callout: [
				'目安',
				'1 分あたりの再送が送った段の 1% を超えるなら調べる。RTT の揺れが平均の半分を超えるなら、途中の列が伸び縮みしている。'
			],
			changes: [['+', 'ss の数と図の置き場の対応']],
			deep: 'ss は INET_DIAG（netlink）で tcp_get_info() の値（struct tcp_info）を読む。notsent は write_seq − snd_nxt、unacked は packets_out。',
			first: []
		},
		{
			kind: 'summary',
			short: 'まとめ',
			title: 'まとめ：3 つの道と 4 つの置き場',
			paras: [
				'送る道：send() → tcp_sendmsg_locked() → 送信キュー → tcp_write_xmit() → qdisc → NIC → 線。',
				'ACK の道：NIC → 割り込み → softirq → tcp_ack() → 再送キューを片付け、cwnd を増やし、続きを送る。',
				'落ちた時：再送キューに残した元から送り直し、cwnd を減らす。4 つの置き場（送信キュー・再送キュー・qdisc・送信リング）のどこで待っているかが、遅さの答え。'
			],
			at: [0, 1200, 2400],
			dur: 5200,
			layout: {
				app: [90, 160, 0.72],
				wq: [290, 150, 0.72],
				xmit: [290, 360, 0.72],
				rtx: [500, 470, 0.72],
				fq: [500, 250, 0.72],
				nic: [700, 330, 0.72],
				rnic: [900, 330, 0.72],
				ack: [290, 540, 0.66]
			},
			links: [
				{ from: 'app', to: 'wq' },
				{ from: 'wq', to: 'xmit' },
				{ from: 'xmit', to: 'fq' },
				{ from: 'xmit', to: 'rtx' },
				{ from: 'fq', to: 'nic' },
				{ from: 'nic', to: 'rnic' },
				{ from: 'ack', to: 'rtx', kind: 'ack' }
			],
			tokens: [
				{
					name: 'skb',
					tone: 'blue',
					path: ['app', 'wq', 'xmit', 'fq', 'nic', 'rnic'],
					at: 0,
					d: 4000
				},
				{ name: 'ACK', tone: 'green', path: ['rnic', 'nic', 'ack', 'rtx'], at: 1500, d: 3200 }
			],
			callout: [
				'教えるとき',
				'よくある誤解は「send() が戻った＝相手に届いた」。正しくは「カーネルの送信キューに入った」。'
			],
			changes: [['+', '送る道・ACK の道・送り直す道']],
			first: []
		}
	]
};
