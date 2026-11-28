import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Block from './Block.svelte';

// ⌖ は書体によって ♦ に化ける（10-P 手順 3 の 24 回目の判定）。字に頼らず円と線で描く
describe('block の記号 ⌖', () => {
	it('字ではなく円と 4 本の線で描く', () => {
		const { body } = render(Block, { props: { x: 0, y: 0, glyph: '⌖' } });
		expect(body).toContain('data-glyph="aim"');
		expect(body).toContain('<circle');
		expect(body).not.toContain('⌖');
	});
	it('ほかの記号は字のまま', () => {
		const { body } = render(Block, { props: { x: 0, y: 0, glyph: '↻' } });
		expect(body).toContain('↻');
		expect(body).not.toContain('data-glyph');
	});
});
