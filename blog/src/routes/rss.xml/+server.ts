import { posts } from '../../lib/posts';
import { SITE } from '../../lib/site';

const esc = (s: string) =>
s
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;');

export const prerender = true;

export async function GET() {
const items = posts
.map(
(p) =>
`<item>
<title>${esc(p.title)}</title>
<link>${SITE.url}/blog/${p.slug}</link>
<guid isPermaLink="true">${SITE.url}/blog/${p.slug}</guid>
<description>${esc(p.summary)}</description>
<pubDate>${new Date(p.date + 'T00:00:00Z').toUTCString()}</pubDate>
</item>`
)
.join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(SITE.name)}</title>
<link>${SITE.url}</link>
<description>${esc(SITE.description)}</description>
<language>ja</language>
<atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`;

return new Response(xml, {
headers: { 'content-type': 'application/xml; charset=utf-8' }
});
}
