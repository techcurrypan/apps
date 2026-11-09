---
title: '無料でブログを作る (4) Markdown で記事を書く'
date: '2026-11-03'
summary: mdsvex を入れて、Markdown のファイルがそのままページになる形にする。記事の置き場所と URL の対応、frontmatter、連載はフォルダで分ける話。
tags: ['svelte']
---

記事を Markdown で書けるようにする。

**この回が終わると**、`+page.md` を置くだけでページが増える。

**前提**: 第 3 回で `npm run dev` が動いていること。

## mdsvex を入れる

```bash
npm i -D mdsvex
```

**mdsvex** は、Markdown を Svelte のページに変換する部品。これを入れると `.md` ファイルを `src/routes/` に置けるようになる。

`vite.config.ts` に 2 か所足す。

```typescript
import { mdsvex } from 'mdsvex';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter(),
			preprocess: [mdsvex({ extensions: ['.svx', '.md'] })],
			extensions: ['.svelte', '.svx', '.md']
		})
	]
});
```

- `preprocess` — Markdown を変換する処理を挟む
- `extensions` — SvelteKit が「ページとして扱う」拡張子。`.md` を足さないと無視される

足したら dev サーバを止めて起動し直す。**設定の変更**は再起動が要る。記事の増減は要らない（第 7 回）。

## 記事の置き場所と URL

`src/routes/` の構造がそのまま URL になる。記事は**フォルダを作って、中に `+page.md` を置く**。

| ファイル | URL |
|---|---|
| `src/routes/blog/hello/+page.md` | `/blog/hello` |
| `src/routes/blog/k8s/01-intro/+page.md` | `/blog/k8s/01-intro` |

ファイル名は常に `+page.md`。**フォルダ名が URL になる**ので、記事ごとに名前を変えるのはフォルダの方。

## 最初の記事を書く

`src/routes/blog/hello/+page.md` を作る。

```
---
title: '最初の記事'
date: '2026-11-03'
summary: Markdown で書いた記事です。
---

これは Markdown で書いた記事です。

## 見出し

- 箇条書き
- も書ける
```

先頭の `---` で囲んだ部分を **frontmatter** という。記事の属性を書く場所で、本文には出ない。

必須は 3 つだけ。

| 項目 | 役割 |
|---|---|
| `title` | 題名。一覧・タブ・検索結果に出る |
| `date` | 投稿日。並び順を決める |
| `summary` | 概要。一覧のカードと検索結果に出る |

**成功したらこう見える**: `http://localhost:5173/blog/hello` を開くと記事が表示される。

## 連載はフォルダで分ける

同じ話題を複数回に分けて書くとき、**フォルダを 1 つ作ってその中に回を並べる**。

```
src/routes/blog/k8s/
  01-intro/+page.md
  02-pod/+page.md
  03-service/+page.md
```

こうすると `k8s` が連載名として扱われ、左側に連載としてまとまって出る。回の順序は投稿日で決まるので、フォルダ名の番号は URL を読みやすくするためのもの。

### 最初はタグで連載を作ろうとして失敗した

最初はタグで「k8s の記事をまとめる」ことを考えた。うまくいかなかった。

タグは 1 つの記事に複数付く。`k8s` と `docker` と `linux` が付いた記事は、3 つの連載に同時に属することになる。「第 3 回」が決まらない。前後の回も決まらない。

**連載はフォルダ、話題はタグ**と役割を分けたら収まった。

- **フォルダ** — 1 つだけ。順番がある。前後の回が決まる
- **タグ** — 複数付く。順番は無い。横断して探すためのもの

