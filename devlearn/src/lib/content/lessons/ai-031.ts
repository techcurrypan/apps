// ai-031 データを集めて整える（fix・dataset）。
// 場面：港の貸し船屋で「客が予約を取り消すか」を当てるモデルの、学習用の表を整える。表は作り物。
// 行の書き方は作り物（missing / balance / column / split）。経過時刻 t は手順の番号。
// G 検定のシラバス「データの収集・加工（欠損値・不均衡・データ漏洩・分割）」に対応する。
import type { Lesson } from '../../lesson/types.ts';

const T = '集めた表';

export const ai031: Lesson = {
	id: 'ai-031',
	field: 'ai',
	level: 2,
	title: 'データを集めて整える',
	goal: '学習用データの欠け・偏り・漏れを見つけて直すことができる',
	prereq: ['ai-030'],
	related: ['db-011'],
	next: ['ai-032'],
	explain: [
		{
			n: 1,
			title: '集めた表',
			lead: '2 年分の予約 2,000 件の表を集めた',
			body: [
				'列は 予約日・人数・年齢・前払いか・返金の印・取り消したか（答え）。',
				'学ばせる前に、表の困り事を 4 つ確かめる。'
			],
			facts: [
				{ k: '行', v: '2,000 件（2 年分）' },
				{ k: '答えの列', v: '取り消したか' }
			],
			scene: [{ op: 'appear', id: 't', label: T, sub: '2,000 件', at: [0, 1] }],
			log: { t: '1', from: '予約の記録', to: T, kind: 'collect', info: '2,000 件を集めた' }
		},
		{
			n: 2,
			title: '欠けた値',
			lead: '年齢の欄が、4 割の行で空だった',
			body: [
				'空の行を捨てると、2,000 件が 1,200 件に減る。',
				'年齢の中央値（38）で埋めれば、行を残したまま学べる。'
			],
			facts: [
				{ k: '空の行', v: '4 割' },
				{ k: '直し方', v: 'missing fill（中央値で埋める）' }
			],
			scene: [
				{ op: 'appear', id: 'miss', label: '欠け', sub: '4 割', at: [3, 0] },
				{ op: 'move', from: 't', to: 'miss', payload: '中央値で埋める', kind: 'fill' }
			],
			log: { t: '2', from: T, to: '欠け', kind: 'fill', info: '中央値 38 で埋めた' }
		},
		{
			n: 3,
			title: '偏った割合',
			lead: '取り消しは 2,000 件のうち 100 件（5%）しか無い',
			body: [
				'全て「取り消さない」と答えるだけで 95% 当たるので、モデルは取り消しを見逃す。',
				'少ない方の答えの重みを上げて学ばせる（balance weight）。'
			],
			facts: [
				{ k: '取り消し', v: '100 件（5%）' },
				{ k: '直し方', v: 'balance weight' }
			],
			scene: [
				{ op: 'appear', id: 'bal', label: '偏り', sub: '5%', at: [3, 1] },
				{ op: 'move', from: 't', to: 'bal', payload: '重みを上げる', kind: 'weight' }
			],
			log: { t: '3', from: T, to: '偏り', kind: 'weight', info: '少ない方の重みを上げた' }
		},
		{
			n: 4,
			title: '答えが混ざった列',
			lead: '「返金の印」は、取り消した後にしか付かない列だった',
			body: [
				'この列を使うと検証では 99% 当たるが、予約の時点では印がまだ無く、使えない。',
				'答えから作られた列は、学びに使わない（column returned drop）。'
			],
			facts: [
				{ k: '漏れた列', v: '返金の印' },
				{ k: '直し方', v: 'column returned drop' }
			],
			scene: [
				{ op: 'appear', id: 'leak', label: '漏れ', sub: '返金の印', at: [3, 2] },
				{ op: 'move', from: 't', to: 'leak', payload: '列を外す', kind: 'drop' }
			],
			log: { t: '4', from: T, to: '漏れ', kind: 'drop', info: '返金の印を外した' },
			why: '使う時に手に入らない値で学ぶと、検証では当たるのに、本番では外れる'
		},
		{
			n: 5,
			title: '分け直す',
			lead: '時の流れのあるデータは、古い方で学び、新しい方で検証する',
			body: [
				'でたらめに分けると、未来の予約で学び、過去の予約を当てることになる。',
				'1 年目で学び、2 年目で検証する（split time）。'
			],
			facts: [
				{ k: '分け方', v: 'split time' },
				{ k: '学ぶ・検証', v: '1 年目・2 年目' }
			],
			scene: [
				{ op: 'appear', id: 'split', label: '分け方', sub: '時で分ける', at: [6, 1] },
				{ op: 'move', from: 't', to: 'split', payload: '1 年目 / 2 年目', kind: 'split' }
			],
			log: { t: '5', from: T, to: '分け方', kind: 'split', info: '時で分けた' }
		}
	],
	example: {
		intro: '整え方の行と、確かめの結果',
		lines: [
			'missing fill',
			'balance weight',
			'column returned drop',
			'split time',
			'',
			'欠け     ok（2,000 件を残す）',
			'偏り     ok（取り消しを見逃さない）',
			'漏れ     ok（予約の時点で手に入る列だけ）',
			'分け方   ok（過去で学び、未来で検証）'
		]
	},
	practice: {
		goal: '整え方の行を直し、欠け・偏り・漏れ・分け方の 4 つの確かめを全て「問題なし」にする',
		form: 'fix',
		setup: {
			engine: 'dataset',
			lines: [
				{ id: 'd1', text: 'missing drop' },
				{ id: 'd2', text: 'balance none' },
				{ id: 'd3', text: 'column returned keep' },
				{ id: 'd4', text: 'split random' }
			],
			options: [
				{ line: 'd1', id: 'fill', text: 'missing fill' },
				{ line: 'd1', id: 'keep', text: 'missing keep' },
				{ line: 'd2', id: 'weight', text: 'balance weight' },
				{ line: 'd3', id: 'drop', text: 'column returned drop' },
				{ line: 'd4', id: 'time', text: 'split time' }
			],
			cases: [
				{ id: 'missing', name: '欠けた値', input: { check: 'missing' } },
				{ id: 'balance', name: '答えの偏り', input: { check: 'balance' } },
				{ id: 'leak', name: '答えの漏れ', input: { check: 'leak' } },
				{ id: 'split', name: '検証の分け方', input: { check: 'split' } }
			]
		},
		success: { expect: { missing: 'ok', balance: 'ok', leak: 'ok', split: 'ok' } },
		mistakes: [
			{
				when: '返金の印の列を残した',
				why: '取り消した後にしか付かない列で、予約の時点では使えない',
				next: '3 行目を column returned drop にする',
				match: 'case:leak:答えが漏れる'
			},
			{
				when: '欠けた行を捨てた',
				why: '4 割の行を捨てると、学ぶ数が大きく減る',
				next: '1 行目を missing fill にする',
				match: 'case:missing:行の 4 割を捨てる'
			},
			{
				when: 'でたらめに分けたままにした',
				why: '未来の予約で学び、過去を当てることになり、検証が甘くなる',
				next: '4 行目を split time にする',
				match: 'case:split:未来が漏れる'
			},
			{
				when: '偏りをそのままにした',
				why: '取り消しが 5% しか無く、全て「取り消さない」と答えるモデルになる',
				next: '2 行目を balance weight にする',
				match: 'case:balance:少ない方を見逃す'
			}
		]
	},
	check: [
		{ ask: '欠けた値', how: '捨てずに、中央値などで埋める' },
		{ ask: '答えの漏れ', how: '使う時に手に入らない列を外す' },
		{ ask: '時の流れのあるデータの分け方', how: '古い方で学び、新しい方で検証する' }
	]
};
