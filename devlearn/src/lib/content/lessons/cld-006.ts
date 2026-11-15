// cld-006 負荷を分けて増やす（calc）。
// 場面：パン屋の注文の頁が、年末の予約の受付で混む。1 台の上限と要求の数から、要る台数と増やす条件を決める。
// 数は全て作り物。経過時刻 t は受付の始まりを 0m とした。
import type { Host, HostRow, Lesson, World } from '../../lesson/types.ts';

const LB = '振り分け';

// 中身の板：振り分けと web の機械の中。web はどれも同じ作りなので、web-1 を代表に見せる
const lbHost = (targets: string, tone?: HostRow['tone']): Host => ({
	name: LB,
	town: '受付の振り分け係',
	addr: '10.0.1.10',
	rows: [
		{ id: 'lb-listen', depth: 0, what: '待ち受け :443', state: 'shop.example.com' },
		{ id: 'lb-targets', depth: 1, what: '分け先', state: targets, ...(tone ? { tone } : {}) }
	]
});
const web1 = (load: string, tone?: HostRow['tone']): Host => ({
	name: 'web-1',
	town: '1 号の窓口',
	addr: '10.0.1.21',
	rows: [
		{ id: 'w1-nginx', depth: 0, what: 'nginx: master', state: 'pid 811 ・ LISTEN 0.0.0.0:80' },
		{ id: 'w1-worker', depth: 1, what: 'nginx: worker', state: 'pid 812' },
		{ id: 'w1-load', depth: 1, what: '受けている要求', state: load, ...(tone ? { tone } : {}) }
	]
});
const ACCESS = (t: string, code: number, size: number) =>
	`198.51.100.23 - - [10/Nov/2026:09:${t} +0900] "POST /reserve HTTP/1.1" ${code} ${size} "-" "Mozilla/5.0"`;
// 区画 a・b・c に、web を順に置く（cld-003 の「区画」。1 つの区画が止まっても残りで受ける）
const rooms = (n: number, starting = 0, note = ''): World => ({
	kind: 'slots',
	near: 'w9',
	groups: ['a', 'b', 'c'].map((z, i) => ({
		name: `区画 ${z}`,
		items: Array.from({ length: n + starting }, (_, k) => k)
			.filter((k) => k % 3 === i)
			.map((k) => ({ text: `web-${k + 1}`, state: k < n ? ('ok' as const) : ('wait' as const) }))
	})),
	note: note || `動いている ${n} / 決めた数 ${n + starting}`
});

