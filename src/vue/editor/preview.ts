import type { CSSProperties } from 'vue';
import { cssName } from '../../lib/css.js';
import { elementStyles } from '../../lib/elements.js';
import type { TokenNode } from '../../lib/types.js';

const SIZES: Record<string, string> = { h1: 'var(--ed-fs-xl)', h2: 'var(--ed-fs-lg)' };

/** The brand's look for an element, at the editor's own size, to preview text as it is typed. */
export function elementPreview(tree: TokenNode, vendor: string, element: string): CSSProperties | undefined {
  const style = elementStyles(tree, vendor).get(element);
  if (!style) return undefined;
  const v = (prop: string) => `var(${cssName('typography.' + style)}-${prop})`;
  return { fontFamily: v('font-family'), fontWeight: v('font-weight'), fontSize: SIZES[element] };
}
