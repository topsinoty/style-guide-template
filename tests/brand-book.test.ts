import { test } from 'vitest';
import assert from 'node:assert/strict';
import { zodValidator } from '../src/adapters/zod-validator.js';
import { brandMeta, withBrandMeta } from '../src/lib/assets.js';
import { checkContrast } from '../src/lib/contrast.js';
import { generateCss } from '../src/lib/css.js';
import {
  addStandardStyles,
  elementStyles,
  setElement,
} from '../src/lib/elements.js';
import * as E from '../src/lib/edit.js';
import { checkBrand } from '../src/lib/io.js';
import { parseBlocks } from '../src/lib/markdown.js';
import {
  addColor,
  generateShades,
  paletteColors,
  roleFromShade,
} from '../src/lib/palette.js';
import { oklch } from '../src/lib/color.js';
import { resolve } from '../src/lib/resolver.js';
import { nodeAt } from '../src/lib/tree.js';
import { isTypography, narrow } from '../src/lib/values.js';
import type { BrandMeta } from '../src/lib/types.js';
import {
  addSection,
  editSection,
  moveSection,
  removeSection,
  sectionsOf,
  visibleSections,
} from '../src/vue/guide/sections.js';
import { load, preset, token, V } from './helpers.js';

test('markdown: headings, paragraphs, lists and inline marks; unsafe links stay text', () => {
  const blocks = parseBlocks(
    '## Voice\nWrite **short**, use `code` and *you*.\n- one\n- [two](https://x.test)\n\n[bad](javascript:alert(1))',
  );
  assert.deepEqual(
    blocks.map((b) => b.kind),
    ['heading', 'paragraph', 'list', 'paragraph'],
  );
  assert.deepEqual(
    blocks[1].kind === 'paragraph' && blocks[1].inline.map((i) => i.kind),
    ['text', 'strong', 'text', 'code', 'text', 'em', 'text'],
  );
  assert.deepEqual(blocks[2].kind === 'list' && blocks[2].items[1], [
    { kind: 'link', text: 'two', href: 'https://x.test' },
  ]);
  assert.ok(
    blocks[3].kind === 'paragraph' &&
      blocks[3].inline.every((i) => i.kind === 'text'),
  );
});

const meta = (extra: Partial<BrandMeta> = {}): BrandMeta => ({
  assetGroups: [],
  fontFiles: [],
  ...extra,
});
const ids = (m: BrandMeta) => sectionsOf(m, resolve(load())).map((s) => s.id);

test('sections: a new text section goes before Code, edits keep the order, moves and removals work', () => {
  const tokens = resolve(load());
  const defaults = ids(meta());
  let m = addSection(meta(), tokens, 'Voice and tone');
  const beforeCode = [
    ...defaults.slice(0, -1),
    'text-voice-and-tone',
    'css-variables',
  ];
  assert.deepEqual(ids(m), beforeCode);
  m = editSection(m, tokens, 'colors', { body: 'Use ink on ground.' });
  assert.deepEqual(ids(m), beforeCode);
  assert.equal(
    sectionsOf(m, tokens).find((s) => s.id === 'colors')?.body,
    'Use ink on ground.',
  );
  m = moveSection(m, tokens, 'text-voice-and-tone', -1);
  assert.equal(ids(m).at(-3), 'text-voice-and-tone');
  m = removeSection(m, tokens, 'colors');
  assert.ok(ids(m).includes('colors'), 'built-in sections cannot be removed');
  m = removeSection(m, tokens, 'text-voice-and-tone');
  assert.deepEqual(ids(m), defaults);
});

test('sections: a group added after the brand set its order goes after its default neighbour', () => {
  const tokens = resolve(load());
  const placed = moveSection(meta(), tokens, 'colors', 1);
  const m = {
    ...placed,
    assetGroups: [
      { id: 'icons', items: [] },
      { id: 'patterns', items: [] },
    ],
  };
  assert.deepEqual(ids(m).slice(0, 5), [
    'branding',
    'typography',
    'colors',
    'icons',
    'group-patterns',
  ]);
});

