---
title: '無料でブログを作る (8) 読みやすくする'
date: '2026-11-07'
summary: コードの色分けと行番号、コピー釦、追従する目次、ダークモード、アイキャッチ、検索。殺風景な技術ブログを読める形にする。
tags: ['svelte', 'css']
---

真っ白な背景に文字が並んでいるだけだったので、読める形に整える。

**前提**: 第 7 回まで。索引が使えること。

## コードの色分け

**Prism** を使う。組み立てのときに色分けを済ませるので、読む人のブラウザでは何も実行されない。

```bash
npm i -D prismjs
```

`vite.config.ts` で mdsvex に色分けの関数を渡す。

```typescript
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Prism = require('prismjs');
require('prismjs/components/prism-bash.js');
require('prismjs/components/prism-typescript.js');
```

`createRequire` を使うのは、Prism が古い形式の部品で新しい取り込み方では読めないため。

### 中括弧を逃がす

色分けした HTML は最終的に Svelte のページに入る。**Svelte は中括弧を式として解釈する**ので、そのままだと組み立てが失敗する。

```typescript
const braces = (s: string) =>
	s.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
```

これを入れるまで、JSON や TypeScript を貼った記事が全部落ちていた。

### 行番号

1 行ずつ包む。空行は半角空白に置き換える。潰れて番号がずれるため。

```typescript
const lines = braces(html)
	.replace(/\n$/, '')
	.split('\n')
	.map((line: string) => `<span class="line">${line || ' '}</span>`)
	.join('');
```

番号は CSS の `counter` で出す。HTML に数字を入れないので、コピーしても番号が付いてこない。

```css
pre.code code { counter-reset: line; }
pre.code .line { display: block; counter-increment: line; }
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

## コピー釦

表示後にコードブロックを探して釦を足す。Markdown 側には何も書かない。

```typescript
for (const pre of document.querySelectorAll('pre.code')) {
	if (pre.querySelector('.copy')) continue;
	const b = document.createElement('button');
	b.className = 'copy';
	b.textContent = 'コピー';
	b.onclick = () => navigator.clipboard.writeText(pre.textContent ?? '');
	pre.appendChild(b);
}
```

`continue` が無いと、ページを移動するたびに釦が増える。

## 追従する目次

見出しに `id` を振り、一覧を作り、現在位置を印す。

```typescript
const els = [...document.querySelectorAll('article h2, article h3')];
els.forEach((el, i) => {
	if (!el.id) el.id = `h-${i}`;
});
```

現在位置は、**画面の上から 140px の線を最後に越えた見出し**。

```typescript
const onScroll = () => {
	let cur = els[0].id;
	for (const el of els) {
		if (el.getBoundingClientRect().top <= 140) cur = el.id;
	}
	active = cur;
};
```

<figure class="fig">
<svg viewBox="0 0 440 248" role="img" aria-label="画面の上から 140px の線を最後に越えた見出しを、現在位置として目次に印す">
<rect class="fig-box" x="12" y="14" width="256" height="222" rx="8"/><text class="fig-t-xs" x="22" y="32" text-anchor="start">画面</text><line class="fig-a" x1="28" y1="62" x2="176" y2="62"/><text class="fig-t-s" x="32" y="56" text-anchor="start">見出し A</text><line class="fig-a" x1="28" y1="112" x2="176" y2="112"/><text class="fig-t-s" x="32" y="106" text-anchor="start">見出し B</text><line class="fig-accent-l" x1="12" y1="146" x2="268" y2="146" stroke-dasharray="5 4"/><text class="fig-t-xs" x="262" y="140" text-anchor="end">上から 140px</text><line class="fig-a" x1="28" y1="192" x2="176" y2="192"/><text class="fig-t-s" x="32" y="186" text-anchor="start">見出し C</text><text class="fig-t-xs" x="362" y="36" text-anchor="middle">目次</text><rect class="fig-box" x="292" y="48" width="140" height="30" rx="8"/><text class="fig-t-s" x="362.0" y="68.0" text-anchor="middle">見出し A</text><rect class="fig-box-a" x="292" y="84" width="140" height="30" rx="8"/><text class="fig-t-s" x="362.0" y="104.0" text-anchor="middle">見出し B</text><rect class="fig-box" x="292" y="120" width="140" height="30" rx="8"/><text class="fig-t-s" x="362.0" y="140.0" text-anchor="middle">見出し C</text><text class="fig-t-s" x="362" y="176" text-anchor="middle">線より上にある</text><text class="fig-t-s" x="362" y="194" text-anchor="middle">最後の見出しが</text><text class="fig-t-s" x="362" y="212" text-anchor="middle">現在位置</text>
</svg>
<figcaption>上から順に見て、線より上にあるものを上書きしていくだけ。</figcaption>
</figure>

交差監視の API を使う方法もあるが、こちらの方が挙動が素直だった。140 は上に固定しているものの高さに合わせる。

## ダークモード

色を直接書かず、全部変数にしておく。これをやっていないと後から配色を足せない。

```css
:root {
	--bg: #ffffff;
	--ink: #1a2234;
	--line: #e2e8f2;
	--accent: #2563eb;
}

