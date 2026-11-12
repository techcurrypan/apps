// lnx-004 権限を読み、変える（shell 模擬）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物の bash（Ubuntu 24.04）の記録 tools-real/recorded/lnx-004-mode.json と一字ずつ比べてある。
// 場面：作業場所に、挨拶を出す台本 hi.sh と、覚え書き memo.txt がある。経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const TERM = '端末';

export const lnx004: Lesson = {
	id: 'lnx-004',
	field: 'lnx',
	level: 1,
	title: '権限を読み、変える',
	goal: 'ls -l の権限を読み、chmod で変えることができる',
	prereq: ['lnx-002'],
	related: ['sec-010'],
	next: ['lnx-011'],
	explain: [
		{
			n: 1,
			title: 'ls -l の並び',
			lead: 'ls -l は、名前の前に権限・持ち主・大きさ・時刻を並べる',
			body: [
				'ls -l と打つと、1 つのファイルが 1 行で出る。',
				'左の -rw-rw-r-- が権限、learner learner が持ち主と組だ。',
				'その後に、大きさ 20・時刻 Nov 10 09:00・名前 hi.sh が続く。'
			],
			facts: [
				{ k: 'コマンド', v: 'ls -l' },
				{ k: 'hi.sh の行', v: '-rw-rw-r-- 1 learner learner 20 Nov 10 09:00 hi.sh' }
			],
			scene: [
				{ op: 'appear', id: 'term', label: TERM, sub: 'learner@demo $', at: [0, 0] },
				{ op: 'appear', id: 'hi', label: 'hi.sh', sub: '-rw-rw-r--', at: [2, 0] },
				{ op: 'appear', id: 'memo', label: 'memo.txt', sub: '-rw-rw-r--', at: [2, 1] }
			],
			log: { t: '0s', from: TERM, to: 'hi.sh', kind: 'ls', info: 'hi.sh は -rw-rw-r--、20 B' }
		},
		{
			n: 2,
			title: '持ち主と組',
			lead: '権限は、持ち主・組・ほかの人の 3 者に分けて決まる',
			body: [
				'1 つ目の learner は持ち主（このファイルを持つ利用者）だ。',
				'2 つ目の learner は組（同じ権限を分け合う利用者の集まり）だ。',
				'どちらでもない人は「ほか」として扱う。'
			],
			facts: [
				{ k: '持ち主', v: 'learner' },
				{ k: '組', v: 'learner' },
				{ k: '3 者', v: 'u（持ち主）・g（組）・o（ほか）' }
			],
			scene: [
				{ op: 'appear', id: 'who', label: '3 者', sub: 'u・g・o', at: [1, 1] },
				{ op: 'move', from: 'who', to: 'hi', payload: 'learner learner', kind: 'owner' }
			],
			log: { t: '10s', from: '3 者', to: 'hi.sh', kind: 'owner', info: '持ち主も組も learner' }
		},
		{
			n: 3,
			title: 'rwx の 3 組',
			lead: '1 字目の後の 9 字を、3 字ずつ 3 者に当てる',
			body: [
				'-rw-rw-r-- の 1 字目の - は、ふつうのファイルの印だ。',
				'残りは rw-・rw-・r-- で、順に持ち主・組・ほかの権限だ。',
				'r は読む、w は書く、x は実行する、- は無いの意味だ。'
			],
			facts: [
				{ k: '持ち主', v: 'rw-（読む・書く）' },
				{ k: '組', v: 'rw-（読む・書く）' },
				{ k: 'ほか', v: 'r--（読むだけ）' }
			],
			scene: [
				{ op: 'change', id: 'hi', k: 'u / g / o', v: 'rw- / rw- / r--' },
				{ op: 'highlight', id: 'hi' }
			],
			log: {
				t: '20s',
				from: 'hi.sh',
				to: TERM,
				kind: 'read',
				info: '誰にも x が無い。実行できない'
			}
		},
		{
			n: 4,
			title: '数で書く 644',
			lead: 'r=4・w=2・x=1 を足すと、3 者の権限を 3 桁の数で書ける',
			body: [
				'rw- は 4 + 2 で 6、r-- は 4、rwx は 4 + 2 + 1 で 7 になる。',
				'rw-r--r-- は 644、rwxr-xr-x は 755、rw------- は 600 だ。',
				'1 桁が 1 者を表すので、3 桁で全員分になる。'
			],
			facts: [
				{ k: 'rw-r--r--', v: '644' },
				{ k: 'rwxr-xr-x', v: '755' },
				{ k: 'rw-------', v: '600' }
			],
			scene: [
				{ op: 'appear', id: 'num', label: '数の書き方', sub: 'r=4 w=2 x=1', at: [1, 2] },
				{ op: 'change', id: 'num', k: 'rw-rw-r--', v: '664' }
			],
			log: {
				t: '30s',
				from: '数の書き方',
				to: 'hi.sh',
				kind: 'mode',
				info: 'hi.sh の今の権限は 664'
			},
			why: '3 つの印は 2 進数の 3 桁に当たるので、0〜7 の 1 桁で 1 者分を書ける'
		},
		{
			n: 5,
			title: 'chmod で変える',
			lead: 'chmod 600 で、覚え書きを持ち主だけのものにする',
			body: [
				'chmod 600 memo.txt と打つ。chmod は change mode の略だ。',
				'ls -l memo.txt は -rw------- を返し、組とほかは読めなくなる。',
				'chmod 999 のように 7 を超える数は invalid mode で断られる。'
			],
			facts: [
				{ k: 'コマンド', v: 'chmod 600 memo.txt' },
				{ k: '変えた後', v: '-rw------- 1 learner learner 5 Nov 10 09:00 memo.txt' },
				{ k: 'chmod 999', v: 'chmod: invalid mode: ‘999’' }
			],
			scene: [
				{ op: 'move', from: 'term', to: 'memo', payload: 'chmod 600', kind: 'chmod' },
				{ op: 'change', id: 'memo', k: '権限', v: '-rw-------' }
			],
			log: { t: '45s', from: TERM, to: 'memo.txt', kind: 'chmod', info: 'memo.txt を 600 にした' }
		},
		{
			n: 6,
			title: '実行できるようになる',
			lead: 'x が無いと台本は動かない。u+x で持ち主に足す',
			body: [
				'./hi.sh と打つと、bash: ./hi.sh: Permission denied で断られる。',
				'chmod u+x hi.sh は、持ち主（u）に x を足す（+）書き方だ。',
				'権限は -rwxrw-r-- になり、./hi.sh が hi を出す。'
			],
			facts: [
				{ k: '足す前', v: 'bash: ./hi.sh: Permission denied' },
				{ k: 'コマンド', v: 'chmod u+x hi.sh' },
				{ k: '足した後の ./hi.sh', v: 'hi' }
			],
			scene: [
				{ op: 'move', from: 'term', to: 'hi', payload: 'chmod u+x', kind: 'chmod' },
				{ op: 'change', id: 'hi', k: '権限', v: '-rwxrw-r--' },
				{ op: 'move', from: 'hi', to: 'term', payload: 'hi', kind: 'run' }
			],
			log: {
				t: '60s',
				from: 'hi.sh',
				to: TERM,
				kind: 'run',
				info: 'x を足して実行できた。hi を出した'
			}
		}
	],
	example: {
		intro: '実行で断られ、権限を読み、変えて動かした（模擬は本物の bash の記録と比べ済み）',
		lines: [
			'$ ./hi.sh',
			'bash: ./hi.sh: Permission denied',
			'$ ls -l',
			'total 8',
			'-rw-rw-r-- 1 learner learner 20 Nov 10 09:00 hi.sh',
			'-rw-rw-r-- 1 learner learner  5 Nov 10 09:00 memo.txt',
			'$ chmod u+x hi.sh',
			'$ ls -l hi.sh',
			'-rwxrw-r-- 1 learner learner 20 Nov 10 09:00 hi.sh',
			'$ ./hi.sh',
			'hi',
			'$ chmod 600 memo.txt',
			'$ ls -l memo.txt',
			'-rw------- 1 learner learner 5 Nov 10 09:00 memo.txt'
		]
	},
	practice: {
		goal: 'backup.sh を誰でも実行できる 755 に、合言葉の pass.txt を持ち主だけが読み書きできる 600 にする',
		tool: { name: 'shell', mode: 'mock' },
		setup: {
			files: { 'backup.sh': '#!/bin/bash\necho done\n', 'pass.txt': 'secret\n' }
		},
		success: { modes: { 'backup.sh': '755', 'pass.txt': '600' } },
		mistakes: [
			{
				when: '権限を変える前に ./backup.sh を打った',
				why: 'backup.sh には誰にも x が無い。bash は Permission denied と断る',
				next: '先に chmod 755 backup.sh を打ってから動かす',
				match: 'Permission denied'
			},
			{
				when: '7 を超える数字を書いた（chmod 799 など）',
				why: '1 桁は r=4・w=2・x=1 の足し算で、7 までしか無い。chmod は invalid mode と断る',
				next: 'rwx は 7、r-x は 5、rw- は 6。755 と 600 を組み立て直す',
				match: 'invalid mode'
			},
			{
				when: 'ファイルの名前を打ち誤った',
				why: 'その名前のファイルは無い。chmod は cannot access と返し、何も変えない',
				next: 'ls で名前を確かめ、pass.txt と打ち直す',
				match: 'cannot access'
			}
		]
	},
	check: [
		{ ask: '-rwxr-xr-x の数', how: '755' },
		{ ask: 'pass.txt の権限', how: 'ls -l pass.txt が -rw------- を返す' },
		{ ask: '実行の印', how: 'x が無い台本は Permission denied で断られる' }
	]
};
