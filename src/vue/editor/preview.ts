import type { CSSProperties } from 'vue';
import { cssName, elementStyles } from '~/lib';
import type { TokenNode } from '~/lib';

const SIZES: Record<string, string> = {
  h1: 'var(--ed-fs-xl)',
  h2: 'var(--ed-fs-lg)',
};

export function elementPreview(
  tree: TokenNode,
  vendor: string,
  element: string,
): CSSProperties | undefined {
  const style = elementStyles(tree, vendor).get(element);
  if (!style) return undefined;
  const base = cssName(`typography.${style}`);
  const v = (prop: string) => `var(${base}-${prop})`;
  return {
    fontFamily: v('font-family'),
    fontWeight: v('font-weight'),
    fontSize: SIZES[element],
  };
}
