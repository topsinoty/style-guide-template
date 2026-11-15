import { slug } from './io.js';
import { uniquePath } from './path.js';
import { keysOf, renameKey, without } from './records.js';
import type {
  AssetGroup,
  AssetItem,
  BrandMeta,
  DtcgColor,
  FontFile,
  ResolverDoc,
  TokenNode,
} from './types.js';
import { ensureChild, nodeAt } from './tree.js';

const clone = <T>(x: T): T => structuredClone(x);
export const foundation = (doc: ResolverDoc): TokenNode => doc.sets.foundation.sources[0];

function setIn(tree: TokenNode, path: string, value: unknown) {
  const keys = path.split('.');
  const last = keys.pop() ?? path;
  const parent = keys.reduce((node, key) => ensureChild(node, key), tree);
  parent[last] = value;
}

export function setToken(doc: ResolverDoc, path: string, token: TokenNode): ResolverDoc {
  const out = clone(doc);
  setIn(foundation(out), path, token);
  return out;
}

export function removeToken(doc: ResolverDoc, path: string): ResolverDoc {
  const out = clone(doc);
  const keys = path.split('.');
  const last = keys.pop() ?? path;
  const parent = keys.length ? nodeAt(foundation(out), keys.join('.')) : foundation(out);
  if (parent) Reflect.deleteProperty(parent, last);
  return out;
}

export function setRole(
  doc: ResolverDoc,
  theme: string,
  rolePath: string,
  value: string | DtcgColor,
): ResolverDoc {
  const out = clone(doc);
  const mod = out.modifiers?.theme;
  if (!mod || theme === defaultTheme(out) || !mod.contexts[theme]) {
    setIn(foundation(out), `color.${rolePath}`, {
      ...nodeAt(foundation(out), `color.${rolePath}`),
      $value: value,
    });
    return out;
  }
  const sources = mod.contexts[theme];
  if (!sources.length) sources.push({});
  setIn(sources[0], `color.${rolePath}`, { $type: 'color', $value: value });
  return out;
}

export function setDescription(doc: ResolverDoc, path: string, text: string): ResolverDoc {
  const out = clone(doc);
  const token = nodeAt(foundation(out), path);
  if (!token || !('$value' in token)) return doc;
  if (text) token.$description = text;
  else Reflect.deleteProperty(token, '$description');
  return out;
}

const THEME = 'theme';
export const themesOf = (doc: ResolverDoc) => keysOf(doc.modifiers?.[THEME]?.contexts ?? {});
export const defaultTheme = (doc: ResolverDoc): string | undefined =>
  doc.modifiers?.[THEME]?.default ?? themesOf(doc)[0];

export function themeSource(doc: ResolverDoc, theme: string): TokenNode | undefined {
  const mod = doc.modifiers?.[THEME];
  if (!mod || theme === defaultTheme(doc) || !mod.contexts[theme]) return foundation(doc);
  return mod.contexts[theme][0];
}

export function setThemed(doc: ResolverDoc, theme: string, path: string, token: TokenNode): ResolverDoc {
  const out = clone(doc);
  const sources = out.modifiers?.[THEME]?.contexts[theme];
  if (sources && !sources.length && theme !== defaultTheme(out)) sources.push({});
  setIn(themeSource(out, theme) ?? foundation(out), path, token);
  return out;
}

export function removeThemed(doc: ResolverDoc, theme: string, path: string): ResolverDoc {
  const out = clone(doc);
  const keys = path.split('.');
  const last = keys.pop() ?? path;
  const source = themeSource(out, theme);
  const parent = source && (keys.length ? nodeAt(source, keys.join('.')) : source);
  if (parent) Reflect.deleteProperty(parent, last);
  return out;
}

export function addTheme(doc: ResolverDoc, name: string): ResolverDoc {
  if (!name || themesOf(doc).includes(name)) return doc;
  const out = clone(doc);
  const mod = out.modifiers?.[THEME];
  if (mod) mod.contexts[name] = [];
  else {
    out.modifiers = { ...out.modifiers, [THEME]: { contexts: { [name]: [] }, default: name } };
    out.resolutionOrder.push({ $ref: `#/modifiers/${THEME}` });
  }
  return out;
}

export function renameTheme(doc: ResolverDoc, from: string, to: string): ResolverDoc {
  const mod = doc.modifiers?.[THEME];
  if (!mod || !to || !(from in mod.contexts) || to in mod.contexts) return doc;
  const out = clone(doc);
  const next = { ...mod, contexts: renameKey(mod.contexts, from, to) };
  if (defaultTheme(doc) === from) next.default = to;
  out.modifiers = { ...out.modifiers, [THEME]: next };
  return out;
}

