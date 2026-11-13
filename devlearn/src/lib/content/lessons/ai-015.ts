// ai-015 誤差逆伝播（calc）。
// 場面：重みが 2 つの小さな網（h = w₁ x、y = w₂ h）で、出力の誤差を層を遡って各重みへ配る。数は作り物。
// 経過時刻 t は手順の番号。G 検定のシラバス「誤差逆伝播法・連鎖律」に対応する。
import type { Lesson } from '../../lesson/types.ts';

const X = '入力 x = 1';
const H = '中間 h';
const Y = '出力 y';

export const ai015: Lesson = {
	id: 'ai-015',
	field: 'ai',
	level: 3,
	title: '誤差逆伝播',
	goal: '出力の誤差を、層を遡って各重みへ配ることができる',
	prereq: ['ai-014'],
	related: [],
	next: ['ai-016', 'ai-018'],
	explain: [
		{
			n: 1,
			title: '出力の誤差',
			lead: 'まず前へ計算し、出力の誤差を出す',
			body: [
				'x = 1、w₁ = 2、w₂ = 3。h = 2 × 1 = 2、y = 3 × 2 = 6。正解は t = 4。',
				'誤差は L = ½ (y − t)² = ½ × 2² = 2。'
			],
			facts: [
				{ k: 'h', v: '2' },
				{ k: 'y', v: '6' },
				{ k: 'L', v: '½ (6 − 4)² = 2' }
			],
			scene: [
				{ op: 'appear', id: 'x', label: X, sub: '入力', at: [0, 1] },
				{ op: 'appear', id: 'h', label: H, sub: 'w₁ = 2 → 2', at: [3, 1] },
				{ op: 'appear', id: 'y', label: Y, sub: 'w₂ = 3 → 6', at: [6, 1] },
				{ op: 'move', from: 'x', to: 'y', payload: '前へ', kind: 'forward' }
			],
			log: { t: '1', from: X, to: Y, kind: 'forward', info: 'y = 6、誤差 2' }
		},
		{
			n: 2,
			title: '最後の層の勾配',
			lead: '出力に一番近い重み w₂ の勾配から求める',
			body: ['∂L/∂y = y − t = 2。y = w₂ h なので ∂y/∂w₂ = h = 2。', '∂L/∂w₂ = 2 × 2 = 4。'],
			facts: [
				{ k: '∂L/∂y', v: '6 − 4 = 2' },
				{ k: '∂L/∂w₂', v: '2 × h = 4' }
			],
			scene: [
				{ op: 'move', from: 'y', to: 'h', payload: '∂L/∂y = 2', kind: 'back' },
				{ op: 'change', id: 'y', k: '∂L/∂w₂', v: '4' }
			],
			log: { t: '2', from: Y, to: 'w₂', kind: 'back', info: 'w₂ の勾配は 4' }
		},
		{
			n: 3,
			title: '1 つ前へ',
			lead: '誤差を、中間の値 h へ遡らせる',
			body: [
				'y = w₂ h なので ∂y/∂h = w₂ = 3。',
				'∂L/∂h = ∂L/∂y × w₂ = 2 × 3 = 6。h が 1 増えると、誤差は約 6 増える。'
			],
			facts: [
				{ k: '∂y/∂h', v: 'w₂ = 3' },
				{ k: '∂L/∂h', v: '2 × 3 = 6' }
			],
			scene: [{ op: 'change', id: 'h', k: '∂L/∂h', v: '6' }],
			log: { t: '3', from: Y, to: H, kind: 'back', info: 'h へ 6 が遡った' }
		},
		{
			n: 4,
			title: '連鎖律',
			lead: '遡るときは、各層の微分を掛け合わせる（連鎖律）',
			body: [
				'∂L/∂w₁ = ∂L/∂y × ∂y/∂h × ∂h/∂w₁ = 2 × 3 × x = 2 × 3 × 1 = 6。',
				'前の層で求めた値を使い回すので、重みが何百万あっても速く求まる。'
			],
			facts: [
				{ k: '∂h/∂w₁', v: 'x = 1' },
				{ k: '∂L/∂w₁', v: '6 × 1 = 6' }
			],
			scene: [
				{ op: 'move', from: 'h', to: 'x', payload: '× x', kind: 'back' },
				{ op: 'change', id: 'h', k: '∂L/∂w₁', v: '6' }
			],
			log: { t: '4', from: H, to: 'w₁', kind: 'back', info: 'w₁ の勾配は 6' },
			why: '後ろの層の結果を前の層の計算に使い回すので、重みごとに一から微分し直さずに済む'
		},
		{
			n: 5,
			title: '各重みの勾配',
			lead: '全ての重みの勾配がそろった',
			body: [
				'∂L/∂w₂ = 4、∂L/∂w₁ = 6。どちらも正なので、どちらも減らすと誤差が減る。',
				'層が深いと、掛け合わせが続いて勾配が小さくなりすぎることがある（勾配消失）。'
			],
			facts: [
				{ k: '∂L/∂w₂', v: '4' },
				{ k: '∂L/∂w₁', v: '6' }
			],
			scene: [{ op: 'change', id: 'x', k: '勾配', v: 'w₁ 6・w₂ 4' }],
			log: { t: '5', from: '勾配', to: '重み', kind: 'grad', info: 'w₁ 6・w₂ 4' }
		},
		{
			n: 6,
			title: 'まとめて更新',
			lead: '勾配がそろったら、全ての重みを一度に更新する',
			body: [
				'学習率 0.1 で、w₂ = 3 − 0.4 = 2.6、w₁ = 2 − 0.6 = 1.4。',
				'新しい y = 2.6 × 1.4 × 1 = 3.64 で、正解の 4 に近づいた。'
			],
			facts: [
				{ k: '新しい w₂', v: '2.6' },
				{ k: '新しい w₁', v: '1.4' },
				{ k: '新しい y', v: '3.64' }
			],
			scene: [
				{ op: 'change', id: 'y', k: '値', v: '6 → 3.64' },
				{ op: 'change', id: 'h', k: 'w₁', v: '2 → 1.4' }
			],
			log: { t: '6', from: '重み', to: Y, kind: 'update', info: 'y は 3.64 に近づいた' }
		}
	],
	example: {
		intro: '誤差逆伝播の計算（x = 1、w₁ = 2、w₂ = 3、t = 4、L = ½ (y − t)²）',
		lines: [
			'前へ   h = 2 × 1 = 2       y = 3 × 2 = 6      L = ½ (6 − 4)² = 2',
			'遡る   ∂L/∂y  = 6 − 4      = 2',
			'       ∂L/∂w₂ = 2 × h      = 4',
			'       ∂L/∂h  = 2 × w₂     = 6',
			'       ∂L/∂w₁ = 6 × x      = 6',
			'更新   w₂ = 3 − 0.1 × 4 = 2.6   w₁ = 2 − 0.1 × 6 = 1.4'
		]
	},
	practice: {
		goal: '別の値で前へ計算し、誤差を遡らせて 2 つの重みの勾配と新しい w₁ を求める',
		form: 'calc',
		setup: {
			data: [
				{ k: '網', v: 'h = w₁ x、y = w₂ h、L = ½ (y − t)²' },
				{ k: '値', v: 'x = 2、w₁ = 1.5、w₂ = 2、t = 5' },
				{ k: '学習率', v: '0.1' }
			],
			steps: [
				{ label: '出力 y' },
				{ label: '∂L/∂y（y − t）' },
				{ label: '∂L/∂w₂' },
				{ label: '∂L/∂w₁' },
				{ label: '新しい w₁' }
			]
		},
		success: { values: ['6', '1', '3', '4', '1.1'] },
		mistakes: [
			{
				when: '∂L/∂w₁ で w₂ を掛け忘れた',
				why: 'w₁ から誤差までの間に w₂ の層がある。連鎖律で w₂ も掛ける',
				next: '1 × w₂ × x = 1 × 2 × 2 = 4 にする',
				match: '4=2'
			},
			{
				when: '∂L/∂w₂ で h の代わりに x を掛けた',
				why: 'y = w₂ h なので、w₂ で微分すると h が出る',
				next: '1 × h = 1 × 3 = 3 にする',
				match: '3=2'
			},
			{
				when: '重みに勾配を足した',
				why: '勾配の逆へ動かす。学習率 × 勾配を引く',
				next: '1.5 − 0.1 × 4 = 1.1 にする',
				match: '5=1.9'
			}
		]
	},
	check: [
		{ ask: '遡り方', how: '出力に近い層から順に、微分を掛け合わせる（連鎖律）' },
		{ ask: '∂L/∂w₁', how: '∂L/∂y × w₂ × x' },
		{ ask: '勾配消失', how: '深い網で、掛け合わせが続いて勾配が小さくなりすぎる' }
	]
};
