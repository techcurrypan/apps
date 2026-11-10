# 道具

段 7 の設計。`curriculum.md` 3.1 で決めた 5 つの道具を、**道具を使うレッスン（64 本）に要る範囲だけ**作る。
要る範囲は、`curriculum.md` 第 5 章の到達目標から決めた（下の 3 章）。段 10 で本文を書いて足りない物が出たら、
ここに足し、本物の出力を取り直してから模擬に足す。

---

## 1. 形

- 道具は**状態 → 状態の関数**。`run(状態, 打った 1 行) → { 状態, 出力, エラー出力, 終了コード }`。乱数・時計を使わない
- 打った物の履歴を、状態の並び（0 = 初めの状態）として持つ。**巻き戻す**とは、履歴の k 番目の状態に戻り、
  k より後を捨てること（完成条件 2）。模擬の状態は値なので、戻した状態はその時点の状態そのもの
- 本物（`js`・`sql`）は、状態を「初めの状態と、打った物の並び」で表す。巻き戻すときは、初めの状態から k 番目まで打ち直す。
  同じ物を打てば同じ結果になる物だけを扱う（`js` の `Math.random`・`Date.now` は、実戦の中では決まった値を返す物に替える）
- 時刻が出る出力（`git log` の日時、`ls -l` の日時など）は、レッスンの場面の時刻（作り物の時計）で決める

## 2. 本物の出力の取り方

模擬の出力とエラーは、本物と一致させる（完成条件 1）。

- 場面（`tools-real/scenarios/*.json`）に、前準備の命令と、記録する命令を並べる
- GitHub Actions の Ubuntu の上で、場面ごとに空の作業場所を作り、**本物の命令**を打って、
  標準出力・標準エラー・終了コードを `tools-real/recorded/<場面>.json` に記録する（`.github/workflows/record-devlearn-real.yml`）。
  記録は CI がコミットして戻す。手元の機械（Windows）では Linux の本物が動かないため
- 単体テストは、同じ場面を模擬で打ち、記録と一字ずつ比べる
- 時計・利用者・機械の名前は固定する（`TZ=Asia/Tokyo`、利用者 `learner`、`HOME=/home/learner`、git の日時は環境変数で固定）。
  固定できない値（処理にかかった時間など）は、場面ごとに「置き換える規則」を書き、記録と模擬の両方に同じ規則を当ててから比べる。
  置き換えた物は記録に残す
- 端末で続けて打ったときと同じに見せるため、記録は行ごとに次を引き継ぐ（2026-11-10 に足した）
  - 今いる場所・変数（export した物も、しない物も）・前の行の終了コード（`echo $?` が前の行の値を出す）
  - 家は場面ごとに空から作る（`.bashrc` なども置かない）。CI の機械が家に付けている ACL も外す（外さないと `ls -l` に `+` が付く）
  - 時計：`faketime` で、その行の時刻から動かす（`ls -l` の「今」）。その行で変わったファイルの時刻は、行の後でその行の時刻に揃える
    （ファイルの時刻は OS が付けるので faketime では変わらない）。「変わった」の見分けは、その行の作り物の時刻を持つ印のファイルより新しいか
  - 作る物の権限は、Ubuntu の既定の umask 002 による（ファイル 664・ディレクトリ 775・家 750）。模擬も同じ
