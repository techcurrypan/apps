import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// 段 8 の完成条件 2：状態を決める処理（src/lib/game/）に、乱数と実時間を使わない（B-4・L-5）
const dir = 'src/lib/game';
const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
const FORBIDDEN = ['Math.random', 'Date.now', 'performance.now', 'new Date'];
/** 注釈は除いて調べる（禁止の言葉を説明に書けるように） */
const codeOf = (f: string) =>
	readFileSync(`${dir}/${f}`, 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, '');

describe('状態を決める処理に乱数と実時間が無い', () => {
	it('調べるファイルがある', () => {
		expect(files).toContain('town.ts');
		expect(files).toContain('desk.ts');
	});
	for (const f of files)
		it(f, () => {
			const code = codeOf(f);
			for (const w of FORBIDDEN) expect(code.includes(w), `${f} に ${w}`).toBe(false);
		});
	it('DOM・WebGL・ブラウザの保存を知らない', () => {
		for (const f of files) {
			const code = codeOf(f);
			for (const w of ['document.', 'window.', 'localStorage', 'WebGL', 'requestAnimationFrame'])
				expect(code.includes(w), `${f} に ${w}`).toBe(false);
		}
	});
});
