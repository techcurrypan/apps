<script lang="ts">
	import { formatBuiltAt, shortCommit } from '#lib/build-info.ts';

	const commit = shortCommit(__COMMIT__);
	const builtAt = formatBuiltAt(__BUILT_AT__);
</script>

<svelte:head>
	<title>devlearn</title>
</svelte:head>

<main>
	<h1>devlearn</h1>
	<p>準備中。</p>
	<dl>
		<dt>配信されたコミット</dt>
		<dd><code data-testid="commit">{commit}</code></dd>
		<dt>組み立て日時</dt>
		<dd><code data-testid="built-at">{builtAt}</code></dd>
	</dl>
</main>

<style>
	main {
		max-width: 40rem;
		margin: 2rem auto;
		padding: 0 1rem;
		font-family: system-ui, sans-serif;
		line-height: 1.6;
	}
	dt {
		font-weight: bold;
	}
	dd {
		margin: 0 0 0.75rem 0;
	}
</style>
