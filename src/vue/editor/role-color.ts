import { parseCssColor, toHex, cssName, narrow, isColor } from '~/lib';
import type { PaletteColor, DtcgColor } from '~/lib';

export type ColorOption = {
  value: string;
  label: string;
  swatch: string;
};

export function colorOptions(colors: PaletteColor[]): ColorOption[] {
  const options: ColorOption[] = [];

  for (const color of colors) {
    for (const shade of color.shades) {
      const path = `color.${color.id}.${shade.name}`;
      const label = shade.isBase ? color.id : `${color.id} · ${shade.name}`;

      options.push({
        value: `{${path}}`,
        label,
        swatch: `var(${cssName(path)})`,
      });
    }
  }

  return options;
}

export const optionFor = (text: string, options: ColorOption[]) =>
  options.find(
    (option) =>
      option.value === text ||
      option.label.toLowerCase() === text.toLowerCase(),
  );

export function roleText(value: unknown, options: ColorOption[]): string {
  if (typeof value === 'string') {
    return optionFor(value, options)?.label ?? value;
  }

  const color = narrow(value, isColor);

  return color ? toHex(color) : '';
}

export function roleEntry(
  text: string,
  options: ColorOption[],
): string | DtcgColor | null {
  const entered = text.trim();

  if (!entered) {
    return null;
  }

  return optionFor(entered, options)?.value ?? parseCssColor(entered);
}
