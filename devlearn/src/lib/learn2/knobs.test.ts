import { describe, expect, it } from 'vitest';
import { validV2 } from '../lesson/testing/v2-fixture.ts';
import { k8sBackoff, knobLoop, tcpWindow } from './knobs.ts';

describe('実験のつまみ（LS-L5。決まった式・乱数なし）', () => {
	it('TCP：窓 ÷ RTT。RTT が倍なら半分、喪失で下がる', () => {
		const a = tcpWindow({ rtt: 20, cwnd: 10, loss: 0 });
		const b = tcpWindow({ rtt: 40, cwnd: 10, loss: 0 });
		expect(a.rows[1].v).toBe('5.8 Mbps');
		expect(b.rows[1].v).toBe('2.9 Mbps');
		const c = tcpWindow({ rtt: 20, cwnd: 100, loss: 1 });
		expect(Number(c.rows[2].v.split(' ')[0])).toBeLessThan(Number(c.rows[1].v.split(' ')[0]));
		expect(c.drops.length).toBe(1);
		expect(JSON.stringify(tcpWindow({ rtt: 20, cwnd: 10, loss: 0 }))).toBe(JSON.stringify(a));
	});
	it('K8s：再起動の待ちは 10・20・40… 秒で、300 秒で頭打ち', () => {
		expect(k8sBackoff({ restarts: 1 }).rows[0].v).toBe('10 秒');
		expect(k8sBackoff({ restarts: 3 }).rows[0].v).toBe('40 秒');
		expect(k8sBackoff({ restarts: 9 }).rows[0].v).toBe('300 秒');
		expect(k8sBackoff({ restarts: 3 }).rows[1].v).toBe('30 秒'); // 0 ＋ 10 ＋ 20（1 回目は待たない）
		expect(k8sBackoff({ restarts: 0 }).rows[0].v).toBe('0 秒（初回はすぐ）');
	});
	it('続く流れを作り直す：数・長さ・落ちる荷物', () => {
		const s = validV2().explain[1];
		const out = knobLoop(s, { rows: [], note: '', count: 4, dur: 500, drops: [2] });
		const loop = out.loop as NonNullable<typeof s.motion>;
		expect(loop).toHaveLength(4);
		expect(loop[2].do.op === 'packet' && loop[2].do.drop).toBe(true);
		expect(loop[1].dur).toBe(500);
	});
});
