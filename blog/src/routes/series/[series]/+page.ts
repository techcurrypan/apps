import type { PageLoad } from './$types';
import { posts, iconFor, labelFor } from '../../../lib/posts';

export const load: PageLoad = ({ params }) => ({
name: params.series,
label: labelFor(params.series),
icon: iconFor(params.series),
posts: posts.filter((p) => p.series === params.series).reverse()
});
