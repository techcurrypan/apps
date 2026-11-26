import { describe, expect, it } from 'vitest';
import { ISO, cylinder, hexPts, localProj, prism, rectPts, rrectPts } from './iso';

describe('写し方（LS3-K1：2:1 の等角）', () => {
	it('横の軸は右下と左下へ 26.57°', () => {
		expect((Math.atan2(ISO.ay, ISO.ax) * 180) / Math.PI).toBeCloseTo(26.57, 1);
		const p = localProj(100, 200);
		expect(p.at(0, 0, 0)).toEqual([100, 200]);
		const [x, y] = p.at(10, 0, 0);
		expect(x).toBeGreaterThan(100);
		expect(y).toBeGreaterThan(200);
		const [x2, y2] = p.at(0, 10, 0);
		expect(x2).toBeLessThan(100);
		expect(y2).toBeGreaterThan(200);
	});
	it('高さ z は画面の上へ、縮尺 s を掛ける', () => {
		expect(localProj(0, 0, 2).at(0, 0, 10)).toEqual([0, -20]);
	});
});

describe('床の形', () => {
	it('角の丸い四角は角ごとに n + 1 点。半径は辺の半分までに縮める', () => {
		const pts = rrectPts(0, 0, 100, 60, 14);
		expect(pts).toHaveLength(24);
		for (const [x, y] of pts) {
			expect(x).toBeGreaterThanOrEqual(-1e-9);
			expect(x).toBeLessThanOrEqual(100 + 1e-9);
			expect(y).toBeGreaterThanOrEqual(-1e-9);
			expect(y).toBeLessThanOrEqual(60 + 1e-9);
		}
		const tight = rrectPts(0, 0, 20, 20, 50);
		expect(Math.max(...tight.map((p) => p[0]))).toBeCloseTo(20);
	});
	it('六角は 6 点で、中心からの距離が全て r', () => {
		const h = hexPts(30);
		expect(h).toHaveLength(6);
		for (const [x, y] of h) expect(Math.hypot(x, y)).toBeCloseTo(30);
	});
});

describe('立体の見える面（LS3-K2：3 段の明るさ・外の輪郭）', () => {
	const P = localProj(0, 0);
	it('四角の柱は手前の 2 面（左と右）が見え、上の面がある', () => {
		const g = prism(rectPts(-50, -40, 100, 80), 0, 30, P);
		expect(g.sides.map((s) => s.shade).sort()).toEqual(['left', 'right']);
		expect(g.top).toHaveLength(4);
		for (const s of g.sides) expect(s.pts).toHaveLength(4);
	});
	it('角の丸い柱は、見える横の面を明るさごとに 3 枚（左・正面・右）にまとめる', () => {
		const g = prism(rrectPts(-60, -40, 120, 80, 20), 0, 30, P);
		expect(g.sides.map((s) => s.shade).sort()).toEqual(['front', 'left', 'right']);
		const total = g.sides.reduce((a, s) => a + s.pts.length, 0);
		expect(total).toBeGreaterThan(12);
	});
	it('外の輪郭は、見える横の面の上の端 → 下の線 → 反対の上の端の順の 1 本', () => {
		const pts = rectPts(-50, -40, 100, 80);
		const g = prism(pts, 0, 30, P);
		// 見える辺 2 本 → 上・下・下・下・上 の 5 点
		expect(g.outline).toHaveLength(5);
		expect(g.outline[0][1]).toBeLessThan(g.outline[1][1]);
		expect(g.outline[4][1]).toBeLessThan(g.outline[3][1]);
	});
	it('高さ 0 の物は横の面が無い', () => {
		expect(prism(rectPts(0, 0, 10, 10), 0, 0, P).sides).toHaveLength(0);
	});
	it('影は床の形を右下へずらした物', () => {
		const g = prism(rectPts(-10, -10, 20, 20), 0, 10, P);
		expect(g.shadow).toHaveLength(4);
		expect(g.shadow[0][0]).toBeCloseTo(P.at(-10, -10)[0] + 7);
	});
});

describe('円柱', () => {
	it('上の楕円は高さだけ上にあり、横の半径は縦の 2 倍', () => {
		const c = cylinder(100, 100, 40, 50);
		expect(c.rx / c.ry).toBeCloseTo(2, 2);
		expect(c.topY).toBe(50);
		expect(c.body.startsWith('M')).toBe(true);
	});
});
