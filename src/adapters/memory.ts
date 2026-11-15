import type { FileStore, KeyValueStore } from '../ports';
import type { FileData } from '../lib/types';

export function memoryKeyValueStore(): KeyValueStore {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

export function readOnlyKeyValueStore(source: KeyValueStore): KeyValueStore {
  return {
    getItem: (key) => source.getItem(key),
    setItem() {
      // read-only
    },
    removeItem() {
      // read-only
    },
  };
}

export function readOnlyFileStore(source: FileStore): FileStore {
  return {
    put: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    clear: () => Promise.resolve(),
    getAll: () => source.getAll(),
  };
}

export function memoryFileStore(): FileStore {
  const files = new Map<string, FileData>();
  return {
    put(path, data) {
      files.set(path, data);
      return Promise.resolve();
    },
    delete: (path) => Promise.resolve(files.delete(path)),
    clear() {
      files.clear();
      return Promise.resolve();
    },
    getAll: () => Promise.resolve(new Map(files)),
  };
}
