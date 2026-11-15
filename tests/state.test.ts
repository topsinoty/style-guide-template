import { isDeepStrictEqual } from 'node:util';
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { memoryFileStore, memoryKeyValueStore } from '../src/adapters/memory';
import { createStore } from '../src/lib/state';
import type { ResolverDoc } from '../src/lib/types';

const mem = memoryKeyValueStore;
const memFiles = (fail = false) => {
  const files = memoryFileStore();
  if (!fail) return files;
  return {
    ...files,
    put: () => {
      const quota = new Error('quota');
      quota.name = 'QuotaExceededError';
      return Promise.reject(quota);
    },
  };
};
const doc = (name: string): ResolverDoc => ({
  version: '2025.10',
  name,
  sets: {},
  resolutionOrder: [],
});
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
  assert.deepEqual(
    createStore({ doc: a, storage, fileStore: memFiles() }).get(),
    edit(a),
  );
});

test('quota exceeded is reported, the file stays in the session', async () => {
  const s = createStore({ doc: a, storage: mem(), fileStore: memFiles(true) });
  const r = await s.addFiles(new Map([['photos/big.jpg', new Uint8Array(4)]]));
  assert.deepEqual(r.notPersisted, ['photos/big.jpg']);
  assert.ok(s.files.has('photos/big.jpg'));
});

test('loading the same doc again changes nothing, so one undo goes back to the edit', () => {
  const s = createStore({ doc: a, storage: mem(), fileStore: memFiles() });
  s.update(edit);
  for (let i = 0; i < 50; i++) s.load(b);
  s.undo();
  assert.deepEqual(s.get(), edit(a));
});

test('drafts include undo history, so its files are kept', () => {
  const s = createStore({ doc: a, storage: mem(), fileStore: memFiles() });
  s.update(edit);
  s.load(b);
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
  const saved = await fileStore.getAll();
  assert.deepEqual([...saved.keys()], ['g/keep.svg']);
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

test('loading can be undone', () => {
  const s = createStore({ doc: a, storage: mem(), fileStore: memFiles() });
  s.update(edit);
  s.load(b);
  assert.deepEqual(s.get(), b);
  s.undo();
  assert.deepEqual(s.get(), edit(a));
});

test('undo history is capped', () => {
  const s = createStore({
    doc: doc('0'),
    storage: mem(),
    fileStore: memFiles(),
  });
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

test('loading a brand when browser storage is full still shows it', () => {
  const full = {
    ...mem(),
    setItem: () => {
      throw new Error('quota');
    },
  };
  const s = createStore({ doc: a, storage: full, fileStore: memFiles() });
  s.load(b);
  assert.equal(s.get(), b);
  assert.ok(s.saveError);
});

test('a burst of typing in one field is one undo step; another field starts a new one', () => {
  const s = createStore({ doc: a, storage: mem(), fileStore: memFiles() });
  s.set(doc('A1'), 'intro');
  s.set(doc('A12'), 'intro');
  s.set(doc('A123'), 'intro');
  s.set(doc('B'), 'other');
  s.undo();
  assert.equal(s.get().name, 'A123');
  s.undo();
  assert.equal(s.get().name, 'A');
});
