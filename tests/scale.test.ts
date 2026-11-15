import { test } from 'vitest';
import assert from 'node:assert/strict';
import { keysOf } from '../src/lib/records.js';
import { child, withVendorData } from '../src/lib/tree.js';
import { present, V } from './helpers.js';
import {
  generateScale,
  applyScale,
  addScaleStep,
  setStep,
  setScaleUnit,
  type ScaleSpec,
} from '../src/lib/scale.js';
import type { TokenNode } from '../src/lib/types.js';

const spacing = {
  base: { value: 4, unit: 'px' },
  steps: { xs: 1, sm: 2, md: 4, lg: 6, xl: 8, '2xl': 12, '3xl': 16 },
};
const groupWith = (scale: ScaleSpec): TokenNode => ({
  $type: 'dimension',
  $extensions: { [V]: { scale: structuredClone(scale) } },
});

test('linear scale', () => {
  assert.deepEqual(generateScale(spacing).md, { value: 16, unit: 'px' });
  assert.deepEqual(generateScale(spacing)['3xl'], { value: 64, unit: 'px' });
});

test('ratio scale', () => {
  const type = {
    base: { value: 1, unit: 'rem' },
    ratio: 1.25,
    steps: { xs: -2, md: 0, '4xl': 5 },
  };
  assert.deepEqual(generateScale(type).xs, { value: 0.64, unit: 'rem' });
  assert.deepEqual(generateScale(type)['4xl'], { value: 3.0518, unit: 'rem' });
});

test('applyScale writes every step and keeps other extensions', () => {
  const g = groupWith(spacing);
  present(g.$extensions)['org.tool.x'] = { a: 1 };
  const out = applyScale(g, V);
  assert.deepEqual(
    keysOf(out).filter((k) => !k.startsWith('$')),
    keysOf(spacing.steps),
  );
  assert.deepEqual(out.$extensions?.['org.tool.x'], { a: 1 });
  assert.equal('md' in g, false, 'input not mutated');
});

test('new steps track the base and ratio when regenerated', () => {
  const group = addScaleStep(applyScale(groupWith(spacing), V), '4xl', 20, V);
  assert.deepEqual(child(group, '4xl')?.$value, { value: 80, unit: 'px' });
  assert.deepEqual(child(group, '4xl')?.$extensions?.[V], undefined);
  const next = applyScale(
    withVendorData(group, V, {
      scale: {
        ...spacing,
        steps: { ...spacing.steps, '4xl': 20 },
        base: { value: 5, unit: 'px' },
      },
    }),
    V,
  );
  assert.deepEqual(child(next, '4xl')?.$value, { value: 100, unit: 'px' });
});

test('a hand override survives regeneration', () => {
  let g = applyScale(groupWith(spacing), V);
  g = setStep(g, 'md', { value: 18, unit: 'px' }, V);
  g = applyScale(
    {
      ...g,
      $extensions: {
        [V]: { scale: { ...spacing, base: { value: 8, unit: 'px' } } },
      },
    },
    V,
  );
  assert.deepEqual(child(g, 'md')?.$value, { value: 18, unit: 'px' });
  assert.deepEqual(child(g, 'lg')?.$value, { value: 48, unit: 'px' });
});

test('setScaleUnit converts the base and hand-set steps between px and rem', () => {
  const g = setStep(
    applyScale(groupWith(spacing), V),
    'xs',
    { value: 6, unit: 'px' },
    V,
  );
  const rem = setScaleUnit(g, 'rem', V);
  assert.deepEqual(child(rem, 'md')?.$value, { value: 1, unit: 'rem' });
  assert.deepEqual(child(rem, 'xs')?.$value, { value: 0.375, unit: 'rem' });
  assert.deepEqual(child(setScaleUnit(rem, 'px', V), 'xs')?.$value, {
    value: 6,
    unit: 'px',
  });
});
