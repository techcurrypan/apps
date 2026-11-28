import { describe, expect, it } from 'vitest';
import { checkV3 } from '../../learn/check-v3.ts';
import { JARGON } from '../terms/jargon.ts';
import { STA_TERMS } from '../terms/sta.ts';
import { STA_019_V3 } from './sta-019.ts';
import { V3_LESSONS, v3Of } from './index.ts';

describe('sta-019 第 3 版（見せ方の型 chart）', () => {
	it('検査 41〜48 で指摘 0', () => {
		const out: string[] = [];
		checkV3(STA_019_V3, STA_TERMS, JARGON, (c, w, m) => out.push(`${c} ${w} ${m}`));
		expect(out).toEqual([]);
	});
	it('10〜16 ステップ。最初は言葉をそろえる、最後はまとめ。型は memory', () => {
		const s = STA_019_V3.steps;
		expect(s.length).toBeGreaterThanOrEqual(10);
		expect(s.length).toBeLessThanOrEqual(16);
		expect(s[0].kind).toBe('intro');
		expect(s.at(-1)?.kind).toBe('summary');
		expect(STA_019_V3.view).toBe('chart');
	});
	it('どのステップにも動き（荷物か線）がある', () => {
		for (const st of STA_019_V3.steps)
			expect((st.tokens?.length ?? 0) + (st.links?.length ?? 0)).toBeGreaterThan(0);
	});
	it('段の中身は構図にある panel だけに付け、構図の panel は全て段の名前を持つ', () => {
		for (const st of STA_019_V3.steps)
			for (const id of Object.keys(st.charts ?? {})) {
				expect(st.layout[id], id).toBeDefined();
				expect(STA_019_V3.objs[id]?.kind, id).toBe('panel');
			}
	});
	it('検査の対象に入り、第 3 版の画面で開ける（試す・やってみる・思い出す が mem の物）', () => {
		expect(V3_LESSONS).toContain(STA_019_V3);
		const b = v3Of('sta-019');
		expect(b?.lab).toBe('stat');
		expect(b?.tryScene.id).toBe('stat');
		expect(b?.recall.qs.length).toBeGreaterThanOrEqual(5);
	});
});
