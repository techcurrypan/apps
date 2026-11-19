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
| `tc` | https://man7.org/linux/man-pages/man8/tc.8.html | tc(8) - Linux manual page（2026-11-19） |
| `sysctl` | https://man7.org/linux/man-pages/man8/sysctl.8.html | sysctl(8) - Linux manual page（2026-11-19） |
| `nstat` | https://man7.org/linux/man-pages/man8/nstat.8.html | nstat(8) - Linux manual page（2026-11-19） |
| `ethtool` | https://man7.org/linux/man-pages/man8/ethtool.8.html | ethtool(8) - Linux manual page（2026-11-19） |
| `kubectl get` | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/ | kubectl get（kubernetes.io の kubectl の説明。2026-11-19） |
| `kubectl describe` | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/ | kubectl describe（kubernetes.io の kubectl の説明。2026-11-19） |
| `kubectl logs` | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/ | kubectl logs（kubernetes.io の kubectl の説明。2026-11-19） |
| `kubectl set` | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/ | kubectl set（kubernetes.io の kubectl の説明。2026-11-19） |
| `kubectl rollout` | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/ | kubectl rollout（kubernetes.io の kubectl の説明。2026-11-19） |
| `kubectl delete` | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/ | kubectl delete（kubernetes.io の kubectl の説明。2026-11-19） |
| `kubectl top` | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/ | kubectl top（kubernetes.io の kubectl の説明。2026-11-19） |

## 6. 一次情報（第 2 版の出典。検査 34）

第 2 版のレッスンの `sources` は、この表の URL だけを使う。足すときは URL を開いて（HTTP 200）、数と仕様の文がその頁にあることを確かめ、確かめた日を書く。
Linux のソースは版の tag（`/v6.12/`）の頁で、関数名は `npm run impl:verify` が同じ tag の生のファイルで確かめる。
ACM Queue の頁は自動の取得を断る（403）ため、BBR は Google の論文の頁（research.google）を出典にし、本文の数（YouTube・B4 の結果）は使わない（2026-11-19）。

