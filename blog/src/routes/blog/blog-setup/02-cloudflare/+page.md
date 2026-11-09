---
title: '無料でブログを作る (2) Cloudflare とは何か'
date: '2026-11-01'
summary: 公開先に Cloudflare を選んだ理由。Workers と Pages の違い、無料枠の具体値、課金が始まる条件。アカウントを作って公開用のサブドメインを登録する。
tags: ['cloudflare']
---

ブログを置く場所として Cloudflare を選んだ。名前は聞いたことがあっても何ができるのかは曖昧だったので、選んだ理由から整理する。

**この回が終わると**、Cloudflare のアカウントができ、`自分の名前.workers.dev` という公開用のサブドメインが登録されている。

**前提**: 第 1 回を読んでいること。手を動かすのはこの回から。

## もともとは CDN の会社

世界中にサーバを置き、利用者に一番近い場所から中身を返す仕組みを **CDN**（Content Delivery Network）という。Cloudflare はこれを本業として大きくなった。

CDN を挟むと 2 つ得がある。表示が速くなる。そして元のサーバに直接アクセスが来なくなるので、攻撃を受けにくくなる。

今はそこから広がり、世界中に置いたサーバの上で**自分のコードを動かせる**ようになっている。それが Workers。

## Workers とは

リクエストが来たときだけ実行される、小さなプログラムの置き場。

常時動くサーバを借りるのではないので、読まれていない間は資源も料金も消費しない。無料枠が成り立つのはこのため。

制約もある。1 回のリクエストで使える CPU 時間に上限があり、Node.js の全機能が使えるわけでもない。重い処理には向かない。ブログの配信には十分すぎる。

## Pages とは

静的なサイト（HTML・CSS・画像）を置く仕組み。Git とつないでおけば push のたびに自動で公開される。

先にあったのは Pages の方で、静的サイトなら今でもこれで足りる。

## どちらを選んだか、なぜか

**Workers を選んだ。**

| | Pages | Workers |
|---|---|---|
| 位置づけ | 先にあった方 | 今すすめられている方 |
| 静的ファイルの配信 | できる | できる |
| サーバ側の処理 | 簡易な関数まで | 制限なし |
| 料金 | 無料 | 無料 |

理由は 1 つ。**後から API を足したくなったときに、置き場を増やさなくて済む**から。

Pages で始めると、サーバ側の処理が本格的に必要になった時点で別に Worker を立てることになる。配信先が 2 つに分かれ、間の通信の許可（CORS）と 2 つの管理が増える。最初から Workers にしておけば、静的なページも API も同じ 1 つの場所から出せる。

<figure class="fig">
<svg viewBox="0 0 440 204" role="img" aria-label="Pages は静的配信と Worker が分かれるが、Workers なら 1 つで済む">
<text class="fig-t" x="110" y="20" text-anchor="middle">Pages で始めると</text><text class="fig-accent-t" x="330" y="20" text-anchor="middle">Workers なら</text><rect class="fig-box" x="20" y="36" width="180" height="40" rx="8"/><text class="fig-t" x="110.0" y="61.0" text-anchor="middle">閲覧者</text><rect class="fig-box" x="240" y="36" width="180" height="40" rx="8"/><text class="fig-t" x="330.0" y="61.0" text-anchor="middle">閲覧者</text><line class="fig-a" x1="110" y1="76" x2="110" y2="101"/><polygon class="fig-ah" points="105.5,100 114.5,100 110,108"/><line class="fig-a" x1="330" y1="76" x2="330" y2="101"/><polygon class="fig-ah" points="325.5,100 334.5,100 330,108"/><rect class="fig-box" x="20" y="108" width="84" height="44" rx="8"/><text class="fig-t" x="62.0" y="126.0" text-anchor="middle">Pages</text><text class="fig-t-s" x="62.0" y="144.0" text-anchor="middle">静的</text><rect class="fig-box" x="116" y="108" width="84" height="44" rx="8"/><text class="fig-t" x="158.0" y="126.0" text-anchor="middle">Worker</text><text class="fig-t-s" x="158.0" y="144.0" text-anchor="middle">API</text><rect class="fig-box-a" x="240" y="108" width="180" height="44" rx="8"/><text class="fig-t" x="330.0" y="126.0" text-anchor="middle">Worker 1 つ</text><text class="fig-t-s" x="330.0" y="144.0" text-anchor="middle">静的 ＋ API</text><text class="fig-t" x="110" y="135" text-anchor="middle">＋</text><text class="fig-t-s" x="110" y="172" text-anchor="middle">配信が 2 つ</text><text class="fig-t-s" x="110" y="190" text-anchor="middle">CORS の設定が必要</text><text class="fig-t-s" x="330" y="172" text-anchor="middle">配信は 1 つ</text><text class="fig-t-s" x="330" y="190" text-anchor="middle">設定はそのまま</text>
</svg>
<figcaption>後から API を足したときに差が出る。これが Workers を選んだ理由。</figcaption>
</figure>

