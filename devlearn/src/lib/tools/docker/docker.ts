// 模擬の docker（Docker 28.0.4・Compose v2.38.2 の言い方）。本物の記録（ctr-001〜009）と一字ずつ合わせる。
// ID・時刻・かかった時間は本物では毎回変わるので、比べるときは揃える（docs/tools.md 2 章）。
import { readFile } from '../fs.ts';
import { shellCommands } from '../shell/commands.ts';
import { fail, ok, pathOf, type Cmd, type Commands, type ShellState } from '../shell/run.ts';
import { dockerBuild } from './build.ts';
import { httpdFile, NOT_FOUND } from './busybox.ts';
import { compose } from './compose.ts';
import {
	commandText,
	createContainer,
	dropContainer,
	findContainer,
	goQuote,
	portsText,
	putContainer,
	refresh,
	runInside,
	startContainer,
	stopContainer
} from './engine.ts';
import {
	BUSYBOX,
	busyboxImage,
	ellipsis,
	humanDuration,
	humanSize,
	newId,
	tabTable,
	type Container,
	type DockerExt,
	type Image,
	type Mount,
	type Publish
} from './state.ts';

type S = ShellState<DockerExt>;
type DCmd = Cmd<DockerExt>;
type Res = { state: S; out: string; err: string; code: number };

const RUN_HELP = "\n\nRun 'docker run --help' for more information\n";
const withExt = (s: S, ext: DockerExt): S => ({ ...s, ext });
const MOCK = (what: string) => `（模擬の docker ${what} は、この形を扱わない）\n`;

export const ago = (now: number, t: number) => `${humanDuration(now - t)} ago`;

export function normalizeRef(ref: string): string {
	return ref.includes(':') ? ref : `${ref}:latest`;
}
export const imageByRef = (ext: DockerExt, ref: string): Image | undefined => {
	const r = normalizeRef(ref);
	return ext.images.find(
		(i) => i.tags.includes(r) || (ref.length >= 4 && i.id.startsWith(ref.replace(/^sha256:/, '')))
	);
};

// 登録所から取る。取った言い方は標準エラーへ（端末ではない所に出したときの形。記録と同じ）
export function pull(ext: DockerExt, ref: string): { ext: DockerExt; err: string; error?: string } {
	const r = normalizeRef(ref);
	const [repo, tag] = r.split(':');
	if (repo !== BUSYBOX.repo)
		return {
			ext,
			err: '',
			error: `pull access denied for ${repo}, repository does not exist or may require 'docker login': denied: requested access to the resource is denied`
		};
	if (!BUSYBOX.tags.includes(tag))
		return {
			ext,
			err: '',
			error: `manifest for ${r} not found: manifest unknown: manifest unknown`
		};
	const have = ext.images.find((i) => i.id.startsWith(BUSYBOX.idHead));
	const images = have
		? ext.images.map((i) => (i === have ? { ...i, tags: [...i.tags, r] } : i))
		: [...ext.images, busyboxImage(tag)];
	const err = have
		? `${tag}: Pulling from library/${repo}\nDigest: ${BUSYBOX.digest}\nStatus: Downloaded newer image for ${r}\n`
		: `${tag}: Pulling from library/${repo}\n${BUSYBOX.layer}: Pulling fs layer\n${BUSYBOX.layer}: Verifying Checksum\n${BUSYBOX.layer}: Download complete\n${BUSYBOX.layer}: Pull complete\nDigest: ${BUSYBOX.digest}\nStatus: Downloaded newer image for ${r}\n`;
	return { ext: { ...ext, images }, err };
}

function parseEnvFile(text: string): Record<string, string> {
	const env: Record<string, string> = {};
	for (const line of text.split('\n')) {
		const t = line.trim();
		if (t === '' || t.startsWith('#')) continue;
		const i = t.indexOf('=');
		if (i < 0) env[t] = '';
		else env[t.slice(0, i)] = t.slice(i + 1);
	}
	return env;
}

