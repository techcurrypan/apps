// 再生の途中の絵を、その時点の段階だけから作る。
import { describe, expect, it } from 'vitest';
import { git001 } from '../content/lessons/git-001.ts';
import { stateAt } from '../lesson/state.ts';
import { clone, validLesson } from '../lesson/testing/fixture.ts';
import type { Lesson } from '../lesson/types.ts';
import { draw, fitText, layoutOf, type Drawing } from './frame.ts';

function scenario(): Lesson {
	const l = clone(validLesson());
	l.explain[1].scene = [
		{ op: 'appear', id: 'b', label: '箱 B', at: [2, 0] },
		{ op: 'change', id: 'a', k: '値', v: '20' }
	];
	l.explain[2].scene = [
		{ op: 'highlight', id: 'a' },
		{ op: 'move', from: 'a', to: 'b', payload: '20', kind: 'send' }
	];
	l.explain[4].scene = [{ op: 'vanish', id: 'a' }];
	return l;
}

describe('置き場所', () => {
	it('格子の列と行から位置が決まり、レッスンの全ての物が入る大きさになる', () => {
		const lay = layoutOf(scenario());
		const a = lay.box([0, 0]);
		const b = lay.box([2, 0]);
		expect(b.x).toBeGreaterThan(a.x + a.w);
		expect(lay.width).toBeGreaterThanOrEqual(b.x + b.w);
		expect(lay.height).toBeGreaterThanOrEqual(a.y + a.h);
	});
	// 携帯の幅（390px）で舞台に使える幅は約 334px。そこに縮めて描いたときの大きさで確かめる。
	const PHONE = 334;
	it('狭い幅でも列の並び（左から右への流れ）は保ち、図の幅を細くする', () => {
		const wide = layoutOf(git001);
		const narrow = layoutOf(git001, 'narrow');
		expect(narrow.box([2, 0]).x).toBeGreaterThan(narrow.box([1, 0]).x);
		expect(narrow.box([2, 1]).y).toBeGreaterThan(narrow.box([2, 0]).y);
		expect(narrow.width).toBeLessThan(wide.width);
		expect(narrow.mode).toBe('narrow');
		expect(wide.mode).toBe('wide');
	});
	it('狭い幅では、携帯に縮めても舞台の高さが 240px 以内（文と記録の最新と同時に見える）', () => {
		const n = layoutOf(git001, 'narrow');
		expect((n.height * PHONE) / n.width).toBeLessThanOrEqual(240);
	});
	it('狭い幅では、携帯に縮めても値の字が 10px 以上、名前の字が 12px 以上', () => {
		const n = layoutOf(git001, 'narrow');
		expect((n.text.prop * PHONE) / n.width).toBeGreaterThanOrEqual(10);
		expect((n.text.label * PHONE) / n.width).toBeGreaterThanOrEqual(12);
	});
	it('狭い幅では値を名前と値の 2 行に分け、その分の高さを物に取る', () => {
		const n = layoutOf(git001, 'narrow');
		const w = layoutOf(git001);
		expect(n.text.lines).toBe(2);
		expect(w.text.lines).toBe(1);
		// git-001 の物が持つ値は最大 2 つ
		const last = n.text.propY + n.text.propStep * 1 + n.text.lineStep;
		expect(n.box([0, 0]).h).toBeGreaterThanOrEqual(last);
	});
	it('同じレッスンからは同じ大きさ（ステップが替わっても図が跳ねない）', () => {
		const lay = layoutOf(git001);
		expect(lay.width).toBeGreaterThan(0);
		expect(layoutOf(git001).width).toBe(lay.width);
		expect(layoutOf(git001).height).toBe(lay.height);
	});
});

