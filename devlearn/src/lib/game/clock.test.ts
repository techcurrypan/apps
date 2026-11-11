import { describe, expect, it } from 'vitest';
import { clockOf, slotsLeft, START_MINUTE, tick, workFrom, type ClockEvent } from './clock.ts';

/** 11 月 10 日 15:30（試作の始まり。時の知らせのテストに使う） */
const AT = 9 * 24 * 60 + 15 * 60 + 30;

describe('街の時計（ゲーム内の分）', () => {
	it('始まりは 1 日目（11 月 10 日。試作の日付）の 8:00（game-design.md 15.2）', () => {
		expect(clockOf(START_MINUTE)).toEqual({
			month: 11,
			day: 10,
			hour: 8,
			min: 0,
			text: '08:00',
			date: '11月10日'
		});
	});

	it('勤務の残り（コマ）＝ floor((17:00 − max(今, 9:00)) / 60)。0〜8', () => {
		const d = 9 * 24 * 60;
		expect(slotsLeft(d + 8 * 60)).toBe(8);
		expect(slotsLeft(d + 9 * 60)).toBe(8);
		expect(slotsLeft(d + 9 * 60 + 1)).toBe(7);
		expect(slotsLeft(d + 16 * 60)).toBe(1);
		expect(slotsLeft(d + 16 * 60 + 30)).toBe(0);
		expect(slotsLeft(d + 17 * 60)).toBe(0);
		expect(slotsLeft(d + 23 * 60)).toBe(0);
		expect(slotsLeft(d)).toBe(8);
	});

	it('9:00 より前に手を打つと、9:00 から始めたことにする', () => {
		const d = 9 * 24 * 60;
		expect(workFrom(d + 8 * 60)).toBe(d + 9 * 60);
		expect(workFrom(d + 10 * 60 + 5)).toBe(d + 10 * 60 + 5);
	});

	it('時をまたぐと、その時の知らせを出す', () => {
		const r = tick(AT, AT + 60);
		expect(r.minute).toBe(AT + 60);
		expect(r.events).toEqual<ClockEvent[]>([{ type: 'hour', hour: 16, at: AT + 30 }]);
	});

	it('0 時をまたぐと、日が変わってから 0 時の知らせ（試作の順）', () => {
		const end = AT + 9 * 60; // 0:30
		const ev = tick(AT, end).events.map((e) => (e.type === 'hour' ? e.hour : 'day'));
		expect(ev).toEqual([16, 17, 18, 19, 20, 21, 22, 23, 'day', 0]);
		expect(clockOf(end)).toMatchObject({ day: 11, hour: 0, min: 30 });
	});

	it('一度に進めても、少しずつ進めても、同じ知らせが同じ順に出る', () => {
		const all = tick(AT, AT + 3000).events;
		const parts: ClockEvent[] = [];
		let m = AT;
		for (const step of [1, 7, 59, 61, 600, 1, 2271]) {
			const r = tick(m, m + step);
			parts.push(...r.events);
			m = r.minute;
		}
		expect(m).toBe(AT + 3000);
		expect(parts).toEqual(all);
	});

	it('30 日で月が替わる（試作と同じ）', () => {
		const m = AT + 21 * 24 * 60; // 11/31 にはならず 12/1
		expect(clockOf(m)).toMatchObject({ month: 12, day: 1 });
	});

	it('戻す・止める（同じ分）では何も起きない', () => {
		expect(tick(AT, AT).events).toEqual([]);
		expect(tick(AT, AT - 10)).toEqual({ minute: AT, events: [] });
	});
});
