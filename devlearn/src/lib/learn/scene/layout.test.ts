import { describe, expect, it } from 'vitest';
import { MOVE_MS, ease, sceneAt, type Layout } from './layout';

const A: Layout = { app: [200, 300], wq: [500, 300, 1], nic: [800, 300] };
const B: Layout = { wq: [300, 250, 0.8], nic: [600, 250], ring: [850, 300] };

describe('構図の移り変わり（LS3-S5・S6）', () => {
	it('最初のステップ（前が無い）は、物が少し下から縮んで現れる', () => {
		const s0 = sceneAt(A, null, 0);
		expect(s0.app.op).toBe(0);
		expect(s0.app.y).toBeCloseTo(320);
		expect(s0.app.s).toBeCloseTo(0.85);
		const s1 = sceneAt(A, null, MOVE_MS);
		expect(s1.app).toEqual({ x: 200, y: 300, s: 1, op: 1 });
	});
	it('続けて出る物は 0.9 秒で新しい位置・縮尺へ滑らかに動く', () => {
		expect(MOVE_MS).toBe(900);
		const half = sceneAt(B, A, MOVE_MS / 2);
		expect(half.wq.x).toBeCloseTo(400);
		expect(half.wq.s).toBeCloseTo(0.9);
		expect(half.wq.op).toBe(1);
		const end = sceneAt(B, A, MOVE_MS);
		expect(end.wq).toEqual({ x: 300, y: 250, s: 0.8, op: 1 });
	});
	it('飛ばない：0.1 秒ごとの動きは、全体の動きの 1/4 を超えない', () => {
		let prev = sceneAt(B, A, 0).nic.x;
		for (let t = 100; t <= MOVE_MS; t += 100) {
			const x = sceneAt(B, A, t).nic.x;
			expect(Math.abs(x - prev)).toBeLessThanOrEqual(200 / 4 + 1e-9);
			prev = x;
		}
	});
	it('消える物はその場で薄くなり、終わると無くなる', () => {
		expect(sceneAt(B, A, MOVE_MS / 2).app.op).toBeCloseTo(0.5);
		expect(sceneAt(B, A, MOVE_MS / 2).app.x).toBe(200);
		expect(sceneAt(B, A, MOVE_MS).app).toBeUndefined();
	});
	it('現れる物は少し下から縮んだ形で現れる', () => {
		const r0 = sceneAt(B, A, 0).ring;
		expect(r0).toEqual({ x: 850, y: 320, s: 0.85, op: 0 });
		expect(sceneAt(B, A, MOVE_MS).ring).toEqual({ x: 850, y: 300, s: 1, op: 1 });
	});
	it('同じ入力からは同じ出力（時刻だけで決まる）', () => {
		expect(sceneAt(B, A, 333)).toEqual(sceneAt(B, A, 333));
	});
	it('動きを減らす設定では、移らずに新しい構図', () => {
		expect(sceneAt(B, A, 0, { reduce: true }).wq).toEqual({ x: 300, y: 250, s: 0.8, op: 1 });
		expect(sceneAt(B, A, 0, { reduce: true }).app).toBeUndefined();
	});
	it('ease は 0→0・1→1 で、真ん中は 0.5', () => {
		expect(ease(0)).toBe(0);
		expect(ease(1)).toBe(1);
		expect(ease(0.5)).toBeCloseTo(0.5);
	});
});
