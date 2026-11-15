import { narrow, isTypography, sortFontFiles } from '~/lib';
import type { BrandMeta, FontFile, Tokens } from '~/lib';
import { dim } from './parts';

export const fontSizes = (tokens: Tokens) =>
  [...tokens].filter(
    ([p, t]) => p.startsWith('font-size.') && t.type === 'dimension',
  );

export const textStyles = (tokens: Tokens) =>
  [...tokens].flatMap(([path, token]) => {
    const style =
      token.type === 'typography' ? narrow(token.resolved, isTypography) : null;

    if (!style) {
      return [];
    }

    const family = [style.fontFamily].flat()[0];
    const summary = `${dim(family)} ${dim(style.fontWeight)} ${dim(style.fontSize)} / ${dim(style.lineHeight)}`;

    return [
      {
        path,
        name: path.slice('typography.'.length),
        style,
        summary,
        description: token.description,
      },
    ];
  });

export const fontFamilies = (meta: BrandMeta) => [
  ...Map.groupBy(sortFontFiles(meta.fontFiles), (f: FontFile) => f.family),
];
