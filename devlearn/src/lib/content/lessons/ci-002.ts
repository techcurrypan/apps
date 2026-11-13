// ci-002 段と順番（order）。
// 場面：パン屋の頁の検査が 1 回 14 分かかり、誤りが分かるのが遅い。段の順を替えて、落ちる時は早く分かるようにする。
// 時間は作り物。経過時刻 t は検査の始まりを 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const RUNNER = '検査の機械';

export const ci002: Lesson = {
	id: 'ci-002',
	field: 'ci',
	level: 1,
	title: '段と順番',
	goal: '検査の段を、失敗が早く分かる順に並べることができる',
	prereq: ['ci-001', 'prg-009'],
	related: ['lnx-009'],
	next: ['ci-003'],
	explain: [
		{
			n: 1,
			title: '段の一覧',
			lead: '検査は、かかる時間の違う段の並びでできている',
			body: [
				'書式 10 秒・型 30 秒・テスト 2 分・組み立て 3 分・通し試験 8 分の 5 段がある。',
				'全部で約 14 分かかる。'
			],
			facts: [
				{ k: '速い段', v: '書式 10 秒・型 30 秒' },
				{ k: '遅い段', v: '組み立て 3 分・通し試験 8 分' },
				{ k: '全部', v: '約 14 分' }
			],
			scene: [
				{ op: 'appear', id: 'runner', label: RUNNER, sub: '5 段', at: [0, 1] },
				{ op: 'change', id: 'runner', k: '全部', v: '約 14 分' }
			],
			log: { t: '0s', from: RUNNER, to: RUNNER, kind: 'list', info: '5 段で約 14 分' }
		},
		{
			n: 2,
			title: '速い段を先に',
			lead: '落ちやすく速い段を先に置くと、誤りが早く分かる',
			body: [
				'通し試験を先頭にすると、書式の誤り 1 つを知るのに 8 分待つ。',
				'書式を先頭にすれば、10 秒で分かる。'
			],
			facts: [
				{ k: '通し試験が先', v: '書式の誤りが分かるまで 8 分 10 秒' },
				{ k: '書式が先', v: '10 秒' }
			],
			scene: [
				{ op: 'appear', id: 'fmt', label: '書式', sub: '10 秒', at: [2, 0] },
				{ op: 'move', from: 'runner', to: 'fmt', payload: '1 段目', kind: 'run' }
			],
			log: { t: '10s', from: RUNNER, to: '書式', kind: 'run', info: '10 秒で書式の誤りが分かる' },
			why: '直す人は結果を待つ間ほかの事ができない。早く落ちるほど、待つ時間が減る'
		},
		{
			n: 3,
			title: '型の検査',
			lead: '型の検査は、動かさずに書き物の食い違いを見つける',
			body: [
				'値段に文字を渡しているなどの食い違いを、30 秒で見つける。',
				'テストを走らせる前に見つかれば、テストの 2 分を待たずに済む。'
			],
			facts: [
				{ k: 'かかる時間', v: '30 秒' },
				{ k: '見つける物', v: '型の食い違い' }
			],
			scene: [
				{ op: 'appear', id: 'type', label: '型', sub: '30 秒', at: [4, 0] },
				{ op: 'move', from: 'fmt', to: 'type', payload: '2 段目', kind: 'run' }
			],
			log: { t: '40s', from: '書式', to: '型', kind: 'run', info: '型の検査は 30 秒' }
		},
		{
			n: 4,
			title: 'テスト',
			lead: 'テストは、動かして期待どおりの値になるかを確かめる',
			body: [
				'税込みの値段の計算など、小さな部品ごとに 2 分で確かめる。',
				'組み立ての前に置くと、壊れた物を組み立てる 3 分を省ける。'
			],
			facts: [
				{ k: 'かかる時間', v: '2 分' },
				{ k: '確かめる物', v: '部品ごとの値' }
			],
			scene: [
				{ op: 'appear', id: 'test', label: 'テスト', sub: '2 分', at: [6, 0] },
				{ op: 'move', from: 'type', to: 'test', payload: '3 段目', kind: 'run' }
			],
			log: { t: '160s', from: '型', to: 'テスト', kind: 'run', info: 'テストは 2 分' }
		},
		{
			n: 5,
			title: '組み立て',
			lead: '組み立ては、配る形のファイルを作る',
			body: [
				'部品が正しいと分かってから、3 分かけて配る形に組み立てる。',
				'通し試験は、組み立てた物を使うので、その後に置く。'
			],
			facts: [
				{ k: 'かかる時間', v: '3 分' },
				{ k: '後に置く段', v: '通し試験（組み立てた物を使う）' }
			],
			scene: [
				{ op: 'appear', id: 'build', label: '組み立て', sub: '3 分', at: [6, 2] },
				{ op: 'move', from: 'test', to: 'build', payload: '4 段目', kind: 'run' }
			],
			log: { t: '340s', from: 'テスト', to: '組み立て', kind: 'run', info: '組み立ては 3 分' }
		},
		{
			n: 6,
			title: '落ちたら後は走らない',
			lead: '前の段が落ちたら、後の段は走らせない',
			body: [
				'型の段が落ちると、テスト・組み立て・通し試験は走らない。',
				'40 秒で結果が返り、機械の時間も 13 分ほど浮く。'
			],
			facts: [
				{ k: '型で落ちた時', v: '40 秒で結果' },
				{ k: '走らない段', v: 'テスト・組み立て・通し試験' }
			],
			scene: [
				{ op: 'change', id: 'type', k: '結果', v: '✗' },
				{ op: 'vanish', id: 'test' },
				{ op: 'vanish', id: 'build' }
			],
			log: { t: '40s', from: '型', to: RUNNER, kind: 'fail', info: '型で落ち、後は走らない' }
		}
	],
	example: {
		intro: '並べ方ごとの、型の誤りが分かるまでの時間',
		lines: [
			'並べ方                                      型の誤りが分かるまで',
			'通し試験 → 組み立て → テスト → 型 → 書式    13 分 30 秒',
			'書式 → 型 → テスト → 組み立て → 通し試験     40 秒'
		]
	},
	practice: {
		goal: '5 つの段を、誤りが早く分かり、組み立てた物を使う段が後になる順に並べる',
		form: 'order',
		setup: {
			cards: [
				{ id: 'e2e', text: '通し試験（組み立てた物を動かす。8 分）' },
				{ id: 'test', text: 'テスト（部品ごとに動かす。2 分）' },
				{ id: 'fmt', text: '書式の検査（10 秒）' },
				{ id: 'build', text: '組み立て（配る形を作る。3 分）' },
				{ id: 'type', text: '型の検査（動かさずに見る。30 秒）' }
			]
		},
		success: { orders: [['fmt', 'type', 'test', 'build', 'e2e']] },
		mistakes: [
			{
				when: '通し試験を組み立てより前に置いた',
				why: '通し試験は、組み立てた物を動かす。組み立てる前には動かす物が無い',
				next: '組み立ての後に通し試験を置く',
				match: 'e2e<build'
			},
			{
				when: 'テストを型の検査より前に置いた',
				why: '型の誤りは 30 秒で分かるのに、2 分待ってから知ることになる',
				next: '型の検査をテストの前に置く',
				match: 'test<type'
			},
			{
				when: '組み立てをテストより前に置いた',
				why: '部品が壊れていても、3 分かけて組み立ててしまう',
				next: 'テストの後に組み立てを置く',
				match: 'build<test'
			}
		]
	},
	check: [
		{ ask: '先頭に置く段', how: '速くて落ちやすい段（書式・型）' },
		{ ask: '通し試験の置き場', how: '組み立ての後（組み立てた物を使う）' },
		{ ask: '前の段が落ちたら', how: '後の段は走らせない' }
	]
};
