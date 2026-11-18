import { describe, expect, it } from 'vitest';
import { FIELDS, fieldName } from './fields.ts';
import { lessons } from './lessons.ts';

describe('分野', () => {
	it('curriculum-standard.md 第 3 章の 13 分野がこの並びである（k8s・sys は第 2 版で足した）', () => {
		expect(FIELDS.map((f) => f.id)).toEqual([
			'prg',
			'lnx',
			'net',
			'sec',
			'db',
			'git',
			'ctr',
			'k8s',
			'cld',
			'sys',
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
