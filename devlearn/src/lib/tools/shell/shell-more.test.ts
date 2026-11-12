// 模擬のシェルの、記録の外でも確かめておく所。本物との一致は real.test.ts で確かめる。
import { describe, expect, it } from 'vitest';
import { readFile, stat } from '../fs.ts';
import { current, start, typeLine, type Session } from '../session.ts';
import { shellCommands } from './commands.ts';
import { bashHash, envOrder } from './env.ts';
import { toRegExp } from './regex.ts';
import { shellTool, type ShellState } from './run.ts';
import { parseScript } from './script.ts';
import { learnerWorld, WORK } from './world.ts';

type S = ShellState<null>;
const tool = shellTool<null>(shellCommands<null>());
const run = (lines: string[]): Session<S> =>
	lines.reduce(typeLine, start(tool, learnerWorld(null)));
const last = (s: Session<S>) => s.entries.at(-1);

describe('正規表現（grep）', () => {
	it('BRE では | ( ) + は文字、\\| \\( \\) は働く', () => {
		expect(toRegExp('a|b', false)).toEqual({ source: 'a\\|b' });
		expect(toRegExp('a\\|b', false)).toEqual({ source: 'a|b' });
		expect(toRegExp('\\(ab\\)*', false)).toEqual({ source: '(ab)*' });
		expect(toRegExp('a+', false)).toEqual({ source: 'a\\+' });
	});
	it('ERE ではそのまま働く。閉じない [ は誤り', () => {
		expect(toRegExp('(a|b)+$', true)).toEqual({ source: '(a|b)+$' });
		expect(toRegExp('[', true)).toEqual({ error: 'Invalid regular expression' });
		expect(toRegExp('[[:digit:]]{2}', true)).toEqual({ source: '[0-9]{2}' });
	});
	it('先頭の * は文字', () => {
		expect(toRegExp('*a', false)).toEqual({ source: '\\*a' });
	});
});

describe('台本を読む', () => {
	it('if / elif / else / fi を組み立てる', () => {
		const s = parseScript(
			'if [ a ]; then\n echo 1\nelif [ b ]; then\n echo 2\nelse\n echo 3\nfi\n'
		);
		expect(s.error).toBeNull();
		expect(s.nodes).toHaveLength(1);
		const n = s.nodes[0];
		expect(n.t === 'if' && n.arms.length).toBe(2);
		expect(n.t === 'if' && n.orElse?.length).toBe(1);
	});
	it('then が無いと、fi の所で誤り（読めない行を写す）', () => {
		const s = parseScript('if [ 1 -eq 1 ]\necho x\nfi\n');
		expect(s.error).toEqual({
			line: 3,
			message: "syntax error near unexpected token `fi'",
			offending: 'fi'
		});
	});
	it('fi が無いと、終わりの次の行で誤り。誤りより前に読み終えた物は動く', () => {
		const s = parseScript('echo a\nif [ x ]; then\necho b\n');
		expect(s.error?.line).toBe(4);
		expect(s.nodes).toHaveLength(1);
	});
});

describe('環境の並び', () => {
	it('bash の箱の順（FNV-1、1024 箱）', () => {
		expect(bashHash('NAME') & 1023).toBe(244);
		expect(bashHash('LOGNAME') & 1023).toBe(260);
		const s = current(run(['export NAME=x']));
		const order = envOrder(s);
		expect(order.indexOf('NAME')).toBeLessThan(order.indexOf('LOGNAME'));
	});
});

describe('権限', () => {
	it('chmod の数と記号。誰も書かない +x は umask の外だけ', () => {
		const s = run(['touch f', 'chmod 640 f', 'chmod +x f', 'chmod o=r f', 'chmod g-w f']);
		expect(stat(current(s).fs, `${WORK}/f`)?.mode).toBe(0o754);
	});
	it('書けないファイルへの > は、命令を打たずに断る', () => {
		const s = run(['echo a > f', 'chmod 444 f', 'echo b > f']);
		expect(last(s)).toMatchObject({ err: 'bash: f: Permission denied\n', code: 1 });
		expect(readFile(current(s).fs, `${WORK}/f`)).toBe('a\n');
	});
});

