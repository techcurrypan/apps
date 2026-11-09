// 本物の出力を記録する（docs/tools.md 2 章）。GitHub Actions の Ubuntu の上でだけ走らせる。
//   node devlearn/tools-real/record.ts [場面の ID]
// 場面（scenarios/*.json）ごとに、利用者 learner の空の作業場所で本物の命令を 1 行ずつ打ち、
// 標準出力・標準エラー・終了コードを recorded/<場面>.json に書く。
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Scenario = { id: string; tool: string; lesson: string; note?: string; steps: string[] };

const here = dirname(fileURLToPath(import.meta.url));
// 作り物の時計：場面の始まり 2026-11-10T09:00:00+09:00（UNIX 時刻 1794268800）。
// 打った行ごとに 1 分進む（模擬と同じ。src/lib/tools/clock.ts）
const BASE = 1794268800;
const HOME = '/home/learner';
const WORK = `${HOME}/demo`;
const NL = String.fromCharCode(10);
const TAB = String.fromCharCode(9);

const GITCONFIG = [
	'[user]',
	`${TAB}name = learner`,
	`${TAB}email = learner@example.com`,
	'[init]',
	`${TAB}defaultBranch = main`,
	''
].join(NL);

const ENV = [
	`HOME=${HOME}`,
	'USER=learner',
	'LOGNAME=learner',
	'SHELL=/bin/bash',
	'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
	'TZ=Asia/Tokyo',
	'LANG=C.UTF-8',
	// 端末は色の無い幅 80 の物。git は頁送りをしない（模擬の端末も同じ）
	'TERM=dumb',
	'GIT_PAGER=cat',
	'PAGER=cat'
];

function sh(cmd: string): string {
	return execFileSync('bash', ['-c', cmd], { encoding: 'utf8' }).trim();
}

function versions(): Record<string, string> {
	const v = (c: string) => {
		try {
			return sh(c);
		} catch {
			return '';
		}
	};
	return {
		os: v('. /etc/os-release && echo "$PRETTY_NAME"'),
		bash: v('bash --version | head -1'),
		git: v('git --version'),
		coreutils: v('ls --version | head -1')
	};
}

// 1 行ずつ、別の bash で打つ。今いる場所と export した変数は、ファイルに書いて次の行へ渡す。
// 標準出力は擬似端末（ttyrun.py）、標準エラーはファイル。
function record(s: Scenario) {
	const st = `/tmp/rec/${s.id}`;
	rmSync(st, { recursive: true, force: true });
	mkdirSync(st, { recursive: true });
	chmodSync(st, 0o777);
	sh(`sudo rm -rf ${WORK} && sudo -u learner mkdir -p ${WORK}`);
	writeFileSync(`${st}/gitconfig`, GITCONFIG);
	sh(`sudo -u learner cp ${st}/gitconfig ${HOME}/.gitconfig`);
	for (const [f, v] of [
		['cwd', WORK],
		['env', '']
	]) {
		writeFileSync(`${st}/${f}`, v);
		chmodSync(`${st}/${f}`, 0o666);
	}

	const steps = s.steps.map((line, j) => {
		writeFileSync(`${st}/${j}.cmd`, line);
		const t = BASE + 60 * j;
		const script = [
			`cd "$(cat ${st}/cwd)"`,
			`. ${st}/env`,
			`export GIT_AUTHOR_DATE="${t} +0900" GIT_COMMITTER_DATE="${t} +0900"`,
			`eval "$(cat ${st}/${j}.cmd)" 2> ${st}/${j}.err`,
			`echo $? > ${st}/${j}.code`,
			`pwd > ${st}/cwd`,
			`export -p | grep -v -E '^declare -x (GIT_AUTHOR_DATE|GIT_COMMITTER_DATE|OLDPWD|PWD|SHLVL|_)=' > ${st}/env`
		].join(NL);
		const r = spawnSync(
			'sudo',
			[
				'-u',
				'learner',
				'env',
				'-i',
				...ENV,
				'python3',
				'-I',
				'/tmp/rec/ttyrun.py',
				`${st}/${j}.out`,
				script
			],
			{ encoding: 'utf8', timeout: 30000 }
		);
		if (r.status !== 0) {
			throw new Error(
				`${j} 行目（${line}）で止まった: status=${r.status} ${r.stderr} ${r.error ?? ''}`
			);
		}
		const read = (f: string) => readFileSync(`${st}/${f}`, 'utf8');
		return {
			line,
			// 端末は改行を CR LF で返すので LF に戻す
			out: read(`${j}.out`)
				.split(String.fromCharCode(13) + NL)
				.join(NL),
			err: read(`${j}.err`),
			code: Number(read(`${j}.code`).trim())
		};
	});
	return { id: s.id, tool: s.tool, lesson: s.lesson, recordedOn: versions(), steps };
}

// 利用者 learner から読めるように、擬似端末の台本を /tmp に写す
mkdirSync('/tmp/rec', { recursive: true });
chmodSync('/tmp/rec', 0o777);
writeFileSync('/tmp/rec/ttyrun.py', readFileSync(join(here, 'ttyrun.py')));
chmodSync('/tmp/rec/ttyrun.py', 0o644);

const only = process.argv[2];
let failed = 0;
for (const f of readdirSync(join(here, 'scenarios')).sort()) {
	if (!f.endsWith('.json')) continue;
	const s = JSON.parse(readFileSync(join(here, 'scenarios', f), 'utf8')) as Scenario;
	if (only && s.id !== only) continue;
	try {
		const out = record(s);
		writeFileSync(join(here, 'recorded', `${s.id}.json`), JSON.stringify(out, null, TAB) + NL);
		console.log(`記録した: ${s.id}（${s.steps.length} 行）`);
	} catch (e) {
		// CI の注記に出す（注記は認証なしで読める）。他の場面は続ける
		failed++;
		const msg = String(e instanceof Error ? e.message : e)
			.split(NL)
			.join('%0A');
		console.log(`::error title=${s.id}::${msg}`);
	}
}
if (failed > 0) process.exitCode = 1;
