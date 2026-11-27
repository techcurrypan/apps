// やってみる（TCP）：大きなファイルの配信だけ遅い。ss・nstat・tc で詰まりを見つけ、BBR と fq に替える。
// 出力の形は本物に合わせる（ss(8)・nstat(8)・tc(8)・ethtool(8) の man と ip-sysctl の説明。確認日 2026-11-27）。
// 数は場面の作り話（203.0.113.0/24 は文書用の番地。RFC 5737）
import type { TryLine, TryResult, TryScene, TryState } from '../../learn/try3.ts';

const o = (text: string, kind: TryLine['kind'] = 'out'): TryLine => ({ text, kind });

const CARDS = [
	'ss -tin dst 203.0.113.80',
	'nstat -az TcpExtTCPLostRetransmit',
	'tc -s qdisc show dev eth0',
	'ethtool -k eth0',
	'sysctl net.ipv4.tcp_congestion_control',
	'sysctl -w net.ipv4.tcp_congestion_control=bbr',
	'tc qdisc replace dev eth0 root fq'
];
const TOOLS = [...new Set(CARDS.map((x) => x.split(' ')[0]))];

export const TRY_TCP: TryScene = {
	id: 'tcp',
	ps: 'ops@web-1:~$',
	who: '配信チーム',
	req: '大きなファイルの配信だけ遅い。回線は空いているはず。どこで詰まっているか調べて、直せる所を直して。',
	cards: CARDS,
	refs: [
		['ss', 'https://man7.org/linux/man-pages/man8/ss.8.html'],
		['nstat', 'https://man7.org/linux/man-pages/man8/nstat.8.html'],
		['tc', 'https://man7.org/linux/man-pages/man8/tc.8.html'],
		['ethtool', 'https://man7.org/linux/man-pages/man8/ethtool.8.html'],
		['sysctl（ip-sysctl）', 'https://docs.kernel.org/networking/ip-sysctl.html']
	],
	tasks: [
		{ t: 'ss で cwnd と再送を見る', done: (s) => !!s.f.ss },
		{ t: '再送の数を nstat で確かめる', done: (s) => !!s.f.nstat },
		{ t: 'qdisc の落とした数を見る', done: (s) => !!s.f.tc },
		{ t: '輻輳制御を BBR に、qdisc を fq にする', done: (s) => !!(s.f.bbr && s.f.fq) },
		{ t: 'もう一度 ss で cwnd が育ったか確かめる', done: (s) => !!s.f.ss2 }
	],
	init: () => ({
		lines: [o('# web-1 から 203.0.113.80 への 1 本の接続が遅い', 'note')],
		f: {},
		v: { cc: 'cubic', q: 'pfifo_fast' }
	}),
	run(c: string, s: TryState): TryResult {
		if (c.startsWith('ss -t')) {
			const fixed = s.v.cc === 'bbr' && s.v.q === 'fq';
			const head = [
				o('State  Recv-Q Send-Q Local Address:Port  Peer Address:Port'),
				o('ESTAB  0      0      10.0.0.5:51234      203.0.113.80:443')
			];
			return fixed
				? {
						f: { ss: true, ss2: !!(s.f.bbr && s.f.fq) },
						out: [
							...head,
							o('    bbr wscale:7,7 rto:232 rtt:31.1/1.2 mss:1448 cwnd:86 bytes_retrans:0'),
							o('    unacked:86 retrans:0/0 pacing_rate 412Mbps delivery_rate 398Mbps', 'hint'),
							o('# cwnd が 86 に育ち、再送は 0。RTT の揺れも 1.2 ms に下がった', 'note')
						]
					}
				: {
						f: { ss: true },
						out: [
							...head,
							o('    cubic wscale:7,7 rto:268 rtt:58.4/22.1 mss:1448 cwnd:9 ssthresh:9'),
							o('    unacked:9 retrans:1/412 delivery_rate 1.8Mbps notsent:4194304', 'err'),
							o(
								'# cwnd が 9 で育たず、再送が 412 回。RTT の揺れ 22.1 ms は途中のキューの伸び縮み',
								'note'
							)
						]
					};
		}
		if (c.startsWith('nstat'))
			return {
				f: { nstat: true },
				out: [
					o('#kernel'),
					o('TcpExtTCPLostRetransmit         1873               0.0', 'err'),
					o('# 失われたと決めて送り直した数が多い', 'note')
				]
			};
		if (c.startsWith('tc -s qdisc'))
			return {
				f: { tc: true },
				out:
					s.v.q === 'fq'
						? [
								o('qdisc fq 8001: root refcnt 2 limit 10000p flow_limit 100p'),
								o(' Sent 92883321 bytes 64302 pkt (dropped 0, overlimits 0 requeues 0)', 'hint')
							]
						: [
								o(
									'qdisc pfifo_fast 0: root refcnt 2 bands 3 priomap 1 2 2 2 1 2 0 0 1 1 1 1 1 1 1 1'
								),
								o(' Sent 92883321 bytes 64302 pkt (dropped 2214, overlimits 0 requeues 0)', 'err'),
								o(' backlog 1478Kb 1012p requeues 0', 'err'),
								o(
									'# 手元の qdisc で 2,214 個を落としている。溜めすぎて落とす（bufferbloat）',
									'note'
								)
							]
			};
		if (c.startsWith('ethtool -k'))
			return {
				out: [
					o('Features for eth0:'),
					o('tcp-segmentation-offload: on'),
					o('generic-segmentation-offload: on'),
					o('# NIC が大きな塊を切り分けている（TSO）。ここは詰まりの元ではない', 'note')
				]
			};
		if (c === 'sysctl net.ipv4.tcp_congestion_control')
			return { out: [o(`net.ipv4.tcp_congestion_control = ${s.v.cc}`)] };
		if (c === 'sysctl -w net.ipv4.tcp_congestion_control=bbr')
			return {
				f: { bbr: true },
				v: { cc: 'bbr' },
				out: [o('net.ipv4.tcp_congestion_control = bbr', 'hint'), o('# 新しい接続から効く', 'note')]
			};
		if (/^tc qdisc (replace|add) dev eth0 root fq/.test(c))
			return {
				f: { fq: true },
				v: { q: 'fq' },
				out: [o('# qdisc を fq にした（流れごとに公平に並べ、間を空けて送る）', 'note')]
			};
		if (c === 'help')
			return {
				out: [
					o(`使える命令：${TOOLS.join('・')}・clear`),
					o('下の見本を押すと入る。Tab で続きを補う。↑↓ で前に打った命令', 'note')
				]
			};
		return {
			out: [
				o(`bash: ${c.split(' ')[0]}: この場面では使えない`, 'err'),
				o('次の一手：help で使える命令を見る。まずは ss -tin で接続の様子を見る', 'note')
			]
		};
	},
	metrics: (s) =>
		s.f.ss2
			? { cwnd: '86 MSS', rtx: '0 回', rtt: '31 ms' }
			: { cwnd: '9 MSS', rtx: '412 回', rtt: '58 ms' }
};
