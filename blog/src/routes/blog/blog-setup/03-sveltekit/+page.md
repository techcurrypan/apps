---
title: '無料でブログを作る (3) 手元の準備'
date: '2026-11-02'
summary: Node を確認して SvelteKit の土台を作る。作られたフォルダが何なのか、設定がどこに書かれているか。手元で画面が出るまで。
tags: ['svelte', 'typescript']
---

手元でサイトが表示されるところまで進める。

**この回が終わると**、`npm run dev` で手元のブラウザにページが出る。

**前提**: 第 2 回で Cloudflare のアカウントとサブドメインができていること。

## 手順 1: Node があるか確認する

```bash
node -v
npm -v
```

**成功したらこう見える**: 両方とも版が表示される。

```
v24.19.0
11.17.0
```

Node は 20 以上あれば足りる。無ければ公式サイトから入れる。`npm` は Node に付いてくるので別に入れなくてよい。

## 手順 2: 土台を作る

リポジトリのフォルダに移り、`blog` という名前で作る。

```bash
cd X:\git\apps
npx sv create blog
```

`sv` は Svelte の公式のコマンド。初回は取得の確認が出るので `y` で進める。

いくつか選択肢を聞かれる。選んだものと理由。

| 聞かれること | 選んだもの | 理由 |
|---|---|---|
| テンプレート | SvelteKit minimal | 余計な例が入らない |
| 型 | TypeScript | 誤りを公開前に見つけたい |
| 追加する物 | prettier, eslint | 書式と誤りの検査 |
| アダプタ | cloudflare | 公開先が Workers |

**アダプタ**というのは、同じコードをどこに配信するかを切り替える部品。Cloudflare 用を選ぶと `@sveltejs/adapter-cloudflare` が入り、Workers 向けに組み立てられる形になる。

## 手順 3: 依存を入れて起動する

```bash
cd blog
npm install
npm run dev
```

**成功したらこう見える**:

```
VITE v8.3.6  ready in 823 ms

➜  Local:   http://localhost:5173/
```

その URL を開くと、素のページが表示される。

止めるときは `Ctrl + C`。

## 作られたフォルダの意味

| 場所 | 何か |
|---|---|
| `src/routes/` | **URL になるフォルダ**。ここの構造がそのまま URL になる |
| `src/lib/` | 使い回す部品や関数 |
| `static/` | そのまま配信されるファイル（画像・`robots.txt` など） |
| `vite.config.ts` | 組み立ての設定。SvelteKit の設定もここに入る |
| `tsconfig.json` | 型検査の設定 |
| `wrangler.jsonc` | Cloudflare 側の設定 |
| `package.json` | 依存と、`npm run ...` で呼べるコマンドの一覧 |
| `.svelte-kit/` | 自動生成。触らない。Git にも入らない |

`src/routes/` だけ覚えておけば当面は困らない。

### はまった点: `svelte.config.js` が無い

解説記事を見ると `svelte.config.js` を編集せよと書いてあることが多い。しかし新しい雛形にはこのファイルが無い。

今は **SvelteKit の設定も `vite.config.ts` の中に書く**形になっている。`sveltekit()` を呼ぶところに引数として渡す。

```typescript
export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter()
		})
	]
});
```

古い記事を見て `svelte.config.js` を自分で作ると、設定が二重になって混乱する。作らないこと。

## wrangler.jsonc の中身

Cloudflare 側の設定。最初はこれだけ分かれば足りる。

```json
{
	"name": "blog",
	"compatibility_date": "2026-11-08",
	"main": ".svelte-kit/cloudflare/_worker.js",
	"assets": {
		"binding": "ASSETS",
		"directory": ".svelte-kit/cloudflare"
	},
	"workers_dev": true
}
```

- `name` — Worker の名前。公開 URL の一部になる
- `main` — 組み立て後の、動かすファイル
- `assets` — 静的ファイルの置き場。ここにある物は無料・無制限で配信される
- `workers_dev` — `workers.dev` の URL で公開するか

`compatibility_date` は、Cloudflare 側の挙動をその日の仕様に固定するもの。日付を進めない限り、勝手に動きが変わらない。

## ここまでの確認

- `npm run dev` でページが出る
- `src/routes/` の構造が URL になると分かっている
- 設定は `vite.config.ts` と `wrangler.jsonc` にあると分かっている

次は Markdown で記事を書けるようにする。
