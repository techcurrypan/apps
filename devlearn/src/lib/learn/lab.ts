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
};
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

export const LABS: Record<string, Lab> = {
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
	}
};
