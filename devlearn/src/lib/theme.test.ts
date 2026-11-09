import { describe, expect, it } from 'vitest';
import { nextTheme, parseTheme, themeLabel } from './theme.ts';

describe('明暗', () => {
	it('従う → 明 → 暗 → 従う と巡る', () => {
		expect(nextTheme('system')).toBe('light');
		expect(nextTheme('light')).toBe('dark');
		expect(nextTheme('dark')).toBe('system');
	});
	it('保存された値が壊れていれば「従う」', () => {
		expect(parseTheme('dark')).toBe('dark');
		expect(parseTheme(null)).toBe('system');
		expect(parseTheme('purple')).toBe('system');
	});
	it('名前', () => {
		expect(themeLabel('system')).toBe('端末に従う');
		expect(themeLabel('light')).toBe('明');
		expect(themeLabel('dark')).toBe('暗');
	});
});
