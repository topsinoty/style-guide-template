import { test } from 'vitest';
import { valueAt } from '../src/lib/records.js';
import assert from 'node:assert/strict';
import { zodValidator } from '../src/adapters/zod-validator.js';
import { parseCssColor } from '../src/lib/color.js';
import { checkBrand } from '../src/lib/io.js';
import {
  addColor,
  addShade,
  blankBrand,
  generateShades,
  handSetShades,
  moveColor,
  paletteColors,
  referencesTo,
  removeColor,
  renameColor,
  removeShade,
  renameShade,
  setBase,
  setShade,
} from '../src/lib/palette.js';
import type { ResolverDoc } from '../src/lib/types.js';
import { child, children, nodeAt, withVendorData } from '../src/lib/tree.js';
import { resolve } from '../src/lib/resolver.js';
import { checkContrast, ROLES } from '../src/lib/contrast.js';
import { foundation, setToken } from '../src/lib/edit.js';
import { setStep } from '../src/lib/scale.js';
import { narrow, isColor } from '../src/lib/values.js';
import { present, preset, V } from './helpers.js';

const teal = present(parseCssColor('teal'));
const pink = present(parseCssColor('#ff3399'));
const colorOf = (doc: ResolverDoc, id: string) =>
  present(paletteColors(doc, V).find((c) => c.id === id));
const shadeOf = (doc: ResolverDoc, id: string, name: string) =>
  present(colorOf(doc, id).shades.find((s) => s.name === name));
const foundationAt = (doc: ResolverDoc, path: string) =>
  nodeAt(doc.sets.foundation.sources[0], path);
const darkTheme = (doc: ResolverDoc) =>
  present(valueAt(doc.modifiers, 'theme')?.contexts.dark.at(0));
const valid = (doc: ResolverDoc) =>
  assert.deepEqual(checkBrand(doc, zodValidator), []);

test('preset palettes keep their numeric scale and 600 as the base', () => {
  const brand = colorOf(preset(), 'brand');
  assert.equal(brand.shades.length, 11);
  assert.deepEqual(
    brand.shades.slice(0, 3).map((s) => s.name),
    ['50', '100', '200'],
  );
  assert.equal(present(brand.shades.find((s) => s.isBase)).name, '600');
  assert.ok(!paletteColors(preset(), V).some((c) => c.id === 'primary'));
});

test('a new color starts as one base shade', () => {
  const doc = addColor(preset(), 'accent', teal, V);
  const accent = colorOf(doc, 'accent');
  assert.deepEqual(
    accent.shades.map((s) => [s.name, s.isBase, s.byHand]),
    [['base', true, false]],
  );
  valid(doc);
});

test('named shades come before numeric ones', () => {
  let doc = addColor(preset(), 'accent', teal, V);
  doc = generateShades(doc, 'accent', V, 'keep');
  doc = addShade(doc, { color: 'accent', shade: 'light' }, pink, V);
  const names = colorOf(doc, 'accent').shades.map((s) => s.name);
  assert.deepEqual(names.slice(0, 2), ['light', '50']);
  assert.equal(names.length, 12);
  valid(doc);
});

test('editing a shade marks it as set by hand, editing the base does not', () => {
  let doc = setShade(preset(), { color: 'brand', shade: '300' }, pink, V);
  assert.equal(shadeOf(doc, 'brand', '300').byHand, true);
  doc = setShade(doc, { color: 'brand', shade: '600' }, teal, V);
  assert.equal(shadeOf(doc, 'brand', '600').byHand, false);
  assert.deepEqual(handSetShades(doc, 'brand', V), ['300']);
});

test('regenerating keeps hand-set shades unless told to overwrite them', () => {
  const edited = setShade(preset(), { color: 'brand', shade: '300' }, pink, V);
  const kept = generateShades(edited, 'brand', V, 'keep');
  assert.deepEqual(shadeOf(kept, 'brand', '300').color, pink);
  const overwritten = generateShades(edited, 'brand', V, 'overwrite');
  assert.notDeepEqual(shadeOf(overwritten, 'brand', '300').color, pink);
  assert.equal(shadeOf(overwritten, 'brand', '300').byHand, false);
  assert.deepEqual(handSetShades(overwritten, 'brand', V), []);
  valid(overwritten);
});

test("regenerating keeps a shade's CMYK and Pantone", () => {
  const doc = preset();
  present(foundationAt(doc, 'color.brand.300')).$extensions = {
    [V]: { pantone: 'Pantone 2728 C' },
  };
  const out = generateShades(doc, 'brand', V, 'overwrite');
  assert.deepEqual(foundationAt(out, 'color.brand.300')?.$extensions, {
    [V]: { pantone: 'Pantone 2728 C' },
  });
});

test('the base shade itself is never regenerated', () => {
  const doc = setShade(preset(), { color: 'brand', shade: '600' }, pink, V);
  assert.deepEqual(
    shadeOf(generateShades(doc, 'brand', V, 'overwrite'), 'brand', '600').color,
    pink,
  );
});

