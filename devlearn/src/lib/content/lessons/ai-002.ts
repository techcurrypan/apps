// ai-002 AI の難しい問題（sort）。
// 場面：港町の倉庫で荷を運ぶロボットと、案内の会話の機械に起きた出来事を、どの難しい問題の例かで分ける。
// 経過時刻 t は出来事の順（日）。G 検定のシラバス「人工知能分野の問題（フレーム問題・シンボルグラウンディング問題ほか）」に対応する。
import type { Lesson } from '../../lesson/types.ts';

const ROBOT = '荷運びのロボット';
const TALK = '案内の会話の機械';

export const ai002: Lesson = {
	id: 'ai-002',
	field: 'ai',
	level: 1,
	title: 'AI の難しい問題',
	goal: 'フレーム問題と記号接地問題を、例ごとに見分けることができる',
	prereq: ['ai-001'],
	related: ['ai-004'],
	next: [],
	explain: [
		{
			n: 1,
			title: '知能とは',
			lead: '人が何気なくしている判断の中に、機械には難しい物がある',
			body: [
				'人は、関係のある事だけを考え、言葉を見た物と結び付けて使う。',
				'機械にそれをさせようとして、2 つの難しい問題が見つかった。'
			],
			facts: [
				{ k: '難しい問題 1', v: 'フレーム問題' },
				{ k: '難しい問題 2', v: '記号接地問題' }
			],
			scene: [
				{ op: 'appear', id: 'robot', label: ROBOT, sub: '倉庫', at: [0, 0] },
				{ op: 'appear', id: 'talk', label: TALK, sub: '案内所', at: [0, 2] }
			],
			log: { t: '0d', from: '人', to: ROBOT, kind: 'intro', info: '2 つの難しい問題' }
		},
		{
			n: 2,
			title: 'フレーム問題の例',
			lead: '荷を運ぶよう頼むと、ロボットは考え続けて動かなくなった',
			body: [
				'荷の上に箱が載っていた。動かすと何が起きるかを、壁の色や天気まで調べ始めた。',
				'関係の無い事も含め、起こり得る事を全て確かめようとして、時間が尽きた。'
			],
			facts: [
				{ k: '頼んだ事', v: '荷を運ぶ' },
				{ k: '起きた事', v: '関係の無い事まで調べて止まる' }
			],
			scene: [
				{ op: 'appear', id: 'box', label: '荷と上の箱', sub: '運ぶ物', at: [3, 0] },
				{ op: 'move', from: 'robot', to: 'box', payload: '全てを調べる', kind: 'think' }
			],
			log: { t: '1d', from: ROBOT, to: '荷と上の箱', kind: 'think', info: '考え続けて止まった' }
		},
		{
			n: 3,
			title: '何を考えるかが決まらない',
			lead: 'フレーム問題は、今の仕事に関係する事だけを選び出せない問題だ',
			body: [
				'起こり得る事は限りなくあり、どれが関係するかを決める枠（フレーム）が要る。',
				'人は枠を自然に決めるが、機械にその決め方を書き尽くすのは難しい。'
			],
			facts: [
				{ k: 'フレーム問題', v: '関係する事だけを選べない' },
				{ k: '要る物', v: '考える範囲の枠' }
			],
			scene: [
				{ op: 'appear', id: 'frame', label: 'フレーム問題', sub: '枠が決まらない', at: [6, 0] },
				{ op: 'move', from: 'box', to: 'frame', payload: '例', kind: 'classify' }
			],
			log: {
				t: '1d',
				from: '荷と上の箱',
				to: 'フレーム問題',
				kind: 'classify',
				info: '枠が決まらない'
			},
			why: '起こり得る事を全て確かめると、どれほど速い機械でも時間が足りない'
		},
		{
			n: 4,
			title: '記号接地の例',
			lead: '会話の機械は「しまうま」を説明できても、見て分からなかった',
			body: [
				'「しまうまは縞のある馬」と答えられたが、写真のしまうまを指せなかった。',
				'「縞」も「馬」も、別の言葉で説明されているだけだった。'
			],
			facts: [
				{ k: 'できた事', v: '言葉で説明する' },
				{ k: 'できない事', v: '見た物と言葉を結ぶ' }
			],
			scene: [
				{ op: 'appear', id: 'zebra', label: '「しまうま」', sub: '記号', at: [3, 2] },
				{ op: 'move', from: 'talk', to: 'zebra', payload: '言葉で説明', kind: 'say' }
			],
			log: { t: '2d', from: TALK, to: '「しまうま」', kind: 'say', info: '見て指せなかった' }
		},
		{
			n: 5,
			title: '意味が結び付かない',
			lead: '記号接地問題は、記号を、それが指す物の意味に結び付けられない問題だ',
			body: [
				'記号（言葉）は、別の記号で定義されるだけでは、物とつながらない。',
				'見る・触るなどの体験と結び付いて、はじめて意味を持つという考えだ。'
			],
			facts: [
				{ k: '記号接地問題', v: '記号と物の意味を結べない' },
				{ k: '別名', v: 'シンボルグラウンディング問題' }
			],
			scene: [
				{ op: 'appear', id: 'ground', label: '記号接地問題', sub: '意味が結べない', at: [6, 2] },
				{ op: 'move', from: 'zebra', to: 'ground', payload: '例', kind: 'classify' }
			],
			log: {
				t: '2d',
				from: '「しまうま」',
				to: '記号接地問題',
				kind: 'classify',
				info: '意味が結べない'
			}
		},
		{
			n: 6,
			title: '強い AI と弱い AI',
			lead: '心を持つ AI と、知的に振る舞うだけの AI を分けて考える',
			body: [
				'強い AI は、人のような心や理解を本当に持つ AI を指す。',
				'弱い AI は、特定の仕事で知的に振る舞う道具を指す。今の AI は弱い AI だ。'
			],
			facts: [
				{ k: '強い AI', v: '心や理解を持つ' },
				{ k: '弱い AI', v: '知的に振る舞う道具' }
			],
			scene: [
				{ op: 'appear', id: 'weak', label: '弱い AI', sub: '今の AI', at: [3, 1] },
				{ op: 'move', from: 'robot', to: 'weak', payload: '道具', kind: 'classify' }
			],
			log: { t: '3d', from: ROBOT, to: '弱い AI', kind: 'classify', info: '今の AI は弱い AI' }
		}
	],
	example: {
		intro: '2 つの問題の見分け方',
		lines: [
			'問い                                  フレーム問題    記号接地問題',
			'何に困る                              考える範囲      言葉の意味',
			'例：荷を運ぶ前に全てを調べて止まる    ○',
			'例：言葉で説明できても物を指せない                    ○'
		]
	},
	practice: {
		goal: '6 つの出来事を、フレーム問題と記号接地問題の例に振り分ける',
		form: 'sort',
		setup: {
			items: [
				{ id: 'bomb', text: '電池を運ぶ前に、運ぶと月の位置が変わるかまで考え始めた' },
				{ id: 'apple', text: '「赤くて丸い果物」と説明できるが、りんごの写真を選べない' },
				{ id: 'door', text: '扉を開けるたびに、部屋の全ての物が変わっていないか確かめた' },
				{ id: 'hot', text: '「熱い」を辞書の言葉で言い換えられるが、触って熱いと分からない' },
				{ id: 'cup', text: 'お茶を出す前に、関係する事を選べず、手順が決まらなかった' },
				{ id: 'dog', text: '「犬」の文字の並びは扱えるが、それが指す動物とは結び付かない' }
			],
			bins: [
				{ id: 'frame', label: 'フレーム問題' },
				{ id: 'ground', label: '記号接地問題' }
			]
		},
		success: {
			bins: {
				bomb: 'frame',
				apple: 'ground',
				door: 'frame',
				hot: 'ground',
				cup: 'frame',
				dog: 'ground'
			}
		},
		mistakes: [
			{
				when: '果物を説明できても写真を選べない例を、フレーム問題に入れた',
				why: '考える範囲の話ではない。言葉が、見た物と結び付いていない',
				next: 'りんごの例を記号接地問題に入れる',
				match: 'apple:frame'
			},
			{
				when: '扉を開けるたびに全てを確かめる例を、記号接地問題に入れた',
				why: '言葉の意味の話ではない。関係する事だけを選べていない',
				next: '扉の例をフレーム問題に入れる',
				match: 'door:ground'
			},
			{
				when: '「熱い」を触って分からない例を、フレーム問題に入れた',
				why: '言葉を別の言葉で言い換えるだけで、体の感じと結び付いていない',
				next: '「熱い」の例を記号接地問題に入れる',
				match: 'hot:frame'
			}
		]
	},
	check: [
		{ ask: 'フレーム問題', how: '今の仕事に関係する事だけを選び出せない' },
		{ ask: '記号接地問題', how: '記号（言葉）を、指す物の意味に結び付けられない' },
		{ ask: '今の AI', how: '特定の仕事で知的に振る舞う弱い AI' }
	]
};
