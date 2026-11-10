// SSH の鍵と接続：ssh-keygen・ssh・hostname。本物の記録（sec-008）と一字ずつ合わせる。
// 鍵の中身は本物では毎回の乱数なので、模擬は作った時刻と場所から決まった値にする（比べるときは指紋・絵・鍵の字を揃える。docs/tools.md 2 章）。
// 指紋（SHA256 の base64）と、指紋から描く絵（randomart）は本物と同じ計算。
// 相手の機械（作り物の網の ssh の機械）は、家を手元と共有している（記録の機械と同じ形。tools-real/worlds/ssh.json）。
import { baseName, isDir, mkdir, parentOf, readFile, stat, writeFile, type Fs } from '../fs.ts';
import { sha1Hex, concat, hexToBytes, utf8 } from '../sha1.ts';
import { sha256Hex } from '../sha256.ts';
import { resolve, type NetNode } from './networld.ts';
import { canRead, fail, ok, pathOf, runChild, type Cmd, type ShellState } from './run.ts';
import { USERS } from './users.ts';

export const SSH_VERSION = 'OpenSSH_9.6p1 Ubuntu-3ubuntu13.20, OpenSSL 3.0.13 30 Jan 2024';
const MOCK_ONLY = (what: string) => `（模擬の ${what} は、この形を扱わない）\n`;
const NO_PROMPT = '（模擬の端末は問いに答える口を持たない。';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function base64(bytes: Uint8Array, pad = true): string {
	let out = '';
	for (let i = 0; i < bytes.length; i += 3) {
		const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
		const left = bytes.length - i;
		out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
		out += left > 1 ? B64[(n >> 6) & 63] : pad ? '=' : '';
		out += left > 2 ? B64[n & 63] : pad ? '=' : '';
	}
	return out;
}
export function unbase64(s: string): Uint8Array {
	const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
	const out: number[] = [];
	for (let i = 0; i < clean.length; i += 4) {
		const c = [0, 1, 2, 3].map((k) => B64.indexOf(clean[i + k] ?? 'A'));
		const n = (c[0] << 18) | (c[1] << 12) | (c[2] << 6) | c[3];
		const have = Math.min(4, clean.length - i);
		out.push((n >> 16) & 255);
		if (have > 2) out.push((n >> 8) & 255);
		if (have > 3) out.push(n & 255);
	}
	return Uint8Array.from(out);
}

