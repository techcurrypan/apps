import { allPosts, type Post } from './index.generated';

export type { Post };

const ICONS: Record<string, string> = {
'blog-setup': '📝',
k8s: '☸',
docker: '🐳',
linux: '🐧',
network: '🌐',
security: '🔒',
database: '🗄',
ai: '🤖',
cloud: '☁'
};

const LABELS: Record<string, string> = {
'blog-setup': 'ブログを作る'
};

export const posts = allPosts;

export const iconFor = (name: string) => ICONS[name] ?? '📁';
export const labelFor = (name: string) => LABELS[name] ?? name;

export const groups = [...new Set(posts.map((p) => p.series).filter(Boolean))]
.map((name) => ({
name,
label: labelFor(name),
icon: iconFor(name),
count: posts.filter((p) => p.series === name).length
}))
.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

export const tagList = [...new Set(posts.flatMap((p) => p.tags))]
  .map((tag) => ({ tag, count: posts.filter((p) => p.tags.includes(tag)).length }))
  .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

export const thumbOf = (p: Post) => p.icon || (p.series ? iconFor(p.series) : '') || '📄';

export const hueOf = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
};
