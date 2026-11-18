# 説明の基準

**この文書が devlearn の核。** 説明の質はここで決まる。
目標は `https://protocol-explorer-alpha.vercel.app/` と、**`https://designed-to-scale.vercel.app/`（D-23）** と同等以上の分かりやすさ・動き・深さ。
**複製はしない。** 取り入れるのは原理だけ（`reference-analysis.md`、`learn-standard.md` 0.2）。

> **第 2 版（2026-11-18、D-23）**：利用者が「学習内容が簡易すぎる」「動的ではない」と退けた。
> 1 レッスンの大きさ・ステップの種類・本文の量・動きの合図・深さの決まりを **2.3 と第 9 章**で作り直した。
> 第 1 版の決まりと食い違う所は、**2.3・第 9 章が正**（下の表の「第 2 版」の欄も見る）。
この文書は**中身（データ）の基準**。画面の配置は `screen-design-brief.md` で一から決める。

決まりは**機械で検査できる形**にしてある。`npm run content:check` が全件を検査し、
1 件でも落ちたら公開されない。

---

## 1. 原則

### 1.1 読ませない。進ませる

説明文を長く置かない。**1 ステップずつ進める**。読み手が自分の速さで進み、
戻れる。

### 1.2 1 ステップに 3 つ必ずそろえる

| 要素 | 意味 | 無いとどうなるか |
|---|---|---|
| **図の変化** | 前のステップから見た目が変わる | 進んだ実感が無く、ただの文章になる |
| **説明と具体値** | 何が起きたか、実際の値つきで | 抽象論で終わり、身に付かない |
| **記録 1 件** | 出来事が記録に残る | 全体の流れが追えない |

**1 つでも欠けるステップは作らない。** 欠けるなら前後のステップと統合する。

### 1.3 どの時点も状態から描く

ステップ n の画面は、**0 から n までを積んだ結果ではなく、n だけから描ける**
形にする。こうすると巻き戻し・飛び越し・再現が自動で成り立つ。

### 1.4 具体値を必ず置く

アドレス、ポート、コマンド、ファイル名、件数、秒数。
**値の無いステップは解説ではなく前書き。**

### 1.5 どうなって、どうなるかを動きで見せる

1 つのステップの中で、**変化の前の状態 → 動き → 変化の後の状態**が見える。
最後の絵だけを見せない。読み手が「何が、何によって、どう変わったか」を目で追える。

### 1.6 動きは何度でも繰り返し見られる

そのステップに留まったまま、**動きだけを何度でも再生し直せる**。
見逃した、速すぎた、もう一度確かめたい、に応える。ステップを戻らなくてよい。

### 1.7 止まった絵を作らない（第 2 版）

ステップに入ると、視点が寄り、物が順に現れ、線が引かれ、荷物が進み、数が数え上がる。
**続いている流れ（ハートビート・往復・再送・学習の繰り返し）は、そのステップに留まっている間も流れ続ける。**
動きの合図（`Step.motion`）は、本文の段落と結び付ける（`learn-standard.md` 第 2 章）。

### 1.8 業界をリードし、人を育てられる深さ（第 2 版）

1 レッスンは、1 つの仕組みを **問題 → 仕組み → 中身 → 失敗 → 解決 → 代償 → 実際には → 運用 → 教えるとき → まとめ** と通す物語にする。
入口だけで終わらせない。数で語り、一次情報を出典に持ち、壊れ方を動きで見せ、新人に教えるときの言い方まで書く。

---

## 2. 形（型）

レッスンはデータ。TypeScript の型で固定する。

