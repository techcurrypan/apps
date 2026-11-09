---
title: '無料でブログを作る (5) 自動公開の道を通す'
date: '2026-11-04'
summary: push したら検査して Cloudflare へ出す。トークンの権限、Secrets、ワークフローの全文、gen と check と build の役割。
tags: ['cloudflare', 'ci', 'security']
---

**この回が終わると**、push するだけで公開 URL が更新される。型の誤りがあれば公開されずに止まる。

**前提**: 第 2 回でアカウント ID とサブドメインができ、GitHub にリポジトリがあること。

<figure class="fig">
<svg viewBox="0 0 440 338" role="img" aria-label="CI は依存の取得、型定義の生成、型検査、組み立ての 4 段を通ったときだけ配信する">
<rect class="fig-box" x="248" y="16" width="184" height="234" rx="8"/><text class="fig-t-s" x="340.0" y="102.0" text-anchor="middle">× どこかで落ちたら</text><text class="fig-t-s" x="340.0" y="120.0" text-anchor="middle">配信まで行かない</text><text class="fig-t-s" x="340.0" y="138.0" text-anchor="middle"></text><text class="fig-t-s" x="340.0" y="156.0" text-anchor="middle">公開 URL は</text><text class="fig-t-s" x="340.0" y="174.0" text-anchor="middle">前の版のまま</text><rect class="fig-box" x="16" y="16" width="190" height="48" rx="8"/><text class="fig-m" x="111.0" y="36.0" text-anchor="middle">npm ci</text><text class="fig-t-s" x="111.0" y="54.0" text-anchor="middle">依存を入れる</text><line class="fig-a" x1="111" y1="64" x2="111" y2="71"/><polygon class="fig-ah" points="106.5,70 115.5,70 111,78"/><line class="fig-a" x1="206" y1="40" x2="241" y2="40" stroke-dasharray="4 4"/><polygon class="fig-ah" points="240,35.5 240,44.5 248,40"/><rect class="fig-box" x="16" y="78" width="190" height="48" rx="8"/><text class="fig-m" x="111.0" y="98.0" text-anchor="middle">npm run gen</text><text class="fig-t-s" x="111.0" y="116.0" text-anchor="middle">型定義を作る</text><line class="fig-a" x1="111" y1="126" x2="111" y2="133"/><polygon class="fig-ah" points="106.5,132 115.5,132 111,140"/><line class="fig-a" x1="206" y1="102" x2="241" y2="102" stroke-dasharray="4 4"/><polygon class="fig-ah" points="240,97.5 240,106.5 248,102"/><rect class="fig-box-a" x="16" y="140" width="190" height="48" rx="8"/><text class="fig-m" x="111.0" y="160.0" text-anchor="middle">npm run check</text><text class="fig-t-s" x="111.0" y="178.0" text-anchor="middle">型の誤りを探す</text><line class="fig-a" x1="111" y1="188" x2="111" y2="195"/><polygon class="fig-ah" points="106.5,194 115.5,194 111,202"/><line class="fig-a" x1="206" y1="164" x2="241" y2="164" stroke-dasharray="4 4"/><polygon class="fig-ah" points="240,159.5 240,168.5 248,164"/><rect class="fig-box" x="16" y="202" width="190" height="48" rx="8"/><text class="fig-m" x="111.0" y="222.0" text-anchor="middle">npm run build</text><text class="fig-t-s" x="111.0" y="240.0" text-anchor="middle">組み立てる</text><line class="fig-a" x1="206" y1="226" x2="241" y2="226" stroke-dasharray="4 4"/><polygon class="fig-ah" points="240,221.5 240,230.5 248,226"/><line class="fig-a" x1="111" y1="250" x2="111" y2="275"/><polygon class="fig-ah" points="106.5,274 115.5,274 111,282"/><text class="fig-t-s" x="119" y="270.0" text-anchor="start">4 つ全部通った</text><rect class="fig-box-a" x="16" y="282" width="190" height="44" rx="8"/><text class="fig-t" x="111.0" y="309.0" text-anchor="middle">wrangler で配信</text>
</svg>
<figcaption>どこかで落ちれば配信まで行かない。公開中のものは壊れない。</figcaption>
</figure>

## 1. API トークンを作る

Cloudflare のダッシュボード → 右上のアイコン → **My Profile** → **API Tokens** → **Create Token**。

1. テンプレートから **Edit Cloudflare Workers** を選ぶ（権限は必要な分だけに絞る。配信だけならこれで足りる）
2. **Account Resources** を自分のアカウント 1 つにする
3. Continue to summary → Create Token

「Token created successfully」と出て文字列が表示されれば成功。**1 回しか表示されない。** 閉じたら作り直し。次の手順で使うので開いたままにする。

漏れると勝手に配信・削除ができる。画面を人に送らない。

## 2. GitHub の Secrets に登録する

リポジトリの **Settings** → **Secrets and variables** → **Actions** → **New repository secret**。

| 名前 | 中身 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 作ったトークン |
| `CLOUDFLARE_ACCOUNT_ID` | 32 桁のアカウント ID |

名前は 1 文字でも違うと動かない。登録後に中身が見えないのが正しい。

### 秘密情報の置き場所

| | 場所 |
|---|---|
| よい | GitHub の Secrets、Cloudflare の Secrets |
| **駄目** | リポジトリの中、コミットの説明文、配信されるファイル |

**`VITE_` で始まる環境変数はブラウザに配られるファイルに埋め込まれる。** 誰でも見られるので、秘密情報を入れない。

