// レッスンの型。docs/explanation-standard.md 第 2 章をそのまま写した物。
// 型を変えるときは、先に explanation-standard.md を変える。

export type Lesson = {
	id: string; // "net-012" のような分野 + 連番
	field: string; // 分野 ID
	level: 1 | 2 | 3; // 初級 / 中級 / 上級
	title: string; // 40 字以内
	goal: string; // 「〜ができる」。60 字以内
	prereq: string[]; // 推奨前提。ロックではない
	related: string[];
	next: string[];
	explain: Step[]; // 5〜9
	example: Example;
	practice: Practice;
	check: CheckItem[]; // 3〜5
	map?: LessonMap; // 図の絵・町の呼び名・区画・線の名前（D-21。explanation-standard.md 2.2）
	// ここから第 2 版（D-23。explanation-standard.md 2.3）。第 2 版で書いたレッスンだけが持つ
	tier?: 1 | 2 | 3 | 4; // 段（curriculum-standard.md 第 2 章）：基礎・現場・設計と障害対応・指導
	learn?: string[]; // 学べること 4〜7 項目。1 項目 40 字以内
	minutes?: number; // かかる時間の目安（見る＋やってみる＋思い出す）
	metrics?: Metric[]; // 図の上の指標の帯（2〜5 個）
	legend?: LegendItem[]; // 流れの種類の凡例
	sources?: Source[]; // 一次情報 3 件以上
	teach?: Teach; // 教えるときの材料
	knobs?: Knob[]; // 実験のつまみ（learn-standard.md LS-L5）。段 2 以上で 1 つ以上のステップが使う
	terms?: Term[]; // 用語の札（LS-L3）。本文に出る用語の 1 行の意味
};

/** 第 2 版のレッスン（tier を持つ）か */
export function isV2(l: Lesson): l is Lesson & V2Lesson {
	return l.tier !== undefined;
}
export type V2Lesson = {
	tier: 1 | 2 | 3 | 4;
	learn: string[];
	minutes: number;
	legend: LegendItem[];
	sources: Source[];
	teach: Teach;
	explain: (Step & V2Step)[];
};
export type V2Step = {
	kind: StepKind;
	short: string;
	depth: { intro: string[]; work: string[]; deep: string[] };
	callout: Callout;
	changes: Change[];
	motion: Cue[];
};

export type StepKind =
	| 'problem'
	| 'mechanism'
	| 'internals'
	| 'fail'
	| 'fix'
	| 'technique'
	| 'tradeoff'
	| 'numbers'
	| 'realworld'
	| 'ops'
	| 'teach'
	| 'summary';
/** 画面の札（learn-standard.md LS-T1） */
export const KIND_LABEL: Record<StepKind, string> = {
	problem: '問題',
	mechanism: '仕組み',
	internals: '中身',
	fail: '失敗',
	fix: '解決',
	technique: '技',
	tradeoff: '代償',
	numbers: '数で考える',
	realworld: '実際には',
	ops: '運用',
	teach: '教えるとき',
	summary: 'まとめ'
};
export type Callout = { type: 'point' | 'tip' | 'warn'; text: string }; // 120 字以内
export type Change = { mark: '+' | '-' | '~'; text: string }; // 1 行 40 字以内
export type LegendItem = { kind: string; label: string; style: 'solid' | 'dash' | 'double' };
export type Metric = { key: string; label: string; unit?: string; sum?: boolean };
export type Source = {
	id: string;
	title: string;
	url: string;
	kind: 'rfc' | 'spec' | 'doc' | 'man' | 'paper' | 'source';
	checked: string; // 開いて確かめた日 "2026-11-18"
};
export type Teach = {
	myths: { wrong: string; right: string }[]; // よくある誤解 3 つ以上
	oneMinute: string; // 1 分で説明する文（300 字以内）
	questions: { ask: string; answer: string; look: string }[]; // 後輩に出す問い 2 つ以上
};
export type ImplContext =
	'user' | 'syscall' | 'hardirq' | 'softirq' | 'tasklet' | 'kthread' | 'other';
export type Impl = {
	name: string; // 実在の関数・構造体・キュー・設定の名前 "tcp_write_xmit()"
	kind: 'function' | 'struct' | 'queue' | 'setting' | 'file' | 'command';
	where: string; // ソースの場所 "net/ipv4/tcp_output.c"
	project: string; // "linux" "kubernetes"
	version: string; // "v6.12"
	context?: ImplContext;
	ref: string; // Source.id（kind 'source'）
};
export type Queue = { id: string; label: string; items: string[]; limit?: string };
export type Layer = {
	id: string; // "app" "kernel" "driver" "nic" "wire"
	label: string;
	boxes: { id: string; impl: string; queues?: Queue[] }[]; // impl は Impl.name
};
/** 実験のつまみ（LS-L5）。calc は決まった式の名前（src/lib/learn2/knobs.ts）。乱数なし */
export type Knob = {
	id: string;
	label: string;
	unit: string;
	min: number;
	max: number;
	step: number;
	value: number; // 初めの値
};
export type Term = { word: string; mean: string }; // 1 行の意味（60 字以内）

