// X.509 の証明書を読む（DER・PEM）。署名は RSA（PKCS#1 v1.5、SHA-256）だけを確かめる。
// openssl の模擬（openssl.ts）が使う。証明書は本物の OpenSSL で作った物（tools-real/worlds/certs.json）。
import { sha256Hex } from '../sha256.ts';

type Tlv = { tag: number; start: number; len: number; hdr: number; bytes: Uint8Array };

function tlv(b: Uint8Array, at: number): Tlv {
	const tag = b[at];
	let len = b[at + 1];
	let hdr = 2;
	if (len & 0x80) {
		const n = len & 0x7f;
		len = 0;
		for (let i = 0; i < n; i++) len = len * 256 + b[at + 2 + i];
		hdr = 2 + n;
	}
	return { tag, start: at, len, hdr, bytes: b.subarray(at, at + hdr + len) };
}

function children(t: Tlv): Tlv[] {
	const out: Tlv[] = [];
	const b = t.bytes;
	let i = t.hdr;
	while (i < b.length) {
		const c = tlv(b, i);
		out.push(c);
		i += c.hdr + c.len;
	}
	return out;
}

const content = (t: Tlv) => t.bytes.subarray(t.hdr);

function oid(t: Tlv): string {
	const b = content(t);
	const parts = [Math.floor(b[0] / 40), b[0] % 40];
	let v = 0;
	for (let i = 1; i < b.length; i++) {
		v = v * 128 + (b[i] & 0x7f);
		if (!(b[i] & 0x80)) {
			parts.push(v);
			v = 0;
		}
	}
	return parts.join('.');
}

const NAMES: Record<string, string> = {
	'2.5.4.6': 'C',
	'2.5.4.8': 'ST',
	'2.5.4.7': 'L',
	'2.5.4.10': 'O',
	'2.5.4.11': 'OU',
	'2.5.4.3': 'CN'
};

export type Rdn = { key: string; value: string };

function name(t: Tlv): Rdn[] {
	return children(t).map((set) => {
		const [k, v] = children(children(set)[0]);
		return { key: NAMES[oid(k)] ?? oid(k), value: new TextDecoder().decode(content(v)) };
	});
}

function time(t: Tlv): number {
	const s = new TextDecoder().decode(content(t));
	const full = t.tag === 0x17 ? (Number(s.slice(0, 2)) >= 50 ? '19' : '20') + s : s;
	const d = Date.UTC(
		Number(full.slice(0, 4)),
		Number(full.slice(4, 6)) - 1,
		Number(full.slice(6, 8)),
		Number(full.slice(8, 10)),
		Number(full.slice(10, 12)),
		Number(full.slice(12, 14))
	);
	return d / 1000;
}

const toBig = (b: Uint8Array) =>
	BigInt('0x' + ([...b].map((x) => x.toString(16).padStart(2, '0')).join('') || '0'));

export type Cert = {
	der: Uint8Array;
	tbs: Uint8Array;
	serialHex: string;
	issuer: Rdn[];
	subject: Rdn[];
	notBefore: number;
	notAfter: number;
	n: bigint;
	e: bigint;
	sigAlg: string;
	signature: Uint8Array;
	san: string[];
	isCa: boolean;
};

export function parseCert(der: Uint8Array): Cert {
	const top = tlv(der, 0);
	const [tbsT, algT, sigT] = children(top);
	const f = children(tbsT);
	let k = 0;
	if (f[0].tag === 0xa0) k = 1;
	const serial = content(f[k]);
	const issuer = name(f[k + 2]);
	const [nb, na] = children(f[k + 3]);
	const subject = name(f[k + 4]);
	const spki = children(f[k + 5]);
	const keyBits = content(spki[1]).subarray(1);
	const [nT, eT] = children(tlv(keyBits, 0));
	const san: string[] = [];
	let isCa = false;
	const extWrap = f.slice(k + 6).find((x) => x.tag === 0xa3);
	if (extWrap) {
		for (const ext of children(children(extWrap)[0])) {
			const parts = children(ext);
			const id = oid(parts[0]);
			const value = tlv(content(parts[parts.length - 1]), 0);
			if (id === '2.5.29.17')
				for (const g of children(value))
					if (g.tag === 0x82) san.push('DNS:' + new TextDecoder().decode(content(g)));
			if (id === '2.5.29.19')
				isCa = children(value).some((x) => x.tag === 0x01 && content(x)[0] !== 0);
		}
	}
	let serialBytes = serial;
	while (serialBytes.length > 1 && serialBytes[0] === 0) serialBytes = serialBytes.subarray(1);
	return {
		der,
		tbs: tbsT.bytes,
		serialHex: [...serialBytes]
			.map((x) => x.toString(16).padStart(2, '0'))
			.join('')
			.toUpperCase(),
		issuer,
		subject,
		notBefore: time(nb),
		notAfter: time(na),
		n: toBig(content(nT)),
		e: toBig(content(eT)),
		sigAlg: oid(children(algT)[0]),
		signature: content(sigT).subarray(1),
		san,
		isCa
	};
}

function base64(s: string): Uint8Array {
	const bin = atob(s.replace(/\s+/g, ''));
	return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// PEM の中の証明書を全て。読めない物があれば null
export function readPem(text: string): Cert[] | null {
	const re = /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g;
	const out: Cert[] = [];
	for (const m of text.matchAll(re)) {
		try {
			out.push(parseCert(base64(m[1])));
		} catch {
			return null;
		}
	}
	return out;
}

function modPow(b: bigint, e: bigint, m: bigint): bigint {
	let r = 1n;
	let x = b % m;
	let k = e;
	while (k > 0n) {
		if (k & 1n) r = (r * x) % m;
		x = (x * x) % m;
		k >>= 1n;
	}
	return r;
}

const SHA256_INFO = '3031300d060960864801650304020105000420';

// cert の署名を、key の持ち主の公開鍵で確かめる
export function signedBy(cert: Cert, key: Cert): boolean {
	if (cert.sigAlg !== '1.2.840.113549.1.1.11') return false;
	const m = modPow(toBig(cert.signature), key.e, key.n);
	const width = (key.n.toString(16).length + 1) >> 1;
	const em = m.toString(16).padStart(width * 2, '0');
	const digest = sha256Hex(cert.tbs);
	const t = SHA256_INFO + digest;
	const ps = 'ff'.repeat(width - 3 - t.length / 2);
	return em === '0001' + ps + '00' + t;
}

export const sameName = (a: Rdn[], b: Rdn[]) =>
	a.length === b.length && a.every((r, i) => r.key === b[i].key && r.value === b[i].value);

export const fingerprint = (c: Cert) =>
	sha256Hex(c.der).toUpperCase().match(/../g)?.join(':') ?? '';
