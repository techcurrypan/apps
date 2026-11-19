import { describe, expect, it } from 'vitest';
import { lessons } from '../content/lessons.ts';
import { validV2 } from '../lesson/testing/v2-fixture.ts';
import { inV2Scope } from '../lesson/v2-scope.ts';
import { changedArea, stills } from './activity.ts';
import { geoOf } from './geo.ts';
import { camTrack, endOf, frameAt } from './timeline.ts';
import { rectOfId } from './geo.ts';

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
	it('続く流れの触る物は、合図が終わった後の視点に入っている（留まる間の流れが図の外にならない。LS-M4・D1）', () => {
		const bad: string[] = [];
		for (const l of lessons.filter(inV2Scope)) {
			const g = geoOf(l);
			l.explain.forEach((st, i) => {
				if (!Array.isArray(st.loop)) return;
				const v = frameAt(l, g, i + 1, endOf(st) + 1500, O).view;
				for (const c of st.loop) {
					const d = c.do;
					const ids =
						d.op === 'packet' ? [d.a, d.b] : 'id' in d ? [d.id] : 'queue' in d ? [d.queue] : [];
					for (const id of ids) {
						const r = rectOfId(g, id);
						if (r && !(r.x < v.x + v.w && r.x + r.w > v.x && r.y < v.y + v.h && r.y + r.h > v.y))
							bad.push(`${l.id} ステップ ${i + 1} ${d.op} ${id}`);
					}
				}
			});
		}
		expect(bad).toEqual([]);
	});
	it('図の外の物への寄り直しは、倍率を変えずに滑らせる（入るとき）', () => {
		const l = lessons.find((x) => x.id === 'net-101')!;
		const g = geoOf(l);
		// ステップ 3：書いた寄りは 1 つ。荷物と札を追って何度か寄り直すが、倍率は同じ
		const tr = camTrack(l, g, 3, O);
		expect(tr.length).toBeGreaterThan(1);
		expect(new Set(tr.map((k) => k.view.scale.toFixed(3))).size).toBe(1);
	});
});
