import { SHAPES, SIGMA, sim, type Shape } from './stat-sim.ts';
// 試す（learn-standard.md 第 19 章・LS-L5・mastery-standard.md EV-3）。つまみの値で結果を計算し直す。
// 計算は決まった式だけ（乱数なし。CLAUDE.md 第 8 章）。式は試作 learn11 の「試す」を TypeScript に移した物
export type LabKnob = {
	k: string;
	label: string;
	min: number;
	max: number;
	step: number;
	/** 始めの値 */
	v: number;
	unit: string;
	/** 吹き出しの説明（何の値か。LS3-H5） */
	d: string;
	/** 選ぶつまみの名前（値 min, min+step, … の順）。あれば値の代わりに出す */
	show?: string[];
};
/** 試すの題（見せ方の型ごとの見本の題） */
export type LabId = 'tcp' | 'k8s' | 'mem' | 'stat';
export type Pred = { q: string; opts: string[]; ans: number; why: string; tryit: string };
/** 結果の表の 1 行：名前・値・言葉の ID（吹き出し） */
export type LabRow = [string, string, string?];
export type Lab = {
	title: string;
	intro: string;
	knobs: LabKnob[];
	results: (v: Record<string, number>) => LabRow[];
	preds: Pred[];
};

/** つまみの値を、範囲の中・刻みの上に合わせる */
export function snapKnob(k: LabKnob, x: number): number {
	const n = Math.round((Math.min(k.max, Math.max(k.min, x)) - k.min) / k.step);
	return Number((k.min + n * k.step).toFixed(6));
}

/** つまみの今の値を書く（選ぶつまみは名前、数は単位つき） */
export function knobText(k: LabKnob, v: number): string {
	const i = Math.round((v - k.min) / k.step);
	return k.show?.[i] ?? `${v}${k.unit}`;
}

export function answerPred(p: Pred, choice: number): { ok: boolean; why: string; tryit: string } {
	return { ok: choice === p.ans, why: p.why, tryit: p.tryit };
}

const MSS = 1448;
const TOTAL = 1048576;
/** 1 MB を送る：スロースタートは 1 往復で 2 倍、落ちたら 0.7 倍、その後は 1 往復で +1 MSS と粗く数える */
export function tcpSim(p: { rtt: number; loss: number; icw: number }) {
	let cwnd = p.icw;
	let sent = 0;
	let rtts = 0;
	let ss = true;
	let ssth = Infinity;
	let cnt = 0;
	const hist: number[] = [];
	const every = p.loss > 0 ? Math.round(100 / p.loss) : Infinity;
	while (sent < TOTAL && rtts < 400) {
		const n = Math.min(Math.floor(cwnd), Math.ceil((TOTAL - sent) / MSS));
		let lost = false;
		for (let i = 0; i < n; i++) if (++cnt % every === 0) lost = true;
		sent += n * MSS;
		hist.push(Math.floor(cwnd));
		rtts++;
		if (lost) {
			ssth = Math.max(2, cwnd * 0.7);
			cwnd = ssth;
			ss = false;
		} else cwnd = ss && cwnd < ssth ? cwnd * 2 : cwnd + 1;
	}
	const ms = rtts * p.rtt;
	return { rtts, ms, hist, mbps: (TOTAL * 8) / (ms / 1000) / 1e6 };
}

/** ノードに置ける Pod の数と、上限を超えた Pod が 10 分で落ちる回数（再起動の待ちは 10 秒から倍、300 秒まで） */
export function k8sPlan(p: { rep: number; lim: number; peak: number; nodes: number }) {
	const cap = Math.floor(2048 / p.lim);
	const sched = Math.min(p.rep, p.nodes * cap);
	const pend = p.rep - sched;
	const oom = p.peak > p.lim;
	let t = 0;
	let back = 10;
	let per = 0;
	if (oom)
		for (;;) {
			t += 15;
			if (t > 600) break;
			per++;
			t += back;
			back = Math.min(300, back * 2);
		}
	return { cap, sched, pend, oom, per, total: per * sched };
}