:root[data-theme='dark'] {
	--bg: #0f1419;
	--ink: #e6edf3;
	--line: #2a323c;
	--accent: #6cb6ff;
}
```

Prism の色も両方で定義する。切り替えは `html` の属性を書き換えるだけ。

```typescript
$effect(() => {
	document.documentElement.dataset.theme = theme;
	localStorage.setItem('theme', theme);
});
```

初回は OS の設定に従い、以後は選んだものを覚える。釦は右上に固定して、太陽と月を SVG で描く。

### ちらつきを止める

やらないと、暗い配色の人がページを開くたびに**一瞬白く光る**。CSS が当たってから JavaScript が動くまでの間、既定の配色で表示されるため。

`src/app.html` の `%sveltekit.head%` より**前**に直接書く。

```html
<script>
	try {
		var t = localStorage.getItem('theme');
		if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		document.documentElement.dataset.theme = t;
	} catch (e) {}
</script>
```

`try` で囲むのは、保存を禁止しているブラウザで失敗するため。失敗しても明るい配色で出るだけで済む。

## アイキャッチ

画像を用意するのは続かないので、**絵文字と色**で出す。

```typescript
export const thumbOf = (p: Post) => p.icon || (p.series ? iconFor(p.series) : '') || '📄';

export const hueOf = (s: string) => {
	let h = 0;
	for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
	return h;
};
```

記事の `icon` → 連載の絵文字 → 既定、の順。背景色は URL から計算するので、同じ記事はいつも同じ色になる。写真を使いたい記事だけ `cover` で差し替える。

## 検索

索引に全部載っているので、ページの中だけで絞り込める。サーバも外部のサービスも要らない。

```typescript
const hits = $derived(
	posts.filter((p) =>
		(p.title + p.summary + p.tags.join(' ') + p.series)
			.toLowerCase()
			.includes(q.trim().toLowerCase())
	)
);
```

本文は索引に入れていないので対象外。数千本までならこれで足りる。

## 前後の回

```typescript
const siblings = $derived(posts.filter((p) => p.series === post.series).slice().reverse());
const at = $derived(siblings.findIndex((p) => p.slug === post.slug));
```

`slice()` を挟むのは、`reverse()` が元の配列を書き換えるため。忘れると記事を開くたびに一覧の並びが逆になる。

## はまった点

- `<svelte:head>` は条件の中に置けない。**必ず一番外側に 1 つ**置き、中身を既定値に差し替える
- CSS を全部 `+layout.svelte` に書いたら 1 ファイルが膨れた。色・コード・配置で分けた方がよい

次は、書いたものを見つけてもらう側を整える。
