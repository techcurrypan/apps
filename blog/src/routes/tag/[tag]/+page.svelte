<script lang="ts">
let { data } = $props();
</script>

<h1>#{data.tag}</h1>

<ul class="posts">
{#each data.posts as post (post.slug)}
<li>
<time>{post.date}</time>
<a href="/blog/{post.slug}">{post.title}</a>
</li>
{/each}
</ul>

{#if data.posts.length === 0}
<p>この札の記事はまだありません。</p>
{/if}

<style>
.posts {
list-style: none;
padding: 0;
}

.posts li {
padding: 0.75rem 0;
border-bottom: 1px solid var(--line);
}

.posts time {
display: block;
color: var(--ink-dim);
font-size: 0.8rem;
}

.posts a {
text-decoration: none;
}
</style>
