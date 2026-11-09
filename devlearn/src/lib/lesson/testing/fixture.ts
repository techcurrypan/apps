// テスト用の、検査を全て通るレッスン。各テストはこれを複製して 1 か所だけ壊す。
import type { Lesson, Step } from '../types.ts';

function step(n: number): Step {
	const base: Step = {
		n,
		title: `段階 ${n}`,
		lead: `段階 ${n} の要約`,
		body: [`段階 ${n} で値が変わる。`, `変わった値は ${n * 10} になる。`],
		facts: [{ k: '値', v: String(n * 10) }],
		scene: [{ op: 'change', id: 'a', k: '値', v: String(n * 10) }],
		log: { t: `0.00${n}s`, from: 'a', to: 'a', kind: 'set', info: `値を ${n * 10} にした` }
	};
	if (n === 1) {
		base.scene = [{ op: 'appear', id: 'a', label: '箱 A', at: [0, 0] }, ...base.scene];
		base.why = '値を先に置かないと、変化が比べられないため';
	}
	return base;
}

export function validLesson(id = 'tst-001'): Lesson {
	return {
		id,
		field: 'tst',
		level: 1,
		title: '検査のための見本',
		goal: '値の変化を順に追うことができる',
		prereq: [],
		related: [],
		next: [],
		explain: [1, 2, 3, 4, 5].map(step),
		example: { intro: '値を見る', lines: ['$ show a', '50'] },
		practice: {
			goal: '値を 50 にする',
			tool: { name: 'show', mode: 'mock' },
			setup: { a: 0 },
			success: { a: 50 },
			mistakes: [
				{ when: '値を 5 にした', why: '桁が違う', next: '50 を入れ直す' },
				{ when: '箱 B を変えた', why: '変える箱が違う', next: '箱 A を選ぶ' }
			]
		},
		check: [
			{ ask: '箱 A の値', how: 'show a で 50 が出る' },
			{ ask: '箱 B の値', how: 'show b で 0 が出る' },
			{ ask: '変えた回数', how: '記録が 5 行ある' }
		]
	};
}

export function clone<T>(v: T): T {
	return structuredClone(v);
}
