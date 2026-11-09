---
title: このブログを作った手順
date: '2026-11-09'
summary: SvelteKit と mdsvex で作り、GitHub Actions から Cloudflare Workers へ自動で配信するまで。つまずいた所も残す。
tags: ['svelte', 'cloudflare', 'ci']
series: 'ブログ構築'
icon: '🛠'
order: 1
---

はじめて SvelteKit を触って、このブログを作った。push すれば自動で公開されるところまでを 1 日で通した記録。

## 構成

- SvelteKit（Svelte 5 + Vite + TypeScript）
- mdsvex — Markdown をそのままページにする
- Cloudflare Workers — 配信先
- GitHub Actions — push を受けて検査と配信

全て無料の範囲に収まっている。

## 1. ひな形を作る

```
npx sv create blog
```

選んだもの。

- template: SvelteKit minimal
- type checking: TypeScript
- add-ons: prettier, eslint, sveltekit-adapter, mdsvex
- adapter: cloudflare → Workers

ここで Pages ではなく Workers を選んだ。Pages でもブログは作れるが、Cloudflare が今すすめているのは Workers で、後から API を足すときに 1 つにまとめられる。

## 2. Markdown を記事にする

mdsvex を入れると、`.md` がそのままページになる。`src/routes/blog/hello/+page.md` を置けば `/blog/hello` で開ける。フォルダ名が URL になる。

記事の冒頭に frontmatter を書く。

```
---
title: 最初の記事
date: '2026-11-09'
summary: 概要
tags: ['svelte']
---
```

日付は引用符で囲む。囲まないと日付型になって、後で並び替えるときに壊れる。

## 3. 記事の一覧

記事を 1 本ずつ手で並べるのは続かない。Vite の `import.meta.glob` でまとめて読む。

```ts
const modules = import.meta.glob('./*/+page.md', { eager: true });
```

frontmatter は `metadata` に入っているので、そこから題と日付を読んで新しい順に並べる。記事を足すとファイルを置くだけで一覧に出る。

## 4. タグ

frontmatter の `tags` を読んで一覧に並べ、`/tag/svelte` のような動的なページで絞り込む。動的なページは `src/routes/tag/[tag]/` というフォルダ名で作る。角かっこの部分が URL から渡ってくる。

## 5. GitHub Actions から配信する

`.github/workflows/deploy-blog.yml` を置いて、main に push されたら検査して配信するようにした。配信は Cloudflare 公式の `cloudflare/wrangler-action` を使う。

事前に GitHub の Secrets へ 2 つ登録しておく。

- `CLOUDFLARE_API_TOKEN` — Cloudflare で作る。権限は Edit Cloudflare Workers
- `CLOUDFLARE_ACCOUNT_ID` — ダッシュボードの URL に入っている 32 桁

トークンは作成直後の 1 回しか表示されない。閉じると作り直しになる。

## つまずいた所

### Actions が実行できない

組織のリポジトリでは、外部の Actions が既定で禁止されていた。設定の Actions permissions で許可する必要がある。

### 型定義ファイルが無いと言われる

`wrangler types` が作る `worker-configuration.d.ts` はリポジトリに入れていないので、GitHub 側では存在しない。配信の前に生成する手順を足して解決した。

### workers.dev のサブドメインが無い

最初の配信で止まる。Cloudflare のダッシュボードで一度だけ登録すればよい。

### 角かっこのフォルダが作れない

PowerShell では `[tag]` がワイルドカードとして解釈される。`-LiteralPath` を付けると通る。

### frontmatter を変えても画面に出ない

開発サーバーが古い内容を覚えている。frontmatter を変えたときは再起動する。本文だけなら再起動は要らない。

## これから

画像の置き場、記事の目次、RSS あたりを足していく。