// docker compose（v2.38.2）：up -d・ps・down・exec。今いる場所の compose.yaml を読む。
// 進みの言い方は、標準エラーが端末でないときの行の形（記録と同じ）。
import { baseName, readFile } from '../fs.ts';
import { fail, ok, type ShellState } from '../shell/run.ts';
import {
	commandText,
	createContainer,
	dropContainer,
	goQuote,
	portsText,
	runInside,
	startContainer,
	stopContainer
} from './engine.ts';
import { ago, imageByRef, pull } from './docker.ts';
import {
	ellipsis,
	humanDuration,
	newId,
	tabTable,
	type Container,
	type DockerExt,
	type Publish
} from './state.ts';

type S = ShellState<DockerExt>;
type Res = { state: S; out: string; err: string; code: number };

// YAML の小さな部分（入れ子の対応表・- の並び・[ ] の並び・引用符）
type Y = string | Y[] | { [k: string]: Y };

function scalar(t: string): Y {
	const v = t.trim();
	if (v.startsWith('[') && v.endsWith(']')) {
		const inner = v.slice(1, -1).trim();
		if (inner === '') return [];
		const out: string[] = [];
		const re = /\s*("(?:[^"\\]|\\.)*"|'[^']*'|[^,]+)\s*(,|$)/g;
		for (const m of inner.matchAll(re)) if (m[1] !== undefined) out.push(unquote(m[1]));
		return out;
	}
	return unquote(v);
}
function unquote(v: string): string {
	const t = v.trim();
	if (t.startsWith('"') && t.endsWith('"')) {
		try {
			return JSON.parse(t) as string;
		} catch {
			return t.slice(1, -1);
		}
	}
	if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
	return t;
}