/** 動きの合図（explanation-standard.md 2.3 の Cue） */
export type Cue = {
	at: number; // ステップに入ってからの ms（速さ 1 倍）
	dur: number;
	para?: number; // 結び付く本文の段落（0 から）
	do: CueDo;
};
export type CueDo =
	| { op: 'camera'; fit: string[] }
	| { op: 'appear'; id: string }
	| { op: 'link'; a: string; b: string }
	| {
			op: 'packet';
			a: string;
			b: string;
			label: string;
			kind: string;
			drop?: boolean;
			stall?: boolean;
	  }
	| { op: 'count'; metric: string; to: string }
	| { op: 'badge'; id: string; text: string; tone?: 'ok' | 'warn' | 'bad' }
	| { op: 'board'; line: number }
	| { op: 'pulse'; id: string }
	| { op: 'vanish'; id: string }
	| { op: 'fail'; id: string }
	| { op: 'enqueue' | 'dequeue' | 'peek'; queue: string; item: string }
	| { op: 'move'; item: string; from: string; to: string }
	| { op: 'clone'; item: string; as: string }
	| { op: 'split'; item: string; into: string[] }
	| { op: 'merge'; items: string[]; into: string }
	| { op: 'context'; to: ImplContext; at: string };

/** 図の材料。位置は appear の at から決め、ここは絵と名前だけを持つ（2.2） */
export type LessonMap = {
	nodes: Record<string, MapNode>; // appear の id ごとに 1 つ
	zones?: Zone[]; // 点線の枠で囲む区画
	links: Link[]; // move の組（向きを問わない 1 組）ごとに 1 本
};
export type Icon =
	| 'pc'
	| 'laptop'
	| 'phone'
	| 'router'
	| 'cloud'
	| 'server'
	| 'db'
	| 'file'
	| 'folder'
	| 'wall'
	| 'node'
	| 'box'
	| 'gear'
	| 'person'
	| 'book'
	| 'chart'
	| 'brain'
	// 第 2 版で足した絵（learn-standard.md LS-L8。src/lib/learn2/iso.ts）
	| 'switch'
	| 'nic'
	| 'etcd'
	| 'disk'
	| 'lock'
	| 'pod'
	| 'api'
	| 'scheduler'
	| 'kubelet'
	| 'lb'
	| 'queue'
	| 'cpu'
	| 'wire'
	| 'tag';
export type MapNode = { icon: Icon; town: string; addr?: string }; // town は町での呼び名（名札）
export type Zone = { label: string; note: string; members: string[] };
/** 線。a と b は appear の id。dir は矢印の向き（ab は a → b、both は両向き）。label は線の名前 */
export type Link = { a: string; b: string; label: string; dir: 'ab' | 'ba' | 'both' };

export type Step = {
	n: number; // 1 から連番
	title: string; // 20 字以内
	lead: string; // 一行の要約。40 字以内
	body: string[]; // 2〜4 文。1 文 60 字以内
	facts: Fact[]; // 1 件以上。具体値の表
	scene: SceneOp[]; // 1 件以上。図の変化
	log: LogRow; // 必須。1 行
	why?: string; // 「なぜそうなっているか」。1 レッスンに 1 回以上
	town?: string; // 町での言い方。1 文 60 字以内（右の欄の「町では」）
	work?: string; // 仕事では（確かめるコマンドなど）。1 文 60 字以内
	ask?: Ask; // 予想の問い。このステップの動きの前に出す（LS-M5）
	inside?: Inside; // 中身の板の材料（2.1）
	world?: World; // このステップの後の世界の状態を図の上に描く（LS-D8）。全体を書く
	// ここから第 2 版（2.3）
	kind?: StepKind;
	short?: string; // ステップの帯の短い題。8 字以内
	depth?: { intro: string[]; work: string[]; deep: string[] }; // 詳しさ 3 段の本文。段落の配列
	callout?: Callout;
	changes?: Change[]; // 2〜4 行
	metrics?: Record<string, string>; // このステップの後の指標の値
	motion?: Cue[]; // 4 つ以上。最初は camera
	loop?: Cue[] | 'none'; // 留まっている間に繰り返す流れ
	loopReason?: string;
	board?: string[]; // 出来事の札（3〜5 行）
	badges?: Record<string, string>; // 機械ごとの状態の札（このステップの後）
	refs?: string[]; // 出典（Source.id）
	learns?: number[]; // ✓ が付く Lesson.learn の番号（0 から）
	impl?: Impl[];
	layers?: Layer[];
	knobs?: string[]; // このステップで使う実験のつまみ（Lesson.knobs の id）
};