静的なページだけで終わる確信があるなら Pages でもいい。この連載では Workers で進める。

## データを置く場所

Workers 自体はデータを持たない。保存が要るときは組み合わせる。

- **KV** — 鍵と値の単純な保存。設定やキャッシュ向き
- **D1** — SQLite の形のデータベース。記事や利用者のデータ向き
- **R2** — ファイルの置き場。画像や動画向き。転送料金がかからないのが特徴

このブログではまだどれも使っていない。画像は記事と同じフォルダに置いている。重くなってきたら R2 に移す。

## 無料枠の具体値

公式の資料で確認した値（確認日: 2026-11-01）。数字は変わるので、使うときに公式を見ること。

| 項目 | 無料枠 |
|---|---|
| Worker へのリクエスト | 1 日 100,000 回 |
| 1 回あたりの CPU 時間 | 10 ミリ秒 |
| 静的ファイルへのリクエスト | 無料・無制限 |

ブログで重要なのは 3 行目。**HTML・CSS・画像・JS といった静的ファイルへのリクエストは、無料枠の 100,000 回に数えられない。** つまり、ただ記事を読まれるだけなら、上限にはほぼ当たらない。

## 課金が始まる条件

無料枠を超えたらどうなるのか。ここが一番知りたいところだった。

**自動で課金されることはない。** 無料枠の 1 日のリクエスト上限に達すると、その Worker は止まる。経路の設定によって挙動が 2 通りある。

- **fail closed** — エラー 1027 の画面が返る
- **fail open** — Worker を通さず、Worker が無いものとして扱われる

カウントは **UTC の 0 時**（日本時間の午前 9 時）にリセットされる。

有料に切り替えるには、自分で有料プランを選んでカードを登録する必要がある。**登録しなければ止まるだけで、請求は来ない。** この連載ではカードを登録しない。

## 手順 1: アカウントを作る

1. Cloudflare のサイトで Sign up を選ぶ
2. メールアドレスとパスワードを入れる
3. 届いたメールのリンクで確認する

**成功したらこう見える**: ダッシュボードが開く。左側に Workers & Pages などの項目が並ぶ。

登録のときにクレジットカードは求められなかった。

## 手順 2: アカウント ID を確認する

ダッシュボードを開いたときの URL に、32 桁の英数字が入っている。これがアカウント ID。

```
https://dash.cloudflare.com/ここがアカウントID/...
```

後で自動公開の設定に使うので、メモしておく。**これは秘密情報ではない。**

## 手順 3: workers.dev のサブドメインを登録する

Workers に公開したものは `何か.自分の名前.workers.dev` という URL で見える。この「自分の名前」の部分を先に登録する。

1. 左の **Workers & Pages** を開く
2. 右側か設定の中に、サブドメインを登録する欄がある
3. 使いたい名前を入れて登録する

**成功したらこう見える**: Workers & Pages の画面に `自分の名前.workers.dev` と表示される。

### はまった点

これを先にやらずに自動公開まで進めたら、配信の最後でこう落ちた。

```
✘ [ERROR] You need to register a workers.dev subdomain before publishing to workers.dev
```

登録は 1 回だけ、ダッシュボードでしかできない。コマンドでは作れないので、ここで済ませておく。

## wrangler という名前

この先、`wrangler` というコマンドが何度も出てくる。**Cloudflare を操作するためのコマンド**で、配信・設定の確認・型定義の生成を全部これで行う。設定は `wrangler.jsonc` というファイルに書く。

第 5 回で、このコマンドを GitHub Actions から呼ぶ形にする。

次は手元の準備。SvelteKit の土台を作って、画面が出るところまで進める。

Sources: [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
