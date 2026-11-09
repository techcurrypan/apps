// 説明の検査 15 項目（docs/explanation-standard.md 第 3 章）。
// 各項目に、落ちる例と通る例を置く。
import { describe, expect, it } from 'vitest';
import { checkAll, checkLesson, FORBIDDEN_WORDS, sentences, type Problem } from './check.ts';
import { clone, validLesson } from './testing/fixture.ts';
import type { Lesson } from './types.ts';

const ids = (...extra: string[]) => new Set(['tst-001', ...extra]);
const failed = (problems: Problem[]) => [...new Set(problems.map((p) => p.check))].sort();
const run = (l: Lesson, known = ids()) => failed(checkLesson(l, known));

describe('見本の土台', () => {
	it('テスト用のレッスンは全項目を通る', () => {
		expect(checkLesson(validLesson(), ids())).toEqual([]);
	});
});

describe('検査 1: explain が 5〜9 ステップ', () => {
	it('4 ステップは落ちる', () => {
		const l = clone(validLesson());
		l.explain = l.explain.slice(0, 4);
		expect(run(l)).toContain(1);
	});
	it('10 ステップは落ちる', () => {
		const l = clone(validLesson());
		for (let n = 6; n <= 10; n++) {
			l.explain.push({ ...clone(l.explain[1]), n, facts: [{ k: '値', v: `z${n}` }] });
		}
		expect(run(l)).toContain(1);
	});
	it('n が 1 からの連番でなければ落ちる', () => {
		const l = clone(validLesson());
		l.explain[2].n = 7;
		expect(run(l)).toContain(1);
	});
	it('5 ステップと 9 ステップは通る', () => {
		expect(run(validLesson())).not.toContain(1);
		const l = clone(validLesson());
		for (let n = 6; n <= 9; n++) {
			l.explain.push({ ...clone(l.explain[1]), n, facts: [{ k: '値', v: `z${n}` }] });
		}
		expect(run(l)).not.toContain(1);
	});
});

describe('検査 2: facts が 1 件以上', () => {
	it('空なら落ちる', () => {
		const l = clone(validLesson());
		l.explain[1].facts = [];
		expect(run(l)).toContain(2);
	});
	it('値が空の行があれば落ちる', () => {
		const l = clone(validLesson());
		l.explain[1].facts = [{ k: '値', v: '' }];
		expect(run(l)).toContain(2);
	});
	it('1 件あれば通る', () => {
		expect(run(validLesson())).not.toContain(2);
	});
});

describe('検査 3: scene が 1 件以上', () => {
	it('空なら落ちる', () => {
		const l = clone(validLesson());
		l.explain[1].scene = [];
		expect(run(l)).toContain(3);
	});
	it('1 件あれば通る', () => {
		expect(run(validLesson())).not.toContain(3);
	});
});

describe('検査 4: log がある', () => {
	it('log が無ければ落ちる', () => {
		const l = clone(validLesson()) as unknown as { explain: Record<string, unknown>[] };
		delete l.explain[1].log;
		expect(run(l as unknown as Lesson)).toContain(4);
	});
	it('欄が空なら落ちる', () => {
		const l = clone(validLesson());
		l.explain[1].log.info = '';
		expect(run(l)).toContain(4);
	});
	it('info が 61 字なら落ちる', () => {
		const l = clone(validLesson());
		l.explain[1].log.info = 'あ'.repeat(61);
		expect(run(l)).toContain(4);
	});
	it('そろっていれば通る', () => {
		expect(run(validLesson())).not.toContain(4);
	});
});

