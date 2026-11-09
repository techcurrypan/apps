<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import { asset, resolve } from '$app/paths';
	import { formatBuiltAt, shortCommit } from '#lib/build-info.ts';
	import { keyToCommand } from '#lib/player/keys.ts';
	import { nextTheme, parseTheme, THEME_KEY, themeLabel, type ThemeChoice } from '#lib/theme.ts';
	import HelpDialog from '#lib/ui/HelpDialog.svelte';
	import { inField } from '#lib/ui/dom.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const commit = shortCommit(__COMMIT__);
	const builtAt = formatBuiltAt(__BUILT_AT__);

	let theme = $state<ThemeChoice>('system');
	let help = $state<HelpDialog>();

	$effect(() => {
		try {
			theme = parseTheme(localStorage.getItem(THEME_KEY));
		} catch {
			theme = 'system';
		}
	});

	function cycleTheme() {
		theme = nextTheme(theme);
		const root = document.documentElement;
		if (theme === 'system') delete root.dataset.theme;
		else root.dataset.theme = theme;
		try {
			localStorage.setItem(THEME_KEY, theme);
		} catch {
			// 保存できなくても、この画面の間は効く
		}
	}

	function onkeydown(e: KeyboardEvent) {
		const c = keyToCommand({
			key: e.key,
			shiftKey: e.shiftKey,
			ctrlKey: e.ctrlKey,
			altKey: e.altKey,
			metaKey: e.metaKey,
			inField: inField(e.target)
		});
		if (!c) return;
		if (c.type === 'theme') cycleTheme();
		else if (c.type === 'map') goto(resolve('/map'));
		else if (c.type === 'help') help?.open();
		else return;
		e.preventDefault();
	}
</script>

<svelte:window {onkeydown} />

<div class="page">
	<header class="site">
		<a class="home" href={resolve('/')}>devlearn</a>
		<nav aria-label="全体">
			<a href={resolve('/map')} aria-keyshortcuts="M">地図</a>
		</nav>
		<div class="tools">
			<button type="button" onclick={cycleTheme} aria-keyshortcuts="T">
				配色：{themeLabel(theme)}
			</button>
			<button type="button" onclick={() => help?.open()} aria-keyshortcuts="?">キー</button>
		</div>
	</header>

	<main>
		{@render children()}
	</main>

	<footer class="site">
		<span>配信：<code data-testid="commit">{commit}</code></span>
		<span>組み立て：<code data-testid="built-at">{builtAt}</code></span>
		<a href={asset('third-party-licenses.txt')}>他者の物のライセンス</a>
	</footer>
</div>

<HelpDialog bind:this={help} />

<style>
	.page {
		max-width: var(--dl-page-max);
		margin: 0 auto;
		padding: 0 var(--dl-space-4);
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}
	header.site {
		display: flex;
		align-items: center;
		gap: var(--dl-space-4);
		padding: var(--dl-space-2) 0;
		border-bottom: 1px solid var(--dl-border);
		flex-wrap: wrap;
	}
	.home {
		font-weight: 700;
		color: var(--dl-text);
		text-decoration: none;
	}
	nav a {
		color: var(--dl-text);
	}
	.tools {
		margin-left: auto;
		display: flex;
		gap: var(--dl-space-2);
	}
	main {
		flex: 1;
		padding: var(--dl-space-4) 0 var(--dl-space-8);
	}
	footer.site {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dl-space-4);
		font-size: var(--dl-text-small);
		color: var(--dl-text-muted);
		border-top: 1px solid var(--dl-border);
		padding: var(--dl-space-3) 0 var(--dl-space-8);
	}
	footer a {
		color: var(--dl-text-muted);
	}
</style>
