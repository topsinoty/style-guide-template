import { anchoredScale, contrastRatio, oklch, toOklch } from './color.js';
import { ROLES } from './contrast.js';
import { foundation } from './edit.js';
import { entriesOf, isEmpty, keysOf, mapValues, renameKey, valuesOf, without } from './records.js';
import { defaultInputs, resolve } from './resolver.js';
import { child, children, ensureChild, isHandSet, isNode, vendorData, withVendorData } from './tree.js';
import type { DtcgColor, ResolverDoc, TokenNode } from './types.js';
import { narrow, isColor } from './values.js';

export interface Shade {
  name: string;
  color: DtcgColor | null;
  isBase: boolean;
  byHand: boolean;
}

export interface PaletteColor {
  id: string;
  shades: Shade[];
}

export interface Reference {
  context: string;
  path: string;
}

const isNumeric = (name: string) => /^\d+$/.test(name);

export const paletteId = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');

export const byShadeOrder = (a: string, b: string) => {
  if (isNumeric(a) && isNumeric(b)) return Number(a) - Number(b);
  if (isNumeric(a) !== isNumeric(b)) return isNumeric(a) ? 1 : -1;
  return 0;
};

const clone = <T>(value: T): T => structuredClone(value);

const colorsOf = (doc: ResolverDoc): TokenNode => ensureChild(foundation(doc), 'color', { $type: 'color' });

export function baseShadeOf(group: TokenNode, vendor: string): string | undefined {
  const marked = vendorData(group, vendor).base;
  const names = children(group).map(([name]) => name);
  if (typeof marked === 'string' && names.includes(marked)) return marked;
  if (names.includes('600')) return '600';
  return names.toSorted(byShadeOrder)[Math.floor(names.length / 2)];
}

const isPaletteGroup = (id: string, group: TokenNode) =>
  !ROLES.includes(id) && children(group).some(([, token]) => '$value' in token);

export function paletteColors(doc: ResolverDoc, vendor: string): PaletteColor[] {
  return children(child(foundation(doc), 'color'))
    .filter(([id, group]) => isPaletteGroup(id, group))
    .map(([id, group]) => {
      const base = baseShadeOf(group, vendor);
      const shades = children(group)
        .map(([name]) => name)
        .toSorted(byShadeOrder)
        .map((name) => {
          const token = child(group, name);
          return {
            name,
            color: narrow(token?.$value, isColor),
            isBase: name === base,
            byHand: isHandSet(token, vendor),
          };
        });
      return { id, shades };
    });
}

const setLabel = (set: string) => (set === 'foundation' ? 'foundation' : `${set} set`);
const contextLabel = (modifier: string, context: string) =>
  modifier === 'theme' ? `${context} theme` : `${modifier} ${context}`;

function treesOf(doc: ResolverDoc): [string, TokenNode][] {
  const inSets = entriesOf(doc.sets).flatMap(([set, { sources }]) =>
    sources.map((tree): [string, TokenNode] => [setLabel(set), tree]),
  );
  const inModifiers = entriesOf(doc.modifiers ?? {}).flatMap(([modifier, { contexts }]) =>
    entriesOf(contexts).flatMap(([context, sources]) =>
      sources.map((tree): [string, TokenNode] => [contextLabel(modifier, context), tree]),
    ),
  );
  return [...inSets, ...inModifiers];
}

function walkValues(tree: TokenNode, path: string, visit: (token: TokenNode, path: string) => void) {
  for (const [key, node] of children(tree)) {
    const at = path ? `${path}.${key}` : key;
    if ('$value' in node) visit(node, at);
    else walkValues(node, at, visit);
  }
}

const aliasOf = (colorId: string, shade: string) => `{color.${colorId}.${shade}}`;
const pointerOf = (colorId: string, shade: string) => `#/color/${colorId}/${shade}/$value`;

