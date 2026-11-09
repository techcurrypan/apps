# 段 1　土台と配信

状態: **完了**（2026-11-09）

## 作った物

- `devlearn/` に SvelteKit の雛形（`sv create` minimal / TypeScript / prettier / eslint /
  vitest / adapter-cloudflare の workers 向け）。既にあった `PROMPT.txt` / `CLAUDE.md` / `docs/` は変えていない
  - `prettier --write` が一度 `docs/` を整え直したため `git checkout` で元に戻し、
    `.prettierignore` に `docs/` / `CLAUDE.md` / `PROMPT.txt` / 生成物を足した
- `wrangler.jsonc`：Worker 名 `devlearn`。画面は prerender して静的アセットとして配る
- `package.json` のスクリプト：`gen` / `check`（前に `precheck` で組み立て結果を消す）/ `lint` /
  `test` / `content:check`（レッスン 0 本で通る）/ `secrets` / `build`
- `scripts/secrets.ts` + `scripts/lib/secret-scan.ts`：git に入る物・配信物・CI 設定を調べる。
  GitHub / AWS / Slack / Google の鍵、秘密鍵、秘密らしい名前の `VITE_` 変数、
  `CLOUDFLARE_API_TOKEN` の値の直書きを見つけたら失敗
- `src/lib/build-info.ts`：コミット ID を 7 桁に、組み立て日時を日本時間にする
- 画面 1 枚（`src/routes/+page.svelte`）：配信されたコミットの短い ID と組み立て日時
- `../.github/workflows/deploy-devlearn.yml`：`devlearn/**` と自分自身の変更で動く。
  `npm ci` → `gen` → `check` → `lint` → `test` → `content:check` → `secrets` → `build` →
  （配信物の `secrets`）→ `wrangler-action`
- `.gitattributes`：改行を LF にそろえる（Windows の手元と CI で prettier の結果を同じにする）
- `docs/free-services.md`：Workers と GitHub Actions の無料枠

## テスト（先に失敗を確かめてから実装）

- `src/lib/build-info.test.ts`（5 件）、`scripts/lib/secret-scan.test.ts`（8 件）。
  実装の前に走らせ、モジュールが無いため 2 ファイルとも失敗することを確かめた

## 完成条件

| # | 条件 | どう確かめたか | 結果 |
|---|---|---|---|
| 1 | push で検査が走り、通ると配信される | `6b01e25` を push。GitHub の API（`/actions/runs?head_sha=`）で「Deploy devlearn」が `success`。公開 URL の応答が 404 → 200 に変わった | 満たした |
| 2 | 公開 URL に、今 push したコミットの短い ID が出る | `curl https://devlearn.techcurrybread.workers.dev/` で `data-testid="commit">6b01e25`、次の push の後は `de3d9c7`。Chrome の headless で画面を撮って目で確かめた（`shots/phase-1-top.png`） | 満たした |
| 3 | わざと型の誤りを入れると止まり、公開 URL は前の版のまま。戻す | `ad0998f` で `build-info.ts` に `const x: number = '…'` を入れて push。ジョブの段は「型の検査」が `failure`、以降と「Cloudflare へ配信」は `skipped`。公開 URL は `6b01e25` のまま。`de3d9c7` で戻し、配信が `success`、公開 URL が `de3d9c7` に変わった | 満たした |
| 4 | 旧 `swallow` の GitHub Pages が今まで通り | `https://swallowsaba.github.io/swallow/` と `…/swallow/devlearn-arena/` が 200。`swallowsaba/swallow` の `pushed_at` は 2026-11-08T23:39:12Z のままで、この段では触っていない | 満たした |
| 5 | 隣の `blog/` の配信が今まで通り（`deploy-blog.yml` を変えていない） | `git log -- .github/workflows/deploy-blog.yml` の最新は前からの `67d3dd3`。この段の push で「Deploy blog」は走っていない（paths が `blog/**` のため）。`https://blog.techcurrybread.workers.dev` が 200 | 満たした |
| 6 | Workers 無料枠と課金の条件を `docs/free-services.md` に確認日と出典つきで | 公式文書 3 ページを 2026-11-09 に読み、数字と URL を書いた。GitHub Actions も同じく | 満たした |

## 満たせなかった物

無し。

## 気づいたこと（次の段への申し送り）

- 手元で `npm run build` の後に `npm run check` を打つと、svelte-check が `.svelte-kit/output` まで
  検査して落ちる。`precheck` で組み立て結果を消して避けた（CI は check が build より前なので影響しない）
- `prettier --write .` を打っても `docs/` は整え直されない設定にした
- Bash の heredoc では `\` が `\` に潰れることがある。正規表現を書くときは Edit で確かめる
- ローカルのコマンドで画面を撮るには Chrome の headless を使う：
  `chrome.exe --headless=new --window-size=1280,720 --screenshot=<path> <URL>`
