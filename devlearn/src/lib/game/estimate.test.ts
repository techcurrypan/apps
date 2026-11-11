import { describe, expect, it } from 'vitest';
import { START_MINUTE as T } from './clock.ts';
import { MOVES } from './data.ts';
import { CHAPTER_REWARD } from './desk.ts';
import { townMap } from './map.ts';
import {
	applyTown,
	avgHappy,
	chapterDay,
	startTown,
	tickTown,
	type TownAction,
	type TownState
} from './town.ts';

// game-design.md 15.8 の見積もりを、同じ遊び方で流して確かめる（段 8-2d。A-8・A-11）。
// 遊び方：毎朝 9:00 から、期限の近い要望から、打てる手のうち学んだ手を先に打つ。その日が期限の残りは、資金があれば外に頼む。街づくりの操作はしない。
// 「半分修了」は、その章の分野のレッスンを第 8 章の表の順に 1 本おきに取った物。
// 表の「7 日目の資金」は、8-1 の使い捨ての模擬が数えた所（8 日目 8:00 の資金から章の報酬を除いた額）で比べる。
const map = townMap();
const DAY = 24 * 60;
const SEEDS = [0, 1, 2, 3, 7];
const FIELDS: Record<number, string[]> = {
	1: ['prg', 'lnx', 'net', 'git'],
	2: ['sec', 'db', 'ai'],
	3: ['sta', 'ai'],
	4: ['ctr', 'cld', 'ci']
};
type Mode = 'none' | 'half' | 'all';

function learnedFor(ch: number, mode: Mode): Set<string> {
	if (mode === 'none') return new Set();
	const ls = MOVES.filter((m) => FIELDS[ch].includes(m.lesson.split('-')[0])).map((m) => m.lesson);
	return new Set(mode === 'all' ? ls : ls.filter((_, i) => i % 2 === 0));
}

/** 打てる手を 1 つ打つ。打てる手が無ければ null */
function step(s: TownState, L: Set<string>): TownState | null {
	const open = s.desk.requests
		.filter((r) => r.status === 'open')
		.sort((a, b) => a.due - b.due || (a.id < b.id ? -1 : 1));
	for (const r of open) {
		const tries: TownAction[] = [];
		const rem = r.candidates.filter((c) => !r.ruledOut.includes(c));
		if (!r.confirmed) {
			for (const m of MOVES)
				if (L.has(m.lesson) && m.tests.some((c) => rem.includes(c)))
					tries.push({ type: 'test', move: m.lesson, request: r.id });
			tries.push({ type: 'ask', request: r.id });
		} else if (r.doubt > 0)
			tries.push({ type: 'show', request: r.id }, { type: 'plead', request: r.id });
		else {
			for (const m of MOVES)
				if (L.has(m.lesson) && m.fixes.includes(r.truth))
					tries.push({ type: 'fix', move: m.lesson, request: r.id });
			tries.push({ type: 'grope', request: r.id });
		}
		for (const a of tries) {
			const x = applyTown(s, a, map, L);
			if (x.ok) return x.state;
		}
	}
	return null;
}

function playChapter(seed: number, ch: number, mode: Mode) {
	const L = learnedFor(ch, mode);
	let s = startTown(seed, map, ch as 1);
	let outs = 0;
	for (let d = 0; d < 7; d++) {
		s = tickTown(s, T + d * DAY + 60, map).state; // その日の 9:00
		for (let k = 0; k < 40; k++) {
			const n = step(s, L);
			if (!n) break;
			s = n;
		}
		for (const r of s.desk.requests)
			if (r.status === 'open' && r.due <= chapterDay(s)) {
				const x = applyTown(s, { type: 'outsource', request: r.id }, map, L);
				if (x.ok) {
					s = x.state;
					outs++;
				}
			}
		s = tickTown(s, T + d * DAY + 9 * 60, map).state; // その日の 17:00（締め）
		if (s.desk.result === 'failed') break;
	}
	const reward = s.desk.grade ? CHAPTER_REWARD[s.desk.grade] : 0;
	const money = tickTown(s, T + 7 * DAY, map).state.build.money - reward;
	return { sat: s.desk.clientSat, grade: s.desk.grade, money, town: avgHappy(s, map), outs };
}

function table(mode: Mode) {
	const rows: ReturnType<typeof playChapter>[] = [];
	for (const ch of [1, 2, 3, 4]) for (const seed of SEEDS) rows.push(playChapter(seed, ch, mode));
	const range = (f: (r: (typeof rows)[number]) => number) => [
		Math.min(...rows.map(f)),
		Math.max(...rows.map(f))
	];
	const grades: Record<string, number> = {};
	for (const r of rows) grades[r.grade ?? '不合格'] = (grades[r.grade ?? '不合格'] ?? 0) + 1;
	return {
		sat: range((r) => r.sat),
		grades,
		money: range((r) => r.money),
		town: range((r) => r.town),
		outs: range((r) => r.outs)
	};
}

describe('学ばない道の見積もり（game-design.md 15.8 の表と同じ結果）', () => {
	it('学ばない：68〜79、全て合格（良 19・合格 1）、資金 948〜2,348、外に頼んだ数 6〜7', () => {
		const t = table('none');
		expect(t.sat).toEqual([68, 79]);
		expect(t.grades).toEqual({ 良: 19, 合格: 1 });
		expect(t.money).toEqual([948, 2348]);
		expect(t.outs).toEqual([6, 7]);
		// 町の満足度：表は基礎を全て 60 として数えた（61.6〜64.7）。本番の基礎は 55〜65 のむらがあるので ±1 で比べる
		expect(t.town[0]).toBeGreaterThan(61.6 - 1);
		expect(t.town[1]).toBeLessThan(64.7 + 1);
	});

	it('半分修了：73〜93、全て良以上（良 19・優 1）、資金 2,648〜6,648、外に頼んだ数 1〜6', () => {
		const t = table('half');
		expect(t.sat).toEqual([73, 93]);
		expect(t.grades).toEqual({ 良: 19, 優: 1 });
		expect(t.money).toEqual([2648, 6648]);
		expect(t.outs).toEqual([1, 6]);
		expect(t.town[0]).toBeGreaterThan(62.1 - 1);
		expect(t.town[1]).toBeLessThan(66.8 + 1);
	});

	it('全て修了：83〜100、全て良以上（優 18・良 2）、資金 4,648〜9,048、外に頼んだ数 0〜3', () => {
		const t = table('all');
		expect(t.sat).toEqual([83, 100]);
		expect(t.grades).toEqual({ 優: 18, 良: 2 });
		expect(t.money).toEqual([4648, 9048]);
		expect(t.outs).toEqual([0, 3]);
		expect(t.town[0]).toBeGreaterThan(63.1 - 1);
		expect(t.town[1]).toBeLessThan(68.2 + 1);
	});

	it('何もしない：全ての種で 5 日目の締めで失敗する', () => {
		for (const ch of [1, 2, 3, 4])
			for (const seed of SEEDS) {
				const s = tickTown(startTown(seed, map, ch as 1), T + 10 * DAY, map).state;
				expect(s.desk.result, `${ch} 章 種 ${seed}`).toBe('failed');
				expect(chapterDay(s)).toBe(5);
			}
	});
});
