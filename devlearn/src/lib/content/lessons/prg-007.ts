// prg-007 例外を受け止める（本物の JavaScript）。
// 出力は全て、実戦の道具（src/lib/tools/js/run.ts）で走らせて得た物（solutions.test.ts が例を流して確かめる）。
// 場面：パン屋の差し入れ。12 個を人数で分ける。人数が 0 のときは分けられない。経過時刻 t は作業を始めた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const MAIN = '呼ぶ側';
const FN = 'share';
const OUT = '出力';

export const prg007: Lesson = {
	id: 'prg-007',
	field: 'prg',
	level: 2,
	title: '例外を受け止める',
	goal: '投げられたエラーが受け止められるまでの流れを追うことができる',
	prereq: ['prg-004'],
	related: ['ci-004'],
	next: ['prg-008'],
	explain: [
		{
			n: 1,
			title: '割り算の関数',
			lead: '個数を人数で割る関数 share を作る',
			body: [
				'function share(total, people) は total / people を返す。',
				'share(12, 3) は 4 を返す。',
				'ところが share(12, 0) は Infinity（無限大）を返し、止まらない。'
			],
			facts: [
				{ k: 'share(12, 3)', v: '4' },
				{ k: 'share(12, 0)', v: 'Infinity' }
			],
			scene: [
				{ op: 'appear', id: 'main', label: MAIN, sub: 'share(12, 3)', at: [0, 0] },
				{ op: 'appear', id: 'fn', label: FN, sub: 'total / people', at: [2, 0] },
				{ op: 'move', from: 'fn', to: 'main', payload: '4', kind: 'return' }
			],
			log: { t: '0s', from: FN, to: MAIN, kind: 'return', info: 'share(12, 3) は 4 を返した' }
		},
		{
			n: 2,
			title: '0 で投げる',
			lead: 'throw で、続けられないことを知らせる',
			body: [
				"if (people === 0) throw new Error('人数が 0'); を先頭に足す。",
				'throw は、その場で関数を止め、エラーの物を投げる。',
				'return の行には届かず、値は返らない。'
			],
			facts: [
				{ k: '足した行', v: "throw new Error('人数が 0')" },
				{ k: 'share(12, 0)', v: '値を返さず、投げる' },
				{ k: 'e.message', v: '人数が 0' }
			],
			scene: [
				{ op: 'appear', id: 'err', label: 'Error', sub: '人数が 0', at: [2, 1] },
				{ op: 'move', from: 'fn', to: 'err', payload: 'throw', kind: 'throw' }
			],
			log: {
				t: '1s',
				from: FN,
				to: 'Error',
				kind: 'throw',
				info: "share(12, 0) が Error('人数が 0') を投げた"
			}
		},
		{
			n: 3,
			title: '呼び出し元へ遡る',
			lead: '投げたエラーは、呼んだ側へ戻っていく',
			body: [
				'share の中に受け止める所が無いので、エラーは呼んだ側へ戻る。',
				'呼んだ側にも無ければ、さらに外へ遡る。',
				'一番外まで受け止められないと、Uncaught Error と出て止まる。'
			],
			facts: [
				{ k: '遡る道', v: 'share → 呼ぶ側 → 一番外' },
				{ k: '受け止めないと', v: 'Uncaught Error: 人数が 0' }
			],
			scene: [
				{ op: 'move', from: 'err', to: 'main', payload: '人数が 0', kind: 'throw' },
				{ op: 'change', id: 'main', k: '状態', v: '止まった' }
			],
			log: {
				t: '1s',
				from: 'Error',
				to: MAIN,
				kind: 'throw',
				info: '呼ぶ側まで遡った。受け止める所が無い'
			},
			why: '投げた所では、どう続けるかを決められない。決められる呼んだ側まで戻すため'
		},
		{
			n: 4,
			title: 'try で受け止める',
			lead: 'try の中で投げられたエラーは、catch へ飛ぶ',
			body: [
				'呼ぶ側を try { … } catch (e) { … } で囲む。',
				'try の中で share(12, 0) が投げると、残りの行を飛ばして catch へ移る。',
				"try の中の console.log('ここは走らない') は走らない。"
			],
			facts: [
				{ k: 'try の 1 行目', v: 'share(12, 3) → 4 を出力' },
				{ k: 'try の 2 行目', v: 'share(12, 0) → 投げた' },
				{ k: 'try の 3 行目', v: '走らない' }
			],
			scene: [
				{ op: 'appear', id: 'catch', label: 'catch (e)', sub: '受け止める', at: [1, 1] },
				{ op: 'move', from: 'err', to: 'catch', payload: '人数が 0', kind: 'catch' },
				{ op: 'change', id: 'main', k: '状態', v: '続いている' }
			],
			log: {
				t: '2s',
				from: 'Error',
				to: 'catch (e)',
				kind: 'catch',
				info: 'catch が受け止めた。止まらない'
			}
		},
		{
			n: 5,
			title: 'catch で知らせる',
			lead: 'e.message で、何が起きたかを出して続ける',
			body: [
				"catch の中で console.log('受け止めた:', e.message) と書く。",
				'e は投げられた Error で、e.message は「人数が 0」だ。',
				'エラーで止まらず、次の処理へ進める。'
			],
			facts: [
				{ k: 'e.message', v: '人数が 0' },
				{ k: '出力', v: '受け止めた: 人数が 0' }
			],
			scene: [
				{ op: 'appear', id: 'out', label: OUT, sub: 'console.log', at: [0, 2] },
				{ op: 'move', from: 'catch', to: 'out', payload: '受け止めた: 人数が 0', kind: 'log' }
			],
			log: {
				t: '2s',
				from: 'catch (e)',
				to: OUT,
				kind: 'log',
				info: '受け止めた: 人数が 0 を出した'
			}
		},
		{
			n: 6,
			title: 'finally が必ず走る',
			lead: '投げても投げなくても、最後に finally が走る',
			body: [
				"finally { console.log('片付けた') } を最後に足す。",
				'エラーがあっても無くても、try と catch の後に必ず走る。',
				'開けた物を閉じるような、必ずしたい片付けに使う。'
			],
			facts: [
				{ k: '投げたとき', v: 'try → catch → finally' },
				{ k: '投げないとき', v: 'try → finally' },
				{ k: '出力の最後', v: '片付けた' }
			],
			scene: [
				{ op: 'appear', id: 'fin', label: 'finally', sub: '片付け', at: [1, 2] },
				{ op: 'move', from: 'fin', to: 'out', payload: '片付けた', kind: 'log' }
			],
			log: { t: '3s', from: 'finally', to: OUT, kind: 'log', info: '片付けた を出した' }
		}
	],
	example: {
		intro: '3 で割り、次に 0 で割って受け止める。下の 13 行を走らせた',
		lines: [
			'function share(total, people) {',
			"  if (people === 0) throw new Error('人数が 0');",
			'  return total / people;',
			'}',
			'try {',
			'  console.log(share(12, 3));',
			'  console.log(share(12, 0));',
			"  console.log('ここは走らない');",
			'} catch (e) {',
			"  console.log('受け止めた:', e.message);",
			'} finally {',
			"  console.log('片付けた');",
			'}',
			'▶ 出力',
			'4',
			'受け止めた: 人数が 0',
			'片付けた'
		]
	},
	practice: {
		goal: '数でない入力だけを受け止めて知らせ、残りの入力を足し終える',
		tool: { name: 'js', mode: 'real' },
		setup: {
			code: "function parseCount(text) {\n  const n = Number(text);\n  if (Number.isNaN(n)) throw new Error('数でない: ' + text);\n  return n;\n}\n// 数でない入力は console.log('読めない:', e.message) と出して、次の入力へ進む\nconst inputs = ['3', 'x', '5'];\nlet total = 0;\nfor (const t of inputs) {\n  total += parseCount(t);\n}\nconsole.log('合計', total);\n"
		},
		success: { output: '読めない: 数でない: x\n合計 8\n' },
		mistakes: [
			{
				when: 'どこにも try を置かなかった',
				why: "'x' で投げたエラーを誰も受け止めず、一番外まで遡って止まる。合計は出ない",
				next: 'total += parseCount(t); の 1 行を try { … } catch (e) { … } で囲む',
				match: 'Uncaught Error'
			},
			{
				when: 'for 全体を try で囲んだ',
				why: "'x' で投げると for から抜けて catch へ飛ぶ。後ろの '5' を足さないまま終わる",
				next: 'try を for の { } の中に入れ、1 つの入力ごとに受け止める',
				match: '合計 3'
			},
			{
				when: 'catch の丸括弧の名前と、中で使う名前が違う',
				why: 'catch (err) と書いて e.message を読むと、e は無い名前だ。ReferenceError になる',
				next: 'catch (e) と書くか、中を err.message にそろえる',
				match: 'e is not defined'
			}
		]
	},
	check: [
		{ ask: 'throw の後の行', how: '走らない。関数はその場で止まる' },
		{ ask: '受け止める所', how: '呼んだ側へ遡り、最初の try の catch' },
		{ ask: 'finally', how: '投げても投げなくても最後に走る' }
	]
};
