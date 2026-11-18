import { describe, expect, it } from 'vitest';
import { lessons } from '../content/lessons.ts';
import { net007 } from '../content/lessons/net-007.ts';
import { fit, pan, percent, zoomAt } from './camera.ts';
import { geometryOf, overlapCount } from './geometry.ts';
import { beatsOf } from './model.ts';
import { isV2 } from '../lesson/types.ts';

describe('図の置き方', () => {
	it('net-007：全ての線に名前と向きがあり、文字・線・番号の丸が重ならない（LS-D4〜D6）', () => {
		const g = geometryOf(net007);
		expect(g.links.length).toBeGreaterThan(0);
		for (const l of g.links) {
			expect(l.tag.w).toBeGreaterThan(0);
			expect(['ab', 'ba', 'both']).toContain(l.dir);
		}
		expect(overlapCount(g)).toEqual({ text: 0, lineText: 0, marks: 0 });
	});
	it('番号の丸は出来事の数だけある', () => {
		expect(geometryOf(net007).marks.length).toBe(beatsOf(net007).length - 1);
	});
	// 第 2 版のレッスンは LearnV2（learn2/geo.ts）で描くので、第 1 版の置き方は当てない
	it('第 1 版の全レッスンで、番号の丸どうしは重ならず、全ての線に名前がある', () => {
		for (const l of lessons.filter((x) => !isV2(x))) {
			const g = geometryOf(l);
			expect(overlapCount(g).marks, l.id).toBe(0);
			for (const x of g.links) expect(x.tag.w, l.id).toBeGreaterThan(16);
		}
	});
});

describe('視点', () => {
	const all = { x: 0, y: 0, w: 1000, h: 500 };
	it('縦横比に合わせて枠を広げる', () => {
		expect(fit(all, 1)).toEqual({ x: 0, y: -250, w: 1000, h: 1000 });
		expect(fit(all, 4)).toEqual({ x: -500, y: 0, w: 2000, h: 500 });
	});
	it('指の位置を中心に寄る：その点は画面の同じ所に残る', () => {
		const v = zoomAt(all, 2, { x: 250, y: 100 });
		expect(v.w).toBe(500);
		expect((250 - v.x) / v.w).toBeCloseTo(250 / 1000);
		expect(percent(v, all)).toBe(200);
	});
	it('ドラッグで動かす', () => {
		expect(pan(all, 100, 0, 500)).toMatchObject({ x: -200, y: 0 });
	});
});
