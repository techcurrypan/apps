// 作り物の網の形（tools-real/worlds/net.json の net）。記録（record.ts）はこれで CI の機械に網を作り、
// 模擬（net.ts）はこれを読んで答える。

export type NetNode = {
	ns: string;
	mac: string;
	addr: string;
	far?: string[];
	dns?: boolean;
	web?: boolean;
	ssh?: boolean; // SSH で入れる相手（sec-008）
};

export type Page = {
	status: number;
	reason: string;
	headers: [string, string][];
	body: string;
	etag?: string;
};

export type NetWorld = {
	self: NetNode & { if: string; prefix: number };
	gateway: string;
	routes: { to: string; via: string }[];
	hosts: NetNode[];
	dns: { server: string; ttl: number; zone: string; records: Record<string, string> };
	listen: { proto: 'tcp' | 'udp'; addr: string; port: number }[];
	etc: Record<string, string>;
	site: { host: string; server: string; pages: Record<string, Page> };
};

// 近くの機械の表（ARP）。打った物で増える。値は状態（REACHABLE・FAILED）
export type NetState = { world: NetWorld; neigh: Readonly<Record<string, 'REACHABLE' | 'FAILED'>> };

export const ip4 = (a: string) => a.split('.').reduce((n, p) => n * 256 + Number(p), 0);

export function inPrefix(addr: string, net: string, prefix: number): boolean {
	const m = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
	return (ip4(addr) & m) >>> 0 === (ip4(net) & m) >>> 0;
}

export function parseCidr(c: string): { net: string; prefix: number } {
	const [net, p] = c.split('/');
	return { net, prefix: Number(p ?? 32) };
}

export const isIp = (s: string) =>
	/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(s) &&
	s.split('.').every((p) => Number(p) <= 255);

// 宛先までの次の行き先。長く一致する経路が勝つ
export type Hop = { kind: 'local' } | { kind: 'link' } | { kind: 'via'; gw: string };
export function routeTo(w: NetWorld, dst: string): Hop {
	if (dst === w.self.addr || dst.startsWith('127.')) return { kind: 'local' };
	const cands: { prefix: number; hop: Hop }[] = [
		{ prefix: 0, hop: { kind: 'via', gw: w.gateway } }
	];
	if (inPrefix(dst, w.self.addr, w.self.prefix))
		cands.push({ prefix: w.self.prefix, hop: { kind: 'link' } });
	for (const r of w.routes) {
		const c = parseCidr(r.to);
		if (inPrefix(dst, c.net, c.prefix))
			cands.push({ prefix: c.prefix, hop: { kind: 'via', gw: r.via } });
	}
	cands.sort((a, b) => b.prefix - a.prefix);
	return cands[0].hop;
}

// その住所に、網の上の誰がいるか
export function hostAt(w: NetWorld, addr: string): NetNode | null {
	return w.hosts.find((h) => h.addr === addr || (h.far ?? []).includes(addr)) ?? null;
}

// 名前を引く（/etc/hosts → DNS）。見つからなければ null
export function resolve(w: NetWorld, name: string): string | null {
	if (isIp(name)) return name;
	for (const line of (w.etc.hosts ?? '').split('\n')) {
		const [a, ...names] = line.trim().split(/\s+/);
		if (a && names.includes(name)) return a;
	}
	return w.dns.records[name] ?? null;
}
