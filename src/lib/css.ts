import {
  flatten,
  contexts,
  defaultInputs,
  mergedTree,
  aliasTarget,
} from './resolver';
import { cssColor } from './color';
import { fontFaceRules, cssString } from './fonts';
import { DEFAULT_ROOT_SIZE, readBrandMeta } from './assets';
import { elementStyles } from './elements';
import { isNode } from './tree';
import { valueAt } from './records';
import type { FlatToken, FontFile, ResolverDoc, Dimension } from './types';
import {
  narrow,
  isBorder,
  isColor,
  isCubicBezier,
  isDuration,
  isFontFamily,
  isFontWeight,
  isShadow,
  isSize,
  isTransition,
} from './values';

type Namer = (path: string) => string;

const GENERIC = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
]);
const WEIGHTS: Record<string, number> = {
  thin: 100,
  hairline: 100,
  'extra-light': 200,
  'ultra-light': 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  'semi-bold': 600,
  'demi-bold': 600,
  bold: 700,
  'extra-bold': 800,
  'ultra-bold': 800,
  black: 900,
  heavy: 900,
  'extra-black': 950,
  'ultra-black': 950,
};
const TYPO_FIELDS: [field: string, prop: string, type: string][] = [
  ['fontFamily', 'font-family', 'fontFamily'],
  ['fontSize', 'font-size', 'dimension'],
  ['fontWeight', 'font-weight', 'fontWeight'],
  ['letterSpacing', 'letter-spacing', 'dimension'],
  ['lineHeight', 'line-height', 'number'],
];

const ident = (s: string) =>
  s.replace(
    /[^A-Za-z0-9_-]/g,
    (c) => `\\${(c.codePointAt(0) ?? 0).toString(16)} `,
  );
export const cssName = (path: string) =>
  `--${ident(
    path
      .split('.')
      .filter((s) => s !== '$root')
      .join('-'),
  )}`;

