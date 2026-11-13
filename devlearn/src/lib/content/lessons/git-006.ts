// git-006 衝突を解く（git 模擬）。
// 出力は全て、模擬の git で打って得た物。模擬は本物（git 2.56）の記録 tools-real/recorded/git-006-conflict.json と一字ずつ比べてある
// （commit の ID は、記録と模擬で時計が違うので別の値になる）。
// 場面：品書き menu.txt の食パンの値段を、枝 price では 130 に、main では 150 に書き替えた。店主は 130 に決めた。
// 経過時刻 t は合わせ始めた時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const MAIN = '枝 main（150）';
const PRICE = '枝 price（130）';
const FILE = 'menu.txt';

export const git006: Lesson = {
	id: 'git-006',
	field: 'git',
	level: 2,
	title: '衝突を解く',
	goal: '同じ行を変えた 2 本の枝の衝突を、手で解いて合わせることができる',
	prereq: ['git-005'],
	related: [],
	next: ['git-010'],
	explain: [
		{
			n: 1,
			title: '同じ行を変えた',
			lead: '2 本の枝が、同じファイルの同じ行を別々に書き替えた',
			body: [
				'元の menu.txt は bread 120 の 1 行だ。',
				'枝 price は bread 130 に、main は bread 150 に替えて、それぞれ記録した。',
				'違う行なら git が両方を取り込めるが、同じ行ではどちらを取るか決められない。'
			],
			facts: [
				{ k: '元', v: 'bread 120' },
				{ k: 'price', v: 'bread 130' },
				{ k: 'main', v: 'bread 150' }
			],
			scene: [
				{ op: 'appear', id: 'main', label: MAIN, sub: 'HEAD', at: [0, 0] },
				{ op: 'appear', id: 'price', label: PRICE, sub: 'raise to 130', at: [0, 2] },
				{ op: 'appear', id: 'file', label: FILE, sub: 'bread 120', at: [3, 1] }
			],
			log: {
				t: '0m',
				from: MAIN,
				to: PRICE,
				kind: 'graph',
				info: '同じ 1 行を 150 と 130 に替えた'
			}
		},
		{
			n: 2,
			title: 'merge が止まる',
			lead: 'git merge は CONFLICT と返し、記録を作らずに止まる',
			body: [
				'main で git merge price を打つと、CONFLICT の行が出る。',
				'終わりの行は、衝突を解いてから commit せよと言う。',
				'git status --short は UU menu.txt。U は「解けていない」の印だ。'
			],
			facts: [
				{ k: '答え', v: 'CONFLICT (content): Merge conflict in menu.txt' },
				{ k: '終了コード', v: '1' },
				{ k: 'git status --short', v: 'UU menu.txt' }
			],
			scene: [
				{ op: 'move', from: 'price', to: 'main', payload: 'git merge price', kind: 'merge' },
				{ op: 'change', id: 'file', k: '状態', v: 'UU（解けていない）' }
			],
			log: { t: '1m', from: PRICE, to: MAIN, kind: 'conflict', info: 'menu.txt で衝突して止まった' }
		},
		{
			n: 3,
			title: '印の付いた行',
			lead: 'ファイルには、両方の行が印で区切られて入る',
			body: [
				'cat menu.txt は 5 行を返す。<<<<<<< HEAD と ======= の間が今の枝 main の bread 150 だ。',
				'======= と >>>>>>> price の間が、取り込む枝の bread 130 だ。',
				'この印のままでは、品書きとして使えない。'
			],
			facts: [
				{ k: '1 行目', v: '<<<<<<< HEAD' },
				{ k: 'main の行', v: 'bread 150' },
				{ k: 'price の行', v: 'bread 130' }
			],
			scene: [
				{ op: 'change', id: 'file', k: '中身', v: '<<<<<<< / 150 / ======= / 130 / >>>>>>>' },
				{ op: 'highlight', id: 'file' }
			],
			log: { t: '2m', from: FILE, to: FILE, kind: 'markers', info: '150 と 130 が印で並んだ' }
		},
		{
			n: 4,
			title: '手で選ぶ',
			lead: '人が中身を決めて、印の無い形に書き直す',
			body: [
				'店主は 130 に決めた。menu.txt を bread 130 の 1 行に書き直す。',
				"ここでは printf 'bread 130\\n' > menu.txt で書き直す。",
				'<<<<<<< ======= >>>>>>> の印を全て消すことを忘れない。'
			],
			facts: [
				{ k: '決めた値', v: 'bread 130' },
				{ k: '書き直した menu.txt', v: 'bread 130（1 行）' }
			],
			scene: [
				{ op: 'change', id: 'file', k: '中身', v: 'bread 130' },
				{ op: 'move', from: 'price', to: 'file', payload: '130 を選んだ', kind: 'choose' }
			],
			log: { t: '3m', from: PRICE, to: FILE, kind: 'resolve', info: '130 を選んで印を消した' },
			why: 'どちらが正しいかは中身の意味で決まり、git には分からないので、人が決める'
		},
		{
			n: 5,
			title: 'add で解いた印',
			lead: 'git add で、そのファイルは解けたと知らせる',
			body: [
				'git add menu.txt の後、git status --short は M  menu.txt になる。',
				'add の前に commit すると、Committing is not possible で止まる。',
				'解いたファイルは、1 つずつ add する。'
			],
			facts: [
				{ k: 'add の後', v: 'M  menu.txt' },
				{ k: 'add の前の commit', v: 'error: Committing is not possible …' }
			],
			scene: [
				{ op: 'change', id: 'file', k: '状態', v: 'M（解けた）' },
				{ op: 'move', from: 'file', to: 'main', payload: 'git add', kind: 'add' }
			],
			log: { t: '4m', from: FILE, to: MAIN, kind: 'add', info: 'menu.txt は解けたと知らせた' }
		},
		{
			n: 6,
			title: 'commit で合流',
			lead: 'commit で、親 2 つの合流の記録ができる',
			body: [
				'git commit -m "merge price" で、合流の記録ができる。',
				'log --graph は、raise to 150 と raise to 130 の 2 本が 1 つに戻る形だ。',
				'main の menu.txt は bread 130 になった。'
			],
			facts: [
				{ k: '合流の記録', v: 'merge price（親 2 つ）' },
				{ k: 'menu.txt', v: 'bread 130' }
			],
			scene: [
				{ op: 'appear', id: 'm', label: '合流の記録', sub: 'merge price', at: [5, 1] },
				{ op: 'move', from: 'main', to: 'm', payload: '親 1', kind: 'parent' },
				{ op: 'move', from: 'price', to: 'm', payload: '親 2', kind: 'parent' }
			],
			log: {
				t: '5m',
				from: MAIN,
				to: '合流の記録',
				kind: 'commit',
				info: '解いた中身で合流の記録を作った'
			}
		}
	],
	example: {
		intro: '衝突させ、印を見て、手で解いて合わせた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ git merge price',
			'Auto-merging menu.txt',
			'CONFLICT (content): Merge conflict in menu.txt',
			'Automatic merge failed; fix conflicts and then commit the result.',
			'$ git status --short',
			'UU menu.txt',
			'$ cat menu.txt',
			'<<<<<<< HEAD',
			'bread 150',
			'=======',
			'bread 130',
			'>>>>>>> price',
			'$ git commit -m "merge price"',
			'U\tmenu.txt',
			'error: Committing is not possible because you have unmerged files.',
			"hint: Fix them up in the work tree, and then use 'git add/rm <file>'",
			'hint: as appropriate to mark resolution and make a commit.',
			'fatal: Exiting because of an unresolved conflict.',
			"$ printf 'bread 130\\n' > menu.txt",
			'$ git add menu.txt',
			'$ git status --short',
			'M  menu.txt',
			'$ git commit -m "merge price"',
			'[main db124f5] merge price',
			'$ git log --oneline --graph',
			'*   db124f5 (HEAD -> main) merge price',
			'|\\  ',
			'| * b57de7a (price) raise to 130',
			'* | e59e464 raise to 150',
			'|/  ',
			'* 3756b67 menu',
			'$ cat menu.txt',
			'bread 130'
		]
	},
	practice: {
		goal: 'main にいる。枝 price を合わせ、衝突した食パンの値段は 130 に決めて記録する',
		tool: { name: 'git', mode: 'mock' },
		setup: {
			initialized: false,
			files: {},
			prelude: [
				'git init',
				"printf 'bread 120\\n' > menu.txt",
				'git add menu.txt',
				'git commit -m "menu"',
				'git switch -c price',
				"printf 'bread 130\\n' > menu.txt",
				'git commit -am "raise to 130"',
				'git switch main',
				"printf 'bread 150\\n' > menu.txt",
				'git commit -am "raise to 150"'
			]
		},
		success: {
			commits: 4,
			tracked: ['menu.txt'],
			statusShort: '',
			branch: 'main',
			parents: 2,
			files: { 'menu.txt': 'bread 130\n' }
		},
		mistakes: [
			{
				when: '解いて add する前に commit した',
				why: 'menu.txt はまだ解けていない（UU）。git は記録を作らない',
				next: "printf 'bread 130\\n' > menu.txt で書き直し、git add menu.txt の後に commit する",
				match: 'Committing is not possible'
			},
			{
				when: '枝の名前を打ち違えた',
				why: 'その名前の枝は無い',
				next: 'git merge price と打つ',
				match: 'not something we can merge'
			}
		]
	},
	check: [
		{ ask: '衝突が起きる時', how: '2 本の枝が同じ行を別々に変えた' },
		{ ask: '印の意味', how: '<<<<<<< HEAD〜======= が今の枝、=======〜>>>>>>> が取り込む枝' },
		{ ask: '解いた後', how: '印を消して add し、commit で合流の記録を作る' }
	]
};
