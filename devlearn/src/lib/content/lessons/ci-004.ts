// ci-004 失敗のログを読む（pick）。
// 場面：パン屋の頁の検査で、test の段が ✗ になった。ログから原因の行を見つける。ログは作り物（読み方を学ぶための形）。
// 経過時刻 t はログを開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const JOB = 'test の段';
const LOG = 'ログ';

export const ci004: Lesson = {
	id: 'ci-004',
	field: 'ci',
	level: 2,
	title: '失敗のログを読む',
	goal: '失敗したジョブのログから、原因の行を見つけることができる',
	prereq: ['ci-003'],
	related: ['prg-007', 'net-008'],
	next: [],
	explain: [
		{
			n: 1,
			title: '赤い段',
			lead: 'まず、どの段が落ちたかを見る',
			body: [
				'lint は ✓、test は ✗、build は走っていない。',
				'落ちたのは test なので、test のログだけを開けばよい。'
			],
			facts: [
				{ k: 'lint', v: '✓' },
				{ k: 'test', v: '✗' },
				{ k: 'build', v: '走っていない' }
			],
			scene: [
				{ op: 'appear', id: 'job', label: JOB, sub: '✗', at: [0, 1] },
				{ op: 'highlight', id: 'job' }
			],
			log: { t: '0s', from: '結果の一覧', to: JOB, kind: 'open', info: '落ちたのは test' }
		},
		{
			n: 2,
			title: 'ログを開く',
			lead: 'ログは、その段の機械が端末に出した全ての行だ',
			body: [
				'部品を入れる行、テストの道具の行、通った・落ちた行が、時刻の順に並ぶ。',
				'数百行あることも多く、上から全部は読まない。'
			],
			facts: [
				{ k: '中身', v: '機械が端末に出した行' },
				{ k: '並び', v: '時刻の順' }
			],
			scene: [
				{ op: 'appear', id: 'log', label: LOG, sub: '数百行', at: [3, 1] },
				{ op: 'move', from: 'job', to: 'log', payload: '開く', kind: 'open' }
			],
			log: { t: '2s', from: JOB, to: LOG, kind: 'open', info: 'ログを開いた' }
		},
		{
			n: 3,
			title: '最後の行から',
			lead: '原因は、最後の方の行から上へ辿って探す',
			body: [
				'最後の行は「終了コード 1 で終わった」で、落ちた事しか分からない。',
				'その少し上に、テストの道具の要約 Tests 1 failed | 3 passed がある。'
			],
			facts: [
				{ k: '最後の行', v: '終了コード 1（落ちた事だけ）' },
				{ k: '要約', v: 'Tests 1 failed | 3 passed' }
			],
			scene: [
				{ op: 'change', id: 'log', k: '読む向き', v: '下から上へ' },
				{ op: 'appear', id: 'sum', label: '要約の行', sub: '1 failed', at: [3, 2] }
			],
			log: { t: '5s', from: LOG, to: '要約の行', kind: 'read', info: '1 件落ちた' },
			why: '落ちた所で道具は止まるので、原因は終わりの近くにある。上の行は、通った準備の記録だ'
		},
		{
			n: 4,
			title: 'エラーの行',
			lead: 'どのテストが、何を期待して、何になったかの行を探す',
			body: [
				'✗ tax.test.js > 税込みの値段 の下に、expected 118 to be 119 とある。',
				'119 を期待したが、118 になった。場所は tax.test.js の 12 行目だ。'
			],
			facts: [
				{ k: '落ちたテスト', v: 'tax.test.js > 税込みの値段' },
				{ k: '期待と結果', v: '119 を期待・118 になった' },
				{ k: '場所', v: 'tax.test.js:12' }
			],
			scene: [
				{ op: 'appear', id: 'err', label: 'エラーの行', sub: 'expected 118 to be 119', at: [6, 1] },
				{ op: 'move', from: 'sum', to: 'err', payload: '上へ辿る', kind: 'read' }
			],
			log: { t: '9s', from: '要約の行', to: 'エラーの行', kind: 'read', info: '119 のはずが 118' }
		},
		{
			n: 5,
			title: '直す所',
			lead: 'エラーの行から、直す書き物の場所を決める',
			body: [
				'税込みの値段は 108 × 1.1 = 118.8 を切り上げて 119 のはずだ。',
				'切り捨てていた tax.js の計算が原因だと分かった。'
			],
			facts: [
				{ k: '計算', v: '108 × 1.1 = 118.8' },
				{ k: '原因', v: '切り上げでなく切り捨てていた' }
			],
			scene: [
				{ op: 'appear', id: 'src', label: 'tax.js', sub: '切り捨て', at: [6, 2] },
				{ op: 'move', from: 'err', to: 'src', payload: '原因', kind: 'cause' }
			],
			log: { t: '30s', from: 'エラーの行', to: 'tax.js', kind: 'cause', info: '切り捨てが原因' }
		},
		{
			n: 6,
			title: '手元で同じ物を走らせる',
			lead: '直す前後に、手元で同じテストを走らせて確かめる',
			body: [
				'手元で npm test を走らせ、同じ 1 件が落ちることを確かめた。',
				'直して手元で通してから push すると、検査も ✓ になった。'
			],
			facts: [
				{ k: '手元で', v: 'npm test（同じ 1 件が落ちる）' },
				{ k: '直した後', v: '手元も検査も ✓' }
			],
			scene: [
				{ op: 'change', id: 'src', k: '直した', v: '切り上げ' },
				{ op: 'change', id: 'job', k: '結果', v: '✓' }
			],
			log: { t: '5m', from: 'tax.js', to: JOB, kind: 'fix', info: '直して ✓ になった' }
		}
	],
	example: {
		intro: 'test の段のログの終わりの方（作り物）',
		lines: [
			'$ npm test',
			' ✓ price.test.js (3 tests)',
			' ✗ tax.test.js > 税込みの値段',
			'   AssertionError: expected 118 to be 119',
			'   ❯ tax.test.js:12:20',
			' Tests  1 failed | 3 passed (4)',
			'段 test は終了コード 1 で終わった'
		]
	},
	practice: {
		goal: 'test の段のログから、原因を最もよく表す行を 1 つ選ぶ',
		form: 'pick',
		setup: {
			situation: [
				'$ npm ci',
				'npm warn deprecated glob@7.2.3: 古い版です',
				'added 214 packages in 9s',
				'$ npm test',
				' ✓ price.test.js (3 tests)',
				' ✓ menu.test.js (2 tests)',
				' ✗ order.test.js > 合計の個数',
				'   AssertionError: expected 5 to be 6',
				'   ❯ order.test.js:21:18',
				' Tests  1 failed | 5 passed (6)',
				'段 test は終了コード 1 で終わった'
			],
			choices: [
				{
					id: 'exit',
					text: '段 test は終了コード 1 で終わった',
					result: '落ちた事は分かったが、どのテストかも、なぜかも分からなかった'
				},
				{
					id: 'warn',
					text: 'npm warn deprecated glob@7.2.3: 古い版です',
					result: '注意の行で、テストの前に出ていた。直しても ✗ のままだった'
				},
				{
					id: 'assert',
					text: 'AssertionError: expected 5 to be 6（order.test.js:21）',
					result: '合計の個数が 1 つ少ない。order.js の数え方を直すと ✓ になった'
				},
				{
					id: 'summary',
					text: 'Tests  1 failed | 5 passed (6)',
					result: '1 件落ちたと分かったが、どれが・なぜかは分からなかった'
				}
			]
		},
		success: { choice: 'assert' },
		mistakes: [
			{
				when: '最後の行を選んだ',
				why: '最後の行は、落ちた事を言うだけだ。原因はその上にある',
				next: '最後の行から上へ辿り、期待と結果の書いてある行を探す',
				match: 'pick:exit'
			},
			{
				when: '注意（warn）の行を選んだ',
				why: '注意の行は、テストの前の準備で出た物で、段は先へ進んでいる',
				next: '✗ の付いたテストの下の行を見る',
				match: 'pick:warn'
			},
			{
				when: '要約の行を選んだ',
				why: '要約は、何件落ちたかだけを言う',
				next: '要約の上の、✗ の付いたテストの下の行を見る',
				match: 'pick:summary'
			}
		]
	},
	check: [
		{ ask: 'ログの読む向き', how: '最後の方から上へ' },
		{ ask: '原因の行', how: '✗ のテストの下の、期待と結果と場所の行' },
		{ ask: '直す前後', how: '手元で同じテストを走らせて確かめる' }
	]
};
