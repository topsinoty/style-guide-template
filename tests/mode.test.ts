import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readMode } from '../src/app/mode.js';
import { Session } from '../src/app/session.js';
import {
  memoryFileStore,
  readOnlyFileStore,
  readOnlyKeyValueStore,
} from '../src/adapters/memory.js';
import { zodValidator } from '../src/adapters/zod-validator.js';
import { fontsource } from '../src/adapters/fontsource.js';
import type { KeyValueStore } from '../src/ports.js';

test('the address picks the mode, and a hosted brand always wins', () => {
  assert.deepEqual(readMode(''), { kind: 'private' });
  assert.deepEqual(readMode('?view'), { kind: 'preview' });
  assert.deepEqual(readMode('?brand=brands/a.json'), {
    kind: 'public',
    brand: 'brands/a.json',
  });
  assert.deepEqual(readMode('?view', 'brands/b.json'), {
    kind: 'public',
    brand: 'brands/b.json',
  });
});

test('a read-only session can show and change a brand without writing to the draft store', async () => {
  vi.stubGlobal('fetch', (url: string) =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve(JSON.parse(readFileSync(`public/${url}`, 'utf8'))),
    }),
  );
  const writes: string[] = [];
  const backing: KeyValueStore = {
    getItem: () => null,
    setItem(key) {
      writes.push(key);
    },
    removeItem(key) {
      writes.push(key);
    },
  };
  const files = memoryFileStore();
  const session = await Session.open({
    drafts: readOnlyKeyValueStore(backing),
    files: readOnlyFileStore(files),
    fonts: fontsource(),
    validator: zodValidator,
    editable: false,
  });
  session.store.set({ ...session.doc, name: 'Changed' });
  session.store.flush();
  await session.prune();
  assert.equal(session.editable, false);
  assert.deepEqual(writes, []);
  const saved = await files.getAll();
  assert.equal(saved.size, 0);
  vi.unstubAllGlobals();
});
