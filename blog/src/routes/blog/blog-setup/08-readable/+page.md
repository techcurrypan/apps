---
title: '無料でブログを作る (8) 読みやすくする'
date: '2026-11-07'
summary: コードの色分けと行番号、コピー釦、追従する目次、ダークモード、アイキャッチ、検索。殺風景な技術ブログを読める形にするまで。
tags: ['svelte', 'css']
---

ここまでで中身は公開できる。ただ、真っ白な背景に文字が並んでいるだけで読みにくかった。

**この回が終わると**、コードが色分けされ、目次が追従し、配色を切り替えられる。

**前提**: 第 7 回まで。索引が使える状態であること。

## コードの色分け

**Prism** を使う。組み立てのときに色分けを済ませてしまうので、読む人のブラウザでは何も実行されない。

```bash
npm i -D prismjs
```

`vite.config.ts` で、mdsvex に色分けの関数を渡す。

```typescript
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Prism = require('prismjs');
require('prismjs/components/prism-bash.js');
require('prismjs/components/prism-typescript.js');
require('prismjs/components/prism-json.js');
require('prismjs/components/prism-yaml.js');
require('prismjs/components/prism-css.js');
```

`createRequire` を使っているのは、Prism が古い形式の部品で、新しい取り込み方では読めないため。

### 中括弧を逃がす

ここが重要なところ。色分けした結果の HTML は、最終的に Svelte のページに入る。**Svelte は中括弧を式として解釈する**ので、コードの中の中括弧がそのまま残っていると組み立てが失敗する。

```typescript
const braces = (s: string) =>
	s.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
```

文字参照に置き換えておく。表示は元のままで、Svelte には解釈されない。

これを入れるまで、JSON や TypeScript を貼った記事が全部組み立てで落ちていた。

### 行番号

行番号用の要素を Prism が作ってくれるわけではないので、1 行ずつ包む。

```typescript
const lines = braces(html)
	.replace(/\n$/, '')
	.split('\n')
	.map((line: string) => `<span class="line">${line || ' '}</span>`)
	.join('');
```

空行は半角空白に置き換える。そうしないと高さが潰れて行番号がずれる。

番号は CSS の `counter` で出す。HTML に数字を入れないので、コピーしたときに番号が付いてこない。

```css
pre.code code {
	counter-reset: line;
}
pre.code .line {
	display: block;
	counter-increment: line;
}
pre.code .line::before {
	content: counter(line);
	display: inline-block;
	width: 2.5em;
	text-align: right;
	margin-right: 1em;
	opacity: 0.35;
	user-select: none;
}
```

`user-select: none` で、範囲選択しても番号が入らないようにする。

### 言語の表示

色分けの関数で、言語名を属性として付けておく。

```typescript
const label = lang ? ` data-lang="${lang}"` : '';
return `<pre class="code"${label}><code>${lines}</code></pre>`;
```

CSS で右上に出す。何の言語なのかが分かる。

## コピー釦

記事のページが表示された後に、コードブロックを探して釦を足す。Markdown 側には何も書かない。

```typescript
$effect(() => {
	for (const pre of document.querySelectorAll('pre.code')) {
		if (pre.querySelector('.copy')) continue;
		const b = document.createElement('button');
		b.className = 'copy';
		b.textContent = 'コピー';
		b.onclick = async () => {
			await navigator.clipboard.writeText(pre.textContent ?? '');
			b.textContent = 'コピーした';
			setTimeout(() => (b.textContent = 'コピー'), 1200);
		};
		pre.appendChild(b);
	}
});
```

`continue` で二重に付くのを防ぐ。これが無いと、ページを移動するたびに釦が増える。

## 追従する目次

見出しに `id` を振り、一覧を作り、今どこを読んでいるかを印す。

### 見出しに id を振る

Markdown の見出しには `id` が付かないので、表示後に付ける。

```typescript
const els = [...document.querySelectorAll('article h2, article h3')];
els.forEach((el, i) => {
	if (!el.id) el.id = `h-${i}`;
});
headings = els.map((el) => ({ id: el.id, text: el.textContent ?? '', level: el.tagName }));
```

### 今読んでいる所を出す

スクロールのたびに、**画面の上から 140px の線を最後に越えた見出し**を現在位置とする。

```typescript
const onScroll = () => {
	let cur = els[0].id;
	for (const el of els) {
		if (el.getBoundingClientRect().top <= 140) cur = el.id;
	}
	active = cur;
};
```

上から順に見て、線より上にあるものを上書きしていくだけ。交差監視の API を使う方法もあるが、こちらの方が挙動が素直だった。

<figure class="fig">
<svg viewBox="0 0 440 248" role="img" aria-label="画面の上から 140px の線を最後に越えた見出しを、現在位置として目次に印す">
<rect class="fig-box" x="12" y="14" width="256" height="222" rx="8"/><text class="fig-t-xs" x="22" y="32" text-anchor="start">画面</text><line class="fig-a" x1="28" y1="62" x2="176" y2="62"/><text class="fig-t-s" x="32" y="56" text-anchor="start">見出し A</text><line class="fig-a" x1="28" y1="112" x2="176" y2="112"/><text class="fig-t-s" x="32" y="106" text-anchor="start">見出し B</text><line class="fig-accent-l" x1="12" y1="146" x2="268" y2="146" stroke-dasharray="5 4"/><text class="fig-t-xs" x="262" y="140" text-anchor="end">上から 140px</text><line class="fig-a" x1="28" y1="192" x2="176" y2="192"/><text class="fig-t-s" x="32" y="186" text-anchor="start">見出し C</text><text class="fig-t-xs" x="362" y="36" text-anchor="middle">目次</text><rect class="fig-box" x="292" y="48" width="140" height="30" rx="8"/><text class="fig-t-s" x="362.0" y="68.0" text-anchor="middle">見出し A</text><rect class="fig-box-a" x="292" y="84" width="140" height="30" rx="8"/><text class="fig-t-s" x="362.0" y="104.0" text-anchor="middle">見出し B</text><rect class="fig-box" x="292" y="120" width="140" height="30" rx="8"/><text class="fig-t-s" x="362.0" y="140.0" text-anchor="middle">見出し C</text><text class="fig-t-s" x="362" y="176" text-anchor="middle">線より上にある</text><text class="fig-t-s" x="362" y="194" text-anchor="middle">最後の見出しが</text><text class="fig-t-s" x="362" y="212" text-anchor="middle">現在位置</text>
</svg>
<figcaption>上から順に見て、線より上にあるものを上書きしていくだけ。</figcaption>
</figure>

