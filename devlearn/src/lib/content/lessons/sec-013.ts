// sec-013 秘密情報を置かない（git 模擬）。
// 出力は全て、模擬の git で打って得た物。模擬は本物（git 2.56）の記録 tools-real/recorded/sec-013-secrets.json と一字ずつ比べてある
// （commit の ID は、記録と模擬で時計が違うので別の値になる）。トークンは作り物の字で、本物の鍵ではない。
// 場面：店の小さなプログラム app.py と、外のサービスに入るためのトークンを書いた .env がある。経過時刻 t は作業を始めた時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const ENV = '.env';
const REPO = 'リポジトリ（履歴）';
const PUB = '公開したリポジトリ';

export const sec013: Lesson = {
	id: 'sec-013',
	field: 'sec',
	level: 2,
	title: '秘密情報を置かない',
	goal: '鍵やトークンを、リポジトリと履歴に入れない手順を取ることができる',
	prereq: ['lnx-008'],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '鍵を書いた',
			lead: 'トークンを、作業場所のファイル .env に書いた',
			body: [
				'.env の中身は TOKEN=example-not-a-real-token の 1 行だ。',
				'トークンは、外のサービスに「この店だ」と名乗る合言葉にあたる。',
				'git status --short は ?? .env と ?? app.py を返す。まだ記録の外だ。'
			],
			facts: [
				{ k: '.env', v: 'TOKEN=example-not-a-real-token' },
				{ k: 'git status --short', v: '?? .env / ?? app.py' }
			],
			scene: [
				{ op: 'appear', id: 'env', label: ENV, sub: 'TOKEN=…', at: [0, 0] },
				{ op: 'appear', id: 'app', label: 'app.py', sub: 'print(1)', at: [0, 2] }
			],
			log: { t: '0m', from: '作業場所', to: ENV, kind: 'write', info: 'トークンを .env に書いた' }
		},
		{
			n: 2,
			title: 'commit した',
			lead: 'git add . は、.env も一緒にステージに載せる',
			body: [
				'git add . の後、git status --short は A  .env と A  app.py を返す。',
				'そのまま git commit -m "first" を打つと、create mode 100644 .env と出る。',
				'トークンが、リポジトリの記録に入った。'
			],
			facts: [
				{ k: 'git add . の後', v: 'A  .env / A  app.py' },
				{ k: 'commit の出力', v: 'create mode 100644 .env' }
			],
			scene: [
				{ op: 'appear', id: 'repo', label: REPO, sub: 'commit 1 件', at: [2, 1] },
				{ op: 'move', from: 'env', to: 'repo', payload: 'TOKEN=…', kind: 'commit' }
			],
			log: { t: '2m', from: ENV, to: REPO, kind: 'commit', info: '.env が commit に入った' }
		},
		{
			n: 3,
			title: '消して commit',
			lead: 'git rm --cached で外し、.gitignore で二度と載せない',
			body: [
				'git rm --cached .env は、ファイルを残したまま記録の対象から外す。',
				'.gitignore に .env と書くと、git add . でも .env を載せない。',
				'2 つを commit すると、今の記録からは .env が消える。'
			],
			facts: [
				{ k: 'git rm --cached .env', v: "rm '.env'（ファイルは残る）" },
				{ k: '.gitignore', v: '.env' },
				{ k: '2 つ目の commit', v: 'delete mode 100644 .env' }
			],
			scene: [
				{ op: 'appear', id: 'ignore', label: '.gitignore', sub: '.env', at: [1, 0] },
				{ op: 'change', id: 'repo', k: '今の記録の .env', v: '無い' }
			],
			log: {
				t: '4m',
				from: '.gitignore',
				to: REPO,
				kind: 'commit',
				info: '.env を外す commit をした'
			}
		},
		{
			n: 4,
			title: '履歴に残る',
			lead: '消した commit の前の commit には、トークンがそのまま残る',
			body: [
				'git log -p -- .env は、1 つ目の commit で TOKEN の行を足したと示す。',
				'git show HEAD~1:.env は、今でも TOKEN=… をそのまま返す。',
				'リポジトリを公開すると、履歴ごと誰でも読める。'
			],
			facts: [
				{ k: 'git log -p -- .env', v: '+TOKEN=example-not-a-real-token' },
				{ k: 'git show HEAD~1:.env', v: 'TOKEN=example-not-a-real-token' }
			],
			scene: [
				{ op: 'appear', id: 'pub', label: PUB, sub: '誰でも読める', at: [4, 1] },
				{ op: 'move', from: 'repo', to: 'pub', payload: '履歴ごと', kind: 'push' },
				{ op: 'change', id: 'pub', k: '読める物', v: 'TOKEN=…（古い commit）' }
			],
			log: { t: '6m', from: REPO, to: PUB, kind: 'leak', info: '古い commit からトークンが読める' },
			why: 'git は全ての版を取っておくための道具なので、消した commit も、その前の版を消したことにはならない'
		},
		{
			n: 5,
			title: '鍵を替える',
			lead: '一度でも commit した鍵は、漏れた物として新しい鍵に替える',
			body: [
				'履歴を書き換える道具もあるが、写しを取った人の手元までは消せない。',
				'まず外のサービスで古いトークンを無効にし、新しいトークンを出す。',
				'新しいトークンは .env に書き、.gitignore があるので記録に入らない。'
			],
			facts: [
				{ k: '古いトークン', v: '無効にする' },
				{ k: '新しいトークン', v: '.env にだけ書く' },
				{ k: 'git status --short', v: '（何も出ない）' }
			],
			scene: [
				{ op: 'change', id: 'env', k: 'トークン', v: '新しい物' },
				{ op: 'change', id: 'pub', k: '古いトークン', v: '無効' }
			],
			log: { t: '10m', from: ENV, to: ENV, kind: 'rotate', info: '古いトークンを無効にし、替えた' }
		},
		{
			n: 6,
			title: '.gitignore と環境変数',
			lead: '初めから、秘密は記録の外に置き、動かす時に渡す',
			body: [
				'リポジトリを作ったら、最初の commit の前に .gitignore に .env を書く。',
				'プログラムは、トークンを環境変数 TOKEN から読む。値は動かす機械にだけ置く。',
				'git add . の前に git status --short を見て、.env が出ないことを確かめる。'
			],
			facts: [
				{ k: '最初の commit の前', v: '.gitignore に .env' },
				{ k: '読み方', v: '環境変数 TOKEN' },
				{ k: '確かめ', v: 'git status --short に .env が出ない' }
			],
			scene: [
				{ op: 'move', from: 'ignore', to: 'env', payload: '載せない', kind: 'ignore' },
				{ op: 'move', from: 'app', to: 'repo', payload: 'app.py だけ', kind: 'commit' }
			],
			log: {
				t: '12m',
				from: 'app.py',
				to: REPO,
				kind: 'commit',
				info: 'app.py と .gitignore だけを記録した'
			}
		}
	],
	example: {
		intro:
			'.env を入れてしまい、外したが、履歴に残っているのを確かめた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ git add .',
			'$ git status --short',
			'A  .env',
			'A  app.py',
			'$ git commit -m "first"',
			'[main (root-commit) 2b4ab3e] first',
			' 2 files changed, 2 insertions(+)',
			' create mode 100644 .env',
			' create mode 100644 app.py',
			'$ git rm --cached .env',
			"rm '.env'",
			"$ printf '.env\\n' > .gitignore",
			'$ git add .gitignore',
			'$ git commit -m "stop tracking .env"',
			'[main f638424] stop tracking .env',
			' 2 files changed, 1 insertion(+), 1 deletion(-)',
			' delete mode 100644 .env',
			' create mode 100644 .gitignore',
			'$ git log --oneline',
			'f638424 (HEAD -> main) stop tracking .env',
			'2b4ab3e first',
			'$ git show HEAD~1:.env',
			'TOKEN=example-not-a-real-token'
		]
	},
	practice: {
		goal: 'app.py を初めての commit にする。.env は記録に入れず、.gitignore で外す',
		tool: { name: 'git', mode: 'mock' },
		setup: {
			cwd: '/home/learner/demo',
			initialized: true,
			files: { 'app.py': 'print(1)\n', '.env': 'TOKEN=example-not-a-real-token\n' },
			index: {},
			commits: []
		},
		success: { commits: 1, tracked: ['.gitignore', 'app.py'], statusShort: '' },
		mistakes: [
			{
				when: '.gitignore を作る前に git add . を打った',
				why: '.env がステージに載った。このまま commit すると、トークンが履歴に入る',
				next: "git rm --cached .env で外し、printf '.env\\n' > .gitignore を作ってから git add . を打つ",
				match: 'A  .env'
			},
			{
				when: '.env を入れたまま commit した',
				why: 'トークンが履歴に入った。後で消しても、この commit からは読める',
				next: '左の記録で commit の前まで戻し、.env を外してから commit し直す（本物なら鍵も替える）',
				match: 'create mode 100644 .env'
			},
			{
				when: 'まだ無いファイルを git add した',
				why: 'その名前のファイルは作業場所に無い',
				next: 'ls -a で名前を確かめる。.gitignore は先に printf で作る',
				match: 'did not match any files'
			}
		]
	},
	check: [
		{ ask: '記録から外す命令', how: 'git rm --cached .env（ファイルは残る）' },
		{ ask: '消した後も読める所', how: 'git show HEAD~1:.env（前の commit）' },
		{ ask: '一度 commit した鍵', how: '漏れた物として、無効にして替える' }
	]
};
