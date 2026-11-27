import { describe, expect, it } from 'vitest';
import { TERMS } from './index';

// explanation-standard.md 10.1・検査 43：説明は 1〜2 文・80 字以内。言葉は分野ごとに 1 か所、ID は重ならない
describe('言葉の一覧', () => {
	const all = Object.values(TERMS).flat();
	it('ID は全分野で重ならない', () => {
		expect(new Set(all.map((t) => t.id)).size).toBe(all.length);
	});
	it('説明は 80 字以内で、1〜2 文', () => {
		for (const t of all) {
			expect(t.d.length, t.id).toBeLessThanOrEqual(80);
			const n = t.d.split('。').filter((x) => x.trim()).length;
			expect(n, t.id).toBeGreaterThanOrEqual(1);
			expect(n, t.id).toBeLessThanOrEqual(2);
		}
	});
	it('当てる書き方が 1 つ以上あり、分野の名前と合う', () => {
		for (const [field, ts] of Object.entries(TERMS))
			for (const t of ts) {
				expect(t.m.length, t.id).toBeGreaterThan(0);
				expect(t.field, t.id).toBe(field);
			}
	});
	it('net：見本 net-101 の言葉をそろえるステップの言葉（send・fd・buf）がある', () => {
		const ids = TERMS.net.map((t) => t.id);
		for (const w of ['send', 'fd', 'buf', 'kernel', 'nic']) expect(ids).toContain(w);
	});
});
