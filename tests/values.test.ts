import { test } from 'vitest';
import assert from 'node:assert/strict';
import * as z from 'zod/mini';
import { flatten, mergedTree, defaultInputs } from '../src/lib/resolver.js';
import { VALUES } from '../src/adapters/zod-validator.js';
import {
  isAlias,
  isBorder,
  isColor,
  isCubicBezier,
  isDuration,
  isFontFamily,
  isFontWeight,
  isShadow,
  isSize,
  isTransition,
  isTypography,
  narrow,
} from '../src/lib/values.js';
import { preset } from './helpers.js';

const red = { colorSpace: 'srgb', components: [1, 0, 0] };
const px = (value: number) => ({ value, unit: 'px' });

test('colors need a known space, three components and a valid alpha and hex', () => {
  assert.ok(isColor(red));
  assert.ok(isColor({ ...red, components: ['none', 0, 0], alpha: 0.5, hex: '#ff0000' }));
  assert.ok(!isColor({ ...red, colorSpace: 'cmyk' }));
  assert.ok(!isColor({ ...red, components: [1, 0] }));
  assert.ok(!isColor({ ...red, components: [1, 0, 'x'] }));
  assert.ok(!isColor({ ...red, alpha: 2 }));
  assert.ok(!isColor({ ...red, hex: 'red' }));
  assert.ok(!isColor('#ff0000'));
});

test('sizes and durations only accept their own units', () => {
  assert.ok(isSize(px(4)) && isSize({ value: 1, unit: 'rem' }));
  assert.ok(!isSize({ value: 1, unit: 'em' }) && !isSize({ value: '1', unit: 'px' }));
  assert.ok(isDuration({ value: 200, unit: 'ms' }) && !isDuration(px(200)));
});

test('font families, weights and curves', () => {
  assert.ok(isFontFamily('Inter') && isFontFamily(['Inter', 'sans-serif']));
  assert.ok(!isFontFamily([]) && !isFontFamily([1]));
  assert.ok(isFontWeight(700) && isFontWeight('bold'));
  assert.ok(!isFontWeight(0) && !isFontWeight(1001) && !isFontWeight('heavier'));
  assert.ok(isCubicBezier([0, 0, 1, 1]) && !isCubicBezier([0, 0, 1]));
});

test('composites accept aliases for their parts and reject missing parts', () => {
  const layer = { color: '{color.black}', offsetX: px(0), offsetY: px(1), blur: px(2), spread: px(0) };
  assert.ok(isShadow(layer) && isShadow([layer, '{shadow.sm}']));
  assert.ok(!isShadow({ ...layer, blur: undefined }));
  assert.ok(isBorder({ color: red, width: px(1), style: 'solid' }));
  assert.ok(!isBorder({ color: red, width: px(1), style: 'wavy' }));
  assert.ok(
    isTransition({
      duration: { value: 1, unit: 's' },
      delay: '{duration.fast}',
      timingFunction: [0, 0, 1, 1],
    }),
  );
  const typography = {
    fontFamily: '{font.body}',
    fontSize: px(16),
    fontWeight: 400,
    letterSpacing: px(0),
    lineHeight: 1.5,
  };
  assert.ok(isTypography(typography));
  assert.ok(!isTypography({ ...typography, letterSpacing: undefined }));
});

test('aliases are curly references or $ref pointers', () => {
  assert.ok(isAlias('{color.brand.600}') && isAlias({ $ref: '#/color/brand/600/$value' }));
  assert.ok(!isAlias('color.brand.600') && !isAlias('{a}{b}'));
});

test('narrow returns the value when the guard accepts it, otherwise null', () => {
  assert.equal(narrow(red, isColor), red);
  assert.equal(narrow('red', isColor), null);
});

test('guards agree with the brand file schema on every preset token', () => {
  const doc = preset();
  const guards: Record<string, (value: unknown) => boolean> = {
    color: isColor,
    dimension: isSize,
    duration: isDuration,
    cubicBezier: isCubicBezier,
    fontFamily: isFontFamily,
    fontWeight: isFontWeight,
    shadow: isShadow,
    border: isBorder,
    transition: isTransition,
    typography: isTypography,
  };
  const schemas: Record<string, z.core.$ZodType> = VALUES;
  let checked = 0;
  for (const [path, token] of flatten(mergedTree(doc, defaultInputs(doc)))) {
    const guard = token.type ? guards[token.type] : undefined;
    const schema = token.type ? schemas[token.type] : undefined;
    if (!guard || !schema || isAlias(token.value)) continue;
    assert.equal(guard(token.value), z.safeParse(schema, token.value).success, path);
    checked++;
  }
  assert.ok(checked > 50, `only ${checked} tokens checked`);
});
