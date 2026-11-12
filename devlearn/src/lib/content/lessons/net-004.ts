// net-004 名前から住所を引く（shell 模擬。世界 net）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物（Ubuntu 24.04、DiG 9.18、dnsmasq 2.91）の記録
// tools-real/recorded/net-004-dns.json と一字ずつ比べてある（問い合わせの番号 id とかかった時間は、本物でも毎回変わるので比べない）。
// 場面：devbox（192.0.2.10）から shop.example.com を開く前に、名前を住所に変える。問い合わせ先は 192.0.2.53。
// 経過時刻 t は名前を打った時を 0ms とした。往復の時間は説明のための例。
import type { Lesson } from '../../lesson/types.ts';

const ME = 'devbox 192.0.2.10';
const NS = 'DNS 192.0.2.53';

export const net004: Lesson = {
	id: 'net-004',
	field: 'net',
	level: 1,
	title: '名前から住所を引く',
	goal: 'dig で、名前が IP アドレスに変わるまでを追うことができる',
	prereq: ['net-001'],
	related: [],
	next: ['net-007'],
	explain: [
		{
			n: 1,
			title: '名前を打つ',
			lead: '人は名前で打つが、網が運ぶ先は番号',
			body: [
				'ping -c 1 shop.example.com の 1 行目に、(192.0.2.80) が出る。',
				'送る前に、名前が 192.0.2.80 という番号に変わっている。',
				'この変換を名前解決と呼び、DNS（名前の電話帳の仕組み）が受け持つ。'
			],
			facts: [
				{ k: '打った名前', v: 'shop.example.com' },
				{ k: '送った先', v: '192.0.2.80' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: 'ping', at: [0, 1] },
				{ op: 'change', id: 'me', k: '知りたい名前', v: 'shop.example.com' }
			],
			log: { t: '0ms', from: ME, to: ME, kind: 'name', info: 'shop.example.com の番号を知りたい' }
		},
		{
			n: 2,
			title: '手元の表を見る',
			lead: '先に、機械の中の /etc/hosts を見る',
			body: [
				'/etc/hosts には 192.0.2.10 devbox の行がある。',
				'ping -c 1 devbox は、外に尋ねずに 192.0.2.10 に決まる。',
				'shop.example.com の行は無いので、外に尋ねに行く。'
			],
			facts: [
				{ k: '/etc/hosts', v: '127.0.0.1 localhost / 192.0.2.10 devbox' },
				{ k: 'ping -c 1 devbox', v: 'PING devbox (192.0.2.10)' },
				{ k: 'shop.example.com の行', v: '（無い）' }
			],
			scene: [
				{ op: 'appear', id: 'hosts', label: '/etc/hosts', sub: '2 行', at: [0, 2] },
				{ op: 'move', from: 'me', to: 'hosts', payload: 'shop.example.com は？', kind: 'look' }
			],
			log: { t: '0ms', from: ME, to: '/etc/hosts', kind: 'hosts', info: '手元の表に無かった' }
		},
		{
			n: 3,
			title: '問い合わせ先へ',
			lead: '/etc/resolv.conf に書いた機械に、UDP で尋ねる',
			body: [
				'/etc/resolv.conf の nameserver 192.0.2.53 が、問い合わせ先だ。',
				'問いは UDP の 53 番に送る。1 往復で済む小さな問いなので、接続を作らずに投げる。',
				'dig shop.example.com の終わりの SERVER: 192.0.2.53#53 がその印だ。'
			],
			facts: [
				{ k: '/etc/resolv.conf', v: 'nameserver 192.0.2.53' },
				{ k: '運び方', v: 'UDP 53 番' },
				{ k: 'dig の SERVER の行', v: '192.0.2.53#53(192.0.2.53) (UDP)' }
			],
			scene: [
				{ op: 'appear', id: 'ns', label: NS, sub: 'UDP 53', at: [2, 1] },
				{ op: 'move', from: 'me', to: 'ns', payload: 'shop.example.com IN A ?', kind: 'query' }
			],
			log: {
				t: '0.1ms',
				from: ME,
				to: NS,
				kind: 'DNS',
				info: 'shop.example.com の A を尋ねた',
				size: '57 B'
			}
		},
		{
			n: 4,
			title: '根から順に聞く',
			lead: '知らない名前は、問い合わせ先が右の区切りから順に聞いて回る',
			body: [
				'名前は右から読む。根、com、example.com、shop の順に細かくなる。',
				'問い合わせ先が知らなければ、根に com の係を、com に example.com の係を聞く。',
				'この場面では 192.0.2.53 が example.com の帳簿を持つので、自分で答える。'
			],
			facts: [
				{ k: '聞く順', v: '. → com. → example.com. → shop.example.com.' },
				{ k: 'dig の flags', v: 'qr aa rd ra（aa = 帳簿の持ち主の答え）' }
			],
			scene: [
				{
					op: 'appear',
					id: 'zone',
					label: 'example.com の帳簿',
					sub: '192.0.2.53 が持つ',
					at: [3, 1]
				},
				{ op: 'move', from: 'ns', to: 'zone', payload: 'shop は？', kind: 'lookup' }
			],
			log: {
				t: '0.2ms',
				from: NS,
				to: 'example.com の帳簿',
				kind: 'zone',
				info: '帳簿の持ち主なので自分で引く'
			},
			why: '1 台で全ての名前を持つと、世界中の問いが集まって止まるので、区切りごとに係を分けて任せている'
		},
		{
			n: 5,
			title: 'A レコードが返る',
			lead: '答えの節に、名前と番号の組が 1 行で返る',
			body: [
				'ANSWER SECTION は shop.example.com. 300 IN A 192.0.2.80 だ。',
				'A は「IPv4 の住所」の種類だ。dig +short は、この番号だけを出す。',
				'無い名前を引くと status: NXDOMAIN で、答えの節が無い。'
			],
			facts: [
				{ k: '答えの行', v: 'shop.example.com.\t300\tIN\tA\t192.0.2.80' },
				{ k: 'dig +short shop.example.com', v: '192.0.2.80' },
				{ k: 'dig nosuch.example.com の status', v: 'NXDOMAIN' }
			],
			scene: [
				{ op: 'move', from: 'ns', to: 'me', payload: 'A 192.0.2.80', kind: 'answer' },
				{ op: 'change', id: 'me', k: 'shop.example.com', v: '192.0.2.80' }
			],
			log: {
				t: '0.3ms',
				from: NS,
				to: ME,
				kind: 'DNS',
				info: 'A 192.0.2.80（status NOERROR）',
				size: '61 B'
			}
		},
		{
			n: 6,
			title: '覚えておく時間',
			lead: '答えの 300 は、使い回してよい秒数',
			body: [
				'答えの行の 300 は TTL（覚えておいてよい時間）で、単位は秒だ。',
				'300 秒の間は、同じ名前を尋ね直さずに 192.0.2.80 を使う。',
				'番号を替えるときは、古い答えが 300 秒は残ると見込んでおく。'
			],
			facts: [
				{ k: 'TTL', v: '300 秒（5 分）' },
				{ k: '次に尋ねる時', v: '300 秒の後' }
			],
			scene: [
				{ op: 'appear', id: 'cache', label: '覚えた答え', sub: 'TTL 300 秒', at: [1, 2] },
				{ op: 'change', id: 'cache', k: 'shop.example.com', v: '192.0.2.80（300 秒）' }
			],
			log: {
				t: '0.3ms',
				from: ME,
				to: '覚えた答え',
				kind: 'cache',
				info: '300 秒の間は尋ね直さない'
			}
		}
	],
	example: {
		intro: '問い合わせ先を確かめ、名前を引いた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ cat /etc/resolv.conf',
			'nameserver 192.0.2.53',
			'$ cat /etc/hosts',
			'127.0.0.1 localhost',
			'192.0.2.10 devbox',
			'$ dig shop.example.com',
			'',
			'; <<>> DiG 9.18.39-0ubuntu0.24.04.9-Ubuntu <<>> shop.example.com',
			';; global options: +cmd',
			';; Got answer:',
			';; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 1',
			';; flags: qr aa rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1',
			'',
			';; OPT PSEUDOSECTION:',
			'; EDNS: version: 0, flags:; udp: 1232',
			';; QUESTION SECTION:',
			';shop.example.com.\t\tIN\tA',
			'',
			';; ANSWER SECTION:',
			'shop.example.com.\t300\tIN\tA\t192.0.2.80',
			'',
			';; Query time: 0 msec',
			';; SERVER: 192.0.2.53#53(192.0.2.53) (UDP)',
			';; WHEN: Tue Nov 10 09:02:00 JST 2026',
			';; MSG SIZE  rcvd: 61',
			'',
			'$ dig +short shop.example.com',
			'192.0.2.80',
			'$ dig +short nosuch.example.com',
			'$ ping -c 1 devbox',
			'PING devbox (192.0.2.10) 56(84) bytes of data.',
			'64 bytes from devbox (192.0.2.10): icmp_seq=1 ttl=64 time=0.050 ms',
			'',
			'--- devbox ping statistics ---',
			'1 packets transmitted, 1 received, 0% packet loss, time 0ms',
			'rtt min/avg/max/mdev = 0.050/0.050/0.050/0.000 ms'
		]
	},
	practice: {
		goal: 'cdn.example.com の IPv4 の住所を、dig +short で引く',
		tool: { name: 'shell', mode: 'mock' },
		setup: { world: 'net' },
		success: { output: '203.0.113.5\n' },
		mistakes: [
			{
				when: '帳簿に無い名前を引いた（綴りの誤り）',
				why: 'NXDOMAIN は「その名前は無い」という答えだ。届かなかったのではなく、名前が違う',
				next: '綴りを cdn.example.com と見直し、dig +short cdn.example.com と打つ',
				match: 'NXDOMAIN'
			},
			{
				when: '名前を引けないまま ping した',
				why: '名前が番号に変わらなかったので、ping は送る先を決められなかった',
				next: '先に dig +short cdn.example.com で、名前が引けるかを確かめる',
				match: 'Name or service not known'
			},
			{
				when: 'nslookup で引こうとした',
				why: '本物にはあるが、模擬の端末は nslookup を扱わない',
				next: 'dig +short cdn.example.com と打つ',
				match: '模擬の端末は nslookup を扱わない'
			}
		]
	},
	check: [
		{ ask: '問い合わせ先', how: '/etc/resolv.conf の nameserver 192.0.2.53' },
		{ ask: '答えの種類と値', how: 'shop.example.com は A 192.0.2.80' },
		{ ask: '使い回せる時間', how: 'TTL 300 秒' }
	]
};
