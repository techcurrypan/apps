// 見本の題（第 3 版。見せ方の型 chart）：sta-019「標本平均の分布」。試作 learn11 の #stat が下限（learn-standard.md 第 15・20 章）。
// 場面は作り話：窓口の待ち時間は平均 4 分・σ 4 分の指数分布。値は種つきの模擬（src/lib/learn/stat-sim.ts。種 7）で決まる。
// 数は計算で確かめた（確認日 2026-11-28。scripts で sim を走らせた値）：
//   σ/√30 = 0.7303、±1.96 × 0.7303 = ±1.431 → 2.569〜5.431 分、σ/√120 = 0.3651、中央値 = 4 ln 2 = 2.77 分、P(X > 10) = e^−2.5 = 0.082、
//   模擬の 400 日：平均の平均 3.997・散らばり 0.708（n = 120 で 0.375）・帯の中 384 日、20 日目の平均 4.644 分、
//   z = 0.644 / 0.7303 = 0.882、p = 2(1 − Φ(0.882)) = 0.378、|平均 − 4| ≥ 0.644 の日は 139 日、
//   平均の歪み 2/√n（n = 2 で 1.41、n = 30 で 0.37）、ρ = 0.1 で √(1 + 29 × 0.1) = 1.975 倍（模擬 0.708 → 1.496）。
// 出典：NIST/SEMATECH e-Handbook of Statistical Methods 1.3.5.2・1.3.6.6.1・1.3.6.6.7（確認日 2026-11-28）、Kish（1965）Survey Sampling の design effect
import type { V3Lesson } from '../../learn/check-v3.ts';

const POP = { kind: 'pop', shape: 0 } as const;
const TODAY = { kind: 'sample', shape: 0, n: 30, day: 20, grow: true } as const;

