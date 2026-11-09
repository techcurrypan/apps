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
- 時計・利用者・機械の名前は固定する（`TZ=UTC`、利用者 `learner`、`HOME=/home/learner`、git の日時は環境変数で固定）。
  固定できない値（処理にかかった時間など）は、場面ごとに「置き換える規則」を書き、記録と模擬の両方に同じ規則を当ててから比べる。
  置き換えた物は記録に残す

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
