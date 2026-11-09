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
};

export type Step = {
	n: number; // 1 から連番
	title: string; // 20 字以内
	lead: string; // 一行の要約。40 字以内
	body: string[]; // 2〜4 文。1 文 60 字以内
	facts: Fact[]; // 1 件以上。具体値の表
	scene: SceneOp[]; // 1 件以上。図の変化
	log: LogRow; // 必須。1 行
	why?: string; // 「なぜそうなっているか」。1 レッスンに 1 回以上
};

export type Fact = { k: string; v: string }; // v は等幅で出す

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
};

export type Mistake = {
	when: string; // どういう操作をしたとき
	why: string; // なぜそれでは駄目か
	next: string; // では次に何をするか
};

export type CheckItem = { ask: string; how: string }; // 何を / どう確かめるか
