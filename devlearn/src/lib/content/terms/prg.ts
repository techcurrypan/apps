// prg 分野の言葉（explanation-standard.md 第 10 章）。説明は平易な言葉で 1〜2 文・80 字以内。
// 出典：ECMAScript 2024（ECMA-262 第 15 版）・MDN の JavaScript の文書（Memory management・Array.prototype.push・
// Spread syntax・structuredClone・null・Strict equality）・V8 の文書（v8.dev/blog/trash-talk、2019-01-03）と
// V8 13.6 のソース（src/objects/js-objects.h）。出力は Node.js v24.19.0（V8 13.6.233.17）で取った。確認日 2026-11-28
import type { Term } from '../../learn/terms.ts';

const MDN = 'https://developer.mozilla.org/ja/docs/Web/JavaScript/';
const prg = (id: string, t: string, m: string[], d: string, refs?: string[]): Term => ({
	id,
	t,
	m,
	d,
	field: 'prg',
	first: 'prg-006',
	...(refs ? { refs } : {})
});

export const PRG_TERMS: Term[] = [
	// 言葉をそろえるステップ
	prg(
		'js',
		'JavaScript',
		['JavaScript'],
		'ブラウザやサーバーで動くプログラムの言葉。書いた順に 1 行ずつ実行される。',
		['https://tc39.es/ecma262/2024/']
	),
	prg('value', '値', ['値'], '数・文字・配列など、プログラムが扱う物の 1 つ 1 つ。'),
	prg('variable', '変数', ['変数'], '値に付ける名前。名前を書くと、結んだ値を取り出せる。'),
	prg('let', 'let', ['let'], '新しい変数を作る言葉。後で別の値に結び直せる。', [
		`${MDN}Reference/Statements/let`
	]),
	prg(
		'assign',
		'代入',
		['代入'],
		'= の右の値を、左の変数に結ぶこと。前に結んでいた値からは離れる。'
	),
	prg(
		'array',
		'配列',
		['配列'],
		'値を順に並べて 1 つにまとめた物。[1, 2] のように角かっこで書く。',
		[`${MDN}Reference/Global_Objects/Array`]
	),
	prg('element', '要素', ['要素'], '配列の中の 1 つ 1 つの値。前から 0 番・1 番と番号で数える。'),
	prg(
		'memory',
		'メモリ',
		['メモリ'],
		'プログラムが値を置いておく、コンピュータの中の置き場。番地で場所を指す。',
		[`${MDN}Guide/Memory_management`]
	),
	prg(
		'heap',
		'ヒープ',
		['ヒープ'],
		'配列などの物を置くメモリの広い場所。物は要る間だけここに置かれる。'
	),
	prg(
		'reference',
		'参照',
		['参照', '在りか'],
		'物がヒープのどこにあるかを示す印。変数は配列そのものでなく、この印を持つ。'
	),
	prg('function', '関数', ['関数'], '処理に名前を付けてまとめた物。値を渡して呼ぶと、結果を返す。'),
	prg(
		'frame',
		'フレーム',
		['フレーム'],
		'変数の名前と、結んだ値の表。処理を 1 つ始めるたびに 1 枚でき、終わると消える。'
	),
	prg(
		'consolelog',
		'console.log',
		['console.log'],
		'値を画面に書き出す命令。中身を確かめる時に使う。',
		['https://nodejs.org/docs/latest-v24.x/api/console.html']
	),
	// 問題と仕組み
	prg('push', 'push', ['push'], '配列の最後に要素を足す命令。新しい配列は作らない。', [
		`${MDN}Reference/Global_Objects/Array/push`
	]),
	prg(
		'mutate',
		'書き換え',
		['書き換え'],
		'物の中身をその場で変えること。同じ物を見ている全ての名前に変化が見える。'
	),
	prg(
		'identity',
		'===',
		['==='],
		'2 つの値が同じかを調べる記号。配列なら、中身でなく在りかを比べる。',
		[`${MDN}Reference/Operators/Strict_equality`]
	),
	prg(
		'call',
		'呼び出し',
		['呼び出し'],
		'関数を動かすこと。新しいフレームができ、終わると呼んだ所へ戻る。'
	),
	prg('arg', '引数', ['引数'], '関数を呼ぶ時に渡す値。関数の中では別の変数の名前で受け取る。'),
	prg('return', 'return', ['return'], '関数を終え、値を呼んだ側へ返す言葉。'),
	prg(
		'spread',
		'スプレッド構文',
		['スプレッド構文'],
		'[...xs, 4] のように書き、配列の要素を新しい配列へ並べ直す書き方。',
		[`${MDN}Reference/Operators/Spread_syntax`]
	),
	// 失敗と解決
	prg('copy', '写し', ['写し'], '同じ中身を持つ別の物。片方を変えても、もう片方は変わらない。'),
	prg(
		'shallow',
		'浅い写し',
		['浅い写し'],
		'一番外の配列だけを作り直した写し。中に入れた配列は、元と同じ物を指したまま。'
	),
	prg(
		'clone',
		'structuredClone',
		['structuredClone'],
		'中に入れた物まで全て作り直す関数。深い写しを作る。',
		['https://developer.mozilla.org/ja/docs/Web/API/Window/structuredClone']
	),
	// 片付け
	prg('null', 'null', ['null'], '「何も指さない」を表す値。変数に結ぶと、前の物から離れる。', [
		`${MDN}Reference/Operators/null`
	]),
	prg(
		'gc',
		'ガベージコレクション',
		['ガベージコレクション', 'GC'],
		'もう使えない物を見つけ、そのメモリを空けて使い回す仕組み。自動で動く。',
		[`${MDN}Guide/Memory_management`]
	),
	prg('root', '根', ['根'], '物を辿る出発点。動いているフレームの変数などが当たる。'),
	prg('reach', '辿れる', ['辿れる'], '根から参照を順に追って、その物へ行き着けること。'),
	prg(
		'cycle',
		'輪になった参照',
		['輪になった参照'],
		'物の参照を追うと、自分自身へ戻ってくる形。数えるだけの片付け方では消せない。'
	),
	prg(
		'marksweep',
		'マーク・スイープ',
		['マーク・スイープ'],
		'辿れる物に印を付け、印の無い物を片付けるやり方。輪になった参照も消せる。',
		['https://v8.dev/blog/trash-talk']
	),
	// 実際には
	prg(
		'nodejs',
		'Node.js',
		['Node.js'],
		'ブラウザの外で JavaScript を動かす道具。この教材の出力は v24.19.0 で取った。',
		['https://nodejs.org/docs/latest-v24.x/api/']
	),
	prg(
		'v8',
		'V8',
		['V8'],
		'Chrome などの中で JavaScript を動かす処理系。メモリの片付けもここで動く。',
		['https://v8.dev/']
	),
	prg(
		'capacity',
		'席の数',
		['席の数'],
		'配列のために先に取っておくマスの数。要素の数より多いことがある。'
	),
	prg(
		'young',
		'若い世代',
		['若い世代'],
		'できたばかりの物を置くヒープの小さな場所。多くの物はここで要らなくなる。',
		['https://v8.dev/blog/trash-talk']
	),
	prg(
		'scavenge',
		'Scavenge',
		['Scavenge'],
		'若い世代で、生きている物だけを別の場所へ写して片付ける V8 の GC。',
		['https://v8.dev/blog/orinoco-parallel-scavenger']
	)
];
