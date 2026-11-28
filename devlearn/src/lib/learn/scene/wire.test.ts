import { describe, expect, it } from 'vitest';
import { WIRE_TONE, dotsAt, trim } from './wire';

// learn-standard.md 16.2 LS3-K4・16.4 M2：線は物の外枠の手前で止め、線の上を点がいつも流れる
describe('線（wire）', () => {
	it('trim：両端から決めた長さだけ手前で止める', () => {
		const t = trim({ x: 0, y: 0 }, { x: 100, y: 0 }, 20, 30);
		expect(t.a).toEqual({ x: 20, y: 0 });
		expect(t.b).toEqual({ x: 70, y: 0 });
		expect(t.len).toBeCloseTo(50);
	});
	it('trim：止める長さが線より長い時は、真ん中の 1 点に縮む（裏返らない）', () => {
		const t = trim({ x: 0, y: 0 }, { x: 10, y: 0 }, 20, 20);
		expect(t.len).toBe(0);
		expect(t.a).toEqual({ x: 5, y: 0 });
	});
	it('dotsAt：周の位置 p の点。片道は a→b、行き来は 2 つ目の点が b→a', () => {
		const t = trim({ x: 0, y: 0 }, { x: 100, y: 0 }, 0, 0);
		expect(dotsAt(t, 0.25)).toEqual([{ x: 25, y: 0 }]);
		expect(dotsAt(t, 0.25, true)).toEqual([
			{ x: 25, y: 0 },
			{ x: 75, y: 0 }
		]);
	});
	it('dotsAt：動きを減らす設定（p が null）は点を出さない', () => {
		const t = trim({ x: 0, y: 0 }, { x: 100, y: 0 }, 0, 0);
		expect(dotsAt(t, null)).toEqual([]);
	});
	it('点の色：データは青、ACK は緑、watch は紫、参照は黄（第 16.2 K4）', () => {
		expect(WIRE_TONE).toEqual({ data: 'blue', ack: 'green', watch: 'purple', ref: 'yellow' });
	});
});
