---
title: '無料でブログを作る (10) つまずいた所まとめ'
date: '2026-11-09'
summary: 実際に詰まった 13 か所。症状・原因・直し方。上から読まず、症状で探す回。
tags: ['svelte', 'cloudflare', 'ci', 'git']
---

症状で探す。

## 手元の作業（Windows）

この節は Windows と PowerShell の話。Mac・Linux では起きない。

### package.json が読めない

```
Unable to read package.json ... is not valid JSON
```

`Set-Content -Encoding UTF8` はファイルの先頭に **BOM** という見えない印を書く。JSON はこれを許さない。BOM なしで書き直す。

```powershell
$p = "package.json"
$t = Get-Content -Raw $p
[System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding $false))
```

### コマンドに勝手にファイル名が入る

引用符の中の文字列が**タブで始まっている**と、PowerShell がタブ補完として解釈してファイル名を挿入する。

コマンド行の引用符の中に先頭のタブや空白を書かない。置換ではなくファイル全体を書き直す方が安全。

```powershell
$t = @'
ここに全文
'@
[System.IO.File]::WriteAllText("path", $t, (New-Object System.Text.UTF8Encoding $false))
```

単一引用符の here-string は中身を一切解釈しない。

### 角括弧の付いたフォルダに書けない

PowerShell は角括弧をワイルドカードとして扱う。`-LiteralPath` を使う。

```powershell
Set-Content -LiteralPath "src/routes/tag/[tag]/+page.svelte" -Value $t
```

SvelteKit は角括弧を「ここが可変の URL」の意味で使うので、このフォルダは避けられない。

### 長い本文を貼ると止まる

コマンド行は長い複数行の入力に向いていない。**ファイルはエディタで作ってエディタに貼る。** `npm run new` を使えば空のファイルが開く。

### Set-ExecutionPolicy が通らない

`Bypass` は値であってスイッチではない。

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
```

## 組み立てと型

### 手元で動くのに Actions だけ落ちる

**`npm run dev` は型を検査しない。** 手元で見つける手段が無い。公開前に同じ検査を回す。

```bash
npm run gen
npm run check
```

実際に起きたのは、`vite.config.ts` の関数の引数に型を書き忘れていた例。

### Types file not found

```
✘ [ERROR] Types file not found at worker-configuration.d.ts.
```

`wrangler types` が作る自動生成物で、リポジトリに入れていない。手元では `npm run gen`、CI では検査の前に生成する段を入れる（第 5 回）。

### 中括弧で組み立てが落ちる

Markdown は最終的に Svelte のページになり、Svelte は中括弧を式として解釈する。コードブロックは色分けの関数で文字参照に置き換える（第 8 回）。本文の地の文と 1 行のコードには中括弧を書かない。

### 組み立てが status 3221226505 で落ちる（Windows）

```
X [ERROR] Types at worker-configuration.d.ts are out of date.
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 94
```

2 行目の libuv の異常終了が目立つが、**本当の原因は 1 行目**。wrangler がエラーで終わった直後に落ちているだけ。`npm run gen` で型定義を作り直す。

落ちた組み立ての残骸が `.svelte-kit` に残って同じ症状になることもある。その場合はフォルダごと消してから組み立て直す。

```bash
rm -rf .svelte-kit
npm run gen
npm run build
```

### svelte.config.js が無い

新しい雛形では SvelteKit の設定も `vite.config.ts` に書く。**自分で作らない。** 作ると設定が二重になる。

## 公開

### Actions が実行できない

```
Error: ... are not allowed in techcurrypan/apps
```

組織のリポジトリでは外部の Actions が既定で禁止されていることがある。**リポジトリの** Settings → Actions → General → Actions permissions で許可する。組織の設定ページに同じ項目が無いことがある。

### 再実行の釦が出ない

ワークフローに `workflow_dispatch` を書いていないと、手で実行する口が無い。

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

### workers.dev のサブドメインが無い

```
✘ [ERROR] You need to register a workers.dev subdomain before publishing to workers.dev
```

ダッシュボードの Workers & Pages で 1 回だけ登録する。コマンドでは作れない。

### git push が 403 になる

```
remote: Permission to techcurrypan/apps.git denied to swallowsaba.
```

保存されている GitHub の認証情報が別のアカウントのもの。このホストで使う利用者名を指定する。

```bash
git config credential.https://github.com.username techcurrybread
git remote set-url origin https://github.com/techcurrypan/apps.git
```

## 表示

### dev に新しい記事が出ない

frontmatter に `draft: true` が残っていないか見る。索引は Vite のプラグインが見張っているので、再起動は要らない（第 7 回）。

### 一覧の並びが逆になる

`reverse()` は元の配列を書き換える。索引をそのまま反転すると索引自体が壊れる。複製してから反転する。

```typescript
posts.filter((p) => p.series === series).slice().reverse();
```

`slice()` の 1 語で直る。見つけるまでに時間がかかった類。

### タグが全記事に付く

自動タグの条件を「本文に 1 回でも出たら付ける」にしていた。連載は全記事が同じ話題なので全部に当たる。閾値を 3 回以上にしたら収まった（第 7 回）。

## 振り返って

<figure class="fig">
<svg viewBox="0 0 440 272" role="img" aria-label="つまずいた原因は、道具の作法・検査の範囲の誤解・順番の 3 つに分かれた">
<rect class="fig-box-a" x="8" y="14" width="232" height="36" rx="8"/><text class="fig-t-s" x="124.0" y="37.0" text-anchor="middle">道具の作法を知らなかった</text><text class="fig-t-xs" x="14" y="68" text-anchor="start">例： BOM / タブ補完 / 角括弧</text><line class="fig-a" x1="240" y1="32" x2="269" y2="32"/><polygon class="fig-ah" points="268,27.5 268,36.5 276,32"/><rect class="fig-box" x="276" y="14" width="156" height="36" rx="8"/><text class="fig-t-xs" x="354.0" y="37.0" text-anchor="middle">調べれば済む</text><rect class="fig-box-a" x="8" y="100" width="232" height="36" rx="8"/><text class="fig-t-s" x="124.0" y="123.0" text-anchor="middle">検査の範囲を誤解していた</text><text class="fig-t-xs" x="14" y="154" text-anchor="start">例： dev は型を見ない</text><line class="fig-a" x1="240" y1="118" x2="269" y2="118"/><polygon class="fig-ah" points="268,113.5 268,122.5 276,118"/><rect class="fig-box" x="276" y="100" width="156" height="36" rx="8"/><text class="fig-t-xs" x="354.0" y="123.0" text-anchor="middle">1 回整理すれば防げた</text><rect class="fig-box-a" x="8" y="186" width="232" height="36" rx="8"/><text class="fig-t-s" x="124.0" y="209.0" text-anchor="middle">先にやることを後回しにした</text><text class="fig-t-xs" x="14" y="240" text-anchor="start">例： サブドメイン / Actions の許可</text><line class="fig-a" x1="240" y1="204" x2="269" y2="204"/><polygon class="fig-ah" points="268,199.5 268,208.5 276,204"/><rect class="fig-box" x="276" y="186" width="156" height="36" rx="8"/><text class="fig-t-xs" x="354.0" y="209.0" text-anchor="middle">公式の手順を先に読む</text>
</svg>
<figcaption>一番効いたのは、手元で CI と同じ検査を回すことだった。</figcaption>
</figure>

一番効いたのは、**手元で CI と同じ検査を回す**こと。これだけで push してから落ちる回数が大きく減った。

連載はここまで。第 1 回から順にたどれば同じものができる。
