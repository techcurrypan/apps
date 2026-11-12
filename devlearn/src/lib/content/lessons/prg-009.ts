// prg-009 テストを書く（本物の JavaScript）。
// 出力は全て、実戦の道具（src/lib/tools/js/run.ts）で走らせて得た物（solutions.test.ts が例を流して確かめる）。
// テストの道具は使わず、比べて ok / NG を出す小さな関数 test を自分で書く（どの道具にもある考え方だけを取る）。
// 場面：パン屋のポイント。100 円ごとに 1 点。経過時刻 t は作業を始めた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const TEST = 'test';
const FN = 'points';
const OUT = '出力';

export const prg009: Lesson = {
	id: 'prg-009',
	field: 'prg',
	level: 2,
	title: 'テストを書く',
	goal: '関数の期待する結果をテストに書き、失敗から成功へ直すことができる',
	prereq: ['prg-004'],
	related: [],
	next: [],
	explain: [
		{
			n: 1,
			title: '期待する結果を書く',
			lead: '関数を作る前に、入力と期待する答えの組を書く',
			body: [
				'100 円ごとに 1 点なら、250 円は 2 点、99 円は 0 点だ。',
				'test(名前, 得た値, 期待) は、2 つの値を === で比べて ok か NG を出す。',
				'テストは、期待を先に言葉でなく値で書いた物だ。'
			],
			facts: [
				{ k: '250 円', v: '期待 2' },
				{ k: '99 円', v: '期待 0' },
				{ k: '比べ方', v: 'got === want' }
			],
			scene: [
				{ op: 'appear', id: 'test', label: TEST, sub: '期待と比べる', at: [0, 0] },
				{ op: 'change', id: 'test', k: '組', v: '250→2 / 99→0' }
			],
			log: { t: '0s', from: TEST, to: TEST, kind: 'write', info: '期待の組を 2 つ書いた' }
		},
		{
			n: 2,
			title: 'テストが落ちる',
			lead: 'Math.round で書いた points は、250 円で 3 点を返す',
			body: [
				'points(price) を Math.round(price / 100) と書いて走らせる。',
				'250 / 100 は 2.5 で、Math.round は 3 に丸める。',
				'1 つ目の行が NG 250 円で 2 点 期待 2 結果 3 になる。'
			],
			facts: [
				{ k: 'points(250)', v: '3' },
				{ k: '1 行目', v: 'NG 250 円で 2 点 期待 2 結果 3' },
				{ k: '2 行目', v: 'NG 99 円で 0 点 期待 0 結果 1' }
			],
			scene: [
				{ op: 'appear', id: 'fn', label: FN, sub: 'Math.round', at: [2, 0] },
				{ op: 'move', from: 'test', to: 'fn', payload: '250', kind: 'call' },
				{ op: 'move', from: 'fn', to: 'test', payload: '3', kind: 'return' },
				{ op: 'change', id: 'test', k: '結果', v: 'NG' }
			],
			log: { t: '10s', from: FN, to: TEST, kind: 'NG', info: 'points(250) が 3。期待は 2' }
		},
		{
			n: 3,
			title: '落ちた理由を読む',
			lead: '期待と結果の差から、どこが違うかを絞る',
			body: [
				'99 円も NG で、結果は 1 だった。どちらも 1 つ多い。',
				'2.5 と 0.99 は、どちらも四捨五入で上に丸められている。',
				'欲しいのは切り下げで、丸め方が違うと分かる。'
			],
			facts: [
				{ k: '250 円', v: '期待 2 / 結果 3' },
				{ k: '99 円', v: '期待 0 / 結果 1' },
				{ k: '分かったこと', v: '丸め方が四捨五入になっている' }
			],
			scene: [
				{ op: 'change', id: 'fn', k: '疑い', v: '丸め方' },
				{ op: 'highlight', id: 'fn' }
			],
			log: { t: '30s', from: TEST, to: FN, kind: 'read', info: '2 件とも 1 多い。丸め方を疑う' }
		},
		{
			n: 4,
			title: '関数を直す',
			lead: 'Math.round を Math.floor（切り下げ）に替える',
			body: [
				'points を Math.floor(price / 100) に直す。',
				'Math.floor(2.5) は 2、Math.floor(0.99) は 0 だ。',
				'直したのは 1 語だけで、テストは書き換えない。'
			],
			facts: [
				{ k: '直す前', v: 'Math.round(price / 100)' },
				{ k: '直した後', v: 'Math.floor(price / 100)' }
			],
			scene: [
				{ op: 'change', id: 'fn', k: '中身', v: 'Math.floor' },
				{ op: 'change', id: 'fn', k: '疑い', v: '（直した）' }
			],
			log: { t: '50s', from: '人', to: FN, kind: 'fix', info: 'round を floor に替えた' }
		},
		{
			n: 5,
			title: 'テストが通る',
			lead: 'もう一度走らせ、全ての行が ok になる',
			body: [
				'同じテストを走らせると、2 行とも ok になる。',
				'直す前に落ちていたので、直したことで通ったと言える。',
				'テストが先にあると、直したかどうかを人の目でなく値で決められる。'
			],
			facts: [
				{ k: '1 行目', v: 'ok 250 円で 2 点 期待 2 結果 2' },
				{ k: '2 行目', v: 'ok 99 円で 0 点 期待 0 結果 0' }
			],
			scene: [
				{ op: 'appear', id: 'out', label: OUT, sub: 'console.log', at: [1, 1] },
				{ op: 'move', from: 'test', to: 'out', payload: 'ok ok', kind: 'log' },
				{ op: 'change', id: 'test', k: '結果', v: 'ok' }
			],
			log: { t: '60s', from: TEST, to: OUT, kind: 'ok', info: '2 件とも ok になった' },
			why: '先に落ちるのを見ておくと、テストが正しく違いを見分けていると確かめられる'
		},
		{
			n: 6,
			title: '境目の場合を足す',
			lead: '100 円ちょうどのように、答えが替わる所を足す',
			body: [
				'100 円は 1 点、99 円は 0 点で、ここで答えが替わる。',
				"test('100 円で 1 点', points(100), 1) を足して走らせる。",
				'ok になり、3 件のテストが全て通った。'
			],
			facts: [
				{ k: '足した組', v: '100 円 → 1' },
				{ k: '3 行目', v: 'ok 100 円で 1 点 期待 1 結果 1' },
				{ k: '通った数', v: '3 / 3' }
			],
			scene: [
				{ op: 'change', id: 'test', k: '組', v: '250→2 / 99→0 / 100→1' },
				{ op: 'change', id: 'out', k: '3 行目', v: 'ok 100 円で 1 点' }
			],
			log: { t: '80s', from: TEST, to: OUT, kind: 'ok', info: '境目の 100 円も ok。3 / 3' }
		}
	],
	example: {
		intro: '直した後の points を、境目を含む 3 件のテストで確かめる。下の 9 行を走らせた',
		lines: [
			'function test(name, got, want) {',
			"  console.log(got === want ? 'ok' : 'NG', name, '期待', want, '結果', got);",
			'}',
			'function points(price) {',
			'  return Math.floor(price / 100);',
			'}',
			"test('250 円で 2 点', points(250), 2);",
			"test('99 円で 0 点', points(99), 0);",
			"test('100 円で 1 点', points(100), 1);",
			'▶ 出力',
			'ok 250 円で 2 点 期待 2 結果 2',
			'ok 99 円で 0 点 期待 0 結果 0',
			'ok 100 円で 1 点 期待 1 結果 1'
		]
	},
	practice: {
		goal: '送料の関数を直し、境目を含む 3 件のテストを全て ok にする',
		tool: { name: 'js', mode: 'real' },
		setup: {
			code: "function test(name, got, want) {\n  console.log(got === want ? 'ok' : 'NG', name, '期待', want, '結果', got);\n}\n// 送料：合計が 3000 円以上なら 0 円、それ未満は 500 円。テストは変えずに、関数を直す\nfunction shipping(total) {\n  if (total > 3000) return 0;\n  return 500;\n}\ntest('5000 円', shipping(5000), 0);\ntest('2999 円', shipping(2999), 500);\ntest('3000 円', shipping(3000), 0);\n"
		},
		success: {
			output: 'ok 5000 円 期待 0 結果 0\nok 2999 円 期待 500 結果 500\nok 3000 円 期待 0 結果 0\n'
		},
		mistakes: [
			{
				when: '関数を直さずに走らせた',
				why: '> 3000 は 3000 ちょうどを含まない。3000 円の送料が 500 になり、境目のテストが落ちる',
				next: '以上は >= で書く。total >= 3000 にする',
				match: 'NG 3000 円'
			},
			{
				when: '境目を 2999 にずらして通そうとした',
				why: '2999 円は 3000 円未満なので送料 500 円のはずだ。今度は 2999 円のテストが落ちる',
				next: '比べる数は 3000 のまま、> を >= に替える',
				match: 'NG 2999 円'
			}
		]
	},
	check: [
		{ ask: 'テストの中身', how: '入力と、期待する答えの組（250 円 → 2 点）' },
		{ ask: '直す前に見る物', how: 'テストが落ちること（NG と期待・結果）' },
		{ ask: '足す場合', how: '答えが替わる境目（99 円と 100 円）' }
	]
};
