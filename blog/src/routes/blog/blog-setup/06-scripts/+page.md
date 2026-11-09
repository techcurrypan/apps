---
title: '無料でブログを作る (6) 書く手順をコマンドにする'
date: '2026-11-05'
summary: 記事を 1 本足すのに 6 手かかっていたのを、4 つのコマンドに畳む。覚えることを減らす回。
tags: ['git']
---

ここまでで公開はできる。ただ手順が多い。

**この回が終わると**、覚えるコマンドが 4 つだけになる。

**前提**: 第 5 回で push による公開が通っていること。

<figure class="fig">
<svg viewBox="0 0 440 244" role="img" aria-label="記事を 1 本足す手順が 6 手から 4 手に減った比較">
<text class="fig-t" x="110" y="18" text-anchor="middle">前：6 手</text><text class="fig-accent-t" x="330" y="18" text-anchor="middle">後：4 手</text><rect class="fig-box" x="8" y="32" width="196" height="26" rx="8"/><text class="fig-t-xs" x="106.0" y="50.0" text-anchor="middle">フォルダを作る（第何回か数える）</text><rect class="fig-box" x="8" y="64" width="196" height="26" rx="8"/><text class="fig-t-xs" x="106.0" y="82.0" text-anchor="middle">+page.md を作る</text><rect class="fig-box" x="8" y="96" width="196" height="26" rx="8"/><text class="fig-t-xs" x="106.0" y="114.0" text-anchor="middle">frontmatter を 3 行書く</text><rect class="fig-box" x="8" y="128" width="196" height="26" rx="8"/><text class="fig-t-xs" x="106.0" y="146.0" text-anchor="middle">本文を書く</text><rect class="fig-box" x="8" y="160" width="196" height="26" rx="8"/><text class="fig-t-xs" x="106.0" y="178.0" text-anchor="middle">dev を再起動して確認</text><rect class="fig-box" x="8" y="192" width="196" height="26" rx="8"/><text class="fig-t-xs" x="106.0" y="210.0" text-anchor="middle">add / commit / push</text><rect class="fig-box-a" x="236" y="32" width="196" height="26" rx="8"/><text class="fig-m-s" x="334.0" y="50.0" text-anchor="middle">npm run new</text><rect class="fig-box" x="236" y="64" width="196" height="26" rx="8"/><text class="fig-t-xs" x="334.0" y="82.0" text-anchor="middle">本文を書く</text><rect class="fig-box-a" x="236" y="96" width="196" height="26" rx="8"/><text class="fig-m-s" x="334.0" y="114.0" text-anchor="middle">npm run check</text><rect class="fig-box-a" x="236" y="128" width="196" height="26" rx="8"/><text class="fig-m-s" x="334.0" y="146.0" text-anchor="middle">npm run publish</text><text class="fig-t-s" x="220" y="230" text-anchor="middle">数える・日付を書く・名前を決めるをやめた</text>
</svg>
<figcaption>毎回同じことをするなら、覚える対象ではなくコマンドにする。</figcaption>
</figure>

## 4 つのコマンド

| コマンド | いつ |
|---|---|
| `npm run new` | 書きはじめるとき |
| `npm run dev` | 書きながら確認するとき |
| `npm run check` | 公開する直前 |
| `npm run publish -- "説明"` | 公開するとき |

## npm run new

対話で聞いてくる。

```
どこに書きますか。
  0) 単独の記事（連載にしない）
  1) blog-setup  （10 本 → 第 11 回）
  n) 新しい連載をはじめる

番号:
```

**連載が一覧に出て、第何回かも自動で数える。** 続けて題名・概要・URL の後半を聞かれる。

できるもの。

```
作成しました: src/routes/blog/blog-setup/11-xxx/+page.md
URL: /blog/blog-setup/11-xxx
```

フォルダ名の番号も日付も入っていて、索引も作り直され、VS Code が開く。あとは本文を書くだけ。

画像は `static/img/連載名/記事名/` に置く（第 4 回）。

## 残りの 3 つ

- **`npm run dev`** — 手元で確認する。**記事を作ったときと frontmatter を直したときは再起動**（第 7 回）
- **`npm run check`** — 型の検査。`found 0 errors` を見てから公開する
- **`npm run publish -- "説明"`** — add・commit・push をまとめて行う

`publish` は**リポジトリ全体**を対象にする。`blog/` の外も触っているときは、先に `git status` で中身を見る。

## なぜコマンドにしたか

手でやっていたときの失敗が、毎回同じだった。番号を間違える、日付が昨日のまま、`summary` を書き忘れて一覧が空になる。

**毎回同じことをするなら、覚える対象ではなくコマンドにする。** 覚えることが減った分だけ、書く方に力が向く。

次は、記事が増えても重くならない仕組みを作る。
