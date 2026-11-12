// 書いたレッスンの実戦の解き方（合格まで）と、間違いの手（mistakes の順に 1 つずつ）。
// solutions.test.ts と、公開 URL で通す scripts/look-practice.ts が使う。画面からは読まない。
import type { FormAnswer } from '../practice/forms.ts';

/** レッスンごとの解き方（合格まで）と、間違いの手（mistakes の順に 1 つずつ） */
export const SOLUTIONS: Record<string, { pass: string[]; wrong: string[][] }> = {
	'git-001': {
		pass: ['git add hello.txt', 'git commit -m "first commit"'],
		wrong: [
			['git commit -m "x"'],
			['git add hello.tx'],
			['git add hello.txt', 'git commit -m a', 'git commit -m b']
		]
	},
	'ctr-001': {
		pass: ['docker run -d --name clock busybox:1.37 sleep 600'],
		wrong: [
			['docker run -d --name clock busybox:137 sleep 600'],
			[
				'docker run -d --name clock busybox:1.37 sleep 600',
				'docker run -d --name clock busybox:1.37 sleep 600'
			],
			['docker run -d --name clock buzybox sleep 600']
		]
	},
	'prg-001': {
		pass: ['let stock = 12;\nstock = stock - 5;\nconsole.log(stock);\n'],
		wrong: [['let stock = 12;\nstok = stock - 5;'], ['const stock = 12;\nstock = stock - 5;']]
	},
	'db-001': {
		pass: ['SELECT name, stock FROM items;'],
		wrong: [['SELECT name, stok FROM items;'], ['SELECT name, stock FROM item;']]
	},
	'prg-002': {
		pass: [
			"function wear(temp) {\n  if (temp >= 30) return '暑い';\n  if (temp < 15) return '寒い';\n  return 'ちょうどよい';\n}\nconsole.log(wear(31), wear(30), wear(15), wear(14));\n"
		],
		wrong: [
			[
				'function wear(temp) {\n  console.log(temp);\n}\nconsole.log(wear(31), wear(30), wear(15), wear(14));\n'
			],
			[
				"function wear(temp) {\n  if (temp > 30) return '暑い';\n  if (temp < 15) return '寒い';\n  return 'ちょうどよい';\n}\nconsole.log(wear(31), wear(30), wear(15), wear(14));\n"
			],
			[
				"function wear(temp) {\n  if (temp >= 30) return '暑い';\n  if (temp <= 15) return '寒い';\n  return 'ちょうどよい';\n}\nconsole.log(wear(31), wear(30), wear(15), wear(14));\n"
			]
		]
	},
	'prg-003': {
		pass: [
			'const days = [4, 0, 7, 3];\nlet total = 0;\nfor (let i = 0; i < days.length; i++) {\n  total = total + days[i];\n}\nconsole.log(total);\n'
		],
		wrong: [
			[
				'const days = [4, 0, 7, 3];\nlet total = 0;\nfor (let i = 0; i <= days.length; i++) {\n  total = total + days[i];\n}\nconsole.log(total);\n'
			],
			[
				'const days = [4, 0, 7, 3];\nlet total = 0;\nfor (let i = 0; i < days.length; i++) {\n  total = total + days[i];\n  console.log(total);\n}\n'
			],
			[
				'const days = [4, 0, 7, 3];\nlet total = 0;\nfor (let i = 1; i < days.length; i++) {\n  total = total + days[i];\n}\nconsole.log(total);\n'
			]
		]
	},
	'prg-004': {
		pass: [
			'function boxes(count, size) {\n  return Math.ceil(count / size);\n}\nconsole.log(boxes(10, 4), boxes(8, 4), boxes(1, 6));\n'
		],
		wrong: [
			[
				'function boxes(count, size) {\n  Math.ceil(count / size);\n}\nconsole.log(boxes(10, 4), boxes(8, 4), boxes(1, 6));\n'
			],
			[
				'function boxes(count, size) {\n  return count / size;\n}\nconsole.log(boxes(10, 4), boxes(8, 4), boxes(1, 6));\n'
			],
			[
				'function boxes(count, size) {\n  return Math.floor(count / size);\n}\nconsole.log(boxes(10, 4), boxes(8, 4), boxes(1, 6));\n'
			]
		]
	},
	'prg-005': {
		pass: [
			"const items = [\n  { name: 'あんパン', stock: 0 },\n  { name: '食パン', stock: 4 },\n  { name: 'メロンパン', stock: 2 }\n];\nconsole.log(items.filter((x) => x.stock > 0).map((x) => x.name));\n"
		],
		wrong: [
			[
				"const items = [\n  { name: 'あんパン', stock: 0 },\n  { name: '食パン', stock: 4 },\n  { name: 'メロンパン', stock: 2 }\n];\nconsole.log(items.map((x) => x.name));\n"
			],
			[
				"const items = [\n  { name: 'あんパン', stock: 0 },\n  { name: '食パン', stock: 4 },\n  { name: 'メロンパン', stock: 2 }\n];\nconsole.log(items.filter((x) => x.stock > 0));\n"
			],
			[
				"const items = [\n  { name: 'あんパン', stock: 0 },\n  { name: '食パン', stock: 4 },\n  { name: 'メロンパン', stock: 2 }\n];\nconsole.log(items.map((x) => x.name).filter((x) => x.stock > 0));\n"
			]
		]
	},
	'prg-006': {
		pass: [
			"const base = { name: '食パン', price: 300 };\nconst sale = { ...base };\nsale.price = 350;\nconsole.log(base.price, sale.price);\n"
		],
		wrong: [
			[
				"const base = { name: '食パン', price: 300 };\nconst sale = base;\nsale.price = 350;\nconsole.log(base.price, sale.price);\n"
			],
			[
				"const base = { name: '食パン', price: 300 };\nconst sale = { ...base };\nconsole.log(base.price, sale.price);\n"
			],
			[
				"const base = { name: '食パン', price: 300 };\nconst sale = base;\nsale = { ...base };\nsale.price = 350;\nconsole.log(base.price, sale.price);\n"
			]
		]
	},
	'prg-007': {
		pass: [
			"function parseCount(text) {\n  const n = Number(text);\n  if (Number.isNaN(n)) throw new Error('数でない: ' + text);\n  return n;\n}\nconst inputs = ['3', 'x', '5'];\nlet total = 0;\nfor (const t of inputs) {\n  try {\n    total += parseCount(t);\n  } catch (e) {\n    console.log('読めない:', e.message);\n  }\n}\nconsole.log('合計', total);\n"
		],
		wrong: [
			[
				"function parseCount(text) {\n  const n = Number(text);\n  if (Number.isNaN(n)) throw new Error('数でない: ' + text);\n  return n;\n}\nconst inputs = ['3', 'x', '5'];\nlet total = 0;\nfor (const t of inputs) {\n  total += parseCount(t);\n}\nconsole.log('合計', total);\n"
			],
			[
				"function parseCount(text) {\n  const n = Number(text);\n  if (Number.isNaN(n)) throw new Error('数でない: ' + text);\n  return n;\n}\nconst inputs = ['3', 'x', '5'];\nlet total = 0;\ntry {\n  for (const t of inputs) {\n    total += parseCount(t);\n  }\n} catch (e) {\n  console.log('読めない:', e.message);\n}\nconsole.log('合計', total);\n"
			],
			[
				"function parseCount(text) {\n  const n = Number(text);\n  if (Number.isNaN(n)) throw new Error('数でない: ' + text);\n  return n;\n}\nconst inputs = ['3', 'x', '5'];\nlet total = 0;\nfor (const t of inputs) {\n  try {\n    total += parseCount(t);\n  } catch (err) {\n    console.log('読めない:', e.message);\n  }\n}\nconsole.log('合計', total);\n"
			]
		]
	},
	'prg-008': {
		pass: [
			"function fetchStock(shop, ms, n) {\n  return new Promise((resolve) => setTimeout(() => resolve(n), ms));\n}\nconst a = fetchStock('東店', 2000, 5);\nconst b = fetchStock('西店', 1000, 3);\nconst [x, y] = await Promise.all([a, b]);\nconsole.log('合計', x + y);\n"
		],
		wrong: [
			[
				"function fetchStock(shop, ms, n) {\n  return new Promise((resolve) => setTimeout(() => resolve(n), ms));\n}\nconst a = fetchStock('東店', 2000, 5);\nconst b = fetchStock('西店', 1000, 3);\nconsole.log('合計', a + b);\n"
			],
			[
				"function fetchStock(shop, ms, n) {\n  return new Promise((resolve) => setTimeout(() => resolve(n), ms));\n}\nconst a = fetchStock('東店', 2000, 5);\nconst b = fetchStock('西店', 1000, 3);\nconst s = await Promise.all([a, b]);\nconsole.log('合計', s);\n"
			]
		]
	},
	'prg-009': {
		pass: [
			"function test(name, got, want) {\n  console.log(got === want ? 'ok' : 'NG', name, '期待', want, '結果', got);\n}\nfunction shipping(total) {\n  if (total >= 3000) return 0;\n  return 500;\n}\ntest('5000 円', shipping(5000), 0);\ntest('2999 円', shipping(2999), 500);\ntest('3000 円', shipping(3000), 0);\n"
		],
		wrong: [
			[
				"function test(name, got, want) {\n  console.log(got === want ? 'ok' : 'NG', name, '期待', want, '結果', got);\n}\nfunction shipping(total) {\n  if (total > 3000) return 0;\n  return 500;\n}\ntest('5000 円', shipping(5000), 0);\ntest('2999 円', shipping(2999), 500);\ntest('3000 円', shipping(3000), 0);\n"
			],
			[
				"function test(name, got, want) {\n  console.log(got === want ? 'ok' : 'NG', name, '期待', want, '結果', got);\n}\nfunction shipping(total) {\n  if (total > 2998) return 0;\n  return 500;\n}\ntest('5000 円', shipping(5000), 0);\ntest('2999 円', shipping(2999), 500);\ntest('3000 円', shipping(3000), 0);\n"
			]
		]
	},
	'prg-011': {
		pass: [
			'function sum(n) {\n  if (n === 0) return 0;\n  return n + sum(n - 1);\n}\nconsole.log(sum(4), sum(10));\n'
		],
		wrong: [
			['function sum(n) {\n  return n + sum(n - 1);\n}\nconsole.log(sum(4), sum(10));\n'],
			[
				'function sum(n) {\n  if (n === 0) return 0;\n  n + sum(n - 1);\n}\nconsole.log(sum(4), sum(10));\n'
			],
			[
				'function sum(n) {\n  if (n === 0) return 1;\n  return n + sum(n - 1);\n}\nconsole.log(sum(4), sum(10));\n'
			]
		]
	},
	'prg-012': {
		pass: [
			"const name = 'みなと';\nconsole.log(new TextEncoder().encode(name).length, name.length);\n"
		],
		wrong: [
			["const name = 'みなと';\nconsole.log(name.length, name.length);\n"],
			[
				"const name = 'みなと';\nconsole.log(name.length, new TextEncoder().encode(name).length);\n"
			],
			["const name = 'みなと';\nconsole.log(new Textencoder().encode(name).length, name.length);\n"]
		]
	},
	'lnx-001': {
		pass: ['cd docs', 'cd notes', 'ls'],
		wrong: [['cd note'], ['cd readme.txt']]
	},
	'lnx-002': {
		pass: ['mkdir archive', 'cp menu.txt archive/menu-1110.txt', 'rm draft.txt'],
		wrong: [
			['cp menu.txt archive/menu-1110.txt'],
			['cp menu.tx archive'],
			['mkdir archive', 'rm archive']
		]
	},
	'lnx-003': {
		pass: ['tail -n 5 access.log'],
		wrong: [['head -n 5 access.log'], ['tail -n five access.log'], ['tail -n 5 acess.log']]
	},
	'lnx-004': {
		pass: ['chmod 755 backup.sh', 'chmod 600 pass.txt'],
		wrong: [['./backup.sh'], ['chmod 799 backup.sh'], ['chmod 600 pas.txt']]
	},
	'lnx-005': {
		pass: ['sort sales.txt | uniq -c | sort -rn > top.txt'],
		wrong: [
			['sort sales.txt | uniq -c | sort -rn | top.txt'],
			['uniq -c sales.txt > top.txt', 'cat top.txt'],
			['sort salse.txt | uniq -c | sort -rn > top.txt']
		]
	},
	'lnx-006': {
		pass: ['grep -ci error shop.log'],
		wrong: [['grep -c error shop.log'], ['grep -i error shop.log'], ['grep -ci error shop.lg']]
	},
	'lnx-007': {
		pass: ['sudo kill -KILL 21506', 'ps -u shop -o pid,ppid,stat,cmd'],
		wrong: [['kill -KILL 21506'], ['sudo kill -KILL 21507'], ['sudo kill -KIL 21506']]
	},
	'lnx-008': {
		pass: ['export PATH="$HOME/demo/tools:$PATH"', 'report'],
		wrong: [
			['PATH = "$HOME/demo/tools:$PATH"'],
			['report'],
			['export $PATH="$HOME/demo/tools:$PATH"']
		]
	},
	'lnx-009': {
		pass: [
			"printf '%s\\n' '#!/bin/bash' 'echo \"hello, $1\"' > hello.sh",
			'chmod +x hello.sh',
			'./hello.sh minato'
		],
		wrong: [
			["printf '%s\\n' '#!/bin/bash' 'echo \"hello, $1\"' > hello.sh", './hello.sh minato'],
			[
				"printf '%s\\n' '#!/bin/bash' 'echo \"hello, $1\"' > hello.sh",
				'chmod +x hello.sh',
				'hello.sh minato'
			],
			[
				"printf '%s\\n' '#!/bin/bash' \"echo 'hello, $1'\" > hello.sh",
				'chmod +x hello.sh',
				'./hello.sh minato'
			]
		]
	},
	'lnx-010': {
		pass: [
			'sudo systemctl enable shop',
			'sudo systemctl start shop',
			'systemctl is-enabled shop; systemctl is-active shop'
		],
		wrong: [['systemctl start shop'], ['systemctl enable shop'], ['sudo systemctl start shp']]
	},
	'lnx-011': {
		pass: ["echo 'sales: 150' | sudo tee /srv/shop/report.txt"],
		wrong: [
			["echo 'sales: 150' > /srv/shop/report.txt"],
			['sudo cd /srv/shop'],
			["echo 'sales: 150' | sudo tea /srv/shop/report.txt"]
		]
	}
};

