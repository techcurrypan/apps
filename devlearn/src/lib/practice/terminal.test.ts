// 端末に描く形：復帰（CR）は行の頭に戻って上書きする。
import { describe, expect, it } from 'vitest';
import { terminalLines } from './terminal.ts';

describe('端末の行', () => {
	it('改行で分ける。末尾の改行は空の行を作らない', () => {
		expect(terminalLines('a\nb\n')).toEqual(['a', 'b']);
		expect(terminalLines('')).toEqual([]);
		expect(terminalLines('a')).toEqual(['a']);
	});
	it('CR の後の文字で、行の頭から上書きする', () => {
		expect(terminalLines('Rebasing (1/2)\rRebasing (2/2)\rSuccessfully rebased.\n')).toEqual([
			'Successfully rebased.'
		]);
		expect(terminalLines('abcdef\rXY\n')).toEqual(['XYcdef']);
	});
});
