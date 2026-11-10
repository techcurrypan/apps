import { describe, expect, it } from 'vitest';
import { sha256Hex } from './sha256.ts';
import { utf8 } from './sha1.ts';

describe('SHA-256', () => {
	it('決まった値（FIPS 180 の例）', () => {
		expect(sha256Hex(utf8(''))).toBe(
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
		);
		expect(sha256Hex(utf8('abc'))).toBe(
			'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
		);
		expect(sha256Hex(utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))).toBe(
			'248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
		);
	});
	it('64 字ちょうど・長い入力', () => {
		expect(sha256Hex(utf8('a'.repeat(1000000)))).toBe(
			'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0'
		);
	});
});