const NAME_OK = /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/;

function run(s: S, args: string[], now: number): Res {
	let ext = s.ext;
	const o = {
		rm: false,
		d: false,
		name: undefined as string | undefined,
		env: {} as Record<string, string>,
		publish: [] as Publish[],
		mounts: [] as Mount[],
		network: 'bridge'
	};
	let i = 0;
	for (; i < args.length && args[i].startsWith('-'); i++) {
		const a = args[i];
		const v = () => args[++i] ?? '';
		if (a === '--rm') o.rm = true;
		else if (a === '-d' || a === '--detach') o.d = true;
		else if (a === '-it' || a === '-ti' || a === '-i' || a === '-t') continue;
		else if (a === '--name') o.name = v();
		else if (a === '-e' || a === '--env') {
			const kv = v();
			const k = kv.indexOf('=');
			if (k < 0) {
				if (s.vars[kv] !== undefined) o.env[kv] = s.vars[kv];
			} else o.env[kv.slice(0, k)] = kv.slice(k + 1);
		} else if (a === '--env-file') {
			const f = v();
			const text = readFile(s.fs, pathOf(s, f));
			if (text === null)
				return fail(s, `docker: open ${f}: no such file or directory${RUN_HELP}`, 125);
			Object.assign(o.env, parseEnvFile(text));
		} else if (a === '-p' || a === '--publish') {
			const m = v().match(/^(\d+):(\d+)(\/tcp)?$/);
			if (!m) return fail(s, MOCK('run -p') + '（-p 手元の口:中の口 を使う）\n', 125);
			o.publish.push({ host: Number(m[1]), port: Number(m[2]) });
		} else if (a === '-v' || a === '--volume') {
			const m = v().match(/^([a-zA-Z0-9][a-zA-Z0-9_.-]*):(\/[^:]*)$/);
			if (!m) return fail(s, MOCK('run -v') + '（-v ボリュームの名前:中の場所 を使う）\n', 125);
			o.mounts.push({ volume: m[1], at: m[2].replace(/\/$/, '') || '/' });
		} else if (a === '--network' || a === '--net') o.network = v();
		else return fail(s, `unknown flag: ${a}\nSee 'docker run --help'.\n`, 125);
	}
	const ref = args[i];
	if (ref === undefined)
		return fail(
			s,
			`docker: 'docker run' requires at least 1 argument\n\nUsage:  docker run [OPTIONS] IMAGE [COMMAND] [ARG...]\n\nSee 'docker run --help' for more information\n`,
			1
		);
	const cmdArgs = args.slice(i + 1);
	if (o.name !== undefined && !NAME_OK.test(o.name))
		return fail(
			s,
			`docker: Error response from daemon: Invalid container name (${o.name}), only [a-zA-Z0-9][a-zA-Z0-9_.-] are allowed${RUN_HELP}`,
			125
		);
	let err = '';
	let img = imageByRef(ext, ref);
	if (!img) {
		err += `Unable to find image '${normalizeRef(ref)}' locally\n`;
		const p = pull(ext, ref);
		if (p.error)
			return fail(s, `${err}docker: Error response from daemon: ${p.error}${RUN_HELP}`, 125);
		ext = p.ext;
		err += p.err;
		img = imageByRef(ext, ref);
		if (!img) return fail(s, err, 125);
	}
	const same = o.name !== undefined ? ext.containers.find((c) => c.name === o.name) : undefined;
	if (same)
		return fail(
			withExt(s, ext),
			`${err}docker: Error response from daemon: Conflict. The container name "/${o.name}" is already in use by container "${same.id}". You have to remove (or rename) that container to be able to reuse that name.${RUN_HELP}`,
			125
		);
	if (!ext.networks.some((n) => n.name === o.network))
		return fail(
			withExt(s, ext),
			`${err}docker: Error response from daemon: network ${o.network} not found${RUN_HELP}`,
			125
		);
	const [c, ext2] = createContainer(
		ext,
		{
			name: o.name,
			image: ref,
			imageId: img.id,
			cmd: cmdArgs.length > 0 ? cmdArgs : img.config.cmd,
			env: o.env,
			mounts: o.mounts,
			publish: o.publish,
			networks: [o.network],
			autoRemove: o.rm
		},
		now
	);
	ext = ext2;
	let out = o.d ? c.id + '\n' : '';
	// 手元の口が、動いている別のコンテナに取られている
	for (const p of c.publish) {
		const taken = ext.containers.some(
			(x) => x.id !== c.id && x.status === 'running' && x.publish.some((q) => q.host === p.host)
		);
		if (taken) {
			const [endpoint, ext3] = newId(ext, 'endpoint', now);
			return {
				state: withExt(s, ext3),
				out,
				err: `${err}docker: Error response from daemon: failed to set up container networking: driver failed programming external connectivity on endpoint ${c.name} (${endpoint}): Bind for 0.0.0.0:${p.host} failed: port is already allocated${RUN_HELP}`,
				code: 125
			};
		}
	}
	const r = startContainer(ext, c.id, now, s.tick);
	ext = r.ext;
	if (r.missing !== undefined) {
		const e = `${err}docker: Error response from daemon: failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: exec: "${r.missing}": executable file not found in $PATH: unknown${RUN_HELP}`;
		return { state: withExt(s, o.rm ? dropContainer(ext, c.id) : ext), out, err: e, code: 127 };
	}
	if (o.d) return { state: withExt(s, ext), out, err, code: 0 };
	out += r.out;
	err += r.err;
	const still = ext.containers.find((x) => x.id === c.id);
	if (still?.status === 'running')
		err += `（模擬の端末は、終わらない命令を待たずに戻る。コンテナ ${still.name} は動いたまま。止めるには docker stop ${still.name}）\n`;
	return { state: withExt(s, ext), out, err, code: r.code };
}