test('references are found in every theme', () => {
  const refs = referencesTo(preset(), 'brand', ['600']);
  assert.ok(
    refs.some(
      (r) =>
        r.context === 'foundation' && r.path === 'color.primary.background',
    ),
  );
  assert.ok(
    referencesTo(preset(), 'brand', ['400']).some(
      (r) => r.context === 'dark theme',
    ),
  );
});

test('renaming a shade repoints every alias to it', () => {
  const doc = renameShade(
    preset(),
    { color: 'brand', shade: '600' },
    'main',
    V,
  );
  assert.equal(
    foundationAt(doc, 'color.primary.background')?.$value,
    '{color.brand.main}',
  );
  assert.equal(shadeOf(doc, 'brand', 'main').isBase, true);
  assert.deepEqual(referencesTo(doc, 'brand', ['600']), []);
  valid(doc);
});

test('removing a shade inlines its color where it was used', () => {
  const before = preset();
  const color = foundationAt(before, 'color.brand.400')?.$value;
  const doc = removeShade(before, 'brand', '400', V);
  assert.ok(!colorOf(doc, 'brand').shades.some((s) => s.name === '400'));
  assert.ok(JSON.stringify(darkTheme(doc)).includes(JSON.stringify(color)));
  assert.deepEqual(referencesTo(doc, 'brand', ['400']), []);
  valid(doc);
});

test('the base shade cannot be removed', () => {
  const doc = removeShade(preset(), 'brand', '600', V);
  assert.ok(colorOf(doc, 'brand').shades.some((s) => s.name === '600'));
});

test('removing a color inlines all of its shades', () => {
  const doc = removeColor(preset(), 'brand');
  assert.ok(!paletteColors(doc, V).some((c) => c.id === 'brand'));
  assert.deepEqual(referencesTo(doc, 'brand'), []);
  valid(doc);
});

test('removing the last palette color leaves roles in black and white', () => {
  let doc = preset();
  for (const { id } of paletteColors(doc, V)) doc = removeColor(doc, id);
  assert.deepEqual(paletteColors(doc, V), []);
  const background = foundationAt(doc, 'color.primary.background')?.$value;
  const foreground = foundationAt(doc, 'color.primary.foreground')?.$value;
  const lightness = (value: unknown) =>
    present(narrow(value, isColor)).components[0];
  assert.deepEqual(
    [lightness(background), lightness(foreground)].sort(
      (a, b) => Number(a) - Number(b),
    ),
    [0, 1],
  );
  valid(doc);
});

test('removing one of several colors keeps the other roles in color', () => {
  const doc = removeColor(preset(), 'red');
  assert.equal(
    foundationAt(doc, 'color.primary.background')?.$value,
    '{color.brand.600}',
  );
});

test('any shade can become the base', () => {
  const doc = setBase(preset(), 'brand', '400', V);
  assert.equal(shadeOf(doc, 'brand', '400').isBase, true);
  assert.equal(shadeOf(doc, 'brand', '600').isBase, false);
});

test('$ref pointers count as references too', () => {
  const doc = preset();
  present(foundationAt(doc, 'color')).link = {
    $value: { $ref: '#/color/brand/500/$value' },
  };
  assert.ok(
    referencesTo(doc, 'brand', ['500']).some((r) => r.path === 'color.link'),
  );
  const renamed = renameShade(doc, { color: 'brand', shade: '500' }, 'mid', V);
  assert.equal(
    foundationAt(renamed, 'color.link')?.$value,
    '{color.brand.mid}',
  );
  valid(renamed);
  const removed = removeShade(doc, 'brand', '500', V);
  assert.deepEqual(
    foundationAt(removed, 'color.link')?.$value,
    foundationAt(doc, 'color.brand.500')?.$value,
  );
  valid(removed);
});

test('references in other sets and modifiers are found', () => {
  const doc = preset();
  doc.sets.extra = {
    sources: [
      { color: { $type: 'color', note: { $value: '{color.brand.500}' } } },
    ],
  };
  doc.modifiers = {
    ...doc.modifiers,
    density: {
      contexts: {
        compact: [
          { color: { $type: 'color', tint: { $value: '{color.brand.500}' } } },
        ],
      },
    },
  };
  const where = new Set(
    referencesTo(doc, 'brand', ['500']).map((r) => r.context),
  );
  assert.ok(where.has('extra set'));
  assert.ok(where.has('density compact'));
});

test('edits never mutate the input', () => {
  const doc = preset();
  const snapshot = JSON.stringify(doc);
  addColor(doc, 'accent', teal, V);
  setShade(doc, { color: 'brand', shade: '300' }, pink, V);
  renameShade(doc, { color: 'brand', shade: '600' }, 'main', V);
  removeShade(doc, 'brand', '400', V);
  removeColor(doc, 'brand');
  generateShades(doc, 'brand', V, 'overwrite');
  assert.equal(JSON.stringify(doc), snapshot);
});

test('reset keeps the preset spacing scale as a starting point', () => {
  const doc = preset();
  const blank = blankBrand(doc, V);
  assert.deepEqual(
    nodeAt(blank.sets.foundation.sources[0], 'spacing'),
    nodeAt(doc.sets.foundation.sources[0], 'spacing'),
  );
  assert.ok(resolve(blank).has('spacing.md'));
});

