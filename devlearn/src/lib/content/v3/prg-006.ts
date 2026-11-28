// 見本の題（第 3 版。見せ方の型 memory）：prg-006「同じ物を指す変数」。試作 learn11 の #mem が下限（learn-standard.md 第 15・20 章）。
// 試作は Python だが、本番の prg 分野の実戦は本物の JavaScript（curriculum.md 第 5 章 prg-006 の js:本物）なので JavaScript で書いた。
// 出力は全て Node.js v24.19.0（V8 13.6.233.17）で走らせて取った（確認日 2026-11-28）：
//   console.log(a) → [ 1, 2, 3 ]、a === b → true、[1, 2] === [1, 2] → false、add の後 c → [ 1, 2, 3, 4 ]・a === c → false、
//   中で xs.push(4) すると a も [ 1, 2, 3, 4 ]、浅い写しの s[0] === a[0] → true・structuredClone の d[0] === a[0] → false、
//   輪になった配列は d = null の後 gc() で WeakRef が undefined（--expose-gc）、
//   %DebugPrint（--allow-natives-syntax）：[1, 2] の要素の置き場は FixedArray[2]（COW）、push(3) の後 FixedArray[20]。
// 席の数の式は V8 13.6 の src/objects/js-objects.h の NewElementsCapacity：old + (old >> 1) + 16。3 + 1 + 16 = 20（計算で確かめた）。
// GC の作り：v8.dev/blog/trash-talk（2019-01-03）・v8.dev/blog/orinoco-parallel-scavenger（2017-11-29）。
// 64 bit の Node.js の標準の版は pointer compression を使わない（process.config.variables.v8_enable_pointer_compression = 0）
import type { V3Lesson } from '../../learn/check-v3.ts';

const CODE = [
	'let a = [1, 2];',
	'let b = a;',
	'b.push(3);',
	'console.log(a);',
	'',
	'function add(xs) {',
	'  xs = [...xs, 4];',
	'  return xs;',
	'}',
	'let c = add(a);',
	'a = null;',
	'b = null;',
	'',
	'let d = [];',
	'd.push(d);',
	'd = null;'
];