function statusText(c: Container, now: number): string {
	if (c.status === 'running') return `Up ${humanDuration(now - (c.started ?? now))}`;
	if (c.status === 'exited') return `Exited (${c.exitCode}) ${ago(now, c.finished ?? now)}`;
	return 'Created';
}

function ps(s: S, args: string[], now: number): Res {
	const all = args.includes('-a') || args.includes('--all');
	if (args.some((a) => a !== '-a' && a !== '--all'))
		return fail(s, MOCK('ps') + '（-a だけを扱う）\n', 1);
	const rows = [['CONTAINER ID', 'IMAGE', 'COMMAND', 'CREATED', 'STATUS', 'PORTS', 'NAMES']];
	const list = [...s.ext.containers].filter((c) => all || c.status === 'running').reverse();
	for (const c of list)
		rows.push([
			c.id.slice(0, 12),
			c.image,
			goQuote(ellipsis(commandText(c.cmd), 20)),
			ago(now, c.created),
			statusText(c, now),
			portsText(c),
			c.name
		]);
	return ok(s, tabTable(rows));
}

function eachRef(
	s: S,
	refs: string[],
	fn: (ext: DockerExt, c: Container) => { ext: DockerExt; err?: string }
): Res {
	let ext = s.ext;
	let out = '';
	let err = '';
	for (const r of refs) {
		const c = findContainer(ext, r);
		if (!c) {
			err += `Error response from daemon: No such container: ${r}\n`;
			continue;
		}
		const x = fn(ext, c);
		ext = x.ext;
		if (x.err) err += x.err;
		else out += r + '\n';
	}
	return { state: withExt(s, ext), out, err, code: err ? 1 : 0 };
}

