// lnx-001 ディレクトリを移動する（段 10-0。shell の見本）。
// 値は全て、本物の bash（Ubuntu 24.04、bash 5.2.21）で打って記録した物（tools-real/recorded/lnx-001-move.json）。
// 場面：learner が /home/learner/demo を開き、docs/notes の中の todo.txt を探す。経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const TERM = '端末';
const DEMO = 'demo';
const DOCS = 'docs';
const NOTES = 'notes';

export const lnx001: Lesson = {
	id: 'lnx-001',
	field: 'lnx',
	level: 1,
	title: 'ディレクトリを移動する',
	goal: 'pwd・cd・ls で、今いる場所と中身を確かめることができる',
	prereq: [],
	related: ['git-001'],
	next: [],
	explain: [
		{
			n: 1,
			title: '今いる場所を聞く',
			lead: 'pwd は、端末が今どのディレクトリにいるかを返す',
			body: [
				'端末はいつも、どこか 1 つのディレクトリ（フォルダ）の中にいる。',
				'pwd（print working directory、今の場所を出す）を打つと、その場所が返る。',
				'返った /home/learner/demo は、根の / から順に辿った道筋だ。'
			],
			facts: [
				{ k: 'コマンド', v: 'pwd' },
				{ k: '返った値', v: '/home/learner/demo' },
				{ k: '終了コード', v: '0' }
			],
			scene: [
				{ op: 'appear', id: 'term', label: TERM, sub: 'learner@demo $', at: [0, 0] },
				{ op: 'appear', id: 'demo', label: DEMO, sub: '/home/learner/demo', at: [1, 0] },
				{ op: 'change', id: 'term', k: '今いる所', v: '/home/learner/demo' }
			],
			log: { t: '0s', from: TERM, to: DEMO, kind: 'pwd', info: '今いる所は /home/learner/demo' }
		},
		{
			n: 2,
			title: '中身を並べる',
			lead: 'ls は、今いるディレクトリの中身の名前を並べる',
			body: [
				'ls（list、一覧）を打つと、demo の中の名前が横に並ぶ。',
				'docs と src はディレクトリ、readme.txt はファイルだ。',
				'並びは名前の順で、置いた順ではない。'
			],
			facts: [
				{ k: 'コマンド', v: 'ls' },
				{ k: '返った値', v: 'docs  readme.txt  src' },
				{ k: '名前の数', v: '3' }
			],
			scene: [
				{ op: 'appear', id: 'docs', label: DOCS, sub: 'ディレクトリ', at: [1, 1] },
				{ op: 'appear', id: 'readme', label: 'readme.txt', sub: 'ファイル 2 B', at: [2, 1] },
				{ op: 'appear', id: 'src', label: 'src', sub: 'ディレクトリ', at: [3, 1] },
				{ op: 'move', from: 'demo', to: 'term', payload: 'docs readme.txt src', kind: 'ls' }
			],
			log: { t: '4s', from: DEMO, to: TERM, kind: 'ls', info: 'docs・readme.txt・src の 3 つ' }
		},
		{
			n: 3,
			title: '隠れた名前も出す',
			lead: 'ls -a は、. で始まる名前も出す',
			body: [
				'ls -a（all、全て）を打つと、. と .. が増える。',
				'. は今いるディレクトリ自身、.. は 1 つ上のディレクトリを指す名前だ。',
				'. で始まる名前は、ls だけでは出ない決まりになっている。'
			],
			facts: [
				{ k: 'コマンド', v: 'ls -a' },
				{ k: '返った値', v: '.  ..  docs  readme.txt  src' },
				{ k: '増えた名前', v: '. と ..' }
			],
			scene: [{ op: 'change', id: 'demo', k: '隠れた名前', v: '. ..' }],
			log: { t: '9s', from: DEMO, to: TERM, kind: 'ls', info: '. と .. を含めて 5 つ' },
			why: '. と .. を名前として持つので、どこにいても「ここ」と「1 つ上」を同じ書き方で指せる'
		},
		{
			n: 4,
			title: 'cd で下りる',
			lead: 'cd docs で、端末の居場所が docs に移る',
			body: [
				'cd（change directory、場所を替える）に名前を付けると、そこへ移る。',
				'cd docs は何も返さず、終了コード 0 で終わる。',
				'pwd を打つと /home/learner/demo/docs に替わっている。'
			],
			facts: [
				{ k: 'コマンド', v: 'cd docs' },
				{ k: 'その後の pwd', v: '/home/learner/demo/docs' },
				{ k: 'その後の ls', v: 'notes' }
			],
			scene: [
				{ op: 'move', from: 'term', to: 'docs', payload: 'cd docs', kind: 'cd' },
				{ op: 'change', id: 'term', k: '今いる所', v: '/home/learner/demo/docs' },
				{ op: 'appear', id: 'notes', label: NOTES, sub: 'ディレクトリ', at: [1, 2] }
			],
			log: {
				t: '15s',
				from: TERM,
				to: DOCS,
				kind: 'cd',
				info: 'docs に移った。中は notes だけ'
			}
		},
		{
			n: 5,
			title: 'さらに下りて探す',
			lead: 'cd notes で、目当ての todo.txt に着く',
			body: [
				'docs の中で cd notes を打つと、もう 1 段下りる。',
				'pwd は /home/learner/demo/docs/notes、ls は todo.txt を返す。',
				'cd に渡した名前は、今いる場所から見た名前として読まれる。'
			],
			facts: [
				{ k: 'コマンド', v: 'cd notes' },
				{ k: 'その後の pwd', v: '/home/learner/demo/docs/notes' },
				{ k: 'その後の ls', v: 'todo.txt' }
			],
			scene: [
				{ op: 'move', from: 'term', to: 'notes', payload: 'cd notes', kind: 'cd' },
				{ op: 'change', id: 'term', k: '今いる所', v: '/home/learner/demo/docs/notes' },
				{ op: 'appear', id: 'todo', label: 'todo.txt', sub: 'ファイル 5 B', at: [1, 3] }
			],
			log: {
				t: '21s',
				from: DOCS,
				to: NOTES,
				kind: 'cd',
				info: 'notes に移った。todo.txt があった'
			}
		},
		{
			n: 6,
			title: '.. で上る',
			lead: 'cd .. は 1 つ上へ、cd ../src は上ってから隣へ',
			body: [
				'cd .. を打つと、notes から docs に戻る。',
				'cd ../src は、1 つ上の demo に上ってから src に下りる、という 1 本の道筋だ。',
				'pwd は /home/learner/demo/src を返す。'
			],
			facts: [
				{ k: 'コマンド', v: 'cd ..  →  cd ../src' },
				{ k: '1 回目の後の pwd', v: '/home/learner/demo/docs' },
				{ k: '2 回目の後の pwd', v: '/home/learner/demo/src' }
			],
			scene: [
				{ op: 'move', from: 'notes', to: 'src', payload: 'cd .. → cd ../src', kind: 'cd' },
				{ op: 'change', id: 'term', k: '今いる所', v: '/home/learner/demo/src' },
				{ op: 'highlight', id: 'src' }
			],
			log: { t: '30s', from: NOTES, to: 'src', kind: 'cd', info: 'docs を経て src に移った' }
		},
		{
			n: 7,
			title: '絶対と相対の道筋',
			lead: '/ で始まる道筋は、どこにいても同じ所を指す',
			body: [
				'cd /home/learner/demo/docs/notes は、/ から辿る絶対の道筋だ。',
				'docs や ../src は、今いる場所から辿る相対の道筋だ。',
				'cd だけを打つと家の /home/learner に、cd ~/demo で demo に戻る。'
			],
			facts: [
				{ k: '絶対の道筋', v: 'cd /home/learner/demo/docs/notes' },
				{ k: 'cd だけの後の pwd', v: '/home/learner' },
				{ k: 'cd ~/demo の後の pwd', v: '/home/learner/demo' }
			],
			scene: [
				{ op: 'move', from: 'src', to: 'demo', payload: 'cd ~/demo', kind: 'cd' },
				{ op: 'change', id: 'term', k: '今いる所', v: '/home/learner/demo' }
			],
			log: { t: '42s', from: 'src', to: DEMO, kind: 'cd', info: '~ は家。~/demo で demo に戻った' }
		},
		{
			n: 8,
			title: '行けない所は理由が返る',
			lead: '無い名前とファイルには、cd できない',
			body: [
				'cd nothere は No such file or directory、無い、と返る。',
				'cd readme.txt は Not a directory、ディレクトリでない、と返る。',
				'どちらも終了コードは 1 で、居場所は demo のまま替わらない。'
			],
			facts: [
				{ k: 'cd nothere', v: 'cd: nothere: No such file or directory' },
				{ k: 'cd readme.txt', v: 'cd: readme.txt: Not a directory' },
				{ k: '終了コード', v: '1' }
			],
			scene: [
				{ op: 'move', from: 'term', to: 'readme', payload: 'cd readme.txt', kind: 'error' },
				{ op: 'change', id: 'term', k: '終了コード', v: '1' }
			],
			log: {
				t: '50s',
				from: TERM,
				to: 'readme.txt',
				kind: 'error',
				info: 'ディレクトリでないので移れない。居場所はそのまま'
			}
		}
	],
	example: {
		intro:
			'demo から notes に下り、上って src に移るまで。本物の bash で打った（行の番号の表示は除いた）',
		lines: [
			'$ pwd',
			'/home/learner/demo',
			'$ ls',
			'docs  readme.txt  src',
			'$ cd docs',
			'$ ls',
			'notes',
			'$ cd notes',
			'$ pwd',
			'/home/learner/demo/docs/notes',
			'$ cd ..',
			'$ cd ../src',
			'$ pwd',
			'/home/learner/demo/src',
			'$ cd nothere',
			'bash: cd: nothere: No such file or directory'
		]
	},
	practice: {
		goal: 'notes の中に移り、ls で todo.txt があることを確かめる',
		tool: { name: 'shell', mode: 'mock' },
		setup: {
			dirs: ['docs/notes', 'src'],
			files: { 'docs/notes/todo.txt': 'memo\n', 'readme.txt': 'a\n' }
		},
		success: { cwd: '/home/learner/demo/docs/notes', output: 'todo.txt\n' },
		mistakes: [
			{
				when: '無い名前に cd した（cd note など）',
				why: 'その名前のディレクトリは今いる場所に無い。bash は No such file or directory と返す',
				next: 'ls で今いる場所の名前を確かめてから、その名前で cd する',
				match: 'No such file or directory'
			},
			{
				when: 'ファイルに cd した（cd readme.txt など）',
				why: 'cd で入れるのはディレクトリだけだ。bash は Not a directory と返す',
				next: 'ls -a で並ぶ名前のうち、ディレクトリ（docs）を選んで cd する',
				match: 'Not a directory'
			}
		]
	},
	check: [
		{ ask: '今いる場所が notes か', how: 'pwd が /home/learner/demo/docs/notes を返す' },
		{ ask: 'notes の中身', how: 'ls が todo.txt を返す' },
		{ ask: '1 つ上へ戻れるか', how: 'cd .. の後の pwd が /home/learner/demo/docs を返す' }
	]
};
