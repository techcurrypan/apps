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
	net?: Net;
	// 世界の利用者（店の利用者 shop など。家を持たない）
	users?: { name: string; uid: number }[];
	// 場面の前から動いているプロセス。その利用者で、端末から離して（setsid）順に動かす
	procs?: { user: string; cmd: string }[];
	// files で /etc/systemd/system に置いたサービス。置いた後に読み直させ、場面の後に止めて外す
	units?: string[];
};

// 作り物の網（worlds/net.json）。機械ごとに網の名前空間を作り、switch（sw の br0）につなぐ
type Node = {
	ns: string;
	mac: string;
	addr: string;
	far?: string[];
	dns?: boolean;
	web?: boolean;
	ssh?: boolean;
};
type Net = {
	self: Node & { if: string; prefix: number };
	gateway: string;
	routes: { to: string; via: string }[];
	hosts: Node[];
	dns: { server: string; ttl: number; zone: string; records: Record<string, string> };
	listen: { proto: string; addr: string; port: number }[];
	etc: Record<string, string>;
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
		iproute2: v('ip -V'),
		dig: v('dig -v 2>&1'),
		curl: v('curl --version | head -1'),
		ping: v('ping -V'),
		dnsmasq: v('dnsmasq --version | head -1'),
		openssl: v('openssl version'),
		sudo: v('sudo -V | head -1'),
		faketime: v("dpkg-query -W -f '${Version}' faketime"),
		procps: v('ps --version'),
		systemd: v('systemctl --version | head -1'),
		ssh: v('ssh -V 2>&1')
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
	for (const u of w.users ?? []) {
		// 家を持たない利用者（サービスの利用者の形）。同じ番号で作れなければ止める
		sh(
			`getent passwd ${u.name} > /dev/null || sudo useradd -r -u ${u.uid} -U -M -d /nonexistent -s /usr/sbin/nologin ${u.name}`
		);
		const got = sh(`id -u ${u.name}`);
		if (got !== String(u.uid))
			throw new Error(`利用者 ${u.name} の番号が ${got}（${u.uid} のはず）`);
	}
	for (const d of w.dirs ?? []) {
		// 元からある場所（/etc・/opt など）は、場面の後に消さない
		const existed = spawnSync('test', ['-e', d.path]).status === 0;
		sh(
			`sudo mkdir -p ${d.path} && sudo chown ${d.owner}:${d.owner} ${d.path} && sudo chmod ${d.mode} ${d.path}`
		);
		if (!existed && !d.path.startsWith(HOME)) roots.push(d.path);
	}
	(w.files ?? []).forEach((f, i) => {
		writeFileSync(`${st}/world-${i}`, f.data);
		sh(
			`sudo cp ${st}/world-${i} ${f.path} && sudo chown ${f.owner}:${f.owner} ${f.path} && sudo chmod ${f.mode} ${f.path}`
		);
	});
	const all = [...(w.dirs ?? []), ...(w.files ?? [])].map((x) => x.path);
	if (all.length > 0) sh(`sudo touch -h -d @${BASE} ${all.join(' ')}`);
	if ((w.units ?? []).length > 0) sh('sudo systemctl daemon-reload');
	for (const p of w.procs ?? []) {
		// 端末から離し、入出力を閉じて動かす。子を作る物もあるので、1 つごとに待つ
		sh(
			`sudo -u ${p.user} bash -c 'cd / && setsid -f ${p.cmd} < /dev/null > /dev/null 2>&1' && sleep 1`
		);
	}
	return roots;
}

// 世界の後片付け：動かしたプロセスを止め、サービスを止めて外す
function clearWorld(w: World) {
	for (const u of new Set((w.procs ?? []).map((p) => p.user)))
		sh(`sudo pkill -KILL -u ${u} || true; sleep 0.5`);
	for (const unit of w.units ?? []) {
		sh(
			`sudo systemctl stop ${unit} || true; sudo systemctl disable ${unit} 2> /dev/null || true; sudo systemctl reset-failed ${unit} 2> /dev/null || true; sudo rm -f /etc/systemd/system/${unit}`
		);
	}
	if ((w.units ?? []).length > 0) sh('sudo systemctl daemon-reload');
}

const NOW_FILE = '/tmp/rec/now';

