---
title: '無料でブログを作る (7) 記事が増えても重くしない'
date: '2026-11-06'
summary: 全記事を読み込む作りは 2000 本で破綻する。組み立て時に索引だけを作る形に変えた理由と、自動タグの閾値の話。
tags: ['svelte', 'typescript']
---

記事が 10 本のうちは何をしても動く。2000 本になったときに動くかどうかは、作りで決まる。

**この回が終わると**、一覧・連載・タグ・検索が、記事本文を読み込まずに動くようになる。

**前提**: 第 4 回で記事が書ける状態になっていること。

## 素直に作ると破綻する

一覧ページを作るとき、最初に思いつくのはこれ。

```typescript
const files = import.meta.glob('./**/+page.md', { eager: true });
```

`eager: true` は「今すぐ全部読み込む」という指定。これで全記事の題名と日付が手に入る。10 本なら何も問題ない。

問題は、**これが全記事の本文も一緒に抱える**こと。

一覧ページは題名と概要しか使わないのに、2000 本分の本文が組み立て結果に入る。すると、

- 組み立てに時間がかかる
- 一覧ページを開いた人が、読む気もない 2000 本を受け取る
- dev サーバが起動のたびに全記事を変換する

`eager` を外して遅延にしても、読み込みが 2000 回に分かれるだけで総量は変わらない。

## 索引だけを作る

必要なのは**題名・日付・概要・タグ・連載・読了時間**だけ。本文は要らない。

ならば、組み立ての前に全記事を 1 回走査して、**その情報だけを 1 つのファイルに書き出す**。一覧はそのファイルだけを読む。

```
記事 2000 本
  ↓  組み立て前に 1 回だけ走査
src/lib/index.generated.ts   ← 題名・日付・概要・タグだけ
  ↓
一覧・連載・タグ・検索がこれを読む
```

記事本文は、その記事のページを開いた人にだけ届く。これは SvelteKit が route ごとに分けてくれるので、自分で何もしなくてよい。

## 索引を作るスクリプト

`scripts/build-index.mjs`。やることは単純。

1. `src/routes/blog/` の下を歩いて `+page.md` を集める
2. frontmatter を読む
3. フォルダの位置から連載名と URL を決める
4. 本文から読了時間と自動タグを計算する
5. 日付の新しい順に並べて書き出す

### 連載名と URL

```javascript
const parts = relative(ROOT, file).split(sep).slice(0, -1);

slug: parts.join('/'),
series: parts.length > 1 ? parts[0] : ''
```

`blog/k8s/01-intro/+page.md` なら、`parts` は `k8s` と `01-intro`。最初の 1 つが連載名、全部つないだものが URL。

フォルダが 1 段しかなければ連載名は空、つまり単独の記事。**設定ファイルを持たない**のが要点で、フォルダを作るだけで連載が増える。

### 読了時間

```javascript
const plain = raw.replace(/```[\s\S]*?```/g, '').replace(/[#>*`\-|]/g, '');
const minutes = Math.max(1, Math.round(plain.replace(/\s/g, '').length / 500));
```

コードブロックと記号を除いてから字数を数え、1 分 500 字で割る。日本語の技術記事ならこれくらいが実感に合った。

コードを除くのは、長いコードが貼ってあるだけで「15 分」と出るのを避けるため。

## 自動タグ

タグを毎回手で書くのが面倒だったので、本文から付けるようにした。

語の一覧を持っておく。

```javascript
const KEYWORDS = {
	svelte: ['svelte', 'sveltekit', 'mdsvex', 'runes'],
	cloudflare: ['cloudflare', 'wrangler', 'workers'],
	ci: ['github actions', 'ci/cd', 'workflow']
};
```

本文に出てきたらそのタグを付ける。

### 閾値が 1 だと全部に付く

最初は「1 回でも出たら付ける」にした。失敗だった。

この連載は全記事が SvelteKit と Cloudflare の話なので、**全部の記事に全部のタグが付いた。** タグで絞る意味が無くなる。

```javascript
.filter(([, words]) => words.reduce((n, w) => n + countOf(body, w), 0) >= 3)
```

**3 回以上**にしたら収まった。1 回出ただけなら「触れた」、3 回出たら「その話をしている」という区別。

閾値は記事の長さによるので、数字は書きながら調整するものだと思う。

### 手で足す

自動のものに足したいときは frontmatter に書く。合併して重複を消している。

```javascript
tags: [...new Set([...(fm.tags ?? []), ...auto])].sort()
```

消したいタグがあるときは、語の一覧の方を直す。

## 自動で走らせる

`package.json` に仕込む。

```json
{
	"scripts": {
		"index": "node scripts/build-index.mjs",
		"predev": "node scripts/build-index.mjs",
		"prebuild": "node scripts/build-index.mjs"
	}
}
```

`pre` を付けた名前は、その名前のコマンドの直前に自動で走る。`npm run dev` の前に `predev`、`npm run build` の前に `prebuild`。

つまり **dev の起動時と、組み立て時に必ず作り直される**。作り忘れが起きない。

生成されたファイルは Git に入れない。`.gitignore` に書く。

## 今のところの制約

索引は **dev の起動時に 1 回**しか作られない。だから、

- 記事を新しく作った
- frontmatter を書き換えた

このときは dev サーバを止めて起動し直す必要がある。本文だけの書き換えなら再起動は要らない。

`npm run new` は索引を作り直してくれるが、起動中の dev サーバはそれを読み直さない。

ファイルの変更を見張って索引を作り直す形にすれば直る。まだ入れていない。

## 速さを測る

作りを変えたら、思い込みではなく測る。ダミー記事を大量に作って、組み立て時間と一覧の表示を見る。

`scripts/dummy.mjs` を置く。

```typescript
import { mkdirSync, writeFileSync } from 'node:fs';

const N = Number(process.argv[2] ?? 2000);
for (let i = 0; i < N; i++) {
	const dir = `src/routes/blog/dummy/p${String(i).padStart(4, '0')}`;
	mkdirSync(dir, { recursive: true });
	writeFileSync(
		`${dir}/+page.md`,
		`---\ntitle: 'ダミー ${i}'\ndate: '2020-01-01'\nsummary: '計測用'\n---\n\n本文。\n`,
		'utf8'
	);
}
console.log(`${N} 本作りました。`);
```

日付を古くしておくと、一覧の先頭に出てこないので本物の記事が隠れない。

```bash
node scripts/dummy.mjs 2000
npm run index
npm run build
```

測ったら**ダミーを消す**。消し忘れたまま公開すると、空の記事 2000 本が検索に出る。

```powershell
Remove-Item -Recurse -Force src\routes\blog\dummy
npm run index
```

この計測はまだ実施していない。やったら結果をこの記事に追記する。

## ここまでの確認

- 一覧は索引だけを読んでいる
- 記事本文は、その記事を開いた人にだけ届く
- タグが自動で付く
- 記事を足したら dev を再起動する、という制約を知っている

次は、読む側の見やすさを整える。
