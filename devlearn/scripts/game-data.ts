// src/lib/game/data.ts を、game-design.md と curriculum.md の表から書く。
//   npx tsx scripts/game-data.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { parseGameData } from '../src/lib/game/data-parse.ts';

const d = parseGameData(
	readFileSync('docs/game-design.md', 'utf8'),
	readFileSync('docs/curriculum.md', 'utf8')
);
const head = `// 書き出した物。手で直さない。元は docs/game-design.md 第 8・9 章と docs/curriculum.md 第 5 章。
// 作り直すとき: npx tsx scripts/game-data.ts（data.test.ts が文書と一致することを確かめる）
import type { CauseRow, GroupRow, MoveRow } from './data-parse.ts';
`;
const body = [
	`export const MOVES: readonly MoveRow[] = ${JSON.stringify(d.moves, null, '\t')};`,
	`export const CAUSES: readonly CauseRow[] = ${JSON.stringify(d.causes, null, '\t')};`,
	`export const GROUPS: readonly GroupRow[] = ${JSON.stringify(d.groups, null, '\t')};`,
	`export const TITLES: Readonly<Record<string, string>> = ${JSON.stringify(d.titles, null, '\t')};`
].join('\n\n');
writeFileSync('src/lib/game/data.ts', head + '\n' + body + '\n');
console.log(
	`手 ${d.moves.length} ・ 原因 ${d.causes.length} ・ 症状 ${d.groups.length} ・ 題 ${Object.keys(d.titles).length}`
);
