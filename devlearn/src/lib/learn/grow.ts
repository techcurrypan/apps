// 「この学びで育つ物」（LS-C1・screen-design.md 11.6）。game-design.md 第 8 章の手と、その手が効く要望。
import { GROUPS, MOVES } from '../game/data.ts';
import { SYSTEM_NAMES } from '../game/desk.ts';

export type Grows = {
	moves: string[]; // このレッスンで増える街の手
	requests: { client: string; symptom: string }[]; // その手が効く要望（3 件まで）
	more: number; // ほかに効く要望の数
	system: string | null; // 分野の仕組みの建物
};

export function growsOf(lessonId: string, field: string): Grows {
	const ms = MOVES.filter((m) => m.lesson === lessonId);
	const causes = new Set(ms.flatMap((m) => [...m.tests, ...m.fixes]));
	const groups = GROUPS.filter((g) => g.causes.some((c) => causes.has(c)));
	const seen = new Set<string>();
	const requests: Grows['requests'] = [];
	for (const g of groups) {
		const key = g.client + g.symptom;
		if (seen.has(key)) continue;
		seen.add(key);
		requests.push({ client: g.client, symptom: g.symptom });
	}
	return {
		moves: ms.map((m) => m.name),
		requests: requests.slice(0, 3),
		more: Math.max(0, requests.length - 3),
		system: SYSTEM_NAMES[field] ?? null
	};
}
