import { test } from 'vitest';
import assert from 'node:assert/strict';
import { fontsource } from '../src/adapters/fontsource.js';
import { V } from './helpers.js';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as z from 'zod/mini';
import {
  manifest as manifestSchema,
  resolverDoc,
  validateResolver,
} from '../src/adapters/zod-validator.js';
import { resolve } from '../src/lib/resolver.js';
import { checkContrast, ROLES } from '../src/lib/contrast.js';
import { brandMeta, missingAssets } from '../src/lib/assets.js';
import { keysOf, valueAt } from '../src/lib/records.js';

const root = new URL('../public/library/', import.meta.url).pathname;
const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, 'utf8'));
const manifest = z.parse(manifestSchema, readJson(join(root, 'manifest.json')));
const walk = (dir: string, base = ''): string[] =>
  readdirSync(dir).flatMap((n) => {
    const rel = base ? `${base}/${n}` : n;
    return statSync(join(dir, n)).isDirectory()
      ? walk(join(dir, n), rel)
      : [rel];
  });
test('manifest lists exactly the library files', () => {
  const onDisk = walk(root)
    .filter((p) => !p.startsWith('brands/') && p !== 'manifest.json')
    .sort((a, b) => a.localeCompare(b));
  assert.deepEqual(
    [...manifest.files].sort((a, b) => a.localeCompare(b)),
    onDisk,
  );
  for (const b of manifest.brands)
    assert.ok(existsSync(join(root, b.path)), b.path);
});

const brands = manifest.brands.map((b) => ({
  name: b.name,
  doc: z.parse(resolverDoc, readJson(join(root, b.path))),
}));

test('the first preset is Default', () => {
  assert.equal(brands[0].name, 'Default');
});

for (const { name, doc } of brands) {
  test(`${name} is valid DTCG and resolves in every theme`, () => {
    assert.deepEqual(validateResolver(doc).errors, []);
    for (const theme of keysOf(valueAt(doc.modifiers, 'theme')?.contexts ?? {}))
      assert.doesNotThrow(() => resolve(doc, { theme }));
  });

  test(`${name} has every role`, () => {
    const tokens = resolve(doc);
    for (const role of ROLES)
      assert.ok(
        [...tokens.keys()].some((k) => k.startsWith(`color.${role}.`)),
        role,
      );
  });

  test(`${name} passes every required contrast pair in light and dark`, () => {
    assert.deepEqual(
      checkContrast(doc).filter((r) => !r.pass),
      [],
    );
    assert.deepEqual(
      [...new Set(checkContrast(doc).map((r) => r.context))].sort((a, b) =>
        a.localeCompare(b),
      ),
      ['dark', 'light'],
    );
  });

  test(`${name} assets all resolve from the library`, () => {
    const meta = brandMeta(doc, V);
    assert.equal(meta.assetGroups[0].id, 'logos');
    assert.deepEqual(
      missingAssets(meta, {
        session: new Map(),
        library: new Set(manifest.files),
        fonts: fontsource(),
      }),
      [],
    );
    assert.ok(
      meta.fontFiles.length > 0 &&
        meta.fontFiles.every((f) => f.provider === 'fontsource'),
    );
  });
}
