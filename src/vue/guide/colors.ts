import {
  cmyk,
  toHex,
  toOklchString,
  toRgbaString,
  byShadeOrder,
  isNode,
  narrow,
  isColor,
} from '~/lib';
import type { DtcgColor, ResolvedToken, Tokens } from '~/lib';
import { colorKind, palettePath } from './color-path';

export type Shade = {
  path: string;
  group: string;
  step: string;
  name: string;
  hex: string;
  description?: string;
  copies: { text: string; shown: string }[];
};
export type Row = {
  path: string;
  source: string;
  hex: string;
  description?: string;
};

function shade(
  path: string,
  token: ResolvedToken,
  vendor: string,
): Shade | null {
  const palette = palettePath(path);
  const color = narrow(token.resolved, isColor);

  if (!palette || !color) {
    return null;
  }

  const extension = token.extensions?.[vendor];
  const own = isNode(extension) ? extension : {};
  const printedCmyk = Array.isArray(own.cmyk) ? own.cmyk : null;
  const cmykText = `CMYK ${(printedCmyk ?? cmyk(color)).join(' ')}`;
  const copies = [toHex(color), toRgbaString(color), toOklchString(color)].map(
    (text) => ({
      text,
      shown: text,
    }),
  );

  copies.push({
    text: cmykText,
    shown: printedCmyk ? cmykText : `${cmykText} (approx.)`,
  });
  if (typeof own.pantone === 'string') {
    copies.push({ text: own.pantone, shown: own.pantone });
  }

  const name = palette.step
    ? `${palette.group}-${palette.step}`
    : palette.group;

  return {
    path,
    ...palette,
    name,
    hex: toHex(color),
    description: token.description,
    copies,
  };
}

function sourceOf(value: unknown, color: DtcgColor): string {
  if (typeof value === 'string') {
    return value;
  }

  if (isNode(value) && typeof value.$ref === 'string') {
    return value.$ref;
  }

  return toOklchString(color);
}

function row(path: string, token: ResolvedToken): Row | null {
  const color = narrow(token.resolved, isColor);

  return (
    color && {
      path,
      source: sourceOf(token.value, color),
      hex: toHex(color),
      description: token.description,
    }
  );
}

export function colorData(tokens: Tokens, vendor: string) {
  const palette = new Map<string, Shade[]>();
  const rows: Record<'role' | 'other', Row[]> = { role: [], other: [] };

  for (const [path, token] of tokens) {
    if (token.type !== 'color' || !path.startsWith('color.')) {
      continue;
    }

    const kind = colorKind(path);
    const swatch = kind === 'palette' ? shade(path, token, vendor) : null;
    const line = swatch ? null : row(path, token);

    if (swatch) {
      palette.set(swatch.group, [...(palette.get(swatch.group) ?? []), swatch]);
    } else if (line) {
      rows[kind === 'role' ? 'role' : 'other'].push(line);
    }
  }

  const hues = [...palette].map(
    ([id, shades]) =>
      [id, shades.toSorted((a, b) => byShadeOrder(a.step, b.step))] as const,
  );
  const tables = [{ title: 'Roles', rows: rows.role }];

  if (rows.other.length) {
    tables.push({ title: 'Other tokens', rows: rows.other });
  }

  return { hues, tables };
}
