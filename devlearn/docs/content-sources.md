# 問題の出典

レッスンの**問題（設問と選択肢）だけ**は、過去の資料から取ってよい。
それ以外（本文・図・実戦・カリキュラム・ゲーム設計）は一から作る。

---

## 1. 取ってよい物

| 出典 | 可否 | 条件 |
|---|---|---|
| 旧 `swallow/devlearn-arena` の問題 | **可** | 下の 2 章の整形を通すこと |
| 自分で作った問題 | 可 | — |
| 公開されている一般的な演習問題 | 可 | ライセンスを確認し、出典を書く |
| 検定の**公式**の過去問 | **不可** | そのままも、言い換えも不可 |
| 公式教材の文・図・表 | **不可** | 要点を自分の言葉で書き、出典を示す |
| ライセンス不明の問題集 | **不可** | — |

## 2. 取ってきた問題に必ずすること

1. **本文と切り離す。** 問題だけを取り、解説は新しく書く
2. `docs/explanation-standard.md` の型（`Practice` / `CheckItem`）に入れ直す
3. **具体値を補う。** 抽象的な設問は、実際の値が入った形に書き直す
4. `mistakes`（誤りと、その理由と次の一手）を 2〜4 件付ける。元の資料に無ければ新しく作る
5. 出典を `docs/content-sources-log.md` に 1 行で記録する
   （レッスン ID / 元の出典 / 取った日）

## 3. 検定の扱い

- 「G 検定の出題範囲に沿う」「統計検定 2 級の範囲を含む」といった**範囲の説明は
  書いてよい**
- 公式の認定・提携・合格保証を思わせる表現を書かない
- ロゴ・意匠を使わない
- 問題は**全て自作**にする。範囲を参考にするだけ

## 4. 迷ったら

出典が不明、またはライセンスが読み取れない問題は**使わない。**
新しく作る方が早い。

## 5. コマンドの参考（LS-P8。screen-design.md 11.5）

やってみるの「コマンドの参考」に出すリンク。**道具を作った所・その公式の説明書だけ**を載せる。まとめサイト・個人のブログは載せない。
表の正は `src/lib/practice/refs.ts`（`COMMAND_REFS`）。載せてよい置き場は同じファイルの `OFFICIAL`。

確かめ方：2026-11-15 に全ての URL を開き（HTTP 200）、頁の題がそのコマンドの説明であることを見た。Bash の組み込み（echo・printf・cd・export）と dig は、頁の中の節の印（`#index-echo` など）があることも見た。