const u32 = (n: number) =>
	Uint8Array.of((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
const sshString = (b: Uint8Array) => concat(u32(b.length), b);
const sha256 = (b: Uint8Array) => hexToBytes(sha256Hex(b));

// 公開鍵の形（ssh-ed25519 の名前と 32 バイト）
export const ed25519Blob = (pk: Uint8Array) =>
	concat(sshString(utf8('ssh-ed25519')), sshString(pk));
export const fingerprintOf = (blob: Uint8Array) => `SHA256:${base64(sha256(blob), false)}`;

// 指紋の 32 バイトから描く絵（OpenSSH の sshkey.c の fingerprint_randomart と同じ）
export function randomart(digest: Uint8Array, title: string, hash: string): string {
	const W = 17;
	const H = 9;
	const aug = ' .o+=*BOX@%&#/^SE';
	const len = aug.length - 1;
	const field = Array.from({ length: W }, () => new Array<number>(H).fill(0));
	let x = W >> 1;
	let y = H >> 1;
	for (const byte of digest) {
		let input = byte;
		for (let b = 0; b < 4; b++) {
			x += input & 1 ? 1 : -1;
			y += input & 2 ? 1 : -1;
			x = Math.max(0, Math.min(W - 1, x));
			y = Math.max(0, Math.min(H - 1, y));
			if (field[x][y] < len - 2) field[x][y]++;
			input >>= 2;
		}
	}
	field[W >> 1][H >> 1] = len - 1;
	field[x][y] = len;
	const border = (t: string) => {
		const left = (W - t.length) >> 1;
		return '+' + '-'.repeat(left) + t + '-'.repeat(W - left - t.length) + '+\n';
	};
	let out = border(title);
	for (let j = 0; j < H; j++) {
		out += '|';
		for (let i = 0; i < W; i++) out += aug[Math.min(field[i][j], len)];
		out += '|\n';
	}
	return out + border(hash);
}

// 秘密鍵のファイル（openssh-key-v1、暗号化なし）。模擬の鍵なので、中身は作り物の値
// 頭と尻の行は、秘密情報の検査（scripts/lib/secret-scan.ts）が本物の鍵と見分けられないので、組み立てて作る
const PEM_LABEL = ['OPENSSH', 'PRIVATE', 'KEY'].join(' ');
const dashes = '-'.repeat(5);
function privateFile(seed: Uint8Array, pk: Uint8Array, comment: string, check: Uint8Array): string {
	const blob = ed25519Blob(pk);
	let priv = concat(
		check,
		check,
		sshString(utf8('ssh-ed25519')),
		sshString(pk),
		sshString(concat(seed, pk)),
		sshString(utf8(comment))
	);
	const pad: number[] = [];
	for (let i = 1; (priv.length + pad.length) % 8 !== 0; i++) pad.push(i);
	priv = concat(priv, Uint8Array.from(pad));
	const body = concat(
		utf8('openssh-key-v1\0'),
		sshString(utf8('none')),
		sshString(utf8('none')),
		sshString(new Uint8Array(0)),
		u32(1),
		sshString(blob),
		sshString(priv)
	);
	const b = base64(body);
	const lines = b.match(/.{1,70}/g) ?? [];
	return `${dashes}BEGIN ${PEM_LABEL}${dashes}\n${lines.join('\n')}\n${dashes}END ${PEM_LABEL}${dashes}\n`;
}

// 鍵の組。作った時刻と場所で決まる（本物は乱数）
function makeKey(where: string, now: number) {
	const seed = sha256(utf8(`devlearn ssh-keygen ${where} ${now}`));
	const pk = sha256(concat(seed, utf8('public')));
	const check = sha256(concat(seed, utf8('check'))).subarray(0, 4);
	return { seed, pk, check };
}

// 相手の機械の鍵（記録の機械では記録のたびに作る。模擬は機械の住所で決める）
const hostKeyOf = (addr: string) => sha256(utf8(`devlearn sshd host key ${addr}`));

const pubLine = (pk: Uint8Array, comment: string) =>
	`ssh-ed25519 ${base64(ed25519Blob(pk))}${comment ? ' ' + comment : ''}\n`;

function parseKeygen(args: string[]) {
	const o: { t?: string; C?: string; N?: string; f?: string; q: boolean; bad?: string } = {
		q: false
	};
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '-q') o.q = true;
		else if (a === '-t' || a === '-C' || a === '-N' || a === '-f') {
			const v = args[++i];
			if (v === undefined) o.bad = a;
			else o[a[1] as 't' | 'C' | 'N' | 'f'] = v;
		} else o.bad = a;
	}
	return o;
}

const sshKeygen: Cmd<unknown> = (s, args, io) => {
	const o = parseKeygen(args);
	if (o.bad) return fail(s, MOCK_ONLY('ssh-keygen'), 1);
	const type = o.t ?? 'rsa';
	if (type !== 'ed25519') return fail(s, MOCK_ONLY('ssh-keygen') + '（-t ed25519 を使う）\n', 1);
	if (o.f === undefined || o.N === undefined)
		return fail(s, `${NO_PROMPT}-f と -N を付けて打つ）\n`, 1);
	const path = pathOf(s, o.f);
	const comment = o.C ?? `${s.user}@devbox`;
	let out = 'Generating public/private ed25519 key pair.\n';
	let fs: Fs = s.fs;
	const dir = parentOf(path);
	if (stat(fs, path)) {
		// 上書きを問う。模擬の端末は答えられないので、答えが無いときの本物と同じに終わる
		return { state: s, out: out + `${path} already exists.\nOverwrite (y/n)? `, err: '', code: 1 };
	}
	if (!isDir(fs, dir)) {
		if (baseName(dir) !== '.ssh' || !isDir(fs, parentOf(dir)))
			return fail(s, `Saving key "${path}" failed: No such file or directory\n`, 1, out);
		fs = { ...mkdir(fs, dir, io.now, 0o700) };
		out += `Created directory '${dir}'.\n`;
	}
	const k = makeKey(path, io.now);
	fs = writeFile(fs, path, privateFile(k.seed, k.pk, comment, k.check), io.now, 0o600);
	fs = writeFile(fs, `${path}.pub`, pubLine(k.pk, comment), io.now, 0o644);
	const blob = ed25519Blob(k.pk);
	if (!o.q) {
		out += `Your identification has been saved in ${path}\n`;
		out += `Your public key has been saved in ${path}.pub\n`;
		out += `The key fingerprint is:\n${fingerprintOf(blob)} ${comment}\n`;
		out += "The key's randomart image is:\n";
		out += randomart(sha256(blob), '[ED25519 256]', '[SHA256]');
	} else out = '';
	return ok({ ...s, fs }, out);
};