function pointsAt(value: unknown, colorId: string, shade: string): boolean {
  if (value === aliasOf(colorId, shade)) return true;
  return isNode(value) && value.$ref === pointerOf(colorId, shade);
}

function replaceReference(value: unknown, colorId: string, shade: string, next: unknown): unknown {
  if (pointsAt(value, colorId, shade)) return next;
  if (Array.isArray(value)) return value.map((item) => replaceReference(item, colorId, shade, next));
  if (!isNode(value)) return value;
  return mapValues(value, (item) => replaceReference(item, colorId, shade, next));
}

function mentions(value: unknown, colorId: string, shade: string): boolean {
  if (pointsAt(value, colorId, shade)) return true;
  if (Array.isArray(value)) return value.some((item) => mentions(item, colorId, shade));
  return isNode(value) && valuesOf(value).some((item) => mentions(item, colorId, shade));
}

export function referencesTo(doc: ResolverDoc, colorId: string, shades?: string[]): Reference[] {
  const names = shades ?? children(child(child(foundation(doc), 'color'), colorId)).map(([name]) => name);
  const found: Reference[] = [];
  for (const [context, tree] of treesOf(doc))
    walkValues(tree, '', (token, path) => {
      if (path.startsWith(`color.${colorId}.`)) return;
      if (names.some((name) => mentions(token.$value, colorId, name))) found.push({ context, path });
    });
  return found;
}

function repoint(doc: ResolverDoc, colorId: string, shade: string, next: unknown) {
  for (const [, tree] of treesOf(doc))
    walkValues(tree, '', (token) => {
      token.$value = replaceReference(token.$value, colorId, shade, next);
    });
}

function generated(token: TokenNode, vendor: string, color: DtcgColor): TokenNode {
  const { $extensions, ...rest } = token;
  const { [vendor]: own = {}, ...others } = $extensions ?? {};
  const { overridden, ...kept } = own;
  const next = isEmpty(kept) ? others : { ...others, [vendor]: kept };
  return !isEmpty(next) ? { ...rest, $value: color, $extensions: next } : { ...rest, $value: color };
}

const handSet = (token: TokenNode, vendor: string, color: DtcgColor): TokenNode =>
  withVendorData({ ...token, $value: color }, vendor, { overridden: true });

export function addColor(doc: ResolverDoc, id: string, color: DtcgColor, vendor: string): ResolverDoc {
  const out = clone(doc);
  colorsOf(out)[id] = withVendorData({ base: { $value: color } }, vendor, { base: 'base' });
  return out;
}

function blackOrWhite(value: unknown): unknown {
  const color = narrow(value, isColor);
  if (!color) return value;
  const [lightness, , , alpha] = toOklch(color);
  return oklch(lightness >= 0.5 ? 1 : 0, 0, 0, alpha);
}

function monochromeRoles(doc: ResolverDoc) {
  for (const [, tree] of treesOf(doc))
    walkValues(tree, '', (token, path) => {
      if (ROLES.includes(path.split('.')[1])) token.$value = blackOrWhite(token.$value);
    });
}

export function renameColor(doc: ResolverDoc, from: string, to: string): ResolverDoc {
  const original = child(colorsOf(doc), from);
  if (!original || !isPaletteGroup(from, original) || !to || from === to || ROLES.includes(to)) return doc;
  if (treesOf(doc).some(([, tree]) => child(child(tree, 'color'), to))) return doc;
  const out = clone(doc);
  const shades = new Set(
    treesOf(doc).flatMap(([, tree]) => children(child(child(tree, 'color'), from)).map(([shade]) => shade)),
  );
  for (const [, tree] of treesOf(out)) {
    const colors = child(tree, 'color');
    if (colors && child(colors, from)) tree.color = renameKey(colors, from, to);
  }
  for (const shade of shades) repoint(out, from, shade, aliasOf(to, shade));
  return out;
}

