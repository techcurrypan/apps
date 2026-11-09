// キーボードの割り当て（screen-design.md 第 6 章）。
import { describe, expect, it } from 'vitest';
import { keyToCommand, type KeyInput } from './keys.ts';

const k = (key: string, more: Partial<KeyInput> = {}): KeyInput => ({
	key,
	shiftKey: false,
	ctrlKey: false,
	altKey: false,
	metaKey: false,
	inField: false,
	...more
});

describe('キー', () => {
	it.each([
		['ArrowRight', { type: 'next' }],
		['ArrowLeft', { type: 'prev' }],
		['Home', { type: 'first' }],
		['End', { type: 'last' }],
		['r', { type: 'replay' }],
		['R', { type: 'replay' }],
		[' ', { type: 'toggleAuto' }],
		['-', { type: 'slower' }],
		['+', { type: 'faster' }],
		['=', { type: 'faster' }],
		['3', { type: 'go', n: 3 }],
		['t', { type: 'theme' }],
		['m', { type: 'map' }],
		['g', { type: 'work' }],
		['?', { type: 'help' }]
	])('%s', (key, cmd) => {
		expect(keyToCommand(k(key))).toEqual(cmd);
	});
	it('Shift + 矢印で段を移る', () => {
		expect(keyToCommand(k('ArrowRight', { shiftKey: true }))).toEqual({ type: 'part', dir: 1 });
		expect(keyToCommand(k('ArrowLeft', { shiftKey: true }))).toEqual({ type: 'part', dir: -1 });
	});
	it('文字を打つ欄の中では効かない', () => {
		expect(keyToCommand(k('r', { inField: true }))).toBeNull();
		expect(keyToCommand(k('ArrowRight', { inField: true }))).toBeNull();
	});
	it('Ctrl や Alt や Meta と一緒なら、ブラウザの操作を奪わない', () => {
		expect(keyToCommand(k('r', { ctrlKey: true }))).toBeNull();
		expect(keyToCommand(k('ArrowLeft', { altKey: true }))).toBeNull();
		expect(keyToCommand(k('r', { metaKey: true }))).toBeNull();
	});
	it('0 と知らないキーは無し', () => {
		expect(keyToCommand(k('0'))).toBeNull();
		expect(keyToCommand(k('x'))).toBeNull();
	});
});