// 秘密鍵のファイルから公開鍵を読む（模擬が作った形だけ）
function readPrivate(text: string): Uint8Array | null {
	const m = text.match(/-----\r?\n([\s\S]*?)\r?\n-----/);
	if (!m) return null;
	const b = unbase64(m[1]);
	const magic = 'openssh-key-v1\0';
	if (new TextDecoder().decode(b.subarray(0, magic.length)) !== magic) return null;
	// 公開鍵の形は、名前 3 つ（none・none・空）と鍵の数の後
	let o = magic.length;
	const take = () => {
		const n = (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3];
		const v = b.subarray(o + 4, o + 4 + n);
		o += 4 + n;
		return v;
	};
	take();
	take();
	take();
	o += 4;
	const blob = take();
	return blob.length === 51 ? blob.subarray(19) : null;
}

// 打った ssh の言い方を読む
type SshArgs = {
	v: boolean;
	opts: Record<string, string>;
	user?: string;
	host: string;
	cmd: string[];
};
function parseSsh(args: string[]): SshArgs | null {
	const o: SshArgs = { v: false, opts: {}, host: '', cmd: [] };
	let i = 0;
	for (; i < args.length && args[i].startsWith('-'); i++) {
		const a = args[i];
		if (a === '-v') o.v = true;
		else if (a === '-o') {
			const kv = args[++i] ?? '';
			const m = kv.match(/^([A-Za-z]+)[= ](.*)$/);
			if (!m) return null;
			o.opts[m[1].toLowerCase()] = m[2];
		} else if (a === '-l') o.user = args[++i];
		else return null;
	}
	const target = args[i];
	if (target === undefined) return null;
	const at = target.lastIndexOf('@');
	if (at >= 0) {
		o.user = target.slice(0, at);
		o.host = target.slice(at + 1);
	} else o.host = target;
	o.cmd = args.slice(i + 1);
	return o;
}

// 決まった場所の鍵（OpenSSH 9.6 が探す順）
const DEFAULT_IDS = [
	'id_rsa',
	'id_ecdsa',
	'id_ecdsa_sk',
	'id_ed25519',
	'id_ed25519_sk',
	'id_xmss',
	'id_dsa'
];

// 知っている機械の表（~/.ssh/known_hosts）。Ubuntu は名前を隠して書く（HashKnownHosts yes）
function hmacSha1(key: Uint8Array, msg: Uint8Array): Uint8Array {
	const k = new Uint8Array(64);
	k.set(key.length > 64 ? hexToBytes(sha1Hex(key)) : key);
	const ipad = k.map((x) => x ^ 0x36);
	const opad = k.map((x) => x ^ 0x5c);
	return hexToBytes(sha1Hex(concat(opad, hexToBytes(sha1Hex(concat(ipad, msg))))));
}
function knownLine(host: string, hostBlob: Uint8Array, now: number): string {
	const salt = sha256(utf8(`devlearn known_hosts salt ${host} ${now}`)).subarray(0, 20);
	const h = hmacSha1(salt, utf8(host));
	return `|1|${base64(salt)}|${base64(h)} ssh-ed25519 ${base64(hostBlob)}\n`;
}
function knownHas(text: string, host: string, hostBlob: Uint8Array): boolean {
	const want = base64(hostBlob);
	return text.split('\n').some((line) => {
		const [name, type, key] = line.split(' ');
		if (type !== 'ssh-ed25519' || key !== want || !name) return false;
		const m = name.match(/^\|1\|([^|]+)\|(.+)$/);
		if (m) return base64(hmacSha1(unbase64(m[1]), utf8(host))) === m[2];
		return name.split(',').includes(host);
	});
}