export function removeColor(doc: ResolverDoc, id: string): ResolverDoc {
  const out = clone(doc);
  const colors = colorsOf(out);
  for (const [name, token] of children(child(colors, id))) repoint(out, id, name, token.$value);
  const remaining = without(colors, id);
  foundation(out).color = remaining;
  if (!children(remaining).some(([key, group]) => isPaletteGroup(key, group))) monochromeRoles(out);
  return out;
}

export function setShade(
  doc: ResolverDoc,
  colorId: string,
  shade: string,
  color: DtcgColor,
  vendor: string,
): ResolverDoc {
  const out = clone(doc);
  const group = child(colorsOf(out), colorId);
  if (!group) return doc;
  const token = child(group, shade) ?? {};
  group[shade] =
    shade === baseShadeOf(group, vendor) ? { ...token, $value: color } : handSet(token, vendor, color);
  return out;
}

export function addShade(
  doc: ResolverDoc,
  colorId: string,
  shade: string,
  color: DtcgColor,
  vendor: string,
): ResolverDoc {
  const group = child(child(foundation(doc), 'color'), colorId);
  if (!group || child(group, shade)) return doc;
  return setShade(doc, colorId, shade, color, vendor);
}

export function renameShade(
  doc: ResolverDoc,
  colorId: string,
  from: string,
  to: string,
  vendor: string,
): ResolverDoc {
  const out = clone(doc);
  const group = child(colorsOf(out), colorId);
  const token = child(group, from);
  if (!group || !token || child(group, to)) return doc;
  const wasBase = baseShadeOf(group, vendor) === from;
  const renamed = renameKey(group, from, to);
  colorsOf(out)[colorId] = wasBase ? withVendorData(renamed, vendor, { base: to }) : renamed;
  repoint(out, colorId, from, aliasOf(colorId, to));
  return out;
}

export function removeShade(doc: ResolverDoc, colorId: string, shade: string, vendor: string): ResolverDoc {
  const out = clone(doc);
  const group = child(colorsOf(out), colorId);
  const token = child(group, shade);
  if (!group || !token || baseShadeOf(group, vendor) === shade) return doc;
  repoint(out, colorId, shade, token.$value);
  colorsOf(out)[colorId] = without(group, shade);
  return out;
}

export function setBase(doc: ResolverDoc, colorId: string, shade: string, vendor: string): ResolverDoc {
  const out = clone(doc);
  const group = child(colorsOf(out), colorId);
  if (!group || !child(group, shade)) return doc;
  colorsOf(out)[colorId] = withVendorData(group, vendor, { base: shade });
  return out;
}

export function handSetShades(doc: ResolverDoc, colorId: string, vendor: string): string[] {
  const color = paletteColors(doc, vendor).find((c) => c.id === colorId);
  return color?.shades.filter((s) => s.byHand && !s.isBase).map((s) => s.name) ?? [];
}

export type GenerateMode = 'keep' | 'overwrite';

export function generateShades(
  doc: ResolverDoc,
  colorId: string,
  vendor: string,
  mode: GenerateMode,
): ResolverDoc {
  const out = clone(doc);
  const group = child(colorsOf(out), colorId);
  const base = group && baseShadeOf(group, vendor);
  const baseColor = base ? narrow(child(group, base)?.$value, isColor) : null;
  if (!group || !base || !baseColor) return doc;
  const { scale, anchor } = anchoredScale(baseColor);
  // A lone shade with no step name (like "base") becomes the step it sits at, so 50 to 950 make 11.
  if (!(base in scale) && !child(group, anchor))
    return generateShades(renameShade(doc, colorId, base, anchor, vendor), colorId, vendor, mode);
  for (const [step, color] of entriesOf(scale)) {
    if (step === base) continue;
    const token = child(group, step) ?? {};
    if (isHandSet(token, vendor) && mode === 'keep') continue;
    group[step] = generated(token, vendor, color);
  }
  return out;
}

const MONOCHROME = { black: oklch(0, 0, 0), white: oklch(1, 0, 0) };