```ts
export type Lesson = {
  id: string;                 // "net-012" のような分野 + 連番
  field: string;              // 分野 ID
  level: 1 | 2 | 3;           // 初級 / 中級 / 上級
  title: string;              // 40 字以内
  goal: string;               // 「〜ができる」。60 字以内
  prereq: string[];           // 推奨前提。ロックではない
  related: string[];
  next: string[];
  explain: Step[];            // 第 1 版 5〜9。第 2 版は 10〜16（2.3）
  example: Example;
  practice: Practice;
  check: CheckItem[];         // 3〜5
};

export type Step = {
  n: number;                  // 1 から連番
  title: string;              // 20 字以内
  lead: string;               // 一行の要約。40 字以内
  body: string[];             // 第 1 版 2〜4 文。第 2 版は段落の配列で詳しさ 3 段（2.3 の depth）
  facts: Fact[];              // 1 件以上。具体値の表
  scene: SceneOp[];           // 1 件以上。図の変化
  log: LogRow;                // 必須。1 行
  why?: string;               // 「なぜそうなっているか」。1 レッスンに 1 回以上
};

export type Fact = { k: string; v: string };   // v は等幅で出す

export type SceneOp =
  | { op: 'appear';    id: string; label: string; sub?: string; at: [number, number] }
  | { op: 'move';      from: string; to: string; payload: string; kind: string }
  | { op: 'change';    id: string; k: string; v: string }
  | { op: 'highlight'; id: string }
  | { op: 'vanish';    id: string };

export type LogRow = {
  t: string;                  // 経過時刻 "0.012s" など
  from: string;
  to: string;
  kind: string;               // ログの色分けの鍵
  info: string;               // 60 字以内
  size?: string;
};

export type Example = { intro: string; lines: string[] };   // 打った物と返った物

export type Practice = {
  goal: string;               // この実戦で何をできるようにするか
  tool?: { name: string; mode: 'real' | 'mock' };  // 道具を使う実戦のとき
  form?: 'calc' | 'order' | 'sort' | 'pick' | 'fix';  // 道具を使わない実戦の形（第 6 章）
  setup: unknown;             // 初期状態
  success: unknown;           // 合格の判定
  mistakes: Mistake[];        // 2〜4 件
};

export type Mistake = {
  when: string;               // どういう操作をしたとき
  why: string;                // なぜそれでは駄目か
  next: string;               // では次に何をするか
  match?: string;             // 道具の実戦で、出力にこの文字列が出たら、この間違い（段 7 で足した。D-13）
};

export type CheckItem = { ask: string; how: string };  // 何を / どう確かめるか
```


### 2.1 中身の板の材料（`Step.inside`。D-21 で足した）

レッスン画面の図の下に、**荷物の中身・OS の中・ログ**を並べて出す（`screen-design.md` 第 11 章）。その材料をステップに持たせる。

```ts
export type Step = {
  // …上の欄はそのまま
  town?: string;              // 町での言い方。1 文 60 字以内（右の欄の「町では」）
  inside?: Inside;
};

export type Inside = {
  packet?: Packet;            // このステップで流れる物の中身（move の payload の中身）
  hosts?: Host[];             // このステップの**後**の OS の中。全体を書く（差は画面が前のステップと比べて出す）
  logs?: LogLine[];           // このステップで増えるログ。1〜4 行
};

export type Packet = {
  name: string;               // "TCP SYN" "HTTP GET /" "Pod の PATCH" など
  size: string;               // "66 B" など
  parts: Part[];              // 層・節。外側から順
  hex?: string;               // 本物のバイト列（16 進）。あれば欄と 16 進を結んで光らせる
};
export type Part = {
  name: string;               // "Ethernet II" "IPv4" "TCP" "HTTP" "metadata" "spec" など
  fields: { k: string; v: string; level: 1 | 2 | 3; at?: [number, number] }[];  // level は詳しさ。at は hex の [始まり, 長さ]
};
export type Host = {
  name: string;               // "Web サーバ" "node-1"
  town: string;               // 町での呼び名 "みなと商店" "1 号棟"
  addr: string;               // "203.0.113.80" "10.0.1.11" "~/shop-site"
  rows: HostRow[];
};
export type HostRow = {
  id: string;                 // ステップをまたいで同じ物は同じ id（増えた・変わった・消えたを画面が出すため）
  depth: 0 | 1 | 2;           // 木の深さ（親プロセス → 子 → つながり）
  what: string;               // "nginx: master" "TCP 192.168.1.10:52814 → 203.0.113.80:80" ".git/objects/41/c40f8…"
  state: string;              // "pid 901 ・ LISTEN 0.0.0.0:80" "ESTABLISHED" "強制終了（SIGKILL・137）"
  tone?: 'ok' | 'warn' | 'bad';
};
export type LogLine = { t: string; src: string; text: string };  // src は書いた物（"nginx access.log" "kernel node-1" "kube-scheduler"）
```

