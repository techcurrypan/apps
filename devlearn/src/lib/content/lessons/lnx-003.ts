// lnx-003 中身を読む（shell 模擬）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物の bash（Ubuntu 24.04）の記録 tools-real/recorded/lnx-003-read.json と一字ずつ比べてある。
// 場面：パン屋の Web の受付の記録 access.log（12 行）。開店から 17 分の要求が並ぶ。経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const TERM = '端末';
const LOG = 'access.log';

const ACCESS =
	'09:00 GET /\n09:01 GET /menu\n09:03 GET /\n09:04 POST /order\n09:06 GET /menu\n09:08 GET /\n09:09 GET /shop\n09:11 POST /order\n09:12 GET /\n09:14 GET /menu\n09:15 GET /\n09:17 POST /order\n';

export const lnx003: Lesson = {
	id: 'lnx-003',
	field: 'lnx',
	level: 1,
	title: '中身を読む',
	goal: 'cat・head・tail・wc で、ファイルの中身と行数を確かめることができる',
	prereq: ['lnx-002'],
	related: [],
	next: ['lnx-005'],
	explain: [
		{
			n: 1,
			title: 'cat で全部',
			lead: 'cat は、ファイルの中身を頭から終わりまで出す',
			body: [
				'cat access.log と打つと、12 行が全て流れる。',
				'1 行が 1 回の要求で、時刻・やり方・道筋が並ぶ。',
				'行が多いと、頭の方は画面の上へ流れて見えなくなる。'
			],
			facts: [
				{ k: 'コマンド', v: 'cat access.log' },
				{ k: '1 行目', v: '09:00 GET /' },
				{ k: '最後の行', v: '09:17 POST /order' }
			],
			scene: [
				{ op: 'appear', id: 'term', label: TERM, sub: 'learner@demo $', at: [0, 0] },
				{ op: 'appear', id: 'log', label: LOG, sub: '12 行', at: [2, 0] },
				{ op: 'move', from: 'log', to: 'term', payload: '12 行', kind: 'cat' }
			],
			log: { t: '0s', from: LOG, to: TERM, kind: 'cat', info: '12 行を全て出した', size: '178 B' }
		},
		{
			n: 2,
			title: 'wc -l で行数',
			lead: 'wc -l は、行の数を数える',
			body: [
				'wc -l access.log は 12 access.log を返す。wc は word count の略だ。',
				'-l（lines）を付けると、行の数だけを出す。',
				'中身を見る前に、長さの見当を付けられる。'
			],
			facts: [
				{ k: 'コマンド', v: 'wc -l access.log' },
				{ k: '返った値', v: '12 access.log' }
			],
			scene: [
				{ op: 'change', id: 'log', k: '行数', v: '12' },
				{ op: 'move', from: 'log', to: 'term', payload: '12', kind: 'wc' }
			],
			log: { t: '8s', from: LOG, to: TERM, kind: 'wc', info: '12 行と分かった' }
		},
		{
			n: 3,
			title: 'head で先頭',
			lead: 'head -n 2 は、頭の 2 行だけを出す',
			body: [
				'head -n 2 access.log は、09:00 と 09:01 の 2 行を返す。',
				'-n の後の数が、出す行の数だ。',
				'開店直後に何が来たかを見るときに使う。'
			],
			facts: [
				{ k: 'コマンド', v: 'head -n 2 access.log' },
				{ k: '返った値', v: '09:00 GET / ・ 09:01 GET /menu' }
			],
			scene: [
				{ op: 'appear', id: 'head', label: 'head', sub: '頭の 2 行', at: [1, 1] },
				{ op: 'move', from: 'log', to: 'head', payload: '1〜2 行目', kind: 'head' }
			],
			log: { t: '15s', from: LOG, to: 'head', kind: 'head', info: '頭の 2 行を出した' }
		},
		{
			n: 4,
			title: 'tail で末尾',
			lead: 'tail は、終わりの 10 行を出す',
			body: [
				'tail access.log と打つと、3 行目から 12 行目までの 10 行が返る。',
				'数を書かないと、tail も head も 10 行を出す。',
				'記録は下に足されていくので、新しい出来事は末尾にある。'
			],
			facts: [
				{ k: 'コマンド', v: 'tail access.log' },
				{ k: '出た行', v: '3〜12 行目（10 行）' },
				{ k: '最初の行', v: '09:03 GET /' }
			],
			scene: [
				{ op: 'appear', id: 'tail', label: 'tail', sub: '終わりの 10 行', at: [3, 1] },
				{ op: 'move', from: 'log', to: 'tail', payload: '3〜12 行目', kind: 'tail' }
			],
			log: { t: '22s', from: LOG, to: 'tail', kind: 'tail', info: '終わりの 10 行を出した' },
			why: '記録は時刻の順に下へ足されるので、今の様子を知るには末尾を見ればよい'
		},
		{
			n: 5,
			title: 'tail -n で行数を決める',
			lead: 'tail -n 3 で、終わりの 3 行だけにする',
			body: [
				'tail -n 3 access.log は、09:14・09:15・09:17 の 3 行を返す。',
				'-n abc のように数でない物を書くと、invalid number of lines で断られる。',
				'行の数は、0 以上の整数で書く。'
			],
			facts: [
				{ k: 'コマンド', v: 'tail -n 3 access.log' },
				{ k: '最後の行', v: '09:17 POST /order' },
				{ k: 'tail -n abc', v: 'tail: invalid number of lines: ‘abc’' }
			],
			scene: [
				{ op: 'change', id: 'tail', k: '行数', v: '3' },
				{ op: 'move', from: 'log', to: 'tail', payload: '10〜12 行目', kind: 'tail' }
			],
			log: { t: '30s', from: LOG, to: 'tail', kind: 'tail', info: '終わりの 3 行だけを出した' }
		},
		{
			n: 6,
			title: '長いときは less',
			lead: 'less は、1 画面ずつ止めて読ませる',
			body: [
				'何千行もある記録は、cat では流れ去ってしまう。',
				'less access.log は 1 画面ずつ見せ、空白で次へ、q で抜ける。',
				'/ の後に語を打つと、その語の所へ飛べる。'
			],
			facts: [
				{ k: 'コマンド', v: 'less access.log' },
				{ k: '次の画面', v: '空白' },
				{ k: '抜ける', v: 'q' }
			],
			scene: [
				{ op: 'appear', id: 'less', label: 'less', sub: '1 画面ずつ', at: [2, 2] },
				{ op: 'move', from: 'log', to: 'less', payload: '1 画面', kind: 'less' }
			],
			log: {
				t: '40s',
				from: LOG,
				to: 'less',
				kind: 'less',
				info: '1 画面ずつ読む（模擬の端末には無い）'
			}
		}
	],
	example: {
		intro: '行数を数え、頭と終わりを見た（模擬は本物の bash の記録と比べ済み）',
		lines: [
			'$ wc -l access.log',
			'12 access.log',
			'$ head -n 2 access.log',
			'09:00 GET /',
			'09:01 GET /menu',
			'$ tail -n 3 access.log',
			'09:14 GET /menu',
			'09:15 GET /',
			'09:17 POST /order',
			'$ tail -n abc access.log',
			'tail: invalid number of lines: ‘abc’'
		]
	},
	practice: {
		goal: 'access.log の最後の 5 行を出して、直近の要求を確かめる',
		tool: { name: 'shell', mode: 'mock' },
		setup: { files: { 'access.log': ACCESS } },
		success: {
			output: '09:11 POST /order\n09:12 GET /\n09:14 GET /menu\n09:15 GET /\n09:17 POST /order\n'
		},
		mistakes: [
			{
				when: 'head で出した',
				why: 'head は頭から数える。出たのは開店直後の 09:00 からの行で、直近の要求ではない',
				next: '終わりから数える tail -n 5 access.log を打つ',
				match: '09:00 GET /'
			},
			{
				when: '-n の後に数でない物を書いた',
				why: '-n の後は行の数だ。数でないと tail は invalid number of lines と断る',
				next: 'tail -n 5 access.log と、数字で書く',
				match: 'invalid number of lines'
			},
			{
				when: 'ファイルの名前を打ち誤った',
				why: 'その名前のファイルは無い。tail は cannot open と返す',
				next: 'ls で名前を確かめ、access.log と打ち直す',
				match: 'cannot open'
			}
		]
	},
	check: [
		{ ask: '行の数', how: 'wc -l access.log が 12 を返す' },
		{ ask: '直近の要求', how: 'tail -n 5 の最後の行が 09:17 POST /order' },
		{ ask: '数を書かないとき', how: 'head も tail も 10 行を出す' }
	]
};
