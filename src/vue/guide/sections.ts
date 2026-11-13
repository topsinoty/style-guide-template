import { colorKind } from './color-path.js';
import type { BrandMeta, Tokens } from '../../lib/types.js';

const builtIn = new Set(['logos', 'favicons', 'icons']);
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
}

export function sectionsOf(meta: BrandMeta, tokens: Tokens): Section[] {
  const groups = meta.assetGroups
    .filter((g) => !builtIn.has(g.id))
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
