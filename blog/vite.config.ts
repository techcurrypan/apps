import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import { createRequire } from 'node:module';
import { buildIndex } from './scripts/build-index.mjs';

const require = createRequire(import.meta.url);
const Prism = require('prismjs');
require('prismjs/components/prism-bash.js');
require('prismjs/components/prism-typescript.js');
require('prismjs/components/prism-json.js');
require('prismjs/components/prism-yaml.js');
require('prismjs/components/prism-markup.js');
require('prismjs/components/prism-css.js');

const escape = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const braces = (s: string) => s.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');

const highlighter = (code: string, lang?: string | null) => {
	const grammar = lang ? Prism.languages[lang] : null;
	const html = grammar ? Prism.highlight(code, grammar, lang) : escape(code);
	const lines = braces(html)
		.replace(/\n$/, '')
		.split('\n')
		.map((line: string) => `<span class="line">${line || ' '}</span>`)
		.join('');
	const label = lang ? ` data-lang="${lang}"` : '';
	return `<pre class="code"${label}><code>${lines}</code></pre>`;
};

// 記事の画像に遅延読み込みを付ける（Markdown の ![]() では指定できないため）
type HastNode = { type?: string; tagName?: string; properties?: Record<string, unknown>; children?: HastNode[] };

const lazyImages = () => (tree: HastNode) => {
	const walk = (node: HastNode) => {
		if (node.type === 'element' && node.tagName === 'img') {
			node.properties = { loading: 'lazy', decoding: 'async', ...node.properties };
		}
		for (const child of node.children ?? []) walk(child);
	};
	walk(tree);
};

// 記事の索引を作る。dev では +page.md の増減・変更を見張って作り直す。
const blogIndex = (): Plugin => ({
	name: 'blog-index',
	buildStart() {
		buildIndex({ quiet: true });
	},
	configureServer(server: ViteDevServer) {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const touch = (file: string) => {
			if (!/[/\\]\+page\.md$/.test(file)) return;
			clearTimeout(timer);
			timer = setTimeout(() => buildIndex({ quiet: true }), 50);
		};
		server.watcher.on('add', touch);
		server.watcher.on('unlink', touch);
		server.watcher.on('change', touch);
	}
});

export default defineConfig({
	plugins: [
		blogIndex(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			preprocess: [
				mdsvex({
					extensions: ['.svx', '.md'],
					highlight: { highlighter },
					rehypePlugins: [lazyImages]
				})
			],
			extensions: ['.svelte', '.svx', '.md']
		})
	]
});
