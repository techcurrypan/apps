# 段 7　道具

状態: **済**（2026-11-10 に始め、2026-11-11 に終えた）

設計は `docs/tools.md`（形・本物の出力の取り方・レッスンごとに要る物）。

## 進み

| 道具 | 状態 |
|---|---|
| 土台（履歴と巻き戻し `src/lib/tools/session.ts`） | 済 |
| 本物の出力の記録（`tools-real/`、`.github/workflows/record-devlearn-real.yml`） | 済 |
| シェルの土台（読み取り・展開・パイプ・リダイレクト・`cd` `pwd` `echo` `printf` `ls` `cat` `mkdir` `rm`） | 済 |
| `git`（模擬） | 済。git-001〜009・sec-013 の 11 場面（約 210 行）が、本物の記録と出力・エラー・終了コードまで一字ずつ一致 |
| `shell`（模擬） | 済。lnx-001〜011、net-002〜004・006〜008・013、sec-002・004・008・012 の 22 場面が、本物の記録と出力・エラー・終了コードまで一字ずつ一致（2026-11-11 に lnx-007 プロセス・lnx-010 サービスとログ・sec-008 SSH の鍵・net-008 を足した） |
| `docker`（模擬） | 済。ctr-001〜009 の 9 場面（約 70 行）が本物の記録と一致。Docker 28.0.4・Compose v2.38.2・busybox:1.37。run（--rm・-d・--name・-p・-e・--env-file・-v・--network）・ps・stop・start・rm・logs・port・exec・images・rmi・history・build（BuildKit の行の形と層の使い回し）・volume・network・compose（up -d・ps・down・exec）。コンテナの中は busybox の applet（sh・echo・cat・uname・sleep・printenv・httpd・nc・ping・wget ほか） |
| `js`（本物） | 済。書いた物の全体をその都度初めから走らせる。決まった乱数と時計、作り物の時計で回す setTimeout、回数で止める繰り返しの見張り。履歴と巻き戻し（`src/lib/tools/js/`） |
| `sql`（本物、sql.js） | 済。sql.js 1.15.2（SQLite 3.54.0）。初めの SQL と打った行の並びを状態にし、打つたびに打ち直す。.mode table の形・計画の木・changes。決まった random()（`src/lib/tools/sql/`、`docs/third-party.md`） |
| 実戦の画面（道具を使う実戦） | git で済。舞台に作業ツリー・ステージ・リポジトリを前 → 後、端末、1 行の入力、合格の項目、巻き戻せる履歴。合格で修了をブラウザに残す（L-6）。公開 URL（`04e862b`）で `look.ts` 28 / 28 |

## 段 7 の完成条件

| # | 完成条件 | どう確かめたか | 結果 |
|---|---|---|---|
| 1 | 模擬の出力とエラーが本物と一致する（本物の出力を期待値として記録し、単体テストで固定） | CI の Ubuntu 24.04 で本物の命令を打って `tools-real/recorded/` に記録（`.github/workflows/record-devlearn-real.yml`）。`src/lib/tools/real.test.ts` が全 42 場面を模擬で打ち直し、標準出力・標準エラー・終了コードを一字ずつ比べる。本物でも毎回変わる物だけを揃える規則は `docs/tools.md` 2 章。保留（`PENDING`）は空。`npm run test` 1221 件（道具は 1023 件）が通る（2026-11-11） | ○ |
| 2 | 道具の操作を巻き戻せる | 道具は 状態 → 状態 の関数で、履歴の k 番目に戻す（`src/lib/tools/session.ts`）。テスト：`session.test.ts`（土台）、git・shell・js・sql の各テスト、docker は `docker/docker.test.ts` の「巻き戻すと、その時点のコンテナ・イメージ・ボリュームに戻る」。実戦の画面で巻き戻せることは公開 URL で確かめた（git の実戦、`look.ts`。2026-11-11、`8e1c017` で 28 / 28） | ○ |

CI の検査（型・lint・テスト・content:check・secrets）を通って `8e1c017` が公開された（2026-11-11）。

記録した版（2026-11-11）：Ubuntu 24.04.5 LTS・bash 5.2.21・git 2.56.0・coreutils 9.4・procps-ng 4.0.4・systemd 255.4・OpenSSH 9.6p1・curl 8.5.0・Docker 28.0.4・Docker Compose v2.38.2・busybox 1.37.0。

## 申し送り（段 10 で本文を書くとき）

- 実戦の画面（`ToolPractice.svelte`）につながっている道具は git だけ。shell は初めの状態と合格の判定（`src/lib/practice/shell-practice.ts`）まで、
  js・sql・docker は道具だけがある。段 10 で各分野のレッスンを書くときに、その道具の実戦の画面（舞台の図・合格の項目）をつなぐ。
  docker の実戦の初めの状態は、世界の `docker.images` と `files`（`tools-real/worlds/docker*.json`）の形を使う
- SSH の場面で、`authorized_keys` を 664（組が書ける）にしても入れた。Ubuntu の OpenSSH は、組が本人だけの組なら許す。
  sec-008 の本文で「権限が緩いと入れない」を言うなら、例は 666（ほかの人が書ける）にする（模擬は本物と同じく 666 で断る）
- 名前の無いコンテナの名前：本物は「形容詞_人の名前」。実在の人の名前を使わない（CLAUDE.md 第 7 章）ので、模擬は「形容詞_港町の物」にした（比べるときは揃えず、記録の場面では名前を付けている）

## 本物の出力の取り方で分かったこと

