import { describe, expect, it } from 'vitest';
import { FIELDS, fieldName } from './fields.ts';
import { lessons } from './lessons.ts';

describe('分野', () => {
	it('curriculum.md の 11 分野がこの並びである', () => {
		expect(FIELDS.map((f) => f.id)).toEqual([
			'prg',
			'lnx',
			'net',
			'sec',
			'db',
			'git',
			'ctr',
			'cld',
			'ci',
			'ai',
			'sta'
		]);
	});
	it('全てのレッスンの分野に名前がある', () => {
		for (const l of lessons) expect(fieldName(l.field)).not.toBe(l.field);
	});
	it('知らない分野は ID のまま返す', () => {
		expect(fieldName('zzz')).toBe('zzz');
	});
});