```ts
// 2026-11-15 に 10-R の 2 で足した欄（D-21。型は src/lib/lesson/types.ts）
export type Step = {
  // …
  work?: string;              // 仕事では（確かめるコマンドなど）。1 文 60 字以内
  ask?: Ask;                  // 予想の問い。このステップの動きの前に出す（LS-M5）
};
export type Ask = { q: string; opts: string[]; a: number; why: string };  // a は opts の正しい番号（0 から）
export type Fact = { k: string; v: string; calc?: string };  // calc は v の数を計算し直す式（検査 25）
export type Practice = { /* … */ commands?: string[]; flow?: Flow[] }; // 道具の実戦で使うコマンド（"git add" "curl"。検査 20）
export type Flow = { match: string; from: string; to: string }; // やってみるで、打った 1 行が match に当たれば from → to の線を動く（LS-P9）
```

- 欄の `v` は、`at` があるとき、そのバイトの読み方（10 進・`0x` の 16 進・IP・MAC・文字・DNS の名前・16 進の並び）で**始める**。
  後ろに括弧で意味を足してよい（`0x02（SYN）`）。検査 21 はこの決まりで読み直す
- 荷物は `src/lib/lesson/packet.ts` の組み立て（`tcpPacket`・`udpPacket`・`dnsPart`・`textPart`・`assemble`）で作ってよい。
  長さとチェックサムは組み立てが計算し、検査 21 が別の道筋（`bytes.ts`）で読み直す

**どの分野で要るか**

| 分野 | `packet` | `hosts` | `logs` |
|---|---|---|---|
| `net`・`sec` | `move` のある全ステップ | 1 レッスンに 2 回以上 | 1 レッスンに 3 回以上 |
| `lnx`・`ctr`・`cld`・`ci` | 物が流れるステップ | 1 レッスンに 2 回以上 | 1 レッスンに 3 回以上 |
| `db`・`git` | 任意 | ファイル・プロセスが変わるステップ | 1 レッスンに 2 回以上 |
| `prg`・`ai`・`sta` | 任意 | 任意（実行中のプロセス・読み書きするファイル） | 任意（実行の出力） |

**書き方の決まり**

- ログの書式は、その道具の**本物の書式**（nginx の access.log、`journalctl`、`kubectl get events`、カーネルの OOM など）。
  記録の無い書式は、先に本物の出力を記録してから写す（`tools.md` 第 2 章）。作った書式にしない
- 値はステップの `facts` と合わせる（IP・ポート・pid・ID・時刻）。同じ物はレッスンの中で同じ値
- `hosts` の `id` はステップをまたいで変えない。消えた物は書かない（画面が「消えた」と出す）
- コンテナは「棟の中の部屋」であり、OS から見ると**ただのプロセス**だと分かる形に書く（containerd-shim → アプリのプロセス）

### 2.2 図の材料（`Lesson.map`。D-21 で足した）

図の機械を線画の絵と町での呼び名で描き、線に名前と向きを付けるための材料。位置は `appear` の `at` から画面が決める。

```ts
export type Lesson = { /* … */ map?: LessonMap };
export type LessonMap = {
  nodes: Record<string, { icon: Icon; town: string; addr?: string }>;  // appear の id ごと。town は名札の町での呼び名
  zones?: { label: string; note: string; members: string[] }[];       // 点線の枠の区画（家の中・ノードなど）
  links: { a: string; b: string; label: string; dir: 'ab' | 'ba' | 'both' }[];  // move のある組ごとに 1 本。名前と向き
};
type Icon = 'pc' | 'laptop' | 'phone' | 'router' | 'cloud' | 'server' | 'db' | 'file' | 'folder' | 'wall'
          | 'node' | 'box' | 'gear' | 'person' | 'book' | 'chart' | 'brain';
```

- `move` のある組（向きを問わない）には必ず線を 1 本置き、名前を付ける。両向きの動きがあれば `both`（検査 16）
- 番地（`addr`）は、`appear` の `sub` と、中身の板の `hosts` の `addr` と同じ値（検査 24）


### 2.3 第 2 版の形（D-23。1 レッスン 10〜16 ステップの物語）

