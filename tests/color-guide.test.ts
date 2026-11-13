import assert from 'node:assert/strict';
import { test } from 'vitest';
import { palettePath } from '../src/vue/guide/color-path.js';

test('treats a single named color as a palette entry', () => {
  assert.deepEqual(palettePath('color.accent'), { group: 'accent', step: '' });
});

test('keeps direct shades in their named palette', () => {
  assert.deepEqual(palettePath('color.accent.500'), { group: 'accent', step: '500' });
});

test('does not group nested semantic color tokens as palette shades', () => {
  assert.equal(palettePath('color.primary.foreground'), null);
  assert.equal(palettePath('color.accent.500.hover'), null);
});