describe('命令の探し方', () => {
	it('PATH の前の方にある実行できるファイルが先。組み込みは PATH より先', () => {
		const s = run([
			'mkdir -p ~/bin',
			"printf '#!/bin/bash\\necho mine\\n' > ~/bin/cat",
			"printf '#!/bin/bash\\necho mine\\n' > ~/bin/echo",
			'chmod +x ~/bin/cat ~/bin/echo',
			'export PATH="$HOME/bin:$PATH"',
			'cat',
			'echo built-in'
		]);
		expect(s.entries[5].out).toBe('mine\n');
		expect(last(s)?.out).toBe('built-in\n');
	});
	it('台本の中の誤りは「名前: line N:」で言う。変数は親に戻らない', () => {
		const s = run(["printf '%s\\n' 'X=1' 'nosuch' 'cd /nope' > t.sh", 'bash t.sh', 'echo "[$X]"']);
		expect(s.entries[1].err).toBe(
			't.sh: line 2: nosuch: command not found\nt.sh: line 3: cd: /nope: No such file or directory\n'
		);
		expect(last(s)?.out).toBe('[]\n');
	});
	it('端末で exit を打っても閉じない', () => {
		expect(last(run(['exit 3']))?.code).toBe(3);
	});
});

describe('命令の置き換え $( )', () => {
	it('標準出力の末尾の改行を落として語に入れる', () => {
		const s = run(['printf "a\\nb\\n" > f.txt', 'echo "n=$(wc -l < f.txt)"']);
		expect(last(s)?.out).toBe('n=2\n');
	});
	it('引用符の外では、答えを空白で語に分ける', () => {
		const s = run(['printf "x y\\nz\\n" > f.txt', 'printf "[%s]" $(cat f.txt)']);
		expect(last(s)?.out).toBe('[x][y][z]');
	});
	it('引用符の中では分けない', () => {
		const s = run(['printf "x y\\n" > f.txt', 'printf "[%s]" "$(cat f.txt)"']);
		expect(last(s)?.out).toBe('[x y]');
	});
	it('答えが空なら語は消える', () => {
		const s = run(['printf "[%s]" a $(printf "") b']);
		expect(last(s)?.out).toBe('[a][b]');
	});
	it('変数への代入の右では分けない', () => {
		const s = run(['printf "x y\\n" > f.txt', 'v=$(cat f.txt)', 'echo "[$v]"']);
		expect(last(s)?.out).toBe('[x y]\n');
	});
	it('中のエラー出力はそのまま出る', () => {
		const s = run(['echo "[$(cat nofile)]"']);
		expect(last(s)?.out).toBe('[]\n');
		expect(last(s)?.err).toBe('cat: nofile: No such file or directory\n');
	});
	it('閉じない $( は読めない', () => {
		const s = run(['echo $(pwd']);
		expect(last(s)?.err).toContain("unexpected EOF while looking for matching `)'");
	});
});

describe('本物にはあるが模擬が扱わない命令（D-13）', () => {
	it('set・less などは command not found でなく、模擬だと分かる日本語で返す', () => {
		for (const line of ['set -e', 'less app.log', 'vi a.txt', 'nano a.txt', 'top']) {
			const e = last(run([line]));
			const name = line.split(' ')[0];
			expect(e?.err, line).toBe(`（模擬の端末は ${name} を扱わない）\n`);
			expect(e?.code, line).toBe(2);
		}
	});
	it('台本の中でも同じ', () => {
		const s = run([
			"printf '%s\\n' '#!/bin/bash' 'set -e' 'echo after' > e.sh",
			'bash e.sh'
		]);
		expect(last(s)?.err).toBe('（模擬の端末は set を扱わない）\n');
	});
	it('本当に無い名前は、今まで通り command not found', () => {
		expect(last(run(['nosuch']))?.err).toBe('bash: nosuch: command not found\n');
	});
});
