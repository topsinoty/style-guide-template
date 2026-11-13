import { holds, isNode } from './tree.js';
import { fileName, isSafeSrc } from './path.js';
import { isFontStyle } from './values.js';
import { entriesOf, keysOf, without } from './records.js';
import type {
  AssetContext,
  AssetGroup,
  AssetItem,
  BrandMeta,
  FontFile,
  ResolverDoc,
  SessionFiles,
} from './types.js';

export type AssetSource = 'session' | 'library' | 'provider' | 'missing';
export type SrcEntry =
  | { src: string; kind: 'asset'; groupId: string; entry: AssetItem }
  | { src: string; kind: 'font'; entry: FontFile };

const META_KEYS = ['assetGroups', 'fontFiles'];
const basename = (p: string) => fileName(p).toLowerCase();

function metaKey(doc: ResolverDoc, vendor: string): string | null {
  const ext = doc.sets?.foundation?.$extensions ?? {};
  if (ext[vendor]) return vendor;
  const others = keysOf(ext).filter((k) => META_KEYS.some((m) => holds(ext[k], m)));
  return others.length === 1 ? others[0] : null;
}

const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);

function readItem(value: unknown): AssetItem | null {
  if (!isNode(value) || !isSafeSrc(value.src)) return null;
  return {
    ...value,
    src: value.src,
    label: optionalString(value.label),
    description: optionalString(value.description),
    provider: optionalString(value.provider),
  };
}

function readFontFile(value: unknown): FontFile | null {
  const item = readItem(value);
  if (!item || !isNode(value) || typeof value.family !== 'string' || !value.family) return null;
  const { weight, style } = value;
  return {
    ...item,
    family: value.family,
    weight: typeof weight === 'number' && weight >= 1 && weight <= 1000 ? weight : 400,
    style: isFontStyle(style) ? style : 'normal',
    subset: optionalString(value.subset),
    unicodeRange: optionalString(value.unicodeRange),
    fontsourceId: optionalString(value.fontsourceId),
    version: optionalString(value.version),
  };
}

function readGroup(value: unknown): AssetGroup | null {
  if (!isNode(value) || typeof value.id !== 'string' || !Array.isArray(value.items)) return null;
  return {
    ...value,
    id: value.id,
    label: optionalString(value.label),
    items: value.items.flatMap((item) => readItem(item) ?? []),
  };
}

export function readBrandMeta(value: unknown): BrandMeta {
  const { logo, ...meta } = isNode(value) ? value : {};
  const list = (key: string) => (Array.isArray(meta[key]) ? meta[key] : []);
  return {
    ...meta,
    ...(typeof logo === 'string' ? { logo } : {}),
    assetGroups: list('assetGroups').flatMap((group) => readGroup(group) ?? []),
    fontFiles: list('fontFiles').flatMap((file) => readFontFile(file) ?? []),
  };
}

export function mainLogo(meta: BrandMeta): AssetItem | undefined {
  const items = meta.assetGroups.flatMap((group) => group.items);
  return (
    items.find((item) => item.src === meta.logo) ?? meta.assetGroups.find((g) => g.id === 'logos')?.items[0]
  );
}

export function brandMeta(doc: ResolverDoc, vendor: string): BrandMeta {
  const key = metaKey(doc, vendor);
  return readBrandMeta(key ? doc.sets.foundation.$extensions?.[key] : undefined);
}

export function withBrandMeta(doc: ResolverDoc, vendor: string, meta: BrandMeta): ResolverDoc {
  const out = structuredClone(doc);
  const key = metaKey(doc, vendor);
  const foreign = key !== vendor ? key : null;
  const others = foreign
    ? without(out.sets.foundation.$extensions ?? {}, foreign)
    : out.sets.foundation.$extensions;
  out.sets.foundation.$extensions = { ...others, [vendor]: meta };
  return out;
}

export const allSrcs = (meta: BrandMeta): SrcEntry[] => [
  ...meta.assetGroups.flatMap((g) =>
    g.items.map((entry) => ({ src: entry.src, kind: 'asset' as const, groupId: g.id, entry })),
  ),
  ...meta.fontFiles.map((entry) => ({ src: entry.src, kind: 'font' as const, entry })),
];

export function resolveAsset(
  item: AssetItem,
  { session, library, fonts }: AssetContext,
): { source: AssetSource; url?: string } {
  if (!isSafeSrc(item.src)) return { source: 'missing' };
  if (session.has(item.src)) return { source: 'session' };
  if (library.has(item.src)) return { source: 'library', url: `library/${item.src}` };
  if (item.provider === fonts.id) return { source: 'provider', url: fonts.fileUrl(item as FontFile) };
  return { source: 'missing' };
}

export const missingAssets = (meta: BrandMeta, ctx: AssetContext): string[] =>
  allSrcs(meta)
    .filter(({ entry }) => resolveAsset(entry, ctx).source === 'missing')
    .map((s) => s.src);

export function matchDropped(missing: string[], files: File[]) {
  const matched: SessionFiles = new Map();
  const ambiguous: Array<{ name: string; candidates: string[] }> = [];
  const unmatched: File[] = [];
  for (const file of files) {
    const candidates = missing.filter((p) => basename(p) === file.name.toLowerCase());
    if (candidates.length === 1) matched.set(candidates[0], file);
    else if (candidates.length > 1) ambiguous.push({ name: file.name, candidates });
    else unmatched.push(file);
  }
  return { matched, ambiguous, unmatched };
}

export function adoptVendor(doc: ResolverDoc, vendor: string): ResolverDoc {
  const key = metaKey(doc, vendor);
  if (!key || key === vendor) return doc;
  const out = structuredClone(doc);
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit);
    if (!isNode(node)) return;
    if (node.$extensions && key in node.$extensions) {
      const { [key]: moved, ...rest } = node.$extensions;
      node.$extensions = { ...rest, [vendor]: moved };
    }
    for (const [k, v] of entriesOf(node)) if (k !== '$extensions') visit(v);
  };
  visit(out);
  return out;
}