function images(s: S, now: number): Res {
	const rows = [['REPOSITORY', 'TAG', 'IMAGE ID', 'CREATED', 'SIZE']];
	const list = [...s.ext.images].sort((a, b) => b.created - a.created);
	for (const img of list) {
		const tags = img.tags.length > 0 ? img.tags : ['<none>:<none>'];
		for (const t of [...tags].sort().reverse()) {
			const [repo, tag] = t.split(':');
			rows.push([repo, tag, img.id.slice(0, 12), ago(now, img.created), humanSize(img.size)]);
		}
	}
	return ok(s, tabTable(rows));
}

function history(s: S, ref: string | undefined, now: number): Res {
	if (ref === undefined) return fail(s, MOCK('history'), 1);
	const img = imageByRef(s.ext, ref);
	if (!img) return fail(s, `Error response from daemon: No such image: ${normalizeRef(ref)}\n`, 1);
	const rows = [['IMAGE', 'CREATED', 'CREATED BY', 'SIZE', 'COMMENT']];
	const h = [...img.history].reverse();
	h.forEach((r, k) =>
		rows.push([
			k === 0 ? img.id.slice(0, 12) : '<missing>',
			ago(now, r.created),
			ellipsis(r.createdBy, 45),
			humanSize(r.size),
			r.comment
		])
	);
	return ok(s, tabTable(rows));
}

function volume(s: S, args: string[], now: number): Res {
	const [verb, ...rest] = args;
	const ext = s.ext;
	if (verb === 'create') {
		const name = rest[0];
		if (name === undefined) return fail(s, MOCK('volume create') + '（名前を付ける）\n', 1);
		if (ext.volumes.some((v) => v.name === name)) return ok(s, name + '\n');
		const v = {
			name,
			fs: { '/': { kind: 'dir' as const, mode: 0o755, mtime: now } },
			created: now
		};
		return ok(withExt(s, { ...ext, volumes: [...ext.volumes, v] }), name + '\n');
	}
	if (verb === 'ls') {
		const rows = [
			['DRIVER', 'VOLUME NAME'],
			...[...ext.volumes].sort((a, b) => (a.name < b.name ? -1 : 1)).map((v) => ['local', v.name])
		];
		return ok(s, tabTable(rows));
	}
	if (verb === 'rm') {
		let e = ext;
		let out = '';
		let err = '';
		for (const name of rest) {
			const users = e.containers.filter((c) => c.mounts.some((m) => m.volume === name));
			if (!e.volumes.some((v) => v.name === name))
				err += `Error response from daemon: get ${name}: no such volume\n`;
			else if (users.length > 0)
				err += `Error response from daemon: remove ${name}: volume is in use - [${users.map((c) => c.id).join(', ')}]\n`;
			else {
				e = { ...e, volumes: e.volumes.filter((v) => v.name !== name) };
				out += name + '\n';
			}
		}
		return { state: withExt(s, e), out, err, code: err ? 1 : 0 };
	}
	return fail(s, MOCK('volume') + '（create・ls・rm を扱う）\n', 1);
}

function network(s: S, args: string[], now: number): Res {
	const [verb, ...rest] = args;
	const ext = s.ext;
	if (verb === 'create') {
		const name = rest[0];
		if (name === undefined) return fail(s, MOCK('network create'), 1);
		if (ext.networks.some((n) => n.name === name))
			return fail(s, `Error response from daemon: network with name ${name} already exists\n`, 1);
		const [id, e] = newId(ext, 'network', now);
		const subnet = Math.max(17, ...ext.networks.map((n) => n.subnet)) + 1;
		return ok(
			withExt(s, {
				...e,
				networks: [...e.networks, { id, name, driver: 'bridge', subnet, builtin: false }]
			}),
			id + '\n'
		);
	}
	if (verb === 'ls') {
		const rows = [
			['NETWORK ID', 'NAME', 'DRIVER', 'SCOPE'],
			...[...ext.networks]
				.sort((a, b) => (a.name < b.name ? -1 : 1))
				.map((n) => [n.id.slice(0, 12), n.name, n.driver, 'local'])
		];
		return ok(s, tabTable(rows));
	}
	if (verb === 'rm') {
		let e = ext;
		let out = '';
		let err = '';
		for (const name of rest) {
			const n = e.networks.find((x) => x.name === name || x.id.startsWith(name));
			if (!n) err += `Error response from daemon: network ${name} not found\n`;
			else if (n.builtin)
				err += `Error response from daemon: ${n.name} is a pre-defined network and cannot be removed\n`;
			else if (e.containers.some((c) => c.status === 'running' && c.networks.includes(n.name)))
				err += `Error response from daemon: error while removing network: network ${n.name} id ${n.id} has active endpoints\n`;
			else {
				e = { ...e, networks: e.networks.filter((x) => x !== n) };
				out += name + '\n';
			}
		}
		return { state: withExt(s, e), out, err, code: err ? 1 : 0 };
	}
	return fail(s, MOCK('network') + '（create・ls・rm を扱う）\n', 1);
}

