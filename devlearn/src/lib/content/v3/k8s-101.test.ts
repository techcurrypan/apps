import { describe, expect, it } from 'vitest';
import { checkV3 } from '../../learn/check-v3.ts';
import { JARGON } from '../terms/jargon.ts';
import { K8S_TERMS } from '../terms/k8s.ts';
import { K8S_101_V3 } from './k8s-101.ts';
import { v3Of } from './index.ts';

describe('k8s-101 第 3 版（見本 2）', () => {
	it('検査 41〜48 で指摘 0', () => {
		const out: string[] = [];
		checkV3(K8S_101_V3, K8S_TERMS, JARGON, (c, w, m) => out.push(`${c} ${w} ${m}`));
		expect(out).toEqual([]);
	});
	it('10〜16 ステップ。最初は言葉をそろえる、最後はまとめ', () => {
		const s = K8S_101_V3.steps;
		expect(s.length).toBeGreaterThanOrEqual(10);
		expect(s.length).toBeLessThanOrEqual(16);
		expect(s[0].kind).toBe('intro');
		expect(s.at(-1)?.kind).toBe('summary');
	});
	it('どのステップにも動き（荷物か線）がある', () => {
		for (const st of K8S_101_V3.steps)
			expect((st.tokens?.length ?? 0) + (st.links?.length ?? 0)).toBeGreaterThan(0);
	});
	it('Pod の状態は構図にある Pod だけに付ける', () => {
		for (const st of K8S_101_V3.steps)
			for (const id of Object.keys(st.pods ?? {})) {
				expect(st.layout[id], id).toBeDefined();
				expect(K8S_101_V3.objs[id]?.kind, id).toBe('pod');
			}
	});
	it('第 3 版の画面で開ける（試す・やってみる・思い出す が k8s の物）', () => {
		const b = v3Of('k8s-101');
		expect(b?.lab).toBe('k8s');
		expect(b?.tryScene.id).toBe('k8s');
		expect(b?.recall.qs.length).toBeGreaterThanOrEqual(5);
	});
});
