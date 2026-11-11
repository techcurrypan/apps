// 街の時計。状態の時刻は「ゲーム内の分」の整数（game-design.md 15.1）。
// DOM・WebGL・実時間を知らない。描画は実時間を足し込んで整数の分にし、tick を呼ぶだけ。
// 日付は試作の時計のまま（30 日で月が替わる）。1 日の流れは 15.2（8:00 朝・9:00〜17:00 勤務・17:00 締め）。

/** 分 0 は 11 月 1 日 0:00 */
export const FIRST_MONTH = 11;
export const DAYS_PER_MONTH = 30;
export const MIN_PER_DAY = 24 * 60;
/** 始まり：1 日目（試作の日付の 11 月 10 日）の 8:00。朝の処理を終えた所 */
export const START_MINUTE = 9 * MIN_PER_DAY + 8 * 60;
export const MORNING = 8 * 60;
export const WORK_START = 9 * 60;
export const WORK_END = 17 * 60;

const dayStart = (minute: number) => Math.floor(minute / MIN_PER_DAY) * MIN_PER_DAY;
/** 手を打ち始める時刻（9:00 より前なら 9:00） */
export const workFrom = (minute: number) => Math.max(minute, dayStart(minute) + WORK_START);
/** 今日の勤務の残り（コマ = 1 時間）。0〜8 */
export function slotsLeft(minute: number): number {
	const t = workFrom(minute) - dayStart(minute);
	return t >= WORK_END ? 0 : Math.floor((WORK_END - t) / 60);
}

export type ClockEvent = { type: 'hour'; hour: number; at: number } | { type: 'day'; at: number };

export type Clock = {
	month: number;
	day: number;
	hour: number;
	min: number;
	text: string;
	date: string;
};

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
