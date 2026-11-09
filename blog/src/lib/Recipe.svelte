<script lang="ts">
type Task = 'new' | 'edit' | 'del';
type Where = 'single' | 'add' | 'start';
type Line = { kind: 'cmd' | 'note' | 'md'; text: string };

const TASKS: { v: Task; l: string }[] = [
{ v: 'new', l: '記事を書く' },
{ v: 'edit', l: '記事を直す' },
{ v: 'del', l: '記事を消す' }
];

const WHERES: { v: Where; l: string }[] = [
{ v: 'single', l: '単独の記事' },
{ v: 'add', l: '連載に足す' },
{ v: 'start', l: '新しい連載をはじめる' }
];

let task = $state<Task>('new');
let where = $state<Where>('add');
let series = $state('k8s');
let no = $state(3);
let slug = $state('service');
let withImg = $state(true);
let os = $state<'win' | 'nix'>('win');

$effect(() => {
if (!/Windows/i.test(navigator.userAgent)) os = 'nix';
});

const num = $derived(where === 'start' ? 1 : Math.max(1, Math.floor(no) || 1));
const name = $derived(slug.trim() || 'post');
const group = $derived(series.trim() || 'k8s');

const folder = $derived(
where === 'single' ? name : `${group}/${String(num).padStart(2, '0')}-${name}`
);
const p = $derived(os === 'win' ? folder.replace(/\//g, '\\') : folder);

const mkdir = $derived(
os === 'win'
? `New-Item -ItemType Directory -Force static\\img\\${p}`
: `mkdir -p static/img/${p}`
);

const rmdir = $derived(
os === 'win'
? `Remove-Item -Recurse -Force src\\routes\\blog\\${p}`
: `rm -rf src/routes/blog/${p}`
);

const imgBlock: Line[] = $derived(
withImg
? [
{ kind: 'cmd', text: mkdir },
{ kind: 'note', text: '画像を入れる（1 枚 1MB 以下に縮めてから）' },
{ kind: 'note', text: '本文に次の 1 行を書く' },
{ kind: 'md', text: `![説明](/img/${folder}/pod.png)` },
{ kind: 'note', text: 'パスは /img/ から始める。相対パスでは出ない' }
]
: []
);

const tail: Line[] = [
{ kind: 'cmd', text: 'npm run dev' },
{ kind: 'note', text: '一覧に出ないときは draft: true が残っていないか見る' },
{ kind: 'cmd', text: 'npm run check' },
{ kind: 'note', text: 'found 0 errors を確認する' },
{ kind: 'cmd', text: 'npm run publish -- "何を書いたか"' }
];

const lines: Line[] = $derived.by(() => {
if (task === 'del') {
return [
{ kind: 'cmd', text: rmdir },
{ kind: 'cmd', text: 'npm run index' },
{ kind: 'cmd', text: 'npm run publish -- "記事を取り下げ"' }
];
}

if (task === 'edit') {
return [
{ kind: 'cmd', text: `code src/routes/blog/${folder}/+page.md` },
{ kind: 'note', text: '直して保存する' },
...imgBlock,
...tail
];
}

const ask: Line[] =
where === 'start'
? [
{ kind: 'note', text: '番号 … n' },
{ kind: 'note', text: `連載のフォルダ名 … ${group}` },
{ kind: 'note', text: '第 1 回として作られる' }
]
: where === 'add'
? [
{ kind: 'note', text: `番号 … 一覧から ${group} を選ぶ` },
{ kind: 'note', text: `第 ${num} 回として作られる` }
]
: [{ kind: 'note', text: '番号 … 0' }];

return [
{ kind: 'cmd', text: 'npm run new' },
...ask,
{ kind: 'note', text: '題名 … 一覧にそのまま出る' },
{ kind: 'note', text: '概要 … 一覧と検索に出る 1 行' },
{ kind: 'note', text: `${where === 'single' ? 'URL 名' : 'URL の後半'} … ${name}` },
{ kind: 'note', text: `src/routes/blog/${folder}/+page.md ができて開く` },
{ kind: 'note', text: '本文を書く' },
...imgBlock,
...tail
];
});

let copied = $state(false);

const copy = async () => {
const text = lines
.filter((l) => l.kind === 'cmd')
.map((l) => l.text)
.join('\n');
try {
await navigator.clipboard.writeText(text);
copied = true;
setTimeout(() => (copied = false), 1500);
} catch {
copied = false;
}
};
</script>

<div class="recipe">
<div class="row">
<span class="k">何をする</span>
<div class="opts">
{#each TASKS as t (t.v)}
<button class:on={task === t.v} onclick={() => (task = t.v)}>{t.l}</button>
{/each}
</div>
</div>

<div class="row">
<span class="k">どこに</span>
<div class="opts">
{#each WHERES as w (w.v)}
<button class:on={where === w.v} onclick={() => (where = w.v)}>{w.l}</button>
{/each}
</div>
</div>

<div class="row">
<span class="k">環境</span>
<div class="opts">
<button class:on={os === 'win'} onclick={() => (os = 'win')}>Windows</button>
<button class:on={os === 'nix'} onclick={() => (os = 'nix')}>Mac・Linux</button>
</div>
</div>

<div class="row">
<span class="k">名前</span>
<div class="opts">
{#if where !== 'single'}
<label>連載 <input bind:value={series} size="8" /></label>
{/if}
{#if where === 'add'}
<label>第 <input type="number" bind:value={no} min="1" max="99" class="n" /> 回</label>
{/if}
<label>URL <input bind:value={slug} size="10" /></label>
</div>
</div>

{#if task !== 'del'}
<div class="row">
<span class="k">画像</span>
<div class="opts">
<button class:on={withImg} onclick={() => (withImg = true)}>貼る</button>
<button class:on={!withImg} onclick={() => (withImg = false)}>貼らない</button>
</div>
</div>
{/if}

<div class="out">
<button class="copy" onclick={copy}>{copied ? 'コピーした' : 'コピー'}</button>
{#each lines as l}
{#if l.kind === 'note'}
<p class="note">{l.text}</p>
{:else}
<p class="cmd" class:md={l.kind === 'md'}>{l.text}</p>
{/if}
{/each}
</div>
</div>

<style>
.recipe {
margin: 2rem 0;
border: 1px solid var(--line);
border-radius: 12px;
overflow: hidden;
background: var(--surface);
}

.row {
display: flex;
flex-wrap: wrap;
align-items: center;
gap: 0.5rem;
padding: 0.6rem 0.9rem;
border-bottom: 1px solid var(--line);
}

.k {
flex: 0 0 4rem;
font-size: 0.75rem;
font-weight: 700;
color: var(--ink-dim);
letter-spacing: 0.08em;
}

.opts {
display: flex;
flex-wrap: wrap;
align-items: center;
gap: 0.4rem;
}

button {
font: inherit;
font-size: 0.8rem;
line-height: 1.4;
padding: 0.25rem 0.7rem;
border: 1px solid var(--line);
border-radius: 999px;
background: var(--bg);
color: var(--ink-soft);
cursor: pointer;
}

button:hover {
border-color: var(--accent);
color: var(--accent);
}

button.on {
background: var(--accent-soft);
border-color: var(--accent);
color: var(--accent);
font-weight: 600;
}

label {
font-size: 0.78rem;
color: var(--ink-dim);
}

input {
font-family: var(--mono);
font-size: 0.8rem;
padding: 0.2rem 0.4rem;
border: 1px solid var(--line);
border-radius: 6px;
background: var(--bg);
color: var(--ink);
}

input.n {
width: 3.2rem;
}

.out {
position: relative;
padding: 0.9rem 0.9rem 1rem;
background: var(--bg);
}

.out p {
margin: 0;
line-height: 1.8;
}

.cmd {
font-family: var(--mono);
font-size: 0.82rem;
color: var(--ink);
overflow-x: auto;
white-space: pre;
}

.cmd::before {
content: "$ ";
color: var(--ink-dim);
}

.cmd.md::before {
content: "› ";
}

.note {
font-size: 0.78rem;
color: var(--ink-dim);
padding-left: 1.1rem;
}

.copy {
position: absolute;
top: 0.5rem;
right: 0.5rem;
font-size: 0.7rem;
padding: 0.15rem 0.6rem;
}

@media (max-width: 30rem) {
.k {
flex: 0 0 100%;
}
}
</style>
