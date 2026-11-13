// net-003 経路を選ぶ（shell 模擬。世界 net）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物（Ubuntu 24.04、iproute2 6.1）の記録
// tools-real/recorded/net-003-route.json と一字ずつ比べてある。
// 場面：devbox（192.0.2.10）には、出口の機械が 2 台ある。既定の 192.0.2.1 と、198.51.100.0/24 へ行く 192.0.2.2。
// 経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const ME = 'devbox 192.0.2.10';
const R1 = '出口 192.0.2.1';
const R2 = '出口 192.0.2.2';

export const net003: Lesson = {
	id: 'net-003',
	field: 'net',
	level: 1,
	title: '経路を選ぶ',
	goal: '経路表から、宛先ごとの次の行き先を決めることができる',
	prereq: ['net-002'],
	related: ['cld-004'],
	next: ['net-010'],
	explain: [
		{
			n: 1,
			title: '経路表を読む',
			lead: 'ip route は、宛先の網ごとの行き先を並べる',
			body: [
				'ip route は 3 行を返す。1 行が「この網へはこう行く」の決まりだ。',
				'via は「この機械に渡す」、dev は「この差し口から出す」の意味だ。',
				'default は、ほかのどの行にも当たらない宛先の行き先だ。'
			],
			facts: [
				{ k: '1 行目', v: 'default via 192.0.2.1 dev eth0' },
				{ k: '2 行目', v: '192.0.2.0/24 dev eth0 … src 192.0.2.10' },
				{ k: '3 行目', v: '198.51.100.0/24 via 192.0.2.2 dev eth0' }
			],
			scene: [
				{ op: 'appear', id: 'me', label: ME, sub: '経路表 3 行', at: [0, 1] },
				{ op: 'appear', id: 'r1', label: R1, sub: 'default', at: [2, 0] },
				{ op: 'appear', id: 'r2', label: R2, sub: '198.51.100.0/24', at: [2, 2] }
			],
			log: { t: '0s', from: ME, to: ME, kind: 'route', info: '経路表は 3 行' }
		},
		{
			n: 2,
			title: '同じ網は直に',
			lead: 'via の無い行に当たる宛先は、誰にも渡さず直に届ける',
			body: [
				'ip route get 192.0.2.80 の答えは dev eth0 src 192.0.2.10 だ。',
				'via が無いのは、宛先が同じ網 192.0.2.0/24 にいて直に届けられるからだ。',
				'src は、送るときに書く自分の住所だ。'
			],
			facts: [
				{ k: 'ip route get 192.0.2.80', v: '192.0.2.80 dev eth0 src 192.0.2.10 uid 1000' },
				{ k: '当たった行', v: '192.0.2.0/24' },
				{ k: '渡す機械', v: '（無い。直に届ける）' }
			],
			scene: [
				{ op: 'appear', id: 'web', label: 'Web 192.0.2.80', sub: '同じ網', at: [1, 1] },
				{ op: 'move', from: 'me', to: 'web', payload: '直に', kind: 'direct' }
			],
			log: {
				t: '10s',
				from: ME,
				to: 'Web 192.0.2.80',
				kind: 'route',
				info: '同じ網なので直に届ける'
			}
		},
		{
			n: 3,
			title: '長く一致する行を選ぶ',
			lead: '当たる行が 2 つあれば、網の幅が狭い方を選ぶ',
			body: [
				'198.51.100.7 は、198.51.100.0/24 の行にも default の行にも当たる。',
				'default は 0.0.0.0/0、一致を求める桁が 0 ビットの行だ。',
				'/24 は 24 ビットが一致した。長く一致した方が詳しい決まりなので、こちらを使う。'
			],
			facts: [
				{ k: '宛先', v: '198.51.100.7' },
				{ k: '当たる行', v: '198.51.100.0/24（24 ビット）・default（0 ビット）' },
				{ k: 'ip route get の答え', v: '198.51.100.7 via 192.0.2.2 dev eth0' }
			],
			scene: [
				{ op: 'appear', id: 'far', label: '198.51.100.7', sub: '別の網', at: [3, 2] },
				{ op: 'highlight', id: 'r2' },
				{ op: 'change', id: 'me', k: '198.51.100.7 へ', v: 'via 192.0.2.2' }
			],
			log: {
				t: '20s',
				from: ME,
				to: R2,
				kind: 'route',
				info: '198.51.100.0/24 の行（24 ビット一致）を選んだ'
			},
			why: '狭い網の行ほど、その宛先のために誰かが書いた詳しい決まりなので、広い既定の行より先に効かせる'
		},
		{
			n: 4,
			title: '既定の経路',
			lead: 'どの網の行にも当たらない宛先は、default へ',
			body: [
				'203.0.113.5 は、192.0.2.0/24 にも 198.51.100.0/24 にも入らない。',
				'当たるのは default だけなので、192.0.2.1 に渡す。',
				'外の世界の大半の宛先は、この既定の経路を通る。'
			],
			facts: [
				{ k: '宛先', v: '203.0.113.5' },
				{ k: '当たる行', v: 'default（0 ビット）だけ' },
				{ k: 'ip route get の答え', v: '203.0.113.5 via 192.0.2.1 dev eth0' }
			],
			scene: [
				{ op: 'appear', id: 'cdn', label: '203.0.113.5', sub: '外の網', at: [3, 0] },
				{ op: 'change', id: 'me', k: '203.0.113.5 へ', v: 'via 192.0.2.1' }
			],
			log: {
				t: '30s',
				from: ME,
				to: R1,
				kind: 'route',
				info: '203.0.113.5 は default の行に回った'
			}
		},
		{
			n: 5,
			title: '次の機械へ渡す',
			lead: '渡す相手は、宛先でなく同じ網の出口の機械',
			body: [
				'ping -c 1 198.51.100.7 を打つと、届いて 64 bytes の返事が来る。',
				'その後の ip neigh には 192.0.2.2 の行が増え、198.51.100.7 の行は無い。',
				'枠の宛先は出口 192.0.2.2 の MAC で、中の宛先 IP は 198.51.100.7 のままだ。'
			],
			facts: [
				{ k: '増えた近くの表の行', v: '192.0.2.2 dev eth0 lladdr 02:00:00:00:00:02' },
				{ k: '枠の宛先 MAC', v: '02:00:00:00:00:02（出口）' },
				{ k: '中の宛先 IP', v: '198.51.100.7（変わらない）' }
			],
			scene: [
				{ op: 'move', from: 'me', to: 'r2', payload: '宛先 198.51.100.7', kind: 'icmp' },
				{ op: 'move', from: 'r2', to: 'far', payload: '渡す', kind: 'icmp' }
			],
			log: {
				t: '40s',
				from: R2,
				to: '198.51.100.7',
				kind: 'ICMP',
				info: '出口 192.0.2.2 が先へ渡し、返事が届いた',
				size: '98 B'
			}
		},
		{
			n: 6,
			title: '自分宛ては lo へ',
			lead: '自分の住所への宛先は、網に出さない',
			body: [
				'ip route get 192.0.2.10 は local 192.0.2.10 dev lo を返す。',
				'lo は機械の中だけで折り返す差し口で、線には出ない。',
				'127.0.0.1 も同じく lo を通る。'
			],
			facts: [
				{ k: 'ip route get 192.0.2.10', v: 'local 192.0.2.10 dev lo src 192.0.2.10' },
				{ k: 'ip route get 127.0.0.1', v: 'local 127.0.0.1 dev lo src 127.0.0.1' }
			],
			scene: [
				{ op: 'appear', id: 'lo', label: 'lo', sub: '機械の中で折り返す', at: [0, 2] },
				{ op: 'move', from: 'me', to: 'lo', payload: '自分宛て', kind: 'local' }
			],
			log: { t: '50s', from: ME, to: 'lo', kind: 'route', info: '自分宛ては lo で折り返す' }
		}
	],
	example: {
		intro: '経路表を読み、宛先ごとに行き先を引いた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ ip route',
			'default via 192.0.2.1 dev eth0 ',
			'192.0.2.0/24 dev eth0 proto kernel scope link src 192.0.2.10 ',
			'198.51.100.0/24 via 192.0.2.2 dev eth0 ',
			'$ ip route get 192.0.2.80',
			'192.0.2.80 dev eth0 src 192.0.2.10 uid 1000 ',
			'    cache ',
			'$ ip route get 198.51.100.7',
			'198.51.100.7 via 192.0.2.2 dev eth0 src 192.0.2.10 uid 1000 ',
			'    cache ',
			'$ ip route get 203.0.113.5',
			'203.0.113.5 via 192.0.2.1 dev eth0 src 192.0.2.10 uid 1000 ',
			'    cache ',
			'$ ping -c 1 198.51.100.7',
			'PING 198.51.100.7 (198.51.100.7) 56(84) bytes of data.',
			'64 bytes from 198.51.100.7: icmp_seq=1 ttl=64 time=0.050 ms',
			'',
			'--- 198.51.100.7 ping statistics ---',
			'1 packets transmitted, 1 received, 0% packet loss, time 0ms',
			'rtt min/avg/max/mdev = 0.050/0.050/0.050/0.000 ms',
			'$ ip neigh',
			'192.0.2.53 dev eth0 lladdr 02:00:00:00:00:35 REACHABLE ',
			'192.0.2.2 dev eth0 lladdr 02:00:00:00:00:02 REACHABLE ',
			'$ ip route get 192.0.2.10',
			'local 192.0.2.10 dev lo src 192.0.2.10 uid 1000 ',
			'    cache <local> '
		]
	},
	practice: {
		goal: '198.51.100.7 へ送るとき最初に渡す機械を、ip route get で確かめる',
		tool: { name: 'shell', mode: 'mock' },
		setup: { world: 'net' },
		success: {
			output: '198.51.100.7 via 192.0.2.2 dev eth0 src 192.0.2.10 uid 1000 \n    cache \n'
		},
		mistakes: [
			{
				when: 'ip route get に名前や、区切りに入らない数を渡した',
				why: 'ip route get は IP アドレスの番号だけを読む。名前は引かない',
				next: 'ip route get 198.51.100.7 と、番号で打つ',
				match: 'inet prefix is expected'
			},
			{
				when: '宛先を打ち誤り、どの網の行にも当たらない番号を引いた',
				why: 'その宛先は default の行に回り、192.0.2.1 に渡された。198.51.100.0/24 の行に当たっていない',
				next: '宛先を 198.51.100.7 と見直す',
				match: 'via 192.0.2.1'
			},
			{
				when: 'traceroute や route のような、入っていない命令を打った',
				why: 'それらは今の Ubuntu の既定には入っていない',
				next: '最初に渡す機械は ip route get 宛先 で分かる',
				match: 'command not found'
			}
		]
	},
	check: [
		{ ask: '同じ網の宛先', how: 'ip route get 192.0.2.80 に via が無い' },
		{
			ask: '詳しい行が勝つ',
			how: '198.51.100.7 は default でなく 198.51.100.0/24 の行で 192.0.2.2'
		},
		{ ask: '既定の経路', how: '203.0.113.5 は via 192.0.2.1' },
		{ ask: '渡す相手の MAC', how: 'ping の後の ip neigh に 192.0.2.2 の行が増える' }
	]
};
