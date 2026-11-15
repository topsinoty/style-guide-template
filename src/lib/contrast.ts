import { resolve, contexts, defaultInputs } from './resolver';
import { contrastRatio } from './color';
import type {
  ContrastPair,
  ContrastResult,
  ResolverDoc,
  Tokens,
} from './types';
import { narrow, isColor } from './values';

export const ROLES = [
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'page',
  'card',
  'muted',
  'input',
  'focus',
];

const short = (path: string) => path.replace(/^color\./, '');

export const pairLabel = ({ fg, bg }: Pick<ContrastPair, 'fg' | 'bg'>) =>
  `${short(fg)} on ${short(bg)}`;

export function requiredPairs(tokens: Tokens, declared: ContrastPair[] = []) {
  const pairs: { fg: string; bg: string; min: number; label: string }[] = [];

  for (const role of ROLES) {
    const fg = `color.${role}.foreground`;
    const bg = `color.${role}.background`;

    if (tokens.has(fg) && tokens.has(bg)) {
      pairs.push({ fg, bg, min: 4.5, label: `${role} text` });
    }
  }

  for (const role of ['input', 'focus']) {
    const fg = `color.${role}.border`;

    if (tokens.has(fg) && tokens.has('color.page.background')) {
      pairs.push({
        fg,
        bg: 'color.page.background',
        min: 3,
        label: `${role} border on page`,
      });
    }
  }

  for (const pair of declared) {
    if (tokens.has(pair.fg) && tokens.has(pair.bg)) {
      pairs.push({ ...pair, label: pairLabel(pair) });
    }
  }

  return pairs;
}

export function checkContrast(
  doc: ResolverDoc,
  declared: ContrastPair[] = [],
): ContrastResult[] {
  const inputs = defaultInputs(doc);
  const themes = contexts(doc).filter((c) => c.modifier === 'theme');
  const names = themes.length ? themes.map((t) => t.context) : ['default'];

  const resultsFor = (context: string): ContrastResult[] => {
    const choice = themes.length ? { ...inputs, theme: context } : inputs;
    const tokens = resolve(doc, choice);
    const results: ContrastResult[] = [];

    for (const pair of requiredPairs(tokens, declared)) {
      const fg = narrow(tokens.get(pair.fg)?.resolved, isColor);
      const bg = narrow(tokens.get(pair.bg)?.resolved, isColor);

      if (!fg || !bg) {
        continue;
      }

      const ratio = contrastRatio(fg, bg);

      results.push({
        context,
        ...pair,
        ratio: Math.round(ratio * 100) / 100,
        pass: ratio >= pair.min,
      });
    }

    return results;
  };

  return names.flatMap(resultsFor);
}
