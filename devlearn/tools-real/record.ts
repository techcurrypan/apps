// 本物の出力を記録する（docs/tools.md 2 章）。GitHub Actions の Ubuntu の上でだけ走らせる。
//   node devlearn/tools-real/record.ts
// 場面（scenarios/*.json）ごとに、利用者 learner の空の作業場所で本物の命令を 1 行ずつ打ち、
// 標準出力・標準エラー・終了コードを out/<場面>.json に書く。
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Scenario = { id: string; tool: string; lesson: string; note?: string; steps: string[] };

const here = dirname(fileURLToPath(import.meta.url));
// 作り物の時計：場面の始まり 2026-11-10T09:00:00+09:00。打った行ごとに 1 分進む（模擬と同じ）
const BASE = 1762732800;
const HOME = '/home/learner';
const WORK = `${HOME}/demo`;

const GITCONFIG = `[user]\n\tname = learner\n\temail = learner@example.com\n[init]\n\tdefaultBranch = main\n`;

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

function record(s: Scenario) {
	const tmp = `/tmp/rec/${s.id}`;
	rmSync(tmp, { recursive: true, force: true });
	mkdirSync(tmp, { recursive: true });
	chmodSync(tmp, 0o777);
	// 1 行ずつ打つ台本。eval で今のシェルの中で打つので、cd や export は次の行に残る
	const lines: string[] = [
		'set +e',
		`cd ${WORK}`,
		...s.steps.flatMap((step, j) => {
			writeFileSync(`${tmp}/${j}.cmd`, step);
			const t = BASE + 60 * j;
			return [
				`export GIT_AUTHOR_DATE="${t} +0900" GIT_COMMITTER_DATE="${t} +0900"`,
				`eval "$(cat ${tmp}/${j}.cmd)" > ${tmp}/${j}.out 2> ${tmp}/${j}.err < /dev/null`,
				`echo $? > ${tmp}/${j}.code`
			];
		})
	];
	writeFileSync(`${tmp}/run.sh`, lines.join('\n') + '\n');
	chmodSync(`${tmp}/run.sh`, 0o755);
	// 作業場所を空にし、利用者 learner として打つ
	sh(`sudo rm -rf ${WORK} && sudo -u learner mkdir -p ${WORK}`);
	sh(
		`printf '%s' '${GITCONFIG.replace(/'/g, "'\''")}' | sudo -u learner tee ${HOME}/.gitconfig > /dev/null`
	);
	const r = spawnSync(
		'sudo',
		[
			'-u',
			'learner',
			'env',
			'-i',
			`HOME=${HOME}`,
			'USER=learner',
			'LOGNAME=learner',
			'SHELL=/bin/bash',
			'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
			'TZ=Asia/Tokyo',
			'LANG=C.UTF-8',
			'bash',
			'--norc',
			'--noprofile',
			`${tmp}/run.sh`
		],
		{ encoding: 'utf8' }
	);
	if (r.status !== 0) throw new Error(`${s.id}: 台本が止まった ${r.stderr}`);
	const read = (f: string) => readFileSync(`${tmp}/${f}`, 'utf8');
	return {
		id: s.id,
		tool: s.tool,
		lesson: s.lesson,
		recordedOn: versions(),
		steps: s.steps.map((line, j) => ({
			line,
			out: read(`${j}.out`),
			err: read(`${j}.err`),
			code: Number(read(`${j}.code`).trim())
		}))
	};
}

const only = process.argv[2];
for (const f of readdirSync(join(here, 'scenarios')).sort()) {
	if (!f.endsWith('.json')) continue;
	const s = JSON.parse(readFileSync(join(here, 'scenarios', f), 'utf8')) as Scenario;
	if (only && s.id !== only) continue;
	const out = record(s);
	writeFileSync(join(here, 'out', `${s.id}.json`), JSON.stringify(out, null, '\t') + '\n');
	console.log(`記録した: ${s.id}（${s.steps.length} 行）`);
}
