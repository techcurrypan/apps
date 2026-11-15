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
};

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
	| 'brain';
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
};

export type Mistake = {
	when: string; // どういう操作をしたとき
	why: string; // なぜそれでは駄目か
	next: string; // では次に何をするか
	match?: string; // 道具の実戦で、出力（標準出力・標準エラー）にこの文字列が出たら、この間違い（D-13）
};

export type CheckItem = { ask: string; how: string }; // 何を / どう確かめるか
