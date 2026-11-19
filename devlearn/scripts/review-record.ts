// 専門家の査読の記録を書く（explanation-standard.md 第 9 章・検査 38）。
// 使い方：npx tsx scripts/review-record.ts <レッスン ID> <記録の JSON の道>
// 記録の JSON：{ "date": "YYYY-MM-DD", "reviewer": "...", "items": ["合格", ...12 個], "rounds": [{ "date", "found": [...], "fixed": [...] }] }
// 今の本文の指紋（lessonHash）を書き足して src/lib/content/reviews/<id>.json に置く。本文が後で変わると検査 38 が落ちる。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { lessons } from '../src/lib/content/lessons.ts';
import { lessonHash } from '../src/lib/lesson/hash.ts';

const [id, from] = process.argv.slice(2);
if (!id || !from) {
	console.error('使い方：npx tsx scripts/review-record.ts <レッスン ID> <記録の JSON の道>');
	process.exit(1);
}
const l = lessons.find((x) => x.id === id);
if (!l) {
	console.error(`レッスン ${id} が無い`);
	process.exit(1);
}
const rec = JSON.parse(readFileSync(from, 'utf8')) as { items: string[] } & Record<string, unknown>;
if (rec.items.length !== 12) {
	console.error(`査読の項目が ${rec.items.length} 個。12 個にする`);
	process.exit(1);
}
const dir = join(import.meta.dirname, '../src/lib/content/reviews');
mkdirSync(dir, { recursive: true });
const out = { ...rec, hash: lessonHash(l) };
writeFileSync(join(dir, `${id}.json`), JSON.stringify(out, null, '\t') + '\n');
console.log(
	`${id}：指紋 ${out.hash} で記録した（合格 ${rec.items.filter((x) => x === '合格').length}/12）`
);
