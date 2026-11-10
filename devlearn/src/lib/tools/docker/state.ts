// 模擬の docker の状態（docs/tools.md 3.3）。イメージ・コンテナ・ボリューム・網・作る途中の物の使い回し。
// 本物の ID は乱数や作った時刻から決まるので、模擬は打った順の番号と作り物の時計から決める（比べるときは揃える）。
import { emptyFs, mkdir, writeFile, type Fs } from '../fs.ts';
import { sha256Hex } from '../sha256.ts';
import { utf8 } from '../sha1.ts';

export type HistoryRow = { createdBy: string; size: number; created: number; comment: string };

export type ImageConfig = {
	cmd: string[];
	env: Readonly<Record<string, string>>;
	workdir: string;
	exposed: readonly string[];
};

export type Image = {
	id: string; // sha256 の 64 字
	tags: readonly string[]; // 'busybox:1.37' など
	created: number;
	size: number;
	fs: Fs; // 中のファイル
	config: ImageConfig;
	history: readonly HistoryRow[]; // 古い順
	cacheKey?: string; // 作り直しで使い回すときの鍵
};

export type Running =
	| { kind: 'sleep'; until: number }
	| { kind: 'httpd'; port: number; dir: string }
	| { kind: 'nc'; port: number }
	| { kind: 'forever' };

export type Mount = { volume: string; at: string };
export type Publish = { host: number; port: number };

export type Container = {
	id: string;
	name: string;
	image: string; // 打った名前（busybox:1.37）
	imageId: string;
	cmd: string[];
	env: Readonly<Record<string, string>>;
	created: number;
	started?: number;
	finished?: number;
	status: 'created' | 'running' | 'exited';
	exitCode: number;
	running?: Running;
	fs: Fs;
	mounts: readonly Mount[];
	publish: readonly Publish[];
	networks: readonly string[]; // 網の名前
	ips: Readonly<Record<string, string>>; // 網の名前 → 住所（動いている間だけ）
	logs: string;
	autoRemove: boolean;
	project?: { name: string; service: string };
};

export type Volume = { name: string; fs: Fs; created: number };
export type Network = {
	id: string;
	name: string;
	driver: string;
	subnet: number;
	builtin: boolean;
};

export type DockerExt = {
	images: readonly Image[];
	containers: readonly Container[];
	volumes: readonly Volume[];
	networks: readonly Network[];
	seq: number; // ID を作るための通し番号
	seen: Readonly<Record<string, string>>; // build で送ったことのあるファイル（道 → 中身）
	cache: Readonly<Record<string, number>>; // build の層の使い回し（鍵 → 作った時刻）
};

export const newId = (ext: DockerExt, kind: string, now: number): [string, DockerExt] => [
	sha256Hex(utf8(`devlearn docker ${kind} ${ext.seq} ${now}`)),
	{ ...ext, seq: ext.seq + 1 }
];

// 取ってこられるイメージ（作り物の登録所）。値は本物の busybox:1.37 の物（2026-11-10 の記録）
export const BUSYBOX = {
	repo: 'busybox',
	tags: ['1.37', 'latest'],
	idHead: '30ecbe150909',
	layer: '68fe9bff2ad4',
	digest: 'sha256:a7dbc319b1438115a207e11930dc4bb3e643dcb3ec0bdd694bb36cd8fad289ec',
	created: Date.UTC(2024, 8, 26, 21, 31, 42) / 1000,
	size: 4_421_000,
	comment: 'BusyBox 1.37.0 (glibc), Debian 13'
};

// busybox の中の道具（applet）は /bin にある。模擬は /bin を空にしておき、命令の表（busybox.ts）から探す
export function busyboxFs(): Fs {
	let fs = emptyFs();
	for (const d of [
		'/bin',
		'/dev',
		'/etc',
		'/home',
		'/proc',
		'/root',
		'/sys',
		'/tmp',
		'/usr',
		'/usr/sbin',
		'/var',
		'/var/www'
	])
		fs = mkdir(fs, d, BUSYBOX.created, d === '/tmp' ? 0o1777 : d === '/root' ? 0o700 : 0o755);
	fs = writeFile(
		fs,
		'/etc/passwd',
		'root:x:0:0:root:/root:/bin/sh\nnobody:x:65534:65534:nobody:/home:/bin/false\n',
		BUSYBOX.created,
		0o644
	);
	fs = writeFile(fs, '/etc/group', 'root:x:0:\nnogroup:x:65534:\n', BUSYBOX.created, 0o644);
	return fs;
}

