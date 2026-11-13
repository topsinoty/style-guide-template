export type Entry<T> = [key: string, value: T];

export const keysOf = (record: object): string[] => Object.keys(record);

export const valuesOf = <T>(record: Record<string, T>): T[] => Object.values(record);

export const entriesOf = <T>(record: Record<string, T>): Entry<T>[] => Object.entries(record);

export const recordOf = <T>(entries: Iterable<Entry<T>>): Record<string, T> => Object.fromEntries(entries);

export const isEmpty = (record: object) => keysOf(record).length === 0;

export const mapValues = <T, U>(
  record: Record<string, T>,
  fn: (value: T, key: string) => U,
): Record<string, U> => recordOf(entriesOf(record).map(([key, value]) => [key, fn(value, key)]));

export const without = <T>(record: Record<string, T>, key: string): Record<string, T> =>
  recordOf(entriesOf(record).filter(([name]) => name !== key));

export const renameKey = <T>(record: Record<string, T>, from: string, to: string): Record<string, T> =>
  recordOf(entriesOf(record).map(([key, value]) => [key === from ? to : key, value]));
