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
	'lnx-001': {
		pass: ['cd docs', 'cd notes', 'ls'],
		wrong: [['cd note'], ['cd readme.txt']]
	}
};

/** 形の実戦の解き方（合格する答え）と、間違いの答え（mistakes の順に 1 つずつ） */
export const FORM_SOLUTIONS: Record<string, { pass: FormAnswer; wrong: FormAnswer[] }> = {
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
