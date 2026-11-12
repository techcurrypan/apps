// 学びと街の接続（段 9）。修了の記録（src/lib/progress.ts）を読むだけで、書き換えない。
// 街は「前に見た修了の集まり」を覚えておき、戻ったときに増えた手と、それが効く受付中の要望を知らせる。
import { MOVES, TITLES } from './data.ts';
import { CLIENTS, groupOf, lessonsFor } from './desk.ts';
import type { TownState } from './town.ts';

/** 街が覚えている「前に見た修了の集まり」の置き場（修了の記録・街の保存とは別。screen-design.md 10.3） */
export const KNOWN_KEY = 'devlearn.town.known';

/** そのレッスンで街に加わる手（第 8 章の表） */
export function lessonMoves(id: string): { name: string; test: boolean; fix: boolean }[] {
	return MOVES.filter((m) => m.lesson === id).map((m) => ({
		name: m.name,
		test: m.tests.length > 0,
		fix: m.fixes.length > 0
	}));
}

/** 前に知っていた集まりに無く、街の手を持つレッスン（修了の記録の順） */
export function gainedLessons(known: readonly string[], done: readonly string[]): string[] {
	const k = new Set(known);
	const moves = new Set(MOVES.map((m) => m.lesson));
	return done.filter((id) => !k.has(id) && moves.has(id));
}

export type GainNotice = {
	lesson: string;
	title: string;
	move: string;
	requests: { id: string; who: string; symptom: string }[];
};

/** 増えた手ごとに、効く受付中の要望（依頼主と症状） */
export function gainNotices(s: TownState, lessons: readonly string[]): GainNotice[] {
	const open = s.desk.requests.filter((r) => r.status === 'open');
	return lessons.flatMap((id) => {
		const m = MOVES.find((x) => x.lesson === id);
		if (!m) return [];
		return [
			{
				lesson: id,
				title: TITLES[id] ?? id,
				move: m.name,
				requests: open
					.filter((r) => lessonsFor(r).some((x) => x.lesson === id))
					.map((r) => ({ id: r.id, who: CLIENTS[r.group].who, symptom: groupOf(r.group).symptom }))
			}
		];
	});
}

/** 覚えている集まりを読む。壊れていたら空 */
export function parseKnown(text: string | null): string[] {
	if (!text) return [];
	try {
		const x: unknown = JSON.parse(text);
		return Array.isArray(x) ? x.filter((d): d is string => typeof d === 'string') : [];
	} catch {
		return [];
	}
}
