import { describe, expect, it } from 'vitest';
import { lessons } from '../content/lessons.ts';
import { validV2 } from '../lesson/testing/v2-fixture.ts';
import { inV2Scope } from '../lesson/v2-scope.ts';
import { changedArea, stills } from './activity.ts';
import { geoOf } from './geo.ts';
import { frameAt } from './timeline.ts';

// 1440×900 の図の絵の大きさと、指標の帯・凡例を含む図の枠の面積（look-learn.ts --layout の測り。2026-11-19）
const O = { sw: 968, sh: 401, reduced: false, insetR: 0 };
const DIA = 969 * 581;

describe('図の動きの見積もり（LS-M1・M4 をデータで）', () => {
	it('荷物が動けば変わり、何も起きなければ 0', () => {
		const l = validV2();
		const g = geoOf(l);
		const f = (t: number) => frameAt(l, g, 2, t, O);
		expect(changedArea(g, f(99999), f(99999), O)).toBe(0);
		const p = l.explain[1].motion!.find((c) => c.do.op === 'packet')!;
		expect(changedArea(g, f(p.at + 100), f(p.at + 350), O)).toBeGreaterThan(0);
	});
	it('第 2 版のどのレッスンも、入ってから 1.5 秒と 3〜6 秒の間に止まる時が無い', () => {
		const bad: string[] = [];
		for (const l of lessons.filter(inV2Scope))
			for (const s of stills(l, geoOf(l), O, DIA))
				bad.push(`${l.id} ステップ ${s.step} ${s.phase} ${s.t}ms（${s.area} px²）`);
		expect(bad).toEqual([]);
	});
});
