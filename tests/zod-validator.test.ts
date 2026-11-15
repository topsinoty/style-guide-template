import { test } from 'vitest';
import assert from 'node:assert/strict';
import { keysOf } from '../src/lib/records';
import type { ResolverDoc } from '../src/lib/types';
import { load, present, removeAt, setAt } from './helpers';
import { isResolver, toResolver } from '../src/lib/document';
import { validateResolver } from '../src/adapters/zod-validator';

const tree = (doc: ResolverDoc) => doc.sets.foundation.sources[0];

test('minimal fixture is valid', () => {
  assert.deepEqual(validateResolver(load()).errors, []);
});

test('wrong version', () => {
  const r = validateResolver({ ...load(), version: '1' });
  assert.equal(r.ok, false);
  assert.match(r.errors[0].message, /2025\.10/);
});

test('missing $type is an error', () => {
  const doc = load();
  removeAt(tree(doc), 'spacing.$type');
  const r = validateResolver(doc);
  assert.ok(
    r.errors.some(
      (e) => e.path?.endsWith('spacing.md') && e.message.includes('$type'),
    ),
    JSON.stringify(r.errors),
  );
});

test('$type inherited from group is valid', () => {
  const doc = load();
  setAt(tree(doc), 'radius.lg', { $value: { value: 12, unit: 'px' } });
  assert.equal(validateResolver(doc).ok, true);
});

test('bad dimension unit', () => {
  const doc = load();
  setAt(tree(doc), 'spacing.md.$value.unit', 'em');
  assert.ok(
    validateResolver(doc).errors.some((e) => e.message.includes('px|rem')),
  );
});

test('bad color space', () => {
  const doc = load();
  setAt(tree(doc), 'color.brand.700.$value.colorSpace', 'cmyk');
  assert.ok(
    validateResolver(doc).errors.some(
      (e) =>
        e.path?.endsWith('color.brand.700') && e.message.includes('colorSpace'),
    ),
  );
});

test('unknown $ key is an error', () => {
  const doc = load();
  setAt(tree(doc), 'color.$foo', 1);
  assert.ok(
    validateResolver(doc).errors.some((e) => e.message.includes('$foo')),
  );
});

test('resolutionOrder must point at existing sets and modifiers', () => {
  const doc = load();
  doc.resolutionOrder.push({ $ref: '#/sets/nope' });
  assert.ok(
    validateResolver(doc).errors.some((e) => e.message.includes('#/sets/nope')),
  );
});

test('foreign tokens and $root are valid', () => {
  const doc = load();
  setAt(tree(doc), 'color.accent', {
    $root: { $value: '{color.brand.600}' },
    light: { $value: '{color.brand.700}' },
  });
  tree(doc).size = {
    $type: 'dimension',
    huge: { $value: { value: 100, unit: 'rem' } },
  };
  assert.deepEqual(validateResolver(doc).errors, []);
});

test('plain tokens become a resolver', () => {
  const r = toResolver({ color: { $type: 'color' } }, 'X');
  assert.equal(isResolver(r), true);
  assert.equal(r.version, '2025.10');
  assert.equal(r.name, 'X');
  assert.deepEqual(keysOf(present(r.modifiers).theme.contexts), [
    'light',
    'dark',
  ]);
  assert.deepEqual(r.sets.foundation.sources, [{ color: { $type: 'color' } }]);
  assert.equal(validateResolver(r).ok, true);
});

test('a resolver passes through toResolver unchanged', () => {
  const doc = load();
  assert.equal(toResolver(doc, 'X'), doc);
});

test('color components must have three entries', () => {
  const doc = load();
  setAt(tree(doc), 'color.brand.700.$value.components', [0.5]);
  assert.ok(
    validateResolver(doc).errors.some((e) => e.message.includes('components')),
  );
});

test('border and transition sub-values are validated', () => {
  const doc = load();
  tree(doc).border = {
    $type: 'border',
    bad: {
      $value: {
        color: '{color.brand.600}',
        width: { value: 1, unit: 'px' },
        style: 'solid;}html{x:y',
      },
    },
  };
  tree(doc).transition = {
    $type: 'transition',
    bad: {
      $value: {
        duration: { value: 1, unit: 'em' },
        delay: { value: 0, unit: 'ms' },
        timingFunction: [0, 0, 1, 1],
      },
    },
  };
  const errors = validateResolver(doc).errors;
  assert.ok(errors.some((e) => e.path?.endsWith('border.bad')));
  assert.ok(errors.some((e) => e.path?.endsWith('transition.bad')));
});

test('names with { } . are rejected (DTCG)', () => {
  const doc = load();
  setAt(tree(doc), 'color.a{b', { $value: '{color.brand.600}' });
  assert.ok(
    validateResolver(doc).errors.some((e) => e.message.includes('name')),
  );
});
