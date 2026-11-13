// git-008 rebase で積み直す（git 模擬）。
// 出力は全て、模擬の git で打って得た物。模擬は本物（git 2.56）の記録 tools-real/recorded/git-008-rebase.json と一字ずつ比べてある
// （commit の ID は、記録と模擬で時計が違うので別の値になる）。
// 場面：パン屋の品書きに、枝 feature でジャムの札 jam.txt を 2 件の記録で作った。その間に main には開店時刻のメモ notes.txt が入った。
// 経過時刻 t は積み直しを始めた時を 0m とした。
import type { Lesson } from '../../lesson/types.ts';

const MAIN = '枝 main';
const FEAT = '枝 feature';

export const git008: Lesson = {
	id: 'git-008',
	field: 'git',
	level: 3,
	title: 'rebase で積み直す',
	goal: 'rebase で、枝の記録を別の土台の上に積み直すことができる',
	prereq: ['git-007', 'git-003'],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '分かれた枝',
			lead: 'feature と main は、記録 menu から別々に進んだ',
			body: [
				'feature には add jam と price jam、main には add notes が積まれた。',
				'log --graph --all は、2 本の線が menu で分かれる形を返す。',
				'このまま merge すると、合流の記録が 1 件増える（git-005）。'
			],
			facts: [
				{ k: 'feature', v: 'add jam → price jam' },
				{ k: 'main', v: 'add notes' },
				{ k: '分かれた所', v: 'menu' }
			],
			scene: [
				{ op: 'appear', id: 'base', label: '記録 menu', sub: '土台', at: [0, 1] },
				{ op: 'appear', id: 'n', label: '記録 add notes', sub: MAIN, at: [2, 0] },
				{ op: 'appear', id: 'j1', label: '記録 add jam', sub: FEAT, at: [2, 2] },
				{ op: 'appear', id: 'j2', label: '記録 price jam', sub: FEAT, at: [4, 2] }
			],
			log: { t: '0m', from: '記録 menu', to: FEAT, kind: 'log', info: '2 本に分かれている' }
		},
		{
			n: 2,
			title: 'rebase の土台',
			lead: 'git rebase main は、今いる枝を main の先に積み直す',
			body: [
				'git switch feature で、積み直す枝へ移る。',
				'git rebase main の main が、新しい土台になる。',
				'feature の記録のうち、main に無い 2 件が積み直す対象だ。'
			],
			facts: [
				{ k: '今いる枝', v: 'feature' },
				{ k: '新しい土台', v: 'main の add notes' },
				{ k: '積み直す記録', v: 'add jam・price jam' }
			],
			scene: [
				{ op: 'highlight', id: 'n' },
				{ op: 'change', id: 'n', k: '役目', v: '新しい土台' }
			],
			log: {
				t: '1m',
				from: FEAT,
				to: MAIN,
				kind: 'switch',
				info: 'feature に移り、土台を main にした'
			}
		},
		{
			n: 3,
			title: '記録を 1 件ずつ写す',
			lead: 'rebase は、記録の変更を 1 件ずつ、土台の上で作り直す',
			body: [
				'答えは Rebasing (1/2)・(2/2) と進み、Successfully rebased で終わる。',
				'add jam の変更を add notes の上で記録し、次に price jam を記録した。',
				'元の 2 件は、どの枝からも指されなくなった。'
			],
			facts: [
				{ k: '答え', v: 'Successfully rebased and updated refs/heads/feature.' },
				{ k: '写した数', v: '2' }
			],
			scene: [
				{ op: 'appear', id: 'k1', label: '記録 add jam（写し）', sub: FEAT, at: [4, 0] },
				{ op: 'move', from: 'j1', to: 'k1', payload: '変更を写す', kind: 'rebase' },
				{ op: 'appear', id: 'k2', label: '記録 price jam（写し）', sub: FEAT, at: [6, 0] },
				{ op: 'move', from: 'j2', to: 'k2', payload: '変更を写す', kind: 'rebase' }
			],
			log: { t: '2m', from: FEAT, to: MAIN, kind: 'rebase', info: '2 件を add notes の上に写した' }
		},
		{
			n: 4,
			title: 'ID が変わる',
			lead: '写した記録は中身が同じでも、親が違うので別の記録になる',
			body: [
				'log --graph --all は、menu から price jam までの一本道を返す。',
				'add jam の ID は、積み直す前と違う。親が menu から add notes に替わった。',
				'記録の ID は、中身・親・書いた人・日時から作られる。'
			],
			facts: [
				{ k: '形', v: '一本道（4 件）' },
				{ k: 'add jam の親', v: 'menu → add notes' },
				{ k: 'ID', v: '新しい値になる' }
			],
			scene: [
				{ op: 'vanish', id: 'j1' },
				{ op: 'vanish', id: 'j2' },
				{ op: 'change', id: 'k1', k: '親', v: 'add notes' }
			],
			log: {
				t: '3m',
				from: '記録 add jam',
				to: '記録 add jam（写し）',
				kind: 'id',
				info: '親が替わり ID も替わった'
			},
			why: 'ID は親まで含めて作るので、どの記録の上にあるかが違えば、同じ変更でも別の記録だと分かる'
		},
		{
			n: 5,
			title: '早送りで合わせる',
			lead: '積み直した後は、main は早送りで合わせられる',
			body: [
				'git switch main の後、git merge feature は Fast-forward を返す。',
				'合流の記録は増えず、main は 4 件の一本道になった。',
				'履歴が一本道だと、何が起きたかを上から順に読める。'
			],
			facts: [
				{ k: '答え', v: 'Fast-forward' },
				{ k: 'main の記録', v: '4 件（一本道）' },
				{ k: 'HEAD の親', v: '1 つ' }
			],
			scene: [
				{ op: 'appear', id: 'main', label: MAIN, sub: 'HEAD', at: [6, 1] },
				{ op: 'move', from: 'main', to: 'k2', payload: '早送り', kind: 'ref' }
			],
			log: {
				t: '5m',
				from: MAIN,
				to: '記録 price jam（写し）',
				kind: 'merge',
				info: '早送りで main が進んだ'
			}
		},
		{
			n: 6,
			title: '共有した枝では避ける',
			lead: '既に送った記録を積み直すと、他の人の履歴と食い違う',
			body: [
				'rebase は、元の記録を捨てて、別の ID の記録を作る。',
				'他の人が元の記録を受け取っていると、同じ変更が 2 通りの ID で残る。',
				'rebase は、まだ送っていない自分だけの枝に使う。'
			],
			facts: [
				{ k: '使ってよい枝', v: 'まだ push していない自分の枝' },
				{ k: '避ける枝', v: '皆で使う main・送った枝' }
			],
			scene: [
				{ op: 'appear', id: 'share', label: '送った記録', sub: '他の人も持つ', at: [2, 3] },
				{ op: 'highlight', id: 'share' }
			],
			log: {
				t: '6m',
				from: FEAT,
				to: '送った記録',
				kind: 'warn',
				info: '共有した記録は積み直さない'
			}
		}
	],
	example: {
		intro: '分かれた枝を main の上に積み直し、早送りで合わせた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ git log --oneline --graph --all',
			'* f61d6a1 (HEAD -> main) add notes',
			'| * 4a275e5 (feature) price jam',
			'| * 4c37fa1 add jam',
			'|/  ',
			'* 5d290c3 menu',
			'$ git switch feature',
			"Switched to branch 'feature'",
			'$ git rebase main',
			'Successfully rebased and updated refs/heads/feature.',
			'$ git log --oneline --graph --all',
			'* 2a4ea7e (HEAD -> feature) price jam',
			'* 55eddb0 add jam',
			'* f61d6a1 (main) add notes',
			'* 5d290c3 menu',
			'$ git switch main',
			"Switched to branch 'main'",
			'$ git merge feature',
			'Updating f61d6a1..2a4ea7e',
			'Fast-forward',
			' jam.txt | 1 +',
			' 1 file changed, 1 insertion(+)',
			' create mode 100644 jam.txt',
			'$ git log --oneline --graph',
			'* 2a4ea7e (HEAD -> main, feature) price jam',
			'* 55eddb0 add jam',
			'* f61d6a1 add notes',
			'* 5d290c3 menu'
		]
	},
	practice: {
		goal: 'feature の 2 件を main の上に積み直し、main を早送りで合わせる。合流の記録は作らない',
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
				"printf 'jam\\n' > jam.txt",
				'git add jam.txt',
				'git commit -m "add jam"',
				"printf 'jam 200\\n' > jam.txt",
				'git commit -am "price jam"',
				'git switch main',
				"printf 'open 7:00\\n' > notes.txt",
				'git add notes.txt',
				'git commit -m "add notes"'
			]
		},
		success: {
			commits: 4,
			tracked: ['jam.txt', 'menu.txt', 'notes.txt'],
			statusShort: '',
			branch: 'main',
			branches: { main: 4, feature: 4 },
			parents: 1
		},
		mistakes: [
			{
				when: '積み直さずに main で merge した',
				why: '2 本が分かれたままなので、合流の記録ができた。一本道にならない',
				next: '記録から 0 に戻し、git switch feature の後に git rebase main と打つ',
				match: "Merge made by the 'ort' strategy."
			},
			{
				when: 'main にいるまま git rebase feature と打った',
				why: '積み直されたのは main の add notes だ。main の記録の ID が変わった',
				next: '記録から 0 に戻し、先に git switch feature で積み直す枝へ移る',
				match: 'updated refs/heads/main'
			},
			{
				when: '土台の名前を打ち違えた',
				why: 'その名前の枝は無い',
				next: 'git branch で名前を確かめ、git rebase main と打つ',
				match: 'invalid upstream'
			}
		]
	},
	check: [
		{ ask: 'git rebase main の働き', how: '今いる枝の記録を、main の先に 1 件ずつ写して積み直す' },
		{ ask: '積み直した記録の ID', how: '親が替わるので、新しい ID になる' },
		{ ask: '積み直した後の merge', how: '早送りになり、合流の記録は増えない' },
		{ ask: 'rebase を避ける枝', how: '既に送って、他の人も持つ枝' }
	]
};
