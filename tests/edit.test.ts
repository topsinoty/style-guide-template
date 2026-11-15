import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  nodeAt,
  vendorData,
  addFontFiles,
  addGroup,
  addItems,
  fontFromFileName,
  foundation,
  moveGroup,
  moveItem,
  removeFontFile,
  removeGroup,
  removeItem,
  removeThemed,
  removeToken,
  renameGroup,
  setRole,
  setThemed,
  setToken,
  themeSource,
  updateItem,
  removeStep,
  uniquePath,
  resolve,
} from '~/lib';
import { token, load } from './helpers';
import type { BrandMeta } from '~/lib';

test('setRole in light writes the foundation, in dark writes the dark context', () => {
  let doc = setRole(
    load(),
    'light',
    'primary.foreground',
    '{color.neutral.900}',
  );
  assert.equal(
    token(resolve(doc), 'color.primary.foreground').value,
    '{color.neutral.900}',
  );
  doc = setRole(doc, 'dark', 'primary.foreground', '{color.neutral.50}');
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
  let doc = setThemed(load(), 'dark', 'shadow.xl', shadow);
  assert.deepEqual(nodeAt(themeSource(doc, 'dark') ?? {}, 'shadow.xl'), shadow);
  assert.equal(nodeAt(foundation(doc), 'shadow.xl'), undefined);
  doc = setThemed(doc, 'light', 'shadow.xl', shadow);
  doc = removeThemed(doc, 'dark', 'shadow.xl');
  assert.equal(nodeAt(themeSource(doc, 'dark') ?? {}, 'shadow.xl'), undefined);
  assert.deepEqual(nodeAt(foundation(doc), 'shadow.xl'), shadow);
});

test('setToken writes a path, creating groups', () => {
  const doc = setToken(load(), 'radius.lg', {
    $value: { value: 12, unit: 'px' },
  });
  assert.deepEqual(nodeAt(foundation(doc), 'radius.lg')?.$value, {
    value: 12,
    unit: 'px',
  });
});

test('removeToken deletes only that token', () => {
  const doc = removeToken(
    setToken(load(), 'duration.slow', {
      $type: 'duration',
      $value: { value: 400, unit: 'ms' },
    }),
    'duration.slow',
  );
  assert.equal(nodeAt(foundation(doc), 'duration.slow'), undefined);
  assert.ok(nodeAt(foundation(doc), 'duration.fast'));
});

test('removing the logo item clears the logo choice', () => {
  const items = [{ label: 'a', src: 'logos/a.svg' }];
  const meta = removeItem(
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
  assert.equal(removeGroup(meta, 'logos').logo, undefined);
  assert.equal(
    removeGroup({ ...meta, logo: 'icons/b.svg' }, 'logos').logo,
    'icons/b.svg',
  );
});

test('asset groups: add with a unique id, rename, move, remove', () => {
  let meta: BrandMeta = {
    assetGroups: [{ id: 'logos', label: 'Logos', items: [] }],
    fontFiles: [],
  };
  meta = addGroup(meta, 'Logos');
  assert.deepEqual(
    meta.assetGroups.map((g) => g.id),
    ['logos', 'logos-2'],
  );
  meta = renameGroup(meta, 'logos-2', 'Patterns');
  assert.equal(meta.assetGroups[1].label, 'Patterns');
  meta = moveGroup(meta, 'logos-2', -1);
  assert.deepEqual(
    meta.assetGroups.map((g) => g.id),
    ['logos-2', 'logos'],
  );
  meta = removeGroup(meta, 'logos');
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
  meta = addItems(meta, 'g', [
    { label: 'a', src: 'g/a.svg' },
    { label: 'b', src: 'g/b.svg' },
  ]);
  meta = updateItem(meta, 'g', 'g/a.svg', { description: 'first' });
  meta = moveItem(meta, 'g', 'g/b.svg', -1);
  assert.deepEqual(
    meta.assetGroups[0].items.map((i) => i.src),
    ['g/b.svg', 'g/a.svg'],
  );
  assert.equal(meta.assetGroups[0].items[1].description, 'first');
  meta = removeItem(meta, 'g', 'g/a.svg');
  assert.deepEqual(
    meta.assetGroups[0].items.map((i) => i.src),
    ['g/b.svg'],
  );
});

test('font files are deduplicated by src', () => {
  let meta: BrandMeta = { assetGroups: [], fontFiles: [] };
  meta = addFontFiles(
    meta,
    ['fonts/a.woff2', 'fonts/a.woff2', 'fonts/b.woff2'].map((src) => ({
      src,
      family: 'A',
      weight: 400,
      style: 'normal',
    })),
  );
  assert.equal(meta.fontFiles.length, 2);
  assert.equal(removeFontFile(meta, 'fonts/a.woff2').fontFiles.length, 1);
});

test('uniquePath avoids existing session paths', () => {
  assert.equal(
    uniquePath('g/a.svg', new Set(['g/a.svg', 'g/a-2.svg'])),
    'g/a-3.svg',
  );
});

test('fontFromFileName guesses family, weight and style', () => {
  assert.deepEqual(fontFromFileName('Inter-BoldItalic.woff2'), {
    family: 'Inter',
    weight: 700,
    style: 'italic',
  });
  assert.deepEqual(fontFromFileName('my_font.ttf'), {
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
