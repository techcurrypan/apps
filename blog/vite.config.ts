import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Prism = require('prismjs');
require('prismjs/components/prism-bash.js');
require('prismjs/components/prism-typescript.js');
require('prismjs/components/prism-json.js');
require('prismjs/components/prism-yaml.js');
require('prismjs/components/prism-markup.js');
require('prismjs/components/prism-css.js');

const escape = (s: string) =>
s
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;');

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

export default defineConfig({
plugins: [
sveltekit({
compilerOptions: {
runes: ({ filename }) =>
filename.split(/[/\\]/).includes('node_modules') ? undefined : true
},
adapter: adapter(),
preprocess: [
mdsvex({
extensions: ['.svx', '.md'],
highlight: { highlighter }
})
],
extensions: ['.svelte', '.svx', '.md']
})
]
});
