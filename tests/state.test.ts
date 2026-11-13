import { isDeepStrictEqual } from 'node:util';
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { memoryFileStore, memoryKeyValueStore } from '../src/adapters/memory.js';
import { createStore } from '../src/lib/state.js';
import type { ResolverDoc } from '../src/lib/types.js';

const mem = memoryKeyValueStore;
const memFiles = (fail = false) => {
  const files = memoryFileStore();
  if (!fail) return files;
  return {
    ...files,
    put: async () => {
      const quota = new Error('quota');
      quota.name = 'QuotaExceededError';
      throw quota;
    },
  };
};
const doc = (name: string): ResolverDoc => ({ version: '2025.10', name, sets: {}, resolutionOrder: [] });
const a = doc('A');
const b = doc('B');
const edit = (d: ResolverDoc): ResolverDoc => ({ ...d, description: 'edited' });

test('subscribers are notified', () => {
  const s = createStore({ doc: a, storage: mem(), fileStore: memFiles() });
  let seen;
  const off = s.subscribe((d) => {
    seen = d;
  });
  s.set(b);
  assert.deepEqual(seen, b);
  off();
  s.set(a);
  assert.deepEqual(seen, b);
});

test('autosave writes the draft and a new store resumes it', () => {
  const storage = mem();
  const s = createStore({ doc: a, storage, fileStore: memFiles() });
  s.update(edit);
  s.flush();
  assert.deepEqual(createStore({ doc: a, storage, fileStore: memFiles() }).get(), edit(a));
});

test('reset goes back to the last loaded doc', () => {
  const storage = mem();
  const s = createStore({ doc: a, storage, fileStore: memFiles() });
  s.load(b);
  s.update(edit);
  s.reset();
  assert.deepEqual(s.get(), b);
  assert.equal(storage.getItem('styleguide:draft'), null);
});

test('quota exceeded is reported, the file stays in the session', async () => {
  const s = createStore({ doc: a, storage: mem(), fileStore: memFiles(true) });
  const r = await s.addFiles(new Map([['photos/big.jpg', new Uint8Array(4)]]));
  assert.deepEqual(r.notPersisted, ['photos/big.jpg']);
  assert.ok(s.files.has('photos/big.jpg'));
});

test('resetting again changes nothing, so one undo goes back to the edit', () => {
  const s = createStore({ doc: a, storage: mem(), fileStore: memFiles() });
  s.update(edit);
  for (let i = 0; i < 50; i++) s.reset();
  s.undo();
  assert.deepEqual(s.get(), edit(a));
});

test('drafts include undo history, so its files are kept', () => {
  const s = createStore({ doc: a, storage: mem(), fileStore: memFiles() });
  s.update(edit);
  s.reset();
  assert.ok(s.drafts().some((d) => isDeepStrictEqual(d, edit(a))));
});

test('persisted files come back on a new store', async () => {
  const fileStore = memFiles();
  const s = createStore({ doc: a, storage: mem(), fileStore });
  await s.addFiles(new Map([['logos/x.svg', new Uint8Array(1)]]));
  const t = createStore({ doc: a, storage: mem(), fileStore });
  await t.ready;
  assert.ok(t.files.has('logos/x.svg'));
});

test('prune deletes files no draft refers to', async () => {
  const fileStore = memFiles();
  const s = createStore({ doc: a, storage: mem(), fileStore });
  await s.addFiles(
    new Map([
      ['g/keep.svg', new Uint8Array(1)],
      ['g/drop.svg', new Uint8Array(1)],
    ]),
  );
  await s.prune(new Set(['g/keep.svg']));
  assert.deepEqual([...s.files.keys()], ['g/keep.svg']);
  assert.deepEqual([...(await fileStore.getAll()).keys()], ['g/keep.svg']);
});

test('undo and redo step through edits; a new edit drops the redo steps', () => {
  const s = createStore({ doc: a, storage: mem(), fileStore: memFiles() });
  assert.equal(s.canUndo(), false);
  s.set(b);
  s.update(edit);
  assert.equal(s.undo(), true);
  assert.deepEqual(s.get(), b);
  assert.equal(s.undo(), true);
  assert.deepEqual(s.get(), a);
  assert.equal(s.undo(), false);
  assert.equal(s.redo(), true);
  assert.deepEqual(s.get(), b);
  s.set(a);
  assert.equal(s.canRedo(), false);
});

test('loading and resetting can be undone', () => {
  const s = createStore({ doc: a, storage: mem(), fileStore: memFiles() });
  s.load(b);
  s.reset();
  assert.deepEqual(s.get(), b);
  s.update(edit);
  s.reset();
  s.undo();
  assert.deepEqual(s.get(), edit(b));
  s.load(a);
  s.undo();
  assert.deepEqual(s.get(), edit(b));
});

test('undo history is capped', () => {
  const s = createStore({ doc: doc('0'), storage: mem(), fileStore: memFiles() });
  for (let n = 1; n <= 60; n++) s.set(doc(String(n)));
  let steps = 0;
  while (s.undo()) steps++;
  assert.equal(steps, 50);
  assert.equal(s.get().name, '10');
});

test('subscribers see the history as it is after an undo or redo', () => {
  const s = createStore({ doc: a, storage: mem(), fileStore: memFiles() });
  s.set(b);
  let seen;
  s.subscribe(() => {
    seen = [s.canUndo(), s.canRedo()];
  });
  s.undo();
  assert.deepEqual(seen, [false, true]);
  s.redo();
  assert.deepEqual(seen, [true, false]);
});
