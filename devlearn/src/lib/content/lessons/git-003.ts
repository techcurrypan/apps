// git-003 変更を取り消す（git 模擬）。
// 出力は全て、模擬の git で打って得た物。模擬は本物（git 2.56）の記録 tools-real/recorded/git-003-restore-revert.json と一字ずつ比べてある
// （commit の ID は、記録と模擬で時計が違うので別の値になる）。
// 場面：app.txt の v1 を記録し、v2 も記録した。v2 にはバグがあり、元に戻したい。経過時刻 t は作業を再開した時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const WT = '作業ツリー';
const ST = 'ステージ';
const LOG = '記録';

export const git003: Lesson = {
	id: 'git-003',
	field: 'git',
	level: 1,
	title: '変更を取り消す',
	goal: 'restore と revert で、変更や記録を取り消すことができる',
	prereq: ['git-002'],
	related: [],
	next: ['git-008'],
	explain: [
		{
			n: 1,
			title: '編集を戻す restore',
			lead: 'git restore ファイル は、作業ツリーの編集を記録の中身に戻す',
			body: [
				'app.txt を broken に書き替えると、status --short は  M app.txt を返す。',
				'git restore app.txt の後、cat app.txt は v1 に戻り、status は空になる。',
				'戻した編集は、どこにも残らない。'
			],
			facts: [
				{ k: '戻す前', v: ' M app.txt（中身 broken）' },
				{ k: 'git restore app.txt の後', v: '中身 v1・status は空' }
			],
			scene: [
				{ op: 'appear', id: 'wt', label: WT, sub: 'app.txt', at: [0, 1] },
				{ op: 'appear', id: 'log', label: LOG, sub: 'v1', at: [4, 1] },
				{ op: 'move', from: 'log', to: 'wt', payload: 'v1 に戻す', kind: 'restore' }
			],
			log: { t: '0m', from: LOG, to: WT, kind: 'restore', info: '編集を捨てて v1 に戻した' }
		},
		{
			n: 2,
			title: 'ステージから下ろす',
			lead: 'git restore --staged は、add した物をステージから下ろす',
			body: [
				'v2 と書いて add すると、status --short は M  app.txt になる。',
				'git restore --staged app.txt で、 M app.txt に戻る。編集は作業ツリーに残る。',
				'add を取り消すだけで、書いた中身は消さない。'
			],
			facts: [
				{ k: 'add の後', v: 'M  app.txt' },
				{ k: 'restore --staged の後', v: ' M app.txt（中身は v2 のまま）' }
			],
			scene: [
				{ op: 'appear', id: 'st', label: ST, sub: 'app.txt', at: [2, 1] },
				{ op: 'move', from: 'st', to: 'wt', payload: '下ろす', kind: 'unstage' }
			],
			log: { t: '1m', from: ST, to: WT, kind: 'restore', info: 'ステージから下ろした。中身は残る' }
		},
		{
			n: 3,
			title: '記録を打ち消す revert',
			lead: 'git revert は、ある記録と逆の変更を、新しい記録として足す',
			body: [
				'v2 with bug を記録した後で、バグに気づいた。log は v2・v1 の 2 件だ。',
				'git revert --no-edit HEAD は、v2 と逆の変更を作って記録する。',
				'答えは [main …] Revert "v2" で、cat app.txt は v1 に戻る。'
			],
			facts: [
				{ k: '打った物', v: 'git revert --no-edit HEAD' },
				{ k: '新しい記録', v: 'Revert "v2"' },
				{ k: 'app.txt', v: 'v2 with bug → v1' }
			],
			scene: [
				{ op: 'change', id: 'log', k: '記録', v: 'v1 → v2' },
				{ op: 'move', from: 'log', to: 'wt', payload: 'Revert "v2"', kind: 'revert' },
				{ op: 'change', id: 'wt', k: 'app.txt', v: 'v1' }
			],
			log: { t: '3m', from: LOG, to: WT, kind: 'revert', info: 'v2 を打ち消す記録を足した' }
		},
		{
			n: 4,
			title: '打ち消しも記録',
			lead: '打ち消しは、記録を消すのでなく、1 件足す',
			body: [
				'git log --oneline は、Revert "v2"・v2・v1 の 3 件を返す。',
				'v2 の記録は残っている。「v2 を入れ、後で打ち消した」が履歴になる。',
				'--no-edit は、打ち消しの説明を決まった文のまま使う指定だ。'
			],
			facts: [
				{ k: 'log の件数', v: '3（Revert "v2"・v2・v1）' },
				{ k: '説明', v: 'Revert "v2" / This reverts commit …' }
			],
			scene: [
				{ op: 'change', id: 'log', k: '記録', v: 'v1 → v2 → Revert "v2"' },
				{ op: 'highlight', id: 'log' }
			],
			log: { t: '4m', from: LOG, to: LOG, kind: 'log', info: '記録は 3 件。v2 も残る' },
			why: 'ほかの人が既に v2 を受け取っていても、消さずに足すので、皆の履歴が食い違わない'
		},
		{
			n: 5,
			title: '履歴は消えない',
			lead: '消したい記録も、後から何が起きたかを辿れるように残る',
			body: [
				'git show --stat HEAD は、Revert "v2" が app.txt を 1 行替えたと示す。',
				'説明には This reverts commit … と、打ち消した記録の ID が入る。',
				'記録そのものを消す道具（reset など）もあるが、共有した枝では使わない。'
			],
			facts: [
				{ k: '変えたファイル', v: 'app.txt | 2 +-' },
				{ k: '説明の 2 行目', v: 'This reverts commit …' }
			],
			scene: [
				{ op: 'appear', id: 'show', label: 'git show', sub: 'Revert "v2"', at: [4, 2] },
				{ op: 'move', from: 'log', to: 'show', payload: '1 件', kind: 'show' }
			],
			log: {
				t: '5m',
				from: LOG,
				to: 'git show',
				kind: 'show',
				info: '打ち消した記録の ID が説明にある'
			}
		},
		{
			n: 6,
			title: 'どれを使うか',
			lead: '戻したい物が、どこにあるかで使い分ける',
			body: [
				'まだ add していない編集は restore、add した物は restore --staged で戻す。',
				'記録した物は revert で打ち消す。',
				'どこにあるかは、まず git status と git log で確かめる。'
			],
			facts: [
				{ k: '作業ツリーの編集', v: 'git restore ファイル' },
				{ k: 'ステージの物', v: 'git restore --staged ファイル' },
				{ k: '記録した物', v: 'git revert --no-edit 記録' }
			],
			scene: [
				{ op: 'change', id: 'wt', k: '戻し方', v: 'restore' },
				{ op: 'change', id: 'st', k: '戻し方', v: 'restore --staged' },
				{ op: 'change', id: 'log', k: '戻し方', v: 'revert' }
			],
			log: { t: '6m', from: WT, to: LOG, kind: 'choose', info: '置き場ごとに戻し方を選ぶ' }
		}
	],
	example: {
		intro: '編集を戻し、ステージから下ろし、記録を打ち消した（模擬は本物の記録と比べ済み）',
		lines: [
			"$ printf 'broken\\n' > app.txt",
			'$ git status --short',
			' M app.txt',
			'$ git restore app.txt',
			'$ cat app.txt',
			'v1',
			"$ printf 'v2 with bug\\n' > app.txt",
			'$ git add app.txt',
			'$ git status --short',
			'M  app.txt',
			'$ git restore --staged app.txt',
			'$ git status --short',
			' M app.txt',
			'$ git commit -am "v2"',
			'[main b9e2902] v2',
			' 1 file changed, 1 insertion(+), 1 deletion(-)',
			'$ git revert --no-edit HEAD',
			'[main 5df41f1] Revert "v2"',
			' Date: Tue Nov 10 09:14:00 2026 +0900',
			' 1 file changed, 1 insertion(+), 1 deletion(-)',
			'$ git log --oneline',
			'5df41f1 (HEAD -> main) Revert "v2"',
			'b9e2902 v2',
			'83c4e1e v1',
			'$ git show --stat HEAD',
			'commit 5df41f12f35d7ff7fcf1e5f2059c1c8d01bc60f1 (HEAD -> main)',
			'Author: learner <learner@example.com>',
			'Date:   Tue Nov 10 09:14:00 2026 +0900',
			'',
			'    Revert "v2"',
			'    ',
			'    This reverts commit b9e2902565010c0a30580595a22d10146963855f.',
			'',
			' app.txt | 2 +-',
			' 1 file changed, 1 insertion(+), 1 deletion(-)',
			'$ cat app.txt',
			'v1'
		]
	},
	practice: {
		goal: 'バグのある v2 の記録を、履歴を消さずに打ち消し、app.txt を v1 に戻す',
		tool: { name: 'git', mode: 'mock' },
		setup: {
			initialized: false,
			files: {},
			prelude: [
				'git init',
				"printf 'v1\\n' > app.txt",
				'git add app.txt',
				'git commit -m "v1"',
				"printf 'v2 with bug\\n' > app.txt",
				'git commit -am "v2"'
			]
		},
		success: { commits: 3, tracked: ['app.txt'], statusShort: '', files: { 'app.txt': 'v1\n' } },
		mistakes: [
			{
				when: '--no-edit を付けずに revert した',
				why: '本物はここで説明を書くエディタを開く。模擬の端末はエディタを開かない',
				next: 'git revert --no-edit HEAD と打つ',
				match: '--no-edit を付けない'
			},
			{
				when: 'git reset で記録を消そうとした',
				why: '記録を消すと、既に受け取った人の履歴と食い違う。模擬もこの形を扱わない',
				next: '記録を残して打ち消す git revert --no-edit HEAD を使う',
				match: '「git reset」を扱わない'
			},
			{
				when: '無い記録を指した',
				why: 'HEAD~5 のような、遡れない所を指した',
				next: '最新の記録は HEAD。git log --oneline で確かめる',
				match: 'bad revision'
			}
		]
	},
	check: [
		{ ask: 'add 前の編集を戻す', how: 'git restore ファイル' },
		{ ask: '記録の打ち消し', how: 'git revert --no-edit HEAD で、逆の記録を 1 件足す' },
		{ ask: '打ち消した後の履歴', how: 'Revert "v2"・v2・v1 の 3 件（v2 も残る）' }
	]
};
