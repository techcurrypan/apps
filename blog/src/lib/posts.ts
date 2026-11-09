import { allPosts, type Post } from './index.generated';

export type { Post };

const ICONS: Record<string, string> = {
svelte: '🔶',
cloudflare: '🟠',
ci: '🔁',
k8s: '☸',
docker: '🐳',
git: '🌿',
typescript: '🟦',
linux: '🐧',
network: '🌐',
security: '🔒',
database: '🗄',
ai: '🤖'
};

export const posts = allPosts;

export const iconFor = (tag: string) => ICONS[tag] ?? '＃';

export const groups = [...new Set(posts.flatMap((p) => p.tags))]
.map((tag) => ({
tag,
icon: iconFor(tag),
count: posts.filter((p) => p.tags.includes(tag)).length
}))
.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
