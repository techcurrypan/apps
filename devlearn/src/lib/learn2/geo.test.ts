import { describe, expect, it } from 'vitest';
import { validV2 } from '../lesson/testing/v2-fixture.ts';
import { MIN_SCALE, fitFirst, fitView, geoOf, trim } from './geo.ts';

describe('第 2 版の図の置き方', () => {
	const g = geoOf(validV2());
	it('機械は appear の格子の位置。線は機械の縁で切る', () => {
		expect(g.nodes.get('a')?.c).toEqual({ x: 160, y: 140 });
		expect(g.nodes.get('b')?.c.x).toBeGreaterThan(g.nodes.get('a')!.c.x);
		const l = g.links.find((x) => x.a === 'a' && x.b === 'b');
		expect(l).toBeDefined();
		expect(l!.from.x).toBeGreaterThan(160);
		expect(l!.to.x).toBeLessThan(g.nodes.get('b')!.c.x);
	});
	it('層の図は地図の下に置き、同じ箱は全てのステップで同じ位置', () => {
		const wx = g.boxes.get('wx');
		const tx = g.boxes.get('tx');
		expect(wx).toBeDefined();
		expect(wx!.r.y).toBeGreaterThan(g.mapBounds.y + g.mapBounds.h);
		expect(tx!.r.x).toBeGreaterThan(wx!.r.x + wx!.r.w);
		expect(g.queues.get('wq')?.box).toBe('wx');
	});
	it('荷物の通る道：packet の合図の組ごとに 1 本（箱どうしも）', () => {
		expect(g.edges.some((e) => e.a === 'a' && e.b === 'b')).toBe(true);
	});
	it('寄り：入れる物を余白 24px で入れ、倍率は 0.8〜1.6', () => {
		const v = fitView([{ x: 0, y: 0, w: 400, h: 200 }], 1000, 600);
		// 400×200 を 1000×600 に：倍率は横で決まり 1.6 で頭打ち
		expect(v.scale).toBeCloseTo(1.6);
		const big = fitView([{ x: 0, y: 0, w: 4000, h: 2000 }], 1000, 600);
		expect(big.scale).toBe(0.8);
		const mid = fitView([{ x: 0, y: 0, w: 1000, h: 500 }], 1000, 600);
		// 余白 24px を引いた 952 に 1000 を入れる
		expect(mid.scale).toBeCloseTo(952 / 1000, 2);
		expect(mid.x + mid.w / 2).toBeCloseTo(500);
	});
	it('線分を箱の縁で切る', () => {
		const p = trim({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: -10, y: -10, w: 20, h: 20 });
		expect(p.x).toBeCloseTo(10);
		expect(p.y).toBeCloseTo(0);
	});
	it('寄せる物が 0.8 倍でも入らない時は、前から入るだけを入れ、入れた物は切らない（LS-D1。2026-11-19）', () => {
		const a = { x: 0, y: 0, w: 400, h: 200 };
		const b = { x: 300, y: 100, w: 300, h: 150 };
		const far = { x: 0, y: 3000, w: 400, h: 200 };
		const v = fitFirst([a, b, far], 900, 450);
		expect(v.scale).toBeGreaterThanOrEqual(MIN_SCALE);
		for (const r of [a, b]) {
			expect(r.x).toBeGreaterThanOrEqual(v.x);
			expect(r.y).toBeGreaterThanOrEqual(v.y);
			expect(r.x + r.w).toBeLessThanOrEqual(v.x + v.w);
			expect(r.y + r.h).toBeLessThanOrEqual(v.y + v.h);
		}
		// 全部入る時は fitView と同じ
		expect(fitFirst([a, b], 900, 450)).toEqual(fitView([a, b], 900, 450));
	});
});

describe('区画（LS-D6・D7）', () => {
	const cut = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
		a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
	it('第 2 版の全レッスンで、区画どうしが重ならず、区画の名前は外の機械と重ならない', async () => {
		const { lessons } = await import('../content/lessons.ts');
		const { isV2 } = await import('../lesson/types.ts');
		const bad: string[] = [];
		for (const l of lessons.filter((x) => isV2(x))) {
			const g = geoOf(l);
			g.zones.forEach((z, i) => {
				for (const o of g.zones.slice(i + 1))
					if (cut(z.r, o.r)) bad.push(`${l.id} ${z.label}×${o.label}`);
				for (const n of g.nodes.values()) {
					// 機械の絵と名前（状態の札の空けておく所は除く）。中の機械とも外の機械とも重ならない
					const body = {
						x: n.r.x,
						y: n.c.y - 50,
						w: 2 * (n.c.x - n.r.x),
						h: n.r.y + n.r.h - (n.c.y - 50)
					};
					if (cut(z.lr, body)) bad.push(`${l.id} ${z.label} の名前×${n.id}`);
				}
			});
		}
		expect(bad).toEqual([]);
	});
});
