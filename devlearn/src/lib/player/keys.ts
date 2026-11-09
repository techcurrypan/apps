// キーボードの割り当て（screen-design.md 第 6 章）。
import type { PlayerCommand } from './control.ts';

export type KeyInput = {
	key: string;
	shiftKey: boolean;
	ctrlKey: boolean;
	altKey: boolean;
	metaKey: boolean;
	inField: boolean; // 文字を打つ欄に焦点がある
};

export type KeyCommand =
	| PlayerCommand
	| { type: 'part'; dir: 1 | -1 }
	| { type: 'theme' }
	| { type: 'map' }
	| { type: 'work' }
	| { type: 'help' };

export function keyToCommand(e: KeyInput): KeyCommand | null {
	if (e.inField || e.ctrlKey || e.altKey || e.metaKey) return null;
	if (e.shiftKey && e.key === 'ArrowRight') return { type: 'part', dir: 1 };
	if (e.shiftKey && e.key === 'ArrowLeft') return { type: 'part', dir: -1 };
	switch (e.key) {
		case 'ArrowRight':
			return { type: 'next' };
		case 'ArrowLeft':
			return { type: 'prev' };
		case 'Home':
			return { type: 'first' };
		case 'End':
			return { type: 'last' };
		case 'r':
		case 'R':
			return { type: 'replay' };
		case ' ':
			return { type: 'toggleAuto' };
		case '-':
			return { type: 'slower' };
		case '+':
		case '=':
			return { type: 'faster' };
		case 't':
		case 'T':
			return { type: 'theme' };
		case 'm':
		case 'M':
			return { type: 'map' };
		case 'g':
		case 'G':
			return { type: 'work' };
		case '?':
			return { type: 'help' };
	}
	if (/^[1-9]$/.test(e.key)) return { type: 'go', n: Number(e.key) };
	return null;
}
