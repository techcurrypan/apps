// 本物の出力を記録する（docs/tools.md 2 章）。GitHub Actions の Ubuntu の上でだけ走らせる。
//   node devlearn/tools-real/record.ts [場面の ID]
// 場面（scenarios/*.json）ごとに、利用者 learner の空の作業場所で本物の命令を 1 行ずつ打ち、
// 標準出力・標準エラー・終了コードを recorded/<場面>.json に書く。
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Scenario = {
	id: string;
	tool: string;
	lesson: string;
	world?: string;
	note?: string;
	steps: string[];
};

// 場面の前に置く物（worlds/<名前>.json）。模擬も同じ物を読んで同じ世界を作る（src/lib/tools/shell/worlds.ts）
type World = {
	dirs?: { path: string; mode: string; owner: string }[];
	files?: { path: string; mode: string; owner: string; data: string }[];
};

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
		coreutils: v('ls --version | head -1'),
		grep: v('grep --version | head -1'),
		faketime: v("dpkg-query -W -f '${Version}' faketime")
	};
}

// 1 行ずつ、別の bash で打つ。今いる場所・変数・前の行の終了コードは、ファイルに書いて次の行へ渡す
// （端末で続けて打ったときと同じに見せる）。標準出力は擬似端末（ttyrun.py）、標準エラーはファイル。
// 時計：その行の時刻から動く作り物の時計（faketime）。その行で変わったファイルの時刻は、行の後でその行の時刻に揃える
// （ファイルの時刻は OS が付けるので faketime では変わらない）。
const SKIP_VARS =
	'GIT_AUTHOR_DATE|GIT_COMMITTER_DATE|OLDPWD|PWD|SHLVL|_|LD_PRELOAD|FAKETIME[A-Z_]*';

function jst(t: number): string {
	const d = new Date((t + 9 * 3600) * 1000);
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

// 世界を root で置く。置いた物の時刻は場面の始まりに揃える
function placeWorld(st: string, w: World): string[] {
	const roots: string[] = [];
	for (const d of w.dirs ?? []) {
		sh(
			`sudo mkdir -p ${d.path} && sudo chown ${d.owner}:${d.owner} ${d.path} && sudo chmod ${d.mode} ${d.path}`
		);
		if (!d.path.startsWith(HOME)) roots.push(d.path);
	}
	(w.files ?? []).forEach((f, i) => {
		writeFileSync(`${st}/world-${i}`, f.data);
		sh(
			`sudo cp ${st}/world-${i} ${f.path} && sudo chown ${f.owner}:${f.owner} ${f.path} && sudo chmod ${f.mode} ${f.path}`
		);
	});
	const all = [...(w.dirs ?? []), ...(w.files ?? [])].map((x) => x.path);
	if (all.length > 0) sh(`sudo touch -h -d @${BASE} ${all.join(' ')}`);
	return roots;
}

function record(s: Scenario) {
	const st = `/tmp/rec/${s.id}`;
	rmSync(st, { recursive: true, force: true });
	mkdirSync(st, { recursive: true });
	chmodSync(st, 0o777);
	// 家は空から（.bashrc なども置かない。模擬の世界と同じ）。CI の機械が家に付けている ACL（ls -l の「+」）も外す
	sh(
		`sudo find ${HOME} -mindepth 1 -delete && sudo setfacl -b ${HOME} && sudo -u learner mkdir -p ${WORK}`
	);
	writeFileSync(`${st}/gitconfig`, GITCONFIG);
	sh(`sudo -u learner cp ${st}/gitconfig ${HOME}/.gitconfig`);
	const world: World = s.world
		? (JSON.parse(readFileSync(join(here, 'worlds', `${s.world}.json`), 'utf8')) as World)
		: {};
	const extraRoots = placeWorld(st, world);
	sh(`sudo -u learner touch -h -d @${BASE} ${HOME}/.gitconfig ${WORK} ${HOME}`);
	for (const [f, v] of [
		['cwd', WORK],
		['env', ''],
		['code', '0']
	]) {
		writeFileSync(`${st}/${f}`, v);
		chmodSync(`${st}/${f}`, 0o666);
	}

	const steps = s.steps.map((line, j) => {
		writeFileSync(`${st}/${j}.cmd`, line);
		const t = BASE + 60 * j;
		const script = [
			`__base=" $(compgen -v | tr '\\n' ' ') "`,
			`cd "$(cat ${st}/cwd)"`,
			`. ${st}/env`,
			`export GIT_AUTHOR_DATE="${t} +0900" GIT_COMMITTER_DATE="${t} +0900"`,
			`IFS= read -r -d '' __cmd < ${st}/${j}.cmd`,
			// 印の時刻はこの行の作り物の時刻。前の行までに揃えた物はこれより古く、この行で変わった物は本物の今の時刻なので新しい
			// （印を本物の今の時刻にすると、OS の時刻の粗さで、同じ時刻の物を取りこぼす）
			`touch -d @${t} ${st}/${j}.mark`,
			`(exit $(cat ${st}/code))`,
			`eval "$__cmd" 2> ${st}/${j}.err`,
			`echo $? > ${st}/code`,
			`cp ${st}/code ${st}/${j}.code`,
			`pwd > ${st}/cwd`,
			`{ for __v in $(compgen -v); do case "$__base" in *" $__v "*) ;; *) declare -p "$__v" ;; esac; done; export -p; } 2> /dev/null | grep -v -E '^declare -[a-zA-Z]*r' | grep -v -E '^declare -[-a-zA-Z]* (${SKIP_VARS}|__v|__cmd|__base)(=|$)' > ${st}/env`
		].join(NL);
		const r = spawnSync(
			'sudo',
			[
				'-u',
				'learner',
				'env',
				'-i',
				...ENV,
				'faketime',
				'-f',
				`@${jst(t)}`,
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
		// その行で変わった物の時刻を、その行の時刻に揃える（root の物もあるので root で）
		sh(
			`sudo find ${[HOME, ...extraRoots].join(' ')} -newer ${st}/${j}.mark -exec touch -h -d @${t} {} + 2> /dev/null || true`
		);
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
	// 置いた世界を片付ける（家の外の物）
	if (extraRoots.length > 0) sh(`sudo rm -rf ${extraRoots.filter((r) => r !== '/srv').join(' ')}`);
	return {
		id: s.id,
		tool: s.tool,
		lesson: s.lesson,
		...(s.world ? { world: s.world } : {}),
		recordedOn: versions(),
		steps
	};
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
