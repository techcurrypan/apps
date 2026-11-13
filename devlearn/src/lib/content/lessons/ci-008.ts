// ci-008 並べて走らせる（calc）。
// 場面：パン屋の頁の検査が順に走って 10 分かかる。互いに依らない段を並べ、版と OS の組み合わせ（マトリクス）でも試す。時間は作り物。
// 経過時刻 t は検査の始まりを 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const LINT = 'lint 1 分';
const TEST = 'test 6 分';
const BUILD = 'build 3 分';

export const ci008: Lesson = {
	id: 'ci-008',
	field: 'ci',
	level: 3,
	title: '並べて走らせる',
	goal: '並列とマトリクスで、パイプラインの時間を求めることができる',
	prereq: ['ci-005'],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '順に走る時間',
			lead: '段を順に走らせると、時間は全ての段の和になる',
			body: [
				'lint 1 分・test 6 分・build 3 分を順に走らせると、1 + 6 + 3 = 10 分だ。',
				'3 つの段は、互いの結果を使っていない。'
			],
			facts: [
				{ k: '順に走る', v: '1 + 6 + 3 = 10 分' },
				{ k: '段どうし', v: '互いに依らない' }
			],
			scene: [
				{ op: 'appear', id: 'lint', label: LINT, sub: '1 番目', at: [0, 1] },
				{ op: 'appear', id: 'test', label: TEST, sub: '2 番目', at: [2, 1] },
				{ op: 'appear', id: 'build', label: BUILD, sub: '3 番目', at: [4, 1] }
			],
			log: { t: '10m', from: LINT, to: BUILD, kind: 'serial', info: '順に走って 10 分' }
		},
		{
			n: 2,
			title: '並べて走る',
			lead: '依らない段は、別々の機械で同時に走らせる',
			body: [
				'3 つの段に after を付けず、3 台の機械で同時に始める。',
				'全部が終わるのは、一番遅い段が終わった時だ。'
			],
			facts: [
				{ k: '機械', v: '3 台' },
				{ k: '始まり', v: '3 つとも 0 分' }
			],
			scene: [
				{ op: 'change', id: 'lint', k: '始まり', v: '0 分' },
				{ op: 'change', id: 'test', k: '始まり', v: '0 分' },
				{ op: 'change', id: 'build', k: '始まり', v: '0 分' }
			],
			log: { t: '0m', from: '始まり', to: '3 台', kind: 'parallel', info: '3 つを同時に始めた' }
		},
		{
			n: 3,
			title: '一番長い段',
			lead: '並べた時の時間は、一番長い段の時間になる',
			body: [
				'lint は 1 分、build は 3 分で終わり、test の 6 分を待つ。',
				'全体は 6 分で、10 分から 4 分縮んだ。'
			],
			facts: [
				{ k: '並べた時間', v: '6 分（一番長い test）' },
				{ k: '縮んだ時間', v: '4 分' }
			],
			scene: [
				{ op: 'highlight', id: 'test' },
				{ op: 'change', id: 'test', k: '役', v: '一番長い' }
			],
			log: { t: '6m', from: TEST, to: '終わり', kind: 'done', info: '6 分で全て終わった' },
			why: '並べても一番長い段は縮まない。さらに速くするには、一番長い段を分けるか速くする'
		},
		{
			n: 4,
			title: '組み合わせの数',
			lead: 'マトリクスは、版と OS などの組み合わせごとに、同じ段を走らせる',
			body: [
				'言語の版 3 つ × OS 2 つで試すと、test は 3 × 2 = 6 本になる。',
				'どの組み合わせで落ちたかが分かる。'
			],
			facts: [
				{ k: '版', v: '3 つ' },
				{ k: 'OS', v: '2 つ' },
				{ k: 'test の本数', v: '6' }
			],
			scene: [
				{ op: 'appear', id: 'matrix', label: 'test × 6', sub: '版 3 × OS 2', at: [2, 2] },
				{ op: 'move', from: 'test', to: 'matrix', payload: '組み合わせ', kind: 'matrix' }
			],
			log: {
				t: '0m',
				from: TEST,
				to: 'test × 6',
				kind: 'matrix',
				info: '6 つの組み合わせで走らせる'
			}
		},
		{
			n: 5,
			title: '台数の上限',
			lead: '同時に借りられる機械の数には、上限がある',
			body: [
				'同時に走れるのは 4 台までなので、6 本のうち 2 本は待つ。',
				'1 回目に 4 本、2 回目に 2 本で、2 回分の時間がかかる。'
			],
			facts: [
				{ k: '同時に走れる', v: '4 台' },
				{ k: '6 本の走り方', v: '4 本 → 2 本（2 回）' }
			],
			scene: [
				{ op: 'appear', id: 'cap', label: '上限 4 台', sub: '残りは待つ', at: [5, 2] },
				{ op: 'move', from: 'matrix', to: 'cap', payload: '6 本', kind: 'queue' }
			],
			log: {
				t: '6m',
				from: 'test × 6',
				to: '上限 4 台',
				kind: 'queue',
				info: '2 本は 1 回目を待つ'
			}
		},
		{
			n: 6,
			title: '時間を求める',
			lead: '本数を上限で割って切り上げ、1 本の時間を掛ける',
			body: [
				'6 ÷ 4 = 1.5 を切り上げて 2 回、2 × 6 分 = 12 分だ。',
				'上限を 6 台にできれば、1 回の 6 分で済む。'
			],
			facts: [
				{ k: '回数', v: '6 ÷ 4 = 1.5 → 2 回' },
				{ k: 'test の時間', v: '2 × 6 = 12 分' }
			],
			scene: [{ op: 'change', id: 'matrix', k: '時間', v: '12 分' }],
			log: { t: '12m', from: 'test × 6', to: '終わり', kind: 'done', info: '2 回分で 12 分' }
		}
	],
	example: {
		intro: '走らせ方ごとの時間（lint 1 分・test 6 分・build 3 分）',
		lines: [
			'走らせ方                               時間',
			'順に（lint → test → build）             10 分',
			'3 つを並べて                             6 分',
			'test を 6 本のマトリクス・上限 4 台      12 分（4 本 → 2 本）',
			'test を 6 本のマトリクス・上限 6 台       6 分'
		]
	},
	practice: {
		goal: '順に走る時間、並べた時間、組み合わせの数、上限のある時の時間を求める',
		form: 'calc',
		setup: {
			data: [
				{ k: '段', v: 'lint 2 分・test 8 分・build 5 分（互いに依らない）' },
				{ k: 'マトリクス', v: '言語の版 4 つ × OS 3 つで test を走らせる' },
				{ k: '同時に走れる機械', v: '5 台まで' }
			],
			steps: [
				{ label: '3 つを順に走らせた時間', unit: ' 分' },
				{ label: '3 つを並べて走らせた時間', unit: ' 分' },
				{ label: 'test の組み合わせの数', unit: ' 本' },
				{ label: '上限 5 台で全ての test を走らせる時間', unit: ' 分' }
			]
		},
		success: { values: ['15', '8', '12', '24'] },
		mistakes: [
			{
				when: '並べた時間を、時間の和にした',
				why: '並べると同時に走る。終わるのは一番長い test の時だ',
				next: '3 つの中で一番長い 8 分にする',
				match: '2=15'
			},
			{
				when: '組み合わせを足し算した',
				why: '版 4 つのそれぞれに OS 3 つがあるので、掛け算になる',
				next: '4 × 3 = 12 本にする',
				match: '3=7'
			},
			{
				when: '回数を切り捨てた',
				why: '12 ÷ 5 = 2.4 回なので、2 回では 2 本が残る',
				next: '切り上げて 3 回、3 × 8 = 24 分にする',
				match: '4=16'
			}
		]
	},
	check: [
		{ ask: '並べた時間', how: '一番長い段の時間' },
		{ ask: 'マトリクスの本数', how: '組み合わせの掛け算' },
		{ ask: '上限のある時', how: '本数 ÷ 上限 を切り上げた回数 × 1 本の時間' }
	]
};
