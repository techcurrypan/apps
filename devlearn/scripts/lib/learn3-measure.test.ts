import { describe, expect, it } from 'vitest';
import {
	judgeHover,
	judgeLoop,
	judgePerf,
	judgeScene,
	judgeTerms,
	type HoverHit,
	type SceneSnap,
	type TermsSnap
} from './learn3-measure.ts';

const box = (x: number, y: number, w = 180, h = 140) => ({ x, y, w, h });
const stage = box(0, 0, 1000, 600);

function scene(over: Partial<SceneSnap> = {}): SceneSnap {
	return {
		step: 2,
		kind: 'mechanism',
		last: false,
		stage,
		objs: [
			{ id: 'a', box: box(40, 200) },
			{ id: 'b', box: box(360, 200) },
			{ id: 'c', box: box(680, 200) }
		],
		texts: [
			{ s: 'アプリ', box: box(80, 350, 60, 18), px: 14, owner: 'a' },
			{ s: 'カーネル', box: box(400, 350, 70, 18), px: 14, owner: 'b' },
			{ s: 'NIC', box: box(720, 350, 40, 18), px: 14, owner: 'c' },
			{ s: 'send() は 40 µs で戻る', box: box(380, 120, 160, 18), px: 12.5, owner: null }
		],
		...over
	};
}

describe('judgeScene（LS3-S1・S3・S4 と 16.3）', () => {
	it('3 つの物が大きく離れて並び、字が 12〜15px なら全て満たす', () => {
		expect(Object.values(judgeScene(scene())).every((v) => v === true)).toBe(true);
	});
	it('物が 2 つや 7 つなら S1 を落とす。まとめは 8 つまで', () => {
		const two = scene({ objs: scene().objs.slice(0, 2) });
		expect(judgeScene(two).S1).not.toBe(true);
		const seven = Array.from({ length: 7 }, (_, i) => ({
			id: `o${i}`,
			box: box(i * 140, 10, 115, 100)
		}));
		expect(judgeScene(scene({ objs: seven, texts: [] })).S1).not.toBe(true);
		const eight = Array.from({ length: 8 }, (_, i) => ({
			id: `o${i}`,
			box: box(i * 124, 10, 112, 100)
		}));
		expect(judgeScene(scene({ objs: eight, texts: [], last: true })).S1).toBe(true);
	});
	it('幅 150px に満たない物、触れるほど近い物は S3 を落とす', () => {
		const small = scene({ objs: [{ id: 'a', box: box(40, 200, 120) }, ...scene().objs.slice(1)] });
		expect(judgeScene(small).S3).not.toBe(true);
		const near = scene({
			objs: [{ id: 'a', box: box(40, 200) }, { id: 'b', box: box(225, 200) }, scene().objs[2]]
		});
		expect(judgeScene(near).S3).not.toBe(true);
	});
	it('縮めた 7 つ以上の物は 110px あればよい', () => {
		const eight = Array.from({ length: 8 }, (_, i) => ({
			id: `o${i}`,
			box: box(i * 170, 10, 112, 100)
		}));
		expect(judgeScene(scene({ objs: eight, texts: [], last: true })).S3).toBe(true);
	});
	it('札どうし・札と別の物が重なると S4 を落とす。自分の物の上の名前は数えない', () => {
		const t = scene().texts;
		const clash = scene({
			texts: [...t, { s: '重なる', box: box(82, 352, 50, 18), px: 14, owner: null }]
		});
		expect(judgeScene(clash).S4).not.toBe(true);
		const onOther = scene({
			texts: [...t, { s: '上の札', box: box(370, 220, 40, 18), px: 14, owner: 'a' }]
		});
		expect(judgeScene(onOther).S4).not.toBe(true);
		const own = scene({
			texts: [...t, { s: '上の札', box: box(370, 220, 40, 18), px: 14, owner: 'b' }]
		});
		expect(judgeScene(own).S4).toBe(true);
	});
	it('記号 1 字は字の大きさを数えない', () => {
		expect(
			judgeScene(scene({ texts: [{ s: '✓', box: box(10, 10, 10, 10), px: 18, owner: 'a' }] })).字
		).toBe(true);
	});
	it('12px より小さい字は 字 を落とす', () => {
		const tiny = scene({ texts: [{ s: 'x', box: box(10, 10, 10, 10), px: 10, owner: null }] });
		expect(judgeScene(tiny).字).not.toBe(true);
	});
	it('型で線が変わる：cluster は幅 90px、chart は物 1 つでよい', () => {
		const objs = [box(40, 200, 100), box(360, 200, 100), box(680, 200, 100)].map((b, i) => ({
			id: `o${i}`,
			box: b
		}));
		expect(judgeScene(scene({ objs, texts: [] })).S3).not.toBe(true);
		expect(judgeScene(scene({ objs, texts: [], type: 'cluster' })).S3).toBe(true);
		const one = [{ id: 'pop', box: box(20, 20, 960, 170) }];
		expect(judgeScene(scene({ objs: one, texts: [] })).S1).not.toBe(true);
		expect(judgeScene(scene({ objs: one, texts: [], type: 'chart' })).S1).toBe(true);
	});
	it('図の枠からはみ出すと はみ出し を落とす', () => {
		const out = scene({ objs: [...scene().objs.slice(0, 2), { id: 'c', box: box(900, 200) }] });
		expect(judgeScene(out).はみ出し).not.toBe(true);
	});
});

