// ci-001 push で検査が走る（order）。
// 場面：パン屋の頁の直しを hanako が push すると、自動の検査が走って結果が返る。特定の事業者の名前は使わない（D-10）。
// 経過時刻 t は push を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const DEV = 'hanako の手元';
const REPO = '遠くの置き場';
const RUNNER = '使い捨ての機械';

export const ci001: Lesson = {
	id: 'ci-001',
	field: 'ci',
	level: 1,
	title: 'push で検査が走る',
	goal: 'push から検査の結果が返るまでの流れを並べることができる',
	prereq: ['git-007'],
	related: ['prg-009'],
	next: ['ci-002'],
	explain: [
		{
			n: 1,
			title: 'push',
			lead: '記録を遠くの置き場へ送ると、それが合図になる',
			body: [
				'hanako は値段の表示を直して記録し、git push で送った（git-007）。',
				'検査は、人が頼まなくても、この push を合図に始まる。'
			],
			facts: [
				{ k: '合図', v: 'git push' },
				{ k: '送った記録', v: 'fix price' }
			],
			scene: [
				{ op: 'appear', id: 'dev', label: DEV, sub: 'fix price', at: [0, 1] },
				{ op: 'appear', id: 'repo', label: REPO, sub: 'main', at: [3, 1] },
				{ op: 'move', from: 'dev', to: 'repo', payload: 'push', kind: 'push' }
			],
			log: { t: '0s', from: DEV, to: REPO, kind: 'push', info: 'fix price を送った' }
		},
		{
			n: 2,
			title: '検査の起動',
			lead: '置き場は、記録の中の設定ファイルを読み、検査を起こす',
			body: [
				'設定ファイルには「push の時に、この段を走らせる」と書いてある（ci-003）。',
				'置き場はそれを読み、検査を 1 件、順番待ちの列に入れた。'
			],
			facts: [
				{ k: '読む物', v: '記録の中の設定ファイル' },
				{ k: '起きた事', v: '検査 1 件が列に入った' }
			],
			scene: [
				{ op: 'appear', id: 'queue', label: '順番待ちの列', sub: '検査 1 件', at: [3, 0] },
				{ op: 'move', from: 'repo', to: 'queue', payload: '設定を読む', kind: 'trigger' }
			],
			log: { t: '1s', from: REPO, to: '順番待ちの列', kind: 'trigger', info: '検査を 1 件起こした' }
		},
		{
			n: 3,
			title: '機械を借りる',
			lead: '検査のたびに、まっさらな機械を 1 台用意する',
			body: [
				'列の検査に、使い捨ての機械が 1 台割り当てられた。',
				'前の検査の残り物が無いので、誰の手元で走らせても同じ結果になる。'
			],
			facts: [
				{ k: '割り当て', v: '使い捨ての機械 1 台' },
				{ k: '中身', v: 'まっさら' }
			],
			scene: [
				{ op: 'appear', id: 'runner', label: RUNNER, sub: 'まっさら', at: [6, 1] },
				{ op: 'move', from: 'queue', to: 'runner', payload: '割り当て', kind: 'assign' }
			],
			log: {
				t: '8s',
				from: '順番待ちの列',
				to: RUNNER,
				kind: 'assign',
				info: '機械を 1 台割り当てた'
			},
			why: '毎回まっさらから始めると、「自分の手元では通る」という食い違いが消える'
		},
		{
			n: 4,
			title: '取ってくる',
			lead: '機械は、push された記録の中身を取ってくる',
			body: [
				'機械は置き場から fix price の中身を取り、要る部品を入れる。',
				'検査するのは、push したその記録だ。'
			],
			facts: [
				{ k: '取る物', v: 'fix price の中身' },
				{ k: '次', v: '要る部品を入れる' }
			],
			scene: [
				{ op: 'move', from: 'repo', to: 'runner', payload: 'fix price', kind: 'fetch' },
				{ op: 'change', id: 'runner', k: '中身', v: 'fix price' }
			],
			log: { t: '15s', from: REPO, to: RUNNER, kind: 'fetch', info: '記録の中身を取った' }
		},
		{
			n: 5,
			title: '検査が走る',
			lead: '設定に書いた段を、上から順に走らせる',
			body: [
				'書式の検査・テスト・組み立ての 3 段が、順に走った。',
				'どの段も、終了コード 0 で終われば通った印だ（lnx-009）。'
			],
			facts: [
				{ k: '段', v: '書式 → テスト → 組み立て' },
				{ k: '通った印', v: '終了コード 0' }
			],
			scene: [
				{ op: 'appear', id: 'steps', label: '3 段', sub: '書式・テスト・組み立て', at: [6, 2] },
				{ op: 'move', from: 'runner', to: 'steps', payload: '走らせる', kind: 'run' }
			],
			log: { t: '90s', from: RUNNER, to: '3 段', kind: 'run', info: '3 段が順に走った' }
		},
		{
			n: 6,
			title: '結果が返る',
			lead: '結果は、記録の横の印と知らせで返る',
			body: [
				'3 段とも通り、置き場の fix price の横に ✓ が付いた。',
				'1 段でも落ちれば ✗ が付き、hanako に知らせが届く。機械は捨てられる。'
			],
			facts: [
				{ k: '結果', v: '✓（3 段とも通った）' },
				{ k: '落ちた時', v: '✗ と知らせ' }
			],
			scene: [
				{ op: 'move', from: 'runner', to: 'repo', payload: '✓', kind: 'result' },
				{ op: 'vanish', id: 'runner' }
			],
			log: { t: '95s', from: RUNNER, to: REPO, kind: 'result', info: '✓ が付き、機械は捨てられた' }
		}
	],
	example: {
		intro: 'push から結果までの時刻',
		lines: [
			' 0s   hanako   git push（fix price）',
			' 1s   置き場   設定を読み、検査を列に入れる',
			' 8s   機械     使い捨ての機械が割り当てられる',
			'15s   機械     fix price の中身を取り、部品を入れる',
			'90s   機械     書式 → テスト → 組み立て',
			'95s   置き場   fix price の横に ✓'
		]
	},
	practice: {
		goal: 'push から検査の結果が返るまでを、起きる順に並べる',
		form: 'order',
		setup: {
			cards: [
				{ id: 'run', text: 'テストなどの段が順に走る' },
				{ id: 'push', text: 'hanako が git push で記録を送る' },
				{ id: 'result', text: '記録の横に ✓ か ✗ が付く' },
				{ id: 'fetch', text: '機械が、送られた記録の中身を取ってくる' },
				{ id: 'trigger', text: '置き場が設定ファイルを読み、検査を起こす' },
				{ id: 'runner', text: '使い捨ての機械が 1 台割り当てられる' }
			]
		},
		success: { orders: [['push', 'trigger', 'runner', 'fetch', 'run', 'result']] },
		mistakes: [
			{
				when: '検査を起こす札を push より前に置いた',
				why: '検査は push を合図に起きる。送る前には、置き場は何も知らない',
				next: 'push の札を一番上に置く',
				match: 'trigger<push'
			},
			{
				when: '中身を取る札を、機械の割り当てより前に置いた',
				why: '取ってくるのは割り当てられた機械だ。機械が無いと取れない',
				next: '機械が割り当てられる札の後に、取ってくる札を置く',
				match: 'fetch<runner'
			},
			{
				when: '段が走る札を、中身を取るより前に置いた',
				why: '中身が無いと、テストする物が無い',
				next: '取ってくる札の後に、段が走る札を置く',
				match: 'run<fetch'
			}
		]
	},
	check: [
		{ ask: '検査の合図', how: 'git push' },
		{ ask: '検査をする機械', how: '毎回まっさらな、使い捨ての機械' },
		{ ask: '結果の返り方', how: '記録の横の ✓・✗ と知らせ' }
	]
};
