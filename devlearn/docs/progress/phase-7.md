# 段 7　道具

状態: **進行中**（2026-11-10 に始めた）

設計は `docs/tools.md`（形・本物の出力の取り方・レッスンごとに要る物）。

## 進み

| 道具 | 状態 |
|---|---|
| 土台（履歴と巻き戻し `src/lib/tools/session.ts`） | 済 |
| 本物の出力の記録（`tools-real/`、`.github/workflows/record-devlearn-real.yml`） | 済 |
| シェルの土台（読み取り・展開・パイプ・リダイレクト・`cd` `pwd` `echo` `printf` `ls` `cat` `mkdir` `rm`） | 済 |
| `git`（模擬） | 済。git-001〜009・sec-013 の 11 場面（約 210 行）が、本物の記録と出力・エラー・終了コードまで一字ずつ一致 |
| `shell`（模擬） | 未 |
| `docker`（模擬） | 未 |
| `js`（本物） | 未 |
| `sql`（本物、sql.js） | 未 |
| 実戦の画面（道具を使う実戦） | git で済。舞台に作業ツリー・ステージ・リポジトリを前 → 後、端末、1 行の入力、合格の項目、巻き戻せる履歴。合格で修了をブラウザに残す（L-6）。公開 URL（`04e862b`）で `look.ts` 28 / 28 |

## 本物の出力の取り方で分かったこと

- 手元（Windows 11 Home）は WSL2 が仮想化の無効で起動できず（`HCS_E_HYPERV_NOT_INSTALLED`）、Docker も動かない。
  本物の出力は GitHub Actions の Ubuntu 24.04 で取る（`docs/tools.md` 2 章）
- 記録は、標準出力を擬似端末（幅 80、`TERM=dumb`）につないで取る。端末で打ったときと同じ形（`ls` の横並び、`git log` の `(HEAD -> main)`）になる
- 擬似端末の台本を `pty.py` と名付けると、Python の標準の `pty` を隠して動かなかった。`ttyrun.py` にし、`python3 -I` で走らせる
- 記録の置き場所を `out/` にすると、ルートの `.gitignore` の `out` に当たって残らなかった。`recorded/` にした
- 見本 git-001 の commit ID `84eecf4` は、UNIX 時刻 `1794268800`（2026-11-10T09:00:00+09:00）で再現する。初めの記録の台本は 1 年ずれた値を持っていたので直した
- 記録した版：Ubuntu 24.04.5 LTS・GNU bash 5.2.21・git 2.56.0・GNU coreutils 9.4

## git の模擬で、本物に合わせて入れた振る舞い

- `git log --graph` は、git の位相の順（後の親から先に辿る LIFO）と列の寄せ方（`|/`、合流の `|\`）を再現した
- `git fetch` は `origin/HEAD` を自動で作る（git 2.48 からの既定 `followRemoteHEAD=create`。記録で分かった）
- `git clone` は遠くの URL を「今いる場所 + 打った道」のまま残す（`/home/learner/demo/../remote.git`）。`git fetch` の出力の `From` は末尾の `.git` を落とす
- `git rebase` の進みの表示は改行でなく復帰（CR）で上書きする。画面の端末は CR を行の上書きとして描く
- `git revert` の要約には ` Date:` の行が付く（記録の環境は日時を環境変数で与えるため）
- 衝突の途中の `git diff`（結合差分）は、到達目標に要らないので場面から外し、模擬でも扱わない

## 気づいたこと（申し送り）

- git-001 の「例」の行は、端末ではない所で取った形（`84eecf4 first commit`）。端末では `84eecf4 (HEAD -> main) first commit` と出る。
  模擬は端末の形なので、段 10 で例の行を端末の形に直す
- 模擬の git の実装（`git.ts`）は、本物の記録（場面の JSON）を先に書いてから作った。ただし比べるテスト（`real.test.ts`）は git.ts の後に書いた。以降は場面 → 記録 → 比べるテスト（保留）→ 模擬の順にする