describe('検査 5: body が 2〜4 文、1 文 60 字以内', () => {
	it('1 文は落ちる', () => {
		const l = clone(validLesson());
		l.explain[0].body = ['一文だけ。'];
		expect(run(l)).toContain(5);
	});
	it('5 文は落ちる', () => {
		const l = clone(validLesson());
		l.explain[0].body = ['一。', '二。', '三。', '四。', '五。'];
		expect(run(l)).toContain(5);
	});
	it('1 要素に 2 文を詰めても数える', () => {
		const l = clone(validLesson());
		l.explain[0].body = ['一。二。三。', '四。五。'];
		expect(run(l)).toContain(5);
	});
	it('61 字の文は落ちる', () => {
		const l = clone(validLesson());
		l.explain[0].body = ['あ'.repeat(60) + '。', '短い文。'];
		expect(run(l)).toContain(5);
	});
	it('60 字の文は通る（句点を含めて 60 字）', () => {
		const l = clone(validLesson());
		l.explain[0].body = ['あ'.repeat(59) + '。', '短い文。'];
		expect(run(l)).not.toContain(5);
	});
	it('コードの中の半角の ? や ! では文を切らない', () => {
		expect(sentences(['git status は ?? と示す。'])).toEqual(['git status は ?? と示す。']);
		expect(sentences(['ls -a! と打つ。それから進む。'])).toHaveLength(2);
	});
	it('続く終わりの記号は 1 文と数える', () => {
		expect(sentences(['本当？！次へ進む。'])).toEqual(['本当？！', '次へ進む。']);
	});
	it('閉じ括弧の前の句点で文を切らない', () => {
		const l = clone(validLesson());
		l.explain[0].body = ['「次へ。」と押す。'];
		expect(run(l)).toContain(5);
	});
	it('2 文と 4 文は通る', () => {
		const l = clone(validLesson());
		l.explain[0].body = ['一。', '二。', '三。', '四。'];
		expect(run(l)).not.toContain(5);
		expect(run(validLesson())).not.toContain(5);
	});
});

describe('検査 6: title 20 字 / lead 40 字 / goal 60 字', () => {
	it('ステップの title が 21 字なら落ちる', () => {
		const l = clone(validLesson());
		l.explain[0].title = 'あ'.repeat(21);
		expect(run(l)).toContain(6);
	});
	it('lead が 41 字なら落ちる', () => {
		const l = clone(validLesson());
		l.explain[0].lead = 'あ'.repeat(41);
		expect(run(l)).toContain(6);
	});
	it('goal が 61 字なら落ちる', () => {
		const l = clone(validLesson());
		l.goal = 'あ'.repeat(58) + 'できる';
		expect(run(l)).toContain(6);
	});
	it('レッスンの title が 41 字なら落ちる', () => {
		const l = clone(validLesson());
		l.title = 'あ'.repeat(41);
		expect(run(l)).toContain(6);
	});
	it('ちょうどの長さは通る', () => {
		const l = clone(validLesson());
		l.explain[0].title = 'あ'.repeat(20);
		l.explain[0].lead = 'あ'.repeat(40);
		l.goal = 'あ'.repeat(57) + 'できる';
		l.title = 'あ'.repeat(40);
		expect(run(l)).not.toContain(6);
	});
	it('絵文字などの合成文字も 1 字と数える', () => {
		const l = clone(validLesson());
		l.explain[0].title = '𠮷'.repeat(20);
		expect(run(l)).not.toContain(6);
	});
});

describe('検査 7: goal が「できる」で終わる', () => {
	it('「分かる」で終われば落ちる', () => {
		const l = clone(validLesson());
		l.goal = '値の変化が分かる';
		expect(run(l)).toContain(7);
	});
	it('「できる。」と句点が付いても落ちる', () => {
		const l = clone(validLesson());
		l.goal = '値の変化を追うことができる。';
		expect(run(l)).toContain(7);
	});
	it('「できる」で終われば通る', () => {
		expect(run(validLesson())).not.toContain(7);
	});
});

