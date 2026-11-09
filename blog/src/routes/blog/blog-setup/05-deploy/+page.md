---
title: '無料でブログを作る (5) GitHub Actions で自動公開する'
date: '2026-11-08'
summary: push したら検査して Cloudflare へ出すまで。トークンの作り方と、途中で止まった 3 か所。
---

`git push` すれば公開される状態にする。

## 先に Cloudflare 側の準備

### アカウント

`dash.cloudflare.com/sign-up` で登録する。無料。プランを選ぶ画面は出ない。クレジットカードは登録しない。

### アカウント ID

ダッシュボードで Compute を開くと、URL が次の形になる。

```
https://dash.cloudflare.com/<32桁の英数字>/workers-and-pages
```

この 32 桁を控える。

### workers.dev のサブドメイン

Workers & Pages の画面で、サブドメインを 1 回だけ登録する。これが公開 URL の一部になる。登録しないと最初の配信で止まる。

### API トークン

Manage account → Account API Tokens → Create Token。

テンプレートの一覧から **Edit Cloudflare Workers** を選ぶ。対象は自分のアカウント 1 つに絞る。

作成すると**1 回だけ**表示される。閉じると二度と見られないので、次の手順まで画面を開いたままにしておく。

## GitHub に登録する

リポジトリの Settings → Secrets and variables → Actions → New repository secret。

| 名前 | 中身 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 作ったトークン |
| `CLOUDFLARE_ACCOUNT_ID` | 32 桁 |

名前は 1 文字でも違うと動かない。

トークンをリポジトリの中・コミットの文・公開するファイルに書いてはいけない。`VITE_` で始まる環境変数もブラウザに埋め込まれて公開されるので、秘密情報を入れない。

## ワークフローを置く

`.github/workflows/deploy-blog.yml` を作る。やることは 4 つ。

1. コードを取ってくる
2. Node を用意して依存を入れる
3. 型定義を生成し、検査して、組み立てる
4. `cloudflare/wrangler-action` で配信する

`blog/` の下が変わった push のときだけ動くようにしておくと、関係ない変更で無駄に走らない。

配信は GitHub Actions からだけ行う。手元から配信すると、検査を通さずに公開できてしまう。

## 止まった 3 か所

### 外部の Actions が実行できない

組織のリポジトリでは、外部の Actions が既定で禁止されていることがある。リポジトリまたは組織の設定の Actions permissions で許可する。

### 型定義ファイルが無いと言われる

`wrangler types` が作る `worker-configuration.d.ts` は、リポジトリに入れていないので GitHub 側には存在しない。配信の前に生成する手順を足す。

### workers.dev のサブドメインが無い

前述。ダッシュボードで 1 回登録する。
## 公開する前に手元で検査する

ここが一番はまる。**`npm run dev` は型を検査しない。** 型の誤りがあっても手元では普通に動き、push して初めて Actions で止まる。

公開前にこれを回す。

```
npm run check
```

「Types file not found」と言われたら、型定義ファイルが手元に無い。先に作る。

```
npm run gen
npm run check
```

`found 0 errors` になってから公開する。

## 動いたか確かめる

push して、Actions タブで緑になるのを待つ。公開 URL を開いて、書いたものが出ていれば成功。

もう 1 つ確かめておくとよいことがある。**わざと型の誤りを入れて push し、検査で止まって公開されないこと**を見ておく。これを確かめていないと、検査が本当に関所として働いているか分からない。