test('themes: add, rename (default follows), remove; the default theme stays', () => {
  let doc = E.addTheme(load(), 'poster');
  assert.deepEqual(E.themesOf(doc), ['light', 'dark', 'poster']);
  doc = E.renameTheme(doc, 'light', 'web');
  assert.equal(E.defaultTheme(doc), 'web');
  assert.deepEqual(E.themesOf(doc), ['web', 'dark', 'poster']);
  assert.equal(E.removeTheme(doc, 'web'), doc);
  doc = E.removeTheme(doc, 'dark');
  assert.deepEqual(E.themesOf(doc), ['web', 'poster']);
  assert.deepEqual(checkBrand(doc, zodValidator), []);
});

test('setRole on a theme that does not exist writes the default, never a new theme', () => {
  const doc = E.setRole(
    E.renameTheme(load(), 'light', 'poster'),
    'light',
    'primary.foreground',
    '#000000',
  );
  assert.deepEqual(E.themesOf(doc), ['poster', 'dark']);
  assert.equal(
    token(resolve(doc), 'color.primary.foreground').value,
    '#000000',
  );
});

test('descriptions are written to the foundation and survive regenerating shades', () => {
  let doc = E.setDescription(load(), 'color.brand.700', 'Links on cards.');
  doc = generateShades(doc, 'brand', V, 'overwrite');
  assert.equal(
    token(resolve(doc), 'color.brand.700').description,
    'Links on cards.',
  );
  doc = E.setDescription(doc, 'color.brand.700', '');
  assert.equal(
    nodeAt(E.foundation(doc), 'color.brand.700')?.$description,
    undefined,
  );
  assert.equal(E.setDescription(doc, 'color.blue', 'a group'), doc);
});

test('declared contrast pairs are checked in every theme', () => {
  const pair = { fg: 'color.brand.700', bg: 'color.brand.800', min: 4.5 };
  const results = checkContrast(load(), [pair]).filter(
    (r) => r.label === 'brand.700 on brand.800',
  );
  assert.deepEqual(
    results.map((r) => [r.context, r.pass]),
    [
      ['light', false],
      ['dark', false],
    ],
  );
});

test('brand metadata with only sections or contrast is validated and kept', () => {
  const doc = withBrandMeta(
    load(),
    V,
    meta({ sections: [{ id: 'text-a', body: 'Hi' }] }),
  );
  assert.deepEqual(brandMeta(doc, V).sections, [
    { id: 'text-a', title: undefined, body: 'Hi' },
  ]);
  const bad = withBrandMeta(
    load(),
    V,
    meta({ contrast: [{ fg: 'color.a', bg: 'color.b', min: 40 }] }),
  );
  assert.match(
    checkBrand(bad, zodValidator)[0]?.message ?? '',
    /min must be 1\.\.21/,
  );
});

