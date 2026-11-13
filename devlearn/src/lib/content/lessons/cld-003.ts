// cld-003 地域と区画（pick）。
// 場面：パン屋の注文の頁を、ある地域の 1 つの区画に置いていたら、区画の停電で止まった。止まりにくい置き方を選ぶ。
// 地域・区画の名前は作り物（east・east-a など）。特定の事業者の名前は使わない（D-10）。経過時刻 t は停電の始まりを 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const REGION = '地域 east';
const ZA = '区画 east-a';
const ZB = '区画 east-b';

export const cld003: Lesson = {
	id: 'cld-003',
	field: 'cld',
	level: 1,
	title: '地域と区画',
	goal: 'リージョンと可用性ゾーンを使い、止まりにくい置き方を選ぶことができる',
	prereq: ['cld-001'],
	related: [],
	next: ['cld-006'],
	explain: [
		{
			n: 1,
			title: '地域',
			lead: '地域（リージョン）は、事業者が機械を置く、離れた土地の単位だ',
			body: [
				'地域どうしは何百 km も離れ、別々に動く。',
				'店の客は近くに住むので、近い地域 east を選んだ。'
			],
			facts: [
				{ k: '選んだ地域', v: 'east' },
				{ k: '選ぶ目安', v: '使う人に近い' }
			],
			scene: [{ op: 'appear', id: 'region', label: REGION, sub: '近い地域', at: [3, 0] }],
			log: { t: '0m', from: 'パン屋', to: REGION, kind: 'place', info: '近い地域 east を選んだ' }
		},
		{
			n: 2,
			title: '区画',
			lead: '1 つの地域の中に、電源と網の別れた区画（可用性ゾーン）が複数ある',
			body: [
				'east の中には east-a と east-b がある。建物も電源も網の線も別々だ。',
				'区画どうしは近いので、速くつながる。'
			],
			facts: [
				{ k: 'east の区画', v: 'east-a・east-b' },
				{ k: '区画どうし', v: '電源と網が別・近い' }
			],
			scene: [
				{ op: 'appear', id: 'za', label: ZA, sub: '電源 A', at: [1, 1] },
				{ op: 'appear', id: 'zb', label: ZB, sub: '電源 B', at: [5, 1] }
			],
			log: { t: '0m', from: REGION, to: ZA, kind: 'zone', info: '区画は 2 つ' }
		},
		{
			n: 3,
			title: '1 つの区画に置く',
			lead: '注文の頁を、east-a の機械 1 台だけに置いていた',
			body: [
				'east-a の機械 web-1 が、全ての注文を受けていた。',
				'安く済むが、east-a が止まると代わりが無い。'
			],
			facts: [
				{ k: '置いた所', v: 'east-a の web-1' },
				{ k: '代わり', v: '無い' }
			],
			scene: [
				{ op: 'appear', id: 'w1', label: 'web-1', sub: 'east-a', at: [1, 2] },
				{ op: 'move', from: 'za', to: 'w1', payload: '置く', kind: 'place' }
			],
			log: { t: '0m', from: ZA, to: 'web-1', kind: 'place', info: '1 台だけに置いた' }
		},
		{
			n: 4,
			title: '区画が止まる',
			lead: 'east-a の電源が止まり、web-1 も止まった',
			body: [
				'east-a が停電し、注文の頁は 90 分止まった。',
				'east-b は別の電源なので、動き続けていた。'
			],
			facts: [
				{ k: '止まった区画', v: 'east-a' },
				{ k: '頁が止まった時間', v: '90 分' }
			],
			scene: [
				{ op: 'change', id: 'za', k: '電源', v: '停電' },
				{ op: 'change', id: 'w1', k: '状態', v: '止まった' }
			],
			log: { t: '90m', from: ZA, to: 'web-1', kind: 'down', info: '区画の停電で 90 分止まった' }
		},
		{
			n: 5,
			title: '2 つの区画に置く',
			lead: '2 つの区画に 1 台ずつ置き、手前で振り分ける',
			body: [
				'east-b にも web-2 を置き、振り分けの仕組みで両方へ要求を分ける。',
				'振り分けは、動いている機械にだけ要求を送る。'
			],
			facts: [
				{ k: '置いた所', v: 'east-a の web-1・east-b の web-2' },
				{ k: '振り分け', v: '動いている方へだけ' }
			],
			scene: [
				{ op: 'appear', id: 'w2', label: 'web-2', sub: 'east-b', at: [5, 2] },
				{ op: 'move', from: 'zb', to: 'w2', payload: '置く', kind: 'place' }
			],
			log: { t: '1d', from: ZB, to: 'web-2', kind: 'place', info: '2 つ目の区画にも置いた' },
			why: '区画は電源と網が別なので、同時に止まることが少ない'
		},
		{
			n: 6,
			title: '片方で続く',
			lead: '片方の区画が止まっても、もう片方で注文を受け続ける',
			body: [
				'次に east-a が止まった時、振り分けは web-2 だけに要求を送った。',
				'頁は止まらなかった。費用は機械 2 台分になった。'
			],
			facts: [
				{ k: '止まった区画', v: 'east-a' },
				{ k: '頁', v: '止まらない（web-2 が受けた）' },
				{ k: '費用', v: '機械 2 台分' }
			],
			scene: [
				{ op: 'change', id: 'w1', k: '状態', v: '止まった' },
				{ op: 'move', from: 'zb', to: 'w2', payload: '全ての注文', kind: 'route' }
			],
			log: {
				t: '30d',
				from: '振り分け',
				to: 'web-2',
				kind: 'route',
				info: 'web-2 だけで受け続けた'
			}
		}
	],
	example: {
		intro: '置き方ごとに、何が止まると頁が止まるか',
		lines: [
			'置き方                          区画が 1 つ止まる   地域が丸ごと止まる',
			'1 つの区画に 1 台               止まる              止まる',
			'1 つの区画に 2 台               止まる              止まる',
			'2 つの区画に 1 台ずつ（振り分け） 続く                止まる',
			'2 つの地域に分ける              続く                続く（費用と手間が大きい）'
		]
	},
	practice: {
		goal: '区画が 1 つ止まっても注文の頁が止まらない置き方を、無駄の少ない物から 1 つ選ぶ',
		form: 'pick',
		setup: {
			situation: [
				'地域 east に、区画 east-a と east-b がある（電源も網も別）',
				'注文の頁は今、east-a の web-1 だけで受けている',
				'求めること：区画が 1 つ止まっても、頁を止めない',
				'費用は小さい方がよい（地域を 2 つ使うほどの備えは要らない）'
			],
			choices: [
				{
					id: 'same',
					text: 'east-a に web-2 を足し、2 台で振り分ける',
					result: 'east-a が止まると、web-1 も web-2 も止まった'
				},
				{
					id: 'zones',
					text: 'east-b に web-2 を置き、2 つの区画の 2 台で振り分ける',
					result: 'east-a が止まっても、web-2 が受け続けた'
				},
				{
					id: 'bigger',
					text: 'web-1 を、速くて大きな機械に替える',
					result: 'east-a が止まると、大きな web-1 も止まった'
				},
				{
					id: 'regions',
					text: '別の地域にも同じ組を作り、地域ごと切り替える',
					result: '止まらなかったが、費用と手間が 2 倍を超えた'
				}
			]
		},
		success: { choice: 'zones' },
		mistakes: [
			{
				when: '同じ区画に 2 台置いた',
				why: '2 台とも同じ電源と網に頼る。区画が止まれば両方止まる',
				next: '2 台目は別の区画 east-b に置く',
				match: 'pick:same'
			},
			{
				when: '機械を大きくした',
				why: '大きくしても 1 台だけで、置いた区画が止まれば止まる',
				next: '別の区画にもう 1 台置く案を選ぶ',
				match: 'pick:bigger'
			},
			{
				when: '地域を 2 つ使った',
				why: '求めたのは区画 1 つの停止への備えだ。地域を分けるのは費用が大きすぎる',
				next: '同じ地域の 2 つの区画に分ける案を選ぶ',
				match: 'pick:regions'
			}
		]
	},
	check: [
		{ ask: '区画どうしの違い', how: '建物・電源・網の線が別' },
		{ ask: '区画の停止に備える', how: '2 つの区画に置き、振り分ける' },
		{ ask: '地域の停止に備える', how: '別の地域にも置く（費用が大きい）' }
	]
};
