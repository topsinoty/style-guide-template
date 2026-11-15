import { BUILT_IN_GROUPS } from '../../lib/assets.js';
import { colorKind } from './color-path.js';
import { move } from '../../lib/edit.js';
import { slug } from '../../lib/io.js';
import { uniquePath } from '../../lib/path.js';
import type { BrandMeta, TextSection, Tokens } from '../../lib/types.js';

const OWN_SECTIONS: [prefix: string, editor: string][] = [
  ['color.', 'Palette'],
  ['spacing.', 'Scales'],
  ['radius.', 'Scales'],
  ['font-size.', 'Scales'],
  ['shadow.', 'Shadow'],
  ['typography.', 'Fonts and type'],
  ['font.', 'Fonts and type'],
];

export const ownEditor = (path: string) => OWN_SECTIONS.find(([prefix]) => path.startsWith(prefix))?.[1];

export const isOtherToken = (path: string) => ownEditor(path) === undefined;

export const isOtherColor = (path: string, type: string) =>
  type === 'color' && path.startsWith('color.') && colorKind(path) === 'other';

export interface Section {
  id: string;
  title: string;
  cls?: string;
  group?: string;
  body?: string;
  text?: boolean;
}

export const TEXT_PREFIX = 'text-';

function builtInSections(meta: BrandMeta, tokens: Tokens): Section[] {
  const groups = meta.assetGroups
    .filter((g) => !BUILT_IN_GROUPS.has(g.id))
    .map((g) => ({ id: `group-${g.id}`, title: g.label ?? g.id, cls: 'cd-group', group: g.id }));
  const other = [...tokens.keys()].some(isOtherToken);
  return [
    { id: 'branding', title: 'Branding', cls: 'cd-branding' },
    { id: 'colors', title: 'Colors', cls: 'cd-colors' },
    { id: 'typography', title: 'Typography', cls: 'cd-typography' },
    { id: 'icons', title: 'Icons', cls: 'cd-icons' },
    ...groups,
    { id: 'spacing', title: 'Spacing', cls: 'cd-spacing' },
    { id: 'radius', title: 'Radius', cls: 'cd-radius' },
    { id: 'shadow', title: 'Shadow', cls: 'cd-shadow' },
    ...(other ? [{ id: 'other-tokens', title: 'Other tokens' }] : []),
    { id: 'css-variables', title: 'Code', cls: 'cd-css-variables' },
  ];
}

export function sectionsOf(meta: BrandMeta, tokens: Tokens): Section[] {
  const defaults = builtInSections(meta, tokens);
  const own = meta.sections ?? [];
  const placed = own.flatMap((entry): Section[] => {
    const base = defaults.find((s) => s.id === entry.id);
    if (base) return [{ ...base, title: (!base.group && entry.title) || base.title, body: entry.body }];
    if (!entry.id.startsWith(TEXT_PREFIX)) return [];
    return [{ id: entry.id, title: entry.title || 'Untitled', body: entry.body, cls: 'cd-text', text: true }];
  });
  // A section the brand does not place yet goes right after the one it follows by default.
  defaults.forEach((section, i) => {
    if (placed.some((s) => s.id === section.id)) return;
    const before = defaults.slice(0, i).findLast((d) => placed.some((s) => s.id === d.id));
    placed.splice(before ? placed.findIndex((s) => s.id === before.id) + 1 : 0, 0, section);
  });
  return placed;
}

const clean = ({ id, title, body }: TextSection): TextSection => ({
  id,
  ...(title ? { title } : {}),
  ...(body ? { body } : {}),
});

// Every edit writes the whole current order, so placing one section never moves another.
function rewrite(meta: BrandMeta, tokens: Tokens, fn: (list: TextSection[]) => TextSection[]): BrandMeta {
  const own = new Map((meta.sections ?? []).map((s) => [s.id, s]));
  const list = sectionsOf(meta, tokens).map((s) => own.get(s.id) ?? { id: s.id });
  return { ...meta, sections: fn(list).map(clean) };
}

export const editSection = (meta: BrandMeta, tokens: Tokens, id: string, patch: Partial<TextSection>) =>
  rewrite(meta, tokens, (list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));

export const moveSection = (meta: BrandMeta, tokens: Tokens, id: string, dir: number) =>
  rewrite(meta, tokens, (list) =>
    move(
      list,
      list.findIndex((s) => s.id === id),
      dir,
    ),
  );

export const removeSection = (meta: BrandMeta, tokens: Tokens, id: string) =>
  rewrite(meta, tokens, (list) => list.filter((s) => s.id !== id || !id.startsWith(TEXT_PREFIX)));

export function addSection(meta: BrandMeta, tokens: Tokens, title: string): BrandMeta {
  const taken = new Set(sectionsOf(meta, tokens).map((s) => s.id));
  const id = uniquePath(`${TEXT_PREFIX}${slug(title)}`, taken);
  // New text goes before Code, which stays the technical appendix at the end.
  return rewrite(meta, tokens, (list) => {
    const code = list.findIndex((s) => s.id === 'css-variables');
    return code === -1 ? [...list, { id, title }] : list.toSpliced(code, 0, { id, title });
  });
}
