// コンテナを作る・動かす・止める・中で命令を動かす。docker の命令（docker.ts）と compose（compose.ts）が使う。
import { emptyFs, type Fs, type FsNode } from '../fs.ts';
import { runChild, type Io, type ShellState } from '../shell/run.ts';
import { busyboxCommands, type CtrCtx } from './busybox.ts';
import {
	autoName,
	newId,
	type Container,
	type DockerExt,
	type Image,
	type Mount,
	type Publish
} from './state.ts';

const BB = busyboxCommands();

export const findContainer = (ext: DockerExt, ref: string): Container | undefined =>
	ext.containers.find((c) => c.name === ref) ??
	(ref.length >= 1 && /^[0-9a-f]+$/.test(ref)
		? ext.containers.find((c) => c.id.startsWith(ref))
		: undefined);

export const putContainer = (ext: DockerExt, c: Container): DockerExt => ({
	...ext,
	containers: ext.containers.some((x) => x.id === c.id)
		? ext.containers.map((x) => (x.id === c.id ? c : x))
		: [...ext.containers, c]
});
export const dropContainer = (ext: DockerExt, id: string): DockerExt => ({
	...ext,
	containers: ext.containers.filter((c) => c.id !== id)
});

// 時が経って終わった物（sleep の時間が来た物）を、終わった形にする
export function refresh(ext: DockerExt, now: number): DockerExt {
	let out = ext;
	for (const c of ext.containers) {
		if (c.status === 'running' && c.running?.kind === 'sleep' && c.running.until <= now) {
			const done: Container = {
				...c,
				status: 'exited',
				exitCode: 0,
				finished: c.running.until,
				running: undefined,
				ips: {}
			};
			out = done.autoRemove ? dropContainer(out, c.id) : putContainer(out, done);
		}
	}
	return out;
}

// ボリュームを、つないだ場所に重ねたファイルの木
function withMounts(ext: DockerExt, c: Container): Fs {
	const out: Record<string, FsNode> = { ...c.fs };
	for (const m of c.mounts) {
		const v = ext.volumes.find((x) => x.name === m.volume);
		if (!v) continue;
		for (const k of Object.keys(out)) if (k === m.at || k.startsWith(`${m.at}/`)) delete out[k];
		for (const [k, n] of Object.entries(v.fs)) out[k === '/' ? m.at : `${m.at}${k}`] = n;
	}
	return out;
}
function splitMounts(ext: DockerExt, c: Container, merged: Fs): DockerExt {
	const own: Record<string, FsNode> = {};
	const vols: Record<string, Record<string, FsNode>> = {};
	for (const [k, n] of Object.entries(merged)) {
		const m = c.mounts.find((x) => k === x.at || k.startsWith(`${x.at}/`));
		if (m) (vols[m.volume] ??= {})[k === m.at ? '/' : k.slice(m.at.length)] = n;
		else own[k] = n;
	}
	const volumes = ext.volumes.map((v) => (vols[v.name] ? { ...v, fs: vols[v.name] } : v));
	return putContainer({ ...ext, volumes }, { ...c, fs: own });
}

// 環境の並び：PATH・HOSTNAME・渡した物・HOME（本物の env の順）
function containerEnv(c: Container, img: Image): Record<string, string> {
	const env: Record<string, string> = {
		PATH: img.config.env.PATH ?? '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
	};
	env.HOSTNAME = c.id.slice(0, 12);
	for (const [k, v] of Object.entries(img.config.env)) if (k !== 'PATH') env[k] = v;
	for (const [k, v] of Object.entries(c.env)) env[k] = v;
	env.HOME = '/root';
	return env;
}

export type Inside = { ext: DockerExt; out: string; err: string; code: number; missing?: string };

// コンテナの中で命令を動かす（主の命令も、exec も）
export function runInside(
	ext0: DockerExt,
	cid: string,
	argv: string[],
	now: number,
	tick: number
): Inside {
	const c = ext0.containers.find((x) => x.id === cid);
	const img = c && ext0.images.find((i) => i.id === c.imageId);
	if (!c || !img) return { ext: ext0, out: '', err: '', code: 1 };
	const env = containerEnv(c, img);
	const st: ShellState<CtrCtx> = {
		fs: withMounts(ext0, c),
		cwd: img.config.workdir || '/',
		home: '/root',
		user: 'root',
		vars: env,
		exported: Object.keys(env),
		lastCode: 0,
		tick,
		ext: { docker: ext0, cid }
	};
	const [name = '', ...rest] = argv;
	const base = name.slice(name.lastIndexOf('/') + 1);
	let r;
	if (base === 'sh' && rest[0] === '-c' && rest[1] !== undefined) {
		r = runChild(BB, st, rest[1], { kind: 'file', name: 'sh' }, ['sh', ...rest.slice(2)], now);
	} else if (base === 'sh' && rest.length === 0) {
		// 端末につながない sh は、読む物が無くてすぐ終わる
		r = { state: st, out: '', err: '', code: 0 };
	} else {
		const cmd = BB[base];
		if (!cmd) return { ext: ext0, out: '', err: '', code: 127, missing: name };
		const io: Io<CtrCtx> = {
			stdin: '',
			tty: false,
			now,
			prefix: 'sh: ',
			interactive: false,
			commands: BB
		};
		r = cmd(st, rest, io);
	}
	const running = r.state.ext.running;
	let ext = splitMounts(r.state.ext.docker, c, r.state.fs);
	const after = ext.containers.find((x) => x.id === cid);
	if (after && running) ext = putContainer(ext, { ...after, running });
	return { ext, out: r.out, err: r.err, code: r.code };
}

