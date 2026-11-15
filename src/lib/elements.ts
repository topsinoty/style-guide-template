import { uniquePath } from './path';
import { valueAt } from './records';
import { child, children, vendorData, withVendorData } from './tree';
import type { TokenNode } from './types';

export const ELEMENTS = [
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'h5', label: 'Heading 5' },
  { value: 'h6', label: 'Heading 6' },
  { value: 'p', label: 'Paragraph' },
  { value: 'small', label: 'Small print' },
  { value: 'code', label: 'Code' },
];
const KNOWN = new Set(ELEMENTS.map((e) => e.value));

const inferred = (name: string) => {
  const heading = /^h(?:eading)?-?([1-6])$/.exec(name)?.[1];
  if (heading) return `h${heading}`;
  return name === 'body' || name === 'paragraph' ? 'p' : undefined;
};

export function elementOf(
  name: string,
  token: TokenNode | undefined,
  vendor: string,
): string | undefined {
  const set = vendorData(token, vendor).element;
  if (typeof set === 'string') return KNOWN.has(set) ? set : undefined;
  return inferred(name);
}

export function elementStyles(
  tree: TokenNode | undefined,
  vendor: string,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const [name, token] of children(child(tree, 'typography'))) {
    const element = elementOf(name, token, vendor);
    if (element && !out.has(element)) out.set(element, name);
  }
  return out;
}

export function setElement(
  group: TokenNode,
  name: string,
  element: string,
  vendor: string,
): TokenNode {
  const out = structuredClone(group);
  for (const [other, token] of children(out)) {
    if (other === name) out[other] = withVendorData(token, vendor, { element });
    else if (element && elementOf(other, token, vendor) === element)
      out[other] = withVendorData(token, vendor, { element: '' });
  }
  return out;
}

const STANDARD: Record<
  string,
  {
    name: string;
    font: string;
    size: string;
    weight: number;
    lineHeight: number;
  }
> = {
  h1: {
    name: 'heading-1',
    font: 'heading',
    size: '3xl',
    weight: 700,
    lineHeight: 1.2,
  },
  h2: {
    name: 'heading-2',
    font: 'heading',
    size: '2xl',
    weight: 700,
    lineHeight: 1.25,
  },
  h3: {
    name: 'heading-3',
    font: 'heading',
    size: 'xl',
    weight: 600,
    lineHeight: 1.3,
  },
  h4: {
    name: 'heading-4',
    font: 'heading',
    size: 'lg',
    weight: 600,
    lineHeight: 1.4,
  },
  h5: {
    name: 'heading-5',
    font: 'heading',
    size: 'md',
    weight: 600,
    lineHeight: 1.5,
  },
  h6: {
    name: 'heading-6',
    font: 'heading',
    size: 'sm',
    weight: 600,
    lineHeight: 1.5,
  },
  p: { name: 'body', font: 'body', size: 'md', weight: 400, lineHeight: 1.6 },
  small: {
    name: 'small',
    font: 'body',
    size: 'sm',
    weight: 400,
    lineHeight: 1.5,
  },
  code: {
    name: 'code',
    font: 'code',
    size: 'sm',
    weight: 400,
    lineHeight: 1.5,
  },
};

const FONT_FALLBACK: Record<string, string[]> = {
  heading: ['heading', 'body'],
  body: ['body', 'heading'],
  code: ['code', 'mono', 'monospace', 'body'],
};

export function addStandardStyles(
  group: TokenNode,
  elements: string[],
  {
    fonts,
    sizes,
    vendor,
  }: { fonts: string[]; sizes: string[]; vendor: string },
): TokenNode {
  const pick = (wanted: string[], from: string[]) =>
    wanted.find((w) => from.includes(w)) ?? from[0];
  let out = structuredClone(group);
  for (const element of elements) {
    const spec = valueAt(STANDARD, element);
    if (!spec) continue;
    const font = pick(FONT_FALLBACK[spec.font], fonts);
    const size = pick([spec.size, 'md'], sizes);
    if (!font || !size) continue;
    const name = uniquePath(
      spec.name,
      new Set(children(out).map(([key]) => key)),
    );
    out[name] = {
      $type: 'typography',
      $value: {
        fontFamily: `{font.${font}}`,
        fontSize: `{font-size.${size}}`,
        fontWeight: spec.weight,
        letterSpacing: { value: 0, unit: 'px' },
        lineHeight: spec.lineHeight,
      },
    };
    out = setElement(out, name, element, vendor);
  }
  return out;
}
