---
title: '無料でブログを作る (10) つまずいた所まとめ'
date: '2026-11-09'
summary: この連載で実際に詰まった 13 か所。症状・原因・直し方。同じ所で止まったときに読む回。
tags: ['svelte', 'cloudflare', 'ci', 'git']
---

連載の最後に、実際に詰まった所を集める。どれも 1 回は手が止まった。

**この回は**、上から読む必要はない。症状で探す。

## 手元の作業（Windows）

この節は Windows と PowerShell の話。Mac・Linux では起きない。

### package.json が読めないと言われる

**症状**

```
Unable to read package.json ... is not valid JSON
```

書き換えた直後から、何をしても動かなくなる。

**原因**

PowerShell の `Set-Content -Encoding UTF8` は、ファイルの先頭に **BOM** という見えない印を書く。JSON はこれを許さない。

**直し方**

BOM なしで書き直す。

```powershell
$p = "package.json"
$t = Get-Content -Raw $p
[System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding $false))
```

`.json` を PowerShell から書き換えるときは、毎回これを使う。

### コマンドに勝手に `.\.gitignore` が入る

**症状** 文字列を置換するコマンドを打つと、途中に関係ないファイル名が現れて失敗する。

**原因** 引用符の中の文字列が**タブで始まっている**と、PowerShell がタブ補完として解釈してファイル名を挿入する。

**直し方** コマンド行の引用符の中に、先頭のタブや空白を書かない。どうしても必要なら、置換ではなくファイル全体を書き直す。

```powershell
$t = @'
ここに全文
'@
[System.IO.File]::WriteAllText("path", $t, (New-Object System.Text.UTF8Encoding $false))
```

単一引用符の here-string は中身を一切解釈しないので安全。

### 角括弧の付いたフォルダに書けない

**症状** `src/routes/tag/[tag]/` にファイルを作ろうとすると、パスが見つからないと言われる。

**原因** PowerShell は角括弧をワイルドカードとして扱う。

**直し方** `-LiteralPath` を使う。

```powershell
Set-Content -LiteralPath "src/routes/tag/[tag]/+page.svelte" -Value $t
Get-ChildItem -LiteralPath "src/routes/tag/[tag]"
```

SvelteKit は角括弧を「ここが可変の URL」という意味で使うので、このフォルダは避けられない。

### 長い本文を貼ると止まる

**症状** 記事の本文をコマンド行に貼ると、途中で止まるか、切れて入る。

**原因** コマンド行は長い複数行の入力に向いていない。

**直し方** **ファイルはエディタで作って、エディタに貼る。** `npm run new` を使えば空のファイルが VS Code で開くので、そこに貼る。

### Set-ExecutionPolicy が通らない

**症状**

```
パラメーター名 'Bypass' に一致するパラメーターが見つかりません
```

**原因** `Bypass` は値であって、スイッチではない。