// 網を作る。返すのは、learner の命令を網の中で打つための頭（ip netns exec 名前）と、片付け
function placeNet(
	st: string,
	net: Net,
	worldFile: string
): { prefix: string[]; teardown: () => void } {
	const nodes = [net.self, ...net.hosts];
	const all = ['sw', ...nodes.map((n) => n.ns)];
	const x = (ns: string, cmd: string) => sh(`sudo ip netns exec ${ns} ${cmd}`);
	const teardown = () => {
		for (const ns of all)
			sh(`sudo ip netns pids ${ns} 2> /dev/null | xargs -r sudo kill 2> /dev/null || true`);
		sh('sleep 0.5');
		for (const ns of all) sh(`sudo ip netns del ${ns} 2> /dev/null || true`);
		sh(`sudo rm -rf /etc/netns/${net.self.ns}`);
	};
	// 前の場面が途中で止まって残った物があれば、先に片付ける
	teardown();
	const noV6 = (ns: string) =>
		x(ns, 'sysctl -qw net.ipv6.conf.all.disable_ipv6=1 net.ipv6.conf.default.disable_ipv6=1');
	sh('sudo ip netns add sw');
	noV6('sw');
	sh(
		'sudo ip -n sw link add br0 type bridge && sudo ip -n sw link set br0 up && sudo ip -n sw link set lo up'
	);
	for (const n of nodes) {
		sh(`sudo ip netns add ${n.ns}`);
		noV6(n.ns);
		sh(`sudo ip link add eth0 netns ${n.ns} type veth peer name v-${n.ns} netns sw`);
		sh(`sudo ip -n sw link set v-${n.ns} master br0 && sudo ip -n sw link set v-${n.ns} up`);
		sh(`sudo ip -n ${n.ns} link set eth0 address ${n.mac}`);
		sh(`sudo ip -n ${n.ns} addr add ${n.addr}/${net.self.prefix} dev eth0`);
		sh(`sudo ip -n ${n.ns} link set lo up && sudo ip -n ${n.ns} link set eth0 up`);
		if (n.far && n.far.length > 0) {
			sh(`sudo ip -n ${n.ns} link add dummy0 type dummy && sudo ip -n ${n.ns} link set dummy0 up`);
			for (const f of n.far) sh(`sudo ip -n ${n.ns} addr add ${f}/32 dev dummy0`);
		}
	}
	const me = net.self.ns;
	sh(`sudo ip -n ${me} route add default via ${net.gateway}`);
	for (const r of net.routes) sh(`sudo ip -n ${me} route add ${r.to} via ${r.via}`);
	// ping を利用者のまま打てるように。近くの機械の表は、記録の間は「確かめ済み」のまま残す（時間で変わらないように）
	x(me, `sysctl -qw net.ipv4.ping_group_range="0 2147483647"`);
	x(me, 'sysctl -qw net.ipv4.neigh.eth0.base_reachable_time_ms=3600000');
	sh(`sudo mkdir -p /etc/netns/${me}`);
	for (const [name, data] of Object.entries(net.etc)) {
		writeFileSync(`${st}/etc-${name}`, data);
		sh(`sudo cp ${st}/etc-${name} /etc/netns/${me}/${name}`);
	}
	const servers = join(here, 'servers');
	const dns = net.hosts.find((h) => h.dns);
	if (dns) {
		const recs = Object.entries(net.dns.records)
			.map(([k, v]) => `--address=/${k}/${v}`)
			.join(' ');
		x(
			dns.ns,
			`dnsmasq --conf-file=/dev/null --no-resolv --no-hosts --bind-interfaces --listen-address=${dns.addr} --local=/${net.dns.zone}/ --local-ttl=${net.dns.ttl} --pid-file=/tmp/rec/dnsmasq.pid ${recs}`
		);
	}
	const web = net.hosts.find((h) => h.web);
	writeFileSync(NOW_FILE, String(BASE));
	chmodSync(NOW_FILE, 0o666);
	const bg = (ns: string, cmd: string) =>
		spawnSync('bash', ['-c', `sudo ip netns exec ${ns} ${cmd} > /dev/null 2>&1 &`], {
			stdio: 'ignore'
		});
	if (web) bg(web.ns, `python3 -I ${servers}/web.py ${worldFile} ${web.addr} ${NOW_FILE}`);
	bg(me, `python3 -I ${servers}/listen.py ${worldFile}`);
	const ssh = net.hosts.find((h) => h.ssh);
	if (ssh) {
		// SSH の相手。鍵だけで入れる（合言葉では入れない）。家は手元の機械と同じ物を見る（家を共有している教室の形）。
		// 相手の鍵は記録のたびに作る（リポジトリに鍵を置かない。指紋は記録ごとに変わる）
		const d = '/tmp/rec/sshd';
		sh(`sudo rm -rf ${d} && sudo mkdir -p ${d} /run/sshd`);
		sh(`sudo ssh-keygen -q -t ed25519 -N '' -f ${d}/host_ed25519`);
		const conf = [
			'Port 22',
			`ListenAddress ${ssh.addr}`,
			`HostKey ${d}/host_ed25519`,
			'PasswordAuthentication no',
			'KbdInteractiveAuthentication no',
			'UsePAM no',
			'PrintMotd no',
			'PrintLastLog no',
			`PidFile ${d}/sshd.pid`,
			''
		].join(NL);
		writeFileSync(`${st}/sshd_config`, conf);
		sh(`sudo cp ${st}/sshd_config ${d}/sshd_config`);
		bg(ssh.ns, `/usr/sbin/sshd -D -f ${d}/sshd_config -E ${d}/sshd.log`);
	}
	sh('sleep 1');
	return {
		prefix: ['ip', 'netns', 'exec', me, 'sudo'],
		teardown
	};
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
	const worldFile = s.world ? join(here, 'worlds', `${s.world}.json`) : '';
	const net = world.net ? placeNet(st, world.net, worldFile) : null;
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
		writeFileSync(NOW_FILE, String(t));
		const r = spawnSync(
			'sudo',
			[
				...(net ? net.prefix : []),
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
	net?.teardown();
	clearWorld(world);
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
