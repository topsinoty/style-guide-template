import { test } from 'vitest';
import assert from 'node:assert/strict';
import { tokenValue } from '../src/vue/editor/other-tokens.js';

test('measures need a unit their type allows', () => {
  assert.deepEqual(tokenValue('duration', '200ms'), { value: 200, unit: 'ms' });
  assert.deepEqual(tokenValue('dimension', '1.5 rem'), { value: 1.5, unit: 'rem' });
  assert.equal(tokenValue('duration', '200px'), null);
  assert.equal(tokenValue('dimension', '12'), null);
});

test('numbers and colors parse, junk does not', () => {
  assert.equal(tokenValue('number', '0.8'), 0.8);
  assert.equal(tokenValue('number', ''), null);
  assert.equal(tokenValue('number', 'abc'), null);
  assert.ok(tokenValue('color', '#2e59aa'));
  assert.equal(tokenValue('color', 'nope'), null);
});
