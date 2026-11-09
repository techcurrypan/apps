import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { execSync } from 'node:child_process';

const rl = createInterface({ input: stdin, output: stdout });
const title = (await rl.question('題名: ')).trim();
const summary = (await rl.question('概要（1 行）: ')).trim();
let slug = (await rl.question('URL 名（英字。連載は k8s/01-pod のように）: ')).trim();
rl.close();

const today = new Date().toISOString().slice(0, 10);
if (!slug) slug = `post-${today.replace(/-/g, '')}`;

const dir = `src/routes/blog/${slug}`;
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
console.log('書き終えたら npm run publish -- "コミットの説明"');
try {
execSync(`code "${file}"`, { stdio: 'ignore' });
} catch {
console.log('（VS Code を自動で開けませんでした。手で開いてください）');
}