describe('検査 8: why が 1 件以上', () => {
	it('無ければ落ちる', () => {
		const l = clone(validLesson());
		for (const s of l.explain) delete s.why;
		expect(run(l)).toContain(8);
	});
	it('空文字だけなら落ちる', () => {
		const l = clone(validLesson());
		for (const s of l.explain) delete s.why;
		l.explain[2].why = '  ';
		expect(run(l)).toContain(8);
	});
	it('1 件あれば通る', () => {
		expect(run(validLesson())).not.toContain(8);
	});
});

describe('検査 9: 禁止語が無い', () => {
	it.each(FORBIDDEN_WORDS)('「%s」が本文にあれば落ちる', (w) => {
		const l = clone(validLesson());
		l.explain[3].body = [`ここは${w}だ。`, '次へ進む。'];
		expect(run(l)).toContain(9);
	});
	it('間違いの説明の中にあっても落ちる', () => {
		const l = clone(validLesson());
		l.practice.mistakes[0].next = '50 を入力するだけ';
		expect(run(l)).toContain(9);
	});
	it('「ご存知の通り」の書き方の揺れも落ちる', () => {
		const l = clone(validLesson());
		l.example.intro = 'ご存知の通り、値を見る';
		expect(run(l)).toContain(9);
	});
	it('無ければ通る', () => {
		expect(run(validLesson())).not.toContain(9);
	});
});

describe('検査 10: scene の id が appear 済み', () => {
	it('appear していない id を change すれば落ちる', () => {
		const l = clone(validLesson());
		l.explain[2].scene = [{ op: 'change', id: 'b', k: '値', v: '1' }];
		expect(run(l)).toContain(10);
	});
	it('後のステップで appear する id を先に使えば落ちる', () => {
		const l = clone(validLesson());
		l.explain[1].scene = [{ op: 'move', from: 'a', to: 'c', payload: 'p', kind: 'k' }];
		l.explain[3].scene.push({ op: 'appear', id: 'c', label: 'C', at: [1, 0] });
		expect(run(l)).toContain(10);
	});
	it('vanish した id を使えば落ちる', () => {
		const l = clone(validLesson());
		l.explain[2].scene = [{ op: 'vanish', id: 'a' }];
		expect(run(l)).toContain(10);
	});
	it('同じ id を 2 度 appear すれば落ちる', () => {
		const l = clone(validLesson());
		l.explain[2].scene.push({ op: 'appear', id: 'a', label: 'A', at: [0, 0] });
		expect(run(l)).toContain(10);
	});
	it('同じステップの中で先に appear していれば通る', () => {
		const l = clone(validLesson());
		l.explain[2].scene = [
			{ op: 'appear', id: 'c', label: 'C', at: [1, 0] },
			{ op: 'move', from: 'a', to: 'c', payload: 'p', kind: 'k' }
		];
		expect(run(l)).not.toContain(10);
	});
});

describe('検査 11: mistakes が 2〜4 件、3 欄が埋まる', () => {
	it('1 件は落ちる', () => {
		const l = clone(validLesson());
		l.practice.mistakes = l.practice.mistakes.slice(0, 1);
		expect(run(l)).toContain(11);
	});
	it('5 件は落ちる', () => {
		const l = clone(validLesson());
		const m = l.practice.mistakes[0];
		l.practice.mistakes = [m, m, m, m, m].map((x, i) => ({ ...x, when: `${x.when}${i}` }));
		expect(run(l)).toContain(11);
	});
	it('欄が空なら落ちる', () => {
		const l = clone(validLesson());
		l.practice.mistakes[1].next = '';
		expect(run(l)).toContain(11);
	});
	it('2 件と 4 件は通る', () => {
		expect(run(validLesson())).not.toContain(11);
		const l = clone(validLesson());
		l.practice.mistakes.push(
			{ when: 'w3', why: 'y3', next: 'n3' },
			{ when: 'w4', why: 'y4', next: 'n4' }
		);
		expect(run(l)).not.toContain(11);
	});
});

