import assert from 'node:assert/strict';
import { test } from 'vitest';
import { parseCssColor } from '../src/lib/color.js';
import { colorOptions, roleEntry, roleText } from '../src/vue/editor/role-color.js';
import { present } from './helpers.js';

const palette = [
  {
    id: 'brand',
    shades: [
      { name: '600', color: null, isBase: false, byHand: false },
      { name: 'base', color: null, isBase: true, byHand: false },
    ],
  },
];
const options = colorOptions(palette);

test('creates readable, swatched choices for arbitrary palette shades', () => {
  assert.deepEqual(options, [
    { value: '{color.brand.600}', label: 'brand · 600', swatch: 'var(--color-brand-600)' },
    { value: '{color.brand.base}', label: 'brand', swatch: 'var(--color-brand-base)' },
  ]);
});

test('a role shows its shade label, or the hex of a fixed color', () => {
  assert.equal(roleText('{color.brand.600}', options), 'brand · 600');
  assert.equal(roleText(present(parseCssColor('#ff0000')), options), '#ff0000');
});

test('typed text becomes a palette alias, a parsed color, or nothing', () => {
  assert.equal(roleEntry('brand · 600', options), '{color.brand.600}');
  assert.equal(roleEntry('{color.brand.base}', options), '{color.brand.base}');
  assert.deepEqual(roleEntry('red', options), parseCssColor('red'));
  assert.equal(roleEntry('not a color', options), null);
  assert.equal(roleEntry('   ', options), null);
});
