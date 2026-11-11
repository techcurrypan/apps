// game-design.md 第 8 章（163 本の手）・第 9 章（原因と症状）と、curriculum.md 第 5 章（レッスンの題）を、
// ゲームの決まったデータにする。scripts/game-data.ts が src/lib/game/data.ts を書き、data.test.ts が文書と一致することを確かめる。

export type MoveRow = { lesson: string; name: string; tests: string[]; fixes: string[] };
export type CauseRow = { id: string; label: string; restartable: boolean };
export type GroupRow = {
	id: string;
	week: number;
	client: string;
	symptom: string;
	weight: number;
	doubt: number;
	causes: string[];
};
export type GameData = {
	moves: MoveRow[];
	causes: CauseRow[];
	groups: GroupRow[];
	titles: Record<string, string>;
};

const cells = (line: string) =>
	line
		.replace(/^\|/, '')
		.replace(/\|\s*$/, '')
		.split('|')
		.map((c) => c.trim());
const list = (c: string) => (c === '—' ? [] : c.split(',').map((x) => x.trim()));

/** 見出し（## の行）から次の同じ深さの見出しまで */
function section(md: string, head: string): string[] {
	const lines = md.split(/\r?\n/);
	const i = lines.findIndex((l) => l.startsWith(head));
	if (i < 0) throw new Error('見出しが無い: ' + head);
	const depth = head.split(' ')[0];
	const out: string[] = [];
	for (let k = i + 1; k < lines.length; k++) {
		const l = lines[k];
		if (/^#{1,6} /.test(l) && l.split(' ')[0].length <= depth.length) break;
		out.push(l);
	}
	return out;
}

export function parseGameData(gameDesign: string, curriculum: string): GameData {
	const moves: MoveRow[] = [];
	for (const l of section(gameDesign, '## 8.'))
		if (/^\| [a-z]+-\d{3} \|/.test(l)) {
			const [lesson, name, t, f] = cells(l);
			moves.push({ lesson, name, tests: list(t), fixes: list(f) });
		}
	const causes: CauseRow[] = [];
	for (const l of section(gameDesign, '### 9.1'))
		if (/^\| c-/.test(l)) {
			const [id, label, r] = cells(l);
			causes.push({ id, label, restartable: r === '○' });
		}
	const groups: GroupRow[] = [];
	for (const l of section(gameDesign, '### 9.2'))
		if (/^\| G\d\d \|/.test(l)) {
			const [id, w, client, symptom, weight, doubt, cs] = cells(l);
			groups.push({
				id,
				week: Number(w),
				client,
				symptom,
				weight: Number(weight),
				doubt: Number(doubt),
				causes: list(cs)
			});
		}
	const titles: Record<string, string> = {};
	for (const l of section(curriculum, '## 5.'))
		if (/^\| [a-z]+-\d{3} \| \d \|/.test(l)) {
			const c = cells(l);
			titles[c[0]] = c[2];
		}
	return { moves, causes, groups, titles };
}