/**
 * 図の上に描く世界の状態（LS-D8）。near の機械の下に描く。
 * chain：記録の箱の列（左が古い。tag は「main」などの札）。slots：棟ごとの部屋（状態つき）。plot：点と線（line は [傾き, 切片]）
 */
export type World =
	| { kind: 'chain'; near: string; items: { id: string; text: string; tag?: string }[] }
	| {
			kind: 'slots';
			near: string;
			groups: { name: string; items: { text: string; state: 'ok' | 'wait' | 'bad' }[] }[];
			note?: string;
	  }
	| {
			kind: 'plot';
			near: string;
			points: [number, number][];
			line?: [number, number];
			x: string;
			y: string;
			note?: string;
	  };

/** 予想の問い。a は opts の正しい番号（0 から） */
export type Ask = { q: string; opts: string[]; a: number; why: string };

export type Inside = {
	packet?: Packet; // このステップで流れる物の中身（move の payload の中身）
	hosts?: Host[]; // このステップの後の OS の中。全体を書く
	logs?: LogLine[]; // このステップで増えるログ。1〜4 行
};
export type Packet = {
	name: string; // "TCP SYN" "HTTP GET /" など
	size: string; // "66 B" など
	parts: PacketPart[]; // 層・節。外側から順
	hex?: string; // 本物のバイト列（16 進）
};
export type PacketField = {
	k: string;
	v: string; // at があるときは、at のバイトの読み方（10 進・0x・IP・MAC・文字・16 進）で始める
	level: 1 | 2 | 3; // 詳しさ
	at?: [number, number]; // hex の [始まり, 長さ]
};
export type PacketPart = { name: string; fields: PacketField[] };
export type Host = { name: string; town: string; addr: string; rows: HostRow[] };
export type HostRow = {
	id: string; // ステップをまたいで同じ物は同じ id
	depth: 0 | 1 | 2;
	what: string;
	state: string;
	tone?: 'ok' | 'warn' | 'bad';
};
export type LogLine = { t: string; src: string; text: string };

// v は等幅で出す。calc は v の数を計算し直す式（検査 25。+ - * / ^ ( ) と exp ln sqrt abs）
export type Fact = { k: string; v: string; calc?: string };

export type SceneOp =
	| { op: 'appear'; id: string; label: string; sub?: string; at: [number, number] }
	| { op: 'move'; from: string; to: string; payload: string; kind: string }
	| { op: 'change'; id: string; k: string; v: string }
	| { op: 'highlight'; id: string }
	| { op: 'vanish'; id: string };

export type LogRow = {
	t: string; // 経過時刻 "0.012s" など
	from: string;
	to: string;
	kind: string; // ログの色分けの鍵
	info: string; // 60 字以内
	size?: string;
};

export type Example = { intro: string; lines: string[] }; // 打った物と返った物

export type Practice = {
	goal: string; // この実戦で何をできるようにするか
	tool?: { name: string; mode: 'real' | 'mock' }; // 道具を使う実戦のとき
	form?: string; // 道具を使わない実戦の形。カリキュラム設計の段で定義する
	setup: unknown; // 初期状態
	success: unknown; // 合格の判定
	mistakes: Mistake[]; // 2〜4 件
	commands?: string[]; // 道具の実戦で使うコマンド（"git add" "curl"）。コマンドの参考を出す（検査 20）
	flow?: Flow[]; // やってみるで、打った命令が図のどの線を動くか（LS-P9）。当たらない命令は自分の機械の中の出来事
};

/** 打った 1 行が match（正規表現の文字）に当たれば、from → to の線を動く。from・to は map.nodes の鍵 */
export type Flow = { match: string; from: string; to: string };

export type Mistake = {
	when: string; // どういう操作をしたとき
	why: string; // なぜそれでは駄目か
	next: string; // では次に何をするか
	match?: string; // 道具の実戦で、出力（標準出力・標準エラー）にこの文字列が出たら、この間違い（D-13）
};

export type CheckItem = {
	ask: string; // 何を
	how: string; // どう確かめるか
	kind?: 'scene' | 'number'; // 第 2 版：場面の問い・数の問い（検査 37）
	opts?: string[]; // 第 2 版：選ぶ問いの選択肢（how が正しい答え）
};