describe('judgeLoop（LS3-M1・M2）', () => {
	it('30 秒の 1 秒ごとの差がほぼ全て動き、止めると時刻が進まなければ満たす', () => {
		const r = judgeLoop({
			diffs: Array(29).fill(0.01),
			tBefore: 1200,
			tAfter: 1200,
			pausedDiff: 0.002,
			looped: true
		});
		expect(Object.values(r).every((v) => v === true)).toBe(true);
	});
	it('途中で止まる絵は M1 を落とす', () => {
		const d = [...Array(15).fill(0.01), ...Array(14).fill(0)];
		expect(
			judgeLoop({ diffs: d, tBefore: 1, tAfter: 1, pausedDiff: 0.002, looped: true }).M1
		).not.toBe(true);
	});
	it('繰り返さない（最初に戻らない）と M1 を落とす', () => {
		expect(
			judgeLoop({
				diffs: Array(29).fill(0.01),
				tBefore: 1,
				tAfter: 1,
				pausedDiff: 0.002,
				looped: false
			}).M1
		).not.toBe(true);
	});
	it('一時停止しても時刻が進むと 止める を落とす。線の点が止まると M2 を落とす', () => {
		const r = judgeLoop({
			diffs: Array(29).fill(0.01),
			tBefore: 100,
			tAfter: 900,
			pausedDiff: 0,
			looped: true
		});
		expect(r.止める).not.toBe(true);
		expect(r.M2).not.toBe(true);
	});
});

describe('judgeHover（LS3-M4・H1〜H5）', () => {
	const hits: HoverHit[] = [
		{ kind: 'obj', id: 'a', tip: 'アプリ：プログラム', lift: 6 },
		{ kind: 'step', id: '1', tip: '準備：言葉をそろえる', lift: 2 },
		{ kind: 'mode', id: 'watch', tip: '仕組みが動くのを見る', lift: 0 },
		{ kind: 'metric', id: 'cwnd', tip: 'cwnd：送ってよい量', lift: 0 },
		{ kind: 'term', id: 'fd', tip: 'fd：接続の番号札', lift: 0 }
	];
	it('全ての種類に説明があり、物が浮けば満たす', () => {
		expect(Object.values(judgeHover(hits)).every((v) => v === true)).toBe(true);
	});
	it('説明の無い物があると H1 を落とす。浮かないと M4 を落とす', () => {
		const r = judgeHover([{ ...hits[0], tip: '', lift: 0 }, ...hits.slice(1)]);
		expect(r.H1).not.toBe(true);
		expect(r.M4).not.toBe(true);
	});
	it('種類が 1 つも測れないと落とす（測れない＝無い）', () => {
		expect(judgeHover(hits.filter((h) => h.kind !== 'mode')).H3).not.toBe(true);
	});
});

describe('judgeTerms（LS3-T1〜T7）', () => {
	const ok: TermsSnap = {
		kind0: '準備',
		anatomy: 4,
		objs0: 4,
		bigTerms: 12,
		analogy: true,
		steps: [
			{ step: 2, fresh: ['cwnd'], shown: ['cwnd'], marks: 1, dupMarks: 0 },
			{ step: 3, fresh: [], shown: [], marks: 0, dupMarks: 0 }
		],
		metrics: 3,
		metricTips: 3
	};
	it('第 18 章の形なら全て満たす', () => {
		expect(Object.values(judgeTerms(ok)).every((v) => v === true)).toBe(true);
	});
	it('最初が準備でない・式の分解が無い・言葉が 10 に満たないと落とす', () => {
		const r = judgeTerms({ ...ok, kind0: '問題', anatomy: 0, bigTerms: 6, analogy: false });
		expect(r.T1).not.toBe(true);
		expect(r.T2).not.toBe(true);
		expect(r.T4).not.toBe(true);
	});
	it('初出の言葉を出さない・前に出た言葉を出す・下線が無いと落とす', () => {
		const r = judgeTerms({
			...ok,
			steps: [{ step: 2, fresh: ['cwnd'], shown: ['cwnd', 'fd'], marks: 0, dupMarks: 1 }]
		});
		expect(r.T5).not.toBe(true);
		expect(r.T6).not.toBe(true);
	});
	it('指標に説明が無いと T7 を落とす', () => {
		expect(judgeTerms({ ...ok, metricTips: 1 }).T7).not.toBe(true);
	});
});

describe('judgePerf（第 20 章：1 コマ 8 ms）', () => {
	it('平均が 8 ms 以内なら満たす', () => {
		expect(judgePerf([3, 4, 5, 6]).ok).toBe(true);
		expect(judgePerf([9, 10, 8, 12]).ok).toBe(false);
		expect(judgePerf([]).ok).toBe(false);
	});
});
