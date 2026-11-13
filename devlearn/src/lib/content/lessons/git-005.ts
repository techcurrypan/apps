// git-005 枝を合わせる（git 模擬）。
// 出力は全て、模擬の git で打って得た物。模擬は本物（git 2.56）の記録 tools-real/recorded/git-005-merge.json と一字ずつ比べてある
// （commit の ID は、記録と模擬で時計が違うので別の値になる）。
// 場面：品書き menu.txt に牛乳を足す案（枝 feature）が良かったので、本番の main に合わせる。経過時刻 t は作業を始めた時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const MAIN = '枝 main';
const FEAT = '枝 feature';

export const git005: Lesson = {
	id: 'git-005',
	field: 'git',
	level: 2,
	title: '枝を合わせる',
	goal: 'merge が早送りと合流の記録のどちらになるかを見分けることができる',
	prereq: ['git-004'],
	related: [],
	next: ['git-006', 'git-007'],
	explain: [
		{
			n: 1,
			title: '2 本の枝',
			lead: 'main と feature は、同じ記録 menu から分かれている',
			body: [
				'log --graph --all は、menu の上に add milk が載った形を返す。',
				'main は menu を、feature は add milk を指している。',
				'git merge 枝 は、その枝の記録を今いる枝に取り込む。'
			],
			facts: [
				{ k: 'main', v: 'menu' },
				{ k: 'feature', v: 'add milk（menu の次）' }
			],
			scene: [
				{ op: 'appear', id: 'c1', label: '記録 menu', sub: 'bread', at: [1, 1] },
				{ op: 'appear', id: 'c2', label: '記録 add milk', sub: FEAT, at: [3, 2] },
				{ op: 'appear', id: 'main', label: MAIN, sub: 'HEAD', at: [1, 0] },
				{ op: 'move', from: 'main', to: 'c1', payload: '指す', kind: 'ref' }
			],
			log: {
				t: '0m',
				from: MAIN,
				to: '記録 menu',
				kind: 'ref',
				info: 'main は menu、feature は add milk'
			}
		},
		{
			n: 2,
			title: '片方だけ進んだ',
			lead: 'main は分かれた所から 1 件も進んでいない',
			body: [
				'main の後に記録は無い。feature だけが 1 件先にある。',
				'このとき、feature の記録は main の記録の続きになっている。',
				'取り込むのに、新しい記録を作る要が無い。'
			],
			facts: [
				{ k: 'main が分かれてから進んだ数', v: '0' },
				{ k: 'feature が進んだ数', v: '1' }
			],
			scene: [
				{ op: 'move', from: 'c1', to: 'c2', payload: '続き', kind: 'parent' },
				{ op: 'change', id: 'main', k: '進んだ数', v: '0' }
			],
			log: {
				t: '1m',
				from: '記録 menu',
				to: '記録 add milk',
				kind: 'graph',
				info: 'feature は main の続き'
			}
		},
		{
			n: 3,
			title: '早送り',
			lead: '続きなら、main の名札を先へ動かすだけで合う',
			body: [
				'main で git merge feature を打つと、Updating … Fast-forward を返す。',
				'新しい記録は作らず、main の名札を add milk へ動かした。これを早送りと呼ぶ。',
				'log は一本道のままで、記録の数は 2 件だ。'
			],
			facts: [
				{ k: '答え', v: 'Fast-forward' },
				{ k: '新しい記録', v: '無い' },
				{ k: 'main', v: 'menu → add milk' }
			],
			scene: [
				{ op: 'move', from: 'main', to: 'c2', payload: '名札を動かす', kind: 'ff' },
				{ op: 'change', id: 'main', k: '指す記録', v: 'add milk' }
			],
			log: {
				t: '2m',
				from: MAIN,
				to: '記録 add milk',
				kind: 'merge',
				info: 'Fast-forward：名札を動かした'
			}
		},
		{
			n: 4,
			title: '両方が進んだ',
			lead: '分かれた後に両方の枝で記録すると、一本道に並ばない',
			body: [
				'枝 topic で add jam を記録し、main でも add notes を記録した。',
				'log --graph は、main と topic の 2 本の線に分かれる。',
				'どちらも相手の続きでないので、名札を動かすだけでは合わない。'
			],
			facts: [
				{ k: 'topic', v: 'add jam' },
				{ k: 'main', v: 'add notes' },
				{ k: '形', v: '2 本に分かれた' }
			],
			scene: [
				{ op: 'appear', id: 'c3', label: '記録 add jam', sub: 'topic', at: [5, 2] },
				{ op: 'appear', id: 'c4', label: '記録 add notes', sub: 'main', at: [5, 0] },
				{ op: 'move', from: 'main', to: 'c4', payload: '指す', kind: 'ref' }
			],
			log: {
				t: '5m',
				from: MAIN,
				to: '記録 add notes',
				kind: 'graph',
				info: '両方の枝が 1 件ずつ進んだ'
			}
		},
		{
			n: 5,
			title: '合流の記録',
			lead: '両方が進んだときは、2 つを合わせた新しい記録を作る',
			body: [
				'main で git merge topic を打つと、合流の記録ができる。',
				'menu.txt に jam が入り、notes.txt もそろう。',
				'log --graph は、2 本の線が 1 つに戻る形になる。'
			],
			facts: [
				{ k: '答え', v: "Merge made by the 'ort' strategy." },
				{ k: '新しい記録', v: "Merge branch 'topic'" }
			],
			scene: [
				{ op: 'appear', id: 'm', label: '合流の記録', sub: "Merge branch 'topic'", at: [7, 1] },
				{ op: 'move', from: 'c4', to: 'm', payload: '親 1', kind: 'parent' },
				{ op: 'move', from: 'c3', to: 'm', payload: '親 2', kind: 'parent' }
			],
			log: {
				t: '6m',
				from: '記録 add jam',
				to: '合流の記録',
				kind: 'merge',
				info: '2 本を合わせる記録を作った'
			},
			why: '両方の変更を残したまま 1 つにするには、2 つの記録を親に持つ新しい記録が要る'
		},
		{
			n: 6,
			title: '親が 2 つ',
			lead: '合流の記録は、親を 2 つ持つ',
			body: [
				'git show の Merge: の行に、親 2 つの ID が並ぶ。ふつうの記録の親は 1 つだ。',
				'早送りは親 1 つのまま、合流は親 2 つの記録が増える。',
				'どちらになるかは、今いる枝が分かれた後に進んだかで決まる。'
			],
			facts: [
				{ k: '合流の記録の親', v: '2（add notes・add jam）' },
				{ k: '早送り', v: '記録は増えない' },
				{ k: '合流', v: '親 2 つの記録が 1 件増える' }
			],
			scene: [
				{ op: 'change', id: 'm', k: '親', v: '2' },
				{ op: 'move', from: 'main', to: 'm', payload: '指す', kind: 'ref' }
			],
			log: {
				t: '7m',
				from: MAIN,
				to: '合流の記録',
				kind: 'ref',
				info: 'main は親 2 つの記録を指す'
			}
		}
	],
	example: {
		intro:
			'一本道の枝は早送りで、2 本に分かれた枝は合流の記録で合わせた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ git log --oneline --graph --all',
			'* c153817 (feature) add milk',
			'* 5d290c3 (HEAD -> main) menu',
			'$ git merge feature',
			'Updating 5d290c3..c153817',
			'Fast-forward',
			' menu.txt | 1 +',
			' 1 file changed, 1 insertion(+)',
			'$ git log --oneline',
			'c153817 (HEAD -> main, feature) add milk',
			'5d290c3 menu',
			'$ git switch -c topic',
			"Switched to a new branch 'topic'",
			"$ printf 'jam\\n' >> menu.txt",
			'$ git commit -am "add jam"',
			'[topic d6408f8] add jam',
			' 1 file changed, 1 insertion(+)',
			'$ git switch main',
			"Switched to branch 'main'",
			"$ printf 'open 7:00\\n' > notes.txt",
			'$ git add notes.txt',
			'$ git commit -m "add notes"',
			'[main 0151b5c] add notes',
			' 1 file changed, 1 insertion(+)',
			' create mode 100644 notes.txt',
			'$ git log --oneline --graph --all',
			'* 0151b5c (HEAD -> main) add notes',
			'| * d6408f8 (topic) add jam',
			'|/  ',
			'* c153817 (feature) add milk',
			'* 5d290c3 menu',
			'$ git merge topic',
			"Merge made by the 'ort' strategy.",
			' menu.txt | 1 +',
			' 1 file changed, 1 insertion(+)',
			'$ git log --oneline --graph',
			"*   27aca68 (HEAD -> main) Merge branch 'topic'",
			'|\\  ',
			'| * d6408f8 (topic) add jam',
			'* | 0151b5c add notes',
			'|/  ',
			'* c153817 (feature) add milk',
			'* 5d290c3 menu',
			'$ git show --stat HEAD',
			'commit 27aca688bf750efbc55168649f6065867cedf139 (HEAD -> main)',
			'Merge: 0151b5c d6408f8',
			'Author: learner <learner@example.com>',
			'Date:   Tue Nov 10 09:19:00 2026 +0900',
			'',
			"    Merge branch 'topic'",
			'',
			' menu.txt | 1 +',
			' 1 file changed, 1 insertion(+)'
		]
	},
	practice: {
		goal: 'main にいる。feature の add milk を main に合わせる（両方が進んでいるので、合流の記録になる）',
		tool: { name: 'git', mode: 'mock' },
		setup: {
			initialized: false,
			files: {},
			prelude: [
				'git init',
				"printf 'bread\\n' > menu.txt",
				'git add menu.txt',
				'git commit -m "menu"',
				'git switch -c feature',
				"printf 'milk\\n' >> menu.txt",
				'git commit -am "add milk"',
				'git switch main',
				"printf 'open 7:00\\n' > notes.txt",
				'git add notes.txt',
				'git commit -m "add notes"'
			]
		},
		success: {
			commits: 4,
			tracked: ['menu.txt', 'notes.txt'],
			statusShort: '',
			branch: 'main',
			branches: { main: 4, feature: 2 },
			parents: 2,
			files: { 'menu.txt': 'bread\nmilk\n' }
		},
		mistakes: [
			{
				when: 'feature に移ってから合わせようとした',
				why: '合わせた記録は、今いる枝に入る。feature で合わせると、main は元のままだ',
				next: 'git switch main で戻り、main のまま git merge feature と打つ',
				match: "Switched to branch 'feature'"
			},
			{
				when: '枝の名前を打ち違えた',
				why: 'その名前の枝は無い',
				next: 'git branch で名前を確かめ、git merge feature と打つ',
				match: 'not something we can merge'
			},
			{
				when: '同じ枝をもう一度合わせた',
				why: 'feature の記録は、もう main に入っている',
				next: 'git log --oneline --graph --all で、合流の記録があるかを見る',
				match: 'Already up to date'
			}
		]
	},
	check: [
		{ ask: '早送りになる時', how: '今いる枝が、分かれた後に 1 件も進んでいない' },
		{ ask: '合流の記録になる時', how: '両方の枝が、分かれた後に進んでいる' },
		{ ask: '合流の記録の親', how: '2 つ' }
	]
};