```ts
export type Lesson = {
  // …第 1 版の欄はそのまま（explain・practice・check など）
  tier: 1 | 2 | 3 | 4;              // 段（curriculum-standard.md 第 2 章）：基礎・現場・設計と障害対応・指導
  learn: string[];                  // 学べること 4〜7 項目。1 項目 40 字以内
  minutes: number;                  // かかる時間の目安（見る＋やってみる＋思い出す）
  metrics?: Metric[];               // 図の上の指標の帯（2〜5 個）
  legend: { kind: string; label: string; style: 'solid' | 'dash' | 'double' }[];  // 流れの種類の凡例
  sources: Source[];                // 一次情報 3 件以上
  teach: Teach;                     // 教えるときの材料（「教えるとき」ステップの元）
};

export type Step = {
  // …第 1 版の欄（title・facts・scene・log・inside・town・work・ask など）はそのまま
  kind: StepKind;
  short: string;                                               // ステップの帯に出す短い題。8 字以内
  depth: { intro: string[]; work: string[]; deep: string[] };  // 詳しさ 3 段の本文。段落の配列（量は下の表）
  callout: { type: 'point' | 'tip' | 'warn'; text: string };   // 囲み 1 つ。120 字以内
  changes: { mark: '+' | '-' | '~'; text: string }[];          // 変わったこと 2〜4 行。1 行 40 字以内
  metrics?: Record<string, string>;                            // このステップの後の指標の値（Lesson.metrics の key ごと）
  motion: Cue[];                                               // 動きの合図 4 つ以上
  loop?: Cue[] | 'none';                                       // 留まっている間に繰り返す流れ。'none' は reason 必須
  loopReason?: string;
  board?: string[];                                            // 図の中の出来事の札（3〜5 行）
  badges?: Record<string, string>;                             // 機械ごとの状態の札（map.nodes の id ごと）
  refs?: string[];                                             // このステップの数と仕様の出典（Source.id）
  learns?: number[];                                           // このステップで ✓ が付く Lesson.learn の番号
  impl?: Impl[];                                               // 実装の水準（curriculum-standard.md 第 6 章）。段 3・4 の internals で必須
  layers?: Layer[];                                            // 層の図（learn-standard.md LS-D12）。impl を持つステップで使う
};

export type Impl = {
  name: string;                     // 実在の関数・構造体・キュー・設定の名前 "tcp_write_xmit()" "sk_buff" "tcp_rtx_queue" "tcp_limit_output_bytes"
  kind: 'function' | 'struct' | 'queue' | 'setting' | 'file' | 'command';
  where: string;                    // ソースの場所 "net/ipv4/tcp_output.c"（設定は "/proc/sys/net/ipv4/..."）
  project: string;                  // "linux" "kubernetes" "postgres" "git" など
  version: string;                  // "v6.12" のように版を決める
  context?: 'user' | 'syscall' | 'hardirq' | 'softirq' | 'tasklet' | 'kthread' | 'other';  // どの文脈で動くか
  ref: string;                      // Source.id（kind 'source' の版の tag のファイルへの URL）
};

export type Layer = {
  id: string; label: string;        // "app" "kernel" "driver" "nic" "wire"
  boxes: { id: string; impl: string; queues?: { id: string; label: string; items: string[]; limit?: string }[] }[];  // impl は Impl.name
};

type StepKind = 'problem' | 'mechanism' | 'internals' | 'fail' | 'fix' | 'technique'
              | 'tradeoff' | 'numbers' | 'realworld' | 'ops' | 'teach' | 'summary';
// 画面の札：問題・仕組み・中身・失敗・解決・技・代償・数で考える・実際には・運用・教えるとき・まとめ

export type Cue = {
  at: number;                       // ステップに入ってからの ms（速さ 1 倍）
  dur: number;                      // 長さの ms
  para?: number;                    // 結び付く本文の段落（0 から）。その間その段落を強調する
  do:
    | { op: 'camera'; fit: string[] }                         // その機械たちが全部入るように寄る
    | { op: 'appear'; id: string }                            // 機械・札が現れる
    | { op: 'link'; a: string; b: string }                    // 線を引く
    | { op: 'packet'; a: string; b: string; label: string; kind: string; drop?: boolean; stall?: boolean }  // 荷物が進む（落ちる・詰まる）
    | { op: 'count'; metric: string; to: string }             // 指標を数え上げる
    | { op: 'badge'; id: string; text: string; tone?: 'ok' | 'warn' | 'bad' }  // 状態の札を変える
    | { op: 'board'; line: number }                           // 出来事の札の行を光らせる
    | { op: 'pulse'; id: string }                             // 輪が広がる
    | { op: 'vanish'; id: string }
    | { op: 'fail'; id: string };                             // 赤く点滅して止まる
};

export type Metric = { key: string; label: string; unit?: string; sum?: boolean };  // sum：積み上げて合計に入れる
export type Source = { id: string; title: string; url: string; kind: 'rfc' | 'spec' | 'doc' | 'man' | 'paper' | 'source'; checked: string };  // checked は開いて確かめた日
export type Teach = {
  myths: { wrong: string; right: string }[];   // よくある誤解 3 つ以上
  oneMinute: string;                            // 1 分で説明する文（300 字以内）
  questions: { ask: string; answer: string; look: string }[];  // 後輩に出す問い 2 つ以上（答えと見どころ）
};
```

