// git-004 枝を作る（git 模擬）。
// 出力は全て、模擬の git で打って得た物。模擬は本物（git 2.56）の記録 tools-real/recorded/git-004-branch.json と一字ずつ比べてある
// （commit の ID は、記録と模擬で時計が違うので別の値になる）。
// 場面：パン屋の品書き menu.txt に、牛乳を足す案を試す。本番の main は崩したくない。経過時刻 t は作業を始めた時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const MAIN = '枝 main';
const FEAT = '枝 feature';
const C1 = '記録 menu';

export const git004: Lesson = {
	id: 'git-004',
	field: 'git',
	level: 2,
	title: '枝を作る',
	goal: 'branch と switch で枝を作り、記録を分けて積むことができる',
	prereq: ['git-002'],
	related: [],
	next: ['git-005'],
	explain: [
		{
			n: 1,
			title: '今の枝',
			lead: '枝は、記録を指す名札。HEAD は今いる枝を指す',
			body: [
				'git branch は * main を返す。枝は main の 1 本で、* が今いる枝だ。',
				'main は、最新の記録 menu を指している。',
				'記録を足すと、今いる枝の名札が新しい記録へ進む。'
			],
			facts: [
				{ k: 'git branch', v: '* main' },
				{ k: 'main が指す記録', v: 'menu' }
			],
			scene: [
				{ op: 'appear', id: 'c1', label: C1, sub: 'bread', at: [1, 1] },
				{ op: 'appear', id: 'main', label: MAIN, sub: 'HEAD', at: [1, 0] },
				{ op: 'move', from: 'main', to: 'c1', payload: '指す', kind: 'ref' }
			],
			log: { t: '0m', from: MAIN, to: C1, kind: 'ref', info: 'main は menu を指す' }
		},
		{
			n: 2,
			title: 'branch で名札を足す',
			lead: 'git branch 名前 は、今の記録を指す名札を 1 つ足す',
			body: [
				'git branch feature の後、git branch は 2 行を返す。',
				'feature も、同じ記録 menu を指している。記録は増えていない。',
				'名札を足すだけなので、一瞬で終わり、場所もほとんど取らない。'
			],
			facts: [
				{ k: 'git branch', v: '  feature / * main' },
				{ k: 'feature が指す記録', v: 'menu（main と同じ）' }
			],
			scene: [
				{ op: 'appear', id: 'feat', label: FEAT, sub: '名札', at: [1, 2] },
				{ op: 'move', from: 'feat', to: 'c1', payload: '指す', kind: 'ref' }
			],
			log: { t: '1m', from: FEAT, to: C1, kind: 'branch', info: 'feature の名札を足した' },
			why: '枝は記録を写さず名札だけなので、試しの枝を気軽に何本も作れる'
		},
		{
			n: 3,
			title: 'switch で移る',
			lead: 'git switch 名前 で、HEAD をその枝へ移す',
			body: [
				"git switch feature は Switched to branch 'feature' を返す。",
				'git branch は * feature を返し、今いる枝が替わった。',
				'作って同時に移るなら git switch -c feature と打つ。'
			],
			facts: [
				{ k: '答え', v: "Switched to branch 'feature'" },
				{ k: '作って移る', v: 'git switch -c 名前' }
			],
			scene: [
				{ op: 'change', id: 'feat', k: 'HEAD', v: 'ここ' },
				{ op: 'change', id: 'main', k: 'HEAD', v: '（離れた）' }
			],
			log: { t: '2m', from: MAIN, to: FEAT, kind: 'switch', info: 'HEAD を feature に移した' }
		},
		{
			n: 4,
			title: '記録を積む',
			lead: '移った枝で記録すると、その枝の名札だけが進む',
			body: [
				'menu.txt に milk を足して commit -am "add milk" と打つ。答えは [feature …] add milk だ。',
				'feature は新しい記録 add milk を指し、main は menu のままだ。',
				'git log --oneline --all は 2 件を返し、上の行に (HEAD -> feature) と付く。'
			],
			facts: [
				{ k: '答え', v: '[feature …] add milk' },
				{ k: 'feature', v: 'add milk' },
				{ k: 'main', v: 'menu（変わらない）' }
			],
			scene: [
				{ op: 'appear', id: 'c2', label: '記録 add milk', sub: 'bread・milk', at: [3, 2] },
				{ op: 'move', from: 'c1', to: 'c2', payload: '親', kind: 'commit' },
				{ op: 'move', from: 'feat', to: 'c2', payload: '指す', kind: 'ref' }
			],
			log: {
				t: '3m',
				from: FEAT,
				to: '記録 add milk',
				kind: 'commit',
				info: 'feature だけが進んだ'
			}
		},
		{
			n: 5,
			title: '元の枝へ戻る',
			lead: 'switch main で、作業ツリーも main の中身に替わる',
			body: [
				'git switch main の後、cat menu.txt は bread の 1 行だけを返す。',
				'switch は、HEAD を移し、作業ツリーをその枝の記録の中身に書き替える。',
				'feature の milk は消えたのでなく、feature の記録に残っている。'
			],
			facts: [
				{ k: 'main の menu.txt', v: 'bread' },
				{ k: 'feature の menu.txt', v: 'bread / milk' }
			],
			scene: [
				{ op: 'change', id: 'main', k: 'HEAD', v: 'ここ' },
				{ op: 'change', id: 'feat', k: 'HEAD', v: '（離れた）' }
			],
			log: {
				t: '4m',
				from: FEAT,
				to: MAIN,
				kind: 'switch',
				info: 'main に戻り、menu.txt は bread だけ'
			}
		},
		{
			n: 6,
			title: '枝ごとに中身が違う',
			lead: '同じ作業場所で、枝を替えるだけで中身を行き来できる',
			body: [
				'git log --oneline --all は 2 行を返す。',
				'main は 1 件、feature は 2 件の記録を辿れる。',
				'試しが良ければ main に合わせ、駄目なら feature を捨てる（git-005）。'
			],
			facts: [
				{ k: 'main で辿れる記録', v: '1' },
				{ k: 'feature で辿れる記録', v: '2' }
			],
			scene: [
				{ op: 'change', id: 'main', k: '記録', v: '1 件' },
				{ op: 'change', id: 'feat', k: '記録', v: '2 件' }
			],
			log: { t: '5m', from: MAIN, to: FEAT, kind: 'log', info: 'main は 1 件、feature は 2 件' }
		}
	],
	example: {
		intro: '名札を足し、移って記録し、戻った（模擬は本物の記録と比べ済み）',
		lines: [
			'$ git branch',
			'* main',
			'$ git branch feature',
			'$ git branch',
			'  feature',
			'* main',
			'$ git switch feature',
			"Switched to branch 'feature'",
			"$ printf 'milk\\n' >> menu.txt",
			'$ git commit -am "add milk"',
			'[feature d071fdb] add milk',
			' 1 file changed, 1 insertion(+)',
			'$ git log --oneline --all',
			'd071fdb (HEAD -> feature) add milk',
			'5d290c3 (main) menu',
			'$ git switch main',
			"Switched to branch 'main'",
			'$ cat menu.txt',
			'bread',
			'$ git log --oneline --all',
			'd071fdb (feature) add milk',
			'5d290c3 (HEAD -> main) menu'
		]
	},
	practice: {
		goal: '枝 feature を作って移り、menu.txt に milk の行を足して記録する。main は元のままにする',
		tool: { name: 'git', mode: 'mock' },
		setup: {
			initialized: false,
			files: {},
			prelude: [
				'git init',
				"printf 'bread\\n' > menu.txt",
				'git add menu.txt',
				'git commit -m "menu"'
			]
		},
		success: {
			commits: 2,
			tracked: ['menu.txt'],
			statusShort: '',
			branch: 'feature',
			branches: { main: 1, feature: 2 },
			files: { 'menu.txt': 'bread\nmilk\n' }
		},
		mistakes: [
			{
				when: 'main のまま記録した',
				why: '記録は今いる枝に積まれる。main が進んでしまった',
				next: '記録から 0 に戻し、先に git switch -c feature で移る',
				match: '[main '
			},
			{
				when: 'まだ無い枝に switch した',
				why: 'feature はまだ作っていない',
				next: '作って移る git switch -c feature と打つ',
				match: 'invalid reference'
			},
			{
				when: '同じ名前の枝をもう一度作った',
				why: 'feature は既にある',
				next: 'git switch feature で移る',
				match: 'already exists'
			}
		]
	},
	check: [
		{ ask: '枝の正体', how: '記録を指す名札（記録は写さない）' },
		{ ask: '記録が積まれる枝', how: 'HEAD が指す、今いる枝' },
		{ ask: '枝ごとの中身', how: 'main の menu.txt は bread、feature は bread / milk' }
	]
};
