// cld-004 仮想の網を組む（fix・route）。
// 場面：パン屋の注文の頁 web と、注文を蓄える db を、借りた仮想の網に置く。db を外から触れない所へ移す。
// 行の書き方は作り物（place 機械 サブネット / route サブネット 門）。特定の事業者の書式は写さない（D-10）。経過時刻 t は組み始めを 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const NET = '仮想の網 10.0.0.0/16';
const PUB = '公開のサブネット';
const PRI = '非公開のサブネット';

export const cld004: Lesson = {
	id: 'cld-004',
	field: 'cld',
	level: 2,
	title: '仮想の網を組む',
	goal: '仮想の網を、公開と非公開のサブネットに分けることができる',
	prereq: ['net-012'],
	related: ['sec-009'],
	next: ['cld-008'],
	explain: [
		{
			n: 1,
			title: '網の範囲',
			lead: '借りた仮想の網に、使うアドレスの範囲を決める',
			body: [
				'仮想の網は、事業者の建物の中に作る、自分だけの網だ。',
				'範囲を 10.0.0.0/16 にすると、10.0.x.x の約 6 万 5 千個が使える（net-012）。'
			],
			facts: [
				{ k: '網の範囲', v: '10.0.0.0/16' },
				{ k: '使えるアドレス', v: '10.0.0.0〜10.0.255.255' }
			],
			scene: [{ op: 'appear', id: 'net', label: NET, sub: '自分だけの網', at: [3, 0] }],
			log: { t: '0m', from: 'パン屋', to: NET, kind: 'create', info: '10.0.0.0/16 で網を作った' }
		},
		{
			n: 2,
			title: '公開のサブネット',
			lead: '外から届く機械は、公開のサブネットに置く',
			body: [
				'10.0.1.0/24 を公開のサブネットにし、注文の頁 web を置いた。',
				'公開のサブネットの経路の表には、外への門（igw）への行がある。'
			],
			facts: [
				{ k: '範囲', v: '10.0.1.0/24' },
				{ k: '置いた物', v: 'web' },
				{ k: '経路', v: 'route public igw' }
			],
			scene: [
				{ op: 'appear', id: 'pub', label: PUB, sub: '10.0.1.0/24', at: [1, 1] },
				{ op: 'appear', id: 'web', label: 'web', sub: '注文の頁', at: [1, 2] },
				{ op: 'appear', id: 'igw', label: '外への門 igw', sub: '外と行き来', at: [0, 0] },
				{ op: 'move', from: 'igw', to: 'web', payload: '外から', kind: 'reach' }
			],
			log: { t: '5m', from: '外への門 igw', to: 'web', kind: 'reach', info: '外から web に届く' }
		},
		{
			n: 3,
			title: '非公開のサブネット',
			lead: '外から触れさせない機械は、非公開のサブネットに置く',
			body: [
				'10.0.2.0/24 を非公開のサブネットにし、注文を蓄える db を置いた。',
				'経路の表に igw への行が無いので、外から db へは届かない。'
			],
			facts: [
				{ k: '範囲', v: '10.0.2.0/24' },
				{ k: '置いた物', v: 'db' },
				{ k: '外から db へ', v: '届かない' }
			],
			scene: [
				{ op: 'appear', id: 'pri', label: PRI, sub: '10.0.2.0/24', at: [5, 1] },
				{ op: 'appear', id: 'db', label: 'db', sub: '注文を蓄える', at: [5, 2] },
				{ op: 'move', from: 'web', to: 'db', payload: '網の中', kind: 'reach' }
			],
			log: { t: '8m', from: 'web', to: 'db', kind: 'reach', info: '網の中の web からは届く' },
			why: '外から届く口が無ければ、合言葉が漏れても外からは db に触れない'
		},
		{
			n: 4,
			title: '外への出口',
			lead: '非公開の機械が外へ取りに行くには、出口（nat）を通す',
			body: [
				'db は更新を外から取りたいが、外から入られたくはない。',
				'route private nat にすると、中から外へだけ出られ、外からは入れない。'
			],
			facts: [
				{ k: '経路', v: 'route private nat' },
				{ k: 'db から外へ', v: '届く' },
				{ k: '外から db へ', v: '届かない（nat は入れない）' }
			],
			scene: [
				{ op: 'appear', id: 'nat', label: '出口 nat', sub: '中から外へだけ', at: [6, 0] },
				{ op: 'move', from: 'db', to: 'nat', payload: '更新を取る', kind: 'out' }
			],
			log: { t: '10m', from: 'db', to: '出口 nat', kind: 'out', info: '中から外へだけ出られる' }
		},
		{
			n: 5,
			title: '経路の表',
			lead: 'サブネットごとの経路の表が、外への行き先を決める',
			body: [
				'公開は igw、非公開は nat へ向ける。どちらも網の中どうしは届く。',
				'非公開に igw を向けると、外から届くようになり、公開と同じになる。'
			],
			facts: [
				{ k: 'route public', v: 'igw（外と行き来）' },
				{ k: 'route private', v: 'nat（外へ出るだけ）' }
			],
			scene: [
				{ op: 'change', id: 'pub', k: '経路', v: 'igw' },
				{ op: 'change', id: 'pri', k: '経路', v: 'nat' }
			],
			log: { t: '12m', from: '経路の表', to: NET, kind: 'route', info: '公開は igw、非公開は nat' }
		},
		{
			n: 6,
			title: 'データベースは非公開に',
			lead: '蓄える物は非公開、受け付ける物だけを公開に置く',
			body: [
				'外から届くのは web だけにし、db は web からだけ届くようにした。',
				'外に開く口が 1 か所になり、守る所が絞れた。'
			],
			facts: [
				{ k: '公開に置く物', v: 'web（受け付け）' },
				{ k: '非公開に置く物', v: 'db（蓄える）' }
			],
			scene: [
				{ op: 'move', from: 'igw', to: 'db', payload: '外から', kind: 'blocked' },
				{ op: 'highlight', id: 'db' }
			],
			log: {
				t: '15m',
				from: '外への門 igw',
				to: 'db',
				kind: 'blocked',
				info: '外から db へは届かない'
			}
		}
	],
	example: {
		intro: '組み終えた網の行と、通り道ごとの結果',
		lines: [
			'place web public',
			'place db private',
			'route public igw',
			'route private nat',
			'',
			'外 → web           届く',
			'外 → db            届かない',
			'db → 外（更新）    届く',
			'web → db           届く'
		]
	},
	practice: {
		goal: '網の行を直し、外から届くのは web だけにする。db は外へ更新を取りに行けるようにする',
		form: 'fix',
		setup: {
			engine: 'route',
			lines: [
				{ id: 'l1', text: 'place web public' },
				{ id: 'l2', text: 'place db public' },
				{ id: 'l3', text: 'route public igw' },
				{ id: 'l4', text: 'route private igw' }
			],
			options: [
				{ line: 'l1', id: 'webpri', text: 'place web private' },
				{ line: 'l2', id: 'dbpri', text: 'place db private' },
				{ line: 'l3', id: 'pubnat', text: 'route public nat' },
				{ line: 'l4', id: 'nat', text: 'route private nat' },
				{ line: 'l4', id: 'none', text: 'route private none' }
			],
			cases: [
				{ id: 'in-web', name: '外 → web（客が頁を開く）', input: { from: 'internet', to: 'web' } },
				{ id: 'in-db', name: '外 → db（知らない人が触る）', input: { from: 'internet', to: 'db' } },
				{ id: 'db-out', name: 'db → 外（更新を取る）', input: { from: 'db', to: 'internet' } },
				{ id: 'web-db', name: 'web → db（注文を蓄える）', input: { from: 'web', to: 'db' } }
			]
		},
		success: {
			expect: { 'in-web': 'reach', 'in-db': 'blocked', 'db-out': 'reach', 'web-db': 'reach' }
		},
		mistakes: [
			{
				when: 'db を公開のサブネットに残した',
				why: '公開のサブネットは外への門 igw を向く。外から db に届いてしまう',
				next: '2 行目を place db private にする',
				match: 'case:in-db:reach'
			},
			{
				when: '非公開の経路を none にした',
				why: '外への出口が無く、db は更新を取りに行けない',
				next: '4 行目を route private nat にする',
				match: 'l4:none'
			},
			{
				when: 'web も非公開に移した',
				why: '客が頁を開けなくなった。受け付ける物は公開に置く',
				next: '1 行目は place web public のままにする',
				match: 'l1:webpri'
			}
		]
	},
	check: [
		{ ask: '公開のサブネット', how: '経路が外への門 igw を向き、外から届く' },
		{ ask: '非公開から外へ出る', how: '出口 nat を通す（外からは入れない）' },
		{ ask: 'db を置く所', how: '非公開のサブネット' }
	]
};
