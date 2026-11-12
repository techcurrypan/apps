// 利用者の指摘（2026-11-12）：トップと地図に「街で遊ぶ」の入口がある。G で街へ行ける（screen-design.md 3.1・10.6）
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Top from '../../routes/+page.svelte';
import MapPage from '../../routes/map/+page.svelte';
import { readFileSync } from 'node:fs';
import { keyToCommand } from '../player/keys.ts';

const base = { shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, inField: false };

describe('街への入口', () => {
	it('トップに「街で遊ぶ」があり、/town へ行く', () => {
		const { body } = render(Top);
		expect(body).toMatch(/<a[^>]*href="\/town"[^>]*>[^<]*街で遊ぶ/);
	});
	it('地図に「街で遊ぶ」があり、/town へ行く', () => {
		const { body } = render(MapPage);
		expect(body).toMatch(/<a[^>]*href="\/town"[^>]*>[^<]*街で遊ぶ/);
	});
	it('G は街へ（学習 ⇄ 街）', () => {
		expect(keyToCommand({ ...base, key: 'g' })).toEqual({ type: 'work' });
	});
	it('街の上の帯に「地図」への入口がある', () => {
		const src = readFileSync(new URL('../../routes/town/+page.svelte', import.meta.url), 'utf8');
		expect(src).toMatch(/href=\{resolve\('\/map'\)\}[^>]*>地図</);
	});
});
