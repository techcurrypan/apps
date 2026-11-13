// ci-005 キャッシュで速くする（calc）。
// 場面：パン屋の頁の検査が、毎回部品を入れ直すので遅い。部品の置き場を次の回へ残し（キャッシュ）、時間を比べる。時間は作り物。
// 経過時刻 t は検査の始まりを 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const RUNNER = '使い捨ての機械';
const CACHE = 'キャッシュの置き場';

export const ci005: Lesson = {
	id: 'ci-005',
	field: 'ci',
	level: 2,
	title: 'キャッシュで速くする',
	goal: 'キャッシュの有無で、パイプラインの時間がどう変わるかを求めることができる',
	prereq: ['ci-003'],
	related: ['ctr-008'],
	next: ['ci-008'],
	explain: [
		{
			n: 1,
			title: '毎回入れ直す',
			lead: '使い捨ての機械は、毎回部品を一から取ってくる',
			body: [
				'機械はまっさらなので、npm ci で 214 個の部品を毎回網から取って入れる。',
				'部品の中身は、前の回とほとんど同じだ。'
			],
			facts: [
				{ k: '入れる部品', v: '214 個' },
				{ k: '前の回との違い', v: 'ほとんど無い' }
			],
			scene: [
				{ op: 'appear', id: 'runner', label: RUNNER, sub: 'まっさら', at: [0, 1] },
				{ op: 'appear', id: 'net', label: '部品の置き場（網の向こう）', sub: '214 個', at: [3, 0] },
				{ op: 'move', from: 'net', to: 'runner', payload: '214 個', kind: 'install' }
			],
			log: {
				t: '0s',
				from: '部品の置き場（網の向こう）',
				to: RUNNER,
				kind: 'install',
				info: '毎回 214 個を取る'
			}
		},
		{
			n: 2,
			title: '時間を測る',
			lead: 'まず、段ごとの時間を測る',
			body: [
				'部品を入れるのに 120 秒、テストに 60 秒かかった。1 回 180 秒だ。',
				'3 分の 2 は、毎回同じ部品を取る時間だった。'
			],
			facts: [
				{ k: '部品を入れる', v: '120 秒' },
				{ k: 'テスト', v: '60 秒' },
				{ k: '1 回', v: '180 秒' }
			],
			scene: [{ op: 'change', id: 'runner', k: '1 回', v: '180 秒' }],
			log: {
				t: '180s',
				from: RUNNER,
				to: RUNNER,
				kind: 'measure',
				info: '1 回 180 秒、うち 120 秒は部品'
			}
		},
		{
			n: 3,
			title: 'キャッシュの鍵',
			lead: '部品の一覧のファイルから鍵を作り、置いた部品にその鍵を付ける',
			body: [
				'部品の版を全て書いた package-lock.json の中身から、鍵を計算する。',
				'一覧が同じなら鍵も同じなので、同じ部品だと分かる。'
			],
			facts: [
				{ k: '鍵の元', v: 'package-lock.json の中身' },
				{ k: '鍵が同じ', v: '部品も同じ' }
			],
			scene: [
				{ op: 'appear', id: 'cache', label: CACHE, sub: '鍵 a1f3', at: [3, 2] },
				{ op: 'move', from: 'runner', to: 'cache', payload: '部品を残す', kind: 'save' }
			],
			log: { t: '185s', from: RUNNER, to: CACHE, kind: 'save', info: '鍵 a1f3 で部品を残した' },
			why: '中身から作った鍵なら、一覧が 1 字でも変われば鍵も変わり、古い部品を使い回さずに済む'
		},
		{
			n: 4,
			title: '2 回目',
			lead: '同じ鍵の部品があれば、取ってくる代わりに戻すだけで済む',
			body: [
				'2 回目は鍵 a1f3 が見つかり、部品を 15 秒で戻せた。',
				'テストの 60 秒と合わせて、1 回 75 秒になった。'
			],
			facts: [
				{ k: '部品を戻す', v: '15 秒' },
				{ k: '1 回', v: '75 秒' }
			],
			scene: [
				{ op: 'move', from: 'cache', to: 'runner', payload: '戻す 15 秒', kind: 'restore' },
				{ op: 'change', id: 'runner', k: '1 回', v: '75 秒' }
			],
			log: { t: '75s', from: CACHE, to: RUNNER, kind: 'restore', info: '鍵が当たり 75 秒で済んだ' }
		},
		{
			n: 5,
			title: '鍵が変わると',
			lead: '部品の一覧を変えた回は、鍵が当たらず、取り直す',
			body: [
				'部品を 1 つ足すと package-lock.json が変わり、鍵も b7c2 に変わる。',
				'その回は 180 秒かかり、新しい鍵で部品を残す。次の回からまた 75 秒だ。'
			],
			facts: [
				{ k: '新しい鍵', v: 'b7c2' },
				{ k: 'その回', v: '180 秒（取り直す）' }
			],
			scene: [
				{ op: 'change', id: 'cache', k: '鍵', v: 'a1f3 → b7c2' },
				{ op: 'move', from: 'net', to: 'runner', payload: '取り直す', kind: 'install' }
			],
			log: {
				t: '180s',
				from: '部品の置き場（網の向こう）',
				to: RUNNER,
				kind: 'miss',
				info: '鍵が変わり取り直した'
			}
		},
		{
			n: 6,
			title: '時間を比べる',
			lead: '1 日の回数を掛けて、縮んだ時間を比べる',
			body: [
				'1 回で 180 − 75 = 105 秒縮む。1 日 20 回なら 2,100 秒、35 分だ。',
				'待つ人の時間も、借りた機械の時間も、同じだけ減る。'
			],
			facts: [
				{ k: '1 回で縮む', v: '105 秒' },
				{ k: '1 日 20 回', v: '2,100 秒 = 35 分' }
			],
			scene: [
				{ op: 'appear', id: 'day', label: '1 日 20 回', sub: '35 分縮む', at: [6, 1] },
				{ op: 'move', from: 'runner', to: 'day', payload: '× 20', kind: 'sum' }
			],
			log: { t: '1d', from: RUNNER, to: '1 日 20 回', kind: 'sum', info: '1 日に 35 分縮んだ' }
		}
	],
	example: {
		intro: 'キャッシュの有無と、1 回の時間',
		lines: [
			'回          鍵       部品      テスト   1 回',
			'1 回目      a1f3 無し 120 秒   60 秒    180 秒（部品を残す）',
			'2 回目      a1f3 有り  15 秒   60 秒     75 秒',
			'部品を足す  b7c2 無し 120 秒   60 秒    180 秒（新しい鍵で残す）',
			'その次      b7c2 有り  15 秒   60 秒     75 秒'
		]
	},
	practice: {
		goal: 'キャッシュの有無での 1 回の時間と、1 日に縮む時間を求める',
		form: 'calc',
		setup: {
			data: [
				{ k: '部品を入れる（キャッシュ無し）', v: '150 秒' },
				{ k: '部品を戻す（キャッシュ有り）', v: '20 秒' },
				{ k: 'テストと組み立て', v: '90 秒' },
				{ k: '1 日の回数', v: '24 回（全て鍵が当たるとする）' }
			],
			steps: [
				{ label: 'キャッシュ無しの 1 回', unit: ' 秒' },
				{ label: 'キャッシュ有りの 1 回', unit: ' 秒' },
				{ label: '1 回で縮む時間', unit: ' 秒' },
				{ label: '1 日に縮む時間', unit: ' 分' }
			]
		},
		success: { values: ['240', '110', '130', '52'] },
		mistakes: [
			{
				when: 'キャッシュ有りの回に、テストの時間を足し忘れた',
				why: 'キャッシュで縮むのは部品の段だけだ。テストと組み立ての 90 秒は残る',
				next: '20 + 90 = 110 秒にする',
				match: '2=20'
			},
			{
				when: '縮む時間を、部品の段の時間そのものにした',
				why: 'キャッシュ有りでも、戻す 20 秒はかかる',
				next: '150 − 20 = 130 秒にする',
				match: '3=150'
			},
			{
				when: '1 日の分を、秒のまま答えた',
				why: '130 × 24 = 3,120 秒は、分にすると 52 分だ',
				next: '3,120 ÷ 60 = 52 分にする',
				match: '4=3120'
			}
		]
	},
	check: [
		{ ask: 'キャッシュの鍵の元', how: '部品の一覧（package-lock.json）の中身' },
		{ ask: '鍵が変わった回', how: '取り直し、新しい鍵で残す' },
		{ ask: '縮む時間', how: '部品の段の差だけ。テストの時間は残る' }
	]
};
