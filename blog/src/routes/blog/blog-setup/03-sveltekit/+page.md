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
cd path/to/apps      # リポジトリのフォルダ
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

<figure class="fig">
<svg viewBox="0 0 440 226" role="img" aria-label="src/routes の下のフォルダ構成が、そのまま URL になる対応">
<text class="fig-t-s" x="96" y="18" text-anchor="middle">src/routes/ の中</text><text class="fig-t-s" x="344" y="18" text-anchor="middle">URL</text><rect class="fig-box" x="8" y="34" width="184" height="40" rx="8"/><text class="fig-m-s" x="100.0" y="59.0" text-anchor="middle">blog/hello/+page.md</text><rect class="fig-box-a" x="248" y="34" width="184" height="40" rx="8"/><text class="fig-m-s" x="340.0" y="59.0" text-anchor="middle">/blog/hello</text><line class="fig-a" x1="192" y1="54" x2="241" y2="54"/><polygon class="fig-ah" points="240,49.5 240,58.5 248,54"/><rect class="fig-box" x="8" y="88" width="184" height="40" rx="8"/><text class="fig-m-s" x="100.0" y="113.0" text-anchor="middle">blog/k8s/01-intro/+page.md</text><rect class="fig-box-a" x="248" y="88" width="184" height="40" rx="8"/><text class="fig-m-s" x="340.0" y="113.0" text-anchor="middle">/blog/k8s/01-intro</text><line class="fig-a" x1="192" y1="108" x2="241" y2="108"/><polygon class="fig-ah" points="240,103.5 240,112.5 248,108"/><rect class="fig-box" x="8" y="142" width="184" height="40" rx="8"/><text class="fig-m-s" x="100.0" y="167.0" text-anchor="middle">blog/k8s/02-pod/+page.md</text><rect class="fig-box-a" x="248" y="142" width="184" height="40" rx="8"/><text class="fig-m-s" x="340.0" y="167.0" text-anchor="middle">/blog/k8s/02-pod</text><line class="fig-a" x1="192" y1="162" x2="241" y2="162"/><polygon class="fig-ah" points="240,157.5 240,166.5 248,162"/><text class="fig-t-s" x="220" y="214" text-anchor="middle">フォルダ名がそのまま URL になる</text>
</svg>
<figcaption>ファイル名は常に +page.md。記事ごとに変えるのはフォルダ名。</figcaption>
</figure>

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