const pointerPath = (ref: string) =>
  ref
    .replace(/^#\//, '')
    .split('/')
    .filter((s) => s !== '$value')
    .join('.');

function shadowCss(
  value: unknown,
  part: (type: string, value: unknown) => string | null,
): string | null {
  const shadow = narrow(value, isShadow);
  if (!shadow) return null;
  return [shadow]
    .flat()
    .map((layer) => {
      if (aliasTarget(layer) || !isNode(layer)) return part('shadow', layer);
      const lengths = (['offsetX', 'offsetY', 'blur', 'spread'] as const).map(
        (key) => part('dimension', layer[key]),
      );
      return [
        ...(layer.inset ? ['inset'] : []),
        ...lengths,
        part('color', layer.color),
      ].join(' ');
    })
    .join(', ');
}

function weightCss(value: unknown): string | null {
  const weight = narrow(value, isFontWeight);
  if (weight === null) return null;
  return String(typeof weight === 'string' ? WEIGHTS[weight] : weight);
}

function familyCss(value: unknown): string | null {
  const family = narrow(value, isFontFamily);
  if (family === null) return null;
  return [family]
    .flat()
    .map((f) => (GENERIC.has(f) ? f : cssString(f)))
    .join(', ');
}

const lengthCss = (length: Dimension | null) =>
  length && `${length.value}${length.unit}`;

type Part = (type: string, value: unknown) => string | null;

const LEAF: Record<string, (value: unknown) => string | null> = {
  color: (value) => {
    const color = narrow(value, isColor);
    return color && cssColor(color);
  },
  dimension: (value) => lengthCss(narrow(value, isSize)),
  duration: (value) => lengthCss(narrow(value, isDuration)),
  fontFamily: familyCss,
  fontWeight: weightCss,
  cubicBezier: (value) => {
    const curve = narrow(value, isCubicBezier);
    return curve && `cubic-bezier(${curve.join(', ')})`;
  },
  number: (value) =>
    typeof value === 'number' && Number.isFinite(value) ? String(value) : null,
  strokeStyle: (value) =>
    typeof value === 'string' && /^[a-z-]+$/.test(value) ? value : null,
};

const COMPOSITE: Record<string, (value: unknown, part: Part) => string | null> =
  {
    shadow: shadowCss,
    border: (value, part) => {
      const border = narrow(value, isBorder);
      return (
        border &&
        `${part('dimension', border.width)} ${part('strokeStyle', border.style)} ${part('color', border.color)}`
      );
    },
    transition: (value, part) => {
      const t = narrow(value, isTransition);
      return (
        t &&
        `${part('duration', t.duration)} ${part('cubicBezier', t.timingFunction)} ${part('duration', t.delay)}`
      );
    },
  };

export function cssValue(
  type: string | undefined,
  value: unknown,
  name: Namer = cssName,
): string | null {
  const target = aliasTarget(value);
  if (target) return `var(${name(target)})`;
  if (isNode(value) && typeof value.$ref === 'string')
    return `var(${name(pointerPath(value.$ref))})`;
  if (type === undefined) return null;
  const leaf = valueAt(LEAF, type);
  if (leaf) return leaf(value);
  const composite = valueAt(COMPOSITE, type);
  return composite ? composite(value, (t, x) => cssValue(t, x, name)) : null;
}

function typographyDeclarations(
  path: string,
  value: unknown,
  name: Namer,
): string[] {
  const whole = aliasTarget(value);
  const fields = isNode(value) ? value : {};
  return TYPO_FIELDS.map(([field, prop, type]) => {
    const css = whole
      ? `var(${name(whole)}-${prop})`
      : cssValue(type, fields[field], name);
    return `${name(path)}-${prop}: ${css};`;
  });
}

export function cssDeclarations(
  tokens: Map<string, FlatToken>,
  name: Namer = cssName,
): string[] {
  return [...tokens].flatMap(([path, { type, value }]) => {
    if (type === 'typography') return typographyDeclarations(path, value, name);
    const css = cssValue(type, value, name);
    return css === null ? [] : [`${name(path)}: ${css};`];
  });
}

export function block(selector: string, lines: string[]) {
  const body = lines.map((line) => `  ${line}`).join('\n');
  return `${selector} {\n${body}\n}\n`;
}

const metaOf = (doc: ResolverDoc, vendor?: string) =>
  readBrandMeta(
    vendor ? valueAt(doc.sets, 'foundation')?.$extensions?.[vendor] : undefined,
  );

function rootRule(size = DEFAULT_ROOT_SIZE): string {
  if (size === DEFAULT_ROOT_SIZE) return '';
  return block('html', [
    `font-size: ${Math.round((size / DEFAULT_ROOT_SIZE) * 1e6) / 1e4}%;`,
  ]);
}

function elementRules(
  doc: ResolverDoc,
  vendor: string,
  name: Namer,
  scope: string,
): string {
  const styles = elementStyles(
    valueAt(doc.sets, 'foundation')?.sources.at(0),
    vendor,
  );
  return [...styles]
    .map(([element, style]) =>
      block(
        scope ? `${scope} ${element}` : element,
        TYPO_FIELDS.map(([, prop]) => {
          const base = name(`typography.${style}`);
          return `${prop}: var(${base}-${prop});`;
        }),
      ),
    )
    .join('');
}

export function generateCss(
  doc: ResolverDoc,
  {
    fontSrc,
    vendor,
    name = cssName,
    rootSelector = ':root',
    elementScope = '',
  }: {
    fontSrc: (f: FontFile) => string;
    vendor?: string;
    name?: Namer;
    rootSelector?: string;
    elementScope?: string;
  },
): string {
  const inputs = defaultInputs(doc);
  const base = cssDeclarations(flatten(mergedTree(doc, inputs)), name);
  const meta = metaOf(doc, vendor);
  let css =
    (rootSelector === ':root' ? rootRule(meta.rootSize) : '') +
    block(rootSelector, base);
  const known = new Set(base);
  for (const { modifier, context, isDefault } of contexts(doc)) {
    if (isDefault) continue;
    const lines = cssDeclarations(
      flatten(mergedTree(doc, { ...inputs, [modifier]: context })),
      name,
    ).filter((l) => !known.has(l));
    if (lines.length)
      css += block(`:root[data-${ident(modifier)}="${ident(context)}"]`, lines);
  }
  if (rootSelector === ':root' && vendor)
    css += elementRules(doc, vendor, name, elementScope);
  const faces = fontFaceRules(meta.fontFiles, fontSrc);
  return faces ? `${css}${faces}\n` : css;
}
