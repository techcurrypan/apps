// net-002 同じ網の中で届ける（shell 模擬。世界 net）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物（Ubuntu 24.04、iproute2 6.1、iputils 20240117）の記録
// tools-real/recorded/net-002-arp.json と一字ずつ比べてある。
// 場面：作業の機械 devbox（192.0.2.10/24）から、同じ網の Web の機械（192.0.2.80）に初めて届ける。
// 経過時刻 t は ping を打った時を 0ms とした。ARP の往復の時間は説明のための例。
import type { Lesson } from '../../lesson/types.ts';

const ME = 'devbox 192.0.2.10';
const WEB = 'Web 192.0.2.80';
const ALL = '網の全員';

export const net002: Lesson = {
	id: 'net-002',
	field: 'net',
	level: 1,
	title: '同じ網の中で届ける',
	goal: 'ARP で MAC アドレスを調べ、隣の機械に届ける流れを追うことができる',
	prereq: ['net-001'],
	related: [],
	next: ['net-003'],
	explain: [
		{
			n: 1,
			title: '同じ網の相手',
			lead: '自分のアドレスとマスクから、相手が同じ網かを見る',
			body: [
				'ip addr show eth0 は inet 192.0.2.10/24 を返す。',
				'/24 なので、上の 3 つの区切り 192.0.2 が網の名前だ。',
				'相手の 192.0.2.80 も 192.0.2 で始まる。同じ網なので、間に誰も挟まず直に届けられる。'
			],
			facts: [
				{ k: '自分', v: '192.0.2.10/24' },
				{ k: '相手', v: '192.0.2.80' },
				{ k: '網の名前', v: '192.0.2.0/24（同じ）' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: 'eth0', at: [0, 1] },
				{ op: 'appear', id: 'web', label: WEB, sub: '同じ網', at: [2, 1] }
			],
			log: { t: '0ms', from: ME, to: WEB, kind: 'same', info: '相手は同じ網 192.0.2.0/24 にいる' }
		},
		{
			n: 2,
			title: 'MAC アドレス',
			lead: '線の上で届けるには、相手の差し口の番号が要る',
			body: [
				'MAC アドレスは、網の差し口（eth0 など）ごとに付いた 48 ビットの番号だ。',
				'自分の差し口は link/ether 02:00:00:00:00:0a と出る。',
				'線の上の枠（フレーム）は、宛先を IP でなく MAC で書く。相手の MAC はまだ知らない。'
			],
			facts: [
				{ k: '自分の MAC', v: '02:00:00:00:00:0a' },
				{ k: '相手の MAC', v: '（まだ知らない）' },
				{ k: 'ip neigh の 192.0.2.80', v: '（行が無い）' }
			],
			scene: [
				{ op: 'change', id: 'me', k: 'MAC', v: '02:00:00:00:00:0a' },
				{ op: 'change', id: 'web', k: 'MAC', v: '？' }
			],
			log: { t: '0ms', from: ME, to: ME, kind: 'table', info: '近くの表に 192.0.2.80 の行が無い' },
			why: 'IP アドレスは網をまたいで使う住所で、線の上の機械が読むのは差し口の番号だから'
		},
		{
			n: 3,
			title: 'ARP で尋ねる',
			lead: '網の全員に「192.0.2.80 は誰か」と尋ねる',
			body: [
				'ARP（アドレス解決の決まり）は、IP から MAC を調べる問い合わせだ。',
				'宛先 ff:ff:ff:ff:ff:ff は全員宛てで、同じ網の機械が全て受け取る。',
				'中身は「192.0.2.80 を持つ者は 192.0.2.10 に知らせよ」だ。'
			],
			facts: [
				{ k: '枠の宛先', v: 'ff:ff:ff:ff:ff:ff（全員）' },
				{ k: '問い', v: 'who-has 192.0.2.80 tell 192.0.2.10' },
				{ k: '大きさ', v: '42 B' }
			],
			scene: [
				{ op: 'appear', id: 'all', label: ALL, sub: 'ff:ff:ff:ff:ff:ff', at: [1, 0] },
				{ op: 'move', from: 'me', to: 'all', payload: '192.0.2.80 は誰？', kind: 'arp' }
			],
			log: {
				t: '0ms',
				from: ME,
				to: ALL,
				kind: 'ARP',
				info: 'who-has 192.0.2.80 tell 192.0.2.10',
				size: '42 B'
			}
		},
		{
			n: 4,
			title: '答えが返る',
			lead: '持ち主だけが、自分の MAC を返す',
			body: [
				'192.0.2.80 を持つ Web の機械だけが答える。ほかの機械は黙って捨てる。',
				'答えは全員宛てでなく、尋ねた 02:00:00:00:00:0a に直に返る。',
				'中身は「192.0.2.80 は 02:00:00:00:00:50」だ。'
			],
			facts: [
				{ k: '答えた機械', v: '192.0.2.80' },
				{ k: '答え', v: '192.0.2.80 is-at 02:00:00:00:00:50' },
				{ k: '答えの宛先', v: '02:00:00:00:00:0a（尋ねた者だけ）' }
			],
			scene: [
				{ op: 'move', from: 'web', to: 'me', payload: 'is-at 02:00:00:00:00:50', kind: 'arp' },
				{ op: 'change', id: 'web', k: 'MAC', v: '02:00:00:00:00:50' }
			],
			log: {
				t: '0.02ms',
				from: WEB,
				to: ME,
				kind: 'ARP',
				info: '192.0.2.80 is-at 02:00:00:00:00:50',
				size: '42 B'
			}
		},
		{
			n: 5,
			title: '表に残る',
			lead: '聞いた答えは、近くの表（ip neigh）に覚えておく',
			body: [
				'ip neigh に、192.0.2.80 の MAC 02:00:00:00:00:50 の行が増える。',
				'REACHABLE は、少し前に届くと確かめた印だ。',
				'次に送るときは尋ねずに、この表の MAC を使う。'
			],
			facts: [
				{ k: '増えた行', v: '192.0.2.80 dev eth0 lladdr 02:00:00:00:00:50 REACHABLE' },
				{ k: '表の行の数', v: '1 → 2' }
			],
			scene: [
				{ op: 'appear', id: 'table', label: '近くの表', sub: 'ip neigh', at: [0, 2] },
				{ op: 'change', id: 'table', k: '192.0.2.80', v: '02:00:00:00:00:50' }
			],
			log: {
				t: '0.03ms',
				from: ME,
				to: '近くの表',
				kind: 'table',
				info: '192.0.2.80 → 02:00:00:00:00:50 を覚えた'
			}
		},
		{
			n: 6,
			title: '枠に包んで送る',
			lead: '調べた MAC を宛先にして、ping を届ける',
			body: [
				'ping の中身（56 バイト）を、宛先 MAC 02:00:00:00:00:50 の枠に包んで送る。',
				'返事は 64 bytes from 192.0.2.80 で、届いたことが分かる。',
				'いない 192.0.2.99 に送ると、ARP に誰も答えない。ping は Destination Host Unreachable を返す。'
			],
			facts: [
				{ k: 'ping の返事', v: '64 bytes from 192.0.2.80: icmp_seq=1 ttl=64' },
				{ k: '枠の宛先', v: '02:00:00:00:00:50' },
				{ k: 'いない相手の表', v: '192.0.2.99 dev eth0 FAILED' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'web', payload: 'ping 56 B', kind: 'icmp' },
				{ op: 'move', from: 'web', to: 'me', payload: '64 bytes', kind: 'icmp' },
				{ op: 'change', id: 'table', k: '192.0.2.99', v: 'FAILED' }
			],
			log: {
				t: '0.05ms',
				from: WEB,
				to: ME,
				kind: 'ICMP',
				info: '64 bytes from 192.0.2.80 icmp_seq=1',
				size: '98 B'
			}
		}
	],
	example: {
		intro: '近くの表を見て、ping で届け、表が増えたのを確かめた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ ip addr show eth0',
			'2: eth0@if3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000',
			'    link/ether 02:00:00:00:00:0a brd ff:ff:ff:ff:ff:ff link-netns sw',
			'    inet 192.0.2.10/24 scope global eth0',
			'       valid_lft forever preferred_lft forever',
			'$ ip neigh',
			'192.0.2.53 dev eth0 lladdr 02:00:00:00:00:35 REACHABLE ',
			'$ ping -c 1 192.0.2.80',
			'PING 192.0.2.80 (192.0.2.80) 56(84) bytes of data.',
			'64 bytes from 192.0.2.80: icmp_seq=1 ttl=64 time=0.050 ms',
			'',
			'--- 192.0.2.80 ping statistics ---',
			'1 packets transmitted, 1 received, 0% packet loss, time 0ms',
			'rtt min/avg/max/mdev = 0.050/0.050/0.050/0.000 ms',
			'$ ip neigh',
			'192.0.2.53 dev eth0 lladdr 02:00:00:00:00:35 REACHABLE ',
			'192.0.2.80 dev eth0 lladdr 02:00:00:00:00:50 REACHABLE ',
			'$ ping -c 1 192.0.2.99',
			'PING 192.0.2.99 (192.0.2.99) 56(84) bytes of data.',
			'From 192.0.2.10 icmp_seq=1 Destination Host Unreachable',
			'',
			'--- 192.0.2.99 ping statistics ---',
			'1 packets transmitted, 0 received, +1 errors, 100% packet loss, time 0ms',
			'',
			'$ ip neigh show 192.0.2.99',
			'192.0.2.99 dev eth0 FAILED '
		]
	},
	practice: {
		goal: 'Web の機械 192.0.2.80 の MAC を近くの表に載せ、ip neigh show 192.0.2.80 で見せる',
		tool: { name: 'shell', mode: 'mock' },
		setup: { world: 'net' },
		success: { output: '192.0.2.80 dev eth0 lladdr 02:00:00:00:00:50 REACHABLE \n' },
		mistakes: [
			{
				when: '網にいないアドレス（192.0.2.99 など）に送った、またはその行を見た',
				why: 'その番号を持つ機械がいないので、ARP に誰も答えない。表には FAILED が残る',
				next: 'ip addr と ping の宛先を見直し、ping -c 1 192.0.2.80 と打つ',
				match: 'Destination Host Unreachable'
			},
			{
				when: '答えの無かった行を ip neigh show で見た',
				why: 'FAILED は、ARP に答えが無かった印だ。MAC は分からないままだ',
				next: '宛先を 192.0.2.80 に替えて ping し、その後で ip neigh show 192.0.2.80 と打つ',
				match: 'FAILED'
			},
			{
				when: 'arp や netstat のような古い命令を打った',
				why: 'それらは net-tools の命令で、今の Ubuntu には入っていない',
				next: '近くの表は ip neigh で見る',
				match: 'command not found'
			},
			{
				when: '256 のような、区切りに入らない数を打った',
				why: '区切りは 0〜255。番号として読めないので、ping は名前として引いて見つからなかった',
				next: '192.0.2.80 と打ち直す',
				match: 'Name or service not known'
			}
		]
	},
	check: [
		{ ask: '同じ網か', how: '192.0.2.10/24 と 192.0.2.80 は、どちらも 192.0.2.0/24' },
		{ ask: 'ARP の問いの宛先', how: 'ff:ff:ff:ff:ff:ff（同じ網の全員）' },
		{ ask: '表に残ったか', how: 'ip neigh に 192.0.2.80 … lladdr 02:00:00:00:00:50 の行がある' }
	]
};