export const PRG_006_V3: V3Lesson = {
	id: 'prg-006',
	field: 'prg',
	title: '同じ物を指す変数',
	goal: '2 つの変数が同じ物を指すとき、書き換えの結果を、名前・参照・ヒープの物で予想して説明できる',
	view: 'memory',
	kick: 'プログラミング ・ 段 2（仕組み）・ 見せ方：名前と物',
	code: { file: 'main.js', lines: CODE },
	terms: [
		'js',
		'value',
		'variable',
		'let',
		'assign',
		'array',
		'element',
		'memory',
		'heap',
		'reference',
		'function',
		'frame',
		'consolelog',
		'push',
		'mutate',
		'identity',
		'call',
		'arg',
		'return',
		'spread',
		'copy',
		'shallow',
		'clone',
		'null',
		'gc',
		'root',
		'reach',
		'cycle',
		'marksweep',
		'nodejs',
		'v8',
		'capacity',
		'young',
		'scavenge'
	],
	objs: {
		mod: { kind: 'frame', name: '外側のフレーム', term: 'frame' },
		fadd: { kind: 'frame', name: 'add の呼び出し', term: 'call' },
		va: { kind: 'var', name: 'a', term: 'variable' },
		vb: { kind: 'var', name: 'b', term: 'variable' },
		vc: { kind: 'var', name: 'c', term: 'variable' },
		vd: { kind: 'var', name: 'd', term: 'variable' },
		vxs: { kind: 'var', name: 'xs', term: 'arg' },
		L1: { kind: 'list', name: '配列 #1', term: 'array' },
		L1g: { kind: 'list', name: '配列 #1（席 20）', term: 'capacity' },
		L2: { kind: 'list', name: '配列 #2', term: 'array' },
		L3: { kind: 'list', name: '配列 #3', term: 'cycle' },
		gc: { kind: 'func', name: 'ガベージコレクション', tone: 'gray', glyph: '♻', term: 'gc' }
	},
	metrics: [
		{ key: 'objs', label: 'ヒープの配列', desc: '今ヒープに置かれている配列の数。' },
		{ key: 'same', label: 'a === b', term: 'identity' },
		{ key: 'out', label: '画面の出力', term: 'consolelog' },
		{ key: 'cap', label: '配列 #1 の席の数', term: 'capacity' }
	],
	steps: [
		{
			kind: 'intro',
			short: '言葉',
			title: '始める前に：言葉をそろえる',
			intro: {
				terms: [
					'js',
					'value',
					'variable',
					'let',
					'assign',
					'array',
					'element',
					'memory',
					'heap',
					'reference',
					'frame'
				],
				anatomy: [
					{ text: 'let', note: '名前を作る', term: 'let', color: '#6ea0ff' },
					{ pre: ' ', text: 'a', note: '名前', term: 'variable', color: '#f0a252' },
					{ pre: ' ', text: '=', note: '右の物を名前に結ぶ', term: 'assign', color: '#c58cf0' },
					{ pre: ' ', text: '[1, 2]', post: ';', note: '値の並び', term: 'array', color: '#5fd0a0' }
				],
				analogy:
					'変数は荷物に付ける名札。名札を 2 枚付けても、荷物は 1 つのまま。片方の名札から中を変えると、もう片方から見ても変わっている。'
			},
			paras: [
				'JavaScript で、名前と物の関係を追う。',
				'let a = [1, 2] と書く。上の札を左から見てほしい。a は変数、[1, 2] は配列という値だ。= で右の値を左の名前に結ぶことを代入と呼ぶ。',
				'配列の 1 つ 1 つの値を要素と呼ぶ。配列はメモリの中のヒープという場所に置かれる。',
				'a には配列そのものでなく、在りか（参照）が入る。名前と値の表をフレームと呼ぶ。要らなくなった物は片付け係が片付ける。'
			],
			at: [0, 1600, 3400, 5200],
			dur: 7800,
			layout: {
				mod: [260, 430, 0.7],
				va: [260, 420],
				L1: [560, 430, 1.15],
				gc: [850, 430, 1]
			},
			names: { L1: 'ヒープの配列', gc: '片付け係' },
			links: [{ from: 'va', to: 'L1', kind: 'ref' }],
			lists: { L1: { vals: ['1', '2'] } },
			tokens: [{ name: '在りか', tone: 'yellow', path: ['L1', 'va'], at: 5200, d: 1400 }],
			metrics: { objs: '1', same: '—', out: '—', cap: '2' },
			callout: [
				'たとえると',
				'変数は名札、配列は荷物。名札には荷物の置き場所が書いてある。荷物そのものは名札に入らない。'
			],
			changes: [['+', '登場する物：外側のフレームの a・ヒープの配列・片付け係']],
			first: [
				'js',
				'let',
				'variable',
				'array',
				'value',
				'assign',
				'element',
				'memory',
				'heap',
				'reference',
				'frame'
			]
		},
		{
			kind: 'problem',
			short: '問題',
			notes: [{ obj: 'L1', text: '指す名前 2 つ（a・b）', tone: 'yellow', dy: -115 }],
			title: 'b を書き換えたのに、a まで変わった',
			paras: [
				'b = a と書いてから、b.push(3) で b に 3 を足す。push は配列の最後に要素を足す命令だ。',
				'console.log(a) と書くと、触っていないはずの a が [ 1, 2, 3 ] と出る。',
				'なぜ a の書き換えが起きたのか。名前と物を分けて見ると答えが出る。'
			],
			at: [0, 2000, 4000],
			dur: 6400,
			code: { cur: [2, 3, 4], done: [1], out: ['[ 1, 2, 3 ]'] },
			layout: {
				mod: [480, 300, 0.8],
				va: [450, 262],
				vb: [515, 338],
				L1: [810, 300]
			},
			hl: ['L1'],
			links: [
				{ from: 'va', to: 'L1', kind: 'ref' },
				{ from: 'vb', to: 'L1', kind: 'ref' }
			],
			lists: { L1: { vals: ['1', '2', '3'], newIdx: 2 } },
			tokens: [
				{ name: 'push(3)', tone: 'blue', path: ['vb', 'L1'], at: 600, d: 1300 },
				{ name: 'a を読む', tone: 'yellow', path: ['va', 'L1'], at: 2400, d: 1300 }
			],
			metrics: { objs: '1', same: 'true', out: '[ 1, 2, 3 ]', cap: '2 → 20' },
			callout: ['ポイント', '書き換えたのは b という名前ではない。b が指していた物だ。'],
			changes: [
				['+', 'b が同じ配列を指す'],
				['~', '配列 #1 に 3 が足された']
			],
			first: ['push', 'mutate', 'consolelog']
		},
		{
			kind: 'mechanism',
			short: '= の意味',
			notes: [{ obj: 'L1', text: '指す名前 2 つ（a・b）', tone: 'yellow', dy: -115 }],
			title: 'let b = a は、在りかを写すだけ',
			paras: [
				'= の右が変数の時、写るのは在りかだ。物は 1 つのまま増えない。',
				'だから a と b は同じ配列を指す。=== で比べると true になる。',
				'中身が同じでも、別に作った [1, 2] === [1, 2] は false だ。=== は物が同じかを比べる。'
			],
			at: [0, 2200, 4200],
			dur: 6600,
			code: { cur: [2], done: [1] },
			layout: {
				mod: [480, 300, 0.8],
				va: [450, 262],
				vb: [515, 338],
				L1: [810, 300, 1.1]
			},
			hl: ['vb'],
			links: [
				{ from: 'va', to: 'L1', kind: 'ref' },
				{ from: 'vb', to: 'L1', kind: 'ref' }
			],
			lists: { L1: { vals: ['1', '2'] } },
			tokens: [{ name: '在りか', tone: 'yellow', path: ['va', 'vb'], at: 500, d: 1200 }],
			metrics: { objs: '1', same: 'true', out: '—', cap: '2' },
			callout: [
				'よくある誤解',
				'「= で写すと物が 2 つになる」は誤り。写るのは在りかで、物は 1 つ。'
			],
			changes: [['+', 'b が配列 #1 を指す（物は増えない）']],
			deep: 'V8 では、変数の値は 1 語の「印のついた値」。小さな整数（Smi）はそのまま入り、配列はヒープの JSArray への番地が入る。let b = a はこの 1 語を写すだけ。64 bit の Node.js の標準の版は番地を 64 bit のまま持つ（pointer compression は使わない。Chrome の V8 は 32 bit に縮める）。',
			first: ['identity']
		},
		{
			kind: 'mechanism',
			short: 'push',
			notes: [{ obj: 'L1', text: '指す名前 2 つ ・ 長さ 3 ・ 席 20', tone: 'yellow', dy: -115 }],
			title: 'b.push(3) は、指した先の物を書き換える',
			paras: [
				'b.push(3) は、b が指す配列の最後に 3 を足す。新しい配列は作らない。',
				'a も同じ配列を指すので、a から見ても [ 1, 2, 3 ] だ。',
				'物の中身をその場で変える命令は、他に sort・splice・a[0] = 9 などがある。'
			],
			at: [0, 2000, 4000],
			dur: 6400,
			code: { cur: [3, 4], done: [1, 2], out: ['[ 1, 2, 3 ]'] },
			layout: {
				mod: [480, 300, 0.8],
				va: [450, 262],
				vb: [515, 338],
				L1: [810, 300]
			},
			hl: ['L1'],
			links: [
				{ from: 'va', to: 'L1', kind: 'ref' },
				{ from: 'vb', to: 'L1', kind: 'ref' }
			],
			lists: { L1: { vals: ['1', '2', '3'], newIdx: 2 } },
			tokens: [
				{ name: 'push(3)', tone: 'blue', path: ['vb', 'L1'], at: 400, d: 1300 },
				{ name: '[ 1, 2, 3 ]', tone: 'yellow', path: ['L1', 'va'], at: 2400, d: 1300 }
			],
			metrics: { objs: '1', same: 'true', out: '[ 1, 2, 3 ]', cap: '2 → 20' },
			callout: ['ポイント', '名前が何枚あっても、物が 1 つなら、変化は全ての名前から見える。'],
			changes: [['~', '配列 #1：[1, 2] → [1, 2, 3]']],
			deep: 'V8 の配列 JSArray は、長さ length と要素の置き場（FixedArray）を持つ。[1, 2] の置き場は席 2 で、書くまで共有する置き場（COW）。push(3) で席が足りず、新しい置き場を席 NewElementsCapacity(3) = 3 + (3 >> 1) + 16 = 20 で取り直す（V8 13.6 の src/objects/js-objects.h。%DebugPrint で FixedArray[2] → FixedArray[20] を確かめた）。a と b が指す JSArray は同じなので、置き場を替えても両方から見える。',
			first: []
		},
		{
			kind: 'internals',
			short: '呼び出し',
			notes: [{ obj: 'L1', text: '指す名前 3 つ（a・b・xs）', tone: 'yellow', dy: -115 }],
			title: 'add(a) を呼ぶと、新しいフレームができる',
			paras: [
				'関数 add を add(a) で呼ぶ。この呼び出しで、add 用のフレームが 1 枚できる。',
				'引数の xs には a の在りかが写る。xs も配列 #1 を指す。',
				'return で値を返すと、このフレームは消える。'
			],
			at: [0, 1800, 3800],
			dur: 6200,
			code: { cur: [10, 6], done: [1, 2, 3, 4] },
			layout: {
				mod: [480, 170, 0.66],
				va: [455, 140],
				vb: [510, 205],
				fadd: [480, 440, 0.6],
				vxs: [480, 432],
				L1: [810, 300]
			},
			hl: ['fadd'],
			links: [
				{ from: 'va', to: 'L1', kind: 'ref' },
				{ from: 'vb', to: 'L1', kind: 'ref' },
				{ from: 'vxs', to: 'L1', kind: 'ref' }
			],
			lists: { L1: { vals: ['1', '2', '3'] } },
			tokens: [
				{ name: '在りか', tone: 'yellow', path: ['va', 'vxs'], at: 600, d: 1400, gone: true }
			],
			metrics: { objs: '1', same: 'true', out: '[ 1, 2, 3 ]', cap: '20' },
			callout: ['ポイント', '関数に渡るのも在りか。xs は a の物を指す 3 枚目の名札になる。'],
			changes: [
				['+', 'add のフレーム'],
				['+', 'xs が配列 #1 を指す']
			],
			deep: '仕様（ECMAScript 2024）では、フレームの中の名前の表は Environment Record。V8 は関数を呼ぶと、マシンのスタックに引数と局所の値の席を積む。引数は値を写して渡す（物は写さない。配列なら番地を写す）。',
			first: ['function', 'call', 'arg', 'return']
		},
		{
			kind: 'internals',
			short: '新しい物',
			notes: [
				{ obj: 'L1', text: '指す名前 2 つ（a・b）', tone: 'yellow', dy: -115 },
				{ obj: 'L2', text: '新しい物 ・ 指す名前 1 つ（xs）', tone: 'blue', dy: -115, at: 2600 },
				{ obj: 'vxs', text: 'xs：#1 → #2 に付け替え', tone: 'teal', dy: -100, at: 2600 }
			],
			title: 'xs = [...xs, 4] は、新しい配列を作って xs を付け替える',
			paras: [
				'スプレッド構文 [...xs, 4] は、xs の要素を新しい配列へ並べ直し、最後に 4 を足す。',
				'= で xs をその新しい配列 #2 に結び直す。配列 #1 は書き換えない。',
				'だから a は [ 1, 2, 3 ] のまま。返した配列 #2 は c が指す。'
			],
			at: [0, 2200, 4400],
			dur: 6800,
			code: { cur: [7], done: [1, 2, 3, 4, 6, 10] },
			layout: {
				mod: [480, 170, 0.6],
				va: [455, 140],
				vb: [510, 205],
				fadd: [480, 440, 0.6],
				vxs: [480, 432],
				L1: [800, 170, 0.85],
				L2: [800, 440, 0.85]
			},
			hl: ['L2'],
			links: [
				{ from: 'va', to: 'L1', kind: 'ref' },
				{ from: 'vb', to: 'L1', kind: 'ref' },
				{ from: 'vxs', to: 'L2', kind: 'ref' }
			],
			lists: { L1: { vals: ['1', '2', '3'] }, L2: { vals: ['1', '2', '3', '4'], newIdx: 3 } },
			tokens: [
				{ name: '1, 2, 3', tone: 'blue', path: ['L1', 'L2'], at: 500, d: 1500, gone: true },
				{ name: '在りか', tone: 'yellow', path: ['L2', 'vxs'], at: 2600, d: 1300, gone: true }
			],
			metrics: { objs: '2', same: 'true', out: '[ 1, 2, 3 ]', cap: '20' },
			callout: ['ポイント', '= は名札を付け替えるだけ。物の中身は変えない。'],
			changes: [
				['+', '配列 #2：[1, 2, 3, 4]'],
				['~', 'xs：配列 #1 → 配列 #2']
			],
			deep: 'スプレッド構文は仕様では配列の反復（Symbol.iterator）で要素を 1 つずつ取り出し、新しい配列へ足していく。V8 は速い道で要素の置き場を写す。新しい配列は新しい番地を持つので、a === c は false（Node.js v24.19.0 で確かめた）。',
			first: ['spread']
		},
		{
			kind: 'fail',
			short: '失敗',
			notes: [
				{ obj: 'L1', text: '指す名前 3 つ（a・b・xs）→ a も b も変わる', tone: 'red', dy: -115 }
			],
			title: '中で xs.push(4) と書くと、呼んだ側の a まで変わる',
			paras: [
				'add の中を xs.push(4) にすると、配列 #1 そのものに 4 が足される。',
				'呼んだ側の a も [ 1, 2, 3, 4 ] になる。a === c も true だ。',
				'渡した物を中で書き換える関数は、思わぬ所の値を変える。不具合の元になりやすい。'
			],
			at: [0, 2000, 4000],
			dur: 6400,
			code: {
				cur: [7],
				done: [1, 2, 3, 4, 6, 10],
				lines: [
					'let a = [1, 2];',
					'let b = a;',
					'b.push(3);',
					'console.log(a);',
					'',
					'function add(xs) {',
					'  xs.push(4);  // 書き換える',
					'  return xs;',
					'}',
					'let c = add(a);',
					'console.log(a);'
				],
				out: ['[ 1, 2, 3 ]', '[ 1, 2, 3, 4 ]']
			},
			layout: {
				mod: [480, 170, 0.6],
				va: [455, 140],
				vb: [510, 205],
				fadd: [480, 440, 0.6],
				vxs: [480, 432],
				L1: [810, 300]
			},
			hl: ['L1'],
			links: [
				{ from: 'va', to: 'L1', kind: 'ref' },
				{ from: 'vb', to: 'L1', kind: 'ref' },
				{ from: 'vxs', to: 'L1', kind: 'ref' }
			],
			lists: { L1: { vals: ['1', '2', '3', '4'], newIdx: 3 } },
			tokens: [
				{ name: 'push(4)', tone: 'red', path: ['vxs', 'L1'], at: 500, d: 1400 },
				{ name: '[ 1, 2, 3, 4 ]', tone: 'red', path: ['L1', 'va'], at: 2500, d: 1300 }
			],
			metrics: { objs: '1', same: 'true', out: '[ 1, 2, 3, 4 ]', cap: '20' },
			callout: [
				'気をつける',
				'関数の名前や説明に「書き換える」と書いていないなら、渡された物は変えない。'
			],
			changes: [['~', '配列 #1：[1, 2, 3] → [1, 2, 3, 4]（呼んだ側まで）']],
			first: []
		},
		{
			kind: 'fix',
			short: '写し',
			notes: [
				{ obj: 'L1', text: '元：指す名前 1 つ（a）', tone: 'yellow', dy: -115 },
				{ obj: 'L2', text: '写し：指す名前 1 つ（ys）', tone: 'blue', dy: -115 }
			],
			title: '写しを作ってから変える。浅い写しと深い写し',
			paras: [
				'中で変えたい時は、先に写しを作る。[...xs] は浅い写しだ。',
				'浅い写しは一番外の配列だけを作り直す。中に入れた配列は元と同じ物を指したまま。',
				'中の物まで全て作り直すなら structuredClone(xs) を使う。'
			],
			at: [0, 2000, 4200],
			dur: 6600,
			code: {
				cur: [7, 8],
				done: [1, 2, 3, 4, 6, 11],
				lines: [
					'let a = [1, 2];',
					'let b = a;',
					'b.push(3);',
					'console.log(a);',
					'',
					'function add(xs) {',
					'  const ys = [...xs];',
					'  ys.push(4);',
					'  return ys;',
					'}',
					'let c = add(a);',
					'console.log(a);'
				],
				out: ['[ 1, 2, 3 ]', '[ 1, 2, 3 ]']
			},
			layout: {
				mod: [480, 170, 0.6],
				va: [480, 162],
				fadd: [480, 440, 0.6],
				vxs: [480, 432],
				L1: [800, 170, 0.85],
				L2: [800, 440, 0.85]
			},
			names: { vxs: 'ys' },
			hl: ['L2'],
			links: [
				{ from: 'va', to: 'L1', kind: 'ref' },
				{ from: 'vxs', to: 'L2', kind: 'ref' }
			],
			lists: { L1: { vals: ['1', '2', '3'] }, L2: { vals: ['1', '2', '3', '4'], newIdx: 3 } },
			tokens: [
				{ name: '写す', tone: 'blue', path: ['L1', 'L2'], at: 500, d: 1500 },
				{ name: 'push(4)', tone: 'blue', path: ['vxs', 'L2'], at: 2400, d: 1300 }
			],
			metrics: { objs: '2', same: 'true', out: '[ 1, 2, 3 ]', cap: '20' },
			callout: [
				'使い分け',
				'数や文字だけの配列なら浅い写しで足りる。配列の中に配列があるなら structuredClone。'
			],
			changes: [['+', '写しの配列 #2（配列 #1 は [1, 2, 3] のまま）']],
			deep: 'const a = [[1], 2] で確かめると、浅い写し s = [...a] は s[0] === a[0] が true（中の [1] は同じ物）、structuredClone の d は d[0] === a[0] が false（Node.js v24.19.0）。structuredClone は HTML の仕様の structured clone の決まりで写し、関数は写せない（DataCloneError）。',
			first: ['copy', 'shallow', 'clone']
		},
		{
			kind: 'internals',
			short: '片付け',
			notes: [
				{ obj: 'L1', text: '指す名前 0 → 片付く', tone: 'red', dy: -115 },
				{ obj: 'L2', text: '指す名前 1 つ（c）', tone: 'yellow', dy: -115 }
			],
			title: '誰からも辿れない物は、ガベージコレクションが片付ける',
			paras: [
				'a = null と b = null で、a と b は配列 #1 から離れる。add のフレームも、もう無い。',
				'すると配列 #1 は、どの変数からも辿れない。c が指す配列 #2 は辿れる。',
				'ガベージコレクションは、根（動いているフレームの変数など）から参照を追う。辿れない物のメモリを空ける。'
			],
			at: [0, 2200, 4400],
			dur: 7000,
			code: { cur: [11, 12], done: [1, 2, 3, 4, 6, 7, 8, 10] },
			layout: {
				mod: [480, 250, 0.7],
				va: [455, 218],
				vc: [512, 285],
				L1: [800, 115, 0.85],
				L2: [800, 370, 0.85],
				gc: [480, 495, 0.9]
			},
			hl: ['gc'],
			links: [
				{ from: 'vc', to: 'L2', kind: 'ref' },
				{ from: 'gc', to: 'L1' }
			],
			lists: {
				L1: { vals: ['1', '2', '3'], freed: true },
				L2: { vals: ['1', '2', '3', '4'] }
			},
			tokens: [
				{ name: '根から辿る', tone: 'green', path: ['vc', 'L2'], at: 2400, d: 1300 },
				{ name: '片付け', tone: 'red', path: ['gc', 'L1'], at: 4400, d: 1300 }
			],
			metrics: { objs: '2 → 1', same: '—', out: '—', cap: '20' },
			callout: [
				'ポイント',
				'JavaScript では物を自分で消さない。辿れなくなった物が、いつか自動で片付く。'
			],
			changes: [
				['~', 'a・b：配列 #1 → null'],
				['-', '配列 #1 を片付けた']
			],
			deep: 'V8 の GC（Orinoco）は、根（スタックのフレーム・グローバルな物・内部の印）から辿れる物を生きた物とする。片付ける時刻は決まっていない（いつ動くかは処理系が決める）。',
			first: ['null', 'reach', 'gc', 'root']
		},
		{
			kind: 'tradeoff',
			short: '輪',
			notes: [
				{ obj: 'L2', text: '根から辿れる → 残る', tone: 'green', dy: -115 },
				{ obj: 'L3', text: '外から指す名前 0（自分だけ）', tone: 'red', dy: -115 }
			],
			title: '輪になった参照も、根から辿れなければ片付く',
			paras: [
				'd.push(d) で、配列 #3 は自分自身を要素に持つ。輪になった参照だ。',
				'd = null の後も、配列 #3 は自分を指している。数えるだけの片付け方では消せない。',
				'JavaScript の GC はマーク・スイープで、根から辿れた物に印を付ける。印の無い配列 #3 は輪ごと片付く。'
			],
			at: [0, 2200, 4400],
			dur: 7000,
			code: { cur: [14, 15, 16], done: [1, 2, 3, 4, 6, 7, 8, 10, 11, 12] },
			layout: {
				mod: [480, 250, 0.7],
				vc: [455, 218],
				vd: [512, 285],
				L2: [800, 115, 0.85],
				L3: [800, 370, 0.85],
				gc: [480, 495, 0.9]
			},
			hl: ['L3'],
			links: [
				{ from: 'vc', to: 'L2', kind: 'ref' },
				{ from: 'gc', to: 'L3' }
			],
			lists: {
				L2: { vals: ['1', '2', '3', '4'] },
				L3: { vals: ['#3'], cap: 3, more: 14, freed: true }
			},
			tokens: [
				{ name: '自分', tone: 'yellow', path: ['vd', 'L3'], at: 400, d: 1300 },
				{ name: '印', tone: 'green', path: ['vc', 'L2'], at: 2600, d: 1200 },
				{ name: '片付け', tone: 'red', path: ['gc', 'L3'], at: 4400, d: 1300 }
			],
			metrics: { objs: '2 → 1', same: '—', out: '—', cap: '20' },
			callout: [
				'代償',
				'いつ片付くかは選べない。大きな物を長く指したままの変数があると、メモリは空かない。'
			],
			changes: [
				['+', '配列 #3（自分を指す）'],
				['-', '配列 #3 を輪ごと片付けた']
			],
			deep: 'Node.js v24.19.0 を --expose-gc で動かし、let d = []; d.push(d); const r = new WeakRef(d); d = null の後に gc() を呼ぶと、r.deref() は undefined になった（輪ごと片付いた）。参照を数えるだけのやり方（参照カウント）は、輪の中の数が 0 にならないので消せない。',
			first: ['cycle', 'marksweep']
		},
		{
			kind: 'realworld',
			short: '実際には',
			notes: [{ obj: 'L1g', text: '3 + (3 >> 1) + 16 = 20 席', tone: 'blue', dy: -115 }],
			title: '実際には：席の数と、GC の記録',
			paras: [
				'Node.js の中の V8 は、配列のために席を先に取る。[1, 2] は席 2。push(3) で足りなくなる。',
				'その時の新しい席の数は 3 + 1 + 16 = 20。足すたびに取り直さないためだ。',
				'node --trace-gc で動かすと、若い世代を片付ける Scavenge の記録が出る。多くの物はここで消える。'
			],
			at: [0, 2200, 4400],
			dur: 7000,
			code: { cur: [1, 3], done: [2] },
			layout: {
				mod: [440, 250, 0.6],
				va: [440, 242],
				L1: [720, 130, 1.05],
				L1g: [700, 400, 0.85],
				gc: [440, 480, 0.9]
			},
			hl: ['L1g'],
			links: [
				{ from: 'va', to: 'L1g', kind: 'ref' },
				{ from: 'L1', to: 'L1g' }
			],
			lists: {
				L1: { vals: ['1', '2'], cap: 2 },
				L1g: { vals: ['1', '2', '3'], cap: 6, more: 14, newIdx: 2 }
			},
			tokens: [
				{ name: '1, 2 を写す', tone: 'blue', path: ['L1', 'L1g'], at: 600, d: 1500 },
				{ name: 'push(3)', tone: 'blue', path: ['va', 'L1g'], at: 2400, d: 1300 }
			],
			metrics: { objs: '1', same: '—', out: '—', cap: '2 → 20' },
			callout: [
				'本物の記録',
				'Scavenge 4.7 (5.7) -> 4.3 (6.7) MB, 0.49 / 0.00 ms（Node.js v24.19.0 の --trace-gc の 1 行目）'
			],
			changes: [['~', '配列 #1 の席：2 → 20']],
			deep: 'V8 13.6 の src/objects/js-objects.h：NewElementsCapacity(old) = old + (old >> 1) + kMinAddedElementsCapacity（= 16）。push で長さ 3 が要る時は old = 3 で 3 + 1 + 16 = 20。若い世代の Scavenge は生きた物を別の半分（semi-space）へ写し、2 回生き延びた物を古い世代へ移す。古い世代は並行に印を付けるマーク・スイープと、詰め直し（コンパクト）。出典：v8.dev/blog/trash-talk（2019-01-03）。',
			first: ['nodejs', 'v8', 'capacity', 'young', 'scavenge']
		},
		{
			kind: 'summary',
			short: 'まとめ',
			title: 'まとめ：名札と物を分けて見る',
			paras: [
				'変数は在りかを持つ名札。= は名札を結ぶだけで、物を写さない。',
				'push は物そのものを書き換える。同じ物を指す全ての名前から見える。',
				'関数に渡るのも在りか。変えたい時は写しを作る。辿れなくなった物は GC が片付ける。'
			],
			at: [0, 2000, 4000],
			dur: 6400,
			layout: {
				mod: [250, 180, 0.55],
				va: [215, 162, 0.85],
				vb: [285, 200, 0.85],
				fadd: [250, 440, 0.55],
				vxs: [250, 432, 0.85],
				L1: [640, 170, 0.85],
				L2: [640, 440, 0.85],
				gc: [890, 310, 0.9]
			},
			hl: ['L1', 'L2'],
			links: [
				{ from: 'va', to: 'L1', kind: 'ref' },
				{ from: 'vb', to: 'L1', kind: 'ref' },
				{ from: 'vxs', to: 'L2', kind: 'ref' }
			],
			lists: { L1: { vals: ['1', '2', '3'] }, L2: { vals: ['1', '2', '3', '4'] } },
			tokens: [
				{ name: 'push(3)', tone: 'blue', path: ['vb', 'L1'], at: 400, d: 1300 },
				{ name: '写し', tone: 'blue', path: ['L1', 'L2'], at: 2200, d: 1400 }
			],
			metrics: { objs: '2', same: 'true', out: '[ 1, 2, 3 ]', cap: '20' },
			callout: [
				'教えるときは',
				'「名札を 2 枚付けた荷物」を絵に描かせてから、b.push(3) の後の a を予想させる。'
			],
			changes: [['+', '名前・参照・物・写し・片付けを 1 枚に']],
			first: []
		}
	]
};
