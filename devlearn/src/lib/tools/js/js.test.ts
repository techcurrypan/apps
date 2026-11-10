// 本物の JavaScript を走らせる道具（docs/tools.md 3.4）。
import { describe, expect, it } from 'vitest';
import { guardLoops } from './guard.ts';
import { inspect } from './inspect.ts';
import { jsTool, runJs, type JsState } from './run.ts';
import { rewindAsync, startAsync, typeAsync } from '../session.ts';

describe('繰り返しの見張りを入れる', () => {
	it('while と for の条件、for of の繰り返す物に入れる', () => {
		expect(guardLoops('while (x) y();')).toBe('while (__g() && (x)) y();');
		expect(guardLoops('for (let i = 0; i < 3; i++) {}')).toBe(
			'for (let i = 0; __g() && (i < 3); i++) {}'
		);
		expect(guardLoops('for (;;) {}')).toBe('for (; __g() && (true);) {}');
		expect(guardLoops('for (const v of xs) {}')).toBe('for (const v of __gi(xs)) {}');
		expect(guardLoops('do { a(); } while (b)')).toBe('do { a(); } while (__g() && (b))');
	});
	it('文字・注釈・名前の一部の中の for・while には入れない', () => {
		const src = "const s = 'while (x)'; // for (;;)\nconst forward = 1; /* while(1) */ `for(${a})`";
		expect(guardLoops(src)).toBe(src);
	});
});

describe('値の見せ方（console.log）', () => {
	it('一番外の文字はそのまま、中の文字は引用符つき', () => {
		expect(inspect('hi', true)).toBe('hi');
		expect(inspect(['a', 1, true, null, undefined])).toBe("[ 'a', 1, true, null, undefined ]");
		expect(inspect({ a: 1, b: { c: [] } })).toBe('{ a: 1, b: { c: [] } }');
		expect(inspect({})).toBe('{}');
		expect(inspect(new Map([['k', 1]]))).toBe("Map(1) { 'k' => 1 }");
		expect(inspect(() => 1)).toBe('[Function (anonymous)]');
		expect(inspect(new Uint8Array([227, 129, 130]))).toBe('Uint8Array(3) [ 227, 129, 130 ]');
	});
});

describe('走らせる', () => {
	it('console.log の出力と、受け止められなかったエラー', async () => {
		expect(await runJs('let x = 1;\nx = x + 2;\nconsole.log("x は", x);')).toEqual({
			out: 'x は 3\n',
			err: '',
			code: 0
		});
		const r = await runJs('console.log(1);\nconsole.log(y);');
		expect(r.out).toBe('1\n');
		expect(r.err).toBe('Uncaught ReferenceError: y is not defined\n');
		expect(r.code).toBe(1);
	});
	it('書き方の誤りは、走らせる前に止まる', async () => {
		const r = await runJs('console.log(1;');
		expect(r.out).toBe('');
		expect(r.err).toMatch(/^Uncaught SyntaxError: /);
	});
	it('止まらない繰り返しは、決まった回数で止める（時間では決めない）', async () => {
		const r = await runJs('let n = 0;\nwhile (true) { n++; }');
		expect(r.err).toContain('繰り返しが 100000 回');
		expect(r.code).toBe(1);
	});
	it('Promise・await・setTimeout は本物の順番で、待たずに進む', async () => {
		const src = [
			"console.log('a');",
			"setTimeout(() => console.log('t2'), 20);",
			"setTimeout(() => console.log('t1'), 10);",
			"Promise.resolve().then(() => console.log('m'));",
			'await new Promise((r) => setTimeout(r, 5));',
			"console.log('b');"
		].join('\n');
		expect((await runJs(src)).out).toBe('a\nm\nb\nt1\nt2\n');
	});
	it('Math.random と Date は毎回同じ値（乱数で決めない）', async () => {
		const src = 'console.log(Math.random(), Math.random(), Date.now(), new Date().toISOString());';
		const a = await runJs(src);
		expect(a).toEqual(await runJs(src));
		expect(a.out).toContain('1794268800000 2026-11-10T00:00:00.000Z');
	});
	it('前の走りの変数は残らない（毎回、書いた物の全体を初めから走らせる）', async () => {
		await runJs('globalThis.leak = 1; var v = 2;');
		const r = await runJs('console.log(typeof v);');
		expect(r.out).toBe('undefined\n');
	});
});

describe('履歴と巻き戻し', () => {
	it('k 回目に走らせた書き物に戻れる', async () => {
		let s = startAsync(jsTool(), { code: '' } as JsState);
		s = await typeAsync(s, 'console.log(1)');
		s = await typeAsync(s, 'console.log(2)');
		expect(s.entries.map((e) => e.out)).toEqual(['1\n', '2\n']);
		s = rewindAsync(s, 1);
		expect(s.entries).toHaveLength(1);
		expect(s.entries[0].state.code).toBe('console.log(1)');
	});
});
