import { describe, expect, it } from 'vitest';
import { validV2 } from '../lesson/testing/v2-fixture.ts';
import type { Lesson } from '../lesson/types.ts';
import { geoOf } from './geo.ts';
import { endOf, frameAt, numberIn } from './timeline.ts';

const SW = 1000;
const SH = 600;
const at = (l: Lesson, s: number, t: number, reduced = false) =>
	frameAt(l, geoOf(l), s, t, { sw: SW, sh: SH, reduced });

describe('動きの時間軸（どの時点もステップと経過時間から描ける。CLAUDE.md 第 8 章）', () => {
	it('同じステップ・同じ時間なら同じ絵（純粋な関数）', () => {
		const l = validV2();
		expect(JSON.stringify(at(l, 2, 850))).toBe(JSON.stringify(at(l, 2, 850)));
	});
	it('寄り：camera の合図の間に、前のステップの視点から滑らかに動く（LS-M2・M6）', () => {
		const l = validV2();
		l.explain[1].motion![0] = { at: 0, dur: 800, para: 0, do: { op: 'camera', fit: ['b'] } };
		const a = at(l, 2, 0).view;
		const m = at(l, 2, 400).view;
		const b = at(l, 2, 800).view;
		expect(a.x).not.toBeCloseTo(b.x);
		expect(m.x).toBeGreaterThan(Math.min(a.x, b.x));
		expect(m.x).toBeLessThan(Math.max(a.x, b.x));
		// 前のステップの最後の視点から始まる
		expect(a.x).toBeCloseTo(at(l, 1, 99999).view.x);
	});
	it('登場：最初のステップの機械は 0.6 倍から大きくなりながら、ずらして現れる', () => {
		const l = validV2();
		const f0 = at(l, 1, 0);
		expect(f0.nodes.find((n) => n.id === 'a')?.opacity ?? 0).toBeLessThan(0.1);
		const mid = at(l, 1, 700);
		const a = mid.nodes.find((n) => n.id === 'a')!;
		const b = mid.nodes.find((n) => n.id === 'b')!;
		expect(a.scale).toBeGreaterThan(0.6);
		expect(b.scale).toBeLessThanOrEqual(a.scale);
		const end = at(l, 1, 5000);
		expect(end.nodes.every((n) => n.opacity === 1 && n.scale === 1)).toBe(true);
	});
	it('荷物：線に沿って進み、途中の位置を連続で通る（LS-M8）', () => {
		const l = validV2();
		const ps = [850, 950, 1050, 1150, 1250, 1350, 1450, 1550, 1650].map(
			(t) => at(l, 2, t).packets.find((p) => p.label === 'skb' && p.state === 'go')?.p ?? -1
		);
		expect(ps.every((p) => p > 0 && p < 1)).toBe(true);
		for (let i = 1; i < ps.length; i++) {
			expect(ps[i]).toBeGreaterThan(ps[i - 1]);
			expect(ps[i] - ps[i - 1]).toBeLessThan(0.2);
		}
	});
	it('落ちる荷物は途中で線を離れて落ち、消える（LS-M11）', () => {
		const l = validV2();
		const d = l.explain[4].motion!.find((c) => c.do.op === 'packet' && c.do.drop)!;
		const early = at(l, 5, d.at + d.dur * 0.3).packets.find(
			(p) => p.state === 'go' || p.state === 'drop'
		);
		const late = at(l, 5, d.at + d.dur * 0.9).packets.find((p) => p.state === 'drop');
		expect(early).toBeDefined();
		expect(late?.fall ?? 0).toBeGreaterThan(0);
	});
	it('数え上げ：途中の値を 3 つ以上通る（LS-M9）', () => {
		const l = validV2();
		l.explain[2].metrics = { ...l.explain[2].metrics, q: '30 個' };
		l.explain[2].motion![3] = {
			at: 1700,
			dur: 600,
			para: 1,
			do: { op: 'count', metric: 'q', to: '30 個' }
		};
		const seen = new Set<string>();
		for (let t = 1700; t <= 2300; t += 50)
			seen.add(at(l, 3, t).metrics.find((m) => m.key === 'q')!.text);
		expect(seen.size).toBeGreaterThanOrEqual(5);
		expect(at(l, 3, 2400).metrics.find((m) => m.key === 'q')!.text).toBe('30 個');
	});
	it('数の読み書き', () => {
		expect(numberIn('cwnd 10')).toEqual({ n: 10, dec: 0 });
		expect(numberIn('1.25 ms')).toEqual({ n: 1.25, dec: 2 });
		expect(numberIn('なし')).toBeNull();
	});
	it('続く流れ：合図が終わった後も loop が繰り返し流れる（LS-M4）', () => {
		const l = validV2();
		const e = endOf(l.explain[1]);
		const t1 = at(l, 2, e + 3000).packets.length + at(l, 2, e + 3300).packets.length;
		expect(t1).toBeGreaterThan(0);
		const p1 = at(l, 2, e + 3100).packets[0]?.p;
		const p2 = at(l, 2, e + 3200).packets[0]?.p;
		expect(p1).not.toBe(p2);
	});
	it('段落：結び付いた合図が始まると現れ、その間は強調される（LS-M5）', () => {
		const l = validV2();
		expect(at(l, 2, 100).para.shown).toEqual([0]);
		expect(at(l, 2, 100).para.active).toBe(0);
		expect(at(l, 2, 1000).para.active).toBe(1);
		expect(at(l, 2, 1000).para.shown).toEqual([0, 1]);
	});
	it('キュー：覗くと先頭が持ち上がり、移ると送信キューから再送キューへ動く（LS-M14）', () => {
		const l = validV2();
		const peek = at(l, 4, 2650).items.find((i) => i.id === 'skb1')!;
		expect(peek.lift).toBeGreaterThan(0);
		const before = at(l, 4, 2990).items.find((i) => i.id === 'skb1')!;
		const mid = at(l, 4, 3300).items.find((i) => i.id === 'skb1')!;
		const after = at(l, 4, 3700).items.find((i) => i.id === 'skb1')!;
		expect(before.queue).toBe('wq');
		expect(after.queue).toBe('rtx');
		expect(mid.x).toBeGreaterThan(before.x);
		expect(mid.x).toBeLessThan(after.x);
		expect(at(l, 4, 3700).queues.find((q) => q.id === 'rtx')!.count).toBe(1);
	});
	it('状態の札：合図で変わり、ステップの後は badges の値', () => {
		const l = validV2();
		l.explain[1].motion!.push({
			at: 500,
			dur: 400,
			para: 0,
			do: { op: 'badge', id: 'b', text: 'SYN_RECV', tone: 'warn' }
		});
		expect(at(l, 2, 400).badges.find((b) => b.id === 'b')?.text).not.toBe('SYN_RECV');
		const mid = at(l, 2, 600).badges.find((b) => b.id === 'b')!;
		expect(mid.text).toBe('SYN_RECV');
		expect(mid.pulse).toBeGreaterThan(0);
		expect(at(l, 3, 0).badges.find((b) => b.id === 'a')?.text).toBe('ESTABLISHED');
	});
	it('動きを減らす：すぐに最後の形で、続く流れは止める（LS-M13）', () => {
		const l = validV2();
		const f = at(l, 2, 0, true);
		expect(f.packets).toEqual([]);
		expect(f.metrics.find((m) => m.key === 'q')!.text).toBe('2 個');
		expect(f.para.shown).toEqual([0, 1]);
	});
});
