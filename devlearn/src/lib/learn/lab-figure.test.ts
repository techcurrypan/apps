import { describe, expect, it } from 'vitest';
import { growAt, k8sFigure, tcpBars } from './lab-figure';
import { k8sPlan, tcpSim } from './lab';

// learn-standard.md 第 19 章「試す」の図：つまみの値で計算し直した図。値だけから決まる（乱数なし）
const BOX = { x: 100, y: 100, w: 800, h: 400 };

describe('TCP の図：1 往復ごとの cwnd の棒（tcpBars）', () => {
	it('往復ごとに 1 本。一番大きい棒が箱の高さ、他は比で低い。全て箱の中', () => {
		const hist = tcpSim({ rtt: 30, loss: 0, icw: 10 }).hist;
		const b = tcpBars(hist, BOX);
		expect(b.bars).toHaveLength(7);
		expect(Math.max(...b.bars.map((x) => x.h))).toBeCloseTo(BOX.h);
		expect(b.bars[0].h).toBeCloseTo((BOX.h * 10) / 640);
		for (const x of b.bars) {
			expect(x.x).toBeGreaterThanOrEqual(BOX.x - 1e-6);
			expect(x.x + x.w).toBeLessThanOrEqual(BOX.x + BOX.w + 1e-6);
			expect(x.y).toBe(BOX.y + BOX.h);
		}
	});
	it('落ちた往復（次の cwnd が減る）の棒は赤、他は青', () => {
		const b = tcpBars([10, 20, 14, 15], BOX);
		expect(b.bars.map((x) => x.tone)).toEqual(['blue', 'red', 'blue', 'blue']);
		expect(b.lost).toBe(1);
	});
	it('往復が多い時は棒を細くして全て収め、隙間は棒の幅の 0.25 倍', () => {
		const hist = Array.from({ length: 120 }, (_, i) => i + 1);
		const b = tcpBars(hist, BOX);
		expect(b.bars).toHaveLength(120);
		const last = b.bars[119];
		expect(last.x + last.w).toBeLessThanOrEqual(BOX.x + BOX.w + 1e-6);
		expect(b.bars[1].x - b.bars[0].x - b.bars[0].w).toBeCloseTo(b.bars[0].w * 0.25);
	});
	it('同じ値から同じ図', () => {
		expect(tcpBars([3, 6, 4], BOX)).toEqual(tcpBars([3, 6, 4], BOX));
	});
});

describe('Kubernetes の図：ノードの台と Pod（k8sFigure）', () => {
	it('台はノードの数。Pod は順に空きの多い台へ（1 台目から）。置けない Pod は Pending', () => {
		const p = k8sPlan({ rep: 8, lim: 1024, peak: 300, nodes: 3 });
		const f = k8sFigure(p, 3, BOX);
		expect(f.nodes).toHaveLength(3);
		expect(f.nodes.map((n) => n.pods.length)).toEqual([2, 2, 2]);
		expect(f.pending).toHaveLength(2);
		expect(f.nodes[0].pods[0].state).toBe('ready');
		expect(f.pending.every((x) => x.state === 'paper')).toBe(true);
	});
	it('山が上限を超えると、置けた Pod は全て落ちた（赤）', () => {
		const p = k8sPlan({ rep: 4, lim: 256, peak: 300, nodes: 3 });
		const f = k8sFigure(p, 3, BOX);
		expect(f.nodes.flatMap((n) => n.pods).every((x) => x.state === 'dead')).toBe(true);
		expect(f.nodes.map((n) => n.pods.length)).toEqual([2, 1, 1]);
	});
	it('Pod の名前は web-1 から。台（と下の札）は箱の中で、台どうしは重ならない', () => {
		for (const nodes of [2, 3, 4]) {
			const p = k8sPlan({ rep: 12, lim: 512, peak: 100, nodes });
			const f = k8sFigure(p, nodes, BOX);
			expect(f.nodes[0].pods[0].name).toBe('web-1');
			const rect = (n: (typeof f.nodes)[0]) => [
				n.x - n.w / 2,
				n.y - n.h / 2,
				n.x + n.w / 2,
				n.bottom + 40
			];
			for (const n of f.nodes) {
				const [l, t, r, b] = rect(n);
				expect(l).toBeGreaterThanOrEqual(BOX.x - 1e-6);
				expect(r).toBeLessThanOrEqual(BOX.x + BOX.w + 1e-6);
				expect(t).toBeGreaterThanOrEqual(BOX.y - 1e-6);
				expect(b).toBeLessThanOrEqual(BOX.y + BOX.h + 1e-6);
			}
			for (let i = 0; i < f.nodes.length; i++)
				for (let j = i + 1; j < f.nodes.length; j++) {
					const [l1, t1, r1, b1] = rect(f.nodes[i]);
					const [l2, t2, r2, b2] = rect(f.nodes[j]);
					expect(r1 <= l2 || r2 <= l1 || b1 <= t2 || b2 <= t1).toBe(true);
				}
		}
	});
});

describe('育つ動き（growAt）：値を変えると 0.9 秒で育ち、6 秒ごとに繰り返す', () => {
	it('0 で 0、0.9 秒で 1、6 秒でまた 0 から', () => {
		expect(growAt(0, 0)).toBe(0);
		expect(growAt(0.9, 0)).toBe(1);
		expect(growAt(3, 0)).toBe(1);
		expect(growAt(6, 0)).toBe(0);
	});
	it('後ろの棒ほど遅れて育つ（i 本目は 0.03×i 秒遅れ、遅れは 0.6 秒まで）', () => {
		expect(growAt(0.3, 10)).toBe(0);
		expect(growAt(0.3 + 0.45, 10)).toBeCloseTo(0.5);
		expect(growAt(1.5, 100)).toBe(1);
	});
});

describe('Kubernetes の図：Pod どうしは重ならない（k8sFigure）', () => {
	it.each([
		[12, 128, 2],
		[12, 128, 4],
		[8, 256, 3]
	])(
		'replicas %i・上限 %i・%i 台で、同じ台の Pod の中心の間は Pod の幅（110 × 縮尺）以上',
		(rep, lim, nodes) => {
			const f = k8sFigure(k8sPlan({ rep, lim, peak: 100, nodes }), nodes, BOX);
			const pw = 110 * f.podScale;
			for (const n of f.nodes)
				for (let i = 0; i < n.pods.length; i++)
					for (let j = i + 1; j < n.pods.length; j++) {
						const a = n.pods[i];
						const b = n.pods[j];
						const sameRow = Math.abs(a.y - b.y) < 1;
						if (sameRow) expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(pw);
						else expect(Math.abs(a.y - b.y)).toBeGreaterThanOrEqual(pw * 0.7);
					}
		}
	);
});
