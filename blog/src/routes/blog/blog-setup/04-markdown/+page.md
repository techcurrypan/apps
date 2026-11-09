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

足したら dev サーバを止めて起動し直す。設定の変更は再起動が必要。

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

## タグ

タグは frontmatter に書ける。

```
tags: ['k8s', 'docker']
```

書かなくてもよい。**本文に何度も出てくる語から自動で付く**ようにしてある。仕組みは第 7 回で作る。

自動で付いたものに足したいときだけ、手で書く。

## はまった点

### 中括弧が本文に書けない

Markdown は最終的に Svelte のページになる。Svelte は中括弧を「式」として解釈するので、本文に中括弧をそのまま書くと組み立てが失敗する。

コードブロック（3 つの `` ` `` で囲んだ部分）の中は、第 8 回で逃がす処理を入れるので問題ない。**本文の地の文と、1 行の `` `コード` `` の中には中括弧を書かない**こと。

### 記事を足したら dev サーバを再起動する

記事を新しく作ったとき、frontmatter を書き換えたときは、dev サーバを止めて起動し直す。索引を起動時に作る形にしているため。

これは今のところの制約。理由は第 7 回で説明する。

## ここまでの確認

- `+page.md` を置くとページが増える
- フォルダ名が URL になる
- frontmatter の 3 つを書けば一覧に出る
- 連載はフォルダ、話題はタグ

次は、これを `git push` だけで公開できるようにする。