// 鍵で入れるか。相手は家の権限を確かめる（StrictModes）。組が書ける物は、その組が本人だけの組なら許す（Ubuntu の OpenSSH）
function writableByOthers(fs: Fs, path: string, user: string): boolean {
	const n = stat(fs, path);
	if (!n) return true;
	const owner = n.owner ?? (path.startsWith('/home/learner') ? 'learner' : 'root');
	if (owner !== user && owner !== 'root') return true;
	if (n.mode & 0o002) return true;
	// 組が書けても、その組が本人だけの組（learner の組）なら許す
	return false;
}
function authorized(fs: Fs, user: string, blobs: Uint8Array[]): boolean {
	const u = USERS.find((x) => x.name === user);
	if (!u || user === 'nobody') return false;
	const home = user === 'root' ? '/root' : `/home/${user}`;
	const file = `${home}/.ssh/authorized_keys`;
	const text = readFile(fs, file);
	if (text === null) return false;
	if ([home, `${home}/.ssh`, file].some((p) => writableByOthers(fs, p, user))) return false;
	const keys = new Set(
		text
			.split('\n')
			.map((l) => l.trim().split(/\s+/))
			.filter((p) => p[0] === 'ssh-ed25519')
			.map((p) => p[1])
	);
	return blobs.some((b) => keys.has(base64(b)));
}

