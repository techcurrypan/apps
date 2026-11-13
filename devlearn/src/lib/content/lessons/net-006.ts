// net-006 ポートと UDP（shell 模擬。世界 net）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物（Ubuntu 24.04、iproute2 6.1 の ss）の記録
// tools-real/recorded/net-006-ports.json と一字ずつ比べてある（行の並びは本物でも機械ごとに変わるので、並べ替えて比べる）。
// 場面：devbox（192.0.2.10）で、どの口が開いているかを確かめる。SSH（22）・作りかけの Web（8080）・DB（5432）・名前の知らせ（UDP 5353）。
// 経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const ME = 'devbox 192.0.2.10';
const PC = '隣の PC 192.0.2.20';

export const net006: Lesson = {
	id: 'net-006',
	field: 'net',
	level: 2,
	title: 'ポートと UDP',
	goal: 'ポート番号と TCP・UDP の違いから、待ち受けている口を確かめることができる',
	prereq: ['net-005'],
	related: ['ctr-003', 'sec-009'],
	next: ['net-007'],
	explain: [
		{
			n: 1,
			title: '口の番号',
			lead: '1 台の機械に、番号の付いた口がたくさんある',
			body: [
				'IP アドレスは機械まで、ポート番号は機械の中のどの役者までを決める。',
				'番号は 0〜65535 で、192.0.2.10:22 のように住所とコロンで書く。',
				'1 つの口は、1 つのプログラムが待ち受ける。'
			],
			facts: [
				{ k: '住所と口', v: '192.0.2.10:22' },
				{ k: '番号の幅', v: '0〜65535' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: '口が並ぶ', at: [1, 1] },
				{ op: 'appear', id: 'p22', label: ':22', sub: 'TCP', at: [0, 0] }
			],
			log: { t: '0s', from: ME, to: ':22', kind: 'port', info: '22 番の口がある' }
		},
		{
			n: 2,
			title: 'よく使う番号',
			lead: '役目ごとに、慣れた番号が決まっている',
			body: [
				'22 は SSH（遠くの機械を操る）、80 は HTTP、443 は HTTPS、53 は DNS だ。',
				'5432 は表のデータベースでよく使う。8080 は試しの Web によく使う。',
				'慣れた番号を使うと、相手は番号を聞かずに済む。'
			],
			facts: [
				{ k: '22', v: 'SSH' },
				{ k: '80 / 443', v: 'HTTP / HTTPS' },
				{ k: '53', v: 'DNS' },
				{ k: '5432', v: 'データベース' }
			],
			scene: [
				{ op: 'appear', id: 'p8080', label: ':8080', sub: 'TCP', at: [0, 1] },
				{ op: 'appear', id: 'p5432', label: ':5432', sub: 'TCP', at: [0, 2] },
				{ op: 'change', id: 'p22', k: '役目', v: 'SSH' }
			],
			log: { t: '10s', from: ME, to: ME, kind: 'port', info: '22・8080・5432 の役目を並べた' }
		},
		{
			n: 3,
			title: 'ss で待ち受けを見る',
			lead: 'ss -tln は、TCP で待ち受けている口を並べる',
			body: [
				'-t は TCP、-l は待ち受け中だけ、-n は番号のまま出すの意味だ。',
				'出力は LISTEN の行が 3 つ。0.0.0.0:8080・0.0.0.0:22・127.0.0.1:5432 だ。',
				'LISTEN は、相手からの接続を待っている状態だ。'
			],
			facts: [
				{ k: 'ss -tln の行の数', v: '3（見出しを除く）' },
				{ k: 'LISTEN の口', v: '0.0.0.0:8080 / 0.0.0.0:22 / 127.0.0.1:5432' }
			],
			scene: [
				{ op: 'change', id: 'p22', k: '状態', v: 'LISTEN' },
				{ op: 'change', id: 'p8080', k: '状態', v: 'LISTEN' },
				{ op: 'change', id: 'p5432', k: '状態', v: 'LISTEN' }
			],
			log: { t: '20s', from: ME, to: ME, kind: 'ss', info: 'TCP の LISTEN が 3 つ' }
		},
		{
			n: 4,
			title: 'どこから受けるか',
			lead: '0.0.0.0 は全ての差し口、127.0.0.1 は機械の中だけ',
			body: [
				'0.0.0.0:22 は、どの差し口に来た接続も受ける。隣の PC からも届く。',
				'127.0.0.1:5432 は lo（機械の中の差し口）だけで受ける。',
				'隣の PC から 5432 番に来ても、待つ者がいないので断られる。'
			],
			facts: [
				{ k: '0.0.0.0:22', v: '外からも受ける' },
				{ k: '127.0.0.1:5432', v: '機械の中だけ' }
			],
			scene: [
				{ op: 'appear', id: 'pc', label: PC, sub: '外から', at: [3, 1] },
				{ op: 'move', from: 'pc', to: 'p22', payload: 'SSH', kind: 'tcp' },
				{ op: 'move', from: 'pc', to: 'p5432', payload: '断られる', kind: 'deny' }
			],
			log: {
				t: '30s',
				from: PC,
				to: ':5432',
				kind: 'deny',
				info: '5432 は機械の中だけ。外からは断られる'
			},
			why: 'データベースは中身を外に見せたくないので、同じ機械の中のプログラムからだけ受ける口にしてある'
		},
		{
			n: 5,
			title: 'UDP は投げて終わる',
			lead: 'UDP は接続を作らず、届いたかも確かめない',
			body: [
				'ss -uln は UNCONN 0.0.0.0:5353 の 1 行を返す。',
				'UNCONN は「接続していない」の意味で、UDP には LISTEN も接続も無い。',
				'TCP は 3 回のやり取りで接続し、届いたかを確かめて運ぶ。UDP は送ったら終わりだ。'
			],
			facts: [
				{ k: 'ss -uln の行', v: 'UNCONN 0 0 0.0.0.0:5353' },
				{ k: 'TCP', v: '接続する・届いたか確かめる・送り直す' },
				{ k: 'UDP', v: '接続しない・確かめない' }
			],
			scene: [
				{ op: 'appear', id: 'p5353', label: ':5353', sub: 'UDP', at: [2, 2] },
				{ op: 'change', id: 'p5353', k: '状態', v: 'UNCONN' }
			],
			log: { t: '40s', from: ME, to: ':5353', kind: 'ss', info: 'UDP の 5353 は UNCONN' }
		},
		{
			n: 6,
			title: '向く用途を選ぶ',
			lead: '欠けると困る物は TCP、速さが大事な小さな物は UDP',
			body: [
				'Web の頁やファイルは、1 字欠けても困るので TCP で運ぶ。',
				'DNS の問いは 1 往復の小さな物なので、UDP の 53 番で投げる。',
				'声や映像の通話は、遅れて届いた物は要らないので UDP を使う。'
			],
			facts: [
				{ k: 'TCP が向く', v: 'Web（80・443）・SSH（22）・データベース' },
				{ k: 'UDP が向く', v: 'DNS（53）・通話・時刻合わせ' }
			],
			scene: [
				{ op: 'move', from: 'pc', to: 'p5353', payload: 'UDP 1 発', kind: 'udp' },
				{ op: 'change', id: 'me', k: '使い分け', v: '欠けて困る → TCP' }
			],
			log: {
				t: '50s',
				from: PC,
				to: ':5353',
				kind: 'UDP',
				info: '小さな知らせを 1 発投げた',
				size: '72 B'
			}
		}
	],
	example: {
		intro: 'TCP と UDP の口を合わせて見て、分けて見た（模擬は本物の記録と比べ済み）',
		lines: [
			'$ ss -tuln',
			'Netid  State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port Process  ',
			'udp    UNCONN  0       0              0.0.0.0:5353        0.0.0.0:*             ',
			'tcp    LISTEN  0       4096           0.0.0.0:22          0.0.0.0:*             ',
			'tcp    LISTEN  0       4096         127.0.0.1:5432        0.0.0.0:*             ',
			'tcp    LISTEN  0       4096           0.0.0.0:8080        0.0.0.0:*             ',
			'$ ss -tln',
			'State    Recv-Q   Send-Q     Local Address:Port     Peer Address:Port  Process  ',
			'LISTEN   0        4096             0.0.0.0:22            0.0.0.0:*              ',
			'LISTEN   0        4096           127.0.0.1:5432          0.0.0.0:*              ',
			'LISTEN   0        4096             0.0.0.0:8080          0.0.0.0:*              ',
			'$ ss -uln',
			'State    Recv-Q   Send-Q     Local Address:Port     Peer Address:Port  Process  ',
			'UNCONN   0        0                0.0.0.0:5353          0.0.0.0:*              '
		]
	},
	practice: {
		goal: 'UDP で受けている口だけを、ss で並べる',
		tool: { name: 'shell', mode: 'mock' },
		setup: { world: 'net' },
		success: {
			output:
				'State    Recv-Q   Send-Q     Local Address:Port     Peer Address:Port  Process  \nUNCONN   0        0                0.0.0.0:5353          0.0.0.0:*              \n'
		},
		mistakes: [
			{
				when: '-t と -u を両方付けた',
				why: 'TCP の口も混ざり、Netid の欄で TCP と UDP を見分ける表になった',
				next: '-u だけにして、ss -uln と打つ',
				match: 'Netid'
			},
			{
				when: '-t（TCP）で見た',
				why: 'LISTEN は TCP の待ち受けの状態だ。UDP の口は -u で見る',
				next: 'ss -uln と打つ',
				match: 'LISTEN'
			},
			{
				when: 'netstat を打った',
				why: 'netstat は net-tools の古い命令で、今の Ubuntu には入っていない',
				next: '同じ役目の ss を使い、ss -uln と打つ',
				match: 'command not found'
			}
		]
	},
	check: [
		{ ask: 'TCP の待ち受け', how: 'ss -tln に LISTEN が 3 行（22・8080・5432）' },
		{ ask: '外から届かない口', how: '127.0.0.1:5432 は機械の中だけ' },
		{ ask: 'UDP の状態', how: 'ss -uln の 5353 は UNCONN' }
	]
};
