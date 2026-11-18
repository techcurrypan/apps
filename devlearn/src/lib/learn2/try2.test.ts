import { describe, expect, it } from 'vitest';
import { validV2 } from '../lesson/testing/v2-fixture.ts';
import type { Lesson } from '../lesson/types.ts';
import { outputAt, withMotion } from './try2.ts';

describe('やってみるの動き（LS-P4）', () => {
	it('命令の荷物が線を流れ、状態の札が変わり、その後に出力', () => {
		const base = validV2();
		const l: Lesson = {
			...base,
			explain: [
				{
					...base.explain[0],
					motion: undefined,
					scene: [
						{ op: 'appear', id: 'a', label: 'PC', at: [0, 0] },
						{ op: 'appear', id: 'b', label: 'web', at: [2, 0] },
						{ op: 'move', from: 'a', to: 'b', payload: 'ss -tim', kind: 'data' },
						{ op: 'change', id: 'b', k: 'cwnd', v: '10' }
					]
				}
			]
		};
		const s = withMotion(l).explain[0];
		const ops = s.motion!.map((c) => c.do.op);
		expect(ops[0]).toBe('camera');
		expect(ops.indexOf('packet')).toBeLessThan(ops.indexOf('badge'));
		const pk = s.motion!.find((c) => c.do.op === 'packet')!;
		expect(outputAt(s)).toBeGreaterThanOrEqual(pk.at + pk.dur);
		expect(s.loop).toBe('none');
	});
	it('合図を持つステップはそのまま', () => {
		const l = validV2();
		expect(withMotion(l).explain[1].motion).toBe(l.explain[1].motion);
	});
});
