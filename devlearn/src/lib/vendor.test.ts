// 取り込んだ他者の物が、記録した版のままであること（docs/third-party.md）。
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CSS = 'static/vendor/astryx-theme-neutral-0.7.11.css';
const SHA256 = '88239be738a64af72ab767c9f71d72c80e540cc1bb476edb92bb41ad1bd9eafd';

describe('Astryx theme-neutral 0.7.11', () => {
	const text = readFileSync(CSS, 'utf8');

	it('先頭にライセンスの全文がある', () => {
		expect(text).toContain('MIT License');
		expect(text).toContain('Copyright (c) 2026 Meta Platforms, Inc.');
		expect(text).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
	});

	it('注記の後ろは配布物のまま（SHA-256 が記録と同じ）', () => {
		const body = text.slice(text.indexOf('*/\n') + 3);
		expect(createHash('sha256').update(body, 'utf8').digest('hex')).toBe(SHA256);
	});

	it('配信物にライセンスの一覧がある', () => {
		const list = readFileSync('static/third-party-licenses.txt', 'utf8');
		expect(list).toContain('Astryx');
		expect(list).toContain('Copyright (c) 2026 Meta Platforms, Inc.');
	});
});
