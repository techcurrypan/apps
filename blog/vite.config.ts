import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const escape = (s: string) =>
s
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/\{/g, '&#123;')
.replace(/\}/g, '&#125;');

const highlighter = (code: string, lang?: string | null) => {
const lines = code
.replace(/\n$/, '')
.split('\n')
.map((line: string) => `<span class="line">${escape(line) || ' '}</span>`)
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
