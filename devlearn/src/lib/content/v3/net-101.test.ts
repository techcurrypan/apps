import { describe, expect, it } from 'vitest';
import { checkV3 } from '../../learn/check-v3.ts';
import { JARGON } from '../terms/jargon.ts';
import { NET_TERMS } from '../terms/net.ts';
import { NET_101_V3 } from './net-101.ts';

describe('net-101 第 3 版（見本 1）', () => {
	it('検査 41〜48 で指摘 0', () => {
		const out: string[] = [];
		checkV3(NET_101_V3, NET_TERMS, JARGON, (c, w, m) => out.push(`${c} ${w} ${m}`));
		expect(out).toEqual([]);
	});
	it('10〜16 ステップ。最初は言葉をそろえる、最後はまとめ', () => {
		const s = NET_101_V3.steps;
		expect(s.length).toBeGreaterThanOrEqual(10);
		expect(s.length).toBeLessThanOrEqual(16);
		expect(s[0].kind).toBe('intro');
		expect(s.at(-1)?.kind).toBe('summary');
	});
	it('どのステップにも動き（荷物か線）がある', () => {
		for (const st of NET_101_V3.steps)
			expect((st.tokens?.length ?? 0) + (st.links?.length ?? 0)).toBeGreaterThan(0);
	});
});
