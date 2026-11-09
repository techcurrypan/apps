// 見本レッスン（段 2）。基準そのものを試すための 1 本。
// 値は全て、git 2.54.0 を手元で実際に打って得た物。書いた人と日時を次に固定した：
//   GIT_AUTHOR_NAME=learner GIT_AUTHOR_EMAIL=learner@example.com
//   GIT_AUTHOR_DATE / GIT_COMMITTER_DATE = 2026-11-10T09:00:00+09:00（2 件目は 09:05:00）
// 経過時刻 t は git init を 0s とした。1 件目の commit が 35s、2 件目が 5m35s。
import type { Lesson } from '../../lesson/types.ts';

const WT = '作業ツリー';
const IDX = 'ステージ';
const REPO = 'リポジトリ';
const MAIN = '枝 main';

export const git001: Lesson = {
	id: 'git-001',
	field: 'git',
	level: 1,
	title: 'add と commit で記録を積む',
	goal: 'git add と git commit で、変更が記録に入るまでの流れを追うことができる',
	prereq: [],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '記録の置き場を作る',
			lead: 'git init で .git という置き場ができる',
			body: [
				'git init を打つと、今のフォルダに .git という隠しフォルダができる。',
				'これをリポジトリと呼び、変更の記録は全てこの中に貯まる。',
				'ファイルを置いて編集する元のフォルダは、作業ツリーと呼ぶ。'
			],
			facts: [
				{ k: 'コマンド', v: 'git init -b main' },
				{ k: '作られる所', v: '.git/' },
				{ k: '物の数', v: '0' },
				{ k: 'HEAD の中身', v: 'ref: refs/heads/main' }
			],
			scene: [
				{ op: 'appear', id: 'wt', label: WT, sub: '編集する所', at: [0, 0] },
				{ op: 'appear', id: 'repo', label: REPO, sub: '.git/objects', at: [2, 0] },
				{ op: 'change', id: 'repo', k: '物の数', v: '0' }
			],
			log: { t: '0s', from: WT, to: REPO, kind: 'init', info: '.git/ を作った。物は 0 件' }
		},
		{
			n: 2,
			title: 'ファイルを作る',
			lead: '作業ツリーに置いても、まだ記録の外にある',
			body: [
				'hello.txt に hello world と 1 行書く。中身は改行を含めて 12 バイトだ。',
				'git status --short は、このファイルを ?? と示す。追跡していない、という印だ。'
			],
			facts: [
				{ k: 'ファイル', v: 'hello.txt' },
				{ k: '中身', v: 'hello world' },
				{ k: '大きさ', v: '12 B' },
				{ k: 'git status --short', v: '?? hello.txt' }
			],
			scene: [{ op: 'change', id: 'wt', k: 'hello.txt', v: 'hello world' }],
			log: {
				t: '12s',
				from: WT,
				to: WT,
				kind: 'edit',
				info: 'hello.txt を作った。まだ追跡していない',
				size: '12 B'
			}
		},
		{
			n: 3,
			title: 'add で中身を保存する',
			lead: 'git add で、中身が名前の付いた物になる',
			body: [
				'git add hello.txt で、中身がリポジトリに blob（中身の塊）として保存される。',
				'blob の名前は中身から計算した ID で、先頭 7 桁は 3b18e51 だ。',
				'ステージ（次の記録に入れる物の一覧）には、hello.txt は 3b18e51 と書かれる。'
			],
			facts: [
				{ k: 'コマンド', v: 'git add hello.txt' },
				{ k: 'blob の ID', v: '3b18e512dba79e4c8300dd08aeb37f8e728b8dad' },
				{ k: '物の数', v: '1' },
				{ k: 'git status --short', v: 'A  hello.txt' }
			],
			scene: [
				{ op: 'appear', id: 'idx', label: IDX, sub: '次の記録の一覧', at: [1, 0] },
				{ op: 'move', from: 'wt', to: 'repo', payload: 'hello world', kind: 'blob' },
				{ op: 'change', id: 'repo', k: '物の数', v: '1' },
				{ op: 'change', id: 'idx', k: 'hello.txt', v: '3b18e51' }
			],
			log: {
				t: '20s',
				from: WT,
				to: REPO,
				kind: 'add',
				info: 'blob 3b18e51 を保存し、ステージに載せた',
				size: '12 B'
			},
			why: '中身から ID を作ると、同じ中身は同じ ID になる。二度保存せずに済み、中身が壊れれば ID と合わなくなって気付ける'
		},
		{
			n: 4,
			title: 'commit で記録を作る',
			lead: 'ステージの一覧が、そのまま 1 件の記録になる',
			body: [
				'git commit を打つと、ステージの一覧から tree（フォルダの目録）が作られる。',
				'その tree と、書いた人・日時・説明文をまとめた物が commit（記録 1 件）だ。',
				'物は blob・tree・commit の 3 つになり、commit の ID は 84eecf4 になった。'
			],
			facts: [
				{ k: 'コマンド', v: 'git commit -m "first commit"' },
				{ k: 'tree の ID', v: '68aba62' },
				{ k: 'commit の ID', v: '84eecf4' },
				{ k: '物の数', v: '3' }
			],
			scene: [
				{ op: 'move', from: 'idx', to: 'repo', payload: 'tree 68aba62', kind: 'tree' },
				{ op: 'change', id: 'repo', k: '物の数', v: '3' },
				{ op: 'change', id: 'repo', k: '最新の commit', v: '84eecf4' }
			],
			log: {
				t: '35s',
				from: IDX,
				to: REPO,
				kind: 'commit',
				info: 'tree 68aba62 と commit 84eecf4 を作った'
			}
		},
		{
			n: 5,
			title: '枝の名札が記録を指す',
			lead: 'main は、最新の commit の ID を書いた名札だ',
			body: [
				'commit を作ると、枝 main が新しい commit を指す。',
				'main の正体は .git/refs/heads/main にある 1 行の ID だ。',
				'HEAD は今いる枝を指す。git log --oneline は main から辿れる記録を出す。'
			],
			facts: [
				{ k: 'refs/heads/main の中身', v: '84eecf427dc31f9f9c048c230ecb5fecc849ea09' },
				{ k: 'HEAD の中身', v: 'ref: refs/heads/main' },
				{ k: 'git log --oneline', v: '84eecf4 first commit' }
			],
			scene: [
				{ op: 'appear', id: 'main', label: MAIN, sub: '.git/refs/heads/main', at: [2, 1] },
				{ op: 'change', id: 'main', k: '指す先', v: '84eecf4' }
			],
			log: { t: '35s', from: REPO, to: MAIN, kind: 'ref', info: 'main が 84eecf4 を指した' }
		},
		{
			n: 6,
			title: '編集するとずれが出る',
			lead: '作業ツリーとステージの中身が食い違う',
			body: [
				'hello.txt に hello git と 1 行足す。大きさは 22 バイトになる。',
				'作業ツリーは新しい中身、ステージは古い 3b18e51 のままだ。',
				'git status --short は、このずれを M（modified、変更あり）と示す。'
			],
			facts: [
				{ k: '足した行', v: 'hello git' },
				{ k: '大きさ', v: '22 B' },
				{ k: 'git status --short', v: ' M hello.txt' },
				{ k: 'git diff の見出し', v: 'index 3b18e51..c940fc8' }
			],
			scene: [
				{ op: 'change', id: 'wt', k: 'hello.txt', v: 'hello world / hello git' },
				{ op: 'highlight', id: 'idx' }
			],
			log: {
				t: '4m50s',
				from: WT,
				to: WT,
				kind: 'edit',
				info: 'hello.txt に 1 行足した。ステージとずれた',
				size: '22 B'
			}
		},
		{
			n: 7,
			title: '2 件目は前の記録を指す',
			lead: '新しい commit は、親として前の ID を持つ',
			body: [
				'もう一度 add と commit を打つと、blob c940fc8 と commit 3e0fe7b ができる。',
				'3e0fe7b は parent（親）として 84eecf4 を持つ。親を辿ると履歴になる。',
				'main は 3e0fe7b を指すように書き換わり、物は 6 つになった。'
			],
			facts: [
				{ k: 'commit の ID', v: '3e0fe7b' },
				{ k: 'parent', v: '84eecf4' },
				{ k: '物の数', v: '6' },
				{ k: 'git log --oneline', v: '3e0fe7b add second line' }
			],
			scene: [
				{ op: 'move', from: 'wt', to: 'repo', payload: 'hello world / hello git', kind: 'blob' },
				{ op: 'change', id: 'idx', k: 'hello.txt', v: 'c940fc8' },
				{ op: 'change', id: 'repo', k: '物の数', v: '6' },
				{ op: 'change', id: 'repo', k: '最新の commit', v: '3e0fe7b' },
				{ op: 'change', id: 'main', k: '指す先', v: '3e0fe7b' }
			],
			log: {
				t: '5m35s',
				from: IDX,
				to: REPO,
				kind: 'commit',
				info: 'commit 3e0fe7b（親 84eecf4）を作り、main を進めた'
			},
			why: 'commit の ID は親の ID も含めて計算する。途中の記録を書き換えると、後の ID が全て変わるので気付ける'
		}
	],
	example: {
		intro: '空のフォルダで、最初の記録を作るまで。commit の ID は書いた人と日時で変わる',
		lines: [
			'$ git init -b main',
			'Initialized empty Git repository in /home/learner/demo/.git/',
			"$ printf 'hello world\\n' > hello.txt",
			'$ git status --short',
			'?? hello.txt',
			'$ git add hello.txt',
			'$ git status --short',
			'A  hello.txt',
			'$ git commit -m "first commit"',
			'[main (root-commit) 84eecf4] first commit',
			' 1 file changed, 1 insertion(+)',
			' create mode 100644 hello.txt',
			'$ git log --oneline',
			'84eecf4 first commit'
		]
	},
	practice: {
		goal: '新しいファイルを、1 件の commit として記録する',
		tool: { name: 'git', mode: 'mock' },
		setup: {
			cwd: '/home/learner/demo',
			initialized: true,
			files: { 'hello.txt': 'hello world\n' },
			index: {},
			commits: []
		},
		success: {
			commits: 1,
			tracked: ['hello.txt'],
			statusShort: ''
		},
		mistakes: [
			{
				when: 'git add をせずに git commit を打った',
				why: 'ステージが空で、記録に入れる物が無い。git は nothing added to commit but untracked files present と返す',
				next: '先に git add hello.txt を打ち、git status --short が A になったのを見てから commit する',
				match: 'nothing added to commit but untracked files present'
			},
			{
				when: 'git add hello.tx と名前を打ち違えた',
				why: "そのファイルは無いので、git は fatal: pathspec 'hello.tx' did not match any files と返す",
				next: 'ls で名前を確かめ、git add hello.txt と打ち直す',
				match: 'did not match any files'
			},
			{
				when: 'commit の後に、もう一度 git commit を打った',
				why: '前の記録から何も変わっていない。git は nothing to commit, working tree clean と返す',
				next: 'git log --oneline で、記録が 1 件できているかを確かめる',
				match: 'nothing to commit, working tree clean'
			}
		]
	},
	check: [
		{ ask: 'hello.txt が記録に入ったか', how: 'git log --oneline に 1 行出る' },
		{ ask: '作業ツリーとステージにずれが無いか', how: 'git status --short の出力が空' },
		{
			ask: '記録が指す中身',
			how: 'git cat-file -p HEAD^{tree} に blob 3b18e51 と hello.txt が出る'
		}
	]
};
