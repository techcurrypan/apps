---
title: '無料でブログを作る (9) 見つけてもらう'
date: '2026-11-08'
summary: 検索と SNS に出る形を整える。title と description、OGP、RSS、sitemap、robots.txt、アクセス解析。全部で 1 時間かからない。
tags: ['cloudflare']
---

書いただけでは読まれない。見つけてもらう側の作りを整える。

**この回が終わると**、検索に載る形になり、SNS に貼ったときに見た目が付き、何が読まれているかが分かる。

<figure class="fig">
<svg viewBox="0 0 440 320" role="img" aria-label="記事が検索エンジン・SNS・購読者に届くために、どの指定がどこに効くか">
<rect class="fig-box-a" x="132" y="16" width="176" height="40" rx="8"/><text class="fig-t" x="220.0" y="41.0" text-anchor="middle">書いた記事</text><line class="fig-a" x1="72" y1="56" x2="72" y2="89"/><polygon class="fig-ah" points="67.5,88 76.5,88 72,96"/><rect class="fig-box" x="8" y="96" width="128" height="32" rx="8"/><text class="fig-t" x="72.0" y="117.0" text-anchor="middle">検索エンジン</text><rect class="fig-box" x="18" y="140" width="108" height="24" rx="8"/><text class="fig-m-s" x="72.0" y="157.0" text-anchor="middle">title</text><rect class="fig-box" x="18" y="170" width="108" height="24" rx="8"/><text class="fig-m-s" x="72.0" y="187.0" text-anchor="middle">description</text><rect class="fig-box" x="18" y="200" width="108" height="24" rx="8"/><text class="fig-m-s" x="72.0" y="217.0" text-anchor="middle">sitemap.xml</text><rect class="fig-box" x="18" y="230" width="108" height="24" rx="8"/><text class="fig-m-s" x="72.0" y="247.0" text-anchor="middle">robots.txt</text><line class="fig-a" x1="220" y1="56" x2="220" y2="89"/><polygon class="fig-ah" points="215.5,88 224.5,88 220,96"/><rect class="fig-box" x="156" y="96" width="128" height="32" rx="8"/><text class="fig-t" x="220.0" y="117.0" text-anchor="middle">SNS</text><rect class="fig-box" x="166" y="140" width="108" height="24" rx="8"/><text class="fig-m-s" x="220.0" y="157.0" text-anchor="middle">og:title</text><rect class="fig-box" x="166" y="170" width="108" height="24" rx="8"/><text class="fig-m-s" x="220.0" y="187.0" text-anchor="middle">og:description</text><rect class="fig-box" x="166" y="200" width="108" height="24" rx="8"/><text class="fig-m-s" x="220.0" y="217.0" text-anchor="middle">og:image</text><line class="fig-a" x1="368" y1="56" x2="368" y2="89"/><polygon class="fig-ah" points="363.5,88 372.5,88 368,96"/><rect class="fig-box" x="304" y="96" width="128" height="32" rx="8"/><text class="fig-t" x="368.0" y="117.0" text-anchor="middle">読み続ける人</text><rect class="fig-box" x="314" y="140" width="108" height="24" rx="8"/><text class="fig-m-s" x="368.0" y="157.0" text-anchor="middle">rss.xml</text><rect class="fig-box" x="8" y="272" width="424" height="36" rx="8"/><text class="fig-t-s" x="220.0" y="295.0" text-anchor="middle">アクセス解析 ― 何が読まれているかで、次に書くものが決まる</text>
</svg>
<figcaption>全部やらなくても、上から順に効く。合わせて 1 時間かからない。</figcaption>
</figure>

**前提**: 第 8 回まで。公開 URL が動いていること。

## まず title と description

ここが土台。検索結果に出るのも、タブに出るのも、SNS に貼ったときに出るのもこれ。

`<svelte:head>` に書く。記事の情報は索引から取れるので、記事ごとに自動で入る。

```svelte
<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
</svelte:head>
```

`canonical` は「このページの正式な URL はこれ」と伝えるもの。同じ内容が複数の URL で見えるときに、評価が分散するのを防ぐ。

サイト名と URL は 1 か所にまとめておく。

```typescript
export const SITE = {
	name: 'techcurrypan',
	description: '作った物と、調べた事の記録',
	url: 'https://blog.techcurrybread.workers.dev'
};
```

