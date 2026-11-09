# 他者の物

devlearn が使う、他者が作った公開物の記録。ライセンスが明示的に許す物だけを使う（CLAUDE.md 第 7 章）。

---

## Astryx theme-neutral（見た目の土台）

| 項目 | 内容 |
|---|---|
| 物 | `@astryxdesign/theme-neutral` の `dist/theme.css`（CSS 変数とその既定の当て方） |
| 版 | **0.7.11 に固定**（2026-11-07 公開。ベータ版のため、更新は自分で判断して行う） |
| 出典 | `https://github.com/meta/astryx`（`packages/themes/neutral`）、`https://registry.npmjs.org/@astryxdesign/theme-neutral/-/theme-neutral-0.7.11.tgz` |
| ライセンス | MIT。`Copyright (c) 2026 Meta Platforms, Inc.`（リポジトリの `LICENSE` と、配布物の `LICENSE` を読んだ） |
| 表示義務 | 写しに著作権表示と許諾の文を含める。段 6 で、配る CSS の先頭にライセンスの全文を残し、配信物に `third-party-licenses.txt` を置く |
| 確かめた日 | 2026-11-10 |
| 配布物の `theme.css` の SHA-256 | `88239be738a64af72ab767c9f71d72c80e540cc1bb476edb92bb41ad1bd9eafd`（段 6 で取り込む物がこれと同じことを確かめる） |

### 使う物・使わない物

| 物 | 使うか | 理由 |
|---|---|---|
| `dist/theme.css`（トークンと、見出し・段落の既定の当て方） | 使う | 色（明暗）・角丸・影・動きの長さの土台 |
| `fonts.css` | 使わない | 外の書体配信を読み込む。書体（Figtree）は日本語の字を持たない |
| 部品（`@astryxdesign/core`） | 使わない | React 専用。devlearn は Svelte（D-07） |
| npm の依存として入れること | しない | `theme-neutral` は `react` と `@astryxdesign/core` を peer に、`lucide-react` を依存に持つ。入れると React が入る。`theme.css` 1 つをリポジトリに写して置く |

### 確かめたこと（2026-11-10）

1. **ライセンス**：GitHub の API でリポジトリのライセンスが MIT。`LICENSE` の全文を読んだ。配布物にも同じ `LICENSE` がある
2. **React 無しで読み込めるか**：`theme.css` は素の CSS（`@layer` と `@scope ([data-astryx-theme="neutral"])`）。
   React も JavaScript も無い HTML に `<link>` で読み込み、`data-astryx-theme="neutral"` を付けた要素で、
   変数（`--color-background-body` など）が効き、背景・文字・札の枠が描かれることを headless Chrome で撮って確かめた
3. **暗い配色**：色の変数 105 個が `light-dark(明, 暗)` で書かれ、`:root { color-scheme: light dark }` と
   `html[data-theme="light" | "dark"]` で切り替わる。`data-theme="dark"` の HTML を撮り、地が `#1b1b1b`、文字が白に
   替わることを目で確かめた
4. **版の固定**：npm の 0.7.11 の配布物を取り、`theme.css` の SHA-256 を上に記録した。リポジトリに写して置くので、
   配布元が更新されても devlearn は替わらない

### 注意

- `@scope` を使うので、`@scope` を解するブラウザが要る。互換表（MDN の browser-compat-data `css/at-rules/scope.json`、2026-11-10 に確かめた）では、Chrome / Edge 118 以降、Firefox 146 以降、Safari 17.4 以降（26.0〜26.3 は `<input>` と `<textarea>` に効かない部分の対応、26.4 から全て）
- `theme.css` は見出し（`h1`〜`h6`）と段落（`p`）の書体・大きさを `@layer reset` で当てる。devlearn の
  `--dl-*`（`screen-design.md` 4 章）で上書きする