function exec(s: S, args: string[], now: number): Res {
	const rest = args.filter((a) => !['-i', '-t', '-it', '-ti', '-T'].includes(a));
	const [ref, ...argv] = rest;
	if (ref === undefined || argv.length === 0)
		return fail(s, MOCK('exec') + '（docker exec コンテナ 命令 の形）\n', 1);
	const c = findContainer(s.ext, ref);
	if (!c) return fail(s, `Error response from daemon: No such container: ${ref}\n`, 1);
	if (c.status !== 'running')
		return fail(s, `Error response from daemon: container ${c.id} is not running\n`, 1);
	const r = runInside(s.ext, c.id, argv, now, s.tick);
	if (r.missing !== undefined)
		return fail(
			s,
			`OCI runtime exec failed: exec failed: unable to start container process: exec: "${r.missing}": executable file not found in $PATH: unknown\n`,
			127
		);
	// exec で動かした物は、コンテナの主ではない（終わらない物を動かしても、コンテナの形は変えない）
	const after = r.ext.containers.find((x) => x.id === c.id);
	const ext = after ? putContainer(r.ext, { ...after, running: c.running }) : r.ext;
	return { state: withExt(s, ext), out: r.out, err: r.err, code: r.code };
}

export const docker: DCmd = (s0, args, io) => {
	const now = io.now;
	const s = withExt(s0, refresh(s0.ext, now));
	const [verb, ...rest] = args;
	switch (verb) {
		case 'run':
			return run(s, rest, now);
		case 'ps':
			return ps(s, rest, now);
		case 'images':
			return rest.length === 0 ? images(s, now) : fail(s, MOCK('images'), 1);
		case 'stop':
			return eachRef(s, rest, (ext, c) => ({ ext: stopContainer(ext, c.id, now) }));
		case 'start':
			return eachRef(s, rest, (ext, c) =>
				c.status === 'running' ? { ext } : { ext: startContainer(ext, c.id, now, s.tick).ext }
			);
		case 'rm': {
			const force = rest.includes('-f') || rest.includes('--force');
			return eachRef(
				s,
				rest.filter((a) => a !== '-f' && a !== '--force'),
				(ext, c) =>
					c.status === 'running' && !force
						? {
								ext,
								err: `Error response from daemon: cannot remove container "/${c.name}": container is running: stop the container before removing or force remove\n`
							}
						: { ext: dropContainer(ext, c.id) }
			);
		}
		case 'logs': {
			const c = rest[0] === undefined ? undefined : findContainer(s.ext, rest[0]);
			if (!c)
				return fail(s, `Error response from daemon: No such container: ${rest[0] ?? ''}\n`, 1);
			return ok(s, c.logs);
		}
		case 'port': {
			const c = rest[0] === undefined ? undefined : findContainer(s.ext, rest[0]);
			if (!c)
				return fail(s, `Error response from daemon: No such container: ${rest[0] ?? ''}\n`, 1);
			const out =
				c.status === 'running'
					? c.publish
							.map((p) => `${p.port}/tcp -> 0.0.0.0:${p.host}\n${p.port}/tcp -> [::]:${p.host}\n`)
							.join('')
					: '';
			return ok(s, out);
		}
		case 'exec':
			return exec(s, rest, now);
		case 'history':
			return history(s, rest[0], now);
		case 'volume':
			return volume(s, rest, now);
		case 'network':
			return network(s, rest, now);
		case 'build':
			return dockerBuild(s, rest, now);
		case 'compose':
			return compose(s, rest, now);
		case 'rmi': {
			let ext = s.ext;
			let out = '';
			let err = '';
			for (const ref of rest.filter((a) => a !== '-f')) {
				const img = imageByRef(ext, ref);
				if (!img) {
					err += `Error response from daemon: No such image: ${normalizeRef(ref)}\n`;
					continue;
				}
				const user = ext.containers.find((c) => c.imageId === img.id);
				if (user && !rest.includes('-f')) {
					err += `Error response from daemon: conflict: unable to delete ${normalizeRef(ref)} (must be forced) - container ${user.id.slice(0, 12)} is using its referenced image ${img.id.slice(0, 12)}\n`;
					continue;
				}
				const tags = img.tags.filter((t) => t !== normalizeRef(ref));
				out += `Untagged: ${normalizeRef(ref)}\n`;
				if (tags.length > 0)
					ext = { ...ext, images: ext.images.map((i) => (i === img ? { ...i, tags } : i)) };
				else {
					out += `Deleted: sha256:${img.id}\n`;
					ext = { ...ext, images: ext.images.filter((i) => i !== img) };
				}
			}
			return { state: withExt(s, ext), out, err, code: err ? 1 : 0 };
		}
		case undefined:
			return fail(s, MOCK('') + '（docker run・ps・images などを打つ）\n', 1);
		default:
			return fail(
				s,
				`docker: unknown command: docker ${verb}\n\nRun 'docker --help' for more information\n`,
				1
			);
	}
};

