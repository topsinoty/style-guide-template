import type { FileStore, KeyValueStore } from '../ports.js';
import { isResolver } from './document.js';
import type { ResolverDoc, SessionFiles } from './types.js';

export type Store = ReturnType<typeof createStore>;

const DRAFT = 'styleguide:draft';
const BASE = 'styleguide:base';
const HISTORY = 50;
const TYPING_PAUSE = 2000;
const noError: unknown = null;

const read = (storage: KeyValueStore, key: string): ResolverDoc | null => {
  try {
    const stored: unknown = JSON.parse(storage.getItem(key) ?? 'null');
    return isResolver(stored) ? stored : null;
  } catch {
    return null;
  }
};

export function createStore({
  doc,
  storage,
  fileStore,
}: {
  doc: ResolverDoc;
  storage: KeyValueStore;
  fileStore: FileStore;
}) {
  let base = read(storage, BASE) ?? doc;
  let current = read(storage, DRAFT) ?? base;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const subs = new Set<(doc: ResolverDoc) => void>();
  const files: SessionFiles = new Map();
  let past: ResolverDoc[] = [];
  let future: ResolverDoc[] = [];
  let typing: { key: string; at: number } | null = null;
  const record = (key?: string) => {
    const now = Date.now();
    // Keystrokes in one field, without a long pause, are one undo step.
    const sameBurst = key !== undefined && typing?.key === key && now - typing.at < TYPING_PAUSE;
    typing = key === undefined ? null : { key, at: now };
    if (sameBurst) return;
    past = [...past, current].slice(-HISTORY);
    future = [];
  };
  const show = (next: ResolverDoc) => {
    current = next;
    clearTimeout(timer);
    timer = setTimeout(store.flush, 300);
    for (const fn of subs) fn(current);
  };

  const store = {
    files,
    saveError: noError,
    get: () => current,
    subscribe(fn: (doc: ResolverDoc) => void) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    set(next: ResolverDoc, typingKey?: string) {
      if (next !== current) record(typingKey);
      show(next);
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    undo() {
      const prev = past.at(-1);
      if (!prev) return false;
      typing = null;
      future = [current, ...future];
      past = past.slice(0, -1);
      show(prev);
      return true;
    },
    redo() {
      const [next] = future;
      if (!next) return false;
      typing = null;
      past = [...past, current];
      future = future.slice(1);
      show(next);
      return true;
    },
    update: (fn: (doc: ResolverDoc) => ResolverDoc) => store.set(fn(current)),
    flush() {
      clearTimeout(timer);
      try {
        storage.setItem(DRAFT, JSON.stringify(current));
        store.saveError = null;
      } catch (e) {
        store.saveError = e;
      }
    },
    load(next: ResolverDoc, newFiles?: SessionFiles) {
      if (!newFiles && JSON.stringify(next) === JSON.stringify(current)) return;
      base = next;
      try {
        storage.setItem(BASE, JSON.stringify(base));
      } catch (e) {
        store.saveError = e;
      }
      if (newFiles) store.addFiles(newFiles);
      record();
      show(next);
      store.flush();
    },
    async prune(keep: Set<string>) {
      const unused = [...files.keys()].filter((path) => !keep.has(path));
      for (const path of unused) files.delete(path);
      await Promise.allSettled(unused.map((path) => fileStore.delete(path)));
    },
    drafts: () => [current, base, ...past, ...future],
    async addFiles(map: SessionFiles) {
      for (const [path, data] of map) files.set(path, data);
      for (const fn of subs) fn(current);
      const entries = [...map];
      const results = await Promise.allSettled(entries.map(([path, data]) => fileStore.put(path, data)));
      const notPersisted = entries.filter((_, i) => results[i].status === 'rejected').map(([path]) => path);
      return { notPersisted };
    },
    ready: fileStore
      .getAll()
      .then((saved) => {
        for (const [p, data] of saved) if (!files.has(p)) files.set(p, data);
      })
      .catch(() => {}),
  };
  return store;
}
