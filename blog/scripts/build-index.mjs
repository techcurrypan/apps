import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = 'src/routes/blog';
const OUT = 'src/lib/index.generated.ts';

const KEYWORDS = {
svelte: ['svelte', 'sveltekit', 'mdsvex', 'runes', 'vite'],
cloudflare: ['cloudflare', 'wrangler', 'workers', 'r2', 'd1'],
ci: ['github actions', 'ci/cd', 'workflow', '配信', 'デプロイ'],
k8s: ['kubernetes', 'k8s', 'kubectl', 'pod'],
docker: ['docker', 'dockerfile', 'コンテナ'],
git: ['git ', 'commit', 'ブランチ', 'push'],
typescript: ['typescript', 'tsconfig', '型定義'],
linux: ['linux', 'bash', 'systemd'],
network: ['dns', 'tcp', 'http', 'ネットワーク'],
security: ['tls', '証明書', 'トークン', '秘密情報'],
database: ['sql', 'データベース', 'postgres', 'sqlite'],
ai: ['llm', '機械学習', 'mcp', '生成ai']
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

const posts = walk(ROOT)
.map((file) => {
const text = readFileSync(file, 'utf8');
const fm = parseFront(text);
const slug = relative(ROOT, file).split(sep).slice(0, -1).join('/');
const lower = text.replace(/^---[\s\S]*?---/, '').toLowerCase();
const auto = Object.entries(KEYWORDS)
.filter(([, words]) => words.some((w) => lower.includes(w)))
.map(([tag]) => tag);
return {
slug,
title: fm.title ?? '(無題)',
date: String(fm.date ?? ''),
summary: fm.summary ?? '',
tags: [...new Set([...(fm.tags ?? []), ...auto])].sort()
};
})
.sort((a, b) => b.date.localeCompare(a.date));

mkdirSync('src/lib', { recursive: true });
writeFileSync(
OUT,
`// 自動生成。直接編集しない。npm run index で作り直す。\n` +
`export type Post = {\n\tslug: string;\n\ttitle: string;\n\tdate: string;\n\tsummary: string;\n\ttags: string[];\n};\n\n` +
`export const allPosts: Post[] = ${JSON.stringify(posts, null, '\t')};\n`,
'utf8'
);

console.log(`記事 ${posts.length} 本の索引を作りました。`);