const fmt = (x: number) => (x >= 100 ? Math.round(x).toLocaleString('en-US') : x.toFixed(1));

/** 標本の大きさ n・積む日・母集団の形から、式の標準誤差・模擬の散らばり・95% の帯に入った日の割合・歪みの目安（指数の時 2/√n） */
export function statLab(p: { n: number; days: number; shape: number }) {
	const shape = Math.max(0, Math.min(2, Math.round(p.shape))) as Shape;
	const se = SIGMA[shape] / Math.sqrt(p.n);
	const r = sim(p.n, p.days, shape);
	const inBand = r.means.filter((m) => Math.abs(m - 4) <= 1.96 * se).length / p.days;
	return {
		se,
		sd: r.sd,
		inBand,
		lo: 4 - 1.96 * se,
		hi: 4 + 1.96 * se,
		skew: shape === 0 ? 2 / Math.sqrt(p.n) : null,
		shape
	};
}

export const MEM_MODES = ['b = a', 'b = [...a]', 'structuredClone(a)'] as const;
/** a は長さ n の配列（中は数か、小さな配列 [i, i]）。b の作り方ごとに、同じ物か・b[0] を直すと a が変わるか・配列の数・写した値の数。
 * 確かめ：Node.js v24.19.0 で const a = [[1], 2] の [...a][0] === a[0] は true、structuredClone(a)[0] === a[0] は false（確認日 2026-11-28） */
export function memLab(p: { n: number; mode: number; nested: number }) {
	const nested = p.nested === 1;
	const same = p.mode === 0;
	const deep = p.mode === 2;
	const innerSame = !(deep && nested);
	const aChanges = same || (p.mode === 1 && nested);
	const inner = nested ? p.n : 0;
	const arrays = 1 + inner + (same ? 0 : 1) + (deep ? inner : 0);
	const copied = same ? 0 : p.n + (deep ? inner * 2 : 0);
	return { n: p.n, nested, mode: p.mode, same, innerSame, aChanges, arrays, copied };
}

