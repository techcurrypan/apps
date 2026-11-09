---
title: '無料でブログを作る (5) 自動公開の道を通す'
date: '2026-11-04'
summary: git push したら検査して Cloudflare へ出す。API トークンの権限、Secrets、ワークフローの全文。gen と check と build が何をしているか。
tags: ['cloudflare', 'ci', 'security']
---

`git push` すれば公開される状態にする。この連載で一番長い回。

**この回が終わると**、記事を書いて push するだけで公開 URL が更新される。型の誤りがあれば公開されずに止まる。

**前提**: 第 2 回でアカウント ID とサブドメインができ、第 4 回で記事が 1 本書けていること。GitHub にリポジトリがあること。

## 作る流れ

<figure class="fig">
<svg viewBox="0 0 440 338" role="img" aria-label="CI は依存の取得、型定義の生成、型検査、組み立ての 4 段を通ったときだけ配信する">
<rect class="fig-box" x="248" y="16" width="184" height="234" rx="8"/><text class="fig-t-s" x="340.0" y="102.0" text-anchor="middle">× どこかで落ちたら</text><text class="fig-t-s" x="340.0" y="120.0" text-anchor="middle">配信まで行かない</text><text class="fig-t-s" x="340.0" y="138.0" text-anchor="middle"></text><text class="fig-t-s" x="340.0" y="156.0" text-anchor="middle">公開 URL は</text><text class="fig-t-s" x="340.0" y="174.0" text-anchor="middle">前の版のまま</text><rect class="fig-box" x="16" y="16" width="190" height="48" rx="8"/><text class="fig-m" x="111.0" y="36.0" text-anchor="middle">npm ci</text><text class="fig-t-s" x="111.0" y="54.0" text-anchor="middle">依存を入れる</text><line class="fig-a" x1="111" y1="64" x2="111" y2="71"/><polygon class="fig-ah" points="106.5,70 115.5,70 111,78"/><line class="fig-a" x1="206" y1="40" x2="241" y2="40" stroke-dasharray="4 4"/><polygon class="fig-ah" points="240,35.5 240,44.5 248,40"/><rect class="fig-box" x="16" y="78" width="190" height="48" rx="8"/><text class="fig-m" x="111.0" y="98.0" text-anchor="middle">npm run gen</text><text class="fig-t-s" x="111.0" y="116.0" text-anchor="middle">型定義を作る</text><line class="fig-a" x1="111" y1="126" x2="111" y2="133"/><polygon class="fig-ah" points="106.5,132 115.5,132 111,140"/><line class="fig-a" x1="206" y1="102" x2="241" y2="102" stroke-dasharray="4 4"/><polygon class="fig-ah" points="240,97.5 240,106.5 248,102"/><rect class="fig-box-a" x="16" y="140" width="190" height="48" rx="8"/><text class="fig-m" x="111.0" y="160.0" text-anchor="middle">npm run check</text><text class="fig-t-s" x="111.0" y="178.0" text-anchor="middle">型の誤りを探す</text><line class="fig-a" x1="111" y1="188" x2="111" y2="195"/><polygon class="fig-ah" points="106.5,194 115.5,194 111,202"/><line class="fig-a" x1="206" y1="164" x2="241" y2="164" stroke-dasharray="4 4"/><polygon class="fig-ah" points="240,159.5 240,168.5 248,164"/><rect class="fig-box" x="16" y="202" width="190" height="48" rx="8"/><text class="fig-m" x="111.0" y="222.0" text-anchor="middle">npm run build</text><text class="fig-t-s" x="111.0" y="240.0" text-anchor="middle">組み立てる</text><line class="fig-a" x1="206" y1="226" x2="241" y2="226" stroke-dasharray="4 4"/><polygon class="fig-ah" points="240,221.5 240,230.5 248,226"/><line class="fig-a" x1="111" y1="250" x2="111" y2="275"/><polygon class="fig-ah" points="106.5,274 115.5,274 111,282"/><text class="fig-t-s" x="119" y="270.0" text-anchor="start">4 つ全部通った</text><rect class="fig-box-a" x="16" y="282" width="190" height="44" rx="8"/><text class="fig-t" x="111.0" y="309.0" text-anchor="middle">wrangler で配信</text>
</svg>
<figcaption>どこかで落ちれば配信まで行かない。公開中のものは壊れない。</figcaption>
</figure>

## 手順 1: API トークンを作る

Cloudflare のダッシュボードで、右上のアイコンから **My Profile** → **API Tokens** → **Create Token**。

