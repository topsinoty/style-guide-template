import { test } from 'vitest';
import assert from 'node:assert/strict';
import { nodeAt } from '../src/lib/tree.js';
import { token, load } from './helpers.js';
import type { BrandMeta } from '../src/lib/types.js';
import * as E from '../src/lib/edit.js';
import { removeStep } from '../src/lib/scale.js';
import { vendorData } from '../src/lib/tree.js';
import { uniquePath } from '../src/lib/path.js';
import { resolve } from '../src/lib/resolver.js';

test('setRole in light writes the foundation, in dark writes the dark context', () => {
  let doc = E.setRole(
    load(),
    'light',
    'primary.foreground',
    '{color.neutral.900}',
  );
  assert.equal(
    token(resolve(doc), 'color.primary.foreground').value,
    '{color.neutral.900}',
  );
  doc = E.setRole(doc, 'dark', 'primary.foreground', '{color.neutral.50}');
  assert.equal(
    token(resolve(doc, { theme: 'dark' }), 'color.primary.foreground').value,
    '{color.neutral.50}',
  );
  assert.equal(
    token(resolve(doc), 'color.primary.foreground').value,
    '{color.neutral.900}',
  );
});

test('setThemed writes only the theme, removeThemed falls back to the default theme', () => {
  const shadow = {
    $type: 'shadow',
    $value: { offsetY: { value: 9, unit: 'px' } },
  };
  let doc = E.setThemed(load(), 'dark', 'shadow.xl', shadow);
  assert.deepEqual(
    nodeAt(E.themeSource(doc, 'dark') ?? {}, 'shadow.xl'),
    shadow,
  );
  assert.equal(nodeAt(E.foundation(doc), 'shadow.xl'), undefined);
  doc = E.setThemed(doc, 'light', 'shadow.xl', shadow);
  doc = E.removeThemed(doc, 'dark', 'shadow.xl');
  assert.equal(
    nodeAt(E.themeSource(doc, 'dark') ?? {}, 'shadow.xl'),
    undefined,
  );
  assert.deepEqual(nodeAt(E.foundation(doc), 'shadow.xl'), shadow);
});

test('setToken writes a path, creating groups', () => {
  const doc = E.setToken(load(), 'radius.lg', {
    $value: { value: 12, unit: 'px' },
  });
  assert.deepEqual(nodeAt(E.foundation(doc), 'radius.lg')?.$value, {
    value: 12,
    unit: 'px',
  });
});

test('removeToken deletes only that token', () => {
  const doc = E.removeToken(
    E.setToken(load(), 'duration.slow', {
      $type: 'duration',
      $value: { value: 400, unit: 'ms' },
    }),
    'duration.slow',
  );
  assert.equal(nodeAt(E.foundation(doc), 'duration.slow'), undefined);
  assert.ok(nodeAt(E.foundation(doc), 'duration.fast'));
});

test('removing the logo item clears the logo choice', () => {
  const items = [{ label: 'a', src: 'logos/a.svg' }];
  const meta = E.removeItem(
    {
      assetGroups: [{ id: 'logos', items }],
      fontFiles: [],
      logo: 'logos/a.svg',
    },
    'logos',
    'logos/a.svg',
  );
  assert.equal(meta.logo, undefined);
});

test('removing a group clears its selected logo but preserves logos in other groups', () => {
  const meta: BrandMeta = {
    assetGroups: [
      { id: 'logos', items: [{ src: 'logos/a.svg' }] },
      { id: 'icons', items: [{ src: 'icons/b.svg' }] },
    ],
    fontFiles: [],
    logo: 'logos/a.svg',
  };
  assert.equal(E.removeGroup(meta, 'logos').logo, undefined);
  assert.equal(
    E.removeGroup({ ...meta, logo: 'icons/b.svg' }, 'logos').logo,
    'icons/b.svg',
  );
});

test('asset groups: add with a unique id, rename, move, remove', () => {
  let meta: BrandMeta = {
    assetGroups: [{ id: 'logos', label: 'Logos', items: [] }],
    fontFiles: [],
  };
  meta = E.addGroup(meta, 'Logos');
  assert.deepEqual(
    meta.assetGroups.map((g) => g.id),
    ['logos', 'logos-2'],
  );
  meta = E.renameGroup(meta, 'logos-2', 'Patterns');
  assert.equal(meta.assetGroups[1].label, 'Patterns');
  meta = E.moveGroup(meta, 'logos-2', -1);
  assert.deepEqual(
    meta.assetGroups.map((g) => g.id),
    ['logos-2', 'logos'],
  );
  meta = E.removeGroup(meta, 'logos');
  assert.deepEqual(
    meta.assetGroups.map((g) => g.id),
    ['logos-2'],
  );
});

test('items: add, update, move, remove', () => {
  let meta: BrandMeta = {
    assetGroups: [{ id: 'g', label: 'G', items: [] }],
    fontFiles: [],
  };
  meta = E.addItems(meta, 'g', [
    { label: 'a', src: 'g/a.svg' },
    { label: 'b', src: 'g/b.svg' },
  ]);
  meta = E.updateItem(meta, 'g', 'g/a.svg', { description: 'first' });
  meta = E.moveItem(meta, 'g', 'g/b.svg', -1);
  assert.deepEqual(
    meta.assetGroups[0].items.map((i) => i.src),
    ['g/b.svg', 'g/a.svg'],
  );
  assert.equal(meta.assetGroups[0].items[1].description, 'first');
  meta = E.removeItem(meta, 'g', 'g/a.svg');
  assert.deepEqual(
    meta.assetGroups[0].items.map((i) => i.src),
    ['g/b.svg'],
  );
});

test('font files are deduplicated by src', () => {
  let meta: BrandMeta = { assetGroups: [], fontFiles: [] };
  meta = E.addFontFiles(
    meta,
    ['fonts/a.woff2', 'fonts/a.woff2', 'fonts/b.woff2'].map((src) => ({
      src,
      family: 'A',
      weight: 400,
      style: 'normal',
    })),
  );
  assert.equal(meta.fontFiles.length, 2);
  assert.equal(E.removeFontFile(meta, 'fonts/a.woff2').fontFiles.length, 1);
});

test('uniquePath avoids existing session paths', () => {
  assert.equal(
    uniquePath('g/a.svg', new Set(['g/a.svg', 'g/a-2.svg'])),
    'g/a-3.svg',
  );
});

test('fontFromFileName guesses family, weight and style', () => {
  assert.deepEqual(E.fontFromFileName('Inter-BoldItalic.woff2'), {
    family: 'Inter',
    weight: 700,
    style: 'italic',
  });
  assert.deepEqual(E.fontFromFileName('my_font.ttf'), {
    family: 'my font',
    weight: 400,
    style: 'normal',
  });
});

test('removeStep drops the token and its place in the scale, so regenerating does not bring it back', () => {
  const group = {
    $extensions: {
      v: { scale: { base: { value: 4, unit: 'px' }, steps: { sm: 1, md: 2 } } },
    },
    sm: { $value: { value: 4, unit: 'px' } },
    md: { $value: { value: 8, unit: 'px' } },
  };
  const out = removeStep(group, 'md', 'v');
  assert.equal(out.md, undefined);
  assert.deepEqual(vendorData(out, 'v').scale, {
    base: { value: 4, unit: 'px' },
    steps: { sm: 1 },
  });
});
