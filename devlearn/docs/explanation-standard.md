# 説明の基準

**この文書が devlearn の核。** 説明の質はここで決まる。
目標は `https://protocol-explorer-alpha.vercel.app/` と同等以上の分かりやすさ。
**複製はしない。** 取り入れるのは分かりやすさの原理だけ（`reference-analysis.md`）。
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
  explain: Step[];            // 5〜9
  example: Example;
  practice: Practice;
  check: CheckItem[];         // 3〜5
};

export type Step = {
  n: number;                  // 1 から連番
  title: string;              // 20 字以内
  lead: string;               // 一行の要約。40 字以内
  body: string[];             // 2〜4 文。1 文 60 字以内
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

---

## 3. 検査（`npm run content:check`）

全レッスンに対して機械で検査する。1 件でも落ちたら失敗。

| # | 検査 |
|---|---|
| 1 | `explain` が 5〜9 ステップ |
| 2 | 各ステップに `facts` が 1 件以上 |
| 3 | 各ステップに `scene` が 1 件以上 |
| 4 | 各ステップに `log` がある |
| 5 | `body` が 2〜4 文、1 文 60 字以内 |
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

---

## 4. 文章

| 項目 | 決まり |
|---|---|
| 文体 | 平易な日本語。敬体を使わない。短く切る |
| 1 文 | 60 字まで |
| 1 ステップの本文 | 2〜4 文 |
| 用語 | 初出で 1 行の説明。英略語は日本語の意味も書く |
| 比喩 | 1 レッスンに 1 つまで。比喩で説明を終わらせない |
| 「なぜ」 | 1 レッスンに 1 回以上、仕組みの理由を書く |
| 禁止語 | 「簡単」「〜するだけ」「ご存じのとおり」「しっかり」「とても重要」 |
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
