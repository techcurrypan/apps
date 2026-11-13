// docker build（BuildKit。標準エラーが端末でないときの、行で出す形。記録と同じ）。
// 命令ごとに層を作り、同じ土台・同じ命令・同じ中身なら使い回す（CACHED）。全て使い回せたら、同じイメージのまま。
// 送った大きさ（transferring … B）は、本物の送り方（ファイルの情報と中身の包み）と同じ数え方。
import {
	baseName,
	isDir,
	mkdir,
	parentOf,
	readFile,
	stat,
	walkFiles,
	writeFile,
	type Fs
} from '../fs.ts';
import { sha256Hex } from '../sha256.ts';
import { utf8 } from '../sha1.ts';
import { fail, pathOf, type ShellState } from '../shell/run.ts';
import { dropContainer, putContainer, runInside } from './engine.ts';
import { pull } from './docker.ts';
import {
	BUSYBOX,
	type Container,
	type DockerExt,
	type HistoryRow,
	type Image,
	type ImageConfig
} from './state.ts';

type S = ShellState<DockerExt>;
type Res = { state: S; out: string; err: string; code: number };

type Instr = { op: string; arg: string; raw: string };

function parseDockerfile(text: string): Instr[] {
	const out: Instr[] = [];
	for (const line of text.split('\n')) {
		const t = line.trim();
		if (t === '' || t.startsWith('#')) continue;
		const m = t.match(/^(\S+)\s*(.*)$/);
		if (m) out.push({ op: m[1].toUpperCase(), arg: m[2], raw: t });
	}
	return out;
}

const varintLen = (n: number) => (n < 128 ? 1 : n < 16384 ? 2 : n < 2097152 ? 3 : 4);
// 送るファイル 1 つの大きさ：情報（20 + 道の長さ + 大きさの数の長さ）と、中身を送るなら中身の包み（5 + 大きさ + 大きさの数の長さ）
const statBytes = (rel: string, size: number) => 20 + utf8(rel).length + varintLen(size);
const dataBytes = (size: number) => 5 + size + varintLen(size);

const jsonArgs = (arg: string): string[] | null => {
	try {
		const v: unknown = JSON.parse(arg);
		return Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : null;
	} catch {
		return null;
	}
};
const goSlice = (xs: string[]) => `[${xs.map((x) => JSON.stringify(x)).join(' ')}]`;
const fullRef = (ref: string) => {
	const r = ref.includes(':') ? ref : `${ref}:latest`;
	return r.includes('/') ? `docker.io/${r}` : `docker.io/library/${r}`;
};

function copyInto(
	fs0: Fs,
	from: Fs,
	src: string,
	dst: string,
	now: number
): { fs: Fs; bytes: number } {
	let fs = fs0;
	let bytes = 0;
	const ensure = (dir: string) => {
		const parts = dir.split('/').filter(Boolean);
		let p = '';
		for (const x of parts) {
			p += `/${x}`;
			if (!stat(fs, p)) fs = mkdir(fs, p, now, 0o755);
		}
	};
	const n = stat(from, src);
	if (n?.kind === 'file') {
		const target =
			dst.endsWith('/') || isDir(fs, dst) ? `${dst.replace(/\/$/, '')}/${baseName(src)}` : dst;
		ensure(parentOf(target));
		const data = n.data;
		fs = writeFile(fs, target, data, now, 0o644);
		bytes += utf8(data).length;
	} else if (n?.kind === 'dir') {
		for (const f of walkFiles(from, src)) {
			const rel = f.slice(src.length);
			const target = `${dst.replace(/\/$/, '')}${rel}`;
			ensure(parentOf(target));
			const data = readFile(from, f) ?? '';
			fs = writeFile(fs, target, data, now, 0o644);
			bytes += utf8(data).length;
		}
	}
	return { fs, bytes };
}

// 層で増えた大きさ（新しい・変わったファイルの中身の合計）
function grown(before: Fs, after: Fs): number {
	let n = 0;
	for (const [k, v] of Object.entries(after)) {
		if (v.kind !== 'file') continue;
		const b = before[k];
		if (!b || b.kind !== 'file' || b.data !== v.data) n += utf8(v.data).length;
	}
	return n;
}