- 比べる前に、記録と模擬の両方に当てる置き換え（`src/lib/tools/real.test.ts`）
  - `bash: line N: ` と `bash: eval: line N: ` を `bash: ` に（記録は台本の中の `eval` で打つため。端末では行の番号が付かない）
  - 読めない行の 2 行目（`` bash: `| sort' ``）を消す（`eval` では読めない行を写すが、端末で打ったときは写さない）
  - 本物でも毎回変わる物（2026-11-10 に足した。網の場面で分かった）：ping の往復の時間（`time=…ms`・`time …ms`・`rtt …`）、
    dig の問い合わせの番号（`id:`）とかかった時間（`Query time:`）、curl のつながらなかったときの時間（`after … ms`）を同じ字に替える。
    `ip neigh` の行と `ss` の行（見出しの下）は並べ替えてから比べる（OS の中の表の並びは、機械が起きるたびに決まる乱数で変わる）
- 世界（`tools-real/worlds/<名前>.json`）：場面の前に置く物を、記録と模擬が同じファイルから作る。
  `dirs`・`files` は root で置き、`net` は網の名前空間で作り物の網を作る（機械ごとに名前空間、sw の橋につなぐ。DNS は dnsmasq、web は `servers/web.py`）
  - 網の世界では、記録の機械は初めから DNS の機械（192.0.2.53）と話している（行ごとの `sudo` が自分の名前を引くため）。模擬も近くの表にこれを入れて始める
  - curl は端末に出すとき、見出しを太字にし、Location を押せる印（OSC 8）で包む（curl 8.5）。模擬も同じ字を出し、画面の端末が字の飾りとして読む
  - `users`：家を持たない利用者（店の利用者 `shop`、uid 1500）。CI の機械では 990 が使われていたので 1500 にした（2026-11-11）
  - `procs`：場面の前から動いているプロセス。記録はその利用者で `setsid -f` で動かす。模擬は `mock`（子・無視するシグナル）の振る舞いで置く
  - `units`：`files` で置いたサービス。記録は置いた後に `daemon-reload`、場面の後に止めて外す。模擬は `unitMock`（出す行・終わり方）で動かす
  - `docker`：コンテナの場面。記録は初めにコンテナ・ボリューム・網・作る途中の物を全て消し、`images` のイメージだけを残す（無ければ取る）。
    learner を docker の組に入れるのは、コンテナの場面の間だけ（ほかの場面の `id` を変えないため）
  - SSH の相手（`net.hosts[].ssh`、`worlds/ssh.json`）：記録は相手の名前空間で sshd を動かす。相手の鍵は記録のたびに作る（リポジトリに鍵を置かない）。
    相手の機械は家を手元と共有している（家を共有する教室の形）。learner の合言葉は「持たないが締め出してもいない」形（`usermod -p '*'`）にした（UsePAM no の sshd が締め出された利用者を入れないため）
  - 元からある場所（`/etc`・`/opt` など）を `dirs` に書いても、場面の後に消さない（記録の機械の物を消さないため）
- 本物でも毎回変わる物（2026-11-11 に足した。プロセス・サービス・SSH・コンテナの場面で分かった）
  - プロセスの番号：出てきた順の印（P1・P2…）に揃える。記録と模擬で別々に数える（lnx-007・lnx-010）。模擬の番号は 5 桁（本物の機械と同じ桁で、表の幅も比べられる）
  - サービスの状態：`since …`（本物の時刻。記録の時計は faketime だが、systemd は本物の時計で動く）・`Tasks` の上限・`Memory`・`CPU`・`Duration`・日誌の時刻と機械の名前
  - SSH の鍵：指紋（`SHA256:…`）・指紋の絵の中身・公開鍵の字。模擬の鍵は作った時刻と場所で決まる値で、指紋と絵は本物と同じ計算（記録の鍵から指紋と絵を作り直して一致を確かめた）
  - コンテナ：64 字の ID、表（`docker ps`・`images`・`history`・`network ls`・`compose ps`）の ID と時刻の升（見出しの位置で升に分ける）。
    docker は Go の物なので faketime が効かず、本物の時計で「どれだけ前」を出す。模擬は作り物の時計（1 行 1 分）で出す
  - BuildKit の行：かかった時間と、時間のかかった物だけに出る「途中」の行（同じ build でも記録ごとに出たり出なかったりする）を落とす。busybox の ping の往復の時間
- 端末で打ったときと記録とで振る舞いが違う物は、場面の側で記録と同じになる打ち方にした
  - `docker compose exec` は標準入力が端末でないと止まる（the input device is not a TTY）。場面では `-T` を付ける。模擬の端末は端末なので、`-T` が無くても動く
  - `ssh-keygen` の上書きの問いは、記録では `< /dev/null` で答えの無い形にした。模擬の端末は問いに答える口を持たないので、同じく答えの無い形で終わる
- 模擬のシェルの環境（`env`）の並びは、本物の bash と同じ「FNV-1 の 1024 の箱の順、同じ箱では新しい物が先」にする。
  記録だけにある変数（`LD_PRELOAD`・`FAKETIME`・`GIT_*_DATE`・`GIT_PAGER`・`PAGER`）は、場面では `grep` で外れる名前しか出さない

## 3. レッスンごとに要る物

### 3.1 `git`（模擬）

| レッスン | 要る命令 |
|---|---|
| git-001 | `git init`・`git add`・`git commit -m`・`git status`（`--short`）・`git log --oneline`・`git cat-file -t / -p`・`ls`・`cat`・`printf … >` |
| git-002 | `git status`・`git diff`（`--staged`）・`git log`（`--oneline`） |
| git-003 | `git restore`（`--staged`）・`git revert` |
| git-004 | `git branch`・`git switch`（`-c`）・`git log --oneline --graph --all` |
| git-005 | `git merge`（早送り・合流の記録） |
| git-006 | `git merge` の衝突、衝突の印の入ったファイル、`git add`・`git commit` で解く |
| git-007 | `git remote`・`git push`・`git fetch`・`git pull`（遠くのリポジトリは作り物の 1 つ） |
| git-008 | `git rebase` |
| git-009 | `.gitignore`・`git check-ignore -v`・`git status` |
| sec-013 | `git rm --cached`・`.gitignore`・`git log -p` |

### 3.2 `shell`（模擬）

| レッスン | 要る命令 |
|---|---|
| lnx-001 | `pwd`・`cd`・`ls`（`-a`） |
| lnx-002 | `touch`・`mkdir`・`cp`・`mv`・`rm`（`-r`） |
| lnx-003 | `cat`・`head -n`・`tail -n`・`wc`（`-l`） |
| lnx-004 | `ls -l`・`chmod`（数字・記号） |
| lnx-005 | `|`・`>`・`>>`・`echo`・`sort`・`uniq`（`-c`）・`wc -l` |
| lnx-006 | `grep`（`-n`・`-i`・`-v`・`-c`・`-E`） |
| lnx-007 | `ps`・`kill`（シグナル） |
| lnx-008 | `export`・`echo $変数`・`env`・`which`・`PATH` |
| lnx-009 | `bash 台本 引数`・`$1`・`$#`・`$?`・`exit`・`if`・`[ ]` |
| lnx-010 | `systemctl`（`status`・`start`・`stop`）・`journalctl -u -n` |
| lnx-011 | `id`・`whoami`・`groups`・`sudo` |
| net-002 | `ip addr`・`ip neigh`・`ping -c` |
| net-003 | `ip route`・`ip route get` |
| net-004 | `dig`（`+short`） |
| net-006 | `ss -tuln` |
| net-007 | `curl -v` |
| net-008 | `curl -i`・`curl -I` |
| net-013 | `curl -I`・`curl -H 'If-None-Match: …'` |
| sec-002 | `sha256sum`・`printf … |` |
| sec-004 | `openssl x509 -noout -subject -issuer`・`openssl verify -CAfile` |
| sec-008 | `ssh-keygen -t ed25519`・`cat ~/.ssh/*.pub`・`ssh`（作り物の相手） |
| sec-012 | `grep`・`cut`・`sort`・`uniq -c`・`sort -rn`・`head` |

