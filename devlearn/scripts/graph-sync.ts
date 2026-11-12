// 知識グラフ（推奨前提・関連・次に学ぶとよい）を、curriculum.md 第 5 章の表からレッスンのデータに写す。
// 書いてあるレッスン（src/lib/content/lessons/*.ts）への線だけを写す。全て書けば表と同じになる。
// 使い方: npx tsx scripts/graph-sync.ts（curriculum.test.ts が、写した結果と表が合うことを確かめる）
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseCurriculum } from '../src/lib/content/curriculum-parse.ts';

const dir = 'src/lib/content/lessons';
const rows = parseCurriculum(readFileSync('docs/curriculum.md', 'utf8'));
const files = readdirSync(dir).filter((f) => /^[a-z]+-\d{3}\.ts$/.test(f));
const written = new Set(files.map((f) => f.replace(/\.ts$/, '')));
const fmt = (ids: string[]) =>
	`[${ids
		.filter((x) => written.has(x))
		.map((x) => `'${x}'`)
		.join(', ')}]`;

let changed = 0;
for (const f of files) {
	const id = f.replace(/\.ts$/, '');
	const r = rows.find((x) => x.id === id);
	if (!r) throw new Error(`表に無いレッスン: ${id}`);
	const path = `${dir}/${f}`;
	const src = readFileSync(path, 'utf8');
	const out = src
		.replace(/^(\t)prereq: \[[^\]]*\],/m, `$1prereq: ${fmt(r.prereq)},`)
		.replace(/^(\t)related: \[[^\]]*\],/m, `$1related: ${fmt(r.related)},`)
		.replace(/^(\t)next: \[[^\]]*\],/m, `$1next: ${fmt(r.next)},`);
	if (out !== src) {
		writeFileSync(path, out);
		changed++;
	}
}
console.log(`graph-sync: ${files.length} 本を見て、${changed} 本を書き直した`);