**本文の量（1 ステップ）**

| 詳しさ | 段落 | 字数（計） | 中身 |
|---|---|---|---|
| はじめて（`intro`） | 1〜3 | 120〜260 | 町のたとえを 1 つまで使ってよい。具体値は 1 つ以上 |
| 現場（`work`） | 2〜4 | 200〜450 | 具体値 2 つ以上。既定値・目安の数。現場で起きること |
| 中身まで（`deep`） | 2〜5 | 現場の字数 ＋ 150 以上 | 仕様の水準：RFC・規格の節、ヘッダのビット、カーネル・製品の既定値と設定の名前、アルゴリズムの手順、計算量。出典（`refs`）必須 |

- 1 文は 80 字まで（第 1 版の 60 字を改めた）。段落は 1〜4 文
- **ステップの種類の必須**（1 レッスン）：`problem` ≥1・`mechanism` ≥2・`internals` ≥1・`fail` ≥2・`fix` ≥1・`tradeoff` ≥1・`realworld` ≥1・`ops` ≥1・`teach` ≥1・`summary` =1。順は物語として自然に（問題から始め、まとめで終わる）
- `fail` は、壊れる様子の合図（`packet` の `drop`・`stall`、`fail`、`badge` の `bad`）を 1 つ以上と、失敗のログの行（`inside.logs`）を持つ
- `realworld`（実際には）は、実在の製品・OSS・規格の名前と使い方を、出典つきで書く
- `ops`（運用）は、見るべきコマンド・指標・ログの行と読み方、数の目安を書く
- `teach`（教えるとき）は `Lesson.teach` から作る。誤解と正しい言い方を図の上でも見せる（誤った流れが止まり、正しい流れが流れる）
- `summary` は学べることを全て振り返り、図は全体を見せ、全ての流れが流れる
- **動き**：`motion` は 4 つ以上で、最初は `camera`。同じ `at` に 3 つ以上重ねない。`para` で全ての段落に 1 つ以上の合図が結ばれる。
  続いている流れのあるステップは `loop` を持つ（`learn-standard.md` LS-M4）
- `metrics` の値は、そのステップの出来事から計算で合う（例：合計 ＝ 各段の和）。検査で計算し直す
- 学べることの全項目に、✓ を付けるステップ（`learns`）がある
- **実装の水準**（`curriculum-standard.md` 第 6 章）：段 3・4 のレッスンの `internals` のステップは `impl` を 3 つ以上持ち、`layers` で層の図を描く。
  名前は版を決めた一次のソースで実在を確かめ（`Source.kind = 'source'`。版の tag のファイルへの URL と行の範囲、`checked` の日付）、本文・図・中身の板で同じ名前を使う。
  文脈の変わる所（syscall → softirq など）は、`motion` の中で `badge` か `board` の行で示す
- キューの動き（`learn-standard.md` LS-M14）のために、`Cue.do` に次を足す：`{ op: 'enqueue' | 'dequeue' | 'peek'; queue: string; item: string }`・`{ op: 'move'; item: string; from: string; to: string }`・
  `{ op: 'clone'; item: string; as: string }`・`{ op: 'split'; item: string; into: string[] }`（TSO）・`{ op: 'merge'; items: string[]; into: string }`（GRO）・`{ op: 'context'; to: Impl['context']; at: string }`（文脈の切り替え）


---

## 3. 検査（`npm run content:check`）

全レッスンに対して機械で検査する。1 件でも落ちたら失敗。

