// openssl の模擬：x509（-subject・-issuer・-dates・-serial・-fingerprint・-ext subjectAltName）と verify（-CAfile・-untrusted）。
// 本物の記録（sec-004）と一字ずつ合わせる。証明書の連なりの辿り方は OpenSSL と同じ順：
// 発行者は、信じる物（-CAfile）→ 信じない物（-untrusted）の順に、名前と署名が合う物を探す。
// 自分で署名した物まで辿り着き、それが信じる物なら通る。
import { readFile, stat } from '../fs.ts';
import { canRead, pathOf, type Cmd, type CmdResult, type ShellState } from './run.ts';
import { fingerprint, readPem, sameName, signedBy, type Cert, type Rdn } from './x509.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const nameLine = (n: Rdn[]) => n.map((r) => `${r.key} = ${r.value}`).join(', ');

function gmt(t: number): string {
	const d = new Date(t * 1000);
	const p = (x: number) => String(x).padStart(2, '0');
	return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} ${d.getUTCFullYear()} GMT`;
}

type Loaded = { certs: Cert[] } | { error: string };

function load<X>(s: ShellState<X>, name: string, what: string, stdin?: string): Loaded {
	if (name === '-' && stdin !== undefined) {
		const c = readPem(stdin);
		return c && c.length > 0 ? { certs: c } : { error: `Could not find ${what}\n` };
	}
	const path = pathOf(s, name);
	const node = stat(s.fs, path);
	if (!node || node.kind !== 'file' || !canRead(s.fs, path, s.user))
		return { error: `（模擬の openssl は、読めないファイル ${name} の誤りの言い方を扱わない）\n` };
	const c = readPem(readFile(s.fs, path) ?? '');
	if (!c || c.length === 0)
		return { error: `（模擬の openssl は、証明書でない ${name} を扱わない）\n` };
	return { certs: c };
}

const res = <X>(state: ShellState<X>, out: string, err: string, code: number): CmdResult<X> => ({
	state,
	out,
	err,
	code
});

const x509: Cmd<unknown> = (s, args, io) => {
	let input = '-';
	const shows: string[] = [];
	let ext = '';
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '-in') input = args[++i] ?? '';
		else if (a === '-ext') {
			ext = args[++i] ?? '';
			shows.push('-ext');
		} else if (a === '-noout' || a === '-sha256') continue;
		else if (['-subject', '-issuer', '-dates', '-serial', '-fingerprint'].includes(a))
			shows.push(a);
		else return res(s, '', `（模擬の openssl x509 では ${a} を扱わない）\n`, 1);
	}
	const l = load(s, input, 'certificate', io.stdin);
	if ('error' in l) return res(s, '', l.error, 1);
	const c = l.certs[0];
	let out = '';
	for (const sh of shows) {
		if (sh === '-subject') out += `subject=${nameLine(c.subject)}\n`;
		if (sh === '-issuer') out += `issuer=${nameLine(c.issuer)}\n`;
		if (sh === '-dates') out += `notBefore=${gmt(c.notBefore)}\nnotAfter=${gmt(c.notAfter)}\n`;
		if (sh === '-serial') out += `serial=${c.serialHex}\n`;
		if (sh === '-fingerprint') out += `sha256 Fingerprint=${fingerprint(c)}\n`;
		if (sh === '-ext' && ext === 'subjectAltName')
			out += `X509v3 Subject Alternative Name: \n    ${c.san.join(', ')}\n`;
	}
	return res(s, out, '', 0);
};

type Verdict = { ok: true } | { ok: false; code: number; depth: number; text: string; at: Cert };

const selfSigned = (c: Cert) => sameName(c.subject, c.issuer) && signedBy(c, c);

export function verifyChain(leaf: Cert, trusted: Cert[], untrusted: Cert[], now: number): Verdict {
	const chain: { cert: Cert; trusted: boolean }[] = [
		{ cert: leaf, trusted: trusted.some((t) => t.der.join() === leaf.der.join()) }
	];
	for (;;) {
		const top = chain[chain.length - 1];
		if (selfSigned(top.cert)) {
			if (!top.trusted)
				return chain.length === 1
					? { ok: false, code: 18, depth: 0, text: 'self-signed certificate', at: top.cert }
					: {
							ok: false,
							code: 19,
							depth: chain.length - 1,
							text: 'self-signed certificate in certificate chain',
							at: top.cert
						};
			break;
		}
		const fits = (c: Cert) => sameName(c.subject, top.cert.issuer) && signedBy(top.cert, c);
		const t = trusted.find(fits);
		const u = t ? undefined : untrusted.find(fits);
		if (!t && !u) {
			const depth = chain.length - 1;
			return top.trusted
				? { ok: false, code: 2, depth, text: 'unable to get issuer certificate', at: top.cert }
				: {
						ok: false,
						code: 20,
						depth,
						text: 'unable to get local issuer certificate',
						at: top.cert
					};
		}
		chain.push({ cert: (t ?? u) as Cert, trusted: !!t });
		if (chain.length > 10) break;
	}
	for (let d = 0; d < chain.length; d++) {
		const c = chain[d].cert;
		if (now < c.notBefore)
			return { ok: false, code: 9, depth: d, text: 'certificate is not yet valid', at: c };
		if (now > c.notAfter)
			return { ok: false, code: 10, depth: d, text: 'certificate has expired', at: c };
	}
	return { ok: true };
}

const verify: Cmd<unknown> = (s, args, io) => {
	let caFile: string | null = null;
	let untrustedFile: string | null = null;
	const files: string[] = [];
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '-CAfile') caFile = args[++i] ?? '';
		else if (a === '-untrusted') untrustedFile = args[++i] ?? '';
		else if (a.startsWith('-'))
			return res(s, '', `（模擬の openssl verify では ${a} を扱わない）\n`, 1);
		else files.push(a);
	}
	const trusted: Cert[] = [];
	const untrusted: Cert[] = [];
	for (const [f, into] of [
		[caFile, trusted],
		[untrustedFile, untrusted]
	] as const) {
		if (f === null) continue;
		const l = load(s, f, 'certificates');
		if ('error' in l) return res(s, '', l.error, 1);
		into.push(...l.certs);
	}
	let out = '';
	let err = '';
	let code = 0;
	for (const f of files) {
		const l = load(s, f, 'certificate');
		if ('error' in l) {
			err += l.error;
			code = 2;
			continue;
		}
		const v = verifyChain(l.certs[0], trusted, untrusted, io.now);
		if (v.ok) out += `${f}: OK\n`;
		else {
			err += `${nameLine(v.at.subject)}\nerror ${v.code} at ${v.depth} depth lookup: ${v.text}\nerror ${f}: verification failed\n`;
			code = 2;
		}
	}
	return res(s, out, err, code);
};

export const opensslCommands: Record<string, Cmd<unknown>> = {
	openssl: (s, args, io) => {
		const [sub, ...rest] = args;
		if (sub === 'x509') return x509(s, rest, io);
		if (sub === 'verify') return verify(s, rest, io);
		return res(
			s,
			'',
			`（模擬の openssl では ${sub ?? '（無し）'} を扱わない。x509 と verify を使う）\n`,
			1
		);
	}
};