test('a blank brand can set a scale base before adding steps', () => {
  const blank = blankBrand(preset(), V);
  const group = withVendorData({ $type: 'dimension' }, V, {
    scale: { base: { value: 8, unit: 'px' }, steps: {} },
  });
  const withBase = setToken(blank, 'spacing', group);
  assert.deepEqual(checkBrand(withBase, zodValidator), []);
  assert.deepEqual(
    nodeAt(withBase.sets.foundation.sources[0], 'spacing'),
    group,
  );
});

test('a blank brand can gain a new scale step without loading a preset', () => {
  const blank = blankBrand(preset(), V);
  const withSpacing = setToken(
    blank,
    'spacing',
    setStep({ $type: 'dimension' }, 'sm', { value: 8, unit: 'px' }, V),
  );
  assert.deepEqual(checkBrand(withSpacing, zodValidator), []);
  assert.deepEqual(resolve(withSpacing).get('spacing.sm')?.resolved, {
    value: 8,
    unit: 'px',
  });
});

test('renaming a palette color preserves shades and updates role references in both themes', () => {
  const doc = preset();
  const before = resolve(doc, { theme: 'light' }).get(
    'color.primary.background',
  )?.resolved;
  const darkBefore = resolve(doc, { theme: 'dark' }).get(
    'color.primary.background',
  )?.resolved;
  const renamed = renameColor(doc, 'brand', 'ocean');
  assert.ok(renamed !== doc);
  assert.equal(
    nodeAt(renamed.sets.foundation.sources[0], 'color.brand'),
    undefined,
  );
  assert.ok(nodeAt(renamed.sets.foundation.sources[0], 'color.ocean.600'));
  assert.deepEqual(
    resolve(renamed, { theme: 'light' }).get('color.primary.background')
      ?.resolved,
    before,
  );
  assert.deepEqual(
    resolve(renamed, { theme: 'dark' }).get('color.primary.background')
      ?.resolved,
    darkBefore,
  );
  assert.deepEqual(checkBrand(renamed, zodValidator), []);
  assert.equal(renameColor(renamed, 'ocean', 'red'), renamed);
  assert.equal(renameColor(renamed, 'ocean', 'ocean'), renamed);
});

test('a blank brand accepts new shadow and typography styles', () => {
  let blank = blankBrand(preset(), V);
  blank = setToken(blank, 'shadow.soft', {
    $type: 'shadow',
    $value: {
      color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.1 },
      offsetX: { value: 0, unit: 'px' },
      offsetY: { value: 2, unit: 'px' },
      blur: { value: 4, unit: 'px' },
      spread: { value: 0, unit: 'px' },
    },
  });
  blank = setToken(blank, 'font.body', {
    $type: 'fontFamily',
    $value: ['sans-serif'],
  });
  blank = setToken(blank, 'typography.caption', {
    $type: 'typography',
    $value: {
      fontFamily: ['sans-serif'],
      fontSize: { value: 1, unit: 'rem' },
      fontWeight: 400,
      letterSpacing: { value: 0, unit: 'px' },
      lineHeight: 1.5,
    },
  });
  assert.deepEqual(checkBrand(blank, zodValidator), []);
  assert.ok(resolve(blank).has('font.body'));
  assert.ok(resolve(blank).has('shadow.soft'));
  assert.ok(resolve(blank).has('typography.caption'));
});

test('a blank brand keeps only role colors, pointing at a black and white palette', () => {
  const blank = blankBrand(preset(), V);
  assert.deepEqual(checkBrand(blank, zodValidator), []);
  assert.deepEqual(
    paletteColors(blank, V).map((color) => color.id),
    ['black', 'white'],
  );
  for (const theme of ['light', 'dark'])
    for (const [path, token] of resolve(blank, { theme })) {
      assert.ok(path.startsWith('color.') || path.startsWith('spacing.'), path);
      const group = path.split('.')[1];
      if (!ROLES.includes(group)) continue;
      const color = narrow(token.resolved, isColor);
      assert.ok(
        color && (color.components[0] === 0 || color.components[0] === 1),
        path,
      );
    }
  assert.deepEqual(
    checkContrast(blank).filter((result) => result.ratio < 21),
    [],
  );
});

test('moveColor swaps a palette color with its neighbour and leaves roles in place', () => {
  const doc = preset();
  const keys = (d: ResolverDoc) =>
    children(child(foundation(d), 'color')).map(([key]) => key);
  const hues = new Set(['brand', 'neutral', 'red', 'green', 'amber']);
  const moved = keys(moveColor(doc, 'neutral', -1));
  assert.deepEqual(
    moved.filter((k) => hues.has(k)),
    ['neutral', 'brand', 'red', 'green', 'amber'],
  );
  assert.deepEqual(
    moved.filter((k) => !hues.has(k)),
    keys(doc).filter((k) => !hues.has(k)),
  );
  assert.equal(moveColor(doc, 'brand', -1), doc);
});
