// 書いたレッスンの実戦の解き方（合格まで）と、間違いの手（mistakes の順に 1 つずつ）。
// solutions.test.ts と、公開 URL で通す scripts/look-practice.ts が使う。画面からは読まない。
import type { FormAnswer } from '../practice/forms.ts';

/** レッスンごとの解き方（合格まで）と、間違いの手（mistakes の順に 1 つずつ） */
export const SOLUTIONS: Record<string, { pass: string[]; wrong: string[][] }> = {
	'db-002': {
		pass: ["SELECT name, kind FROM items WHERE kind = '惣菜' OR stock = 0;"],
		wrong: [
			['SELECT name, kind FROM items WHERE kind = 惣菜 OR stock = 0;'],
			["SELECT * FROM items WHERE kind = '惣菜' OR stock = 0;"],
			["SELECT name, kind FROM item WHERE kind = '惣菜' OR stock = 0;"]
		]
	},
	'db-003': {
		pass: ['SELECT name, stock FROM items ORDER BY stock DESC LIMIT 3;'],
		wrong: [
			['SELECT name, stock FROM items ORDER BY stock DESC;'],
			['SELECT name, stock FROM items ORDER BY stock LIMIT 3;'],
			['SELECT name, stock FROM items LIMIT 3 ORDER BY stock DESC;']
		]
	},
	'db-004': {
		pass: ['SELECT item_id, SUM(qty) AS total FROM sales GROUP BY item_id HAVING total >= 4;'],
		wrong: [
			['SELECT item_id, SUM(qty) AS total FROM sales WHERE SUM(qty) >= 4 GROUP BY item_id;'],
			['SELECT item_id, SUM(qty) AS total FROM sales GROUP BY item_id;'],
			['SELECT item_id, SUM(qtty) AS total FROM sales GROUP BY item_id HAVING total >= 4;']
		]
	},
	'db-005': {
		pass: [
			"SELECT i.name, s.qty FROM sales s JOIN items i ON i.id = s.item_id WHERE s.day = '11-11';"
		],
		wrong: [
			["SELECT name, qty FROM sales JOIN items ON id = item_id WHERE day = '11-11';"],
			[
				"SELECT i.name, s.qty FROM items i LEFT JOIN sales s ON s.item_id = i.id AND s.day = '11-11';"
			],
			['SELECT i.name, s.qty FROM sales s JOIN items i ON i.id = s.item_id;']
		]
	},
	'db-006': {
		pass: [
			"UPDATE items SET stock = 20 WHERE name = 'メロンパン';",
			'SELECT name, stock FROM items;'
		],
		wrong: [
			['UPDATE items SET stock = 20;'],
			["UPDATE items SET stock = 20 WHERE name = 'メロンパソ';"],
			["UPDATE items SET stok = 20 WHERE name = 'メロンパン';"]
		]
	},
	'db-007': {
		pass: [
			'CREATE TABLE staff (code TEXT PRIMARY KEY, name TEXT NOT NULL);',
			"INSERT INTO staff VALUES ('S1', 'hanako');",
			"INSERT INTO staff VALUES ('S1', 'taro');",
			"INSERT INTO staff VALUES ('S2', NULL);",
			"INSERT INTO staff VALUES ('S2', 'jiro');",
			'SELECT * FROM staff;'
		],
		wrong: [
			[
				'CREATE TABLE staff (code TEXT, name TEXT NOT NULL);',
				"INSERT INTO staff VALUES ('S1', 'hanako');",
				"INSERT INTO staff VALUES ('S1', 'taro');",
				'SELECT * FROM staff;'
			],
			[
				'CREATE TABLE staff (code TEXT PRIMARY KEY, name TEXT);',
				"INSERT INTO staff VALUES ('S1', 'hanako');",
				"INSERT INTO staff VALUES ('S2', NULL);",
				'SELECT * FROM staff;'
			],
			["INSERT INTO staff VALUES ('S1', 'hanako');"]
		]
	},
	'db-008': {
		pass: [
			'CREATE TABLE customers (name TEXT PRIMARY KEY, phone TEXT NOT NULL);',
			'INSERT INTO customers SELECT DISTINCT customer, phone FROM orders_flat;',
			'SELECT * FROM customers;'
		],
		wrong: [
			[
				'CREATE TABLE customers (name TEXT PRIMARY KEY, phone TEXT NOT NULL);',
				'INSERT INTO customers SELECT customer, phone FROM orders_flat;'
			],
			[
				'CREATE TABLE customers (name TEXT PRIMARY KEY, phone TEXT NOT NULL);',
				'INSERT INTO customers SELECT DISTINCT name, phone FROM orders_flat;'
			],
			['INSERT INTO customers SELECT DISTINCT customer, phone FROM orders_flat;']
		]
	},
	'db-009': {
		pass: [
			'CREATE INDEX idx_day ON receipts(day);',
			"EXPLAIN QUERY PLAN SELECT * FROM receipts WHERE day = '11-05';"
		],
		wrong: [
			["EXPLAIN QUERY PLAN SELECT * FROM receipts WHERE day = '11-05';"],
			['CREATE INDEX idx_day ON receipts(day);', 'CREATE INDEX idx_day ON receipts(day);'],
			['CREATE INDEX idx_day ON receipts(days);']
		]
	},
	'db-010': {
		pass: [
			'BEGIN;',
			"UPDATE accounts SET points = points - 300 WHERE name = 'hanako';",
			"UPDATE accounts SET points = points + 300 WHERE name = 'taro';",
			'COMMIT;',
			'SELECT * FROM accounts;'
		],
		wrong: [
			[
				'BEGIN;',
				"UPDATE accounts SET points = points - 300 WHERE name = 'hanako';",
				"UPDATE accounts SET points = points + 300 WHERE name = 'taroo';"
			],
			['COMMIT;'],
			['BEGIN;', "UPDATE accounts SET points = points - 3000 WHERE name = 'hanako';"]
		]
	},
	'db-011': {
		pass: ['SELECT id, item FROM reviews WHERE stars IS NULL;'],
		wrong: [
			['SELECT id, item FROM reviews WHERE stars IS NOT NULL;'],
			['SELECT id, item FROM reviews WHERE star IS NULL;']
		]
	},
	'sec-002': {
		pass: ["printf 'salt1:password123' | sha256sum"],
		wrong: [
			["printf 'password123' | sha256sum"],
			["echo 'salt1:password123' | sha256sum"],
			["printf 'salt1:password123' | md5sum"]
		]
	},
	'sec-004': {
		pass: ['openssl verify -CAfile root-ca.pem -untrusted inter-ca.pem server.pem'],
		wrong: [
			['openssl verify -CAfile root-ca.pem server.pem'],
			['openssl verify -CAfile inter-ca.pem server.pem'],
			['openssl verify -CAfile root-ca.pem -untrusted inter-ca.pem old.pem']
		]
	},
	'sec-005': {
		pass: ["SELECT name, mail FROM members WHERE name = 'O''Hara';"],
		wrong: [
			["SELECT name, mail FROM members WHERE name = 'O'Hara';"],
			["SELECT name, mail FROM members WHERE name = '' OR '1'='1';"],
			["SELECT name, mail FROM member WHERE name = 'O''Hara';"]
		]
	},
	'sec-008': {
		pass: [
			"ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519",
			'cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys',
			'ssh -o StrictHostKeyChecking=accept-new ssh.example.com hostname -I'
		],
		wrong: [
			['ssh -o StrictHostKeyChecking=accept-new ssh.example.com hostname -I'],
			['ssh ssh.example.com hostname -I'],
			[
				"ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519",
				"ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519"
			],
			['ssh -o StrictHostKeyChecking=accept-new shh.example.com hostname -I']
		]
	},
	'sec-012': {
		pass: ["grep ' 401 ' access.log | cut -d ' ' -f 1 | sort | uniq -c | sort -rn | head -n 1"],
		wrong: [
			["cut -d ' ' -f 1 access.log | sort | uniq -c | sort -rn | head -n 1"],
			["grep ' 401 ' access.log | cut -d ' '"],
			["grep ' 401 ' access.log | cut -d ' ' -f 0"],
			["cut -d ' ' -f 1 acess.log"]
		]
	},
	'sec-013': {
		pass: ["printf '.env\\n' > .gitignore", 'git add .', 'git commit -m "first"'],
		wrong: [
			['git add .', 'git status --short'],
			['git add .', 'git commit -m "first"'],
			['git add .gitignore']
		]
	},
	'net-002': {
		pass: ['ping -c 1 192.0.2.80', 'ip neigh show 192.0.2.80'],
		wrong: [
			['ping -c 1 192.0.2.99'],
			['ping -c 1 192.0.2.99', 'ip neigh show 192.0.2.99'],
			['arp -n'],
			['ping -c 1 192.0.2.256']
		]
	},
	'net-003': {
		pass: ['ip route get 198.51.100.7'],
		wrong: [
			['ip route get shop.example.com'],
			['ip route get 198.51.10.7'],
			['traceroute 198.51.100.7']
		]
	},
	'net-004': {
		pass: ['dig +short cdn.example.com'],
		wrong: [['dig cdn.exmple.com'], ['ping -c 1 cdn.exmple.com'], ['nslookup cdn.example.com']]
	},
	'net-006': {
		pass: ['ss -uln'],
		wrong: [['ss -tuln'], ['ss -tln'], ['netstat -uln']]
	},
	'net-007': {
		pass: ['curl -v http://shop.example.com/', 'echo yorozu-web/1.0 > server.txt'],
		wrong: [['curl -v http://shop.exmple.com/'], ['curl -v http://shop.example.com:8080/']]
	},
	'net-008': {
		pass: ['curl -L http://shop.example.com/old'],
		wrong: [
			['curl -iL http://shop.example.com/old'],
			['curl http://shop.example.com/old'],
			['curl -L http://shop.example.com/olds']
		]
	},
	'net-013': {
		pass: [
			`curl -s -o /dev/null -w '%{http_code}\\n' -H 'If-None-Match: "v1"' http://shop.example.com/style.css`
		],
		wrong: [
			[`curl -s -o /dev/null -w '%{http_code}\\n' http://shop.example.com/style.css`],
			[
				`curl -s -o /dev/null -w '%{http_code}\\n' -H 'If-None-Match: "v1"' http://shop.example.com/styles.css`
			],
			[
				`curl -s -o /dev/null -w '%{http_code}\\n' -H 'If-None-Match: "v1"' http://shop.exmple.com/style.css`
			]
		]
	},
	'git-001': {
		pass: ['git add hello.txt', 'git commit -m "first commit"'],
		wrong: [
			['git commit -m "x"'],
			['git add hello.tx'],
			['git add hello.txt', 'git commit -m a', 'git commit -m b']
		]
	},
	'git-002': {
		pass: ['git add fruits.txt', 'git commit -m "change fruits"'],
		wrong: [
			['git add .', 'git commit -m "change fruits"'],
			['git commit -m "change fruits"'],
			['git add fruit.txt']
		]
	},
	'git-003': {
		pass: ['git revert --no-edit HEAD'],
		wrong: [['git revert HEAD'], ['git reset --hard HEAD~1'], ['git revert --no-edit HEAD~5']]
	},
	'git-004': {
		pass: ['git switch -c feature', "printf 'milk\\n' >> menu.txt", 'git commit -am "add milk"'],
		wrong: [
			["printf 'milk\\n' >> menu.txt", 'git commit -am "add milk"'],
			['git switch feature'],
			['git branch feature', 'git branch feature']
		]
	},
	'git-005': {
		pass: ['git merge feature'],
		wrong: [
			['git switch feature'],
			['git merge featur'],
			['git merge feature', 'git merge feature']
		]
	},
	'git-006': {
		pass: [
			'git merge price',
			"printf 'bread 130\\n' > menu.txt",
			'git add menu.txt',
			'git commit -m "merge price"'
		],
		wrong: [['git merge price', 'git commit -m "merge price"'], ['git merge prise']]
	},
	'git-007': {
		pass: [
			'git pull',
			"printf 'open 7:00\\n' > notes.txt",
			'git add notes.txt',
			'git commit -m "add notes"',
			'git push'
		],
		wrong: [
			[
				"printf 'open 7:00\\n' > notes.txt",
				'git add notes.txt',
				'git commit -m "add notes"',
				'git push'
			],
			[
				"printf 'open 7:00\\n' > notes.txt",
				'git add notes.txt',
				'git commit -m "add notes"',
				'git pull'
			],
			['git pull', 'git push origin mian']
		]
	},
	'git-008': {
		pass: ['git switch feature', 'git rebase main', 'git switch main', 'git merge feature'],
		wrong: [
			['git merge feature'],
			['git rebase feature'],
			['git switch feature', 'git rebase mian']
		]
	},
	'git-009': {
		pass: [
			"printf '.env\\nlogs/\\n' > .gitignore",
			'git rm --cached .env',
			'git add .gitignore',
			'git commit -m "ignore secrets"'
		],
		wrong: [
			["printf '.env\\nlogs/\\n' > .gitignore", 'git rm --cached .env', 'git add .env'],
			['git rm --cached env']
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
	'ctr-002': {
		pass: ['docker stop web', 'docker rm web once'],
		wrong: [['docker rm web once'], ['docker stop wbe']]
	},
	'ctr-003': {
		pass: [
			'docker rm -f web',
			'docker run -d --name web -p 8080:80 shop-web:1.0',
			'curl http://localhost:8080/'
		],
		wrong: [
			['curl http://localhost:8080/'],
			['docker run -d --name web -p 8080:80 shop-web:1.0'],
			[
				'docker rm -f web',
				'docker run -d --name web -p 8080:80 shop-web:1.0',
				'docker run -d --name web2 -p 8080:80 shop-web:1.0'
			]
		]
	},
	'ctr-004': {
		pass: [
			'docker build -t shop-web:1.0 .',
			'docker run -d --name web -p 8080:80 shop-web:1.0',
			'curl http://localhost:8080/'
		],
		wrong: [
			['docker build .', 'docker run -d --name web -p 8080:80 shop-web:1.0'],
			['docker build -t shop-web:1.0'],
			['docker build -t shop-web:1.0 demo']
		]
	},
	'ctr-005': {
		pass: [
			'docker volume create shopdata',
			"docker run --rm -v shopdata:/data busybox:1.37 sh -c 'echo 120 > /data/sales.txt'",
			'docker run --rm -v shopdata:/data busybox:1.37 cat /data/sales.txt'
		],
		wrong: [
			[
				'docker volume create shopdata',
				"docker run --rm -v shopdata:/data busybox:1.37 sh -c 'echo 120 > /data/sales.txt'",
				'docker run --rm busybox:1.37 cat /data/sales.txt'
			],
			[
				'docker volume create shopdata',
				"docker run --rm -v shopdata:/data busybox:1.37 sh -c 'echo 120 > /data.txt'",
				'docker run --rm -v shopdata:/data busybox:1.37 cat /data.txt'
			]
		]
	},
	'ctr-006': {
		pass: [
			'docker run -d --name app -e SHOP_MODE=live busybox:1.37 sleep 600',
			'docker exec app printenv SHOP_MODE'
		],
		wrong: [
			['docker run -d --name app busybox:1.37 -e SHOP_MODE=live sleep 600'],
			[
				'docker run -d --name app -e SHOP_MODE=live busybox:1.37 sleep 600',
				'docker exec ap printenv SHOP_MODE'
			],
			['docker run --rm --env-file shop.en busybox:1.37 true']
		]
	},
	'ctr-007': {
		pass: ['docker compose up -d', 'curl http://localhost:8080/'],
		wrong: [['docker compose up'], ['docker-compose up -d'], ['curl http://localhost:8080/']]
	},
	'ctr-008': {
		pass: ["echo '<p>shop v2</p>' > index.html", 'docker build -t shop-web:1.1 .'],
		wrong: [
			['docker build -t Shop-Web:1.1 .'],
			['docker build -t shop-web:1.1'],
			['docker history shop-web:1.1']
		]
	},
	'ctr-009': {
		pass: [
			'docker network create shopnet',
			'docker run -d --name db --network shopnet busybox:1.37 sleep 600',
			'docker run --rm --network shopnet busybox:1.37 ping -c 1 -W 1 db'
		],
		wrong: [
			[
				'docker network create shopnet',
				'docker run -d --name db --network shopnet busybox:1.37 sleep 600',
				'docker run --rm busybox:1.37 ping -c 1 -W 1 db'
			],
			['docker run -d --name db --network shopnt busybox:1.37 sleep 600']
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
	'sec-003': {
		pass: {
			kind: 'sort',
			bins: {
				bulk: 'common',
				sendkey: 'pub',
				openkey: 'priv',
				sign: 'priv',
				verify: 'pub',
				publish: 'pub'
			}
		},
		wrong: [
			{
				kind: 'sort',
				bins: {
					bulk: 'common',
					sendkey: 'priv',
					openkey: 'priv',
					sign: 'priv',
					verify: 'pub',
					publish: 'pub'
				}
			},
			{
				kind: 'sort',
				bins: {
					bulk: 'common',
					sendkey: 'pub',
					openkey: 'priv',
					sign: 'pub',
					verify: 'pub',
					publish: 'pub'
				}
			},
			{
				kind: 'sort',
				bins: {
					bulk: 'pub',
					sendkey: 'pub',
					openkey: 'priv',
					sign: 'priv',
					verify: 'pub',
					publish: 'pub'
				}
			},
			{
				kind: 'sort',
				bins: {
					bulk: 'common',
					sendkey: 'pub',
					openkey: 'priv',
					sign: 'priv',
					verify: 'pub',
					publish: 'priv'
				}
			}
		]
	},
	'sec-006': {
		pass: { kind: 'fix', lines: { n: 'esc', c: 'esc' } },
		wrong: [
			{ kind: 'fix', lines: { n: 'esc', c: 'pre' } },
			{ kind: 'fix', lines: { c: 'esc' } },
			{ kind: 'fix', lines: { n: 'esc' } }
		]
	},
	'sec-007': {
		pass: { kind: 'fix', lines: { c: 'lax' } },
		wrong: [
			{ kind: 'fix', lines: { c: 'strict' } },
			{ kind: 'fix', lines: { c: 'nosecure', t: 'look' } },
			{ kind: 'fix', lines: {} }
		]
	},
	'sec-010': {
		pass: { kind: 'fix', lines: { p1: 'sales', p2: 'daily', p3: 'nodelete' } },
		wrong: [
			{ kind: 'fix', lines: { p1: 'denyall', p2: 'daily' } },
			{ kind: 'fix', lines: {} },
			{ kind: 'fix', lines: { p1: 'sales', p3: 'daily' } },
			{ kind: 'fix', lines: { p1: 'sales', p2: 'sales' } }
		]
	},
	'net-009': {
		pass: { kind: 'order', order: ['tcp', 'ch', 'sh', 'cert', 'verify', 'fin', 'data'] },
		wrong: [
			{ kind: 'order', order: ['tcp', 'ch', 'sh', 'cert', 'verify', 'data', 'fin'] },
			{ kind: 'order', order: ['tcp', 'ch', 'sh', 'verify', 'cert', 'fin', 'data'] },
			{ kind: 'order', order: ['tcp', 'sh', 'ch', 'cert', 'verify', 'fin', 'data'] },
			{ kind: 'order', order: ['ch', 'tcp', 'sh', 'cert', 'verify', 'fin', 'data'] }
		]
	},
	'net-010': {
		pass: {
			kind: 'calc',
			values: [
				'198.51.100.1:61000',
				'198.51.100.1:61001',
				'192.168.1.21:50000',
				'172.31.255.255',
				'0'
			]
		},
		wrong: [
			{
				kind: 'calc',
				values: [
					'192.168.1.20:50000',
					'198.51.100.1:61001',
					'192.168.1.21:50000',
					'172.31.255.255',
					'0'
				]
			},
			{
				kind: 'calc',
				values: [
					'198.51.100.1:61000',
					'198.51.100.1:61000',
					'192.168.1.21:50000',
					'172.31.255.255',
					'0'
				]
			},
			{
				kind: 'calc',
				values: [
					'198.51.100.1:61000',
					'198.51.100.1:61001',
					'198.51.100.1:61001',
					'172.31.255.255',
					'0'
				]
			},
			{
				kind: 'calc',
				values: [
					'198.51.100.1:61000',
					'198.51.100.1:61001',
					'192.168.1.21:50000',
					'172.16.255.255',
					'0'
				]
			}
		]
	},
	'net-011': {
		pass: { kind: 'order', order: ['discover', 'offer', 'request', 'ack', 'use', 'renew'] },
		wrong: [
			{ kind: 'order', order: ['discover', 'request', 'offer', 'ack', 'use', 'renew'] },
			{ kind: 'order', order: ['discover', 'offer', 'request', 'use', 'ack', 'renew'] },
			{ kind: 'order', order: ['offer', 'discover', 'request', 'ack', 'use', 'renew'] }
		]
	},
	'net-012': {
		pass: { kind: 'calc', values: ['32', '8', '10.20.30.64', '10.20.30.95', '30', '26'] },
		wrong: [
			{ kind: 'calc', values: ['27', '8', '10.20.30.64', '10.20.30.95', '30', '26'] },
			{ kind: 'calc', values: ['32', '8', '10.20.30.64', '10.20.30.96', '30', '26'] },
			{ kind: 'calc', values: ['32', '8', '10.20.30.64', '10.20.30.95', '32', '26'] },
			{ kind: 'calc', values: ['32', '8', '10.20.30.64', '10.20.30.95', '30', '27'] }
		]
	},
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
	},
	'git-010': {
		pass: { kind: 'order', order: ['branch', 'push', 'request', 'fix', 'check', 'merge'] },
		wrong: [
			{ kind: 'order', order: ['branch', 'request', 'push', 'fix', 'check', 'merge'] },
			{ kind: 'order', order: ['branch', 'push', 'request', 'fix', 'merge', 'check'] },
			{ kind: 'order', order: ['branch', 'push', 'fix', 'request', 'check', 'merge'] }
		]
	}
};

/** 例（打った物と返った物）を流すときの初めの状態。無ければ実戦の初めの状態から流す */
export const EXAMPLE_SETUP: Record<string, unknown> = {
	'lnx-002': { files: { 'menu.txt': 'bread 120\n' } },
	'lnx-004': { files: { 'hi.sh': '#!/bin/bash\necho hi\n', 'memo.txt': 'memo\n' } },
	'lnx-005': { files: { 'orders.txt': 'bread\nmilk\nbread\njam\nbread\nmilk\n' } },
	'git-003': {
		initialized: false,
		files: {},
		prelude: ['git init', "printf 'v1\\n' > app.txt", 'git add app.txt', 'git commit -m "v1"']
	},
	'git-005': {
		initialized: false,
		files: {},
		prelude: [
			'git init',
			"printf 'bread\\n' > menu.txt",
			'git add menu.txt',
			'git commit -m "menu"',
			'git switch -c feature',
			"printf 'milk\\n' >> menu.txt",
			'git commit -am "add milk"',
			'git switch main'
		]
	},
	'git-007': { initialized: false, files: {} },
	'git-009': { initialized: false, files: {} },
	'ctr-008': { world: 'docker-cache' }
};
