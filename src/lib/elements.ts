import { child, children, vendorData, withVendorData } from './tree.js';
import type { TokenNode } from './types.js';

// HTML elements a text style can be applied to, as Word applies Heading 1 to a paragraph.
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

// A style named heading-2 or body needs no setting; an explicit one, even "none" (''), wins.
const inferred = (name: string) => {
  const heading = /^h(?:eading)?-?([1-6])$/.exec(name)?.[1];
  if (heading) return `h${heading}`;
  return name === 'body' || name === 'paragraph' ? 'p' : undefined;
};

export function elementOf(name: string, token: TokenNode | undefined, vendor: string): string | undefined {
  const set = vendorData(token, vendor).element;
  if (typeof set === 'string') return KNOWN.has(set) ? set : undefined;
  return inferred(name);
}

/** Element → text style name; the first style claiming an element keeps it. */
export function elementStyles(tree: TokenNode | undefined, vendor: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [name, token] of children(child(tree, 'typography'))) {
    const element = elementOf(name, token, vendor);
    if (element && !out.has(element)) out.set(element, name);
  }
  return out;
}

/** Applies a style to an element, taking the element away from any other style. */
export function setElement(group: TokenNode, name: string, element: string, vendor: string): TokenNode {
  const out = structuredClone(group);
  for (const [other, token] of children(out)) {
    if (other === name) out[other] = withVendorData(token, vendor, { element });
    else if (element && elementOf(other, token, vendor) === element)
      out[other] = withVendorData(token, vendor, { element: '' });
  }
  return out;
}