<figure class="fig">
<svg viewBox="0 0 440 196" role="img" aria-label="API トークンは Cloudflare で作り GitHub の Secrets に入れ、Actions が読んで配信に使う">
<rect class="fig-box" x="8" y="16" width="124" height="62" rx="8"/><text class="fig-t" x="70.0" y="34.0" text-anchor="middle">Cloudflare</text><text class="fig-t-s" x="70.0" y="52.0" text-anchor="middle">トークンを作る</text><text class="fig-t-xs" x="70.0" y="70.0" text-anchor="middle">1 回だけ表示</text><rect class="fig-box-a" x="158" y="16" width="124" height="62" rx="8"/><text class="fig-t" x="220.0" y="34.0" text-anchor="middle">GitHub</text><text class="fig-t-s" x="220.0" y="52.0" text-anchor="middle">Secrets に</text><text class="fig-t-s" x="220.0" y="70.0" text-anchor="middle">入れる</text><rect class="fig-box" x="308" y="16" width="124" height="62" rx="8"/><text class="fig-t" x="370.0" y="43.0" text-anchor="middle">Actions</text><text class="fig-t-s" x="370.0" y="61.0" text-anchor="middle">実行時に読む</text><line class="fig-a" x1="132" y1="47" x2="151" y2="47"/><polygon class="fig-ah" points="150,42.5 150,51.5 158,47"/><line class="fig-a" x1="282" y1="47" x2="301" y2="47"/><polygon class="fig-ah" points="300,42.5 300,51.5 308,47"/><rect class="fig-box" x="308" y="118" width="124" height="44" rx="8"/><text class="fig-t" x="370.0" y="136.0" text-anchor="middle">Cloudflare</text><text class="fig-t-s" x="370.0" y="154.0" text-anchor="middle">へ配信</text><line class="fig-a" x1="370" y1="78" x2="370" y2="111"/><polygon class="fig-ah" points="365.5,110 374.5,110 370,118"/><rect class="fig-box" x="8" y="118" width="274" height="44" rx="8"/><text class="fig-t-xs" x="145.0" y="136.0" text-anchor="middle">× リポジトリ・コミット文・VITE_ の環境変数</text><text class="fig-t-xs" x="145.0" y="154.0" text-anchor="middle">× スクリーンショット・チャット</text><text class="fig-t-s" x="145" y="182" text-anchor="middle">ここに書くと公開される</text>
</svg>
<figcaption>VITE_ で始まる環境変数はブラウザに埋め込まれる。秘密情報を入れない。</figcaption>
</figure>

## 3. Actions を許可する

組織のリポジトリでは外部の Actions が既定で禁止されていることがある。当たるとワークフローが始まる前に落ちる。

```
Error: ... are not allowed in techcurrypan/apps
```

**リポジトリの** Settings → Actions → General → Actions permissions で **Allow all actions and reusable workflows** を選ぶ。組織の設定ページに同じ項目が無いことがある。

## 4. ワークフローを置く

`.github/workflows/deploy-blog.yml` の全文。

```yaml
name: Deploy blog

on:
  push:
    branches: [main]
    paths:
      - "blog/**"
      - ".github/workflows/deploy-blog.yml"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: blog
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: blog/package-lock.json

      - run: npm ci

      - name: 型定義を生成
        run: npm run gen

      - name: 型と書式の検査
        run: npm run check

      - name: 組み立て
        run: npm run build

      - name: Cloudflare へ配信
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: blog
```

| 指定 | 意味 |
|---|---|
| `paths` | `blog/` の下が変わった push だけで動く |
| `workflow_dispatch` | **書かないと再実行の釦が出ない** |
| `permissions: contents: read` | このワークフローの権限を読み取りだけに絞る |

配信は **Actions からだけ**行う。手元から `wrangler deploy` を打てるようにすると、検査を通さずに公開できてしまう。

## gen と check と build

| コマンド | 中身 | 役割 |
|---|---|---|
| `npm run gen` | `wrangler types` | 型定義 `worker-configuration.d.ts` を作る。自動生成物なのでリポジトリに無い |
| `npm run check` | `wrangler types --check` ＋ `svelte-check` | 型の誤りを探す。**関所** |
| `npm run build` | `wrangler types --check` ＋ `vite build` | `.svelte-kit/cloudflare/` に組み立てる |

この順なのは、型定義が無いと検査できず、壊れていると分かっているものを組み立てるのが無駄だから。

**`npm run dev` は型を検査しない。** 手元で動いていたのに push して初めて落ちる事故は、これで起きる。

## 5. 公開前に手元で検査する

```bash
npm run gen
npm run check
```

`found 0 errors` になってから push する。`gen` は初回だけでよい。

## 6. push して確かめる

```bash
git add -A
git commit -m "ブログを公開する"
git push
```

Actions タブで各段が緑になり、公開 URL に記事が出れば成功。

## 落ちたときにどこを見るか

Actions タブで赤い実行を開き、**赤い印が付いている段**を開く。`✘` と `Error` を探す。

| 落ちた段 | 原因の見当 |
|---|---|
| 始まらない | Actions の許可（手順 3） |
| `npm ci` | `package-lock.json` が古い。手元で `npm install` して commit |
| 型定義を生成 | トークンかアカウント ID の名前違い |
| 型と書式の検査 | 型の誤り。手元の `npm run check` で同じものが出る |
| 組み立て | 本文に中括弧、取り込み先の名前違い |
| Cloudflare へ配信 | サブドメイン未登録、トークンの権限不足 |

## 関所が働くか確かめる

1. わざと型の誤りを入れて push する
2. 検査の段で止まり、公開 URL が前の版のままであることを見る
3. 元に戻して push する

これを 1 回やっておく。仕組み上そうなるはず、では確かめたことにならない。

次は、記事を書く手順をコマンドに畳む。
