// 検査 40：TCP の 15 項目（curriculum-standard.md 6.2）を、表のステップが本当に教えている。
import { describe, expect, it } from 'vitest';
import { TCP_DEPTH } from './depth-map.ts';
import { lessons } from './lessons.ts';

describe('TCP の深さの表（検査 40）', () => {
	it('15 項目が全てある', () => {
		expect(TCP_DEPTH.map((x) => x.no)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
	});
	for (const item of TCP_DEPTH)
		it(`${item.no}. ${item.what}`, () => {
			const l = lessons.find((x) => x.id === item.lesson);
			expect(l, item.lesson).toBeDefined();
			const text = item.steps
				.map((n) => {
					const s = l!.explain[n - 1];
					expect(s, `${item.lesson} ステップ ${n}`).toBeDefined();
					return [
						...(s.depth ? [...s.depth.intro, ...s.depth.work, ...s.depth.deep] : []),
						...(s.impl ?? []).map((x) => x.name),
						...(s.layers ?? []).flatMap((y) => y.boxes.map((b) => b.impl))
					].join('\n');
				})
				.join('\n');
			for (const m of item.must) expect(text, `「${m}」`).toContain(m);
		});
});
