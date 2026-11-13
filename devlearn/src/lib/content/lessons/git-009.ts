// git-009 記録しない物を決める（git 模擬）。
// 出力は全て、模擬の git で打って得た物。模擬は本物（git 2.56）の記録 tools-real/recorded/git-009-ignore.json と一字ずつ比べてある
// （commit の ID は、記録と模擬で時計が違うので別の値になる）。
// 場面：店の注文の小さな道具 app.py のフォルダに、鍵を書いた .env と、動かすたびに増える logs/ がある。
// 経過時刻 t は作業を始めた時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const WT = '作業ツリー';
const IGN = '.gitignore';
const LOG = '記録';

export const git009: Lesson = {
	id: 'git-009',
	field: 'git',
	level: 2,
	title: '記録しない物を決める',
	goal: '.gitignore で、記録に入れないファイルを決めることができる',
	prereq: ['git-002'],
	related: ['sec-013'],
	next: [],
	explain: [
		{
			n: 1,
			title: '記録したくない物',
			lead: '鍵や、動かすたびに変わる物は、記録に入れない',
			body: [
				'git status --short は ?? .env・?? app.py・?? logs/ の 3 行を返す。',
				'.env には鍵が、logs/ には動かした跡が入っている。',
				'鍵を記録すると、記録を受け取った全員に鍵が渡る。'
			],
			facts: [
				{ k: '記録したい', v: 'app.py' },
				{ k: '記録したくない', v: '.env（鍵）・logs/（跡）' }
			],
			scene: [
				{ op: 'appear', id: 'app', label: 'app.py', sub: '道具の本体', at: [0, 0] },
				{ op: 'appear', id: 'env', label: '.env', sub: '鍵', at: [0, 1] },
				{ op: 'appear', id: 'logs', label: 'logs/', sub: '動かした跡', at: [0, 2] },
				{ op: 'highlight', id: 'env' }
			],
			log: { t: '0m', from: WT, to: WT, kind: 'status', info: '3 つとも ?? （記録の外）' }
		},
		{
			n: 2,
			title: '.gitignore に書く',
			lead: '.gitignore に名前を 1 行ずつ書くと、git はその物を見ない',
			body: [
				'.gitignore に .env と logs/ の 2 行を書く。末尾の / はフォルダの印だ。',
				'.gitignore そのものは、記録に入れて皆で使う。'
			],
			facts: [
				{ k: '1 行目', v: '.env' },
				{ k: '2 行目', v: 'logs/' }
			],
			scene: [
				{ op: 'appear', id: 'ign', label: IGN, sub: '.env / logs/', at: [3, 1] },
				{ op: 'move', from: 'ign', to: 'env', payload: '見ない', kind: 'ignore' },
				{ op: 'move', from: 'ign', to: 'logs', payload: '見ない', kind: 'ignore' }
			],
			log: { t: '1m', from: IGN, to: WT, kind: 'ignore', info: '.env と logs/ を見ないと決めた' }
		},
		{
			n: 3,
			title: 'status から消える',
			lead: '書いた物は、git status の一覧に出なくなる',
			body: [
				'git status --short は ?? .gitignore と ?? app.py の 2 行になる。',
				'git check-ignore -v .env は、.gitignore の何行目が効いたかを返す。'
			],
			facts: [
				{ k: 'git status --short', v: '?? .gitignore / ?? app.py' },
				{ k: 'git check-ignore -v .env', v: '.gitignore:1:.env（タブ）.env' }
			],
			scene: [
				{ op: 'vanish', id: 'env' },
				{ op: 'vanish', id: 'logs' },
				{ op: 'change', id: 'app', k: 'status', v: '??' }
			],
			log: { t: '2m', from: WT, to: WT, kind: 'status', info: '.env と logs/ が一覧から消えた' }
		},
		{
			n: 4,
			title: '型で書く',
			lead: '* を使うと、同じ形の名前をまとめて書ける',
			body: [
				'*.log は、どのフォルダの .log で終わるファイルにも当たる。',
				'logs/ は、logs という名前のフォルダの中の全てに当たる。',
				'どの行が当たったかは、check-ignore -v で確かめる。'
			],
			facts: [
				{ k: '*.log', v: '.log で終わるファイル' },
				{ k: 'logs/', v: 'logs フォルダの中の全て' },
				{ k: 'check-ignore -v logs/app.log', v: '.gitignore:2:logs/（タブ）logs/app.log' }
			],
			scene: [
				{ op: 'change', id: 'ign', k: '型', v: '*.log・logs/' },
				{ op: 'highlight', id: 'ign' }
			],
			log: {
				t: '3m',
				from: IGN,
				to: 'logs/app.log',
				kind: 'ignore',
				info: '2 行目の logs/ が当たった'
			}
		},
		{
			n: 5,
			title: '既に記録した物',
			lead: '.gitignore は、記録に入れた後の物には効かない',
			body: [
				'.env を一度記録した後で .gitignore に書いても、.env は記録に残る。',
				'git は、記録に入っている物を、書き替えるたびに追い続ける。'
			],
			facts: [
				{ k: '効く物', v: 'まだ記録していない物' },
				{ k: '効かない物', v: '既に記録に入った物' }
			],
			scene: [
				{ op: 'appear', id: 'log', label: LOG, sub: 'app.py・.env', at: [6, 1] },
				{ op: 'highlight', id: 'log' }
			],
			log: { t: '4m', from: IGN, to: LOG, kind: 'ignore', info: '記録に入った .env には効かない' },
			why: '記録に入れた物が急に消えると、受け取った人の手元で何が起きたか分からなくなるため、git は明示の指示を待つ'
		},
		{
			n: 6,
			title: '外してから記録',
			lead: 'git rm --cached は、手元のファイルを残して記録から外す',
			body: [
				"git rm --cached .env は rm '.env' を返し、status は D  .env になる。",
				'commit すると、答えに delete mode 100644 .env が出る。手元の .env は残る。',
				'前の記録には鍵が残るので、鍵そのものも替える（sec-013）。'
			],
			facts: [
				{ k: 'git rm --cached .env の後', v: 'D  .env' },
				{ k: 'commit の答え', v: 'delete mode 100644 .env' },
				{ k: '手元の .env', v: '残る' }
			],
			scene: [
				{ op: 'move', from: 'log', to: 'ign', payload: 'rm --cached .env', kind: 'rm' },
				{ op: 'change', id: 'log', k: '中身', v: '.gitignore・app.py' }
			],
			log: { t: '6m', from: LOG, to: WT, kind: 'rm', info: '.env を記録から外し、手元には残した' }
		}
	],
	example: {
		intro: '.gitignore を書いて、記録に入れない物を決めた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ git init',
			'Initialized empty Git repository in /home/learner/demo/.git/',
			"$ printf 'print(1)\\n' > app.py",
			"$ printf 'SECRET=abc\\n' > .env",
			'$ mkdir logs',
			"$ printf 'log\\n' > logs/app.log",
			'$ git status --short',
			'?? .env',
			'?? app.py',
			'?? logs/',
			"$ printf '.env\\nlogs/\\n' > .gitignore",
			'$ git status --short',
			'?? .gitignore',
			'?? app.py',
			'$ git check-ignore -v .env',
			'.gitignore:1:.env\t.env',
			'$ git check-ignore -v logs/app.log',
			'.gitignore:2:logs/\tlogs/app.log',
			'$ git add .',
			'$ git status --short',
			'A  .gitignore',
			'A  app.py',
			'$ git add .env',
			'The following paths are ignored by one of your .gitignore files:',
			'.env',
			'hint: Use -f if you really want to add them.',
			'hint: Disable this message with "git config set advice.addIgnoredFile false"',
			'$ git commit -m "app"',
			'[main (root-commit) 67450d5] app',
			' 2 files changed, 3 insertions(+)',
			' create mode 100644 .gitignore',
			' create mode 100644 app.py'
		]
	},
	practice: {
		goal: '誤って記録した .env を、手元に残したまま記録から外す。.env と logs/ を .gitignore に書き、"ignore secrets" として記録する',
		tool: { name: 'git', mode: 'mock' },
		setup: {
			initialized: false,
			files: {},
			prelude: [
				'git init',
				"printf 'print(1)\\n' > app.py",
				"printf 'SECRET=abc\\n' > .env",
				'git add .',
				'git commit -m "app"',
				'mkdir logs',
				"printf 'log\\n' > logs/app.log"
			]
		},
		success: {
			commits: 2,
			tracked: ['.gitignore', 'app.py'],
			statusShort: '',
			files: { '.env': 'SECRET=abc\n' }
		},
		mistakes: [
			{
				when: '外した .env を、もう一度 add しようとした',
				why: '.gitignore に書いた物は、git add で載らない。外したままでよい',
				next: 'git status --short で D  .env を確かめ、そのまま commit する',
				match: 'paths are ignored'
			},
			{
				when: '外すファイルの名前を打ち違えた',
				why: 'その名前のファイルは記録に無い',
				next: 'git status --short で名前を確かめ、git rm --cached .env と打つ',
				match: 'did not match any files'
			}
		]
	},
	check: [
		{ ask: '.gitignore の 1 行', how: '記録に入れない名前か型（.env・logs/・*.log）' },
		{ ask: 'どの行が効いたか', how: 'git check-ignore -v ファイル' },
		{ ask: '既に記録した物を外す', how: 'git rm --cached ファイル の後に commit。手元には残る' }
	]
};