describe('途中の絵', () => {
	const l = scenario();
	const lay = layoutOf(l);

	it('前の段階は前の図そのまま', () => {
		const s = stateAt(l, 2).scene;
		const d = draw(s, { kind: 'before' }, lay);
		expect(d.nodes.map((x) => x.id)).toEqual(['a']);
		expect(d.nodes[0].props).toEqual([{ k: '値', v: '10', old: null }]);
		expect(d.moving).toBeNull();
	});

	it('appear の途中は薄く、済むと濃い', () => {
		const s = stateAt(l, 2).scene;
		const mid = draw(s, { kind: 'op', index: 0, t: 0.5 }, lay);
		expect(mid.nodes.find((x) => x.id === 'b')?.opacity).toBe(0.5);
		const next = draw(s, { kind: 'op', index: 1, t: 0 }, lay);
		expect(next.nodes.find((x) => x.id === 'b')?.opacity).toBe(1);
	});

	it('change の途中は前と後の値が並ぶ', () => {
		const s = stateAt(l, 2).scene;
		const mid = draw(s, { kind: 'op', index: 1, t: 0.5 }, lay);
		expect(mid.nodes.find((x) => x.id === 'a')?.props).toEqual([{ k: '値', v: '20', old: '10' }]);
		const after = draw(s, { kind: 'after' }, lay);
		expect(after.nodes.find((x) => x.id === 'a')?.props).toEqual([{ k: '値', v: '20', old: null }]);
	});

	it('move は瞬間移動せず、線の途中を通る', () => {
		const s = stateAt(l, 3).scene;
		const start = draw(s, { kind: 'op', index: 1, t: 0 }, lay).moving;
		const mid = draw(s, { kind: 'op', index: 1, t: 0.5 }, lay).moving;
		const end = draw(s, { kind: 'op', index: 1, t: 1 }, lay).moving;
		expect(start?.at).toEqual(start?.from);
		expect(end?.at).toEqual(end?.to);
		expect(mid?.at.x).toBeCloseTo(((start?.from.x ?? 0) + (end?.to.x ?? 0)) / 2);
		expect(mid?.payload).toBe('20');
		expect(mid?.kind).toBe('send');
	});

	it('move の後は運ばれる物が消える', () => {
		const s = stateAt(l, 3).scene;
		expect(draw(s, { kind: 'after' }, lay).moving).toBeNull();
	});

	it('highlight はその動きから後で光る', () => {
		const s = stateAt(l, 3).scene;
		expect(draw(s, { kind: 'before' }, lay).nodes[0].highlighted).toBe(false);
		expect(draw(s, { kind: 'op', index: 0, t: 0.5 }, lay).nodes[0].highlighted).toBe(true);
		expect(draw(s, { kind: 'after' }, lay).nodes[0].highlighted).toBe(true);
	});

	it('vanish の途中は点線で薄くなり、後の図では無い', () => {
		const s = stateAt(l, 5).scene;
		const mid = draw(s, { kind: 'op', index: 0, t: 0.25 }, lay);
		const a = mid.nodes.find((x) => x.id === 'a');
		expect(a?.dashed).toBe(true);
		expect(a?.opacity).toBe(0.75);
		expect(draw(s, { kind: 'after' }, lay).nodes.map((x) => x.id)).toEqual(['b']);
	});

	it('動きを全て当て終えた絵は、後の図と同じ物を並べる', () => {
		const keep = (d: Drawing) =>
			d.nodes.filter((x) => x.opacity > 0).map((x) => [x.id, x.props.map((p) => p.v)]);
		for (const lesson of [l, git001]) {
			const layout = layoutOf(lesson);
			for (const st of lesson.explain) {
				const s = stateAt(lesson, st.n).scene;
				const last = s.motion.length - 1;
				const end = draw(s, { kind: 'op', index: last, t: 1 }, layout);
				const after = draw(s, { kind: 'after' }, layout);
				expect(keep(end)).toEqual(keep(after));
			}
		}
	});

	it('同じ段階からは同じ絵（何度描いても同じ）', () => {
		const s = stateAt(git001, 3).scene;
		const lay2 = layoutOf(git001);
		const p = { kind: 'op', index: 1, t: 0.3 } as const;
		expect(draw(s, p, lay2)).toEqual(draw(s, p, lay2));
	});
});

describe('字の幅の見積もりで切り詰める', () => {
	it('収まる物はそのまま、収まらない物は末尾を … にする', () => {
		expect(fitText('abc', 100, 10)).toBe('abc');
		expect(fitText('abcdefghij', 30, 10)).toBe('abcd…');
	});
	it('日本語の字は英数字より広く数える', () => {
		expect(fitText('あいうえおかきくけこ', 60, 10)).toBe('あいうえお…');
	});
});