export const LABS: Record<LabId, Lab> = {
	tcp: {
		title: '1 MB を送る時間は何で決まるか',
		intro:
			'RTT・喪失率・初期 cwnd を動かすと、1 往復ごとの cwnd の育ち方と、1 MB が届くまでの時間が計算し直される。',
		knobs: [
			{
				k: 'rtt',
				label: 'RTT',
				min: 5,
				max: 200,
				step: 5,
				v: 30,
				unit: ' ms',
				d: '1 往復にかかる時間。5〜200 ms。'
			},
			{
				k: 'loss',
				label: '喪失率',
				min: 0,
				max: 5,
				step: 0.5,
				v: 0,
				unit: ' %',
				d: '送った物のうち途中で落ちる割合。0〜5 %。'
			},
			{
				k: 'icw',
				label: '初期 cwnd',
				min: 2,
				max: 40,
				step: 1,
				v: 10,
				unit: ' MSS',
				d: '最初の 1 往復で送ってよい数。2〜40 個（1 個 1,448 バイト）。'
			}
		],
		results(v) {
			const r = tcpSim({ rtt: v.rtt, loss: v.loss, icw: v.icw });
			return [
				['往復の回数', `${r.rtts} 回`],
				['1 MB が届くまで', `${fmt(r.ms)} ms`],
				['平均の速さ', `${fmt(r.mbps)} Mbps`],
				['最後の cwnd', `${r.hist[r.hist.length - 1]} MSS`, 'cwnd'],
				['RTT', `${v.rtt} ms`, 'rtt']
			];
		},
		preds: [
			{
				q: '帯域が 10 倍の回線に替えたら、RTT 30 ms・喪失 0% の 1 MB は何倍速く届く？',
				opts: ['約 10 倍', 'ほとんど変わらない', '約 2 倍'],
				ans: 1,
				why: '1 MB の時間の大半は、cwnd が育つまでの往復の回数で決まる。帯域ではなく RTT が効く。',
				tryit: 'RTT を 30 → 15 ms にして、時間が半分になるのを見る'
			},
			{
				q: '喪失率を 0 → 1% にすると？',
				opts: ['少し遅くなるだけ', '往復の回数が何倍にも増える'],
				ans: 1,
				why: '落ちるたびに cwnd が 0.7 倍に減り、その後は 1 往復で 1 つずつしか増えない。',
				tryit: '喪失率 1% と 2% で往復の回数を比べる'
			}
		]
	},
	k8s: {
		title: '置ける数と、落ち続けるかを決めるもの',
		intro:
			'ノード 1 台に空き 2,048 Mi がある。Pod 1 つのメモリの上限と、アプリが使う山を動かす。置けない Pod は Pending、山が上限を超える Pod は OOMKilled を繰り返す（10 分で数える）。',
		knobs: [
			{
				k: 'rep',
				label: 'replicas',
				min: 1,
				max: 12,
				step: 1,
				v: 4,
				unit: '',
				d: '動かしたい Pod の数。1〜12 個。'
			},
			{
				k: 'lim',
				label: 'メモリ上限（1 Pod）',
				min: 128,
				max: 1024,
				step: 64,
				v: 256,
				unit: ' Mi',
				d: 'Pod 1 つが使ってよいメモリの上限。128〜1,024 Mi。'
			},
			{
				k: 'peak',
				label: 'アプリの山',
				min: 100,
				max: 900,
				step: 50,
				v: 300,
				unit: ' Mi',
				d: 'アプリが一番多く使う時のメモリ。100〜900 Mi。'
			},
			{
				k: 'nodes',
				label: 'ノードの数',
				min: 2,
				max: 4,
				step: 1,
				v: 3,
				unit: ' 台',
				d: 'Pod を置けるサーバの台数。2〜4 台。'
			}
		],
		results(v) {
			const r = k8sPlan({ rep: v.rep, lim: v.lim, peak: v.peak, nodes: v.nodes });
			return [
				['置けた Pod', `${r.sched} 個`],
				['Ready で居続ける', `${r.oom ? 0 : r.sched} 個`],
				['Pending', `${r.pend} 個`],
				['1 Pod が 10 分で落ちた回数', `${r.per} 回`],
				['全体の再起動（10 分）', `${r.total} 回`],
				['1 台に置ける数', `${r.cap} 個`]
			];
		},
		preds: [
			{
				q: '上限 256 Mi・山 300 Mi のまま、replicas を 4 → 8 にすると？',
				opts: ['再起動が止まる', '再起動の合計が倍になる', '変わらない'],
				ans: 1,
				why: 'どの Pod も同じ上限で落ちる。数を増やしても、1 つ当たりの足りなさは直らない。',
				tryit: '上限を 320 Mi 以上にして、落ちた回数が 0 になるのを見る'
			},
			{
				q: '上限 1,024 Mi・ノード 3 台・replicas 8 だと Pending は？',
				opts: ['0 個', '2 個', '5 個'],
				ans: 1,
				why: '1 台に 2,048 ÷ 1,024 = 2 個、3 台で 6 個。残りの 2 個は置き場が無い。',
				tryit: 'ノードを 4 台にして、Pending が 0 になるのを見る'
			}
		]
	},
	mem: {
		title: '写したつもりが、写っていない',
		intro:
			'a は長さ n の配列。中を数にするか、小さな配列 [i, i] にするかを選び、b の作り方を変える。その後 b[0] を直す（数なら b[0] = 9、配列なら b[0].push(9)）。a が巻き込まれるかが図と表に出る。',
		knobs: [
			{
				k: 'n',
				label: '長さ n',
				min: 1,
				max: 32,
				step: 1,
				v: 4,
				unit: '',
				d: '配列 a の要素の数。1〜32 個。'
			},
			{
				k: 'mode',
				label: 'b の作り方',
				min: 0,
				max: 2,
				step: 1,
				v: 1,
				unit: '',
				show: [...MEM_MODES],
				d: 'b = a（同じ物に名前を足す）・[...a]（浅い写し）・structuredClone(a)（深い写し）から選ぶ。'
			},
			{
				k: 'nested',
				label: '中身',
				min: 0,
				max: 1,
				step: 1,
				v: 1,
				unit: '',
				show: ['数', '配列 [i, i]'],
				d: 'a の要素を、数にするか、小さな配列にするか。'
			}
		],
		results(v) {
			const r = memLab({ n: v.n, mode: v.mode, nested: v.nested });
			return [
				['a === b', String(r.same), 'identity'],
				['a[0] === b[0]', String(r.innerSame), 'identity'],
				['b[0] を直すと a は', r.aChanges ? '変わる' : '変わらない', 'mutate'],
				['ヒープの配列', `${r.arrays} 個`, 'heap'],
				['写した値', `${r.copied} 個`, 'copy']
			];
		},
		preds: [
			{
				q: '中身が配列・浅い写し。b[0].push(9) すると a[0] は？',
				opts: ['変わらない', '変わる'],
				ans: 1,
				why: '浅い写しは外の配列だけを作り直す。中の配列は a と b で同じ物を指している。',
				tryit: '作り方を structuredClone(a) にして「変わらない」になるのを見る'
			},
			{
				q: '中身が配列・n = 4・structuredClone(a)。ヒープの配列は全部で何個？',
				opts: ['2 個', '6 個', '10 個'],
				ans: 2,
				why: 'a 側に外 1 ＋ 中 4、b 側にも外 1 ＋ 中 4 で 10 個。深い写しは手間もメモリも倍になる。',
				tryit: 'n を 32 にして、配列の数と写した値の増え方を見る'
			}
		]
	},
	stat: {
		title: '人数・日数・母集団の形を変えて、山の幅と形を見る',
		intro:
			'窓口の待ち時間（平均 4 分）から、1 日 n 人の平均を出して積む。n を増やすと山はどれだけ細くなるか。母集団の形を変えても山になるか。95% の帯に入る日の割合も数える（模擬。同じ値なら同じ結果）。',
		knobs: [
			{
				k: 'n',
				label: '標本の大きさ n',
				min: 2,
				max: 120,
				step: 2,
				v: 30,
				unit: ' 人',
				d: '1 日に測る人数。2〜120 人。'
			},
			{
				k: 'days',
				label: '積む日',
				min: 50,
				max: 800,
				step: 50,
				v: 400,
				unit: ' 日',
				d: '標本平均を出して積む日の数。50〜800 日。'
			},
			{
				k: 'shape',
				label: '母集団の形',
				min: 0,
				max: 2,
				step: 1,
				v: 0,
				unit: '',
				show: [...SHAPES],
				d: '待ち時間の分布の形。どれも平均は 4 分。'
			}
		],
		results(v) {
			const r = statLab({ n: v.n, days: v.days, shape: v.shape });
			return [
				['標準誤差（σ/√n）', `${r.se.toFixed(2)} 分`, 'se'],
				['模擬の散らばり', `${r.sd.toFixed(2)} 分`, 'sampdist'],
				['95% の帯', `${r.lo.toFixed(2)}〜${r.hi.toFixed(2)} 分`, 'p95'],
				['帯に入った日', `${(r.inBand * 100).toFixed(1)}%`, 'p95'],
				['歪みの目安（指数の時 2/√n）', r.skew === null ? '—' : r.skew.toFixed(2), 'skew']
			];
		},
		preds: [
			{
				q: '指数のまま、n を 30 → 120 にすると、山の幅（標準誤差）は？',
				opts: ['変わらない', '半分', '4 分の 1'],
				ans: 1,
				why: '√120 は √30 の 2 倍。幅は σ/√n なので半分になる。4 分の 1 にするには 16 倍の人数が要る。',
				tryit: 'n を 120 にして、標準誤差が 0.73 → 0.37 分になるのを見る'
			},
			{
				q: '母集団を一様（0〜8 分）にして n = 30。平均の分布の形は？',
				opts: ['平らなまま', '真ん中に山ができる', '右に長い'],
				ans: 1,
				why: '中心極限定理。母集団の形によらず、n が大きいと平均の分布は正規分布に近づく。',
				tryit: '形を二山にしても、n = 30 なら山が 1 つになるのを見る'
			}
		]
	}
};