const FILLED_ROLES = new Set(['primary', 'destructive', 'success']);

function monochromeRole(path: string, paper: string, ink: string): string {
  const [, role, name = ''] = path.split('.');
  const filled = FILLED_ROLES.has(role);
  if (name.startsWith('foreground')) return aliasOf(filled ? paper : ink, 'base');
  if (name.startsWith('background')) return aliasOf(filled ? ink : paper, 'base');
  return aliasOf(ink, 'base');
}

function keepOnlyRoles(tree: TokenNode, inputs: Record<string, string>, doc: ResolverDoc) {
  for (const key of keysOf(tree))
    if (key !== 'color' && key !== 'spacing' && !key.startsWith('$')) Reflect.deleteProperty(tree, key);
  const colors = child(tree, 'color');
  if (!colors) return;
  for (const [key] of children(colors)) if (!ROLES.includes(key)) Reflect.deleteProperty(colors, key);
  const page = narrow(resolve(doc, inputs).get('color.page.background')?.resolved, isColor);
  const darkPage = page !== null && toOklch(page)[0] < 0.5;
  const [paper, ink] = darkPage ? ['black', 'white'] : ['white', 'black'];
  walkValues(colors, 'color', (token, path) => {
    token.$value = monochromeRole(path, paper, ink);
  });
}

export function blankBrand(doc: ResolverDoc, vendor: string): ResolverDoc {
  const out = clone(doc);
  out.name = 'Untitled brand';
  delete out.description;
  for (const { sources } of valuesOf(out.sets))
    for (const tree of sources) keepOnlyRoles(tree, defaultInputs(doc), doc);
  for (const [modifier, { contexts }] of entriesOf(out.modifiers ?? {}))
    for (const [context, sources] of entriesOf(contexts))
      for (const tree of sources) keepOnlyRoles(tree, { ...defaultInputs(doc), [modifier]: context }, doc);
  let blank = out;
  for (const [id, color] of entriesOf(MONOCHROME)) blank = addColor(blank, id, color, vendor);
  return blank;
}

const chroma = (color: PaletteColor) => {
  const cs = color.shades.flatMap((s) => (s.color ? [toOklch(s.color)[1]] : []));
  return cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length : Infinity;
};

/**
 * Role parts drawn from one shade, the way a designer fills a button: the shade for background and
 * border, the next two shades for hover and active (darker on a light page, lighter on a dark one),
 * and the end of the least colorful palette color that reads best on it for text.
 */
export function roleFromShade(
  colors: PaletteColor[],
  colorId: string,
  shadeName: string,
  darkPage: boolean,
  /** Shades between background and border: 0 for buttons, more for surfaces and fields. */
  borderSteps = 0,
): Record<string, string> {
  const color = colors.find((c) => c.id === colorId);
  const i = color?.shades.findIndex((s) => s.name === shadeName) ?? -1;
  if (!color || i < 0) return {};
  const step = darkPage ? -1 : 1;
  const at = (k: number) => {
    const shade = color.shades[Math.min(Math.max(i + k * step, 0), color.shades.length - 1)];
    return `{color.${color.id}.${shade.name}}`;
  };
  const background = color.shades[i].color;
  // Prefer a full grey scale for text; lone black and white only when there is none.
  const scales = colors.filter((c) => c.shades.length > 1);
  const ink = (scales.length ? scales : colors).toSorted((a, b) => chroma(a) - chroma(b))[0];
  const ends = ink ? [ink.shades[0], ink.shades.at(-1)] : [];
  const readable = (shade: Shade | undefined) =>
    shade?.color && background ? contrastRatio(shade.color, background) : 0;
  const text = ends.toSorted((a, b) => readable(b) - readable(a))[0];
  return {
    background: at(0),
    'background-hover': at(1),
    'background-active': at(2),
    border: at(borderSteps),
    ...(text && ink ? { foreground: `{color.${ink.id}.${text.name}}` } : {}),
  };
}