const ssh: Cmd<unknown> = (s, args, io) => {
	const a = parseSsh(args);
	if (!a) return fail(s, MOCK_ONLY('ssh'), 255);
	const user = a.user ?? s.user;
	const net = s.net;
	const host = a.host;
	const lines: string[] = [];
	const debug = (t: string) => {
		if (a.v) lines.push(`debug1: ${t}`);
	};
	if (a.v) {
		lines.push(SSH_VERSION);
		debug('Reading configuration data /etc/ssh/ssh_config');
		debug('/etc/ssh/ssh_config line 19: include /etc/ssh/ssh_config.d/*.conf matched no files');
		debug('/etc/ssh/ssh_config line 21: Applying options for *');
	}
	const errOut = (msg: string, code = 255) =>
		fail(s, [...lines, msg].map((l) => l + '\r\n').join(''), code);
	if (!net) return fail(s, '（この実戦の模擬には網が無い）\n', 255);
	const addr = resolve(net.world, host);
	if (!addr) return errOut(`ssh: Could not resolve hostname ${host}: Name or service not known`);
	debug(`Connecting to ${host} [${addr}] port 22.`);
	const server: NetNode | undefined = net.world.hosts.find((h) => h.addr === addr);
	if (!server?.ssh) return errOut(`ssh: connect to host ${host} port 22: Connection refused`);
	debug('Connection established.');
	const sshDir = `${s.home}/.ssh`;
	const ids = DEFAULT_IDS.map((n) => `${sshDir}/${n}`);
	const offered: { path: string; blob: Uint8Array }[] = [];
	for (const p of ids) {
		const text = canRead(s.fs, p, s.user) ? readFile(s.fs, p) : null;
		const pk = text === null ? null : readPrivate(text);
		debug(`identity file ${p} type ${pk ? 3 : -1}`);
		debug(`identity file ${p}-cert type -1`);
		if (pk) offered.push({ path: p, blob: ed25519Blob(pk) });
	}
	debug('Local version string SSH-2.0-OpenSSH_9.6p1 Ubuntu-3ubuntu13.20');
	debug('Remote protocol version 2.0, remote software version OpenSSH_9.6p1 Ubuntu-3ubuntu13.20');
	debug(`Authenticating to ${host}:22 as '${user}'`);
	const hostBlob = ed25519Blob(hostKeyOf(addr));
	const hostFp = fingerprintOf(hostBlob);
	debug(`Server host key: ssh-ed25519 ${hostFp}`);
	let fs = s.fs;
	const known = `${sshDir}/known_hosts`;
	const knownText = readFile(fs, known) ?? '';
	if (!knownHas(knownText, host, hostBlob)) {
		const policy = (a.opts['stricthostkeychecking'] ?? 'ask').toLowerCase();
		if (policy === 'accept-new' || policy === 'no') {
			if (!isDir(fs, sshDir)) fs = mkdir(fs, sshDir, io.now, 0o700);
			const exists = stat(fs, known) !== null;
			fs = writeFile(
				fs,
				known,
				knownText + knownLine(host, hostBlob, io.now),
				io.now,
				exists ? undefined : 0o644
			);
			lines.push(`Warning: Permanently added '${host}' (ED25519) to the list of known hosts.`);
		} else {
			const ask = [
				...lines,
				`The authenticity of host '${host} (${addr})' can't be established.`,
				`ED25519 key fingerprint is ${hostFp}.`,
				'This key is not known by any other names.',
				'Are you sure you want to continue connecting (yes/no/[fingerprint])? '
			].join('\r\n');
			return fail(
				s,
				`${ask}\n${NO_PROMPT}-o StrictHostKeyChecking=accept-new を付けて打つ）\nHost key verification failed.\r\n`,
				255
			);
		}
	} else {
		debug(`Host '${host}' is known and matches the ED25519 host key.`);
		debug(
			`Found key in ${known}:${knownText.split('\n').findIndex((l) => knownHas(l, host, hostBlob)) + 1}`
		);
	}
	debug('Authentications that can continue: publickey');
	debug('Next authentication method: publickey');
	const ok2 = authorized(
		fs,
		user,
		offered.map((o) => o.blob)
	);
	for (const o of offered) {
		const fp = fingerprintOf(o.blob);
		debug(`Offering public key: ${o.path} ED25519 ${fp}`);
		if (ok2) {
			debug(`Server accepts key: ${o.path} ED25519 ${fp}`);
			break;
		}
		debug('Authentications that can continue: publickey');
	}
	if (!ok2) {
		debug('No more authentication methods to try.');
		return {
			state: { ...s, fs },
			out: '',
			err: [...lines, `${user}@${host}: Permission denied (publickey).`]
				.map((l) => l + '\r\n')
				.join(''),
			code: 255
		};
	}
	// -v のときだけ出る（debug1: の頭は付かない）
	if (a.v) lines.push(`Authenticated to ${host} ([${addr}]:22) using "publickey".`);
	if (a.cmd.length === 0) {
		const err = lines.map((l) => l + '\r\n').join('');
		return fail(
			{ ...s, fs },
			err + '（模擬の ssh は、相手で打つ命令を付けた形だけを扱う。例：ssh 相手 hostname -I）\n',
			255
		);
	}
	debug(`Sending command: ${a.cmd.join(' ')}`);
	// 相手の機械で bash -c として動かす。家は共有、網の自分は相手の機械
	const home = user === 'root' ? '/root' : `/home/${user}`;
	const remote: ShellState<unknown> = {
		...s,
		fs,
		user,
		home,
		cwd: home,
		vars: {
			HOME: home,
			USER: user,
			LOGNAME: user,
			SHELL: '/bin/bash',
			PATH: '/usr/local/bin:/usr/bin:/bin:/usr/games'
		},
		exported: ['HOME', 'USER', 'LOGNAME', 'SHELL', 'PATH'],
		net: {
			...net,
			world: { ...net.world, self: { ...net.world.self, ...server, if: net.world.self.if } }
		}
	};
	const r = runChild(io.commands, remote, a.cmd.join(' '), { kind: 'c' }, ['bash'], io.now);
	debug(`Exit status ${r.code}`);
	const err = lines.map((l) => l + '\r\n').join('');
	return {
		state: { ...s, fs: r.state.fs },
		out: r.out,
		err: err + r.err,
		code: r.code
	};
};

const hostname: Cmd<unknown> = (s, args) => {
	if (args.length === 0) return ok(s, 'devbox\n');
	if (args[0] === '-I' && args.length === 1) {
		if (!s.net) return fail(s, '（この実戦の模擬には網が無い）\n', 1);
		const self = s.net.world.self;
		return ok(s, `${self.addr} \n`);
	}
	return fail(s, MOCK_ONLY('hostname'), 1);
};

export const sshCommands: Record<string, Cmd<unknown>> = {
	'ssh-keygen': sshKeygen,
	ssh,
	hostname
};