| # | 検査 |
|---|---|
| 1 | `explain` が 5〜9 ステップ（**第 2 版を当てる分野・レッスンは 10〜16**。検査 26） |
| 2 | 各ステップに `facts` が 1 件以上 |
| 3 | 各ステップに `scene` が 1 件以上 |
| 4 | 各ステップに `log` がある |
| 5 | `body` が 2〜4 文、1 文 60 字以内（第 2 版を当てるレッスンは検査 27 に替わる） |
| 6 | `title` 20 字以内 / `lead` 40 字以内 / `goal` 60 字以内 |
| 7 | `goal` が「できる」で終わる |
| 8 | 1 レッスンに `why` が 1 件以上 |
| 9 | 禁止語が無い（第 4 章） |
| 10 | `scene` の `id` が、そのレッスン内で `appear` 済み |
| 11 | `mistakes` が 2〜4 件、3 つの欄が全て埋まっている |
| 12 | `check` が 3〜5 件 |
| 13 | `prereq` / `related` / `next` の ID が実在する |
| 14 | 各ステップの `scene` に、状態を変える操作（`appear` / `move` / `change` / `vanish`）が 1 件以上ある。`highlight` だけのステップは不可 |
| 15 | 同じ `facts` の組が、隣り合うステップで重複していない |
| 16 | 2.1 の表で要る分野のレッスンに、`inside` の `packet`・`hosts`・`logs` が決まった回数ある。`map` があり、全ステップに `town` がある（D-21）。`map` を持つ全レッスンで、機械・線・区画が 2.2 に合い、予想の問いの答えが選択肢の中にある。**当てる分野は `src/lib/lesson/inside-fields.ts` の表**（書き終えた分野から足す） |
| 17 | `inside.hosts` の `id` が、同じ物で同じ・1 つのステップの中で重複しない |
| 18 | `inside.packet.parts` の `at` が `hex` の長さを超えない。`hex` がある時は `at` が 1 つ以上ある |
| 19 | `inside.logs` が 1 ステップ 1〜4 行、1 行 120 字以内 |
| 20 | 実戦の `tool` で使うコマンド（`practice.commands`）に、公式の説明のリンクがある（`src/lib/practice/refs.ts`）。解き方で使うコマンドに漏れが無い。当てる分野は検査 16 と同じ表。`practice.flow`（やってみるで命令が動く線）は全レッスンで、機械が `map.nodes` にあり、2 つの機械を結ぶ線が `map.links` にある |
| 21 | `inside.packet.hex` があるとき、長さが `size` と合い、IP・TCP・UDP のチェックサムが計算し直した値と一致し、全ての欄の `v` が `at` のバイトから読める値と一致する（LS-Q1） |
| 22 | Git の blob・tree・commit の ID が、中身から計算した SHA-1 と一致する（LS-Q2） |
| 23 | `inside.logs` の各行が、`src` ごとの本物の書式の型（`tools.md` 第 2 章の記録から作る）に当たる。型の無い `src` は使えない（LS-Q4） |
| 24 | 同じ物の値（IP・ポート・pid・ID・大きさ）が、そのレッスンの `facts`・`scene`・`log`・`inside` で食い違わない。時刻は進むだけ（LS-Q5・LS-Q6） |
| 25 | 計算する題材の数（損失・確率など）を、検査が同じ式で計算し直して一致する（LS-Q3） |
| 26 | **第 2 版**：`explain` が 10〜16 ステップ。種類の必須（2.3）を満たし、最初が `problem`、最後が `summary`。当てる範囲は `src/lib/lesson/v2-scope.ts` の表（10-R の見本から始め、10-D で分野ごとに足す。最後は全て） |
| 27 | 第 2 版：`depth` の 3 段がそろい、段落の数と字数が 2.3 の表に合う。1 文 80 字以内。`deep` のステップに `refs` がある |
| 28 | 第 2 版：各ステップの `facts` と本文に具体値（数字と単位）が 2 つ以上。数の無い「速い・遅い・重い・多い・少ない・大きい・小さい」を禁止（第 4 章） |
| 29 | 第 2 版：`motion` が 4 つ以上・最初が `camera`・全段落に結び付く・同じ `at` に 3 つ以上重ならない・出てくる id が `map` にある |
| 30 | 第 2 版：`loop` があるか、`'none'` と理由がある。`fail` のステップは壊れる合図と失敗のログを持つ |
| 31 | 第 2 版：`short` が 8 字以内、`callout` が 1 つ、`changes` が 2〜4 行、`board` が 3〜5 行（`board` を持つとき）、`badges` の id が `map` にある |
| 32 | 第 2 版：`metrics` の値が出来事から計算し直して合う（合計 ＝ 和など） |
| 33 | 第 2 版：`learn` が 4〜7 項目で、全てに ✓ を付けるステップがある |
| 34 | 第 2 版：`sources` が一次情報 3 件以上（`kind` が rfc・spec・doc・man・paper・source）で、`checked` の日付があり、`docs/content-sources.md` の表にある。`refs` の id が実在する |
| 35 | 第 2 版：`teach` の誤解 3 つ以上・1 分の文・問い 2 つ以上 |
| 36 | 第 2 版：実戦（`tool`）は命令 5 つ以上を要し、正しい道が 2 つ以上ある場面を持つ。`mistakes` は 3〜6 件（第 1 版の 2〜4 件を改めた） |
| 37 | 第 2 版：`check`（思い出す）が 6 問以上、うち場面の問い 2 問以上、数の問い 1 問以上 |
| 38 | 第 2 版：専門家の査読（第 9 章）の記録が `src/lib/content/reviews/<id>.json` にあり、全項目が合格で、本文の最後の変更より後の日付 |
| 39 | 第 2 版：段 3・4 のレッスンの `internals` のステップが `impl` を 3 つ以上と `layers` を持つ。**`npm run impl:verify` が、`impl` の版の tag のソースのファイルを公式の取得先（Linux は kernel.org または GitHub の `torvalds/linux` の tag）から取り、名前がそのファイルにあることを確かめる**（取った物はキャッシュ。CI でも走らせる）。`impl.ref` が `kind: 'source'` の出典で、URL が版の tag を含み、`version` と合う。`layers` の `impl` が同じステップの `impl` にある。キューの合図（enqueue・move など）の `queue`・`item` が `layers` にある |
| 40 | 第 2 版：TCP を教えるレッスン群が `curriculum-standard.md` 6.2 の 15 項目を全て持つ（どのレッスンのどのステップかの表 `src/lib/content/depth-map.ts` とテスト） |

