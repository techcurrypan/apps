// git-007 遠くのリポジトリ（git 模擬）。
// 出力は全て、模擬の git で打って得た物。模擬は本物（git 2.56）の記録 tools-real/recorded/git-007-remote.json と一字ずつ比べてある
// （commit の ID は、記録と模擬で時計が違うので別の値になる）。
// 場面：パン屋の品書き menu.txt を、店主と店員の hanako が同じ遠くのリポジトリで共に直す。遠くは同じ機械の中の ../remote.git（作り物）。
// 経過時刻 t は店主が作業を始めた時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const MINE = '手元（店主）';
const REMOTE = '遠く origin';
const OTHER = '手元（hanako）';

export const git007: Lesson = {
	id: 'git-007',
	field: 'git',
	level: 2,
	title: '遠くのリポジトリ',
	goal: 'push・fetch・pull で、遠くのリポジトリと記録を合わせることができる',
	prereq: ['git-005'],
	related: [],
	next: ['git-008'],
	explain: [
		{
			n: 1,
			title: '遠くの置き場',
			lead: '遠くのリポジトリは、皆が記録を送り合う置き場だ',
			body: [
				'git remote add origin ../remote.git で、遠くに origin という名前を付ける。',
				'git remote -v は、その名前と場所を 2 行で返す。',
				'名前を付けただけでは、記録はまだ送られていない。'
			],
			facts: [
				{ k: '遠くの名前', v: 'origin' },
				{ k: '場所', v: '../remote.git' },
				{ k: '遠くの中身', v: '空' }
			],
			scene: [
				{ op: 'appear', id: 'mine', label: MINE, sub: 'menu', at: [0, 1] },
				{ op: 'appear', id: 'remote', label: REMOTE, sub: '空', at: [3, 1] },
				{ op: 'move', from: 'mine', to: 'remote', payload: 'remote add', kind: 'ref' }
			],
			log: { t: '0m', from: MINE, to: REMOTE, kind: 'remote', info: '遠くに origin と名前を付けた' }
		},
		{
			n: 2,
			title: 'push で送る',
			lead: 'git push は、手元の記録を遠くへ送る',
			body: [
				'git push -u origin main は、main の記録を origin へ送る。',
				'答えの * [new branch] main -> main は、遠くに main ができた印だ。',
				'-u は、この枝が遠くの main を追うと覚えさせる。次からは git push だけでよい。'
			],
			facts: [
				{ k: '答え', v: ' * [new branch]      main -> main' },
				{ k: '-u の後', v: "main は 'origin/main' を追う" }
			],
			scene: [
				{ op: 'move', from: 'mine', to: 'remote', payload: '記録 menu', kind: 'push' },
				{ op: 'change', id: 'remote', k: 'main', v: 'menu' }
			],
			log: { t: '1m', from: MINE, to: REMOTE, kind: 'push', info: 'main の記録 menu を送った' }
		},
		{
			n: 3,
			title: '他の人が送る',
			lead: 'hanako が遠くを写し、記録を足して送った',
			body: [
				'hanako は git clone ../remote.git ../hanako で、遠くを丸ごと写した。',
				'milk を足して記録し、git push で送った。',
				'遠くの main は add milk に進んだ。店主の手元は、まだそれを知らない。'
			],
			facts: [
				{ k: '遠くの main', v: 'add milk' },
				{ k: '店主の main', v: 'menu（1 件遅れ）' }
			],
			scene: [
				{ op: 'appear', id: 'other', label: OTHER, sub: 'add milk', at: [6, 1] },
				{ op: 'move', from: 'other', to: 'remote', payload: '記録 add milk', kind: 'push' },
				{ op: 'change', id: 'remote', k: 'main', v: 'add milk' }
			],
			log: { t: '3m', from: OTHER, to: REMOTE, kind: 'push', info: 'hanako が add milk を送った' }
		},
		{
			n: 4,
			title: 'fetch で受ける',
			lead: 'git fetch は、遠くの記録を受け取るが、手元の枝は動かさない',
			body: [
				'git fetch は、main -> origin/main の 1 行を返す。',
				'origin/main は、遠くの main が最後にどこを指していたかの控えだ。',
				'手元の main と作業ツリーは、menu のままだ。'
			],
			facts: [
				{ k: '答え', v: '前の ID..新しい ID  main -> origin/main' },
				{ k: 'origin/main', v: 'add milk' },
				{ k: '手元の main', v: 'menu' }
			],
			scene: [
				{ op: 'move', from: 'remote', to: 'mine', payload: '記録 add milk', kind: 'fetch' },
				{ op: 'change', id: 'mine', k: 'origin/main', v: 'add milk' }
			],
			log: {
				t: '4m',
				from: REMOTE,
				to: MINE,
				kind: 'fetch',
				info: '控えの origin/main だけが進んだ'
			}
		},
		{
			n: 5,
			title: '名札がずれる',
			lead: 'git status は、手元の枝が遠くの控えより遅れていると知らせる',
			body: [
				'git status は、behind … by 1 commit（1 件遅れ）と返す。',
				'遅れているだけなので、早送りで追いつける（can be fast-forwarded）。',
				'log --oneline --all は、origin/main が 1 件先にある形を見せる。'
			],
			facts: [
				{ k: 'git status', v: "behind 'origin/main' by 1 commit" },
				{ k: '追いつき方', v: '早送り' }
			],
			scene: [
				{ op: 'change', id: 'mine', k: 'main', v: 'menu（1 件遅れ）' },
				{ op: 'highlight', id: 'mine' }
			],
			log: {
				t: '5m',
				from: MINE,
				to: MINE,
				kind: 'status',
				info: 'main は origin/main より 1 件遅れ'
			},
			why: 'fetch と合わせを分けておくと、取り込む前に、遠くで何が変わったかを見られる'
		},
		{
			n: 6,
			title: 'pull で合わせる',
			lead: 'git pull は、fetch と合わせを続けて行う',
			body: [
				'git pull は Updating … Fast-forward を返し、main が add milk へ進む。',
				'cat menu.txt は bread と milk の 2 行になった。',
				'追いついた後で自分の記録を積めば、git push は早送りで通る。'
			],
			facts: [
				{ k: '答え', v: 'Fast-forward' },
				{ k: 'menu.txt', v: 'bread / milk' },
				{ k: '手元の main', v: 'add milk（遠くと同じ）' }
			],
			scene: [
				{ op: 'move', from: 'remote', to: 'mine', payload: 'pull', kind: 'pull' },
				{ op: 'change', id: 'mine', k: 'main', v: 'add milk' }
			],
			log: { t: '6m', from: REMOTE, to: MINE, kind: 'pull', info: '早送りで遠くに追いついた' }
		},
		{
			n: 7,
			title: '送る前に受ける',
			lead: '遠くが先に進んでいるときは、受けてから送る',
			body: [
				'遠くに知らない記録がある間は、本物の git push は rejected と断る。',
				'先に git pull で追いつき、その上に積んでから送る。',
				'送り終えると、git push は Everything up-to-date を返す。'
			],
			facts: [
				{ k: '順', v: 'pull → 記録 → push' },
				{ k: '送り終えた後の push', v: 'Everything up-to-date' }
			],
			scene: [
				{ op: 'move', from: 'mine', to: 'remote', payload: '記録 add notes', kind: 'push' },
				{ op: 'change', id: 'remote', k: 'main', v: 'add notes' }
			],
			log: {
				t: '9m',
				from: MINE,
				to: REMOTE,
				kind: 'push',
				info: '追いついてから add notes を送った'
			}
		}
	],
	example: {
		intro: '遠くを作って送り、他の人の記録を受けて合わせた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ git init --bare ../remote.git',
			'Initialized empty Git repository in /home/learner/remote.git/',
			'$ git init',
			'Initialized empty Git repository in /home/learner/demo/.git/',
			"$ printf 'bread\\n' > menu.txt",
			'$ git add menu.txt',
			'$ git commit -m "menu"',
			'[main (root-commit) bb409e3] menu',
			' 1 file changed, 1 insertion(+)',
			' create mode 100644 menu.txt',
			'$ git remote add origin ../remote.git',
			'$ git remote -v',
			'origin\t../remote.git (fetch)',
			'origin\t../remote.git (push)',
			'$ git push -u origin main',
			"branch 'main' set up to track 'origin/main'.",
			'To ../remote.git',
			' * [new branch]      main -> main',
			'$ git clone ../remote.git ../hanako',
			"Cloning into '../hanako'...",
			'done.',
			'$ cd ../hanako',
			"$ printf 'milk\\n' >> menu.txt",
			'$ git commit -am "add milk"',
			'[main 8881bfe] add milk',
			' 1 file changed, 1 insertion(+)',
			'$ git push',
			'To /home/learner/demo/../remote.git',
			'   bb409e3..8881bfe  main -> main',
			'$ cd ../demo',
			'$ git fetch',
			'From ../remote',
			'   bb409e3..8881bfe  main       -> origin/main',
			'$ git status',
			'On branch main',
			"Your branch is behind 'origin/main' by 1 commit, and can be fast-forwarded.",
			'  (use "git pull" to update your local branch)',
			'',
			'nothing to commit, working tree clean',
			'$ git log --oneline --all',
			'8881bfe (origin/main, origin/HEAD) add milk',
			'bb409e3 (HEAD -> main) menu',
			'$ git pull',
			'Updating bb409e3..8881bfe',
			'Fast-forward',
			' menu.txt | 1 +',
			' 1 file changed, 1 insertion(+)',
			'$ cat menu.txt',
			'bread',
			'milk',
			'$ git push',
			'Everything up-to-date'
		]
	},
	practice: {
		goal: 'hanako が送った add milk を取り込み、notes.txt を "add notes" として記録して、遠くへ送る',
		tool: { name: 'git', mode: 'mock' },
		setup: {
			initialized: false,
			files: {},
			prelude: [
				'git init --bare ../remote.git',
				'git init',
				"printf 'bread\\n' > menu.txt",
				'git add menu.txt',
				'git commit -m "menu"',
				'git remote add origin ../remote.git',
				'git push -u origin main',
				'git clone ../remote.git ../hanako',
				'cd ../hanako',
				"printf 'milk\\n' >> menu.txt",
				'git commit -am "add milk"',
				'git push',
				'cd ../demo'
			]
		},
		success: {
			commits: 3,
			tracked: ['menu.txt', 'notes.txt'],
			statusShort: '',
			files: { 'menu.txt': 'bread\nmilk\n' },
			pushed: ['main']
		},
		mistakes: [
			{
				when: '取り込む前に記録して push した',
				why: '遠くには add milk があり、手元の枝はその続きでない。本物は rejected と断る',
				next: '記録から 0 に戻し、先に git pull で追いついてから記録する',
				match: '早送りにならない git push'
			},
			{
				when: '記録してから pull した',
				why: '手元と遠くが別々に進み、早送りで追いつけない。模擬はこの合わせ方を扱わない',
				next: '記録から 0 に戻し、記録より先に git pull を打つ',
				match: '早送りにならない git pull'
			},
			{
				when: '送る枝の名前を打ち違えた',
				why: 'その名前の枝は手元に無い',
				next: 'git branch で名前を確かめ、git push と打つ',
				match: 'does not match any'
			}
		]
	},
	check: [
		{
			ask: 'fetch と pull の違い',
			how: 'fetch は控えの origin/main だけ、pull は手元の枝も進める'
		},
		{ ask: 'push が断られる時', how: '遠くに、手元の知らない記録がある' },
		{ ask: '-u の働き', how: '手元の枝が遠くのどの枝を追うかを覚えさせる' }
	]
};
