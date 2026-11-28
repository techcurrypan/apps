import { describe, expect, it } from 'vitest';
import { checkV3 } from '../../learn/check-v3.ts';
import { JARGON } from '../terms/jargon.ts';
import { PRG_TERMS } from '../terms/prg.ts';
import { PRG_006_V3 } from './prg-006.ts';
import { V3_LESSONS, v3Of } from './index.ts';

describe('prg-006 第 3 版（見せ方の型 memory）', () => {
	it('検査 41〜48 で指摘 0', () => {
		const out: string[] = [];
		checkV3(PRG_006_V3, PRG_TERMS, JARGON, (c, w, m) => out.push(`${c} ${w} ${m}`));
		expect(out).toEqual([]);
	});
	it('10〜16 ステップ。最初は言葉をそろえる、最後はまとめ。型は memory', () => {
		const s = PRG_006_V3.steps;
		expect(s.length).toBeGreaterThanOrEqual(10);
		expect(s.length).toBeLessThanOrEqual(16);
		expect(s[0].kind).toBe('intro');
		expect(s.at(-1)?.kind).toBe('summary');
		expect(PRG_006_V3.view).toBe('memory');
	});
	it('どのステップにも動き（荷物か線）がある', () => {
		for (const st of PRG_006_V3.steps)
			expect((st.tokens?.length ?? 0) + (st.links?.length ?? 0)).toBeGreaterThan(0);
	});
	it('リストの中身は構図にある list だけに付け、構図の list は全て中身を持つ', () => {
		for (const st of PRG_006_V3.steps) {
			for (const id of Object.keys(st.lists ?? {})) {
				expect(st.layout[id], id).toBeDefined();
				expect(PRG_006_V3.objs[id]?.kind, id).toBe('list');
			}
			for (const id of Object.keys(st.layout))
				if (PRG_006_V3.objs[id]?.kind === 'list') expect(st.lists?.[id], id).toBeDefined();
		}
	});
	it('参照の矢印は変数から出る', () => {
		for (const st of PRG_006_V3.steps)
			for (const ln of st.links ?? [])
				if (ln.kind === 'ref') expect(PRG_006_V3.objs[ln.from]?.kind).toBe('var');
	});
	it('検査の対象に入り、第 3 版の画面で開ける（試す・やってみる・思い出す が mem の物）', () => {
		expect(V3_LESSONS).toContain(PRG_006_V3);
		const b = v3Of('prg-006');
		expect(b?.lab).toBe('mem');
		expect(b?.tryScene.id).toBe('mem');
		expect(b?.recall.qs.length).toBeGreaterThanOrEqual(5);
	});
});
