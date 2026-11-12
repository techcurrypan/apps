// lnx-009 シェルスクリプト（shell 模擬）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物の bash（Ubuntu 24.04）の記録 tools-real/recorded/lnx-009-script.json と一字ずつ比べてある。
// 模擬の端末に書き物の画面は無いので、台本は printf '%s\n' 行 行 … > 名前 で 1 行ずつ書く。
// set -e は模擬が扱わない（本物の振る舞いを解説で示す）。場面：挨拶の台本 greet.sh を書いて動かす。経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const TERM = '端末';
const GREET =
	"printf '%s\\n' '#!/bin/bash' 'if [ $# -eq 0 ]; then' '  echo \"usage: greet.sh NAME\" >&2' '  exit 2' 'fi' 'echo \"hello, $1\"' > greet.sh";

export const lnx009: Lesson = {
	id: 'lnx-009',
	field: 'lnx',
	level: 2,
	title: 'シェルスクリプト',
	goal: '引数と終了コードを使うシェルスクリプトを書くことができる',
	prereq: ['lnx-005', 'lnx-008'],
	related: ['prg-003'],
	next: [],
	explain: [
		{
			n: 1,
			title: '1 行目の宣言',
			lead: '#!/bin/bash は、どの命令で読むかの宣言',
			body: [
				'シェルスクリプトは、端末で打つ命令を並べて書いたファイルだ。',
				'1 行目の #!/bin/bash は、このファイルを bash に読ませるという宣言だ。',
				'ここでは greet.sh を、printf で 6 行書いて作る。'
			],
			facts: [
				{ k: '1 行目', v: '#!/bin/bash' },
				{ k: '作るファイル', v: 'greet.sh（6 行）' }
			],
			scene: [
				{ op: 'appear', id: 'term', label: TERM, sub: 'learner@demo $', at: [0, 0] },
				{ op: 'appear', id: 'greet', label: 'greet.sh', sub: '#!/bin/bash', at: [2, 0] },
				{ op: 'move', from: 'term', to: 'greet', payload: '6 行', kind: 'write' }
			],
			log: { t: '0s', from: TERM, to: 'greet.sh', kind: 'write', info: 'greet.sh を 6 行で書いた' }
		},
		{
			n: 2,
			title: '引数を受ける',
			lead: '$1 は 1 つ目の引数、$# は引数の数',
			body: [
				'bash greet.sh taro と打つと、taro が 1 つ目の引数になる。',
				'台本の中では $1 が taro、$# が 1 になる。',
				'echo "hello, $1" が hello, taro を出す。'
			],
			facts: [
				{ k: 'コマンド', v: 'bash greet.sh taro' },
				{ k: '$1 / $#', v: 'taro / 1' },
				{ k: '出力', v: 'hello, taro' }
			],
			scene: [
				{ op: 'move', from: 'term', to: 'greet', payload: 'taro', kind: 'arg' },
				{ op: 'change', id: 'greet', k: '$1', v: 'taro' }
			],
			log: { t: '10s', from: TERM, to: 'greet.sh', kind: 'arg', info: '$1 に taro が入った' }
		},
		{
			n: 3,
			title: '実行の権限',
			lead: './greet.sh と名前で動かすには、x の権限が要る',
			body: [
				'./greet.sh taro は bash: ./greet.sh: Permission denied で断られる。',
				'printf で作ったファイルは 664 で、誰にも x が無い。',
				'chmod +x greet.sh の後は、./greet.sh hanako が hello, hanako を出す。'
			],
			facts: [
				{ k: '足す前', v: 'bash: ./greet.sh: Permission denied' },
				{ k: 'コマンド', v: 'chmod +x greet.sh' },
				{ k: '足した後', v: 'hello, hanako' }
			],
			scene: [
				{ op: 'change', id: 'greet', k: '権限', v: '-rwxrwxr-x' },
				{ op: 'move', from: 'greet', to: 'term', payload: 'hello, hanako', kind: 'run' }
			],
			log: { t: '25s', from: 'greet.sh', to: TERM, kind: 'run', info: 'x を足し、名前で動いた' }
		},
		{
			n: 4,
			title: '終了コード 0',
			lead: 'うまくいった命令は、終了コード 0 で終わる',
			body: [
				'どの命令も、終わるときに 0〜255 の数を残す。これを終了コードと呼ぶ。',
				'0 はうまくいった、0 以外は失敗の印だ。',
				'echo $? は、直前の命令の終了コードを出す。'
			],
			facts: [{ k: './greet.sh taro の後の echo $?', v: '0' }],
			scene: [
				{ op: 'appear', id: 'code', label: '終了コード', sub: '$?', at: [3, 1] },
				{ op: 'change', id: 'code', k: '値', v: '0' }
			],
			log: { t: '35s', from: 'greet.sh', to: '終了コード', kind: 'exit', info: '終了コードは 0' }
		},
		{
			n: 5,
			title: '失敗で 1 以上',
			lead: 'exit 2 で、台本の終了コードを自分で決める',
			body: [
				'引数が無いと、if [ $# -eq 0 ] が真になる。',
				'使い方を >&2 でエラーの出口へ出し、exit 2 で終わる。',
				'./greet.sh の後の echo $? は 2 を出す。'
			],
			facts: [
				{ k: '条件', v: '[ $# -eq 0 ]' },
				{ k: '出力（エラーの出口）', v: 'usage: greet.sh NAME' },
				{ k: 'echo $?', v: '2' }
			],
			scene: [
				{ op: 'move', from: 'greet', to: 'term', payload: 'usage: greet.sh NAME', kind: 'stderr' },
				{ op: 'change', id: 'code', k: '値', v: '2' }
			],
			log: {
				t: '45s',
				from: 'greet.sh',
				to: '終了コード',
				kind: 'exit',
				info: '引数が無く、終了コード 2'
			},
			why: '呼んだ側が成否を数で受け取れるので、次に何をするかを台本どうしで決められる'
		},
		{
			n: 6,
			title: '&& でつなぐ',
			lead: 'A && B は、A が 0 で終わったときだけ B を動かす',
			body: [
				'./greet.sh hanako && echo ok は、hello, hanako と ok を出す。',
				'./greet.sh && echo ok は、greet.sh が 2 で終わるので ok を出さない。',
				'|| は逆で、左が失敗したときだけ右を動かす。'
			],
			facts: [
				{ k: './greet.sh hanako && echo ok', v: 'hello, hanako / ok' },
				{ k: './greet.sh && echo ok', v: 'usage: greet.sh NAME（ok は出ない）' }
			],
			scene: [
				{ op: 'appear', id: 'ok', label: 'echo ok', sub: '&& の右', at: [1, 2] },
				{ op: 'move', from: 'code', to: 'ok', payload: '0 なら動く', kind: 'and' }
			],
			log: {
				t: '55s',
				from: '終了コード',
				to: 'echo ok',
				kind: 'and',
				info: '0 のときだけ ok を出した'
			}
		},
		{
			n: 7,
			title: 'set -e で止める',
			lead: '台本の 2 行目に set -e を置くと、失敗した行で台本が止まる',
			body: [
				'台本は、途中の命令が失敗しても、ふつうは次の行へ進む。',
				'set -e を置くと、0 以外で終わった行で台本全体が終わる。',
				'cp nothere x の次の echo never は走らず、終了コードは 1 になる。'
			],
			facts: [
				{ k: '台本', v: '#!/bin/bash / set -e / cp nothere x / echo never' },
				{ k: '本物の bash の終了コード', v: '1（echo never は走らない）' },
				{ k: '模擬の端末', v: 'set を扱わない' }
			],
			scene: [
				{ op: 'appear', id: 'sete', label: 'set -e', sub: '失敗で止まる', at: [3, 2] },
				{ op: 'move', from: 'sete', to: 'code', payload: '1', kind: 'exit' },
				{ op: 'change', id: 'code', k: '値', v: '1' }
			],
			log: {
				t: '70s',
				from: 'set -e',
				to: '終了コード',
				kind: 'exit',
				info: '失敗した行で止まり、終了コード 1'
			}
		}
	],
	example: {
		intro:
			'引数を確かめる台本を書き、権限を足し、終了コードを読んだ（模擬は本物の bash の記録と比べ済み）',
		lines: [
			`$ ${GREET}`,
			'$ ./greet.sh taro',
			'bash: ./greet.sh: Permission denied',
			'$ chmod +x greet.sh',
			'$ ./greet.sh taro',
			'hello, taro',
			'$ echo $?',
			'0',
			'$ ./greet.sh',
			'usage: greet.sh NAME',
			'$ echo $?',
			'2',
			'$ ./greet.sh hanako && echo ok',
			'hello, hanako',
			'ok'
		]
	},
	practice: {
		goal: '「hello, 引数」を出す 2 行の台本 hello.sh を書き、実行できるようにして ./hello.sh minato と動かす',
		tool: { name: 'shell', mode: 'mock' },
		setup: {},
		success: { output: 'hello, minato\n', modes: { 'hello.sh': '775' } },
		mistakes: [
			{
				when: 'chmod +x をせずに ./hello.sh を打った',
				why: '作ったばかりのファイルには x が無い。bash は Permission denied と断る',
				next: 'chmod +x hello.sh を打ってから動かす',
				match: 'Permission denied'
			},
			{
				when: './ を付けずに hello.sh と打った',
				why: '名前だけだと PATH の中を探す。今いる場所は PATH に無いので見つからない',
				next: '今いる場所を表す ./ を付け、./hello.sh minato と打つ',
				match: 'hello.sh: command not found'
			},
			{
				when: 'printf の行を "…" で囲んだ',
				why: '"…" の中の $1 は、書くときに今のシェルの $1（空）に置き換わる。台本に $1 が残らない',
				next: "台本の行は '…' で囲む。'echo \"hello, $1\"' と書く",
				match: 'hello, \n'
			}
		]
	},
	check: [
		{ ask: '1 つ目の引数', how: '$1。数は $#' },
		{ ask: 'うまくいったときの終了コード', how: '0（echo $? で読む）' },
		{ ask: '&& の右が動くとき', how: '左が 0 で終わったときだけ' }
	]
};