export function removeTheme(doc: ResolverDoc, name: string): ResolverDoc {
  const mod = doc.modifiers?.[THEME];
  if (!mod || name === defaultTheme(doc) || !(name in mod.contexts)) return doc;
  const out = clone(doc);
  out.modifiers = { ...out.modifiers, [THEME]: { ...mod, contexts: without(mod.contexts, name) } };
  return out;
}

const updateGroups = (meta: BrandMeta, fn: (groups: AssetGroup[]) => AssetGroup[]): BrandMeta => ({
  ...meta,
  assetGroups: fn(meta.assetGroups.map((g) => ({ ...g, items: [...g.items] }))),
});
export function move<T>(list: T[], i: number, dir: number): T[] {
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const moved = [...list];
  [moved[i], moved[j]] = [moved[j], moved[i]];
  return moved;
}

export function addGroup(meta: BrandMeta, label: string): BrandMeta {
  const ids = new Set(meta.assetGroups.map((g) => g.id));
  const id = uniquePath(slug(label), ids);
  return updateGroups(meta, (gs) => [...gs, { id, label, items: [] }]);
}

export const renameGroup = (meta: BrandMeta, id: string, label: string) =>
  updateGroups(meta, (gs) => gs.map((g) => (g.id === id ? { ...g, label } : g)));
export const moveGroup = (meta: BrandMeta, id: string, dir: number) =>
  updateGroups(meta, (gs) =>
    move(
      gs,
      gs.findIndex((g) => g.id === id),
      dir,
    ),
  );
export function removeGroup(meta: BrandMeta, id: string): BrandMeta {
  const removed = meta.assetGroups.find((group) => group.id === id);
  const { logo, ...rest } = updateGroups(meta, (gs) => gs.filter((group) => group.id !== id));
  return logo &&
    (!removed?.items.some((item) => item.src === logo) ||
      rest.assetGroups.some((group) => group.items.some((item) => item.src === logo)))
    ? { ...rest, logo }
    : rest;
}

const inGroup = (meta: BrandMeta, id: string, fn: (items: AssetItem[]) => AssetItem[]) =>
  updateGroups(meta, (gs) => gs.map((g) => (g.id === id ? { ...g, items: fn(g.items) } : g)));
export const addItems = (meta: BrandMeta, id: string, items: AssetItem[]) =>
  inGroup(meta, id, (is) => [...is, ...items]);
export const updateItem = (meta: BrandMeta, id: string, src: string, patch: Partial<AssetItem>) =>
  inGroup(meta, id, (is) => is.map((i) => (i.src === src ? { ...i, ...patch } : i)));
export const moveItem = (meta: BrandMeta, id: string, src: string, dir: number) =>
  inGroup(meta, id, (is) =>
    move(
      is,
      is.findIndex((i) => i.src === src),
      dir,
    ),
  );
export function removeItem(meta: BrandMeta, id: string, src: string): BrandMeta {
  const { logo, ...rest } = inGroup(meta, id, (is) => is.filter((i) => i.src !== src));
  return logo &&
    (logo !== src || rest.assetGroups.some((group) => group.items.some((item) => item.src === logo)))
    ? { ...rest, logo }
    : rest;
}

export function addFontFiles(meta: BrandMeta, entries: FontFile[]): BrandMeta {
  const seen = new Set(meta.fontFiles.map((f) => f.src));
  return {
    ...meta,
    fontFiles: [...meta.fontFiles, ...entries.filter((e) => !seen.has(e.src) && seen.add(e.src))],
  };
}
export const removeFontFile = (meta: BrandMeta, src: string): BrandMeta => ({
  ...meta,
  fontFiles: meta.fontFiles.filter((f) => f.src !== src),
});

const WEIGHT_WORDS: Array<[string, number]> = [
  ['extrabold', 800],
  ['ultrabold', 800],
  ['semibold', 600],
  ['demibold', 600],
  ['extralight', 200],
  ['ultralight', 200],
  ['thin', 100],
  ['light', 300],
  ['regular', 400],
  ['medium', 500],
  ['bold', 700],
  ['black', 900],
  ['heavy', 900],
];

export function fontFromFileName(name: string): Pick<FontFile, 'family' | 'weight' | 'style'> {
  const stem = name.replace(/\.[^.]+$/, '');
  const [family, variant = ''] = stem.split('-');
  const v = variant.toLowerCase();
  const weight = WEIGHT_WORDS.find(([w]) => v.includes(w))?.[1] ?? 400;
  return {
    family: family.replace(/_+/g, ' ').trim(),
    weight,
    style: v.includes('italic') ? 'italic' : 'normal',
  };
}