---

## 4. 文章

| 項目 | 決まり |
|---|---|
| 文体 | 平易な日本語。敬体を使わない。短く切る |
| 1 文 | 60 字まで（第 2 版は 80 字まで） |
| 1 ステップの本文 | 2〜4 文（第 2 版は 2.3 の表） |
| 用語 | 初出で 1 行の説明。英略語は日本語の意味も書く |
| 比喩 | 1 レッスンに 1 つまで（町のたとえは別）。比喩で説明を終わらせない |
| 「なぜ」 | 1 レッスンに 1 回以上、仕組みの理由を書く |
| 禁止語 | 「簡単」「〜するだけ」「ご存じのとおり」「しっかり」「とても重要」。第 2 版は数の無い「速い・遅い・重い・多い・少ない」も（検査 28） |
| 禁止 | 公式文書の引き写し。要点を自分の言葉で書き、出典を示す |

---

## 5. 図（scene）

- 1 ステップで**必ず何かが変わる**。`appear` / `move` / `change` / `highlight` /
  `vanish` のいずれか 1 件以上（原理 1・2）
- 最初のステップは、ほぼ空の状態から始め、**登場する物が増えていく**（原理 7）
- `move` は画面上で動いて見えること。瞬間移動させない
- 同じ出来事を別の見方で表せるようにするか、いくつの見方を持つかは、
  画面設計の段で決める。`scene` の型は、どの見方からも描けるように
  **位置ではなく関係**（何が・何から・何へ）を持つ
- 絵は自作。色は意味にだけ使う（原理 8）

## 6. 実戦（practice）

- 打つコマンドが存在する題材は、**本物の道具**を使う（`mode: 'real'`。例：SQL は sql.js）
- 本物を動かせない物は**模擬**を作る（`mode: 'mock'`）。本物と同じ出力・同じエラーを返す。
  模擬は、そのレッスンに要る範囲だけ作る
- 打つコマンドが無い題材の実戦の形（`form`）は、カリキュラム設計の段で次の 5 つに決めた（`docs/curriculum.md` 3.2）。
  `tool` と `form` は、どちらか一方だけを持つ

  | `form` | 使う人がすること | `setup` | `success` |
  |---|---|---|---|
  | `calc` 計算する | 具体の数のデータを前に、手順の段ごとに値を入れる | データ、段の並び | 段ごとの正しい値と、許す丸めの桁 |
  | `order` 並べる | 手順の札を、起きる順に並べる | 崩した札の一覧 | 正しい順（許す別の順も全て） |
  | `sort` 振り分ける | 項目を、決まった区分に入れる | 項目と区分 | 項目ごとの区分 |
  | `pick` 選ぶ | 状況（ログ・設定・図・値）を読み、1 つを選ぶ | 状況と選択肢 | 正しい選択肢 |
  | `fix` 直す | 壊れた設定・データの、誤った行を正しい行に替える | 行の並びと替えの候補 | 直した後に流したときの期待する結果 |

