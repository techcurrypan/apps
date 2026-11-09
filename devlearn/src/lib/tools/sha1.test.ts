import { describe, expect, it } from 'vitest';
import { sha1Hex, utf8 } from './sha1.ts';

describe('SHA-1', () => {
	it('決まった値（FIPS 180 の例）', () => {
		expect(sha1Hex(utf8(''))).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
		expect(sha1Hex(utf8('abc'))).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
		expect(sha1Hex(utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))).toBe(
			'84983e441c3bd26ebaae4aa1f95129e5e54670f1'
		);
	});
	it('64 字ちょうど・長い入力', () => {
		expect(sha1Hex(utf8('a'.repeat(64)))).toBe('0098ba824b5c16427bd7a1122a5a442a25ec644d');
		expect(sha1Hex(utf8('a'.repeat(1000)))).toBe('291e9a6c66994949b57ba5e650361e98fc36b1ba');
	});
	it('git の blob の ID（git hash-object と同じ）', () => {
		expect(sha1Hex(utf8('blob 12\0hello world\n'))).toBe(
			'3b18e512dba79e4c8300dd08aeb37f8e728b8dad'
		);
	});
	it('日本語は UTF-8 のバイトで数える', () => {
		expect(utf8('あ')).toEqual(new Uint8Array([0xe3, 0x81, 0x82]));
	});
});
