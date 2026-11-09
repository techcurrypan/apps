import { posts, groups } from '../../lib/posts';
import { SITE } from '../../lib/site';

export const prerender = true;

export async function GET() {
const tags = [...new Set(posts.flatMap((p) => p.tags))];

const urls = [
{ loc: SITE.url, lastmod: posts[0]?.date },
{ loc: `${SITE.url}/blog`, lastmod: posts[0]?.date },
...groups.map((g) => ({ loc: `${SITE.url}/series/${g.name}`, lastmod: posts[0]?.date })),
...tags.map((t) => ({ loc: `${SITE.url}/tag/${t}`, lastmod: posts[0]?.date })),
...posts.map((p) => ({ loc: `${SITE.url}/blog/${p.slug}`, lastmod: p.date }))
];

const body = urls
.map(
(u) =>
`<url>
<loc>${u.loc}</loc>${u.lastmod ? `
<lastmod>${u.lastmod}</lastmod>` : ''}
</url>`
)
.join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;

return new Response(xml, {
headers: { 'content-type': 'application/xml; charset=utf-8' }
});
}