- 手元（Windows 11 Home）は WSL2 が仮想化の無効で起動できず（`HCS_E_HYPERV_NOT_INSTALLED`）、Docker も動かない。
  本物の出力は GitHub Actions の Ubuntu 24.04 で取る（`docs/tools.md` 2 章）
- 記録は、標準出力を擬似端末（幅 80、`TERM=dumb`）につないで取る。端末で打ったときと同じ形（`ls` の横並び、`git log` の `(HEAD -> main)`）になる
- 擬似端末の台本を `pty.py` と名付けると、Python の標準の `pty` を隠して動かなかった。`ttyrun.py` にし、`python3 -I` で走らせる
- 記録の置き場所を `out/` にすると、ルートの `.gitignore` の `out` に当たって残らなかった。`recorded/` にした
- 見本 git-001 の commit ID `84eecf4` は、UNIX 時刻 `1794268800`（2026-11-10T09:00:00+09:00）で再現する。初めの記録の台本は 1 年ずれた値を持っていたので直した
- 記録した版：Ubuntu 24.04.5 LTS・GNU bash 5.2.21・git 2.56.0・GNU coreutils 9.4

## 記録の取り方で直したこと（シェルの場面で分かった）

- 端末で続けて打つのと同じにするため、変数（export しない物も）と前の行の終了コードを次の行へ渡すようにした（`echo $?` が前の行の値を出す）
- 家を場面ごとに空にし、CI の機械が付けている ACL を外した（外さないと `ls -l` に `+` が付く）
- `ls -l` の時刻：faketime でその行の時刻にし、その行で変わったファイルの時刻を行の後で揃える。
  「変わった」の印を本物の今の時刻で作ると、OS の時刻の粗さ（数ミリ秒）で同じ時刻になり取りこぼした（1 回目と 2 回目で `ls -l` が食い違って分かった）。
  印をその行の作り物の時刻にして直した
- 作る物の権限は Ubuntu の既定の umask 002（ファイル 664・ディレクトリ 775・家 750）。模擬も合わせた
- 記録は `eval` で打つので、読めない行の言い方が端末と違う（`bash: eval: line 8:`、読めない行を 2 行目に写す）。比べる前に両方を端末の形に揃える（`docs/tools.md` 2 章）

## シェルの模擬で、本物に合わせて入れた振る舞い

- 命令の探し方：組み込み → PATH の前から（実行できるファイル、または /usr/bin・/bin の命令）。`which -a` も同じ順
- 子の bash（台本・`bash -c`）には export した変数だけが渡る。台本の誤りは「名前: line N:」で言う
- `if` の読み違い（then が無い・fi が無い）は、bash と同じ行の番号で言う
- `env` の並びは bash の変数の箱（FNV-1・1024 箱）の順
- `wc` の数の幅は、ファイルの大きさの合計の桁（標準入力なら 7）。数が 1 つでファイルが 1 つなら幅 1
- `sort -n` で数が同じ行は、行全体を符号の順で比べる（`-r` はこれも逆）

## git の模擬で、本物に合わせて入れた振る舞い

- `git log --graph` は、git の位相の順（後の親から先に辿る LIFO）と列の寄せ方（`|/`、合流の `|\`）を再現した
- `git fetch` は `origin/HEAD` を自動で作る（git 2.48 からの既定 `followRemoteHEAD=create`。記録で分かった）
- `git clone` は遠くの URL を「今いる場所 + 打った道」のまま残す（`/home/learner/demo/../remote.git`）。`git fetch` の出力の `From` は末尾の `.git` を落とす
- `git rebase` の進みの表示は改行でなく復帰（CR）で上書きする。画面の端末は CR を行の上書きとして描く
- `git revert` の要約には ` Date:` の行が付く（記録の環境は日時を環境変数で与えるため）
- 衝突の途中の `git diff`（結合差分）は、到達目標に要らないので場面から外し、模擬でも扱わない

## プロセス・サービス・SSH・コンテナの記録で分かったこと（2026-11-11）

- systemd・docker は記録の機械の本物の時計で動く（faketime は、systemd の側と、Go の docker には効かない）。時刻の出る所は揃えて比べる
- BuildKit の行で出す形は、かかった時間によって「途中」の行が出たり出なかったりする（同じ場面を 2 回記録して分かった）。比べるときに落とす
- コンテナの名前は 2 字以上（`--name a` は断られる。初めの場面で分かったので場面を直した）
- `docker compose exec` は、記録の標準入力（端末でない）では `-T` が要る
- SSH の `-v` で出る `Authenticated to …` には `debug1:` が付かない。`-v` の無いときは出ない
- OpenSSH の指紋の絵（randomart）の計算を模擬に書き、記録の公開鍵から指紋と絵を作り直して一致を確かめた（`shell/ssh.test.ts`）
- BuildKit の「送った大きさ」は、ファイルの情報（20 + 道の長さ + 大きさの数の長さ）と中身の包み（5 + 大きさ + 大きさの数の長さ）の和。変わっていないファイルは情報だけを送る（記録の 133B・181B・49B・31B・52B から割り出した）

## 気づいたこと（申し送り）

- git-001 の「例」の行は、端末ではない所で取った形（`84eecf4 first commit`）。端末では `84eecf4 (HEAD -> main) first commit` と出る。
  模擬は端末の形なので、段 10 で例の行を端末の形に直す
- 模擬の git の実装（`git.ts`）は、本物の記録（場面の JSON）を先に書いてから作った。ただし比べるテスト（`real.test.ts`）は git.ts の後に書いた。以降は場面 → 記録 → 比べるテスト（保留）→ 模擬の順にする
