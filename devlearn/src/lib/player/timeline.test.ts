// 1 ステップの再生の時間割：前の図 → 動き 1 つずつ → 後の図。
import { describe, expect, it } from 'vitest';
import { HOLD_MS, OP_MS, duration, phaseAt, phaseLabel } from './timeline.ts';

describe('時間割', () => {
	it('長さは「前を見せる間 + 動きの数 × 1 つの長さ」を速さで割った物', () => {
		expect(duration(3, 1)).toBe(HOLD_MS + 3 * OP_MS);
		expect(duration(3, 2)).toBe((HOLD_MS + 3 * OP_MS) / 2);
		expect(duration(0, 1)).toBe(HOLD_MS);
	});
	it('始めは前の図', () => {
		expect(phaseAt(0, 3, 1)).toEqual({ kind: 'before' });
		expect(phaseAt(HOLD_MS - 1, 3, 1)).toEqual({ kind: 'before' });
	});
	it('動きは 1 つずつ順に進む', () => {
		expect(phaseAt(HOLD_MS, 3, 1)).toEqual({ kind: 'op', index: 0, t: 0 });
		expect(phaseAt(HOLD_MS + OP_MS / 2, 3, 1)).toEqual({ kind: 'op', index: 0, t: 0.5 });
		expect(phaseAt(HOLD_MS + OP_MS, 3, 1)).toEqual({ kind: 'op', index: 1, t: 0 });
		expect(phaseAt(HOLD_MS + 2.5 * OP_MS, 3, 1)).toEqual({ kind: 'op', index: 2, t: 0.5 });
	});
	it('終わると後の図で止まる', () => {
		expect(phaseAt(HOLD_MS + 3 * OP_MS, 3, 1)).toEqual({ kind: 'after' });
		expect(phaseAt(1e9, 3, 1)).toEqual({ kind: 'after' });
	});
	it('速さ ×2 では半分の時刻で同じ所にいる', () => {
		expect(phaseAt((HOLD_MS + OP_MS / 2) / 2, 3, 2)).toEqual({ kind: 'op', index: 0, t: 0.5 });
	});
	it('動きが無ければ前の後すぐに後の図', () => {
		expect(phaseAt(HOLD_MS, 0, 1)).toEqual({ kind: 'after' });
	});
	it('負の時刻は前の図', () => {
		expect(phaseAt(-5, 3, 1)).toEqual({ kind: 'before' });
	});
	it('今の段階を文字で示す', () => {
		expect(phaseLabel({ kind: 'before' }, 3)).toBe('前');
		expect(phaseLabel({ kind: 'op', index: 1, t: 0.2 }, 3)).toBe('動き 2/3');
		expect(phaseLabel({ kind: 'after' }, 3)).toBe('後');
	});
});
