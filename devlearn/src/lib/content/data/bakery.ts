// db の分野のレッスンが共に使う場面：パン屋「よろず堂」の表。値は作り物。
// レッスンごとに要る表だけを足して使う（実戦の setup.sql）。

/** 商品の表（7 行）。kind は種類、stock は今朝の在庫 */
export const ITEMS =
	'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, price INTEGER NOT NULL, stock INTEGER);\n' +
	'INSERT INTO items VALUES ' +
	"(1, 'あんパン', '菓子', 120, 12), (2, '食パン', '食事', 280, 5), (3, 'クリームパン', '菓子', 150, 8), " +
	"(4, 'メロンパン', '菓子', 180, 0), (5, 'カレーパン', '惣菜', 180, 6), (6, 'コッペパン', '食事', 100, 15), " +
	"(7, 'チーズパン', '惣菜', 170, 3);";

/** 売れた記録の表（11 月 10 日・11 日の 10 行）。qty は売れた数 */
export const SALES =
	'CREATE TABLE sales (id INTEGER PRIMARY KEY, day TEXT NOT NULL, item_id INTEGER NOT NULL, qty INTEGER NOT NULL);\n' +
	'INSERT INTO sales VALUES ' +
	"(1, '11-10', 1, 4), (2, '11-10', 2, 2), (3, '11-10', 5, 3), (4, '11-10', 1, 2), (5, '11-10', 3, 1), " +
	"(6, '11-11', 2, 3), (7, '11-11', 1, 5), (8, '11-11', 6, 2), (9, '11-11', 5, 1), (10, '11-11', 3, 2);";