test('root size sets the page font size as a percentage', () => {
  const doc = load();
  const at = (rootSize?: number) =>
    generateCss(withBrandMeta(doc, V, { ...brandMeta(doc, V), rootSize }), {
      vendor: V,
      fontSrc: (f) => f.src,
    });
  assert.match(at(10), /html \{\n {2}font-size: 62\.5%;/);
  assert.doesNotMatch(at(), /^html/m);
  assert.equal(
    brandMeta(withBrandMeta(doc, V, { ...brandMeta(doc, V), rootSize: 2 }), V)
      .rootSize,
    undefined,
  );
});

test('text styles map to elements by name, and setting one takes it from the others', () => {
  const group = { 'heading-1': {}, body: {}, caption: {} };
  assert.deepEqual(
    [...elementStyles({ typography: group }, V)],
    [
      ['h1', 'heading-1'],
      ['p', 'body'],
    ],
  );
  const moved = setElement(group, 'caption', 'h1', V);
  assert.deepEqual(
    [...elementStyles({ typography: moved }, V)],
    [
      ['p', 'body'],
      ['h1', 'caption'],
    ],
  );
});

test('roleFromShade fills a role from one shade, darker on a light page and lighter on a dark one', () => {
  const doc = preset();
  const colors = paletteColors(doc, 'com.example.styleguide');
  const light = roleFromShade(colors, { color: 'brand', shade: '600' }, false);
  assert.equal(light.background, '{color.brand.600}');
  assert.equal(light['background-hover'], '{color.brand.700}');
  assert.equal(light.foreground, '{color.neutral.50}');
  const dark = roleFromShade(colors, { color: 'brand', shade: '400' }, true);
  assert.equal(dark['background-active'], '{color.brand.200}');
  assert.equal(dark.foreground, '{color.neutral.950}');
});

test('generating shades from a lone base shade gives eleven steps, the base among them', () => {
  const doc = generateShades(
    addColor(load(), 'accent', oklch(0.5, 0.15, 260), V),
    'accent',
    V,
    'keep',
  );
  const accent = paletteColors(doc, V).find((c) => c.id === 'accent');
  assert.equal(accent?.shades.length, 11);
  assert.equal(
    accent.shades.some((s) => s.name === 'base'),
    false,
  );
});

test('roleFromShade can set the border apart from the background', () => {
  const doc = preset();
  const colors = paletteColors(doc, 'com.example.styleguide');
  assert.equal(
    roleFromShade(colors, { color: 'neutral', shade: '50' }, false, 2).border,
    '{color.neutral.200}',
  );
  assert.equal(
    roleFromShade(colors, { color: 'neutral', shade: '50' }, false, 5).border,
    '{color.neutral.500}',
  );
});

test('view mode hides sections with nothing to show; editing and written text keep them', () => {
  const meta: BrandMeta = {
    assetGroups: [{ id: 'icons', items: [] }],
    fontFiles: [],
  };
  const tokens = new Map(
    [...resolve(load())].filter(([path]) => !path.startsWith('shadow.')),
  );
  const ids = (m: BrandMeta, editable: boolean) =>
    visibleSections(m, tokens, editable).map((s) => s.id);
  assert.ok(!ids(meta, false).includes('shadow'));
  assert.ok(!ids(meta, false).includes('icons'));
  assert.ok(ids(meta, true).includes('shadow'));
  assert.ok(
    ids(
      { ...meta, sections: [{ id: 'shadow', body: 'Use sparingly.' }] },
      false,
    ).includes('shadow'),
  );
});

test('standard text styles fill the chosen elements with the fonts and sizes the brand has', () => {
  const group = addStandardStyles(
    { $type: 'typography' },
    ['h1', 'p', 'code'],
    { fonts: ['heading', 'body'], sizes: ['sm', 'md', '3xl'], vendor: V },
  );
  const styles = elementStyles({ typography: group }, V);
  assert.equal(styles.get('h1'), 'heading-1');
  assert.equal(styles.get('p'), 'body');
  assert.equal(styles.get('code'), 'code');
  assert.deepEqual(nodeAt(group, 'heading-1')?.$value, {
    fontFamily: '{font.heading}',
    fontSize: '{font-size.3xl}',
    fontWeight: 700,
    letterSpacing: { value: 0, unit: 'px' },
    lineHeight: 1.2,
  });
  assert.equal(
    narrow(nodeAt(group, 'code')?.$value, isTypography)?.fontFamily,
    '{font.body}',
  );
});

test('an asset keeps its background and full-width setting through validation', () => {
  const logo = {
    src: 'logos/a.svg',
    background: '{color.neutral.950}',
    wide: true,
  };
  const doc = withBrandMeta(
    load(),
    V,
    meta({ assetGroups: [{ id: 'logos', items: [logo] }] }),
  );
  assert.deepEqual(checkBrand(doc, zodValidator), []);
  assert.deepEqual(brandMeta(doc, V).assetGroups[0].items[0], {
    ...logo,
    label: undefined,
    description: undefined,
    provider: undefined,
  });
});