export function parseYaml(text: string): Y {
	const lines = text
		.split('\n')
		.map((l) => l.replace(/\s+#.*$/, '').replace(/\s+$/, ''))
		.filter((l) => l.trim() !== '' && !l.trim().startsWith('#'));
	let i = 0;
	const indentOf = (l: string) => l.length - l.trimStart().length;
	function block(indent: number): Y {
		if (i >= lines.length) return '';
		if (lines[i].trimStart().startsWith('- ')) {
			const arr: Y[] = [];
			while (
				i < lines.length &&
				indentOf(lines[i]) === indent &&
				lines[i].trimStart().startsWith('- ')
			) {
				arr.push(scalar(lines[i].trimStart().slice(2)));
				i++;
			}
			return arr;
		}
		const obj: { [k: string]: Y } = {};
		while (i < lines.length && indentOf(lines[i]) === indent) {
			const t = lines[i].trim();
			const m = t.match(/^([^:]+):\s*(.*)$/);
			i++;
			if (!m) continue;
			const key = unquote(m[1]);
			if (m[2] !== '') obj[key] = scalar(m[2]);
			else if (i < lines.length && indentOf(lines[i]) > indent)
				obj[key] = block(indentOf(lines[i]));
			else if (
				i < lines.length &&
				indentOf(lines[i]) === indent &&
				lines[i].trimStart().startsWith('- ')
			)
				obj[key] = block(indent);
			else obj[key] = {};
		}
		return obj;
	}
	return block(lines.length > 0 ? indentOf(lines[0]) : 0);
}

type Service = {
	name: string;
	image: string;
	command?: string[];
	ports: Publish[];
	dependsOn: string[];
	env: Record<string, string>;
};

const asObj = (y: Y | undefined): { [k: string]: Y } =>
	y && typeof y === 'object' && !Array.isArray(y) ? y : {};
const asList = (y: Y | undefined): string[] =>
	Array.isArray(y) ? y.filter((x): x is string => typeof x === 'string') : [];

function services(text: string): Service[] | string {
	const root = asObj(parseYaml(text));
	const svcs = asObj(root.services);
	const out: Service[] = [];
	for (const [name, v] of Object.entries(svcs)) {
		const o = asObj(v);
		if (typeof o.image !== 'string')
			return `（模擬の compose は image で動かすサービスだけを扱う：${name}）`;
		const cmd = o.command;
		const env: Record<string, string> = {};
		if (Array.isArray(o.environment))
			for (const e of asList(o.environment)) {
				const k = e.indexOf('=');
				env[k < 0 ? e : e.slice(0, k)] = k < 0 ? '' : e.slice(k + 1);
			}
		else
			for (const [k, x] of Object.entries(asObj(o.environment)))
				env[k] = typeof x === 'string' ? x : '';
		out.push({
			name,
			image: o.image,
			command: Array.isArray(cmd)
				? asList(cmd)
				: typeof cmd === 'string'
					? cmd.split(/\s+/)
					: undefined,
			ports: asList(o.ports).map((p) => {
				const [h, c] = p.split(':');
				return { host: Number(h), port: Number(c) };
			}),
			dependsOn: Array.isArray(o.depends_on)
				? asList(o.depends_on)
				: Object.keys(asObj(o.depends_on)),
			env
		});
	}
	return out;
}

// 頼る物が先（同じ段は名前の順）
function order(svcs: Service[]): Service[] {
	const done: Service[] = [];
	const left = [...svcs].sort((a, b) => (a.name < b.name ? -1 : 1));
	while (left.length > 0) {
		const k = left.findIndex((s) => s.dependsOn.every((d) => done.some((x) => x.name === d)));
		const [next] = left.splice(k < 0 ? 0 : k, 1);
		done.push(next);
	}
	return done;
}

const FILES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'];

export function compose(s: S, args: string[], now: number): Res {
	const file = FILES.map((f) => `${s.cwd}/${f}`).find((p) => readFile(s.fs, p) !== null);
	if (!file) return fail(s, 'no configuration file provided: not found\n', 1);
	const svcs = services(readFile(s.fs, file) ?? '');
	if (typeof svcs === 'string') return fail(s, svcs + '\n', 1);
	const project = baseName(s.cwd);
	const netName = `${project}_default`;
	const cname = (svc: string) => `${project}-${svc}-1`;
	const mine = (ext: DockerExt) => ext.containers.filter((c) => c.project?.name === project);
	const [verb, ...rest] = args;
	let ext = s.ext;
	if (verb === 'up') {
		if (!rest.includes('-d') && !rest.includes('--detach'))
			return fail(
				s,
				'（模擬の端末は、終わらない docker compose up を待てない。-d を付けて打つ）\n',
				1
			);
		let err = '';
		if (!ext.networks.some((n) => n.name === netName)) {
			const [id, e] = newId(ext, 'network', now);
			const subnet = Math.max(17, ...e.networks.map((n) => n.subnet)) + 1;
			ext = {
				...e,
				networks: [...e.networks, { id, name: netName, driver: 'bridge', subnet, builtin: false }]
			};
			err += ` Network ${netName}  Creating\n Network ${netName}  Created\n`;
		}
		const list = order(svcs);
		for (const sv of list) {
			if (mine(ext).some((c) => c.name === cname(sv.name))) continue;
			let img = imageByRef(ext, sv.image);
			if (!img) {
				const p = pull(ext, sv.image);
				if (p.error)
					return fail(
						{ ...s, ext },
						`${err} ${sv.name} Error ${p.error}\nError response from daemon: ${p.error}\n`,
						1
					);
				ext = p.ext;
				img = imageByRef(ext, sv.image);
			}
			if (!img) return fail({ ...s, ext }, err, 1);
			err += ` Container ${cname(sv.name)}  Creating\n`;
			const [, e] = createContainer(
				ext,
				{
					name: cname(sv.name),
					image: sv.image,
					imageId: img.id,
					cmd: sv.command ?? img.config.cmd,
					env: sv.env,
					mounts: [],
					publish: sv.ports,
					networks: [netName],
					autoRemove: false,
					project: { name: project, service: sv.name }
				},
				now
			);
			ext = e;
			err += ` Container ${cname(sv.name)}  Created\n`;
		}
		for (const sv of list) {
			const c = mine(ext).find((x) => x.name === cname(sv.name));
			if (!c) continue;
			if (c.status === 'running') {
				err += ` Container ${c.name}  Running\n`;
				continue;
			}
			err += ` Container ${c.name}  Starting\n`;
			ext = startContainer(ext, c.id, now, s.tick).ext;
			err += ` Container ${c.name}  Started\n`;
		}
		return { state: { ...s, ext }, out: '', err, code: 0 };
	}
	if (verb === 'ps') {
		const rows = [['NAME', 'IMAGE', 'COMMAND', 'SERVICE', 'CREATED', 'STATUS', 'PORTS']];
		const list = mine(ext)
			.filter((c) => c.status === 'running')
			.sort((a, b) => (a.name < b.name ? -1 : 1));
		for (const c of list)
			rows.push([
				c.name,
				c.image,
				goQuote(ellipsis(commandText(c.cmd), 20)),
				c.project?.service ?? '',
				ago(now, c.created),
				`Up ${humanDuration(now - (c.started ?? now))}`,
				portsText(c)
			]);
		return ok(s, tabTable(rows));
	}
	if (verb === 'down') {
		let err = '';
		const list = order(svcs).reverse();
		for (const sv of list) {
			const c = mine(ext).find((x) => x.name === cname(sv.name));
			if (!c) continue;
			if (c.status === 'running') {
				err += ` Container ${c.name}  Stopping\n`;
				ext = stopContainer(ext, c.id, now);
				err += ` Container ${c.name}  Stopped\n`;
			}
			err += ` Container ${c.name}  Removing\n`;
			ext = dropContainer(ext, c.id);
			err += ` Container ${c.name}  Removed\n`;
		}
		if (ext.networks.some((n) => n.name === netName)) {
			err += ` Network ${netName}  Removing\n`;
			ext = { ...ext, networks: ext.networks.filter((n) => n.name !== netName) };
			err += ` Network ${netName}  Removed\n`;
		}
		return { state: { ...s, ext }, out: '', err, code: 0 };
	}
	if (verb === 'exec') {
		const argv = rest.filter((a) => a !== '-T');
		const [svc, ...cmd] = argv;
		const c: Container | undefined = mine(ext).find((x) => x.project?.service === svc);
		if (!svc || cmd.length === 0)
			return fail(s, '（docker compose exec サービス 命令 の形で打つ）\n', 1);
		if (!c || c.status !== 'running') return fail(s, `service "${svc}" is not running\n`, 1);
		const r = runInside(ext, c.id, cmd, now, s.tick);
		if (r.missing !== undefined)
			return fail(
				s,
				`OCI runtime exec failed: exec failed: unable to start container process: exec: "${r.missing}": executable file not found in $PATH: unknown\n`,
				127
			);
		const after = r.ext.containers.find((x) => x.id === c.id);
		const e2 = after
			? {
					...r.ext,
					containers: r.ext.containers.map((x) =>
						x.id === c.id ? { ...after, running: c.running } : x
					)
				}
			: r.ext;
		return { state: { ...s, ext: e2 }, out: r.out, err: r.err, code: r.code };
	}
	return fail(s, '（模擬の docker compose は up -d・ps・down・exec を扱う）\n', 1);
}
