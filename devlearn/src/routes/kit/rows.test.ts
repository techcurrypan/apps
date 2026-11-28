import { describe, expect, it } from 'vitest';
import { FOOT } from '#lib/ui/scene/kit/paint.ts';
import { ISO } from '#lib/ui/scene/iso.ts';
import { ROW1, ROW_HL, padHalf } from './rows.ts';

// 部品集の頁で、同じ段の隣どうしの台（物の下の床）が重ならない（26 回目の判定 A・B）
function gaps(row: { kind: keyof typeof FOOT; x: number; s: number }[]) {
	return row
		.slice(1)
		.map((r, i) => r.x - padHalf(r.kind, r.s) - (row[i].x + padHalf(row[i].kind, row[i].s)));
}

describe('部品集の段の並べ方', () => {
	it('台の横の半幅は (w + d + 92)·ax·s / 2', () => {
		expect(padHalf('func', 1)).toBeCloseTo(((124 + 92 + 92) * ISO.ax) / 2);
	});
	it('1 段目の台どうしは 20px 以上離れ、図の枠（-70〜1170）に収まる', () => {
		for (const g of gaps(ROW1)) expect(g).toBeGreaterThanOrEqual(20);
		expect(ROW1[0].x - padHalf(ROW1[0].kind, ROW1[0].s)).toBeGreaterThanOrEqual(-70);
		const l = ROW1[ROW1.length - 1];
		expect(l.x + padHalf(l.kind, l.s)).toBeLessThanOrEqual(1170);
	});
	it('強めた func の段の台どうしも 20px 以上離れる', () => {
		for (const g of gaps(ROW_HL)) expect(g).toBeGreaterThanOrEqual(20);
	});
});
