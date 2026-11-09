import { describe, expect, it } from 'vitest';
import { parseLine, type Word } from './parse.ts';

// 変数を展開せずに、語を文字にして見る
const show = (w: Word) => w.map((s) => ('lit' in s ? s.lit : `<${s.var}>`)).join('');

function words(line: string): string[][] {
	const r = parseLine(line);
	if ('error' in r) throw new Error(r.error);
	return r.items.map((it) => it.pipeline.commands.flatMap((c) => [c.words.map(show).join(' ')]));
}

describe('1 行を読む', () => {
	it('空白で語に分ける', () => {
		expect(words('git  commit -m first')).toEqual([['git commit -m first']]);
	});
	it('引用符の中の空白は語を分けない。単引用符の中は全てそのまま', () => {
		const r = parseLine(`printf 'hello world\\n' "a  b" 'x"y' "it's"`);
		if ('error' in r) throw new Error(r.error);
		expect(r.items[0].pipeline.commands[0].words.map(show)).toEqual([
			'printf',
			'hello world\\n',
			'a  b',
			'x"y',
			"it's"
		]);
	});
	it('二重引用符の中と外で変数を見分ける。単引用符の中は展開しない', () => {
		const r = parseLine(`echo $HOME "$USER-x" '$NO' \${A}b $? $1`);
		if ('error' in r) throw new Error(r.error);
		expect(r.items[0].pipeline.commands[0].words.map(show)).toEqual([
			'echo',
			'<HOME>',
			'<USER>-x',
			'$NO',
			'<A>b',
			'<?>',
			'<1>'
		]);
	});
	it('バックスラッシュで次の 1 字をそのままにする', () => {
		const r = parseLine(`echo a\\ b \\$X "q\\"q"`);
		if ('error' in r) throw new Error(r.error);
		expect(r.items[0].pipeline.commands[0].words.map(show)).toEqual(['echo', 'a b', '$X', 'q"q']);
	});
	it('パイプ・つなぎ（; && ||）', () => {
		const r = parseLine('cat a | sort | uniq -c && echo ok; echo x || echo y');
		if ('error' in r) throw new Error(r.error);
		expect(r.items.map((i) => i.op)).toEqual([null, '&&', ';', '||']);
		expect(r.items[0].pipeline.commands.map((c) => c.words.map(show).join(' '))).toEqual([
			'cat a',
			'sort',
			'uniq -c'
		]);
	});
	it('リダイレクト', () => {
		const r = parseLine('echo hi >> log.txt 2> err.txt > out.txt 2>&1 < in.txt');
		if ('error' in r) throw new Error(r.error);
		const c = r.items[0].pipeline.commands[0];
		expect(c.words.map(show)).toEqual(['echo', 'hi']);
		expect(c.redirects.map((x) => [x.fd, x.op, x.op === '>&' ? x.to : show(x.target)])).toEqual([
			[1, '>>', 'log.txt'],
			[2, '>', 'err.txt'],
			[1, '>', 'out.txt'],
			[2, '>&', 1],
			[0, '<', 'in.txt']
		]);
	});
	it('# から後は注釈。空の行は何もしない', () => {
		expect(words('echo a # note')).toEqual([['echo a']]);
		const r = parseLine('   ');
		expect('error' in r ? r.error : r.items).toEqual([]);
	});
	it('閉じていない引用符は誤り', () => {
		expect(parseLine(`echo 'abc`)).toHaveProperty('error');
		expect(parseLine(`echo "abc`)).toHaveProperty('error');
	});
	it('つなぎの後に命令が無いのは誤り', () => {
		expect(parseLine('echo a |')).toHaveProperty('error');
		expect(parseLine('&& echo')).toHaveProperty('error');
	});
});
