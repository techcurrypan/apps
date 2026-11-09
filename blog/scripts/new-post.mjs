import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { execSync } from 'node:child_process';

const ROOT = 'src/routes/blog';
const rl = createInterface({ input: stdin, output: stdout });

const isPost = (dir) => existsSync(join(dir, '+page.md'));

const entries = existsSync(ROOT)
? readdirSync(ROOT).filter((n) => statSync(join(ROOT, n)).isDirectory())
: [];

const seriesList = entries
.filter((n) => !isPost(join(ROOT, n)))
.map((n) => {
const dir = join(ROOT, n);
const children = readdirSync(dir).filter(
(c) => statSync(join(dir, c)).isDirectory() && isPost(join(dir, c))
);
const nums = children
.map((c) => Number((c.match(/^(\d+)-/) ?? [])[1]))
.filter((v) => Number.isFinite(v));
return { name: n, count: children.length, next: (nums.length ? Math.max(...nums) : children.length) + 1 };
});

console.log('');
console.log('どこに書きますか。');
console.log('  0) 単独の記事（連載にしない）');
seriesList.forEach((s, i) => {
console.log(`  ${i + 1}) ${s.name}  （${s.count} 本 → 第 ${s.next} 回）`);
});
console.log('  n) 新しい連載をはじめる');
console.log('');

const choice = (await rl.question('番号: ')).trim().toLowerCase();

let slug = '';
let partNo = 0;
let seriesName = '';

if (choice === 'n') {
seriesName = (await rl.question('連載のフォルダ名（英字。例 k8s）: ')).trim();
partNo = 1;
} else if (choice !== '0' && choice !== '') {
const picked = seriesList[Number(choice) - 1];
if (!picked) {
console.error('その番号はありません。');
process.exit(1);
}
seriesName = picked.name;
partNo = picked.next;
}

const title = (await rl.question('題名: ')).trim();
const summary = (await rl.question('概要（1 行）: ')).trim();

if (seriesName) {
const short = (await rl.question('URL の後半（英字。例 rss）: ')).trim() || `part${partNo}`;
slug = `${seriesName}/${String(partNo).padStart(2, '0')}-${short}`;
} else {
slug = (await rl.question('URL 名（英字）: ')).trim();
}

rl.close();

const today = new Date().toISOString().slice(0, 10);
if (!slug) slug = `post-${today.replace(/-/g, '')}`;

const dir = `${ROOT}/${slug}`;
if (existsSync(dir)) {
console.error(`すでにあります: ${dir}`);
process.exit(1);
}

const q = (s) => s.replace(/'/g, "''");

mkdirSync(dir, { recursive: true });
const file = `${dir}/+page.md`;
writeFileSync(
file,
`---\ntitle: '${q(title)}'\ndate: '${today}'\nsummary: '${q(summary)}'\n---\n\n`,
'utf8'
);

execSync('node scripts/build-index.mjs', { stdio: 'inherit' });

console.log('');
console.log(`作成しました: ${file}`);
console.log(`URL: /blog/${slug}`);
console.log('書き終えたら npm run publish -- "コミットの説明"');
try {
execSync(`code "${file}"`, { stdio: 'ignore' });
} catch {
console.log('（VS Code を自動で開けませんでした。手で開いてください）');
}
