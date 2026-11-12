// prg-012 文字とバイト（本物の JavaScript）。
// 出力は全て、実戦の道具（src/lib/tools/js/run.ts）で走らせて得た物（solutions.test.ts が例を流して確かめる）。
// TextEncoder / TextDecoder はブラウザの JavaScript にある、文字と UTF-8 のバイト列を行き来する仕組み。
// 場面：港の看板の文字「港A」を、送る前にバイトの並びにする。経過時刻 t は作業の順に 0s・1s… と置いた。
import type { Lesson } from '../../lesson/types.ts';

const TEXT = '文字';
const BYTES = 'バイト列';

export const prg012: Lesson = {
	id: 'prg-012',
	field: 'prg',
	level: 1,
	title: '文字とバイト',
	goal: '文字が UTF-8 のバイト列になる様子を確かめることができる',
	prereq: [],
	related: ['prg-001', 'net-007'],
	next: ['sec-002'],
	explain: [
		{
			n: 1,
			title: '文字 A',
			lead: '画面の A は、機械の中では番号で持っている',
			body: [
				'機械が覚えられるのは数だけなので、文字には番号を割り当てる。',
				'世界の文字に番号を振った表を Unicode（ユニコード）と言う。',
				"'A'.codePointAt(0) で、A の番号を読める。"
			],
			facts: [
				{ k: '文字', v: 'A' },
				{ k: '書いた物', v: "'A'.codePointAt(0)" }
			],
			scene: [{ op: 'appear', id: 'text', label: TEXT, sub: "'A'", at: [0, 0] }],
			log: { t: '0s', from: TEXT, to: TEXT, kind: 'char', info: 'A の番号を読む' }
		},
		{
			n: 2,
			title: '番号に変わる',
			lead: 'A の番号は 65。16 進数では U+0041 と書く',
			body: [
				'出力は 65 で、16 進数では 41 だ。',
				'Unicode の番号は U+0041 のように U+ を付けて書く。',
				'UTF-8 は、この番号をバイト（8 ビットの数）の並びにする決まりだ。'
			],
			facts: [
				{ k: "'A'.codePointAt(0)", v: '65' },
				{ k: '16 進数', v: 'U+0041' },
				{ k: 'UTF-8', v: '[ 65 ]（1 バイト）' }
			],
			scene: [
				{ op: 'appear', id: 'bytes', label: BYTES, sub: 'UTF-8', at: [2, 0] },
				{ op: 'move', from: 'text', to: 'bytes', payload: 'A → 65', kind: 'encode' },
				{ op: 'change', id: 'bytes', k: '中身', v: '[ 65 ]' }
			],
			log: {
				t: '1s',
				from: TEXT,
				to: BYTES,
				kind: 'encode',
				info: 'A は 65 の 1 バイト',
				size: '1 B'
			}
		},
		{
			n: 3,
			title: '漢字 1 字は 3 バイト',
			lead: '番号の大きい文字は、何バイトかに分けて表す',
			body: [
				'「港」の番号は U+6E2F で、1 バイト（0〜255）に収まらない。',
				'UTF-8 はこの番号を 3 つのバイトに分ける。',
				"new TextEncoder().encode('港') は 230, 184, 175 を返す。"
			],
			facts: [
				{ k: '「港」の番号', v: 'U+6E2F' },
				{ k: 'UTF-8', v: '[ 230, 184, 175 ]' },
				{ k: '16 進数', v: 'E6 B8 AF' }
			],
			scene: [
				{ op: 'change', id: 'text', k: '文字', v: "'港'" },
				{ op: 'move', from: 'text', to: 'bytes', payload: '港 → 3 バイト', kind: 'encode' },
				{ op: 'change', id: 'bytes', k: '中身', v: '[ 230, 184, 175 ]' }
			],
			log: {
				t: '2s',
				from: TEXT,
				to: BYTES,
				kind: 'encode',
				info: '港は E6 B8 AF の 3 バイト',
				size: '3 B'
			},
			why: 'よく使う英字を 1 バイトのまま残し、昔の英字だけの仕組みともそのまま通じるようにした'
		},
		{
			n: 4,
			title: 'バイト列を並べる',
			lead: '文字列は、文字ごとのバイトを順につないだ物になる',
			body: [
				"'港A' を UTF-8 にすると、港の 3 バイトの後に A の 1 バイトが続く。",
				'並びは 230, 184, 175, 65 の 4 バイトだ。',
				'送るのも保存するのも、このバイトの並びだ。'
			],
			facts: [
				{ k: '文字列', v: "'港A'" },
				{ k: 'UTF-8', v: '[ 230, 184, 175, 65 ]' }
			],
			scene: [
				{ op: 'change', id: 'text', k: '文字', v: "'港A'" },
				{ op: 'change', id: 'bytes', k: '中身', v: '[ 230, 184, 175, 65 ]' },
				{ op: 'move', from: 'text', to: 'bytes', payload: '港 + A', kind: 'encode' }
			],
			log: { t: '3s', from: TEXT, to: BYTES, kind: 'encode', info: '港A は 4 バイト', size: '4 B' }
		},
		{
			n: 5,
			title: '文字数とバイト数の違い',
			lead: "'港A'.length は 2、バイト数は 4",
			body: [
				'文字列の .length は文字の数を数え、2 を返す。',
				'UTF-8 のバイト数は 4 で、数が合わない。',
				'入る量が「バイト数」で決まる所では、日本語は英字より早く埋まる。'
			],
			facts: [
				{ k: "'港A'.length", v: '2' },
				{ k: 'UTF-8 のバイト数', v: '4' }
			],
			scene: [
				{ op: 'change', id: 'text', k: '文字数', v: '2' },
				{ op: 'change', id: 'bytes', k: 'バイト数', v: '4' },
				{ op: 'highlight', id: 'bytes' }
			],
			log: { t: '4s', from: TEXT, to: BYTES, kind: 'count', info: '文字は 2、バイトは 4' }
		},
		{
			n: 6,
			title: '戻すと元の文字',
			lead: 'TextDecoder で、バイト列を文字に戻す',
			body: [
				'new TextDecoder().decode(…) に 230, 184, 175 を渡す。',
				'UTF-8 の決まりを逆にたどり、港 が返る。',
				'送る側と受ける側が同じ決まりを使うので、文字が崩れない。'
			],
			facts: [
				{ k: '渡したバイト', v: '[ 230, 184, 175 ]' },
				{ k: '戻った文字', v: '港' }
			],
			scene: [
				{ op: 'appear', id: 'back', label: '戻した文字', sub: 'TextDecoder', at: [1, 1] },
				{ op: 'move', from: 'bytes', to: 'back', payload: 'E6 B8 AF', kind: 'decode' },
				{ op: 'change', id: 'back', k: '文字', v: '港' }
			],
			log: {
				t: '5s',
				from: BYTES,
				to: '戻した文字',
				kind: 'decode',
				info: '3 バイトを港に戻した',
				size: '3 B'
			}
		}
	],
	example: {
		intro: 'A と港を UTF-8 にして数え、戻す。下の 6 行を走らせた',
		lines: [
			'const enc = new TextEncoder();',
			"console.log('A'.codePointAt(0));",
			"console.log(Array.from(enc.encode('港')));",
			"const s = '港A';",
			'console.log(s.length, enc.encode(s).length);',
			'console.log(new TextDecoder().decode(new Uint8Array([230, 184, 175])));',
			'▶ 出力',
			'65',
			'[ 230, 184, 175 ]',
			'2 4',
			'港'
		]
	},
	practice: {
		goal: '看板の文字「みなと」の UTF-8 のバイト数と文字数を出す',
		tool: { name: 'js', mode: 'real' },
		setup: {
			code: "const name = 'みなと';\n// UTF-8 にしたバイト数と、文字数を、この順に 1 行で console.log する\n"
		},
		success: { output: '9 3\n' },
		mistakes: [
			{
				when: '.length を 2 回出した',
				why: '.length は文字の数で、バイト数ではない。ひらがなは 1 文字 3 バイトになる',
				next: 'new TextEncoder().encode(name).length でバイト数を求める',
				match: '3 3'
			},
			{
				when: '文字数とバイト数を逆に出した',
				why: '先にバイト数、後に文字数の順と決めてある',
				next: 'console.log(バイト数, 文字数) の順に並べ替える',
				match: '3 9'
			},
			{
				when: 'TextEncoder の綴りを誤った',
				why: 'その名前の物は無い。JavaScript は ReferenceError: … is not defined で止まる',
				next: 'T と E を大文字にして TextEncoder と書く',
				match: 'is not defined'
			}
		]
	},
	check: [
		{ ask: 'A の UTF-8', how: '1 バイト（65）' },
		{ ask: '港の UTF-8', how: '3 バイト（230, 184, 175）' },
		{ ask: '.length の数える物', how: '文字の数。バイト数とは違う' }
	]
};