| コマンド | URL | 頁の題（2026-11-15） |
|---|---|---|
| `git add` | https://git-scm.com/docs/git-add | Git - git-add Documentation |
| `git commit` | https://git-scm.com/docs/git-commit | Git - git-commit Documentation |
| `git status` | https://git-scm.com/docs/git-status | Git - git-status Documentation |
| `git log` | https://git-scm.com/docs/git-log | Git - git-log Documentation |
| `git revert` | https://git-scm.com/docs/git-revert | Git - git-revert Documentation |
| `git switch` | https://git-scm.com/docs/git-switch | Git - git-switch Documentation |
| `git merge` | https://git-scm.com/docs/git-merge | Git - git-merge Documentation |
| `git pull` | https://git-scm.com/docs/git-pull | Git - git-pull Documentation |
| `git push` | https://git-scm.com/docs/git-push | Git - git-push Documentation |
| `git rebase` | https://git-scm.com/docs/git-rebase | Git - git-rebase Documentation |
| `git rm` | https://git-scm.com/docs/git-rm | Git - git-rm Documentation |
| `docker run` | https://docs.docker.com/reference/cli/docker/container/run/ | docker container run ／ Docker Docs |
| `docker stop` | https://docs.docker.com/reference/cli/docker/container/stop/ | docker container stop ／ Docker Docs |
| `docker rm` | https://docs.docker.com/reference/cli/docker/container/rm/ | docker container rm ／ Docker Docs |
| `docker build` | https://docs.docker.com/reference/cli/docker/buildx/build/ | docker buildx build ／ Docker Docs |
| `docker volume` | https://docs.docker.com/reference/cli/docker/volume/ | docker volume ／ Docker Docs |
| `docker exec` | https://docs.docker.com/reference/cli/docker/container/exec/ | docker container exec ／ Docker Docs |
| `docker network` | https://docs.docker.com/reference/cli/docker/network/ | docker network ／ Docker Docs |
| `docker compose up` | https://docs.docker.com/reference/cli/docker/compose/up/ | docker compose up ／ Docker Docs |
| `curl` | https://curl.se/docs/manpage.html | curl - How To Use |
| `SELECT` | https://www.sqlite.org/lang_select.html | SELECT |
| `UPDATE` | https://www.sqlite.org/lang_update.html | UPDATE |
| `CREATE` | https://www.sqlite.org/lang_createtable.html | CREATE TABLE |
| `INSERT` | https://www.sqlite.org/lang_insert.html | INSERT |
| `EXPLAIN` | https://www.sqlite.org/lang_explain.html | EXPLAIN |
| `BEGIN` | https://www.sqlite.org/lang_transaction.html | Transaction |
| `COMMIT` | https://www.sqlite.org/lang_transaction.html | Transaction |
| `echo` | https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html | Bash Builtins (Bash Reference Manual) |
| `printf` | https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html | Bash Builtins (Bash Reference Manual) |
| `cd` | https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html | Bourne Shell Builtins (Bash Reference Manual) |
| `export` | https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html | Bourne Shell Builtins (Bash Reference Manual) |
| `ls` | https://www.gnu.org/software/coreutils/manual/html_node/ls-invocation.html | ls invocation (GNU Coreutils 9.12) |
| `mkdir` | https://www.gnu.org/software/coreutils/manual/html_node/mkdir-invocation.html | mkdir invocation (GNU Coreutils 9.12) |
| `cp` | https://www.gnu.org/software/coreutils/manual/html_node/cp-invocation.html | cp invocation (GNU Coreutils 9.12) |
| `rm` | https://www.gnu.org/software/coreutils/manual/html_node/rm-invocation.html | rm invocation (GNU Coreutils 9.12) |
| `tail` | https://www.gnu.org/software/coreutils/manual/html_node/tail-invocation.html | tail invocation (GNU Coreutils 9.12) |
| `head` | https://www.gnu.org/software/coreutils/manual/html_node/head-invocation.html | head invocation (GNU Coreutils 9.12) |
| `cat` | https://www.gnu.org/software/coreutils/manual/html_node/cat-invocation.html | cat invocation (GNU Coreutils 9.12) |
| `chmod` | https://www.gnu.org/software/coreutils/manual/html_node/chmod-invocation.html | chmod invocation (GNU Coreutils 9.12) |
| `sort` | https://www.gnu.org/software/coreutils/manual/html_node/sort-invocation.html | sort invocation (GNU Coreutils 9.12) |
| `uniq` | https://www.gnu.org/software/coreutils/manual/html_node/uniq-invocation.html | uniq invocation (GNU Coreutils 9.12) |
| `cut` | https://www.gnu.org/software/coreutils/manual/html_node/cut-invocation.html | cut invocation (GNU Coreutils 9.12) |
| `tee` | https://www.gnu.org/software/coreutils/manual/html_node/tee-invocation.html | tee invocation (GNU Coreutils 9.12) |
| `sha256sum` | https://www.gnu.org/software/coreutils/manual/html_node/sha2-utilities.html | sha2 utilities (GNU Coreutils 9.12) |
| `grep` | https://www.gnu.org/software/grep/manual/grep.html | GNU Grep 3.12 |
| `ps` | https://man7.org/linux/man-pages/man1/ps.1.html | ps(1) - Linux manual page |
| `kill` | https://man7.org/linux/man-pages/man1/kill.1.html | kill(1) - Linux manual page |
| `systemctl` | https://www.freedesktop.org/software/systemd/man/latest/systemctl.html | systemctl |
| `ping` | https://man7.org/linux/man-pages/man8/ping.8.html | ping(8) - Linux manual page |
| `ip` | https://man7.org/linux/man-pages/man8/ip.8.html | ip(8) - Linux manual page |
| `ss` | https://man7.org/linux/man-pages/man8/ss.8.html | ss(8) - Linux manual page |
| `dig` | https://bind9.readthedocs.io/en/latest/manpages.html | Manual Pages — BIND 9 9.21.29-dev documentation |
| `openssl` | https://docs.openssl.org/3.0/man1/openssl/ | openssl - OpenSSL Documentation |
| `ssh-keygen` | https://man.openbsd.org/ssh-keygen | ssh-keygen(1) - OpenBSD manual pages |
| `ssh` | https://man.openbsd.org/ssh | ssh(1) - OpenBSD manual pages |