export const cld006: Lesson = {
	id: 'cld-006',
	field: 'cld',
	level: 2,
	title: '負荷を分けて増やす',
	goal: '要求の数から、要る台数と自動で増やす条件を求めることができる',
	prereq: ['cld-003'],
	related: ['net-013'],
	next: ['cld-010'],
	explain: [
		{
			n: 1,
			title: '1 台の上限',
			lead: '1 台が受けられる要求の数には、上限がある',
			town: '1 つの窓口がさばける客の数には、限りがある。',
			work: '負荷を掛ける道具で、返事が遅くなり始める数を測る',
			inside: { hosts: [web1('0 件/秒（試す前）')] },
			body: [
				'試すと、web 1 台は 1 秒に 200 件を超えると、返事が急に遅くなった。',
				'上限まで使い切らず、70% の 140 件までに抑えて使う。'
			],
			facts: [
				{ k: '1 台の上限', v: '200 件/秒' },
				{ k: '使う目安', v: '140 件/秒（70%）', calc: '200 * 0.7' }
			],
			scene: [
				{ op: 'appear', id: 'w1', label: 'web-1', sub: '上限 200 件/秒', at: [4, 1] },
				{ op: 'change', id: 'w1', k: '目安', v: '140 件/秒' }
			],
			log: { t: '0m', from: '試し', to: 'web-1', kind: 'measure', info: '1 台の上限は 200 件/秒' },
			why: '余りを残しておくと、急な混み合いや 1 台の故障の間も、返事が遅れずに済む'
		},
		{
			n: 2,
			title: '要求が増える',
			lead: '受付の始まりに、要求は 1 秒に 1,100 件まで増えた',
			town: '予約の受付が始まり、客が 1 つの窓口に押し寄せる。',
			work: 'アクセスの記録を秒ごとに数え、一番混む時を知る',
			inside: {
				packet: {
					name: 'POST /reserve',
					size: '512 B',
					parts: [
						{
							name: 'HTTP',
							fields: [
								{ k: '要求の行', v: 'POST /reserve HTTP/1.1', level: 1 },
								{ k: 'Host', v: 'shop.example.com', level: 2 },
								{ k: '本文', v: '予約 1 件（日付・数）', level: 3 }
							]
						}
					]
				},
				hosts: [web1('1,100 件/秒（目安の 7.9 倍）', 'bad')],
				logs: [
					{ t: '1m', src: 'nginx access.log', text: ACCESS('01:00', 200, 512) },
					{ t: '1m', src: 'nginx access.log', text: ACCESS('01:00', 504, 167) }
				]
			},
			world: rooms(1, 0, '1 台に 1,100 件/秒が来ている'),
			body: [
				'普段は 1 秒に 300 件だが、受付の始まりの 10 分は 1,100 件になる。',
				'1 台では 140 件までなので、とても足りない。'
			],
			facts: [
				{ k: '普段', v: '300 件/秒' },
				{ k: '一番混む時', v: '1,100 件/秒' }
			],
			scene: [
				{ op: 'appear', id: 'users', label: '客', sub: '1,100 件/秒', at: [0, 1] },
				{ op: 'move', from: 'users', to: 'w1', payload: '1,100 件/秒', kind: 'request' },
				{ op: 'change', id: 'w1', k: '状態', v: '遅い' }
			],
			log: { t: '1m', from: '客', to: 'web-1', kind: 'request', info: '1 台に 1,100 件/秒が来た' }
		},
		{
			n: 3,
			title: '振り分ける',
			lead: '振り分けの仕組みが、要求を何台かに順に分ける',
			town: '入口に振り分け係を立て、空いている窓口へ客を案内する。',
			work: '振り分けの分け先の一覧で、動いている web を確かめる',
			inside: {
				hosts: [lbHost('web-1（1 台）'), web1('1,100 件/秒', 'bad')],
				logs: [{ t: '2m', src: 'nginx access.log', text: ACCESS('02:00', 200, 512) }]
			},
			body: [
				'客は振り分けの 1 つの住所に送り、振り分けが動いている web に分ける。',
				'台数を足しても、客から見える住所は変わらない。'
			],
			facts: [
				{ k: '客が送る先', v: '振り分けの住所' },
				{ k: '分け先', v: '動いている web' }
			],
			scene: [
				{ op: 'appear', id: 'lb', label: LB, sub: '1 つの住所', at: [2, 1] },
				{ op: 'move', from: 'users', to: 'lb', payload: '全ての要求', kind: 'request' },
				{ op: 'move', from: 'lb', to: 'w1', payload: '分けた分', kind: 'route' }
			],
			log: { t: '2m', from: '客', to: LB, kind: 'request', info: '振り分けが受けて分ける' }
		},
		{
			n: 4,
			title: '台数を求める',
			lead: '要る台数は、要求の数を 1 台の目安で割り、切り上げる',
			town: '窓口を 9 つに増やす。1 つ休んでも 8 つで足りる。',
			work: '台数は「要求 ÷ 目安」を切り上げ、1 台の故障の分を足す',
			ask: {
				q: '1,100 件/秒を、1 台 140 件/秒までで受けるには、何台要る？',
				opts: ['7', '8', '9'],
				a: 1,
				why: '1,100 ÷ 140 = 7.86… を切り上げて 8 台。故障に備えると 9 台'
			},
			inside: {
				hosts: [lbHost('web-1〜9（9 台）', 'ok'), web1('約 122 件/秒', 'ok')],
				logs: [{ t: '3m', src: 'nginx access.log', text: ACCESS('03:00', 200, 512) }]
			},
			world: rooms(9),
			body: [
				'1,100 ÷ 140 = 7.86… なので、切り上げて 8 台が要る。',
				'1 台が落ちても足りるように、1 台足して 9 台を置く。'
			],
			facts: [
				{ k: '1,100 ÷ 140', v: '7.86…', calc: '1100 / 140' },
				{ k: '要る台数', v: '8（切り上げ）' },
				{ k: '1 台の故障に備える', v: '9' }
			],
			scene: [
				{ op: 'appear', id: 'w9', label: 'web-1〜9', sub: '9 台', at: [4, 2] },
				{ op: 'move', from: 'lb', to: 'w9', payload: '1 台に約 122 件', kind: 'route' }
			],
			log: { t: '3m', from: LB, to: 'web-1〜9', kind: 'route', info: '9 台に分けた' }
		},
		{
			n: 5,
			title: '増やす条件',
			lead: '1 台あたりの要求が目安を超えたら、自動で台数を足す',
			town: '混んだら自動で窓口を 1 つ開ける。開くまで数分かかる。',
			work: '増やす条件と、増やし始めてから受けられるまでの時間を記録する',
			inside: {
				hosts: [lbHost('web-1〜9（9 台）・web-10 は準備中', 'warn'), web1('約 140 件/秒', 'warn')]
			},
			world: rooms(9, 1),
			body: [
				'1 台あたり 140 件/秒を 3 分続けて超えたら、1 台足す、と決めた。',
				'足すのに数分かかるので、上限の 200 件ではなく、目安の 140 件で足し始める。'
			],
			facts: [
				{ k: '増やす条件', v: '1 台あたり 140 件/秒を 3 分超える' },
				{ k: '1 回に足す数', v: '1 台' }
			],
			scene: [
				{
					op: 'appear',
					id: 'auto',
					label: '自動で増やす仕組み',
					sub: '140 件/秒 × 3 分',
					at: [6, 0]
				},
				{ op: 'move', from: 'auto', to: 'w9', payload: '+1 台', kind: 'scale' }
			],
			log: {
				t: '5m',
				from: '自動で増やす仕組み',
				to: 'web-1〜9',
				kind: 'scale',
				info: '目安を超えたら 1 台足す'
			}
		},
		{
			n: 6,
			title: '減らす条件',
			lead: '要求が減ったら台数も減らし、払う分を減らす',
			town: '客が減ったら窓口を閉め、払う人件費を減らす。',
			work: '減らす条件は増やす条件より長く待ち、増減を繰り返さない',
			inside: { hosts: [lbHost('web-1〜3（3 台）', 'ok'), web1('約 100 件/秒', 'ok')] },
			world: rooms(3),
			body: [
				'普段の 300 件/秒なら、300 ÷ 140 = 2.14… で 3 台あれば足りる。',
				'1 台あたり 70 件/秒を 15 分下回ったら 1 台減らす。下限は 3 台にした。'
			],
			facts: [
				{ k: '普段に要る台数', v: '3' },
				{ k: '減らす条件', v: '1 台あたり 70 件/秒を 15 分下回る' }
			],
			scene: [
				{ op: 'change', id: 'w9', k: '台数', v: '9 → 3' },
				{ op: 'move', from: 'auto', to: 'w9', payload: '-1 台ずつ', kind: 'scale' }
			],
			log: {
				t: '60m',
				from: '自動で増やす仕組み',
				to: 'web-1〜9',
				kind: 'scale',
				info: '普段の 3 台に戻した'
			}
		}
	],
	example: {
		intro: '要求の数ごとの、要る台数（1 台の目安 140 件/秒、切り上げ）',
		lines: [
			'要求（件/秒）   ÷ 140      要る台数',
			'  300           2.14…      3',
			'  700           5          5',
			'1,100           7.86…      8（故障に備えて 9）'
		]
	},
	practice: {
		goal: '1 台の上限と要求の数から、目安・要る台数・故障に備えた台数・普段の台数を求める',
		form: 'calc',
		setup: {
			data: [
				{ k: '1 台の上限', v: '200 件/秒' },
				{ k: '使う目安', v: '上限の 70%' },
				{ k: '一番混む時の要求', v: '1,100 件/秒' },
				{ k: '普段の要求', v: '300 件/秒' }
			],
			steps: [
				{ label: '1 台に許す要求（上限の 70%）', unit: ' 件/秒' },
				{ label: '一番混む時に要る台数（切り上げ）', unit: ' 台' },
				{ label: '1 台が落ちても足りる台数', unit: ' 台' },
				{ label: '普段に要る台数（切り上げ）', unit: ' 台' }
			]
		},
		success: { values: ['140', '8', '9', '3'] },
		mistakes: [
			{
				when: '目安を上限の 200 のままにした',
				why: '上限まで使うと、急な混み合いで返事が遅れる。70% に抑えて使う',
				next: '200 × 0.7 = 140 を目安にする',
				match: '1=200'
			},
			{
				when: '台数を切り捨てた',
				why: '7 台では 7 × 140 = 980 件で、1,100 件に足りない',
				next: '1,100 ÷ 140 = 7.86… を切り上げて 8 台にする',
				match: '2=7'
			},
			{
				when: '故障に備えた台数を、要る台数と同じにした',
				why: '8 台ちょうどだと、1 台落ちた時に 7 台で受けることになる',
				next: '要る台数に 1 台足す',
				match: '3=8'
			}
		]
	},
	check: [
		{ ask: '要る台数の求め方', how: '要求の数 ÷ 1 台の目安 を切り上げる' },
		{ ask: '目安を上限より下にする理由', how: '急な混み合いと、台数を足す間に備える' },
		{ ask: '増やす条件', how: '1 台あたりの要求が目安を一定の時間超えたら' }
	],
	map: {
		nodes: {
			users: { icon: 'person', town: '予約の客' },
			lb: { icon: 'router', town: '受付の振り分け係', addr: '10.0.1.10' },
			w1: { icon: 'server', town: '1 号の窓口', addr: '10.0.1.21' },
			w9: { icon: 'node', town: '窓口の並び' },
			auto: { icon: 'gear', town: '人手を足す係' }
		},
		zones: [
			{ label: 'パン屋のクラウドの区画', note: '10.0.1.0/24', members: ['lb', 'w1', 'w9', 'auto'] }
		],
		links: [
			{ a: 'users', b: 'w1', label: '直に頼む', dir: 'ab' },
			{ a: 'users', b: 'lb', label: '1 つの住所に頼む', dir: 'ab' },
			{ a: 'lb', b: 'w1', label: '分ける', dir: 'ab' },
			{ a: 'lb', b: 'w9', label: '順に分ける', dir: 'ab' },
			{ a: 'auto', b: 'w9', label: '台数を変える', dir: 'ab' }
		]
	}
};