export function dockerBuild(s: S, args: string[], now: number): Res {
	let tag: string | null = null;
	let ctxArg: string | undefined;
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '-t' || args[i] === '--tag') tag = args[++i] ?? null;
		else if (args[i].startsWith('-'))
			return fail(s, '（模擬の docker build は -t だけを扱う）\n', 1);
		else ctxArg = args[i];
	}
	// 本物は大文字の名前を断る。その言い方は記録していないので、模擬だと分かる言い方で断る（D-13）
	if (tag !== null && /[A-Z]/.test(tag.split(':')[0]))
		return fail(
			s,
			`（模擬の docker build は、大文字を含む名前 ${tag} を扱わない。小文字で付ける）\n`,
			1
		);
	if (ctxArg === undefined)
		return fail(
			s,
			"ERROR: docker: 'docker buildx build' requires 1 argument\n\nUsage:  docker buildx build [OPTIONS] PATH | URL | -\n\nRun 'docker buildx build --help' for more information\n",
			1
		);
	const ctx = pathOf(s, ctxArg);
	if (!isDir(s.fs, ctx))
		return fail(
			s,
			`ERROR: failed to build: unable to prepare context: path "${ctxArg}" not found\n`,
			1
		);
	const dfText = readFile(s.fs, `${ctx}/Dockerfile`);
	let err = '#0 building with "default" instance using docker driver\n\n';
	if (dfText === null)
		return fail(
			s,
			`${err}#1 [internal] load build definition from Dockerfile\n#1 transferring dockerfile: 2B done\n#1 DONE 0.0s\nERROR: failed to build: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory\n`,
			1
		);
	const dfSize = utf8(dfText).length;
	err += `#1 [internal] load build definition from Dockerfile\n#1 transferring dockerfile: ${statBytes('Dockerfile', dfSize) + dataBytes(dfSize)}B done\n#1 DONE 0.0s\n\n`;
	const instrs = parseDockerfile(dfText);
	const from = instrs[0];
	if (from?.op !== 'FROM')
		return fail(
			s,
			`${err}ERROR: failed to build: failed to solve: dockerfile parse error: no build stage in current context\n`,
			1
		);
	let ext = s.ext;
	const baseRef = from.arg.trim();
	err += `#2 [internal] load metadata for ${fullRef(baseRef)}\n`;
	let base = ext.images.find((i) =>
		i.tags.includes(baseRef.includes(':') ? baseRef : `${baseRef}:latest`)
	);
	if (!base) {
		const p = pull(ext, baseRef);
		if (p.error) {
			const e =
				'pull access denied, repository does not exist or may require authorization: server message: insufficient_scope: authorization failed';
			return fail(
				s,
				`${err}#2 ERROR: ${e}\nERROR: failed to build: failed to solve: ${baseRef}: failed to resolve source metadata for ${fullRef(baseRef)}: ${e}\n`,
				1
			);
		}
		ext = p.ext;
		base = ext.images.find((i) => i.id.startsWith(BUSYBOX.idHead));
	}
	if (!base) return fail(s, err, 1);
	err +=
		'#2 DONE 0.0s\n\n#3 [internal] load .dockerignore\n#3 transferring context: 2B done\n#3 DONE 0.0s\n\n';
	const steps = instrs.filter((x) => ['FROM', 'RUN', 'COPY', 'ADD', 'WORKDIR'].includes(x.op));
	const total = steps.length;
	let num = 4;
	err += `#${num} [1/${total}] FROM ${fullRef(baseRef)}\n#${num} DONE 0.0s\n\n`;
	num++;
	// 送る物（COPY の元）
	const copies = instrs.filter((x) => x.op === 'COPY' || x.op === 'ADD');
	const seen: Record<string, string> = { ...ext.seen };
	if (copies.length > 0) {
		let bytes = 0;
		for (const c of copies) {
			const [src] = c.arg.split(/\s+/);
			const p = pathOf({ ...s, cwd: ctx }, src);
			const files = stat(s.fs, p)?.kind === 'dir' ? walkFiles(s.fs, p) : stat(s.fs, p) ? [p] : [];
			for (const f of files) {
				const data = readFile(s.fs, f) ?? '';
				const size = utf8(data).length;
				bytes += statBytes(f.slice(ctx.length + 1), size);
				if (seen[f] !== data) bytes += dataBytes(size);
				seen[f] = data;
			}
		}
		err += `#${num} [internal] load build context\n#${num} transferring context: ${bytes}B done\n#${num} DONE 0.0s\n\n`;
		num++;
	}
	let fs = base.fs;
	let key = base.id;
	let config: ImageConfig = { ...base.config, env: { ...base.config.env } };
	const history: HistoryRow[] = [...base.history];
	const cache: Record<string, number> = { ...ext.cache };
	let allCached = true;
	let size = base.size;
	let k = 1;
	for (const ins of instrs.slice(1)) {
		// COPY の鍵は、送る元のファイルの中身で決まる
		const srcPath = pathOf({ ...s, cwd: ctx }, ins.arg.split(/\s+/)[0] ?? '');
		const srcFiles = stat(s.fs, srcPath)?.kind === 'dir' ? walkFiles(s.fs, srcPath) : [srcPath];
		const contentKey =
			ins.op === 'COPY' || ins.op === 'ADD'
				? sha256Hex(utf8(srcFiles.map((f) => `${f}\0${readFile(s.fs, f) ?? ''}`).join('\0')))
				: '';
		key = sha256Hex(utf8(`${key}\n${ins.raw}\n${contentKey}`));
		const row = (createdBy: string, bytes: number, at: number): HistoryRow => ({
			createdBy,
			size: bytes,
			created: at,
			comment: 'buildkit.dockerfile.v0'
		});
		const cachedAt = cache[key];
		const at = cachedAt ?? now;
		if (ins.op === 'RUN' || ins.op === 'COPY' || ins.op === 'ADD' || ins.op === 'WORKDIR') {
			k++;
			err += `#${num} [${k}/${total}] ${ins.raw}\n`;
		}
		if (ins.op === 'RUN') {
			const id = `build${num}`;
			const tmp: Container = {
				id,
				name: id,
				image: baseRef,
				imageId: '',
				cmd: [],
				env: {},
				created: now,
				status: 'running',
				exitCode: 0,
				fs,
				mounts: [],
				publish: [],
				networks: [],
				ips: {},
				logs: '',
				autoRemove: true
			};
			const img: Image = { ...base, id: `img-${id}`, fs, config };
			const withTmp = putContainer(
				{ ...ext, images: [...ext.images, img] },
				{ ...tmp, imageId: img.id }
			);
			const r = runInside(withTmp, id, ['/bin/sh', '-c', ins.arg], now, s.tick);
			const after = r.ext.containers.find((c) => c.id === id)?.fs ?? fs;
			if (r.code !== 0) {
				const proc = `process "/bin/sh -c ${ins.arg}" did not complete successfully: exit code: ${r.code}`;
				const lines = (r.out + r.err)
					.split('\n')
					.filter(Boolean)
					.map((l) => `#${num} 0.100 ${l}\n`)
					.join('');
				return fail(
					{ ...s, ext: { ...ext, seen } },
					`${err}${lines}#${num} ERROR: ${proc}\nERROR: failed to build: failed to solve: ${proc}\n`,
					1
				);
			}
			const bytes = grown(fs, after);
			if (cachedAt !== undefined) err += `#${num} CACHED\n\n`;
			else {
				allCached = false;
				err += (r.out + r.err)
					.split('\n')
					.filter(Boolean)
					.map((l) => `#${num} 0.100 ${l}\n`)
					.join('');
				err += `#${num} DONE 0.1s\n\n`;
			}
			fs = after;
			size += bytes;
			history.push(row(`RUN /bin/sh -c ${ins.arg} # buildkit`, bytes, at));
			ext = dropContainer(r.ext, id);
			ext = { ...ext, images: ext.images.filter((i) => i.id !== img.id) };
			num++;
		} else if (ins.op === 'COPY' || ins.op === 'ADD') {
			const [src, dst = '/'] = ins.arg.split(/\s+/);
			const p = pathOf({ ...s, cwd: ctx }, src);
			if (!stat(s.fs, p)) {
				const e = `failed to calculate checksum of ref: "/${src}": not found`;
				return fail(
					{ ...s, ext: { ...ext, seen } },
					`${err}#${num} ERROR: ${e}\nERROR: failed to build: failed to solve: failed to compute cache key: ${e}\n`,
					1
				);
			}
			const dest = dst.startsWith('/') ? dst : `${config.workdir.replace(/\/$/, '')}/${dst}`;
			const c = copyInto(fs, s.fs, p, dest, at);
			if (cachedAt !== undefined) err += `#${num} CACHED\n\n`;
			else {
				allCached = false;
				err += `#${num} DONE 0.0s\n\n`;
			}
			fs = c.fs;
			size += c.bytes;
			history.push(row(`${ins.op} ${src} ${dst} # buildkit`, c.bytes, at));
			num++;
		} else if (ins.op === 'WORKDIR') {
			const dir = ins.arg.trim();
			if (!stat(fs, dir)) fs = mkdir(fs, dir, at, 0o755);
			config = { ...config, workdir: dir };
			if (cachedAt !== undefined) err += `#${num} CACHED\n\n`;
			else {
				allCached = false;
				err += `#${num} DONE 0.0s\n\n`;
			}
			history.push(row(`WORKDIR ${dir}`, 0, at));
			num++;
		} else if (ins.op === 'CMD') {
			const argv = jsonArgs(ins.arg) ?? ['/bin/sh', '-c', ins.arg];
			config = { ...config, cmd: argv };
			history.push(row(`CMD ${goSlice(argv)}`, 0, at));
		} else if (ins.op === 'ENV') {
			const m = ins.arg.match(/^(\S+?)(?:=|\s+)(.*)$/);
			if (m) config = { ...config, env: { ...config.env, [m[1]]: m[2].replace(/^"|"$/g, '') } };
			history.push(row(`ENV ${m ? `${m[1]}=${m[2]}` : ins.arg}`, 0, at));
		} else if (ins.op === 'EXPOSE') {
			const ports = ins.arg.split(/\s+/).map((p) => (p.includes('/') ? p : `${p}/tcp`));
			config = { ...config, exposed: [...config.exposed, ...ports] };
			history.push(row(`EXPOSE map[${ports.map((p) => `${p}:{}`).join(' ')}]`, 0, at));
		} else {
			return fail(
				s,
				`${err}ERROR: failed to build: failed to solve: dockerfile parse error on line ${instrs.indexOf(ins) + 1}: unknown instruction: ${ins.op}\n`,
				1
			);
		}
		cache[key] = at;
	}
	// 書き出す。全て使い回せたなら、前と同じイメージ
	const finalKey = sha256Hex(utf8(`${key}\n${JSON.stringify(config)}`));
	const existing = ext.images.find((i) => i.cacheKey === finalKey);
	const created = allCached && existing ? existing.created : now;
	const id =
		existing && allCached ? existing.id : sha256Hex(utf8(`devlearn image ${finalKey} ${created}`));
	const name = tag === null ? null : tag.includes(':') ? tag : `${tag}:latest`;
	err += `#${num} exporting to image\n`;
	if (allCached && existing)
		err += `#${num} exporting layers done\n#${num} writing image sha256:${id} done\n`;
	else
		err += `#${num} exporting layers\n#${num} exporting layers 0.4s done\n#${num} writing image sha256:${id}\n#${num} writing image sha256:${id} done\n`;
	if (name) err += `#${num} naming to ${fullRef(name)} done\n`;
	err += `#${num} DONE ${allCached && existing ? '0.0' : '0.4'}s\n`;
	// 同じ名前は新しいイメージへ移す（古い物は名前の無いイメージとして残る）
	let images = ext.images.map((i) =>
		name && i.id !== id ? { ...i, tags: i.tags.filter((t) => t !== name) } : i
	);
	const image: Image = {
		id,
		tags: name ? [name] : [],
		created,
		size,
		fs,
		config,
		history,
		cacheKey: finalKey
	};
	const have = images.find((i) => i.id === id);
	images = have
		? images.map((i) =>
				i.id === id ? { ...i, tags: [...new Set([...i.tags, ...image.tags])] } : i
			)
		: [...images, image];
	const next: DockerExt = { ...ext, images, seen, cache };
	return { state: { ...s, ext: next }, out: '', err, code: 0 };
}
