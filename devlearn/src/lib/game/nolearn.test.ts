import { describe, expect, it } from 'vitest';
import { START_MINUTE as T } from './clock.ts';
import { movesFor } from './desk.ts';
import { townMap } from './map.ts';
import {
	applyTown,
	chapterDay,
	deskCtx,
	startTown,
	tickTown,
	type TownAction,
	type TownState
} from './town.ts';

// 段 9 の完成条件 4：学習の進みがゲームの必須条件になっていない。修了 0 本で、1 章から自由の章まで全ての章が遊べる
const map = townMap();
const DAY = 24 * 60;
const none = new Set<string>();

/** 学ばない遊び方（15.8）：いつでもの手で調べ、示し、手探りで直す。期限の日の残りは外に頼む */
function step(s: TownState): TownState | null {
	const open = s.desk.requests
		.filter((r) => r.status === 'open')
		.sort((a, b) => a.due - b.due || (a.id < b.id ? -1 : 1));
	for (const r of open) {
		const tries: TownAction[] = !r.confirmed
			? [{ type: 'ask', request: r.id }]
			: r.doubt > 0
				? [
						{ type: 'show', request: r.id },
						{ type: 'plead', request: r.id }
					]
				: [{ type: 'grope', request: r.id }];
		for (const a of tries) {
			const x = applyTown(s, a, map, none);
			if (x.ok) return x.state;
		}
	}
	return null;
}

describe('修了 0 本で全ての章が遊べる', () => {
	for (const seed of [0, 1, 2, 3, 7])
		it(`種 ${seed}：1 章から 4 章を通り、自由の章に入る。失敗しない`, () => {
			let s = startTown(seed, map);
			const seen = new Set<string>();
			for (let day = 0; day < 60 && s.desk.chapter !== 'free'; day++) {
				const d0 = T + day * DAY;
				s = tickTown(s, d0 + 60, map).state;
				seen.add(String(s.desk.chapter));
				// どの受付中の要望にも、学ばずに打てる手が必ずある（勤務の初め）
				for (const r of s.desk.requests.filter((x) => x.status === 'open')) {
					const ok = movesFor(s.desk, r.id, none, deskCtx(s)).filter(
						(m) => m.ok && m.kind === 'any'
					);
					expect(ok.length, `${s.desk.chapter} 章 ${chapterDay(s)} 日目 ${r.id}`).toBeGreaterThan(
						0
					);
				}
				for (let k = 0; k < 40; k++) {
					const n = step(s);
					if (!n) break;
					s = n;
				}
				for (const r of s.desk.requests)
					if (r.status === 'open' && r.due <= chapterDay(s)) {
						const x = applyTown(s, { type: 'outsource', request: r.id }, map, none);
						if (x.ok) s = x.state;
					}
				s = tickTown(s, d0 + 9 * 60, map).state;
				expect(s.desk.result, `${s.desk.chapter} 章`).not.toBe('failed');
			}
			expect([...seen]).toEqual(['1', '2', '3', '4', 'free']);
			expect(s.desk.chapter).toBe('free');
		});
});
