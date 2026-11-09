// 1 レッスンの 7 段（requirements.md L-1）。
export const PARTS = ['goal', 'prereq', 'explain', 'example', 'practice', 'check', 'next'] as const;
export type Part = (typeof PARTS)[number];

const LABELS: Record<Part, string> = {
	goal: '目的',
	prereq: '前提',
	explain: '解説',
	example: '例',
	practice: '実戦',
	check: '確認',
	next: '次'
};

export function partLabel(p: Part): string {
	return LABELS[p];
}

export function movePart(p: Part, dir: 1 | -1): Part {
	const i = PARTS.indexOf(p) + dir;
	return PARTS[Math.max(0, Math.min(PARTS.length - 1, i))];
}
