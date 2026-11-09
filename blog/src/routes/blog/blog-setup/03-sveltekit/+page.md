---
title: '無料でブログを作る (3) SvelteKit で土台を作る'
date: '2026-11-06'
summary: Node を入れ、SvelteKit のひな形を作り、手元で動かすところまで。選択肢をどう選んだかも書く。
---

土台を作る。ここまでで手元にブログの原型ができる。

## Node を入れる

SvelteKit は Node の上で動く。入っているか確認する。

```
node -v
npm -v
```

数字が出れば入っている。出なければ `nodejs.org` から **LTS** を入れる。インストーラーは既定のまま進めてよい。終わったらターミナルを開き直す。開きっぱなしだと新しく入れたものが見えない。

Node は手元に入れなくても、GitHub 側で動かせば作れる。ただ、書き換えた結果がすぐ見えるかどうかで、覚える速さが大きく変わる。入れた方がいい。

## ひな形を作る

```
npx sv create blog
```

対話で聞かれる。選んだものは次のとおり。

| 質問 | 選んだもの |
|---|---|
| template | SvelteKit minimal |
| type checking | TypeScript |
| add-ons | prettier, eslint, sveltekit-adapter, mdsvex |
| adapter | cloudflare |
| Workers か Pages か | Workers |
| package manager | npm |

**mdsvex** が Markdown を記事にする部品。**sveltekit-adapter** は、どこに公開するかに合わせて出力の形を変える部品で、ここで cloudflare を選ぶ。

## 動かす

```
cd blog
npm run dev
```

`http://localhost:5173/` が出る。開くと初期画面が表示される。止めるときは `Ctrl+C`。

この状態で、書き換えると即座にブラウザに反映される。

## できたファイル

| 場所 | 中身 |
|---|---|
| `src/routes/` | ページ。フォルダが URL になる |
| `src/lib/` | 共通で使うコード |
| `static/` | そのまま配信されるファイル |
| `vite.config.ts` | 組み立ての設定。mdsvex もここ |
| `wrangler.jsonc` | Cloudflare の設定 |

SvelteKit は「フォルダ ＝ URL」という作り。`src/routes/about/+page.svelte` を置けば `/about` で開ける。覚えることはこれだけ。

## 設定の確認

`vite.config.ts` に mdsvex の行が入っている。

```ts
preprocess: [mdsvex({ extensions: ['.svx', '.md'] })],
extensions: ['.svelte', '.svx', '.md']
```

これで `.md` がページとして扱われる。次の記事で記事を書く。