/** 形の実戦の解き方（合格する答え）と、間違いの答え（mistakes の順に 1 つずつ） */
export const FORM_SOLUTIONS: Record<string, { pass: FormAnswer; wrong: FormAnswer[] }> = {
	'prg-010': {
		pass: { kind: 'calc', values: ['2000', '4000000', '11', '4'] },
		wrong: [
			{ kind: 'calc', values: ['2000', '4000', '11', '4'] },
			{ kind: 'calc', values: ['2000', '4000000', '1000', '4'] },
			{ kind: 'calc', values: ['2000', '4000000', '11', '2'] }
		]
	},
	'net-001': {
		pass: { kind: 'calc', values: ['10000010', '11000000', '128', '172.16.45.128', '62'] },
		wrong: [
			{ kind: 'calc', values: ['10000010', '11000000', '128', '172.16.45.130', '62'] },
			{ kind: 'calc', values: ['10000010', '11000000', '128', '172.16.45.128', '64'] },
			{ kind: 'calc', values: ['10000010', '11000000', '130', '172.16.45.128', '62'] }
		]
	},
	'net-005': {
		pass: { kind: 'order', order: ['listen', 'syn', 'synack', 'ack', 'data', 'fin'] },
		wrong: [
			{ kind: 'order', order: ['listen', 'synack', 'syn', 'ack', 'data', 'fin'] },
			{ kind: 'order', order: ['listen', 'syn', 'synack', 'data', 'ack', 'fin'] },
			{ kind: 'order', order: ['syn', 'listen', 'synack', 'ack', 'data', 'fin'] }
		]
	},
	'sec-001': {
		pass: {
			kind: 'sort',
			bins: { pw: 'authn', otp: 'authn', view: 'authz', pay: 'authz', s401: 'authn', s403: 'authz' }
		},
		wrong: [
			{
				kind: 'sort',
				bins: {
					pw: 'authn',
					otp: 'authn',
					view: 'authz',
					pay: 'authz',
					s401: 'authn',
					s403: 'authn'
				}
			},
			{
				kind: 'sort',
				bins: {
					pw: 'authn',
					otp: 'authz',
					view: 'authz',
					pay: 'authz',
					s401: 'authn',
					s403: 'authz'
				}
			},
			{
				kind: 'sort',
				bins: {
					pw: 'authn',
					otp: 'authn',
					view: 'authz',
					pay: 'authn',
					s401: 'authn',
					s403: 'authz'
				}
			}
		]
	},
	'sec-009': {
		pass: { kind: 'fix', lines: { r1: 'ssh', r2: 'web', r3: 'deny' } },
		wrong: [
			{ kind: 'fix', lines: { r1: 'all' } },
			{ kind: 'fix', lines: {} },
			{ kind: 'fix', lines: { r1: 'web', r3: 'deny' } }
		]
	},
	'sec-011': {
		pass: { kind: 'pick', choice: 'self' },
		wrong: [
			{ kind: 'pick', choice: 'open' },
			{ kind: 'pick', choice: 'reply' },
			{ kind: 'pick', choice: 'look' }
		]
	}
};

/** 例（打った物と返った物）を流すときの初めの状態。無ければ実戦の初めの状態から流す */
export const EXAMPLE_SETUP: Record<string, unknown> = {
	'lnx-002': { files: { 'menu.txt': 'bread 120\n' } },
	'lnx-004': { files: { 'hi.sh': '#!/bin/bash\necho hi\n', 'memo.txt': 'memo\n' } },
	'lnx-005': { files: { 'orders.txt': 'bread\nmilk\nbread\njam\nbread\nmilk\n' } }
};
