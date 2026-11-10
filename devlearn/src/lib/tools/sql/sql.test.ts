// 本物の SQL（sql.js の SQLite）を走らせる道具（docs/tools.md 3.4）。
import { describe, expect, it } from 'vitest';
import { rewindAsync, startAsync, typeAsync } from '../session.ts';
import { formatTable, sqlTool, type SqlState } from './run.ts';

const SETUP = [
	'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price INTEGER);',
	"INSERT INTO items VALUES (1, 'apple', 120), (2, 'bread', 250), (3, 'milk', NULL);"
].join('\n');

const fresh = () => startAsync(sqlTool(), { setup: SETUP, lines: [] } as SqlState);

describe('表の形', () => {
	it('数は右、文字は左に寄せ、NULL は NULL と書く', () => {
		expect(
			formatTable(
				['id', 'name'],
				[
					[1, 'apple'],
					[10, null]
				]
			)
		).toBe(
			[
				'+----+-------+',
				'| id | name  |',
				'+----+-------+',
				'|  1 | apple |',
				'| 10 | NULL  |',
				'+----+-------+',
				''
			].join('\n')
		);
	});
});

describe('走らせる', () => {
	it('SELECT の結果を表で返す', async () => {
		const s = await typeAsync(fresh(), 'SELECT name, price FROM items WHERE price > 100;');
		expect(s.entries[0].out).toBe(
			[
				'+-------+-------+',
				'| name  | price |',
				'+-------+-------+',
				'| apple |   120 |',
				'| bread |   250 |',
				'+-------+-------+',
				''
			].join('\n')
		);
		expect(s.entries[0].code).toBe(0);
	});
	it('誤りは SQLite の言い方で返す', async () => {
		const s = await typeAsync(fresh(), 'SELEC * FROM items;');
		expect(s.entries[0]).toMatchObject({
			out: '',
			err: 'Error: near "SELEC": syntax error\n',
			code: 1
		});
		const t = await typeAsync(fresh(), 'SELECT * FROM nope;');
		expect(t.entries[0].err).toBe('Error: no such table: nope\n');
	});
	it('行を変えると、変わった行の数を出す。次の行はその後の表を見る', async () => {
		let s = await typeAsync(fresh(), 'UPDATE items SET price = 300 WHERE id = 2;');
		expect(s.entries[0].out).toBe('changes: 1\n');
		s = await typeAsync(s, 'SELECT price FROM items WHERE id = 2;');
		expect(s.entries[1].out).toContain('|   300 |');
	});
	it('制約に反する行は止まる', async () => {
		const s = await typeAsync(fresh(), "INSERT INTO items VALUES (1, 'dup', 1);");
		expect(s.entries[0].err).toBe('Error: UNIQUE constraint failed: items.id\n');
	});
	it('問い合わせの計画を木の形で返す', async () => {
		const s = await typeAsync(
			fresh(),
			"EXPLAIN QUERY PLAN SELECT * FROM items WHERE name = 'milk';"
		);
		expect(s.entries[0].out).toBe('QUERY PLAN\n`--SCAN items\n');
	});
	it('random() は毎回同じ並び（乱数で決めない）', async () => {
		const a = await typeAsync(fresh(), 'SELECT random(), random();');
		const b = await typeAsync(fresh(), 'SELECT random(), random();');
		expect(a.entries[0].out).toBe(b.entries[0].out);
	});
});

describe('履歴と巻き戻し', () => {
	it('k 件目に戻ると、その時点の表に戻る', async () => {
		let s = await typeAsync(fresh(), 'DELETE FROM items;');
		s = rewindAsync(s, 0);
		s = await typeAsync(s, 'SELECT count(*) AS n FROM items;');
		expect(s.entries[0].out).toContain('| 3 |');
	});
	it('BEGIN と ROLLBACK は、行をまたいで効く', async () => {
		let s = await typeAsync(fresh(), 'BEGIN;');
		s = await typeAsync(s, 'DELETE FROM items;');
		s = await typeAsync(s, 'ROLLBACK;');
		s = await typeAsync(s, 'SELECT count(*) AS n FROM items;');
		expect(s.entries[3].out).toContain('| 3 |');
	});
});
