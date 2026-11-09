import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = 'src/routes/blog';
const OUT = 'src/lib/index.generated.ts';

const KEYWORDS = {
svelte: ['svelte', 'sveltekit', 'mdsvex', 'runes'],
cloudflare: ['cloudflare', 'wrangler', 'workers'],
ci: ['github actions', 'ci/cd', 'workflow'],
k8s: ['kubernetes', 'kubectl'],
docker: ['docker', 'dockerfile'],
git: ['git commit', 'git push', 'ブランチ'],
typescript: ['typescript', 'tsconfig'],
linux: ['linux', 'systemd'],
network: ['dns', 'tcp/ip', 'ネットワーク'],
security: ['tls', '証明書', '秘密情報'],
database: ['sql', 'データベース'],
ai: ['llm', '機械学習', 'mcp']
};

const walk = (dir) => {
const out = [];
for (const name of readdirSync(dir)) {
const p = join(dir, name);
if (statSync(p).isDirectory()) out.push(...walk(p));
else if (name === '+page.md') out.push(p);
}
return out;
};

const unquote = (s) => s.replace(/^['"]/, '').replace(/['"]$/, '');

const parseFront = (text) => {
const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!m) return {};
const data = {};
for (const line of m[1].split(/\r?\n/)) {
const i = line.indexOf(':');
if (i < 0) continue;
const key = line.slice(0, i).trim();
const value = line.slice(i + 1).trim();
if (value.startsWith('[')) {
data[key] = value
.slice(1, -1)
.split(',')
.map((s) => unquote(s.trim()))
.filter(Boolean);
} else {
data[key] = unquote(value);
}
}
return data;
};

const countOf = (text, word) => text.split(word).length - 1;

const posts = walk(ROOT)
.map((file) => {
const text = readFileSync(file, 'utf8');
const fm = parseFront(text);
const parts = relative(ROOT, file).split(sep).slice(0, -1);
const raw = text.replace(/^---[\s\S]*?---/, '');
const body = raw.toLowerCase();
const plain = raw.replace(/```[\s\S]*?```/g, '').replace(/[#>*`\-|]/g, '');
const minutes = Math.max(1, Math.round(plain.replace(/\s/g, '').length / 500));
const auto = Object.entries(KEYWORDS)
.filter(([, words]) => words.reduce((n, w) => n + countOf(body, w), 0) >= 3)
.map(([tag]) => tag);
return {
slug: parts.join('/'),
series: parts.length > 1 ? parts[0] : '',
title: fm.title ?? '(無題)',
date: String(fm.date ?? ''),
summary: fm.summary ?? '',
icon: fm.icon ?? '',
cover: fm.cover ?? '',
minutes,
tags: [...new Set([...(fm.tags ?? []), ...auto])].sort()
};
})
.sort((a, b) => b.date.localeCompare(a.date));

mkdirSync('src/lib', { recursive: true });
writeFileSync(
OUT,
`// 自動生成。直接編集しない。npm run index で作り直す。\n` +
`export type Post = {\n\tslug: string;\n\tseries: string;\n\ttitle: string;\n\tdate: string;\n\tsummary: string;\n\ticon: string;\n\tcover: string;\n\tminutes: number;\n\ttags: string[];\n};\n\n` +
`export const allPosts: Post[] = ${JSON.stringify(posts, null, '\t')};\n`,
'utf8'
);

console.log(`記事 ${posts.length} 本の索引を作りました。`);
