// 試す の図（learn-standard.md 第 19 章：つまみの値で計算し直した図）。値だけから決まる純粋な関数（乱数なし。CLAUDE.md 第 8 章）
import type { Tone } from '../ui/scene/kit/paint.ts';
import type { k8sPlan } from './lab.ts';

export type Box = { x: number; y: number; w: number; h: number };
export type LabBar = { x: number; y: number; w: number; h: number; v: number; tone: Tone };

/** 1 往復ごとの cwnd の棒。y は棒の下の線。落ちた往復（次の cwnd が減る）は赤 */
export function tcpBars(hist: number[], box: Box): { bars: LabBar[]; max: number; lost: number } {
	const n = Math.max(1, hist.length);
	const max = Math.max(1, ...hist);
	// 幅 w の棒 n 本と隙間 0.25w の (n-1) 個で箱の幅に収める。太すぎないよう 60 まで
	const w = Math.min(60, box.w / (n + 0.25 * (n - 1)));
	let lost = 0;
	const bars = hist.map((v, i) => {
		const drop = i + 1 < hist.length && hist[i + 1] < v;
		if (drop) lost++;
		return {
			x: box.x + i * w * 1.25,
			y: box.y + box.h,
			w,
			h: (box.h * v) / max,
			v,
			tone: (drop ? 'red' : 'blue') as Tone
		};
	});
	return { bars, max, lost };
}

export type LabPod = { x: number; y: number; name: string; state: 'ready' | 'dead' | 'paper' };
/** x, y は台の中心（画面）。w・h は台の画面の幅と高さ。pw・pd は台の等角の大きさ（iso の局所の単位）。bottom は台の手前の角の y */
export type LabNode = {
	x: number;
	y: number;
	w: number;
	h: number;
	pw: number;
	pd: number;
	bottom: number;
	name: string;
	pods: LabPod[];
};

/** 等角の向き（src/lib/ui/scene/iso.ts の ISO と同じ） */
const AX = 0.894;
const AY = 0.447;
/** 台の下の名前の札の分 */
const TAG_H = 46;
/** Pending の列の高さ */
const PEND_H = 80;

/** ノードの台と Pod。Pod は 1 台目から順に、空きのある台へ 1 つずつ配る。置けない Pod は Pending（紙だけ）。
 * 台は 2 列までの格子に並べ（3〜4 台は 2 段）、等角の台の画面の幅 W・高さ W/2 がマスに収まる一番大きい物にする */
export function k8sFigure(
	plan: ReturnType<typeof k8sPlan>,
	nodes: number,
	box: Box
): { nodes: LabNode[]; pending: LabPod[]; podScale: number } {
	const gap = 28;
	const per: number[] = Array.from({ length: nodes }, () => 0);
	const owner: number[] = [];
	for (let i = 0, n = 0; i < plan.sched; n = (n + 1) % nodes) {
		if (per[n] < plan.cap) {
			per[n]++;
			owner.push(n);
			i++;
		}
	}
	const gcols = Math.min(2, nodes);
	const grows = Math.ceil(nodes / gcols);
	const slotW = (box.w - gap * (gcols - 1)) / gcols;
	const rowH = (box.h - (plan.pend > 0 ? PEND_H : 0)) / grows;
	const W = Math.min(slotW * 0.96, (rowH - TAG_H) * 2);
	const H = W / 2;
	const sum = W / AX;
	const pw = sum * 0.55;
	const pd = sum * 0.45;
	const most = Math.max(1, ...per);
	const cols = Math.min(3, most);
	const rows = Math.ceil(most / cols);
	// 台の菱形の中の長方形（画面で幅 0.6 倍・高さ 0.6 倍）を格子に分け、Pod を 1 マスに 1 つ。Pod の幅は縮尺 1 で約 110px
	const cw = (W * 0.6) / cols;
	const ch = (H * 0.6) / rows;
	const podScale = Math.min(0.8, (cw * 0.72) / 110, (ch * 1.3) / 110);
	const out: LabNode[] = Array.from({ length: nodes }, (_, i) => {
		const c = i % gcols;
		const r = Math.floor(i / gcols);
		const y = box.y + r * rowH + H / 2;
		return {
			x: box.x + slotW / 2 + c * (slotW + gap),
			y,
			w: W,
			h: H,
			pw,
			pd,
			bottom: y + H / 2,
			name: `node-${i + 1}`,
			pods: []
		};
	});
	const state = plan.oom ? 'dead' : 'ready';
	owner.forEach((n, i) => {
		const node = out[n];
		const k = node.pods.length;
		node.pods.push({
			x: node.x + ((k % cols) - (cols - 1) / 2) * cw,
			y: node.y + (Math.floor(k / cols) - (rows - 1) / 2) * ch,
			name: `web-${i + 1}`,
			state
		});
	});
	const pending: LabPod[] = Array.from({ length: plan.pend }, (_, i) => ({
		x: box.x + 300 + i * 100,
		y: box.y + box.h - 24,
		name: `web-${plan.sched + i + 1}`,
		state: 'paper'
	}));
	return { nodes: out, pending, podScale };
}

const LOOP = 6;
const GROW = 0.9;
/** 値を変えてからの時刻 t 秒で、i 本目がどこまで育ったか（0〜1）。6 秒ごとに最初から繰り返す（LS3-M1） */
export function growAt(t: number, i: number): number {
	const local = (t % LOOP) - Math.min(0.6, 0.03 * i);
	return Math.max(0, Math.min(1, local / GROW));
}