| レッスン | id | 種類 | 題 | URL | 確かめた日 |
|---|---|---|---|---|---|
| net-101 | rfc9293 | rfc | RFC 9293 Transmission Control Protocol (TCP) | https://www.rfc-editor.org/rfc/rfc9293 | 2026-11-19 |
| net-101 | rfc5681 | rfc | RFC 5681 TCP Congestion Control | https://www.rfc-editor.org/rfc/rfc5681 | 2026-11-19 |
| net-101 | rfc6928 | rfc | RFC 6928 Increasing TCP's Initial Window | https://www.rfc-editor.org/rfc/rfc6928 | 2026-11-19 |
| net-101 | rfc6298 | rfc | RFC 6298 Computing TCP's Retransmission Timer | https://www.rfc-editor.org/rfc/rfc6298 | 2026-11-19 |
| net-101 | rfc8985 | rfc | RFC 8985 The RACK-TLP Loss Detection Algorithm for TCP | https://www.rfc-editor.org/rfc/rfc8985 | 2026-11-19 |
| net-101 | rfc9438 | rfc | RFC 9438 CUBIC for Fast and Long-Distance Networks | https://www.rfc-editor.org/rfc/rfc9438 | 2026-11-19 |
| net-101 | rfc8290 | rfc | RFC 8290 The Flow Queue CoDel Packet Scheduler and AQM Algorithm | https://www.rfc-editor.org/rfc/rfc8290 | 2026-11-19 |
| net-101 | rfc7323 | rfc | RFC 7323 TCP Extensions for High Performance | https://www.rfc-editor.org/rfc/rfc7323 | 2026-11-19 |
| net-101 | bbr | paper | Cardwell ほか「BBR: Congestion-Based Congestion Control」ACM Queue 14(5), 2016 | https://research.google/pubs/bbr-congestion-based-congestion-control-2/ | 2026-11-19 |
| net-101 | man-ss | man | ss(8) | https://man7.org/linux/man-pages/man8/ss.8.html | 2026-11-19 |
| net-101 | man-tc-fq | man | tc-fq(8) | https://man7.org/linux/man-pages/man8/tc-fq.8.html | 2026-11-19 |
| net-101 | man-ethtool | man | ethtool(8) | https://man7.org/linux/man-pages/man8/ethtool.8.html | 2026-11-19 |
| net-101 | man-tcp | man | tcp(7) | https://man7.org/linux/man-pages/man7/tcp.7.html | 2026-11-19 |
| net-101 | nginx-core | doc | nginx ngx_http_core_module（tcp_nodelay・tcp_nopush） | https://nginx.org/en/docs/http/ngx_http_core_module.html | 2026-11-19 |
| net-101 | systemd-sysctl | source | systemd sysctl.d/50-default.conf | https://github.com/systemd/systemd/blob/main/sysctl.d/50-default.conf | 2026-11-19 |
| net-101 | linux-socket | source | Linux v6.12 net/socket.c | https://github.com/torvalds/linux/blob/v6.12/net/socket.c | 2026-11-19 |
| net-101 | linux-tcp | source | Linux v6.12 net/ipv4/tcp.c | https://github.com/torvalds/linux/blob/v6.12/net/ipv4/tcp.c | 2026-11-19 |
| net-101 | linux-tcp-output | source | Linux v6.12 net/ipv4/tcp_output.c | https://github.com/torvalds/linux/blob/v6.12/net/ipv4/tcp_output.c | 2026-11-19 |
| net-101 | linux-tcp-input | source | Linux v6.12 net/ipv4/tcp_input.c | https://github.com/torvalds/linux/blob/v6.12/net/ipv4/tcp_input.c | 2026-11-19 |
| net-101 | linux-tcp-ipv4 | source | Linux v6.12 net/ipv4/tcp_ipv4.c | https://github.com/torvalds/linux/blob/v6.12/net/ipv4/tcp_ipv4.c | 2026-11-19 |
| net-101 | linux-tcp-timer | source | Linux v6.12 net/ipv4/tcp_timer.c | https://github.com/torvalds/linux/blob/v6.12/net/ipv4/tcp_timer.c | 2026-11-19 |
| net-101 | linux-tcp-offload | source | Linux v6.12 net/ipv4/tcp_offload.c | https://github.com/torvalds/linux/blob/v6.12/net/ipv4/tcp_offload.c | 2026-11-19 |
| net-101 | linux-tcp-cubic | source | Linux v6.12 net/ipv4/tcp_cubic.c | https://github.com/torvalds/linux/blob/v6.12/net/ipv4/tcp_cubic.c | 2026-11-19 |
| net-101 | linux-tcp-cong | source | Linux v6.12 net/ipv4/tcp_cong.c | https://github.com/torvalds/linux/blob/v6.12/net/ipv4/tcp_cong.c | 2026-11-19 |
| net-101 | linux-tcp-bbr | source | Linux v6.12 net/ipv4/tcp_bbr.c | https://github.com/torvalds/linux/blob/v6.12/net/ipv4/tcp_bbr.c | 2026-11-19 |
| net-101 | linux-ip-output | source | Linux v6.12 net/ipv4/ip_output.c | https://github.com/torvalds/linux/blob/v6.12/net/ipv4/ip_output.c | 2026-11-19 |
| net-101 | linux-ip-input | source | Linux v6.12 net/ipv4/ip_input.c | https://github.com/torvalds/linux/blob/v6.12/net/ipv4/ip_input.c | 2026-11-19 |
| net-101 | linux-neigh | source | Linux v6.12 include/net/neighbour.h | https://github.com/torvalds/linux/blob/v6.12/include/net/neighbour.h | 2026-11-19 |
| net-101 | linux-dev | source | Linux v6.12 net/core/dev.c | https://github.com/torvalds/linux/blob/v6.12/net/core/dev.c | 2026-11-19 |
| net-101 | linux-gro | source | Linux v6.12 net/core/gro.c | https://github.com/torvalds/linux/blob/v6.12/net/core/gro.c | 2026-11-19 |
| net-101 | linux-skbuff-c | source | Linux v6.12 net/core/skbuff.c | https://github.com/torvalds/linux/blob/v6.12/net/core/skbuff.c | 2026-11-19 |
| net-101 | linux-sock | source | Linux v6.12 net/core/sock.c | https://github.com/torvalds/linux/blob/v6.12/net/core/sock.c | 2026-11-19 |
| net-101 | linux-skbuff | source | Linux v6.12 include/linux/skbuff.h | https://github.com/torvalds/linux/blob/v6.12/include/linux/skbuff.h | 2026-11-19 |
| net-101 | linux-tcp-h | source | Linux v6.12 include/linux/tcp.h | https://github.com/torvalds/linux/blob/v6.12/include/linux/tcp.h | 2026-11-19 |
| net-101 | linux-sock-h | source | Linux v6.12 include/net/sock.h | https://github.com/torvalds/linux/blob/v6.12/include/net/sock.h | 2026-11-19 |
| net-101 | linux-net-tcp-h | source | Linux v6.12 include/net/tcp.h | https://github.com/torvalds/linux/blob/v6.12/include/net/tcp.h | 2026-11-19 |
| net-101 | linux-sch-generic | source | Linux v6.12 net/sched/sch_generic.c | https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_generic.c | 2026-11-19 |
| net-101 | linux-fq | source | Linux v6.12 net/sched/sch_fq.c | https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_fq.c | 2026-11-19 |
| net-101 | linux-fq-codel | source | Linux v6.12 net/sched/sch_fq_codel.c | https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_fq_codel.c | 2026-11-19 |
| net-101 | linux-ixgbe | source | Linux v6.12 drivers/net/ethernet/intel/ixgbe/ixgbe_main.c | https://github.com/torvalds/linux/blob/v6.12/drivers/net/ethernet/intel/ixgbe/ixgbe_main.c | 2026-11-19 |
| net-101 | linux-sysctl | source | Linux v6.12 Documentation/networking/ip-sysctl.rst | https://github.com/torvalds/linux/blob/v6.12/Documentation/networking/ip-sysctl.rst | 2026-11-19 |
| k8s-101 | k8s-pod-lifecycle | doc | Kubernetes「Pod Lifecycle」 | https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/ | 2026-11-19 |
| k8s-101 | k8s-controller | doc | Kubernetes「Controllers」 | https://kubernetes.io/docs/concepts/architecture/controller/ | 2026-11-19 |
| k8s-101 | k8s-replicaset | doc | Kubernetes「ReplicaSet」 | https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/ | 2026-11-19 |
| k8s-101 | k8s-deployment | doc | Kubernetes「Deployments」 | https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ | 2026-11-19 |
| k8s-101 | k8s-resources | doc | Kubernetes「Resource Management for Pods and Containers」 | https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/ | 2026-11-19 |
| k8s-101 | k8s-scheduler | doc | Kubernetes「Kubernetes Scheduler」 | https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/ | 2026-11-19 |
| k8s-101 | k8s-qos | doc | Kubernetes「Pod Quality of Service Classes」 | https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/ | 2026-11-19 |
| k8s-101 | k8s-assign-memory | doc | Kubernetes「Assign Memory Resources to Containers and Pods」 | https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/ | 2026-11-19 |
| k8s-101 | k8s-debug-pod | doc | Kubernetes「Debug Running Pods」 | https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/ | 2026-11-19 |
| k8s-101 | k8s-api-concepts | doc | Kubernetes「Kubernetes API Concepts」 | https://kubernetes.io/docs/reference/using-api/api-concepts/ | 2026-11-19 |
| k8s-101 | k8s-nodes | doc | Kubernetes「Nodes」 | https://kubernetes.io/docs/concepts/architecture/nodes/ | 2026-11-19 |
| k8s-101 | k8s-taints | doc | Kubernetes「Taints and Tolerations」 | https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/ | 2026-11-19 |
| k8s-101 | k8s-disruptions | doc | Kubernetes「Disruptions」 | https://kubernetes.io/docs/concepts/workloads/pods/disruptions/ | 2026-11-19 |
| k8s-101 | k8s-kcm | doc | Kubernetes「kube-controller-manager」 | https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/ | 2026-11-19 |
| k8s-101 | k8s-eviction | doc | Kubernetes「Node-pressure Eviction」 | https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/ | 2026-11-19 |
| k8s-101 | kubectl-describe | doc | kubectl describe | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/ | 2026-11-19 |
| k8s-101 | kubectl-logs | doc | kubectl logs | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/ | 2026-11-19 |
| k8s-101 | kubectl-events | doc | kubectl events | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/ | 2026-11-19 |
| k8s-101 | cgroup-v2 | doc | Linux「Control Group v2」 | https://docs.kernel.org/admin-guide/cgroup-v2.html | 2026-11-19 |
| k8s-101 | etcd-api | doc | etcd v3.5「etcd API」 | https://etcd.io/docs/v3.5/learning/api/ | 2026-11-19 |
| k8s-101 | k8s-rs | source | Kubernetes v1.31.0 pkg/controller/replicaset/replica_set.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/controller/replicaset/replica_set.go | 2026-11-19 |
| k8s-101 | k8s-rs-utils | source | Kubernetes v1.31.0 pkg/controller/replicaset/replica_set_utils.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/controller/replicaset/replica_set_utils.go | 2026-11-19 |
| k8s-101 | k8s-ctrl-utils | source | Kubernetes v1.31.0 pkg/controller/controller_utils.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/controller/controller_utils.go | 2026-11-19 |
| k8s-101 | k8s-deploy-ctrl | source | Kubernetes v1.31.0 pkg/controller/deployment/deployment_controller.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/controller/deployment/deployment_controller.go | 2026-11-19 |
| k8s-101 | k8s-deploy-rolling | source | Kubernetes v1.31.0 pkg/controller/deployment/rolling.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/controller/deployment/rolling.go | 2026-11-19 |
| k8s-101 | k8s-deploy-sync | source | Kubernetes v1.31.0 pkg/controller/deployment/sync.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/controller/deployment/sync.go | 2026-11-19 |
| k8s-101 | k8s-apps-defaults | source | Kubernetes v1.31.0 pkg/apis/apps/v1/defaults.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/apis/apps/v1/defaults.go | 2026-11-19 |
| k8s-101 | k8s-sched-one | source | Kubernetes v1.31.0 pkg/scheduler/schedule_one.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/scheduler/schedule_one.go | 2026-11-19 |
| k8s-101 | k8s-sched-queue | source | Kubernetes v1.31.0 pkg/scheduler/internal/queue/scheduling_queue.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/scheduler/internal/queue/scheduling_queue.go | 2026-11-19 |
| k8s-101 | k8s-fit | source | Kubernetes v1.31.0 pkg/scheduler/framework/plugins/noderesources/fit.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/scheduler/framework/plugins/noderesources/fit.go | 2026-11-19 |
| k8s-101 | k8s-binder | source | Kubernetes v1.31.0 pkg/scheduler/framework/plugins/defaultbinder/default_binder.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/scheduler/framework/plugins/defaultbinder/default_binder.go | 2026-11-19 |
| k8s-101 | k8s-kubelet | source | Kubernetes v1.31.0 pkg/kubelet/kubelet.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/kubelet/kubelet.go | 2026-11-19 |
| k8s-101 | k8s-pod-workers | source | Kubernetes v1.31.0 pkg/kubelet/pod_workers.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/kubelet/pod_workers.go | 2026-11-19 |
| k8s-101 | k8s-pleg | source | Kubernetes v1.31.0 pkg/kubelet/pleg/generic.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/kubelet/pleg/generic.go | 2026-11-19 |
| k8s-101 | k8s-kuberuntime | source | Kubernetes v1.31.0 pkg/kubelet/kuberuntime/kuberuntime_manager.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/kubelet/kuberuntime/kuberuntime_manager.go | 2026-11-19 |
| k8s-101 | k8s-kr-container | source | Kubernetes v1.31.0 pkg/kubelet/kuberuntime/kuberuntime_container.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/kubelet/kuberuntime/kuberuntime_container.go | 2026-11-19 |
| k8s-101 | k8s-kr-linux | source | Kubernetes v1.31.0 pkg/kubelet/kuberuntime/kuberuntime_container_linux.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/kubelet/kuberuntime/kuberuntime_container_linux.go | 2026-11-19 |
| k8s-101 | k8s-status | source | Kubernetes v1.31.0 pkg/kubelet/status/status_manager.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/kubelet/status/status_manager.go | 2026-11-19 |
| k8s-101 | k8s-qos-policy | source | Kubernetes v1.31.0 pkg/kubelet/qos/policy.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/kubelet/qos/policy.go | 2026-11-19 |
| k8s-101 | k8s-qos-helper | source | Kubernetes v1.31.0 pkg/apis/core/v1/helper/qos/qos.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/apis/core/v1/helper/qos/qos.go | 2026-11-19 |
| k8s-101 | k8s-cri-api | source | Kubernetes v1.31.0 staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto | https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto | 2026-11-19 |
| k8s-101 | k8s-backoff | source | Kubernetes v1.31.0 staging/src/k8s.io/client-go/util/flowcontrol/backoff.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/client-go/util/flowcontrol/backoff.go | 2026-11-19 |
| k8s-101 | k8s-reflector | source | Kubernetes v1.31.0 staging/src/k8s.io/client-go/tools/cache/reflector.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/client-go/tools/cache/reflector.go | 2026-11-19 |
| k8s-101 | k8s-fifo | source | Kubernetes v1.31.0 staging/src/k8s.io/client-go/tools/cache/delta_fifo.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/client-go/tools/cache/delta_fifo.go | 2026-11-19 |
| k8s-101 | k8s-informer | source | Kubernetes v1.31.0 staging/src/k8s.io/client-go/tools/cache/shared_informer.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/client-go/tools/cache/shared_informer.go | 2026-11-19 |
| k8s-101 | k8s-workqueue | source | Kubernetes v1.31.0 staging/src/k8s.io/client-go/util/workqueue/queue.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/client-go/util/workqueue/queue.go | 2026-11-19 |
| k8s-101 | k8s-ratelimit | source | Kubernetes v1.31.0 staging/src/k8s.io/client-go/util/workqueue/default_rate_limiters.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/client-go/util/workqueue/default_rate_limiters.go | 2026-11-19 |
| k8s-101 | k8s-create | source | Kubernetes v1.31.0 staging/src/k8s.io/apiserver/pkg/endpoints/handlers/create.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/apiserver/pkg/endpoints/handlers/create.go | 2026-11-19 |
| k8s-101 | k8s-delete | source | Kubernetes v1.31.0 staging/src/k8s.io/apiserver/pkg/endpoints/handlers/delete.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/apiserver/pkg/endpoints/handlers/delete.go | 2026-11-19 |
| k8s-101 | k8s-rest-delete | source | Kubernetes v1.31.0 staging/src/k8s.io/apiserver/pkg/registry/rest/delete.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/apiserver/pkg/registry/rest/delete.go | 2026-11-19 |
| k8s-101 | k8s-registry | source | Kubernetes v1.31.0 staging/src/k8s.io/apiserver/pkg/registry/generic/registry/store.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/apiserver/pkg/registry/generic/registry/store.go | 2026-11-19 |
| k8s-101 | k8s-etcd3 | source | Kubernetes v1.31.0 staging/src/k8s.io/apiserver/pkg/storage/etcd3/store.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/apiserver/pkg/storage/etcd3/store.go | 2026-11-19 |
| k8s-101 | k8s-cacher | source | Kubernetes v1.31.0 staging/src/k8s.io/apiserver/pkg/storage/cacher/cacher.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/apiserver/pkg/storage/cacher/cacher.go | 2026-11-19 |
| k8s-101 | k8s-nodelifecycle | source | Kubernetes v1.31.0 pkg/controller/nodelifecycle/node_lifecycle_controller.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/controller/nodelifecycle/node_lifecycle_controller.go | 2026-11-19 |
| k8s-101 | k8s-tolerations | source | Kubernetes v1.31.0 plugin/pkg/admission/defaulttolerationseconds/admission.go | https://github.com/kubernetes/kubernetes/blob/v1.31.0/plugin/pkg/admission/defaulttolerationseconds/admission.go | 2026-11-19 |
| k8s-101 | linux-memcontrol | source | Linux v6.12 mm/memcontrol.c | https://github.com/torvalds/linux/blob/v6.12/mm/memcontrol.c | 2026-11-19 |
| k8s-101 | linux-oom | source | Linux v6.12 mm/oom_kill.c | https://github.com/torvalds/linux/blob/v6.12/mm/oom_kill.c | 2026-11-19 |
| k8s-101 | containerd-events | source | containerd v1.7.22 pkg/cri/server/events.go | https://github.com/containerd/containerd/blob/v1.7.22/pkg/cri/server/events.go | 2026-11-19 |