- 道具の名前（`tool.name`）は `js`（本物）・`sql`（本物、sql.js）・`shell`（模擬）・
  `git`（模擬）・`docker`（模擬）の 5 つ（`docs/curriculum.md` 3.1）
- 結果が動きで見えること（1.5）
- 間違えたときは `mistakes` から、なぜ駄目かと次の一手を返す

---

## 7. 操作

操作の**意味**だけを決める。釦の置き場所とキーの割り当ては画面設計の段で決める。

- 既定は**使う人が 1 つずつ進める**。自動で流すのは補助（原理 6）
- 次へ / 前へ / 最初から / 任意のステップへ / 自動 / 停止 / 速さ
- **今のステップの動きを、もう一度**（何度でも。1.6）
- 戻ったら、全ての表し方が戻る（1.3 の帰結）
- キーボードだけで全ての操作ができる

## 8. 良い例と悪い例

### 悪い

> **ステップ 2：名前解決**
> DNS は名前を IP アドレスに変換する仕組みです。とても重要なのでしっかり
> 覚えましょう。

図が変わらない。値が無い。禁止語が 2 つ。検査 2・3・9 で落ちる。

### 良い

> **ステップ 2 / 5　名前を住所に変える**
> *サーバーの住所を調べる*
>
> `www.example.com` のままでは届かない。運ばれる先は名前ではなく番号だから、
> 先に住所を聞く。問い合わせ先は、接続時に配られた DNS サーバー。
>
> | 問い合わせ先 | 8.8.8.8 |
> | 運び方 | UDP ポート 53 |
> | 返ってきた値 | A 203.0.113.10 |
>
> scene: move（クライアント → DNS、戻り）
> log: `0.012s  8.8.8.8 → 192.168.1.10  DNS  A 203.0.113.10  91 B`
> why: 名前のままでは経路を選べないため

値がある。理由がある。図とログが対応している。

---

## 9. 専門家の査読（第 2 版。検査 38・`learn-standard.md` LS-Q10）

1 レッスンを書き終えたら、**書いた本人ではない別のエージェント**に査読させる。渡す物は、そのレッスンのデータ（本文・図・中身の板・実戦・問い・出典）と、この表だけ。
査読する者には「その分野で 10 年以上働き、新人を育てている上級エンジニアで、誤りを見逃すと自分の部下が本番で事故を起こす」立場で読ませる。

| # | 見る所 | 合格の条件 |
|---|---|---|
| 1 | 正しさ | 仕様・既定値・数・コマンドの出力に誤りが無い。版によって違う物は版を書いている。関数名・構造体名・呼ぶ順・文脈が、書いた版のソースと一致する（査読する者もソースを開いて確かめる） |
| 2 | 深さ | 「中身まで」で、仕様の水準（節・ビット・既定値・手順）まで届いている。段 3・4 は実装の水準（`curriculum-standard.md` 第 6 章。TCP ならカーネルの関数・キュー・skb・文脈）まで届いている。入口の説明で終わっていない |
| 3 | 抜け | その仕組みで現場の人が必ず知っている事（よくある障害・設定の落とし穴・観測の仕方）が抜けていない |
| 4 | 失敗のケース | 実際によく起きる壊れ方で、原因・症状・観測・直し方がつながっている |
| 5 | 代償 | 数で比べている（時間・費用・可用性） |
| 6 | 実際には | 実在の製品・OSS の使い方が今の版で正しい |
| 7 | 運用 | そのまま現場で使えるコマンドと読み方、数の目安 |
| 8 | 教えるとき | 誤解が本当によくある物で、正しい言い方が誤解を解く |
| 9 | 誤解を招く所 | たとえ・省略・図が、誤った理解を作らない |
| 10 | 業界の今 | 古い慣習・廃れた物を今の標準として教えていない |
| 11 | 実戦 | 場面が本物らしく、正しい道と誤った道の返事が技術的に正しい |
| 12 | 動き | 図の動きが仕組みの順序・向き・数と一致している |

- 返事は項目ごとに「合格」か「不合格（理由・直し方）」。不合格を直して、もう一度査読させる
- 記録は `src/lib/content/reviews/<id>.json`（査読した日・項目ごとの結果・指摘と直した内容）