// 網に住所を振る（172.<網>.0.2 から、空いている物）
function assignIps(ext: DockerExt, c: Container): Record<string, string> {
	const ips: Record<string, string> = {};
	for (const net of c.networks) {
		const n = ext.networks.find((x) => x.name === net);
		if (!n || n.subnet === 0) continue;
		const used = new Set(
			ext.containers.filter((x) => x.status === 'running').map((x) => x.ips[net])
		);
		let k = 2;
		while (used.has(`172.${n.subnet}.0.${k}`)) k++;
		ips[net] = `172.${n.subnet}.0.${k}`;
	}
	return ips;
}

export type Started = { ext: DockerExt; out: string; err: string; code: number; missing?: string };

// 動かす。主の命令が終われば、終わった形。終わらない物（httpd・nc・sleep）は動いたまま
export function startContainer(ext0: DockerExt, cid: string, now: number, tick: number): Started {
	const c0 = ext0.containers.find((x) => x.id === cid);
	if (!c0) return { ext: ext0, out: '', err: '', code: 1 };
	const c: Container = {
		...c0,
		status: 'running',
		started: now,
		finished: undefined,
		running: undefined,
		ips: assignIps(ext0, c0)
	};
	const r = runInside(putContainer(ext0, c), cid, c.cmd, now, tick);
	if (r.missing !== undefined)
		return {
			ext: putContainer(ext0, { ...c0, status: 'created' }),
			out: '',
			err: '',
			code: 127,
			missing: r.missing
		};
	const after = r.ext.containers.find((x) => x.id === cid) ?? c;
	const logs = after.logs + r.out + r.err;
	if (after.running)
		return { ext: putContainer(r.ext, { ...after, logs }), out: r.out, err: r.err, code: 0 };
	const done: Container = {
		...after,
		status: 'exited',
		exitCode: r.code,
		finished: now,
		ips: {},
		logs
	};
	const ext = done.autoRemove ? dropContainer(r.ext, cid) : putContainer(r.ext, done);
	return { ext, out: r.out, err: r.err, code: r.code };
}

// 止める。中の主のプロセスは TERM を受けない（1 番のプロセスで、受け手を置いていない）ので、10 秒後に KILL（137）
export function stopContainer(ext: DockerExt, cid: string, now: number): DockerExt {
	const c = ext.containers.find((x) => x.id === cid);
	if (!c || c.status !== 'running') return ext;
	const done: Container = {
		...c,
		status: 'exited',
		exitCode: 137,
		finished: now,
		running: undefined,
		ips: {}
	};
	return done.autoRemove ? dropContainer(ext, cid) : putContainer(ext, done);
}

export type CreateSpec = {
	name?: string;
	image: string;
	imageId: string;
	cmd: string[];
	env: Record<string, string>;
	mounts: Mount[];
	publish: Publish[];
	networks: string[];
	autoRemove: boolean;
	project?: { name: string; service: string };
};

export function createContainer(
	ext0: DockerExt,
	spec: CreateSpec,
	now: number
): [Container, DockerExt] {
	const [id, ext1] = newId(ext0, 'container', now);
	const img = ext1.images.find((i) => i.id === spec.imageId);
	const name = spec.name ?? autoName(id, (n) => ext1.containers.some((c) => c.name === n));
	let ext = ext1;
	// 名前の付いたボリュームが無ければ作る
	for (const m of spec.mounts)
		if (!ext.volumes.some((v) => v.name === m.volume))
			ext = {
				...ext,
				volumes: [
					...ext.volumes,
					{ name: m.volume, fs: { '/': { kind: 'dir', mode: 0o755, mtime: now } }, created: now }
				]
			};
	const c: Container = {
		id,
		name,
		image: spec.image,
		imageId: spec.imageId,
		cmd: spec.cmd,
		env: spec.env,
		created: now,
		status: 'created',
		exitCode: 0,
		fs: {
			...(img?.fs ?? emptyFs()),
			'/etc/hostname': { kind: 'file', data: id.slice(0, 12) + '\n', mode: 0o644, mtime: now }
		},
		mounts: spec.mounts,
		publish: spec.publish,
		networks: spec.networks,
		ips: {},
		logs: '',
		autoRemove: spec.autoRemove,
		...(spec.project ? { project: spec.project } : {})
	};
	return [c, putContainer(ext, c)];
}

// 表に出す命令（引数に空白があれば ' で包む。docker ps の COMMAND）
export const commandText = (argv: string[]) =>
	argv.map((a) => (/\s/.test(a) ? `'${a}'` : a)).join(' ');

// Go の strconv.Quote
export const goQuote = (s: string) =>
	'"' +
	s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t') +
	'"';

export const portsText = (c: Container) =>
	c.status === 'running'
		? c.publish
				.map((p) => `0.0.0.0:${p.host}->${p.port}/tcp, [::]:${p.host}->${p.port}/tcp`)
				.join(', ')
		: '';