<figure class="fig">
<svg viewBox="0 0 440 312" role="img" aria-label="連載はフォルダで 1 つだけ、順番がある。タグは複数付き、記事を横断する">
<text class="fig-t" x="220" y="18" text-anchor="middle">連載 ＝ フォルダ（1 つだけ・順番がある）</text><rect class="fig-box" x="8" y="30" width="424" height="86" rx="8"/><text class="fig-m-s" x="18" y="48" text-anchor="start">blog/k8s/</text><rect class="fig-box-a" x="20" y="60" width="112" height="40" rx="8"/><text class="fig-m-s" x="76.0" y="76.0" text-anchor="middle">01-intro</text><text class="fig-t-xs" x="76.0" y="94.0" text-anchor="middle">第 1 回</text><line class="fig-a" x1="132" y1="80" x2="157" y2="80"/><polygon class="fig-ah" points="156,75.5 156,84.5 164,80"/><rect class="fig-box-a" x="164" y="60" width="112" height="40" rx="8"/><text class="fig-m-s" x="220.0" y="76.0" text-anchor="middle">02-pod</text><text class="fig-t-xs" x="220.0" y="94.0" text-anchor="middle">第 2 回</text><line class="fig-a" x1="276" y1="80" x2="301" y2="80"/><polygon class="fig-ah" points="300,75.5 300,84.5 308,80"/><rect class="fig-box-a" x="308" y="60" width="112" height="40" rx="8"/><text class="fig-m-s" x="364.0" y="76.0" text-anchor="middle">03-service</text><text class="fig-t-xs" x="364.0" y="94.0" text-anchor="middle">第 3 回</text><text class="fig-t" x="220" y="150" text-anchor="middle">タグ ＝ 横断（複数付く・順番は無い）</text><rect class="fig-box" x="8" y="182" width="124" height="34" rx="8"/><text class="fig-t" x="70.0" y="204.0" text-anchor="middle">記事 A</text><rect class="fig-box" x="8" y="240" width="124" height="34" rx="8"/><text class="fig-t" x="70.0" y="262.0" text-anchor="middle">記事 B</text><rect class="fig-box-a" x="308" y="168" width="124" height="28" rx="8"/><text class="fig-t-s" x="370.0" y="187.0" text-anchor="middle">k8s</text><rect class="fig-box-a" x="308" y="212" width="124" height="28" rx="8"/><text class="fig-t-s" x="370.0" y="231.0" text-anchor="middle">docker</text><rect class="fig-box-a" x="308" y="256" width="124" height="28" rx="8"/><text class="fig-t-s" x="370.0" y="275.0" text-anchor="middle">linux</text><line class="fig-a" x1="132" y1="199" x2="308" y2="182" stroke-dasharray="3 3"/><line class="fig-a" x1="132" y1="199" x2="308" y2="226" stroke-dasharray="3 3"/><line class="fig-a" x1="132" y1="257" x2="308" y2="182" stroke-dasharray="3 3"/><line class="fig-a" x1="132" y1="257" x2="308" y2="270" stroke-dasharray="3 3"/><text class="fig-t-s" x="220" y="300" text-anchor="middle">同じタグを持つ記事を、連載をまたいで辿れる</text>
</svg>
<figcaption>最初はタグで連載を作ろうとして失敗した。役割を分けたら収まった。</figcaption>
</figure>

## タグ

タグは frontmatter に書ける。

```
tags: ['k8s', 'docker']
```

書かなくてもよい。**本文に何度も出てくる語から自動で付く**ようにしてある。仕組みは第 7 回で作る。

自動で付いたものに足したいときだけ、手で書く。

## 画像を貼る

画像は `static/` の下に置く。ここに置いたファイルは、そのままの名前で配信される。

記事ごとにフォルダを分けておくと、後で探せる。

```
static/img/k8s/01-intro/pod.png   →   /img/k8s/01-intro/pod.png
```

Markdown から参照する。

```
![Pod の構成](/img/k8s/01-intro/pod.png)
```

**パスは必ず `/` で始める。**

### 記事と同じフォルダには置けない

最初、`+page.md` の隣に画像を置いて相対パスで書いた。表示されなかった。

理由は 2 つある。`src/routes/` の中のファイルは、ページとして扱われるもの以外は配信されない。そして相対パスは記事の URL（`/blog/k8s/01-intro`）を基準に解決されるので、まったく別の場所を指す。

`static/` に置いて `/` から始める。これが確実。

### 大きさを指定する

画像をたくさん貼るなら、大きさを書いておく。読み込みの間に文字が飛び跳ねなくなる。Markdown の記法では指定できないので、そこだけ HTML で書く。

```html
<img
	src="/img/k8s/01-intro/pod.png"
	alt="Pod の構成"
	width="1200"
	height="630"
	loading="lazy"
/>
```

- `width` と `height` — 画像の実際の画素数。表示前に場所を確保するためのもの
- `loading="lazy"` — 画面に入るまで読み込まない。画像の多い記事で効く

表示幅は CSS 側で画面に合わせてあるので、この数字で小さくなることはない。

### 容量

Cloudflare では静的ファイルの配信は無料だが、組み立てのたびに全部を運ぶ。1 枚 1MB を超えるような画像は縮めてから置く。画面の写しは PNG、写真は JPEG か WebP。

数百枚を超えて重くなってきたら、R2 に移す（第 2 回）。

## はまった点

### 中括弧が本文に書けない

Markdown は最終的に Svelte のページになる。Svelte は中括弧を「式」として解釈するので、本文に中括弧をそのまま書くと組み立てが失敗する。

コードブロック（3 つの `` ` `` で囲んだ部分）の中は、第 8 回で逃がす処理を入れるので問題ない。**本文の地の文と、1 行の `` `コード` `` の中には中括弧を書かない**こと。

### 下書きのまま置く

frontmatter に 1 行足すと、一覧・検索・連載・RSS から外れる。

```
draft: true
```

URL を直接開けば見えるので、確認はできる。書き終えたらこの行を消す。

## ここまでの確認

- `+page.md` を置くとページが増える
- フォルダ名が URL になる
- frontmatter の 3 つを書けば一覧に出る
- 連載はフォルダ、話題はタグ

次は、これを `git push` だけで公開できるようにする。