1. テンプレートの一覧から **Edit Cloudflare Workers** の Use template を押す
2. **Account Resources** を、自分のアカウント 1 つに絞る
3. **Zone Resources** は、独自ドメインを使わないなら触らなくてよい
4. Continue to summary → Create Token

**成功したらこう見える**: 「Token created successfully」と出て、トークンの文字列が表示される。

### 大事なこと

- **1 回しか表示されない。** 画面を閉じると二度と見られない。失くしたら作り直す
- このトークンは **Cloudflare を操作する権限そのもの**。漏れると勝手に配信・削除ができる
- 画面を人に送らない。チャットに貼らない

次の手順で GitHub に登録するので、この画面は開いたままにしておく。

### なぜ Edit Cloudflare Workers なのか

権限は必要な分だけに絞るのが原則。Workers に配信するだけなら、このテンプレートで足りる。

「全部許可」のトークンを作ると、漏れたときに被害が広がる。

## 手順 2: GitHub の Secrets に登録する

リポジトリの **Settings** → **Secrets and variables** → **Actions** → **New repository secret**。

| 名前 | 中身 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 作ったトークン |
| `CLOUDFLARE_ACCOUNT_ID` | 32 桁のアカウント ID |

名前は 1 文字でも違うと動かない。大文字小文字も合わせる。

**成功したらこう見える**: Repository secrets の一覧に 2 つ並ぶ。中身は以後表示されない（これが正しい）。

### 秘密情報の置き場所

| 置いてよいか | 場所 |
|---|---|
| よい | GitHub の Secrets、Cloudflare の Secrets |
| **駄目** | リポジトリの中のファイル、コミットの説明文、公開されるファイル |

とくに注意するのが環境変数の名前。**`VITE_` で始まる環境変数は、ブラウザに配られるファイルに埋め込まれる。** つまり誰でも見られる。秘密情報を `VITE_` に入れてはいけない。

<figure class="fig">
<svg viewBox="0 0 440 196" role="img" aria-label="API トークンは Cloudflare で作り GitHub の Secrets に入れ、Actions が読んで配信に使う">
<rect class="fig-box" x="8" y="16" width="124" height="62" rx="8"/><text class="fig-t" x="70.0" y="34.0" text-anchor="middle">Cloudflare</text><text class="fig-t-s" x="70.0" y="52.0" text-anchor="middle">トークンを作る</text><text class="fig-t-xs" x="70.0" y="70.0" text-anchor="middle">1 回だけ表示</text><rect class="fig-box-a" x="158" y="16" width="124" height="62" rx="8"/><text class="fig-t" x="220.0" y="34.0" text-anchor="middle">GitHub</text><text class="fig-t-s" x="220.0" y="52.0" text-anchor="middle">Secrets に</text><text class="fig-t-s" x="220.0" y="70.0" text-anchor="middle">入れる</text><rect class="fig-box" x="308" y="16" width="124" height="62" rx="8"/><text class="fig-t" x="370.0" y="43.0" text-anchor="middle">Actions</text><text class="fig-t-s" x="370.0" y="61.0" text-anchor="middle">実行時に読む</text><line class="fig-a" x1="132" y1="47" x2="151" y2="47"/><polygon class="fig-ah" points="150,42.5 150,51.5 158,47"/><line class="fig-a" x1="282" y1="47" x2="301" y2="47"/><polygon class="fig-ah" points="300,42.5 300,51.5 308,47"/><rect class="fig-box" x="308" y="118" width="124" height="44" rx="8"/><text class="fig-t" x="370.0" y="136.0" text-anchor="middle">Cloudflare</text><text class="fig-t-s" x="370.0" y="154.0" text-anchor="middle">へ配信</text><line class="fig-a" x1="370" y1="78" x2="370" y2="111"/><polygon class="fig-ah" points="365.5,110 374.5,110 370,118"/><rect class="fig-box" x="8" y="118" width="274" height="44" rx="8"/><text class="fig-t-xs" x="145.0" y="136.0" text-anchor="middle">× リポジトリ・コミット文・VITE_ の環境変数</text><text class="fig-t-xs" x="145.0" y="154.0" text-anchor="middle">× スクリーンショット・チャット</text><text class="fig-t-s" x="145" y="182" text-anchor="middle">ここに書くと公開される</text>
</svg>
<figcaption>VITE_ で始まる環境変数はブラウザに埋め込まれる。秘密情報を入れない。</figcaption>
</figure>

アカウント ID は秘密ではないが、Secrets に入れておくと設定が 1 か所にまとまって楽。

## 手順 3: Actions を許可する

組織のリポジトリでは、外部の Actions が既定で禁止されていることがある。これに当たると、ワークフローが始まる前にこう落ちる。

