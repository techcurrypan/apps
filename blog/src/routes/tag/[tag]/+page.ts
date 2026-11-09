import type { PageLoad } from './$types';
import { posts, iconFor } from '../../../lib/posts';

export const load: PageLoad = ({ params }) => ({
tag: params.tag,
icon: iconFor(params.tag),
posts: posts.filter((p) => p.tags.includes(params.tag)).reverse()
});