describe('検査 12: check が 3〜5 件', () => {
	it('2 件は落ちる', () => {
		const l = clone(validLesson());
		l.check = l.check.slice(0, 2);
		expect(run(l)).toContain(12);
	});
	it('6 件は落ちる', () => {
		const l = clone(validLesson());
		l.check = [...l.check, ...l.check];
		expect(run(l)).toContain(12);
	});
	it('欄が空なら落ちる', () => {
		const l = clone(validLesson());
		l.check[0].how = '';
		expect(run(l)).toContain(12);
	});
	it('3 件と 5 件は通る', () => {
		expect(run(validLesson())).not.toContain(12);
		const l = clone(validLesson());
		l.check.push({ ask: 'a4', how: 'h4' }, { ask: 'a5', how: 'h5' });
		expect(run(l)).not.toContain(12);
	});
});

describe('検査 13: prereq / related / next の ID が実在する', () => {
	it.each(['prereq', 'related', 'next'] as const)('%s に無い ID があれば落ちる', (key) => {
		const l = clone(validLesson());
		l[key] = ['zzz-999'];
		expect(run(l)).toContain(13);
	});
	it('自分自身を指せば落ちる', () => {
		const l = clone(validLesson());
		l.next = ['tst-001'];
		expect(run(l)).toContain(13);
	});
	it('実在する ID なら通る', () => {
		const l = clone(validLesson());
		l.prereq = ['tst-002'];
		l.related = ['tst-002'];
		l.next = ['tst-002'];
		expect(run(l, ids('tst-002'))).not.toContain(13);
	});
});

describe('検査 14: 各ステップに状態を変える操作がある', () => {
	it('highlight だけのステップは落ちる', () => {
		const l = clone(validLesson());
		l.explain[2].scene = [{ op: 'highlight', id: 'a' }];
		expect(run(l)).toContain(14);
	});
	it.each(['move', 'change', 'vanish'] as const)('%s があれば通る', (op) => {
		const l = clone(validLesson());
		const s = l.explain[4];
		if (op === 'move') s.scene = [{ op, from: 'a', to: 'a', payload: 'p', kind: 'k' }];
		if (op === 'change') s.scene = [{ op, id: 'a', k: '値', v: '9' }];
		if (op === 'vanish') s.scene = [{ op, id: 'a' }];
		s.scene.unshift({ op: 'highlight', id: 'a' });
		expect(run(l)).not.toContain(14);
	});
	it('appear があれば通る', () => {
		expect(run(validLesson())).not.toContain(14);
	});
});

describe('検査 15: 同じ facts の組が隣り合うステップで重複しない', () => {
	it('隣のステップと同じ k・v の行があれば落ちる', () => {
		const l = clone(validLesson());
		l.explain[2].facts = [
			{ k: '値', v: '20' },
			{ k: '別', v: 'x' }
		];
		expect(run(l)).toContain(15);
	});
	it('k が同じでも v が違えば通る', () => {
		expect(run(validLesson())).not.toContain(15);
	});
	it('隣でなければ同じ行があっても通る', () => {
		const l = clone(validLesson());
		l.explain[3].facts = [{ k: '値', v: '20' }];
		expect(run(l)).not.toContain(15);
	});
});

describe('checkAll', () => {
	it('レッスンどうしの ID を互いに知っている', () => {
		const a = clone(validLesson('tst-001'));
		const b = clone(validLesson('tst-002'));
		a.next = ['tst-002'];
		b.prereq = ['tst-001'];
		expect(checkAll([a, b])).toEqual([]);
	});
	it('ID が重複すれば落ちる', () => {
		const problems = checkAll([validLesson('tst-001'), validLesson('tst-001')]);
		expect(problems.length).toBeGreaterThan(0);
	});
	it('落ちた所が分かる文を返す', () => {
		const l = clone(validLesson());
		l.explain[1].facts = [];
		const [p] = checkAll([l]);
		expect(p.lessonId).toBe('tst-001');
		expect(p.where).toContain('2');
		expect(p.message.length).toBeGreaterThan(0);
	});
});