export const STA_019_V3: V3Lesson = {
	id: 'sta-019',
	field: 'sta',
	title: '標本平均の分布',
	goal: '標本平均の散らばりが標本の大きさで縮む様子を、平均の分布と σ/√n で説明し、ある平均が偶然の範囲かを判断できる',
	view: 'chart',
	kick: '統計 ・ 段 2（仕組み）・ 見せ方：グラフの段',
	terms: [
		'population',
		'sample',
		'n',
		'mean',
		'samplemean',
		'dist',
		'hist',
		'sd',
		'sampdist',
		'skew',
		'chance',
		'sqrt',
		'se',
		'normal',
		'clt',
		'p95',
		'z',
		'pvalue',
		'indep',
		'rho',
		'ci',
		'sim'
	],
	objs: {
		pop: {
			kind: 'panel',
			name: '母集団：窓口の待ち時間（平均 4 分・σ 4 分）',
			tone: 'teal',
			term: 'population',
			w: 940,
			h: 130
		},
		smp: {
			kind: 'panel',
			name: '標本：ある日の 30 人',
			tone: 'blue',
			term: 'sample',
			w: 940,
			h: 110
		},
		mean: {
			kind: 'panel',
			name: '平均の分布：1 日に 1 つずつ積む',
			tone: 'orange',
			term: 'sampdist',
			w: 940,
			h: 190
		},
		popS: {
			kind: 'panel',
			name: '母集団：来る人みんな',
			tone: 'teal',
			term: 'population',
			w: 300,
			h: 250
		},
		smpS: {
			kind: 'panel',
			name: '標本：今日の 30 人',
			tone: 'blue',
			term: 'sample',
			w: 300,
			h: 250
		},
		meanS: { kind: 'panel', name: '平均の分布', tone: 'orange', term: 'sampdist', w: 280, h: 250 },
		m30: {
			kind: 'panel',
			name: '平均の分布（n = 30）',
			tone: 'orange',
			term: 'sampdist',
			w: 460,
			h: 190
		},
		m120: {
			kind: 'panel',
			name: '平均の分布（n = 120）',
			tone: 'orange',
			term: 'se',
			w: 460,
			h: 190
		}
	},
	metrics: [
		{ key: 'n', label: '標本の大きさ', term: 'n' },
		{ key: 'se', label: '標準誤差', term: 'se' },
		{
			key: 'days',
			label: '積んだ日',
			desc: '平均の分布に積んだ日の数。1 日に標本平均を 1 つ出す。'
		},
		{ key: 'z', label: 'z 値', term: 'z' }
	],
	steps: [
		{
			kind: 'intro',
			short: '言葉',
			title: '始める前に：言葉をそろえる',
			intro: {
				terms: [
					'population',
					'sample',
					'n',
					'mean',
					'samplemean',
					'dist',
					'hist',
					'sd',
					'sampdist',
					'skew',
					'chance'
				],
				anatomy: [
					{ text: '30 人', note: '標本の大きさ', term: 'n', color: '#7fb2ff' },
					{ text: 'の平均', note: '足して人数で割る', term: 'samplemean', color: '#f5b46b' },
					{ pre: ' = ', text: '4.64 分', note: '今日の結果', term: 'mean', color: '#8fd6a8' }
				],
				analogy:
					'鍋の味見に似ている。鍋全体が母集団、スプーン 1 杯が標本。1 杯ごとに味は少し違うが、よく混ぜてあれば、何杯も取るとその違いの幅が分かる。'
			},
			paras: [
				'窓口の待ち時間を例に、平均がどれくらいぶれるかを追う。',
				'来る人みんなが母集団、今日測った 30 人が標本。標本の大きさは 30 だ。標本平均は 4.64 分。',
				'値の散らばりを標準偏差 σ、値がどこにどれだけあるかを分布と呼ぶ。分布はヒストグラムで描く。待ち時間は右に長い形。',
				'標本平均を毎日積むと、平均の分布ができる。今日の値が偶然の範囲かは、この分布で決まる。'
			],
			at: [0, 1500, 3200, 5200],
			dur: 8000,
			layout: { popS: [175, 440], smpS: [500, 440], meanS: [825, 440] },
			links: [
				{ from: 'popS', to: 'smpS' },
				{ from: 'smpS', to: 'meanS' }
			],
			charts: {
				popS: POP,
				smpS: TODAY,
				meanS: { kind: 'means', shape: 0, n: 30, days: 400, grow: true }
			},
			tokens: [
				{ name: '30 人', tone: 'blue', path: ['popS', 'smpS'], at: 200, d: 1200 },
				{ name: '平均 4.64', tone: 'orange', path: ['smpS', 'meanS'], at: 2400, d: 1200 }
			],
			metrics: { n: '30', se: '—', days: '0 → 400', z: '—' },
			callout: [
				'たとえると',
				'スプーン 1 杯の味で鍋全体を決めない。何杯取っても出る違いの幅を知ってから決める。'
			],
			changes: [['+', '登場する物：母集団・標本・平均の分布の 3 段']],
			first: [
				'mean',
				'population',
				'sample',
				'n',
				'samplemean',
				'sd',
				'dist',
				'hist',
				'skew',
				'sampdist',
				'chance'
			]
		},
		{
			kind: 'problem',
			short: '問題',
			title: '今日の平均は 4.64 分。待ち時間は長くなったのか',
			paras: [
				'この窓口の待ち時間は、ずっと平均 4 分だった。',
				'今日 30 人を測ると、標本平均は 4.64 分。0.64 分長い。',
				'本当に長くなったのか。それとも人の顔ぶれによる偶然か。30 人の平均がどれくらいぶれるかを知れば答えが出る。'
			],
			at: [0, 1600, 3400],
			dur: 6400,
			layout: { pop: [500, 85], smp: [500, 265], mean: [500, 485] },
			links: [
				{ from: 'pop', to: 'smp' },
				{ from: 'smp', to: 'mean' }
			],
			hl: ['smp'],
			charts: {
				pop: POP,
				smp: TODAY,
				mean: { kind: 'means', shape: 0, n: 30, days: 1, mark: 4.64 }
			},
			tokens: [
				{ name: '30 人', tone: 'blue', path: ['pop', 'smp'], at: 200, d: 1200 },
				{ name: '4.64 分', tone: 'orange', path: ['smp', 'mean'], at: 2400, d: 1200 }
			],
			metrics: { n: '30', se: '?', days: '1', z: '?' },
			callout: ['ポイント', '差が 0.64 分あるだけでは決められない。平均のぶれの幅と比べる。'],
			changes: [['+', '今日の標本平均 4.64 分']],
			first: []
		},
		{
			kind: 'mechanism',
			short: '母集団',
			title: '母集団：多くは短く、少しだけ長い人がいる',
			paras: [
				'母集団のヒストグラムは左ほど棒が高い。多くの人は 2〜3 分で済む。',
				'半分の人は 2.77 分以内（4 × ln 2）。10 分を超える人は 8.2% いる。',
				'平均は 4 分、σ も 4 分。右に長い形なので、平均は真ん中の人より長い。'
			],
			at: [0, 1800, 3800],
			dur: 6200,
			layout: { pop: [500, 85], smp: [500, 265], mean: [500, 485] },
			links: [
				{ from: 'pop', to: 'smp' },
				{ from: 'smp', to: 'mean' }
			],
			names: { smp: '標本（まだ取っていない）', mean: '平均の分布（まだ空）' },
			hl: ['pop'],
			charts: { pop: { kind: 'pop', shape: 0 } },
			tokens: [{ name: 'σ 4 分', tone: 'teal', path: ['pop', 'smp'], at: 3800, d: 1200 }],
			metrics: { n: '—', se: '—', days: '0', z: '—' },
			callout: [
				'よくある誤解',
				'「平均 4 分だから、だいたい 4 分待つ」は誤り。半分の人は 2.77 分以内だ。'
			],
			changes: [['+', '母集団の形：右に長い（指数分布）']],
			deep: '指数分布（平均 θ = 4）の密度は e^(−x/θ)/θ、σ = θ、中央値 = θ ln 2 ≈ 2.77、P(X > 10) = e^(−2.5) ≈ 0.082（NIST e-Handbook 1.3.6.6.7）。窓口に来る間隔や待ち時間の模型によく使う。',
			first: []
		},
		{
			kind: 'mechanism',
			short: '1 日分',
			title: '30 人を取り、平均を 1 つ出し、下に積む',
			paras: [
				'母集団から 30 人を選ぶ。1 人を 1 つの粒にして、待ち時間の所に置く。',
				'30 人の平均を出す。この日は 3.39 分。今日とは違う値だ。',
				'この平均を、下の段に 1 つ積む。これを毎日続ける。'
			],
			at: [0, 2200, 4000],
			dur: 6000,
			layout: { pop: [500, 85], smp: [500, 265], mean: [500, 485] },
			links: [
				{ from: 'pop', to: 'smp' },
				{ from: 'smp', to: 'mean' }
			],
			names: { smp: '標本：1 日目の 30 人' },
			hl: ['smp'],
			charts: {
				pop: POP,
				smp: { kind: 'sample', shape: 0, n: 30, day: 0, grow: true },
				mean: { kind: 'means', shape: 0, n: 30, days: 1 }
			},
			tokens: [
				{ name: '30 人', tone: 'blue', path: ['pop', 'smp'], at: 0, d: 1500 },
				{ name: '平均 3.39', tone: 'orange', path: ['smp', 'mean'], at: 2600, d: 1200 }
			],
			metrics: { n: '30', se: '?', days: '1', z: '—' },
			callout: ['ポイント', '同じ母集団から取っても、日によって標本平均は違う。'],
			changes: [['+', '1 日目の標本平均 3.39 分を積んだ']],
			first: []
		},
		{
			kind: 'mechanism',
			short: '山',
			title: '毎日繰り返すと、平均が山を作る',
			paras: [
				'日を変えて 400 日分、毎日 30 人の平均を 1 つずつ積む（模擬）。',
				'平均は 4 分の近くに集まり、2 分台や 6 分台は少ない。',
				'母集団は右に長いのに、平均の分布はほぼ左右対称の正規分布に近づく。これが中心極限定理だ。'
			],
			at: [0, 3000, 6000],
			dur: 9000,
			layout: { pop: [500, 85], smp: [500, 265], mean: [500, 485] },
			links: [
				{ from: 'pop', to: 'smp' },
				{ from: 'smp', to: 'mean' }
			],
			hl: ['mean'],
			charts: {
				pop: POP,
				smp: { kind: 'sample', shape: 0, n: 30, day: 0 },
				mean: { kind: 'means', shape: 0, n: 30, days: 400, grow: true }
			},
			tokens: [
				{ name: '平均', tone: 'orange', path: ['smp', 'mean'], at: 0, d: 900 },
				{ name: '平均', tone: 'orange', path: ['smp', 'mean'], at: 2000, d: 900 },
				{ name: '平均', tone: 'orange', path: ['smp', 'mean'], at: 4000, d: 900 }
			],
			metrics: { n: '30', se: '?', days: '0 → 400', z: '—' },
			callout: ['ポイント', '1 人ずつの値は右に長くても、30 人の平均は真ん中に寄って山になる。'],
			changes: [['+', '平均の分布：400 日分']],
			deep: '中心極限定理（Lindeberg–Lévy）：平均 μ・分散 σ² が有限で、独立に同じ分布から取った n 個の平均は、n が大きいと平均 μ・標準偏差 σ/√n の正規分布に近づく。模擬の値は種 7 の擬似乱数（mulberry32）で、同じ種なら同じ 400 日になる。',
			first: ['sim', 'clt', 'normal']
		},
		{
			kind: 'internals',
			short: 'σ/√n',
			title: '幅は σ/√n。30 人なら 4/√30 ≈ 0.73 分',
			paras: [
				'平均の分布の散らばりを標準誤差と呼ぶ。σ を √n で割る。√ は平方根だ。',
				'4 ÷ √30 = 4 ÷ 5.48 ≈ 0.73 分。模擬の 400 日では 0.71 分だった。',
				'正規分布なら、中心から ±1.96 × 0.73 = ±1.43 分に 95% が入る。2.57〜5.43 分。模擬では 400 日中 384 日（96%）が入った。'
			],
			at: [0, 2400, 4600],
			dur: 7200,
			layout: { pop: [500, 85], smp: [500, 265], mean: [500, 485] },
			links: [
				{ from: 'pop', to: 'smp' },
				{ from: 'smp', to: 'mean' }
			],
			hl: ['mean'],
			charts: {
				pop: POP,
				smp: { kind: 'sample', shape: 0, n: 30, day: 0 },
				mean: { kind: 'means', shape: 0, n: 30, days: 400, curve: true, band: true }
			},
			tokens: [{ name: '÷ √30', tone: 'teal', path: ['pop', 'mean'], at: 600, d: 1600 }],
			metrics: { n: '30', se: '0.73 分', days: '400', z: '—' },
			callout: ['式', '標準誤差 = σ ÷ √n = 4 ÷ √30 ≈ 0.73 分'],
			changes: [
				['+', '正規分布の曲線（平均 4・標準誤差 0.73）'],
				['+', '95% の帯：2.57〜5.43 分']
			],
			deep: '独立な n 個の和の分散は nσ²。平均はそれを n で割るので、分散は nσ²/n² = σ²/n、標準偏差は σ/√n（NIST e-Handbook 1.3.5.2）。1.96 は標準正規分布で Φ(1.96) = 0.975 になる値。',
			first: ['se', 'sqrt', 'p95']
		},
		{
			kind: 'internals',
			short: '4 倍',
			title: 'n を 4 倍にすると、幅は半分',
			paras: [
				'1 日 120 人にすると、√120 は √30 の 2 倍。標準誤差は 0.73 → 0.37 分。',
				'模擬でも 0.71 → 0.375 分。山は細く、高くなる。',
				'幅を半分にするには、人数を 4 倍にする。10 分の 1 にするなら 100 倍だ。'
			],
			at: [0, 2200, 4200],
			dur: 8600,
			layout: { pop: [500, 85], m30: [265, 485], m120: [735, 485] },
			links: [
				{ from: 'pop', to: 'm30' },
				{ from: 'pop', to: 'm120' }
			],
			hl: ['m120'],
			charts: {
				pop: POP,
				m30: { kind: 'means', shape: 0, n: 30, days: 400, grow: true, curve: true, band: true },
				m120: { kind: 'means', shape: 0, n: 120, days: 400, grow: true, curve: true, band: true }
			},
			tokens: [
				{ name: '30 人', tone: 'blue', path: ['pop', 'm30'], at: 0, d: 1200 },
				{ name: '120 人', tone: 'blue', path: ['pop', 'm120'], at: 300, d: 1200 }
			],
			metrics: { n: '30 → 120', se: '0.73 → 0.37 分', days: '400', z: '—' },
			callout: [
				'代償',
				'精しさを 2 倍にすると、測る手間は 4 倍。どこまで精しくするかは費用と決める。'
			],
			changes: [['~', '標準誤差：0.73 → 0.37 分']],
			first: []
		},
		{
			kind: 'numbers',
			short: '4.64 は',
			title: '4.64 分は、偶然でも普通に出る',
			paras: [
				'z 値 = (4.64 − 4) ÷ 0.73 ≈ 0.88。標準誤差 1 つ分にも届かない。',
				'p 値は 0.38。待ち時間が変わっていなくても、38% の日はこれ以上離れる。模擬の 400 日でも 139 日（35%）。',
				'だから「長くなった」とは言えない。95% の帯の中、偶然の範囲だ。'
			],
			at: [0, 2200, 4600],
			dur: 7000,
			layout: { pop: [500, 85], smp: [500, 265], mean: [500, 485] },
			links: [
				{ from: 'pop', to: 'smp' },
				{ from: 'smp', to: 'mean' }
			],
			hl: ['mean'],
			charts: {
				pop: POP,
				smp: { kind: 'sample', shape: 0, n: 30, day: 20 },
				mean: { kind: 'means', shape: 0, n: 30, days: 400, curve: true, band: true, mark: 4.64 }
			},
			tokens: [{ name: '4.64 分', tone: 'red', path: ['smp', 'mean'], at: 400, d: 1300 }],
			metrics: { n: '30', se: '0.73 分', days: '400', z: '0.88' },
			callout: ['計算', 'z = 0.64 ÷ 0.73 ≈ 0.88、p = 2 × (1 − Φ(0.88)) ≈ 0.38'],
			changes: [['+', '今日の印：4.64 分（帯の中）']],
			first: ['z', 'pvalue']
		},
		{
			kind: 'fail',
			short: '少ない',
			title: '失敗：人数が少ないと、山は正規分布にならない',
			paras: [
				'1 日 2 人の平均を積むと、平均の分布も右に長いまま。曲線と合わない。',
				'この時に ±1.96 標準誤差で 95% の範囲を読むと外れる。',
				'歪みの目安は 2 ÷ √n。n = 2 で 1.41、n = 30 で 0.37。右に長い母集団では人数を多めに取る。'
			],
			at: [0, 2200, 4200],
			dur: 8600,
			layout: { pop: [500, 85], smp: [500, 265], mean: [500, 485] },
			links: [
				{ from: 'pop', to: 'smp' },
				{ from: 'smp', to: 'mean' }
			],
			names: { smp: '標本：ある日の 2 人', mean: '平均の分布（n = 2）' },
			hl: ['mean'],
			charts: {
				pop: POP,
				smp: { kind: 'sample', shape: 0, n: 2, day: 0, grow: true },
				mean: { kind: 'means', shape: 0, n: 2, days: 400, grow: true, curve: true }
			},
			tokens: [{ name: '2 人', tone: 'red', path: ['pop', 'smp'], at: 0, d: 1200 }],
			metrics: { n: '2', se: '2.83 分', days: '0 → 400', z: '—' },
			callout: [
				'気をつける',
				'中心極限定理は「n が大きいと」の決まり。小さい n では形を先に確かめる。'
			],
			changes: [['~', '標本の大きさ：30 → 2']],
			deep: '指数分布 n 個の平均は形 n・尺度 θ/n のガンマ分布で、歪み（skewness）は 2/√n。n = 30 でも 0.37 残るので、帯の端の割合は正規分布より少しずれる（模擬の帯の中は 96%）。',
			first: []
		},
		{
			kind: 'fail',
			short: '独立',
			title: '失敗：同じ日の人が独立でないと、幅が嘘になる',
			paras: [
				'窓口が混む日は、皆が長く待つ。同じ日の人どうしに相関 ρ があり、独立ではない。',
				'その時の幅は σ/√n の √(1 + (n − 1)ρ) 倍。ρ = 0.1・n = 30 で 1.97 倍。',
				'模擬でも 0.71 → 1.50 分に広がった。σ/√n のまま読むと、偶然を「変わった」と見誤る。'
			],
			at: [0, 2400, 4600],
			dur: 8600,
			layout: { pop: [500, 85], smp: [500, 265], mean: [500, 485] },
			links: [
				{ from: 'pop', to: 'smp' },
				{ from: 'smp', to: 'mean' }
			],
			names: { mean: '平均の分布（同じ日の相関 ρ = 0.1）' },
			hl: ['mean'],
			charts: {
				pop: POP,
				smp: { kind: 'sample', shape: 0, n: 30, day: 0, rho: 0.1, grow: true },
				mean: {
					kind: 'means',
					shape: 0,
					n: 30,
					days: 400,
					rho: 0.1,
					grow: true,
					curve: true,
					band: true
				}
			},
			tokens: [{ name: '混む日', tone: 'red', path: ['pop', 'smp'], at: 0, d: 1300 }],
			metrics: { n: '30', se: '0.73 → 1.44 分', days: '0 → 400', z: '—' },
			callout: [
				'気をつける',
				'人ではなく日を選んでいる時は、実は「日」が 1 つの標本。人数を増やしても幅は縮みにくい。'
			],
			changes: [['~', '95% の帯：±1.43 → ±2.83 分']],
			deep: '同じ組の中の相関 ρ（級内相関）があると、平均の分散は σ²/n × (1 + (n − 1)ρ) になる。この倍率を design effect と呼ぶ（Kish 1965）。模擬では 1 日の共通の揺れ d（N(0, √ρ σ)）を全員に足し、1 人の σ は 4 のまま。',
			first: ['rho', 'indep']
		},
		{
			kind: 'realworld',
			short: '実際には',
			title: '実際には：平均に幅を付けて伝える',
			paras: [
				'報告では、平均だけでなく信頼区間を付ける。標本平均 ± 1.96 × 標準誤差。',
				'今日なら 4.64 ± 1.43 → 3.21〜6.07 分。4 分を含むので、変わったとは言えない。',
				'本物の測りでは σ も分からないので、標本の標準偏差で代わりにする。人数が少ない時は 1.96 の代わりに t 分布の値を使う（次の sta-020）。'
			],
			at: [0, 2200, 4400],
			dur: 7200,
			layout: { pop: [500, 85], smp: [500, 265], mean: [500, 485] },
			links: [
				{ from: 'pop', to: 'smp' },
				{ from: 'smp', to: 'mean' }
			],
			hl: ['smp'],
			charts: {
				pop: POP,
				smp: TODAY,
				mean: { kind: 'means', shape: 0, n: 30, days: 400, curve: true, band: true, mark: 4.64 }
			},
			tokens: [{ name: '4.64 ± 1.43', tone: 'green', path: ['smp', 'mean'], at: 2400, d: 1300 }],
			metrics: { n: '30', se: '0.73 分', days: '400', z: '0.88' },
			callout: ['伝え方', '「今日の平均は 4.64 分（95% 信頼区間 3.21〜6.07 分）」'],
			changes: [['+', '信頼区間 3.21〜6.07 分']],
			deep: '母平均の信頼区間は x̄ ± z(α/2)·σ/√n（σ が分かる時）、x̄ ± t(α/2, n−1)·s/√n（σ を標本から推す時。NIST e-Handbook 1.3.5.2）。n = 30 の t(0.025, 29) は 2.045 で、1.96 より 4% 広い。',
			first: ['ci']
		},
		{
			kind: 'summary',
			short: 'まとめ',
			title: 'まとめ：平均のぶれは σ/√n で読む',
			paras: [
				'標本平均は日ごとにぶれる。積むと平均の分布ができ、n が大きいと正規分布に近づく。',
				'ぶれの幅は標準誤差 σ/√n。人数を 4 倍にすると半分。独立でないと広がる。',
				'ある平均が偶然の範囲かは、z 値・p 値・信頼区間で読む。'
			],
			at: [0, 2000, 4000],
			dur: 6400,
			layout: { pop: [500, 85], smp: [500, 265], mean: [500, 485] },
			links: [
				{ from: 'pop', to: 'smp' },
				{ from: 'smp', to: 'mean' }
			],
			hl: ['mean'],
			charts: {
				pop: POP,
				smp: { kind: 'sample', shape: 0, n: 30, day: 20 },
				mean: { kind: 'means', shape: 0, n: 30, days: 400, curve: true, band: true, mark: 4.64 }
			},
			tokens: [{ name: '平均', tone: 'orange', path: ['smp', 'mean'], at: 400, d: 1200 }],
			metrics: { n: '30', se: '0.73 分', days: '400', z: '0.88' },
			callout: [
				'教えるときは',
				'先に「30 人の平均は毎日いくつぐらい違うか」を予想させてから、400 日の山を見せる。'
			],
			changes: [['+', '母集団・標本・平均の分布を同じ目盛りで 1 枚に']],
			first: []
		}
	]
};