```
Error: ... are not allowed in techcurrypan/apps
```

**リポジトリの** Settings → Actions → General → Actions permissions で **Allow all actions and reusable workflows** を選ぶ。

組織の設定ページに同じ項目が無いことがある。その場合はリポジトリ側で設定する。

## 手順 4: ワークフローを置く

`.github/workflows/deploy-blog.yml` を作る。全文。

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

要点だけ説明する。

- `paths` — `blog/` の下が変わった push のときだけ動く。ほかのアプリを触ったときに無駄に走らない
- `workflow_dispatch` — 画面から手で実行できるようにする指定。これを書いておかないと再実行の釦が出ない
- `permissions: contents: read` — このワークフローに与える権限を読み取りだけに絞る
- `working-directory: blog` — 各コマンドを `blog/` の中で実行する
- `cache: npm` — 依存の取得を速くする

配信は **GitHub Actions からだけ**行う。手元から `wrangler deploy` を打つ手順は作らない。それを許すと、検査を通さずに公開できてしまう。

## gen と check と build は何をしているか

ここが分からないまま並べていたので、整理する。

### npm run gen

中身は `wrangler types`。

Cloudflare の環境（`assets` の割り当てなど）の**型定義ファイル `worker-configuration.d.ts` を作る**。このファイルは自動生成物なのでリポジトリに入れていない。

入れていないということは、GitHub 側には存在しない。だから配信の前に作る必要がある。これを忘れるとこう落ちる。

```
✘ [ERROR] Types file not found at worker-configuration.d.ts.
```

### npm run check

中身は `wrangler types --check && svelte-kit sync && svelte-check`。

**型の誤りを探す。** ここが関所。

重要なのは、**`npm run dev` は型を検査しない**こと。手元では普通に動いていたのに push して初めて落ちる、という事故がこれで起きる。

実際に起きたのが、`vite.config.ts` に書いた関数の引数に型を書き忘れていた例。dev では動き、CI だけが落ちた。

### npm run build

中身は `wrangler types --check && vite build`。

**配信する形に組み立てる。** 結果は `.svelte-kit/cloudflare/` に出る。`wrangler.jsonc` の `main` と `assets` がこの場所を指している。

### 順番の理由

```
gen   → 型定義を作る（check と build の前提）
check → 型の誤りで止める（壊れたものを組み立てない）
build → 組み立てる
```

`check` を `build` の前に置くのは、壊れていることが分かっているものを組み立てる時間が無駄だから。

## 手順 5: 公開する前に手元で検査する

Actions で落ちてから直すのは遠回り。公開前に手元で同じ検査を回す。

```bash
npm run gen
npm run check
```

`found 0 errors` になってから push する。

`npm run gen` を先に打つのは、`worker-configuration.d.ts` が手元に無いと `check` が始まらないから。1 回作れば次からは `check` だけでよい。

## 手順 6: push して確かめる

```bash
git add -A
git commit -m "ブログを公開する"
git push
```

**成功したらこう見える**: GitHub の Actions タブに実行が現れ、各段が緑になる。最後の段のログに配信先の URL が出る。公開 URL を開くと、書いた記事が表示される。

## 落ちたときにどこを見るか

Actions タブで赤くなった実行を開き、**赤い印が付いている段**を開く。

| 落ちた段 | 原因の見当 |
|---|---|
| ワークフローが始まらない | Actions の許可（手順 3） |
| `npm ci` | `package-lock.json` が古い。手元で `npm install` して commit する |
| 型定義を生成 | トークンか アカウント ID の名前違い |
| 型と書式の検査 | 型の誤り。手元で `npm run check` すると同じ内容が出る |
| 組み立て | 本文に中括弧が入っている、取り込み先の名前が違う |
| Cloudflare へ配信 | サブドメイン未登録、トークンの権限不足 |

ログは長いので、**`✘` と `Error` を探す**のが早い。

## 関所が本当に働くか確かめる

最後に、これを 1 回やっておく。

1. どこかのファイルに、わざと型の誤りを入れる
2. push する
3. **検査の段で止まり、配信されない**ことを確認する
4. 公開 URL が前の版のままであることを確認する
5. 誤りを元に戻して push する

これを確かめていないと、検査が関所として働いているのかどうか分からない。「仕組み上そうなるはず」で済ませない。

## ここまでの確認

- push すると検査が走り、通ったときだけ公開される
- `gen` / `check` / `build` が何をしているか言える
- 秘密情報の置き場所が分かっている
- 落ちたときにどこを見るか分かっている

次は、記事を書く手順をコマンドに畳む。