140 という数字は、上に固定しているものの高さに合わせる。

## ダークモード

### 色を変数にする

色を直接書かず、全部変数にしておく。これをやっていないと後から配色を足せない。

```css
:root {
	--bg: #ffffff;
	--fg: #1a1a1a;
	--muted: #666666;
	--line: #e5e5e5;
	--accent: #2563eb;
}

:root[data-theme='dark'] {
	--bg: #16181d;
	--fg: #e8e8e8;
	--muted: #9aa0a6;
	--line: #2a2d35;
	--accent: #7aa2f7;
}
```

Prism の色も両方で定義する。暗い配色のまま明るい用の色を使うと読めない。

### 切り替える

`html` 要素の属性を書き換えるだけで全部切り替わる。

```typescript
let theme = $state<'light' | 'dark'>('light');

$effect(() => {
	const saved = localStorage.getItem('theme');
	theme =
		saved === 'dark' || saved === 'light'
			? saved
			: window.matchMedia('(prefers-color-scheme: dark)').matches
				? 'dark'
				: 'light';
});

$effect(() => {
	document.documentElement.dataset.theme = theme;
	localStorage.setItem('theme', theme);
});
```

初回は OS の設定に従い、以後は選んだものを覚える。

釦は右上に固定して、太陽と月の絵を出す。絵は SVG を直接書く。画像を 1 枚増やさずに済む。

### ちらつきを止める

これをやらないと、暗い配色を選んでいる人がページを開くたびに**一瞬白く光る**。

原因は、CSS が当たってから JavaScript が動くまでの間、既定の配色で表示されるため。

`src/app.html` の `%sveltekit.head%` より**前**に、短い処理を直接書く。

```html
<script>
	try {
		var t = localStorage.getItem('theme');
		if (!t)
			t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		document.documentElement.dataset.theme = t;
	} catch (e) {}
</script>
```

`try` で囲むのは、設定で保存を禁止しているブラウザだと読み書きが失敗するため。失敗しても明るい配色で表示されるだけで済む。

## アイキャッチ

一覧が文字だけだと、どれがどの記事か分からない。画像を用意するのは続かないので、**絵文字と色で出す**ことにした。

優先順は 3 段。

```typescript
export const thumbOf = (p: Post) =>
	p.icon || (p.series ? iconFor(p.series) : '') || '📄';
```

1. 記事の frontmatter に `icon` があればそれ
2. 無ければ連載ごとに決めた絵文字
3. どちらも無ければ既定の絵文字

背景の色は、URL から計算して記事ごとに変える。

```typescript
export const hueOf = (s: string) => {
	let h = 0;
	for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
	return h;
};
```

同じ記事はいつも同じ色になる。並べたときに全部違う色になるので、見分けが付く。

写真を使いたい記事だけ、frontmatter に `cover` を書いて差し替えられるようにしてある。

## 検索

索引に全部載っているので、ページの中だけで絞り込める。サーバも外部のサービスも要らない。

```typescript
let q = $state('');

const hits = $derived(
	q.trim()
		? posts.filter((p) =>
				(p.title + p.summary + p.tags.join(' ') + p.series)
					.toLowerCase()
					.includes(q.trim().toLowerCase())
			)
		: []
);
```

題名・概要・タグ・連載名を対象にする。本文は索引に入れていないので対象外。記事が数千本になるまではこれで足りる。

## 前後の回

連載の中で、同じ連載の記事を日付の順に並べて、自分の位置を探す。

```typescript
const siblings = $derived(
	post?.series ? posts.filter((p) => p.series === post.series).slice().reverse() : []
);
const at = $derived(siblings.findIndex((p) => p.slug === post?.slug));
const prev = $derived(at > 0 ? siblings[at - 1] : undefined);
const next = $derived(at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : undefined);
```

索引は新しい順に並んでいるので、`reverse()` で第 1 回からの順にする。

`slice()` を挟むのは、`reverse()` が元の配列を書き換えてしまうため。これを忘れると、記事を開くたびに一覧の並びが逆になる。

## はまった点

### `<svelte:head>` を条件の中に置けない

題名や OGP を `<svelte:head>` で出すとき、記事が見つからない場合を考えて条件で囲んだら、組み立てで落ちた。

`<svelte:head>` は**必ず一番外側に 1 つ**置く。中身の方を、記事が無いときの既定値に差し替える形にする。

### CSS が 1 ファイルに集まる

ここまでの CSS を全部 `+layout.svelte` に書いたので、1 ファイルが膨れた。

色の定義・コードの体裁・配置を別のファイルに分けて取り込む方がよい。後から直すときに探す時間が変わる。

## ここまでの確認

- コードに色と行番号が付き、コピーできる
- 目次が追従し、現在位置が分かる
- 配色を切り替えられ、開いたときにちらつかない
- 一覧に絵と色が付いている
- 検索が動く

次は、書いたものを見つけてもらう側を整える。