export function busyboxImage(tag: string): Image {
	const id = BUSYBOX.idHead + sha256Hex(utf8('devlearn busybox 1.37')).slice(12);
	return {
		id,
		tags: [`busybox:${tag}`],
		created: BUSYBOX.created,
		size: BUSYBOX.size,
		fs: busyboxFs(),
		config: {
			cmd: ['sh'],
			env: { PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' },
			workdir: '/',
			exposed: []
		},
		history: [
			{ createdBy: BUSYBOX.comment, size: BUSYBOX.size, created: BUSYBOX.created, comment: '' }
		]
	};
}

// 網の初め：bridge・host・none（本物は機械ごとの乱数の ID）
export function initialNetworks(): Network[] {
	return [
		{
			id: sha256Hex(utf8('devlearn net bridge')),
			name: 'bridge',
			driver: 'bridge',
			subnet: 17,
			builtin: true
		},
		{
			id: sha256Hex(utf8('devlearn net host')),
			name: 'host',
			driver: 'host',
			subnet: 0,
			builtin: true
		},
		{
			id: sha256Hex(utf8('devlearn net none')),
			name: 'none',
			driver: 'null',
			subnet: 0,
			builtin: true
		}
	];
}

export function emptyDocker(images: readonly string[] = []): DockerExt {
	const imgs: Image[] = [];
	for (const ref of images) {
		const [repo, tag = 'latest'] = ref.split(':');
		if (repo !== 'busybox') continue;
		const have = imgs.find((i) => i.tags.some((t) => t.startsWith('busybox:')));
		if (have) imgs[imgs.indexOf(have)] = { ...have, tags: [...have.tags, `busybox:${tag}`] };
		else imgs.push(busyboxImage(tag));
	}
	return {
		images: imgs,
		containers: [],
		volumes: [],
		networks: initialNetworks(),
		seq: 0,
		seen: {},
		cache: {}
	};
}

// 名前の無いコンテナに付ける名前（本物は形容詞と人の名前。人の名前は使わないので、港町の物の名前にする）
const ADJ = [
	'quiet',
	'brave',
	'calm',
	'eager',
	'gentle',
	'happy',
	'keen',
	'lucky',
	'merry',
	'proud',
	'swift',
	'tidy'
];
const NOUN = [
	'harbor',
	'lantern',
	'anchor',
	'gull',
	'pier',
	'tide',
	'buoy',
	'ferry',
	'reef',
	'dock',
	'mast',
	'sail'
];
export function autoName(id: string, taken: (n: string) => boolean): string {
	let n = parseInt(id.slice(0, 8), 16);
	for (;;) {
		const name = `${ADJ[n % ADJ.length]}_${NOUN[Math.floor(n / ADJ.length) % NOUN.length]}`;
		if (!taken(name)) return name;
		n++;
	}
}

// 本物の docker の「どれだけ前」（go-units の HumanDuration）
export function humanDuration(sec: number): string {
	if (sec < 1) return 'Less than a second';
	if (sec === 1) return '1 second';
	if (sec < 60) return `${sec} seconds`;
	const min = Math.floor(sec / 60);
	if (min === 1) return 'About a minute';
	if (min < 60) return `${min} minutes`;
	const hours = Math.floor(sec / 3600 + 0.5);
	if (hours === 1) return 'About an hour';
	if (hours < 48) return `${hours} hours`;
	if (hours < 24 * 7 * 2) return `${Math.floor(hours / 24)} days`;
	if (hours < 24 * 30 * 2) return `${Math.floor(hours / 24 / 7)} weeks`;
	if (hours < 24 * 365 * 2) return `${Math.floor(hours / 24 / 30)} months`;
	return `${Math.floor(sec / 3600 / 24 / 365)} years`;
}

// 大きさ（go-units の HumanSizeWithPrecision(…, 3)。10 進）
export function humanSize(n: number): string {
	const units = ['B', 'kB', 'MB', 'GB', 'TB'];
	let v = n;
	let i = 0;
	while (v >= 1000 && i < units.length - 1) {
		v /= 1000;
		i++;
	}
	return `${Number(v.toPrecision(3))}${units[i]}`;
}

// 長い文字を切る（docker の Ellipsis。最後の 1 字を … にする）
export function ellipsis(s: string, max: number): string {
	const r = [...s];
	return r.length <= max ? s : r.slice(0, max - 1).join('') + '…';
}

// docker の表（text/tabwriter：最小の幅 10、間 3）。最後の列は埋めない
export function tabTable(rows: string[][]): string {
	const n = Math.max(...rows.map((r) => r.length));
	const widths = Array.from({ length: n }, (_, c) =>
		Math.max(10, ...rows.map((r) => (c < r.length - 1 ? [...(r[c] ?? '')].length + 3 : 0)))
	);
	return (
		rows
			.map((r) =>
				r
					.map((cell, c) =>
						c < r.length - 1 ? cell + ' '.repeat(widths[c] - [...cell].length) : cell
					)
					.join('')
			)
			.join('\n') + '\n'
	);
}
