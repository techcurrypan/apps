// 明暗の設定（screen-design.md 第 7 章）。保存はブラウザ内。
export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_KEY = 'devlearn.theme';

const ORDER: readonly ThemeChoice[] = ['system', 'light', 'dark'];

export function nextTheme(t: ThemeChoice): ThemeChoice {
	return ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];
}

export function parseTheme(v: string | null): ThemeChoice {
	return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

export function themeLabel(t: ThemeChoice): string {
	return t === 'system' ? '端末に従う' : t === 'light' ? '明' : '暗';
}
