import { describe, expect, it } from 'vitest';
import { validV2 } from '../../src/lib/lesson/testing/v2-fixture.ts';
import { hasName, needle, rawUrl, wants } from './impl.ts';

describe('impl:verify の部品', () => {
	it('版の tag の生のファイルの URL を作る', () => {
		expect(rawUrl({ project: 'linux', version: 'v6.12', where: 'net/ipv4/tcp_output.c' })).toBe(
			'https://raw.githubusercontent.com/torvalds/linux/v6.12/net/ipv4/tcp_output.c'
		);
		expect(rawUrl({ project: 'linux', version: 'v6.12', where: '/proc/sys/net' })).toBeNull();
		expect(rawUrl({ project: 'nope', version: 'v1', where: 'a.c' })).toBeNull();
	});
	it('名前は識別子として探す（部分一致にしない）', () => {
		const src =
			'static bool tcp_write_xmit(struct sock *sk, unsigned int mss_now)\nstruct sk_buff *skb;';
		expect(needle('tcp_write_xmit()')).toBe('tcp_write_xmit');
		expect(hasName(src, 'tcp_write_xmit()')).toBe(true);
		expect(hasName(src, 'tcp_write()')).toBe(false);
		expect(hasName(src, 'sk_buff')).toBe(true);
		expect(hasName(src, 'struct sk_buff')).toBe(true);
	});
	it('レッスンの impl から確かめる物を集める', () => {
		const { list, skipped } = wants([validV2()]);
		expect(list).toHaveLength(3);
		expect(list[0].url).toContain('/v6.12/net/ipv4/tcp_output.c');
		expect(skipped).toEqual([]);
	});
});
