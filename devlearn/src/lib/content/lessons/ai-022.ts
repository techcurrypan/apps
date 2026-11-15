// ai-022 画像を認識する（sort）。
// 場面：港の監視の写真 1 枚に、3 つの課題（分類・物体検出・領域分割）を当て、出力の形を比べる。
// 経過時刻 t は手順の番号。G 検定のシラバス「画像認識（画像分類・物体検出・セグメンテーション）」に対応する。
import type { Lesson } from '../../lesson/types.ts';

const IMG = '写真 1 枚';

export const ai022: Lesson = {
	id: 'ai-022',
	field: 'ai',
	level: 2,
	title: '画像を認識する',
	goal: '分類・物体検出・領域分割を、出力の形で見分けることができる',
	prereq: ['ai-017'],
	related: [],
	next: ['ai-027'],
	explain: [
		{
			n: 1,
			title: '画像 1 枚',
			lead: '同じ写真でも、何を答えさせるかで課題が変わる',
			body: [
				'港の写真には、船 2 隻・人 3 人・海と岸壁が写っている。',
				'網の中身は似ていても、出力の形が課題ごとに違う。'
			],
			facts: [
				{ k: '写っている物', v: '船 2・人 3・海・岸壁' },
				{ k: '違う所', v: '出力の形' }
			],
			scene: [{ op: 'appear', id: 'img', label: IMG, sub: '港', at: [0, 1] }],
			log: { t: '1', from: '監視', to: IMG, kind: 'input', info: '港の写真' }
		},
		{
			n: 2,
			title: '分類の出力',
			lead: '分類は、写真全体に名前を 1 つ付ける',
			body: [
				'出力は「港」「海岸」「町」の確率の並びで、一番大きい「港 0.92」を答える。',
				'どこに何があるかは答えない。'
			],
			facts: [
				{ k: '出力', v: '名前ごとの確率' },
				{ k: '答え', v: '港（0.92）' }
			],
			scene: [
				{ op: 'appear', id: 'cls', label: '分類', sub: '港 0.92', at: [3, 0] },
				{ op: 'move', from: 'img', to: 'cls', payload: '名前 1 つ', kind: 'classify' }
			],
			log: { t: '2', from: IMG, to: '分類', kind: 'classify', info: '港 0.92' }
		},
		{
			n: 3,
			title: '物体検出の箱',
			lead: '物体検出は、物ごとに囲む箱と名前を出す',
			body: [
				'出力は「船・左上 (40, 60)・幅 120・高さ 50」のような箱が 5 つ。',
				'箱の数は写真ごとに違う。'
			],
			facts: [
				{ k: '出力', v: '箱（位置・大きさ）と名前の組' },
				{ k: '箱の数', v: '5（船 2・人 3）' }
			],
			scene: [
				{ op: 'appear', id: 'det', label: '物体検出', sub: '箱 5 つ', at: [3, 1] },
				{ op: 'move', from: 'img', to: 'det', payload: '箱と名前', kind: 'detect' }
			],
			log: { t: '3', from: IMG, to: '物体検出', kind: 'detect', info: '箱が 5 つ' }
		},
		{
			n: 4,
			title: '領域分割の地図',
			lead: '領域分割は、画素 1 つずつに名前を付ける',
			body: [
				'出力は写真と同じ大きさの地図で、画素ごとに「海」「岸壁」「船」「人」の印が入る。',
				'形の境まで分かるが、計算は一番重い。'
			],
			facts: [
				{ k: '出力', v: '画素ごとの名前の地図' },
				{ k: '大きさ', v: '写真と同じ' }
			],
			scene: [
				{ op: 'appear', id: 'seg', label: '領域分割', sub: '画素ごと', at: [3, 2] },
				{ op: 'move', from: 'img', to: 'seg', payload: '地図', kind: 'segment' }
			],
			log: { t: '4', from: IMG, to: '領域分割', kind: 'segment', info: '画素ごとの地図' },
			why: '画素ごとに答えるので、物の形や面積まで分かる'
		},
		{
			n: 5,
			title: '用途を選ぶ',
			lead: '知りたい事に合う、一番軽い課題を選ぶ',
			body: [
				'「港の写真か」なら分類、「船が何隻いるか」なら物体検出で足りる。',
				'「海に流れた油の広さ」を測るなら、領域分割が要る。'
			],
			facts: [
				{ k: '港の写真か', v: '分類' },
				{ k: '船の数', v: '物体検出' },
				{ k: '油の広さ', v: '領域分割' }
			],
			scene: [
				{ op: 'appear', id: 'use', label: '用途', sub: '一番軽い物', at: [6, 1] },
				{ op: 'move', from: 'det', to: 'use', payload: '船の数', kind: 'choose' }
			],
			log: { t: '5', from: '課題', to: '用途', kind: 'choose', info: '知りたい事で選ぶ' }
		}
	],
	example: {
		intro: '出力の形の違い',
		lines: [
			'課題        出力                          例',
			'分類        名前ごとの確率（1 つ選ぶ）    港 0.92',
			'物体検出    箱（位置・大きさ）と名前      船 (40,60,120,50)・人 …',
			'領域分割    画素ごとの名前の地図          海 海 船 船 岸壁 …'
		]
	},
	practice: {
		goal: '港町の 6 つの課題を、出力の形で、分類・物体検出・領域分割に振り分ける',
		form: 'sort',
		setup: {
			items: [
				{ id: 'fish', text: '市場の魚の写真 1 枚に、魚の種類の名前を 1 つ付ける' },
				{ id: 'cars', text: '駐車場の写真で、車ごとに囲む箱を描き、台数を数える' },
				{ id: 'oil', text: '海の写真で、油の広がった画素を塗り、広さを測る' },
				{ id: 'weather', text: '空の写真が「晴れ」「曇り」「雨」のどれかを答える' },
				{ id: 'people', text: '岸壁の写真で、人ごとの位置を箱で示す' },
				{ id: 'road', text: '道の写真で、車道と歩道の境を画素ごとに分ける' }
			],
			bins: [
				{ id: 'cls', label: '分類（名前 1 つ）' },
				{ id: 'det', label: '物体検出（箱と名前）' },
				{ id: 'seg', label: '領域分割（画素ごとの地図）' }
			]
		},
		success: {
			bins: { fish: 'cls', cars: 'det', oil: 'seg', weather: 'cls', people: 'det', road: 'seg' }
		},
		mistakes: [
			{
				when: '台数を数える課題を、分類に入れた',
				why: '分類は写真全体に名前を 1 つ付けるだけで、物ごとの位置も数も出さない',
				next: '車ごとの箱を出す物体検出に入れる',
				match: 'cars:cls'
			},
			{
				when: '油の広さの課題を、物体検出に入れた',
				why: '箱では形の境が分からず、広さを測れない',
				next: '画素ごとに塗る領域分割に入れる',
				match: 'oil:det'
			},
			{
				when: '天気を答える課題を、物体検出に入れた',
				why: '答えは写真全体の名前 1 つで、位置は要らない',
				next: '分類に入れる',
				match: 'weather:det'
			}
		]
	},
	check: [
		{ ask: '分類の出力', how: '写真全体の名前（確率の並び）' },
		{ ask: '物体検出の出力', how: '物ごとの箱と名前' },
		{ ask: '領域分割の出力', how: '画素ごとの名前の地図' }
	]
};
