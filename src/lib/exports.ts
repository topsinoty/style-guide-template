import { block, generateCss, cssName } from './css';
import { resolve, contexts, defaultInputs } from './resolver';
import { toOklchString } from './color';
import type { ExportFormat } from '~/ports';
import { narrow, isColor, isSize } from './values';
import type { FontFile, ResolverDoc, Tokens } from './types';

const tailwindName = (path: string) =>
  path.startsWith('font-size.')
    ? `--text-${path.slice('font-size.'.length).replaceAll('.', '-')}`
    : cssName(path);

export function tailwindCss(
  doc: ResolverDoc,
  { fontSrc, vendor }: { fontSrc: (f: FontFile) => string; vendor?: string },
): string {
  const css = generateCss(doc, {
    fontSrc,
    vendor,
    name: tailwindName,
    rootSelector: '@theme',
  });
  const variants = contexts(doc)
    .filter(
      (c) =>
        c.modifier === 'theme' &&
        !c.isDefault &&
        /^[a-z0-9-]+$/i.test(c.context),
    )
    .map(
      ({ context }) =>
        `@custom-variant ${context} (&:where([data-theme="${context}"], [data-theme="${context}"] *));`,
    );

  return ['@import "tailwindcss";', '', ...variants, '', css].join('\n');
}

const SHADCN: [name: string, paths: string[]][] = [
  ['background', ['color.page.background']],
  ['foreground', ['color.page.foreground']],
  ['card', ['color.card.background']],
  ['card-foreground', ['color.card.foreground']],
  ['popover', ['color.card.background']],
  ['popover-foreground', ['color.card.foreground']],
  ['primary', ['color.primary.background']],
  ['primary-foreground', ['color.primary.foreground']],
  ['secondary', ['color.secondary.background']],
  ['secondary-foreground', ['color.secondary.foreground']],
  ['muted', ['color.muted.background']],
  ['muted-foreground', ['color.muted.foreground']],
  ['accent', ['color.secondary.background-hover', 'color.info.background']],
  [
    'accent-foreground',
    ['color.secondary.foreground', 'color.info.foreground'],
  ],
  ['destructive', ['color.destructive.background']],
  ['destructive-foreground', ['color.destructive.foreground']],
  ['border', ['color.card.border', 'color.page.border']],
  ['input', ['color.input.border']],
  ['ring', ['color.focus.border']],
];
const RADIUS = ['radius.md', 'radius.lg', 'radius.sm'];

function shadcnVars(tokens: Tokens, withRadius: boolean) {
  const lines: string[] = [];

  if (withRadius) {
    const radius = RADIUS.map((p) =>
      narrow(tokens.get(p)?.resolved, isSize),
    ).find(Boolean);

    if (radius) {
      lines.push(`--radius: ${radius.value}${radius.unit};`);
    }
  }

  for (const [name, paths] of SHADCN) {
    const color = paths
      .map((x) => narrow(tokens.get(x)?.resolved, isColor))
      .find(Boolean);

    if (color) {
      lines.push(`--${name}: ${toOklchString(color)};`);
    }
  }

  return lines;
}

export function shadcnCss(doc: ResolverDoc): string {
  const inputs = defaultInputs(doc);
  const light = shadcnVars(resolve(doc, inputs), true);
  const hasDark = contexts(doc).some(
    (c) => c.modifier === 'theme' && c.context === 'dark',
  );
  const names = light.map((l) => l.split(':')[0].slice(2));
  const themeVar = (name: string) =>
    name === 'radius'
      ? '--radius-lg: var(--radius);'
      : `--color-${name}: var(--${name});`;
  let dark = '';

  if (hasDark) {
    const darkTokens = resolve(doc, { ...inputs, theme: 'dark' });

    dark = block('.dark', shadcnVars(darkTokens, false));
  }

  const blocks = [
    block(':root', light),
    dark,
    block('@theme inline', names.map(themeVar)),
  ];

  return blocks.join('\n');
}

const relativeFontSrc = (file: FontFile) => `../${file.src}`;

export const exportFormats: ExportFormat[] = [
  {
    key: 'css',
    label: 'CSS variables',
    render: (doc, vendor) =>
      generateCss(doc, { vendor, fontSrc: relativeFontSrc }),
  },
  {
    key: 'tailwind',
    label: 'Tailwind v4',
    render: (doc, vendor) =>
      tailwindCss(doc, { vendor, fontSrc: relativeFontSrc }),
  },
  { key: 'shadcn', label: 'shadcn/ui', render: (doc) => shadcnCss(doc) },
];
