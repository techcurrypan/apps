// ai-003 探索で解く（order）。
// 場面：港町の倉庫の通路（迷路）で、入口 S から荷の置き場 G を探す。分かれ道は左から順に調べる。
// 経過時刻 t は調べた順の番号。G 検定のシラバス「探索・推論（幅優先探索・深さ優先探索）」に対応する。
import type { Lesson } from '../../lesson/types.ts';

export const ai003: Lesson = {
	id: 'ai-003',
	field: 'ai',
	level: 1,
	title: '探索で解く',
	goal: '幅優先と深さ優先で、迷路を調べる順を追うことができる',
	prereq: ['ai-001'],
	related: ['prg-011'],
	next: ['ai-004', 'ai-012'],
	explain: [
		{
			n: 1,
			title: '迷路を木にする',
			lead: '分かれ道を節、通路を枝にすると、迷路は木の形になる',
			body: [
				'入口 S から A と B に分かれ、A は C と D、B は E に、C は G に続く。',
				'G が荷の置き場だ。D と E は行き止まりだ。'
			],
			facts: [
				{ k: 'S の先', v: 'A・B' },
				{ k: 'A の先', v: 'C・D' },
				{ k: 'C の先', v: 'G（目的）' }
			],
			scene: [
				{ op: 'appear', id: 's', label: 'S', sub: '入口', at: [3, 0] },
				{ op: 'appear', id: 'a', label: 'A', sub: '深さ 1', at: [1, 1] },
				{ op: 'appear', id: 'b', label: 'B', sub: '深さ 1', at: [5, 1] },
				{ op: 'appear', id: 'c', label: 'C', sub: '深さ 2', at: [0, 2] },
				{ op: 'appear', id: 'd', label: 'D', sub: '行き止まり', at: [2, 2] },
				{ op: 'appear', id: 'e', label: 'E', sub: '行き止まり', at: [5, 2] },
				{ op: 'appear', id: 'g', label: 'G', sub: '荷の置き場', at: [0, 3] }
			],
			log: { t: '0', from: 'S', to: 'G', kind: 'tree', info: '迷路を木にした' }
		},
		{
			n: 2,
			title: '幅優先の 1 段目',
			lead: '幅優先は、近い所（浅い段）を全て調べてから、次の段へ進む',
			body: [
				'S の次に、深さ 1 の A と B を、左から順に調べる。',
				'どちらも G ではないので、深さ 2 へ進む。'
			],
			facts: [
				{ k: '調べた順', v: 'S → A → B' },
				{ k: '使う物', v: '待ち行列（先に入れた物から出す）' }
			],
			scene: [
				{ op: 'move', from: 's', to: 'a', payload: '1', kind: 'bfs' },
				{ op: 'move', from: 's', to: 'b', payload: '2', kind: 'bfs' }
			],
			log: { t: '3', from: 'S', to: 'B', kind: 'bfs', info: '深さ 1 を全て調べた' }
		},
		{
			n: 3,
			title: '2 段目',
			lead: '深さ 2 の C・D・E を調べ、その次に深さ 3 の G に着く',
			body: [
				'深さ 2 を左から C・D・E と調べる。G は深さ 3 なので、まだ調べない。',
				'S・A・B・C・D・E・G の順で、7 番目に G に着いた。'
			],
			facts: [
				{ k: '調べた順', v: 'S・A・B・C・D・E・G' },
				{ k: 'G に着いた順番', v: '7 番目' }
			],
			scene: [
				{ op: 'move', from: 'a', to: 'c', payload: '3', kind: 'bfs' },
				{ op: 'move', from: 'b', to: 'e', payload: '5', kind: 'bfs' },
				{ op: 'move', from: 'c', to: 'g', payload: '6', kind: 'bfs' }
			],
			log: { t: '7', from: 'C', to: 'G', kind: 'bfs', info: '幅優先は 7 番目に着いた' },
			why: '浅い段から調べるので、最初に見つけた道は、通る分かれ道の数が一番少ない'
		},
		{
			n: 4,
			title: '深さ優先で潜る',
			lead: '深さ優先は、行き止まりまで 1 本の道を進み続ける',
			body: [
				'S から左の A へ、A から左の C へと潜る。',
				'C の先の G に着き、S・A・C・G の 4 番目で見つかった。'
			],
			facts: [
				{ k: '調べた順', v: 'S・A・C・G' },
				{ k: '使う物', v: '積み重ね（後に入れた物から出す）' }
			],
			scene: [
				{ op: 'move', from: 'a', to: 'c', payload: '潜る', kind: 'dfs' },
				{ op: 'move', from: 'c', to: 'g', payload: '4 番目', kind: 'dfs' }
			],
			log: { t: '4', from: 'C', to: 'G', kind: 'dfs', info: '深さ優先は 4 番目に着いた' }
		},
		{
			n: 5,
			title: '行き止まりで戻る',
			lead: '行き止まりに着いたら、1 つ前の分かれ道へ戻って別の道を試す',
			body: [
				'もし G が E の先にあったら、深さ優先は C・D の行き止まりから戻り、B へ向かう。',
				'戻るときは、まだ試していない一番近い分かれ道へ戻る。'
			],
			facts: [
				{ k: '行き止まりで', v: '1 つ前の分かれ道へ戻る' },
				{ k: '別名', v: 'バックトラック' }
			],
			scene: [
				{ op: 'move', from: 'd', to: 'a', payload: '戻る', kind: 'back' },
				{ op: 'change', id: 'd', k: '結果', v: '行き止まり' }
			],
			log: { t: '5', from: 'D', to: 'A', kind: 'back', info: '行き止まりで戻る' }
		},
		{
			n: 6,
			title: '着いた順を比べる',
			lead: 'どちらが早いかは、目的の置き場所しだいだ',
			body: [
				'この迷路では深さ優先が 4 番目、幅優先が 7 番目で、深さ優先が早かった。',
				'浅い所に目的があれば幅優先、深い所なら深さ優先が早いことが多い。'
			],
			facts: [
				{ k: '幅優先', v: '7 番目（最短の道を見つける）' },
				{ k: '深さ優先', v: '4 番目（覚える物が少ない）' }
			],
			scene: [{ op: 'change', id: 'g', k: '着いた順', v: '深さ 4・幅 7' }],
			log: {
				t: '7',
				from: '幅優先',
				to: '深さ優先',
				kind: 'compare',
				info: 'この迷路は深さ優先が早い'
			}
		}
	],
	example: {
		intro: '調べた順（分かれ道は左から）',
		lines: [
			'        S',
			'      /   \\',
			'     A     B',
			'    / \\     \\',
			'   C   D     E',
			'   |',
			'   G',
			'',
			'幅優先   S → A → B → C → D → E → G   （7 番目）',
			'深さ優先 S → A → C → G               （4 番目）'
		]
	},
	practice: {
		goal: '別の通路で、幅優先で調べる順に札を並べる（分かれ道は左から）',
		form: 'order',
		setup: {
			cards: [
				{ id: 'D', text: 'D（B の左の先）' },
				{ id: 'S', text: 'S（入口）' },
				{ id: 'F', text: 'F（C の先。荷の置き場）' },
				{ id: 'B', text: 'B（S の右の先）' },
				{ id: 'E', text: 'E（B の右の先）' },
				{ id: 'A', text: 'A（S の左の先）' },
				{ id: 'C', text: 'C（A の先）' }
			]
		},
		success: { orders: [['S', 'A', 'B', 'C', 'D', 'E', 'F']] },
		mistakes: [
			{
				when: 'A の先の C を、B より前に置いた',
				why: 'それは深さ優先の順だ。幅優先は、深さ 1 の A と B を調べ終えてから深さ 2 へ進む',
				next: 'S・A・B の後に、深さ 2 の C・D・E を置く',
				match: 'C<B'
			},
			{
				when: '深さ 3 の F を、深さ 2 の D・E より前に置いた',
				why: '幅優先は、深さ 2 を全て調べ終えるまで、深さ 3 へ進まない',
				next: 'F を一番最後に置く',
				match: 'F<D'
			},
			{
				when: '深さ 2 を右から並べた',
				why: '分かれ道は左から調べる。A の先の C が、B の先の D・E より先だ',
				next: '深さ 2 は C・D・E の順にする',
				match: 'D<C'
			}
		]
	},
	check: [
		{ ask: '幅優先の進み方', how: '浅い段を全て調べてから次の段へ' },
		{ ask: '深さ優先の進み方', how: '行き止まりまで潜り、戻って別の道へ' },
		{ ask: '最短の道を必ず見つけるのは', how: '幅優先' }
	]
};
