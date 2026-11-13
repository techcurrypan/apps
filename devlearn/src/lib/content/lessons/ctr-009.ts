// ctr-009 コンテナどうしの網（docker 模擬）。
// 出力は模擬の docker で打って得た物。模擬は本物の docker 28.0.4（Ubuntu 24.04）の記録 tools-real/recorded/ctr-009-network.json と比べてある
// （網とコンテナの ID、ping の時間は、本物では打つたびに変わるので模擬の値）。
// 場面：注文を受ける db に、ほかのコンテナから名前で届くようにしたい。経過時刻 t は docker network create を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const NET = '網 shopnet';
const DB = 'db';

export const ctr009: Lesson = {
	id: 'ctr-009',
	field: 'ctr',
	level: 3,
	title: 'コンテナどうしの網',
	goal: '名前でコンテナどうしがつながる仕組みを確かめることができる',
	prereq: ['ctr-007', 'net-004'],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '同じ網の 2 つ',
			lead: 'コンテナは、docker の中の網につながって動く',
			body: [
				'docker network ls は bridge・host・none の 3 つを返す。',
				'何も付けずに動かしたコンテナは、既定の bridge につながる。'
			],
			facts: [
				{ k: '初めからある網', v: 'bridge・host・none' },
				{ k: '既定の網', v: 'bridge' }
			],
			scene: [
				{ op: 'appear', id: 'bridge', label: '網 bridge', sub: '既定', at: [0, 2] },
				{ op: 'change', id: 'bridge', k: '名前で引く', v: 'できない' }
			],
			log: { t: '0m', from: '端末', to: '網 bridge', kind: 'network', info: '既定の網は bridge' }
		},
		{
			n: 2,
			title: '名前で引く',
			lead: '既定の bridge では、コンテナの名前で相手を引けない',
			body: [
				"bridge のコンテナから ping db を打つと、bad address 'db' と返る。",
				'名前 db から宛先を引く仕組みが、既定の網には無い。'
			],
			facts: [
				{ k: '答え', v: "ping: bad address 'db'" },
				{ k: '網', v: 'bridge（既定）' }
			],
			scene: [
				{ op: 'appear', id: 'c1', label: '試すコンテナ', sub: '網 bridge', at: [3, 2] },
				{ op: 'move', from: 'c1', to: 'bridge', payload: 'db は誰？', kind: 'dns' },
				{ op: 'highlight', id: 'c1' }
			],
			log: {
				t: '4m',
				from: '試すコンテナ',
				to: '網 bridge',
				kind: 'dns',
				info: '名前 db を引けない'
			}
		},
		{
			n: 3,
			title: '網を作る',
			lead: 'docker network create で、自分の網を作る',
			body: [
				'docker network create shopnet は、網の ID を 1 行で返す。',
				'network ls に shopnet bridge local の行が増える。'
			],
			facts: [
				{ k: '作った網', v: 'shopnet' },
				{ k: 'DRIVER', v: 'bridge' }
			],
			scene: [
				{ op: 'appear', id: 'net', label: NET, sub: '名前で引ける', at: [0, 0] },
				{ op: 'change', id: 'net', k: '名前で引く', v: 'できる' }
			],
			log: { t: '0m', from: '端末', to: NET, kind: 'network', info: 'shopnet を作った' },
			why: '自分で作った網は、そこにつないだコンテナの名前を引く仕組みを持つ'
		},
		{
			n: 4,
			title: '網に入れる',
			lead: '--network 網 で、コンテナをその網につなぐ',
			body: [
				'docker run に --network shopnet を付けて、db を動かす。',
				'db は shopnet の中で 172.18.0.2 を受け取った。'
			],
			facts: [
				{ k: '打った物', v: 'docker run -d --name db --network shopnet …' },
				{ k: 'db の宛先', v: '172.18.0.2' }
			],
			scene: [
				{ op: 'appear', id: 'db', label: DB, sub: '172.18.0.2', at: [6, 0] },
				{ op: 'move', from: 'net', to: 'db', payload: '--network shopnet', kind: 'connect' }
			],
			log: { t: '2m', from: NET, to: DB, kind: 'connect', info: 'db を shopnet につないだ' }
		},
		{
			n: 5,
			title: '名前で届く',
			lead: '同じ網のコンテナからは、名前 db で届く',
			body: [
				'--network shopnet のコンテナから ping -c 1 -W 1 db を打つ。',
				'PING db (172.18.0.2) と、1 packets received が返る。名前 db が宛先に引けた。'
			],
			facts: [
				{ k: '引いた宛先', v: 'db → 172.18.0.2' },
				{ k: '答え', v: '1 packets transmitted, 1 packets received, 0% packet loss' }
			],
			scene: [
				{ op: 'appear', id: 'c2', label: '試すコンテナ', sub: '網 shopnet', at: [3, 0] },
				{ op: 'move', from: 'c2', to: 'db', payload: 'ping db', kind: 'ping' },
				{ op: 'move', from: 'db', to: 'c2', payload: '返事', kind: 'ping' }
			],
			log: { t: '3m', from: '試すコンテナ', to: DB, kind: 'ping', info: '名前 db で届いた' }
		},
		{
			n: 6,
			title: '違う網は届かない',
			lead: '別の網のコンテナからは、名前も宛先も見えない',
			body: [
				'網 other を作り、そこから ping db を打つと、bad address と返る。',
				'網は、届く相手の範囲を分ける仕切りでもある。'
			],
			facts: [
				{ k: 'other から', v: "ping: bad address 'db'" },
				{ k: '届く範囲', v: '同じ網の中だけ' }
			],
			scene: [
				{ op: 'appear', id: 'other', label: '網 other', sub: '別の仕切り', at: [3, 1] },
				{ op: 'move', from: 'other', to: 'db', payload: 'ping db', kind: 'fail' }
			],
			log: { t: '6m', from: '網 other', to: DB, kind: 'fail', info: '別の網からは届かない' }
		}
	],
	example: {
		intro: '網を作って db を入れ、名前で届く所と届かない所を見た（模擬は本物の記録と比べ済み）',
		lines: [
			'$ docker network create shopnet',
			'652e6a1bc71ef7561facf9423f55787c478732e15d9d2811f769761da01d09c6',
			'$ docker network ls',
			'NETWORK ID     NAME      DRIVER    SCOPE',
			'c89ffca5f63e   bridge    bridge    local',
			'891d29567c13   host      host      local',
			'4a5e145313e5   none      null      local',
			'652e6a1bc71e   shopnet   bridge    local',
			'$ docker run -d --name db --network shopnet busybox:1.37 sleep 600',
			'339cea8275ce1f401fccece04fe368a4da73fd41a40cf93827f85ba9d74f9f23',
			'$ docker run --rm --network shopnet busybox:1.37 ping -c 1 -W 1 db',
			'PING db (172.18.0.2): 56 data bytes',
			'64 bytes from 172.18.0.2: seq=0 ttl=64 time=0.081 ms',
			'',
			'--- db ping statistics ---',
			'1 packets transmitted, 1 packets received, 0% packet loss',
			'round-trip min/avg/max = 0.081/0.081/0.081 ms',
			'$ docker run --rm busybox:1.37 ping -c 1 -W 1 db',
			"ping: bad address 'db'",
			'$ docker network create other',
			'301981815d79af3704298eae4ce0021f203ccd0c6246a1a531c4f2f2ed6ac389',
			'$ docker run --rm --network other busybox:1.37 ping -c 1 -W 1 db',
			"ping: bad address 'db'"
		]
	},
	practice: {
		goal: '網 shopnet を作って db を裏で動かし、同じ網の別のコンテナから ping -c 1 -W 1 db で届くことを確かめる',
		tool: { name: 'docker', mode: 'mock' },
		setup: { world: 'docker' },
		success: {
			running: ['db'],
			networks: ['shopnet'],
			output:
				'PING db (172.18.0.2): 56 data bytes\n64 bytes from 172.18.0.2: seq=0 ttl=64 time=0.081 ms\n\n--- db ping statistics ---\n1 packets transmitted, 1 packets received, 0% packet loss\nround-trip min/avg/max = 0.081/0.081/0.081 ms\n'
		},
		mistakes: [
			{
				when: '試すコンテナを、既定の網で動かした',
				why: '既定の bridge では、名前 db を引けない',
				next: '試すコンテナにも --network shopnet を付ける',
				match: "bad address 'db'"
			},
			{
				when: '網の名前を打ち違えた',
				why: 'その名前の網は無い',
				next: 'docker network ls で名前を確かめる',
				match: 'not found'
			}
		]
	},
	check: [
		{ ask: '既定の bridge で名前を引く', how: 'できない（bad address）' },
		{ ask: '名前で届く条件', how: '自分で作った同じ網に、両方がつながっている' },
		{ ask: '別の網から', how: '名前も宛先も届かない' }
	]
};
