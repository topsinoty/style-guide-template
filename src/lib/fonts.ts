import { extension } from './path';
import type { FontFile } from './types';

const FORMATS: Record<string, string> = {
  woff2: 'woff2',
  woff: 'woff',
  ttf: 'truetype',
  otf: 'opentype',
};
const format = (src: string) => FORMATS[extension(src)] ?? 'woff2';

export const cssString = (s: unknown) =>
  `"${String(s)
    .replaceAll(/[\\"]/g, String.raw`\$&`)
    .replaceAll(/[\n\r]/g, ' ')}"`;
const STYLES = new Set(['normal', 'italic', 'oblique']);

export const sortFontFiles = (files: FontFile[]) =>
  files.toSorted(
    (a, b) =>
      a.family.localeCompare(b.family) ||
      a.weight - b.weight ||
      a.style.localeCompare(b.style),
  );

export function fontFaceRules(
  fontFiles: FontFile[] | undefined,
  fontSrc: (f: FontFile) => string,
): string {
  return (fontFiles ?? [])
    .map((f) =>
      [
        '@font-face {',
        `  font-family: ${cssString(f.family)};`,
        `  font-weight: ${f.weight};`,
        `  font-style: ${STYLES.has(f.style) ? f.style : 'normal'};`,
        `  src: url(${cssString(fontSrc(f))}) format("${format(f.src)}");`,
        ...(/^[U+0-9A-Fa-f?, -]+$/.test(f.unicodeRange ?? '')
          ? [`  unicode-range: ${f.unicodeRange};`]
          : []),
        '  font-display: swap;',
        '}',
      ].join('\n'),
    )
    .join('\n');
}