// 手元の機械から、コンテナの外に出した口へ（curl http://localhost:口/）。それ以外は網の curl
function dockerCurl(netCurl: Cmd<unknown> | undefined): DCmd {
	return (s, args, io) => {
		const url = args.find((a) => /^https?:\/\//.test(a));
		const m = url?.match(/^http:\/\/(localhost|127\.0\.0\.1)(?::(\d+))?(\/.*)?$/);
		if (!m)
			return netCurl
				? (netCurl as DCmd)(s, args, io)
				: fail(s, '（この実戦の模擬には網が無い）\n', 1);
		if (args.some((a) => a !== url && a !== '-s'))
			return fail(
				s,
				'（模擬の curl は、コンテナに向けては curl http://localhost:口/ の形だけを扱う）\n',
				2
			);
		const ext = refresh(s.ext, io.now);
		const port = Number(m[2] ?? 80);
		const path = m[3] ?? '/';
		const c = ext.containers.find(
			(x) => x.status === 'running' && x.publish.some((p) => p.host === port)
		);
		const silent = args.includes('-s');
		if (!c)
			return fail(
				s,
				silent
					? ''
					: `curl: (7) Failed to connect to ${m[1]} port ${port} after 0 ms: Couldn't connect to server\n`,
				7
			);
		const inner = c.publish.find((p) => p.host === port)?.port ?? 80;
		const r = c.running;
		if (r?.kind !== 'httpd' || r.port !== inner)
			return fail(s, silent ? '' : 'curl: (56) Recv failure: Connection reset by peer\n', 56);
		return ok(s, httpdFile(c, r.dir, path) ?? NOT_FOUND);
	};
}

export function dockerCommands(): Commands<DockerExt> {
	const sh = shellCommands<DockerExt>();
	return { ...sh, docker, curl: dockerCurl(sh.curl as Cmd<unknown> | undefined) };
}
