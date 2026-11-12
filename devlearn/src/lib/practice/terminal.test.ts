// 端末に描く形：復帰（CR）は行の頭に戻って上書きする。字の飾り（太字・押せる印）は飾りとして読む。
import { describe, expect, it } from 'vitest';
import { plainLine, screenLines, terminalLines, terminalSpans } from './terminal.ts';

const ESC = String.fromCharCode(27);
const BOLD = (t: string) => `${ESC}[1m${t}${ESC}[0m`;
const LINK = (url: string, t: string) => `${ESC}]8;;${url}${ESC}\\${t}${ESC}]8;;${ESC}\\`;

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
	it('行の終わりの CR（HTTP の見出し）は、何も上書きしない', () => {
		expect(terminalLines('HTTP/1.1 200 OK\r\nServer: x\r\n\r\nbody\n')).toEqual([
			'HTTP/1.1 200 OK',
			'Server: x',
			'',
			'body'
		]);
	});
});

describe('字の飾り（curl が端末に出す太字と押せる印）', () => {
	it('太字の印で囲んだ所は太字の片、残りはふつうの片', () => {
		expect(terminalSpans(`${BOLD('Server')}: yorozu-web/1.0`)).toEqual([
			{ text: 'Server', bold: true },
			{ text: ': yorozu-web/1.0', bold: false }
		]);
	});
	it('押せる印は、見える字だけを残し、行き先を添える', () => {
		const line = `${BOLD('Location')}: ${LINK('http://shop.example.com/new', 'http://shop.example.com/new')}`;
		expect(terminalSpans(line)).toEqual([
			{ text: 'Location', bold: true },
			{ text: ': ', bold: false },
			{ text: 'http://shop.example.com/new', bold: false, link: 'http://shop.example.com/new' }
		]);
	});
	it('前の行の押せる印の閉じが、次の行の頭に来ても読める', () => {
		expect(terminalSpans(`${ESC}]8;;${ESC}\\${BOLD('Content-Length')}: 53`)).toEqual([
			{ text: 'Content-Length', bold: true },
			{ text: ': 53', bold: false }
		]);
	});
	it('飾りを外した字だけの行', () => {
		expect(plainLine(`${BOLD('Location')}: ${LINK('http://a/', 'http://a/')}`)).toBe(
			'Location: http://a/'
		);
		expect(plainLine('ふつうの行')).toBe('ふつうの行');
	});
});

describe('画面に見える行（例の行と比べる形）', () => {
	it('CR を解き、飾りを外す', () => {
		expect(screenLines(`HTTP/1.1 301 Moved\r\n${BOLD('Location')}: x\r\n\r\nbody\n`)).toEqual([
			'HTTP/1.1 301 Moved',
			'Location: x',
			'',
			'body'
		]);
	});
});