## OGP

SNS に貼ったときに出る、題名・概要・画像の指定。

```svelte
<meta property="og:type" content="article" />
<meta property="og:title" content={post.title} />
<meta property="og:description" content={post.summary} />
<meta property="og:url" content={url} />
<meta property="og:image" content={SITE.url + (post.cover || '/ogp.png')} />
<meta name="twitter:card" content="summary_large_image" />
```

画像は `static/ogp.png` に 1 枚置くだけでいい。**1200×630** が標準。記事ごとに変えたければ、その記事に `cover` を書く。

題名から画像を自動生成する方法もあるが、画像を作る部品を足すことになり、組み立ても遅くなる。記事数が増えて面倒になってからで十分。

**確認**: SNS の投稿欄に URL を貼って、題名と画像が出るか見る。各サービスに検証用のページもある。

## RSS

更新を購読してもらう仕組み。技術ブログでは今も使われている。

`src/routes/rss.xml/+server.ts` を置くと、`/rss.xml` でその中身が返る。索引から記事を並べて XML を組み立てるだけ。

```typescript
export const prerender = true;

export async function GET() {
	const xml = '<?xml version="1.0" encoding="UTF-8"?>...';
	return new Response(xml, {
		headers: { 'content-type': 'application/xml; charset=utf-8' }
	});
}
```

`prerender = true` を書くと、組み立てのときに中身を作って静的ファイルとして配信する。読まれるたびに生成しないので、Worker のリクエスト数も消費しない。

題名や概要に `&` や `<` が入ると XML が壊れるので、逃がす処理を忘れない。

`<head>` に 1 行足すと、読み取り側が自動で見つけてくれる。

```svelte
<link rel="alternate" type="application/rss+xml" href="/rss.xml" />
```

## sitemap

検索エンジンに「このサイトにはこういうページがある」と渡す一覧。リンクをたどって見つけてもらうより、漏れがなく早い。

RSS と同じやり方で `/sitemap.xml` を返す。記事だけでなく、連載のページやタグのページも入れておく。

## robots.txt

「どこを見てよいか」を伝えるファイル。`static/robots.txt` に置けばそのまま配信される。

```
User-agent: *
Allow: /

Sitemap: https://blog.techcurrybread.workers.dev/sitemap.xml
```

sitemap の場所をここに書いておくと、登録しなくても拾われやすくなる。

**確認**: `/robots.txt`・`/rss.xml`・`/sitemap.xml` を直接開いて、中身が出るか見る。

## アクセス解析

Cloudflare Web Analytics を使った。無料で、閲覧者を個人として追跡しない。

1. ダッシュボードで **Web Analytics** を開く
2. ホスト名を登録する
3. 出てくる 1 行を `src/app.html` の `</body>` の前に貼る

```html
<script
	type="module"
	src="https://static.cloudflareinsights.com/beacon.min.js"
	data-cf-beacon='{"token": "ここに出てきた文字列"}'
></script>
```

このトークンは閲覧者のブラウザに配られるものなので、**公開されて構わない**。第 5 回の API トークンとは別物で、秘密情報ではない。

**成功したらこう見える**: 公開 URL を何回か開いてから、Web Analytics の画面に数字が出る。反映に少し時間がかかる。

数字だけでよければ、Worker の **Metrics** でもリクエスト数が見られる。何も貼らずに済む。

## Google Search Console

検索に拾われる速度を上げ、どんな語で見られているかを知るための登録。

サイトを追加し、所有権を確認し、sitemap の URL を送る。送らなくてもいずれ拾われるが、新しいサイトは時間がかかるので送った方が早い。

## 効く順

全部やらなくても、上から順に効く。

1. **title と description** — これが無いと何も始まらない
2. **OGP** — 貼られたときに見た目が付く
3. **sitemap と robots.txt** — 置くだけ
4. **RSS** — 読む人が固定されると強い
5. **アクセス解析** — 何が読まれているかが分かると、次に書くものが決まる

全部合わせても 1 時間かからない。書き始める前に済ませておくと、後から全記事に効く。

## ここまでの確認

- 記事ごとに title と description が出ている
- SNS に貼ると題名と画像が出る
- `/rss.xml`・`/sitemap.xml`・`/robots.txt` が開ける
- アクセス解析に数字が出ている

次は最後。この連載で詰まった所をまとめる。