**直し方**

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
```

`-Scope Process` にすると、そのウィンドウを閉じるまでの一時的な変更になる。

## 組み立てと型

### 手元で動くのに Actions だけ落ちる

**症状** `npm run dev` では問題なく動くのに、push すると検査の段で落ちる。

**原因** **`npm run dev` は型を検査しない。** 型の誤りを手元で見つける手段が無い。

実際に起きたのは、`vite.config.ts` に書いた関数の引数に型を書き忘れていた例。

**直し方** 公開前に手元で同じ検査を回す。

```bash
npm run gen
npm run check
```

`found 0 errors` を確認してから push する。`npm run publish` の前に挟む癖にする。

### Types file not found と言われる

**症状**

```
✘ [ERROR] Types file not found at worker-configuration.d.ts.
```

**原因** このファイルは `wrangler types` が作る自動生成物で、リポジトリに入れていない。だから手元にもまだ無いし、GitHub 側にも無い。

**直し方** 手元では先に作る。

```bash
npm run gen
```

CI では、検査の前に生成する段を入れる（第 5 回のワークフロー）。

### 中括弧で組み立てが落ちる

**症状** JSON や TypeScript を貼った記事を入れたら、組み立てで落ちる。

**原因** Markdown は最終的に Svelte のページになる。Svelte は中括弧を式として解釈する。

**直し方** コードブロックは、色分けの関数の中で中括弧を文字参照に置き換える（第 8 回）。

本文の地の文と 1 行のコードには、中括弧を書かない。

### svelte.config.js が無い

**症状** 解説記事のとおり `svelte.config.js` を編集しようとしたら、ファイルが存在しない。

**原因** 新しい雛形では、SvelteKit の設定も `vite.config.ts` に書く形になっている。

**直し方** `vite.config.ts` の `sveltekit()` に引数として渡す。**`svelte.config.js` を自分で作らない。** 作ると設定が二重になる。

## 公開

### Actions が実行できない

**症状**

```
Error: ... are not allowed in techcurrypan/apps
```

ワークフローが始まる前に落ちる。

**原因** 組織のリポジトリでは、外部の Actions が既定で禁止されていることがある。

**直し方** **リポジトリの** Settings → Actions → General → Actions permissions で許可する。組織の設定ページに同じ項目が無いことがあるので、リポジトリ側を見る。

### 再実行の釦が出ない

**症状** 落ちた実行を直したのに、やり直す釦が無い。

**原因** ワークフローに `workflow_dispatch` を書いていないと、手で実行する口が無い。

**直し方** ワークフローに 1 行足す。足した後は、Actions の画面から実行できる。

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

### workers.dev のサブドメインが無い

**症状**

```
✘ [ERROR] You need to register a workers.dev subdomain before publishing to workers.dev
```

**原因** 公開 URL の一部になる名前を、まだ登録していない。

**直し方** Cloudflare のダッシュボードの Workers & Pages で 1 回だけ登録する。コマンドでは作れない。

### git push が 403 になる

**症状**

```
remote: Permission to techcurrypan/apps.git denied to swallowsaba.
```

**原因** パソコンに保存されている GitHub の認証情報が、別のアカウントのもの。

**直し方** このホストで使う利用者名を指定する。

```bash
git config credential.https://github.com.username techcurrybread
git remote set-url origin https://github.com/techcurrypan/apps.git
```

複数のアカウントを使い分けているときに必ず起きる。

## 表示

### dev に新しい記事が出ない

**症状** 記事を作ったのに一覧に出ない。frontmatter を直したのに反映されない。

**原因** 索引は dev の**起動時に 1 回**しか作られない（第 7 回）。

**直し方** dev サーバを止めて起動し直す。本文だけの書き換えなら再起動は要らない。

### 一覧の並びが逆になる

**症状** 記事を開いて戻ると、一覧の並びが逆になっている。

**原因** `reverse()` は元の配列を書き換える。索引の配列をそのまま反転すると、索引自体が壊れる。

**直し方** 複製してから反転する。

```typescript
posts.filter((p) => p.series === series).slice().reverse();
```

`slice()` の 1 語で直る。見つけるまでに時間がかかった類。

### タグが全記事に付く

**症状** どの記事にも全部のタグが付いて、タグで絞る意味が無い。

**原因** 自動タグの条件を「本文に 1 回でも出たら付ける」にしていた。連載は全記事が同じ話題なので、全部に当たる。

**直し方** 閾値を上げる。3 回以上にしたら収まった（第 7 回）。

## 振り返って

詰まった原因を並べると、3 つに分かれていた。

1. **道具の作法を知らなかった** — PowerShell の BOM、タブ補完、角括弧（Windows 固有）
2. **検査の範囲を誤解していた** — `npm run dev` が型を見ていると思っていた
3. **先にやるべきことを後回しにしていた** — サブドメインの登録、Actions の許可

<figure class="fig">
<svg viewBox="0 0 440 272" role="img" aria-label="つまずいた原因は、道具の作法・検査の範囲の誤解・順番の 3 つに分かれた">
<rect class="fig-box-a" x="8" y="14" width="232" height="36" rx="8"/><text class="fig-t-s" x="124.0" y="37.0" text-anchor="middle">道具の作法を知らなかった</text><text class="fig-t-xs" x="14" y="68" text-anchor="start">例： BOM / タブ補完 / 角括弧</text><line class="fig-a" x1="240" y1="32" x2="269" y2="32"/><polygon class="fig-ah" points="268,27.5 268,36.5 276,32"/><rect class="fig-box" x="276" y="14" width="156" height="36" rx="8"/><text class="fig-t-xs" x="354.0" y="37.0" text-anchor="middle">調べれば済む</text><rect class="fig-box-a" x="8" y="100" width="232" height="36" rx="8"/><text class="fig-t-s" x="124.0" y="123.0" text-anchor="middle">検査の範囲を誤解していた</text><text class="fig-t-xs" x="14" y="154" text-anchor="start">例： dev は型を見ない</text><line class="fig-a" x1="240" y1="118" x2="269" y2="118"/><polygon class="fig-ah" points="268,113.5 268,122.5 276,118"/><rect class="fig-box" x="276" y="100" width="156" height="36" rx="8"/><text class="fig-t-xs" x="354.0" y="123.0" text-anchor="middle">1 回整理すれば防げた</text><rect class="fig-box-a" x="8" y="186" width="232" height="36" rx="8"/><text class="fig-t-s" x="124.0" y="209.0" text-anchor="middle">先にやることを後回しにした</text><text class="fig-t-xs" x="14" y="240" text-anchor="start">例： サブドメイン / Actions の許可</text><line class="fig-a" x1="240" y1="204" x2="269" y2="204"/><polygon class="fig-ah" points="268,199.5 268,208.5 276,204"/><rect class="fig-box" x="276" y="186" width="156" height="36" rx="8"/><text class="fig-t-xs" x="354.0" y="209.0" text-anchor="middle">公式の手順を先に読む</text>
</svg>
<figcaption>一番効いたのは、手元で CI と同じ検査を回すことだった。</figcaption>
</figure>

1 は調べれば済む。2 は、**どのコマンドが何を見ているかを 1 回整理する**だけで防げた。3 は、公式の手順を先に通して読んでいれば避けられた。

一番効いた対策は、**手元で CI と同じ検査を回す**ことだった。これだけで push してから落ちる回数が大きく減った。

連載はここまで。同じものを作るなら、第 1 回から順にたどれば動く。
