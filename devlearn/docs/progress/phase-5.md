# 段 5　画面設計

状態: **完了**（2026-11-10）

## 作った物

- `docs/screen-design.md`
  - 第 1・2 章：3 案（一枚の紙 / 舞台と台本〔Astryx を土台〕/ 三つの窓）を、決めること 1〜9 と構成図で書き、D-1〜D-18 の判定表。選んだ理由と落とした理由
  - 第 3 章：画面の種類、共通の 4 領域、場面ごとの役割、舞台の動き、状態と画面の対応
  - 第 4 章：見た目の値（CSS 変数）の一覧。色・文字・余白・角丸・影・動きの速さ・配置
  - 第 5〜7 章：携帯の幅での形、キーボード操作、明暗
  - 第 8 章：原理 1〜8 の対応表と、段 6 での確かめ方
- `docs/third-party.md`：Astryx theme-neutral 0.7.11 の記録
- `docs/decisions.md`：D-12
- `docs/progress/shots/phase-5-astryx-light.png` / `phase-5-astryx-dark.png`：React 無しで読み込んだ確かめの画面

## どう確かめたか（Astryx）

- GitHub の API（`/repos/meta/astryx`）でライセンスが MIT、最新の公開が v0.7.11（2026-11-07）
- `LICENSE` の全文を読んだ（`Copyright (c) 2026 Meta Platforms, Inc.`）
- `npm view` で `@astryxdesign/theme-neutral@0.7.11` の peer（`react` / `@astryxdesign/core`）と依存（`lucide-react`）を見た。
  依存に入れると React が入るため、`theme.css` 1 つを写して使うと決めた
- 配布物を一時フォルダに展開し、`theme.css` の中身（`@layer`・`@scope`・変数 209 個、うち色 105 個が `light-dark()`）を読んだ
- JavaScript も React も無い HTML に `theme.css` を `<link>` で読み込み、明（`data-theme="light"`）と暗
  （`data-theme="dark"`）を headless Chrome で撮った。どちらも地・文字・札の枠・成功と失敗の色が効いた（上の 2 枚）
- `theme.css` の SHA-256 を `third-party.md` に記録した

## 完成条件

| # | 条件 | どう確かめたか | 結果 |
|---|---|---|---|
| 1 | 3 案（うち 1 つは Astryx を土台）と、D-1〜D-18 の判定表 | 第 1 章に 3 案（案 2 が Astryx）、各案に 1〜9 と構成図。第 2 章に 18 行 × 3 案の表 | 満たした |
| 2 | 選んだ案が D-1〜D-18 を全て満たす | 判定表で案 2 が全て ○。各 ○ に、満たす所（章の番号）を書いた | 満たした |
| 3 | 原理 1〜8 をどこで満たすかの対応表 | 第 8 章。8 行それぞれに、満たす所と段 6 での確かめ方 | 満たした |
| 4 | 見た目の値（CSS 変数）の一覧 | 第 4 章。色 19・文字 9・余白と角丸と影 6 組・動き 5・配置 4 | 満たした |
| 5 | Astryx を採るなら、ライセンス・React 無しの読み込み・暗い配色・版の固定を確かめ、`third-party.md` に記録 | 上の「どう確かめたか」。4 点とも `third-party.md` の「確かめたこと」に書いた | 満たした |
| 6 | `decisions.md` に決着として記録 | D-12 | 満たした |

## 満たせなかった物

無し。

## 気づいたこと（次の段への申し送り）

- 段 6 で `theme.css` を `static/` に写すとき、SHA-256 が記録と同じかを確かめ、先頭にライセンスの全文を足す。
  配信物に `third-party-licenses.txt` を置く
- `@scope` の Firefox の対応版は、段 6 で互換表を見て `third-party.md` に書き足す
- 舞台の物の置き場所は `appear` の `at`（列・行）を格子に当てる（3.3）。段 2 で申し送った `at` の扱いはこれで決まった
- 段 6 の見本は段 2 の `git-001`