網の命令は、説明用のアドレス（`192.0.2.0/24` ほか）と `example.com` の、決まった作り物の網で答える。

### 3.3 `docker`（模擬）

| レッスン | 要る命令 |
|---|---|
| ctr-001 | `docker run`（`--rm`・`-d`・`--name`）・`docker images` |
| ctr-002 | `docker ps`（`-a`）・`docker stop`・`docker rm` |
| ctr-003 | `docker run -p`・`docker port`・`curl` |
| ctr-004 | `Dockerfile`・`docker build -t` |
| ctr-005 | `docker volume create / ls`・`docker run -v` |
| ctr-006 | `docker run -e`・`--env-file` |
| ctr-007 | `docker compose up -d / ps / down` |
| ctr-008 | `docker build` のキャッシュ・`docker history` |
| ctr-009 | `docker network create / ls`・`--network` |

### 3.4 `js`（本物）と `sql`（本物）

- `js`：書いた式・関数を、ブラウザの JavaScript でその場で走らせる。`console.log` の出力と、投げられたエラーを返す。
  止まらない繰り返しに備え、走らせる時間に上限を置く
- `sql`：sql.js（SQLite）。レッスンの場面の表を作った状態から始め、打った SQL の結果の表とエラーを返す

---

## 4. 実戦のデータの形（`Practice.setup` / `success`）

道具ごとに決める。`setup` は初めの状態、`success` は合格の判定。

### 4.1 `git`

```ts
type GitSetup = {
  initialized: boolean;              // git init 済みか
  files: Record<string, string>;     // 作業場所（/home/learner/demo）のファイル
};
type GitSuccess = {
  commits: number;                   // HEAD から辿れる commit の数
  tracked: string[];                 // 索引にあるファイル（順は問わない）
  statusShort: string;               // git status --short の出力
};
```

### 4.1b `shell`

```ts
type ShellSetup = {
  world?: string;                    // 場面の前に置く世界（tools-real/worlds/<名前>.json。root の物・証明書・網）
  files?: Record<string, string>;    // 作業場所（/home/learner/demo）からの道 → 中身
  dirs?: string[];                   // 作業場所に作るディレクトリ
  modes?: Record<string, string>;    // 道 → 権限（"755" など）
  cwd?: string;                      // 始める場所（作業場所からの道。既定は作業場所）
};
type ShellSuccess = {
  cwd?: string;                      // 今いる場所（絶対の道）
  exists?: string[];                 // ある物（作業場所からの道）
  absent?: string[];                 // 無い物
  files?: Record<string, string>;    // 中身が合う物
  modes?: Record<string, string>;    // 権限が合う物
  output?: string;                   // 最後に打った行の標準出力
};
```

### 4.1c `js`

```ts
type JsSetup = { prelude?: string; code?: string };   // 前に置く物（見えない）と、初めの書き物
type JsSuccess = {
  output?: string;                                    // 走らせた出力（console.log）
  checks?: { expr: string; want: string }[];          // 書き物の後に式を走らせ、console.log と同じ形で比べる
};
```

### 4.1d `sql`

```ts
type SqlSetup = { sql: string };                      // 場面の表を作る SQL
type SqlSuccess = {
  output?: string;                                    // 最後に打った行の出力（.mode table の形）
  query?: { sql: string; want: string };              // 打ち終えた表に、この SQL を打った出力
};
```

### 4.2 間違いの見分け方

`mistakes` の `match` が、打った 1 行の出力（標準出力と標準エラーを合わせた物）に含まれたら、その間違いの `why` と `next` を返す。
`match` が当たらない失敗（終了コードが 0 でない）は、出力そのものを返す。
