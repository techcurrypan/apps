// curriculum.md 第 5 章のレッスン一覧の表を読む。書いたレッスンが表と合っているかを確かめる（curriculum.test.ts）のと、
// 知識グラフをレッスンのデータに写す（scripts/graph-sync.ts）のに使う。
export type CurriculumRow = {
	id: string;
	level: number;
	title: string;
	goal: string;
	/** 形（calc など）か、道具（js:本物 など） */
	practice: string;
	prereq: string[];
	related: string[];
	next: string[];
};

const cells = (line: string) =>
	line
		.replace(/^\|/, '')
		.replace(/\|\s*$/, '')
		.split('|')
		.map((c) => c.trim());
const list = (c: string) => (c === '—' ? [] : c.split(',').map((x) => x.trim()));

export function parseCurriculum(md: string): CurriculumRow[] {
	const lines = md.split(/\r?\n/);
	const start = lines.findIndex((l) => l.startsWith('## 5.'));
	const end = lines.findIndex((l, i) => i > start && /^## \d/.test(l));
	const rows: CurriculumRow[] = [];
	for (const l of lines.slice(start, end)) {
		if (!/^\| [a-z]+-\d{3} \| [123] \|/.test(l)) continue;
		const [id, level, title, goal, practice, prereq, related, next] = cells(l);
		rows.push({
			id,
			level: Number(level),
			title,
			goal,
			practice,
			prereq: list(prereq),
			related: list(related),
			next: list(next)
		});
	}
	return rows;
}

/** 表の practice の欄を、レッスンの practice の形にした物（js:本物 → js:real） */
export function practiceKey(p: { tool?: { name: string; mode: string }; form?: string }): string {
	if (p.tool) return `${p.tool.name}:${p.tool.mode === 'real' ? '本物' : '模擬'}`;
	return p.form ?? '';
}
