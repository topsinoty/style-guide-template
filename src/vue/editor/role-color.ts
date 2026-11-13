import { parseCssColor, toHex } from '../../lib/color.js';
import { cssName } from '../../lib/css.js';
import type { PaletteColor } from '../../lib/palette.js';
import { VALUES } from '../../lib/schema.js';
import type { DtcgColor } from '../../lib/types.js';
import { valueAs } from '../../lib/values.js';

export interface ColorOption {
  value: string;
  label: string;
  swatch: string;
}

export function colorOptions(colors: PaletteColor[]): ColorOption[] {
  return colors.flatMap((color) =>
    color.shades.map((shade) => {
      const path = `color.${color.id}.${shade.name}`;
      return {
        value: `{${path}}`,
        label: shade.isBase ? color.id : `${color.id} · ${shade.name}`,
        swatch: `var(${cssName(path)})`,
      };
    }),
  );
}

export const optionFor = (text: string, options: ColorOption[]) =>
  options.find((option) => option.value === text || option.label.toLowerCase() === text.toLowerCase());

export function roleText(value: unknown, options: ColorOption[]): string {
  if (typeof value === 'string') return optionFor(value, options)?.label ?? value;
  const color = valueAs(VALUES.color, value);
  return color ? toHex(color) : '';
}

export function roleEntry(text: string, options: ColorOption[]): string | DtcgColor | null {
  const entered = text.trim();
  if (!entered) return null;
  return optionFor(entered, options)?.value ?? parseCssColor(entered);
}
