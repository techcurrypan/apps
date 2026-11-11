import { describe, expect, it } from 'vitest';
import { clockOf, START_MINUTE, tick, type ClockEvent } from './clock.ts';

describe('街の時計（ゲーム内の分）', () => {
	it('始まりは試作と同じ 11 月 10 日 15:30', () => {
		expect(clockOf(START_MINUTE)).toEqual({ month: 11, day: 10, hour: 15, min: 30, text: '15:30', date: '11月10日' });
	});

	it('時をまたぐと、その時の知らせを出す', () => {
		const r = tick(START_MINUTE, START_MINUTE + 60);
		expect(r.minute).toBe(START_MINUTE + 60);
		expect(r.events).toEqual<ClockEvent[]>([{ type: 'hour', hour: 16, at: START_MINUTE + 30 }]);
	});

	it('0 時をまたぐと、日が変わってから 0 時の知らせ（試作の順）', () => {
		const end = START_MINUTE + 9 * 60; // 0:30
		const ev = tick(START_MINUTE, end).events.map((e) => (e.type === 'hour' ? e.hour : 'day'));
		expect(ev).toEqual([16, 17, 18, 19, 20, 21, 22, 23, 'day', 0]);
		expect(clockOf(end)).toMatchObject({ day: 11, hour: 0, min: 30 });
	});

	it('一度に進めても、少しずつ進めても、同じ知らせが同じ順に出る', () => {
		const all = tick(START_MINUTE, START_MINUTE + 3000).events;
		const parts: ClockEvent[] = [];
		let m = START_MINUTE;
		for (const step of [1, 7, 59, 61, 600, 1, 2271]) {
			const r = tick(m, m + step);
			parts.push(...r.events);
			m = r.minute;
		}
		expect(m).toBe(START_MINUTE + 3000);
		expect(parts).toEqual(all);
	});

	it('30 日で月が替わる（試作と同じ）', () => {
		const m = START_MINUTE + 21 * 24 * 60; // 11/31 にはならず 12/1
		expect(clockOf(m)).toMatchObject({ month: 12, day: 1 });
	});

	it('戻す・止める（同じ分）では何も起きない', () => {
		expect(tick(START_MINUTE, START_MINUTE).events).toEqual([]);
		expect(tick(START_MINUTE, START_MINUTE - 10)).toEqual({ minute: START_MINUTE, events: [] });
	});
});
