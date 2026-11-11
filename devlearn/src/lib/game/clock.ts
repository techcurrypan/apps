// 街の時計。状態の時刻は「ゲーム内の分」の整数（game-design.md 15.1）。
// DOM・WebGL・実時間を知らない。描画は実時間を足し込んで整数の分にし、tick を呼ぶだけ。
// 段 8-2b：試作の時計（11 月 10 日 15:30 に始まり、30 日で月が替わる）をそのまま移した。8-2c で 15.2 の 1 日の流れにする。

/** 分 0 は 11 月 1 日 0:00 */
export const FIRST_MONTH = 11;
export const DAYS_PER_MONTH = 30;
export const MIN_PER_DAY = 24 * 60;
/** 試作の始まり：11 月 10 日 15:30 */
export const START_MINUTE = 9 * MIN_PER_DAY + 15 * 60 + 30;

export type ClockEvent = { type: 'hour'; hour: number; at: number } | { type: 'day'; at: number };

export type Clock = { month: number; day: number; hour: number; min: number; text: string; date: string };

export function clockOf(minute: number): Clock {
	const dayIndex = Math.floor(minute / MIN_PER_DAY);
	const inDay = minute - dayIndex * MIN_PER_DAY;
	const month = ((FIRST_MONTH - 1 + Math.floor(dayIndex / DAYS_PER_MONTH)) % 12) + 1;
	const day = (dayIndex % DAYS_PER_MONTH) + 1;
	const hour = Math.floor(inDay / 60);
	const min = inDay % 60;
	const text = String(hour).padStart(2, '0') + ':' + String(min).padStart(2, '0');
	return { month, day, hour, min, text, date: `${month}月${day}日` };
}

/**
 * from から to まで時計を進め、またいだ時（:00）の知らせを順に返す。
 * 0 時をまたぐときは、日が変わった知らせを先に出す（試作の順）。to が from 以下なら何もしない
 */
export function tick(from: number, to: number): { minute: number; events: ClockEvent[] } {
	if (to <= from) return { minute: from, events: [] };
	const events: ClockEvent[] = [];
	for (let at = (Math.floor(from / 60) + 1) * 60; at <= to; at += 60) {
		const hour = Math.floor(at / 60) % 24;
		if (hour === 0) events.push({ type: 'day', at });
		events.push({ type: 'hour', hour, at });
	}
	return { minute: to, events };
}
