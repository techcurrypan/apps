// git-002 違いを見る（git 模擬）。
// 出力は全て、模擬の git で打って得た物。模擬は本物（git 2.56）の記録 tools-real/recorded/git-002-diff-log.json と一字ずつ比べてある
// （commit の ID は、記録と模擬で時計が違うので別の値になる）。
// 場面：果物の一覧 fruits.txt を 1 回記録した後、中身を書き替え、メモ memo.txt も置いた。経過時刻 t は作業を再開した時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const WT = '作業ツリー';
const ST = 'ステージ';
const HEAD = '記録（HEAD）';

export const git002: Lesson = {
	id: 'git-002',
	field: 'git',
	level: 1,
	title: '違いを見る',
	goal: 'status・diff・log で、何が変わったかを確かめることができる',
	prereq: ['git-001'],
	related: [],
	next: ['git-003', 'git-004', 'git-009'],
	explain: [
		{
			n: 1,
			title: 'status の 3 つの場所',
			lead: 'ファイルは、作業ツリー・ステージ・記録の 3 か所で比べられる',
			body: [
				'作業ツリーは手元のファイル、ステージは次の記録に入れる物、記録は最後の commit だ。',
				'git status --short は  M fruits.txt と ?? memo.txt を返す。',
				'左の欄はステージ、右の欄は作業ツリーの違いを表す。'
			],
			facts: [
				{ k: 'git status --short', v: ' M fruits.txt / ?? memo.txt' },
				{ k: ' M', v: '作業ツリーで変えた。まだステージに無い' },
				{ k: '??', v: 'まだ記録したことの無いファイル' }
			],
			scene: [
				{ op: 'appear', id: 'wt', label: WT, sub: 'fruits.txt・memo.txt', at: [0, 1] },
				{ op: 'appear', id: 'st', label: ST, sub: '前の記録と同じ', at: [2, 1] },
				{ op: 'appear', id: 'head', label: HEAD, sub: 'add fruits', at: [4, 1] }
			],
			log: {
				t: '0m',
				from: WT,
				to: HEAD,
				kind: 'status',
				info: 'fruits.txt が変わり、memo.txt が増えた'
			}
		},
		{
			n: 2,
			title: 'diff で作業ツリーとステージ',
			lead: 'git diff は、作業ツリーとステージの違いを行ごとに見せる',
			body: [
				'git diff は、-banana +blueberry と +date を返す。- は消した行、+ は足した行だ。',
				'@@ -1,3 +1,4 @@ は、元の 1 行目から 3 行が、1 行目から 4 行になった印だ。',
				'memo.txt は記録したことが無いので、diff には出ない。'
			],
			facts: [
				{ k: '消した行', v: '-banana' },
				{ k: '足した行', v: '+blueberry / +date' },
				{ k: '範囲', v: '@@ -1,3 +1,4 @@' }
			],
			scene: [
				{ op: 'move', from: 'wt', to: 'st', payload: '-banana +blueberry +date', kind: 'diff' },
				{ op: 'change', id: 'wt', k: 'fruits.txt', v: '4 行' }
			],
			log: { t: '1m', from: WT, to: ST, kind: 'diff', info: '1 行を替え、1 行を足した' }
		},
		{
			n: 3,
			title: 'diff --staged',
			lead: 'add した後の違いは、git diff --staged で見る',
			body: [
				'git add fruits.txt の後、git diff は何も返さない。',
				'git diff --staged は、ステージと記録の違いを返す。さっきと同じ -banana +blueberry +date だ。',
				'status --short は M  fruits.txt に変わり、M が左の欄に移った。'
			],
			facts: [
				{ k: 'add の後の git diff', v: '（何も出ない）' },
				{ k: 'git diff --staged', v: '-banana +blueberry +date' },
				{ k: 'git status --short', v: 'M  fruits.txt' }
			],
			scene: [
				{ op: 'move', from: 'wt', to: 'st', payload: 'git add fruits.txt', kind: 'add' },
				{ op: 'change', id: 'st', k: 'fruits.txt', v: '4 行' }
			],
			log: { t: '2m', from: ST, to: HEAD, kind: 'diff', info: 'ステージと記録の違いを見た' },
			why: '2 つの比べ方を分けておくと、次の記録に入る物と、まだ入らない物を、別々に確かめられる'
		},
		{
			n: 4,
			title: 'log で記録',
			lead: 'git log は、記録を新しい順に並べる',
			body: [
				'git commit -m "change fruits" の後、git log --oneline は 2 行を返す。',
				'上が新しい change fruits、下が前の add fruits だ。',
				'(HEAD -> main) は、今いる枝 main がこの記録を指している印だ。'
			],
			facts: [
				{ k: '1 行目', v: '(HEAD -> main) change fruits' },
				{ k: '2 行目', v: 'add fruits' },
				{ k: '記録の数', v: '2' }
			],
			scene: [
				{ op: 'move', from: 'st', to: 'head', payload: 'commit', kind: 'commit' },
				{ op: 'change', id: 'head', k: '最新', v: 'change fruits' }
			],
			log: { t: '3m', from: ST, to: HEAD, kind: 'commit', info: 'change fruits を記録した' }
		},
		{
			n: 5,
			title: 'log -p で中身',
			lead: 'log -p は、記録ごとに何を変えたかの diff も見せる',
			body: [
				'git log -p -n 1 は、最新の記録の diff を、記録の説明の下に出す。',
				'git diff HEAD~1 HEAD でも、1 つ前の記録と最新の違いが出る。HEAD~1 は 1 つ前の意味だ。',
				'どの記録で何が変わったかを、後から辿れる。'
			],
			facts: [
				{ k: 'HEAD~1', v: '1 つ前の記録（add fruits）' },
				{ k: 'git diff HEAD~1 HEAD', v: '-banana +blueberry +date' }
			],
			scene: [
				{ op: 'appear', id: 'prev', label: 'HEAD~1', sub: 'add fruits', at: [4, 2] },
				{ op: 'move', from: 'prev', to: 'head', payload: 'diff', kind: 'diff' }
			],
			log: { t: '4m', from: 'HEAD~1', to: HEAD, kind: 'diff', info: '1 つ前の記録との違いを見た' }
		},
		{
			n: 6,
			title: 'まだ記録しない物',
			lead: '記録したことの無いファイルは、?? のまま残る',
			body: [
				'commit の後も、git status --short は ?? memo.txt を返す。',
				'add しなかった物は、記録に入らない。commit は、ステージにある物だけを記録する。',
				'何を記録するかは、add で 1 つずつ選ぶ。'
			],
			facts: [
				{ k: 'commit の後の status', v: '?? memo.txt' },
				{ k: '記録に入った物', v: 'fruits.txt だけ' }
			],
			scene: [
				{ op: 'change', id: 'wt', k: 'memo.txt', v: '??（記録の外）' },
				{ op: 'highlight', id: 'wt' }
			],
			log: { t: '5m', from: WT, to: WT, kind: 'status', info: 'memo.txt は記録の外に残った' }
		}
	],
	example: {
		intro: '変えた物を status と diff で見て、記録し、log で見た（模擬は本物の記録と比べ済み）',
		lines: [
			'$ git status --short',
			' M fruits.txt',
			'?? memo.txt',
			'$ git diff',
			'diff --git a/fruits.txt b/fruits.txt',
			'index fde8dcd..a210ba3 100644',
			'--- a/fruits.txt',
			'+++ b/fruits.txt',
			'@@ -1,3 +1,4 @@',
			' apple',
			'-banana',
			'+blueberry',
			' cherry',
			'+date',
			'$ git add fruits.txt',
			'$ git diff --staged',
			'diff --git a/fruits.txt b/fruits.txt',
			'index fde8dcd..a210ba3 100644',
			'--- a/fruits.txt',
			'+++ b/fruits.txt',
			'@@ -1,3 +1,4 @@',
			' apple',
			'-banana',
			'+blueberry',
			' cherry',
			'+date',
			'$ git status --short',
			'M  fruits.txt',
			'?? memo.txt',
			'$ git commit -m "change fruits"',
			'[main 68a95d2] change fruits',
			' 1 file changed, 2 insertions(+), 1 deletion(-)',
			'$ git log --oneline',
			'68a95d2 (HEAD -> main) change fruits',
			'ed3c4fc add fruits',
			'$ git diff HEAD~1 HEAD',
			'diff --git a/fruits.txt b/fruits.txt',
			'index fde8dcd..a210ba3 100644',
			'--- a/fruits.txt',
			'+++ b/fruits.txt',
			'@@ -1,3 +1,4 @@',
			' apple',
			'-banana',
			'+blueberry',
			' cherry',
			'+date',
			'$ git status --short',
			'?? memo.txt'
		]
	},
	practice: {
		goal: 'fruits.txt の変更だけを "change fruits" として記録する。memo.txt は記録に入れない',
		tool: { name: 'git', mode: 'mock' },
		setup: {
			initialized: false,
			files: {},
			prelude: [
				'git init',
				"printf 'apple\\nbanana\\ncherry\\n' > fruits.txt",
				'git add fruits.txt',
				'git commit -m "add fruits"',
				"printf 'apple\\nblueberry\\ncherry\\ndate\\n' > fruits.txt",
				"printf 'memo\\n' > memo.txt"
			]
		},
		success: { commits: 2, tracked: ['fruits.txt'], statusShort: '?? memo.txt\n' },
		mistakes: [
			{
				when: 'git add . で memo.txt も載せて記録した',
				why: 'git add . は、作業場所の全てを載せる。memo.txt も記録に入った',
				next: '記録から 0 に戻し、git add fruits.txt と名前で選ぶ',
				match: 'create mode 100644 memo.txt'
			},
			{
				when: 'add をせずに commit した',
				why: 'ステージに変えた物が無い。commit はステージの物だけを記録する',
				next: '先に git add fruits.txt を打つ',
				match: 'no changes added to commit'
			},
			{
				when: 'ファイルの名前を打ち違えた',
				why: 'その名前のファイルは無い',
				next: 'git status --short で名前を確かめる',
				match: 'did not match any files'
			}
		]
	},
	check: [
		{ ask: ' M と M  の違い', how: '右の欄は作業ツリー、左の欄はステージの違い' },
		{ ask: 'add の後の違い', how: 'git diff --staged で見る' },
		{ ask: '記録の並び', how: 'git log --oneline は新しい順' }
	]
};
