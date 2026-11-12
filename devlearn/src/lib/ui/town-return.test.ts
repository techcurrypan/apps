// 段 9：レッスンの「次」の段に「街へ戻る」。修了すると街で使える手を、名前で示す
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import TownReturn from './TownReturn.svelte';

describe('街へ戻る', () => {
	it('街へ戻る道と、修了で増える手の名前を出す', () => {
		const { body } = render(TownReturn, { props: { lessonId: 'git-001' } });
		expect(body).toMatch(/<a[^>]*href="\/town"[^>]*>街へ戻る/);
		expect(body).toContain('記録されたかを確かめる');
		expect(body).toContain('調べる・直す');
	});
	it('街の手を持たないレッスンでも、街へ戻れる', () => {
		const { body } = render(TownReturn, { props: { lessonId: '無いレッスン' } });
		expect(body).toMatch(/<a[^>]*href="\/town"[^>]*>街へ戻る/);
		expect(body).not.toContain('使える手');
	});
});
