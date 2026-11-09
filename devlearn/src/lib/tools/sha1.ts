// SHA-1（git の物の ID を、本物と同じ値で作るため）。同期で動く小さな実装。

export function utf8(s: string): Uint8Array {
	return new TextEncoder().encode(s);
}

export function concat(...parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
	let o = 0;
	for (const p of parts) {
		out.set(p, o);
		o += p.length;
	}
	return out;
}

export function hexToBytes(hex: string): Uint8Array {
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	return out;
}

export function sha1Hex(data: Uint8Array): string {
	const ml = data.length;
	const withPad = new Uint8Array(((ml + 9 + 63) >> 6) << 6);
	withPad.set(data);
	withPad[ml] = 0x80;
	const view = new DataView(withPad.buffer);
	const bits = ml * 8;
	view.setUint32(withPad.length - 8, Math.floor(bits / 0x100000000));
	view.setUint32(withPad.length - 4, bits >>> 0);

	let h0 = 0x67452301;
	let h1 = 0xefcdab89;
	let h2 = 0x98badcfe;
	let h3 = 0x10325476;
	let h4 = 0xc3d2e1f0;
	const w = new Uint32Array(80);
	for (let off = 0; off < withPad.length; off += 64) {
		for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
		for (let i = 16; i < 80; i++) {
			const x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
			w[i] = (x << 1) | (x >>> 31);
		}
		let a = h0;
		let b = h1;
		let c = h2;
		let d = h3;
		let e = h4;
		for (let i = 0; i < 80; i++) {
			let f: number;
			let k: number;
			if (i < 20) {
				f = (b & c) | (~b & d);
				k = 0x5a827999;
			} else if (i < 40) {
				f = b ^ c ^ d;
				k = 0x6ed9eba1;
			} else if (i < 60) {
				f = (b & c) | (b & d) | (c & d);
				k = 0x8f1bbcdc;
			} else {
				f = b ^ c ^ d;
				k = 0xca62c1d6;
			}
			const t = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0;
			e = d;
			d = c;
			c = (b << 30) | (b >>> 2);
			b = a;
			a = t;
		}
		h0 = (h0 + a) >>> 0;
		h1 = (h1 + b) >>> 0;
		h2 = (h2 + c) >>> 0;
		h3 = (h3 + d) >>> 0;
		h4 = (h4 + e) >>> 0;
	}
	return [h0, h1, h2, h3, h4].map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
