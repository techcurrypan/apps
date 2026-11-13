// git-010 レビューを経て合わせる（order）。
// 場面：パン屋の注文の頁で、食パンの値段の表示を直す。店員の hanako が枝で直し、店主がレビューして main に合わせる。
// 特定の事業者のサービスを使わず、どの置き場にもある「合わせる依頼（レビューの依頼）」の流れで教える（curriculum.md D-10）。
// 経過時刻 t は hanako が枝を作った時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const AUTHOR = 'hanako（直す人）';
const REMOTE = '遠く origin';
const REVIEWER = '店主（レビューする人）';
const CHECK = '自動の検査';

export const git010: Lesson = {
	id: 'git-010',
	field: 'git',
	level: 3,
	title: 'レビューを経て合わせる',
	goal: '変更を出してレビューを受け、合わせるまでの流れを並べることができる',
	prereq: ['git-006', 'git-007'],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '枝で作る',
			lead: '直す物は、main から分けた枝で作る',
			body: [
				'hanako は git switch -c fix-price で枝を作り、値段の表示を直して記録した。',
				'main は皆が使う本番なので、直接は積まない。'
			],
			facts: [
				{ k: '枝', v: 'fix-price' },
				{ k: '記録', v: 'fix bread price' },
				{ k: 'main', v: '元のまま' }
			],
			scene: [
				{ op: 'appear', id: 'author', label: AUTHOR, sub: 'fix-price', at: [0, 1] },
				{ op: 'appear', id: 'remote', label: REMOTE, sub: 'main', at: [3, 1] },
				{ op: 'change', id: 'author', k: '記録', v: 'fix bread price' }
			],
			log: {
				t: '0m',
				from: AUTHOR,
				to: AUTHOR,
				kind: 'commit',
				info: '枝 fix-price で直して記録した'
			}
		},
		{
			n: 2,
			title: '送る',
			lead: '枝を遠くへ送ると、他の人が中身を見られる',
			body: [
				'git push -u origin fix-price で、枝ごと遠くへ送る。',
				'送らない限り、レビューする人の手元からは見えない。'
			],
			facts: [
				{ k: '打った物', v: 'git push -u origin fix-price' },
				{ k: '遠くの枝', v: 'main・fix-price' }
			],
			scene: [
				{ op: 'move', from: 'author', to: 'remote', payload: '枝 fix-price', kind: 'push' },
				{ op: 'change', id: 'remote', k: '枝', v: 'main・fix-price' }
			],
			log: { t: '2m', from: AUTHOR, to: REMOTE, kind: 'push', info: '枝 fix-price を送った' }
		},
		{
			n: 3,
			title: 'レビューの依頼',
			lead: '「この枝を main に合わせたい」と、合わせる依頼を出す',
			body: [
				'依頼には、何を・なぜ直したか、どう確かめたかを書く。',
				'依頼を出すと、main と fix-price の差分が 1 つの頁にまとまる。',
				'置き場の名前は事業者で違うが、どこにも同じ仕組みがある。'
			],
			facts: [
				{ k: '合わせる先', v: 'main' },
				{ k: '合わせる枝', v: 'fix-price' },
				{ k: '書く物', v: '何を・なぜ・どう確かめたか' }
			],
			scene: [
				{ op: 'appear', id: 'req', label: '合わせる依頼', sub: 'fix-price → main', at: [3, 2] },
				{ op: 'appear', id: 'rev', label: REVIEWER, sub: '差分を読む', at: [6, 1] },
				{ op: 'move', from: 'req', to: 'rev', payload: 'レビューの依頼', kind: 'request' }
			],
			log: { t: '4m', from: AUTHOR, to: REVIEWER, kind: 'request', info: '合わせる依頼を出した' }
		},
		{
			n: 4,
			title: '指摘を直す',
			lead: 'レビューの指摘は、同じ枝に記録を足して直す',
			body: [
				'店主は「税込みの表示も直して」と書いた。',
				'hanako は同じ枝に記録を足し、もう一度 git push した。',
				'依頼の頁は、送った枝を見ているので、新しい記録が自動で加わる。'
			],
			facts: [
				{ k: '指摘', v: '税込みの表示も直す' },
				{ k: '足した記録', v: 'show tax-included price' },
				{ k: '依頼の記録', v: '2 件' }
			],
			scene: [
				{ op: 'move', from: 'rev', to: 'author', payload: '指摘', kind: 'review' },
				{ op: 'move', from: 'author', to: 'remote', payload: '直した記録', kind: 'push' },
				{ op: 'change', id: 'req', k: '記録', v: '2 件' }
			],
			log: { t: '9m', from: REVIEWER, to: AUTHOR, kind: 'review', info: '指摘を直して送り直した' },
			why: '同じ依頼の中で直せば、何を指摘され、どう直したかが 1 か所に残る'
		},
		{
			n: 5,
			title: '検査が通る',
			lead: '自動の検査が通り、レビューする人が承認する',
			body: [
				'送るたびに、自動の検査が依頼の枝で走る（ci-001）。',
				'検査が通り、店主が承認して、合わせてよい状態になった。',
				'検査が落ちている間は、合わせない。'
			],
			facts: [
				{ k: '検査', v: '通った' },
				{ k: 'レビュー', v: '承認' }
			],
			scene: [
				{ op: 'appear', id: 'check', label: CHECK, sub: '依頼の枝', at: [3, 0] },
				{ op: 'move', from: 'check', to: 'req', payload: '通った', kind: 'check' },
				{ op: 'move', from: 'rev', to: 'req', payload: '承認', kind: 'approve' }
			],
			log: {
				t: '12m',
				from: CHECK,
				to: '合わせる依頼',
				kind: 'check',
				info: '検査が通り、承認された'
			}
		},
		{
			n: 6,
			title: '合わせる',
			lead: '承認された依頼を main に合わせ、枝を片付ける',
			body: [
				'依頼を合わせると、遠くの main に fix-price の記録が入る。',
				'役目を終えた枝 fix-price は消してよい。',
				'皆は git pull で、新しい main を受け取る（git-007）。'
			],
			facts: [
				{ k: '遠くの main', v: 'fix-price の記録が入った' },
				{ k: '枝 fix-price', v: '消す' }
			],
			scene: [
				{ op: 'move', from: 'req', to: 'remote', payload: 'main に合わせる', kind: 'merge' },
				{ op: 'vanish', id: 'req' },
				{ op: 'change', id: 'remote', k: '枝', v: 'main' }
			],
			log: {
				t: '13m',
				from: '合わせる依頼',
				to: REMOTE,
				kind: 'merge',
				info: 'main に合わせ、枝を消した'
			}
		}
	],
	example: {
		intro: 'hanako の直しが、店主のレビューを経て main に入るまで',
		lines: [
			'0m   hanako  git switch -c fix-price → 直して記録',
			'2m   hanako  git push -u origin fix-price',
			'4m   hanako  合わせる依頼を出す（fix-price → main）',
			'6m   店主    差分を読み「税込みの表示も直して」と書く',
			'9m   hanako  同じ枝に記録を足し、git push',
			'12m  検査    通った ／ 店主 承認',
			'13m  店主    依頼を main に合わせ、枝 fix-price を消す'
		]
	},
	practice: {
		goal: '直した物が、レビューを経て main に入るまでを、起きる順に並べる',
		form: 'order',
		setup: {
			cards: [
				{ id: 'request', text: 'main に合わせる依頼を出す' },
				{ id: 'merge', text: '依頼を main に合わせ、枝を消す' },
				{ id: 'branch', text: '枝 fix-price を作り、直して記録する' },
				{ id: 'check', text: '自動の検査が通り、承認される' },
				{ id: 'fix', text: '指摘を同じ枝で直し、もう一度 push する' },
				{ id: 'push', text: 'git push -u origin fix-price で枝を送る' }
			]
		},
		success: { orders: [['branch', 'push', 'request', 'fix', 'check', 'merge']] },
		mistakes: [
			{
				when: '依頼を、枝を送るより前に置いた',
				why: '遠くに枝が無いと、依頼の頁に差分が出ない。レビューする人には何も見えない',
				next: 'git push -u origin fix-price の札を、依頼の札より上に置く',
				match: 'request<push'
			},
			{
				when: '合わせる札を、検査と承認より前に置いた',
				why: '検査が通る前に合わせると、壊れた変更が皆の main に入るおそれがある',
				next: '検査が通り承認される札の後に、合わせる札を置く',
				match: 'merge<check'
			},
			{
				when: '指摘を直す札を、依頼より前に置いた',
				why: '指摘は、依頼を出してレビューを受けた後に来る',
				next: '依頼の札の後に、指摘を直す札を置く',
				match: 'fix<request'
			}
		]
	},
	check: [
		{ ask: '直す物を作る場所', how: 'main から分けた枝' },
		{ ask: '依頼の前に要る物', how: '枝を遠くへ送っておく' },
		{ ask: '指摘の直し方', how: '同じ枝に記録を足して、もう一度 push' },
		{ ask: '合わせてよい時', how: '検査が通り、レビューで承認された後' }
	]
};
