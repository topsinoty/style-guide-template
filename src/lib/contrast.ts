import { resolve, contexts, defaultInputs } from './resolver.js';
import { contrastRatio } from './color.js';
import type { ContrastPair, ContrastResult, ResolverDoc, Tokens } from './types.js';
import { narrow, isColor } from './values.js';

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
export const pairLabel = ({ fg, bg }: Pick<ContrastPair, 'fg' | 'bg'>) => `${short(fg)} on ${short(bg)}`;

export function requiredPairs(tokens: Tokens, declared: ContrastPair[] = []) {
  const pairs: Array<{ fg: string; bg: string; min: number; label: string }> = [];
  for (const role of ROLES) {
    const fg = `color.${role}.foreground`;
    const bg = `color.${role}.background`;
    if (tokens.has(fg) && tokens.has(bg)) pairs.push({ fg, bg, min: 4.5, label: `${role} text` });
  }
  for (const role of ['input', 'focus']) {
    const fg = `color.${role}.border`;
    if (tokens.has(fg) && tokens.has('color.page.background')) {
      pairs.push({ fg, bg: 'color.page.background', min: 3, label: `${role} border on page` });
    }
  }
  for (const pair of declared)
    if (tokens.has(pair.fg) && tokens.has(pair.bg)) pairs.push({ ...pair, label: pairLabel(pair) });
  return pairs;
}

export function checkContrast(doc: ResolverDoc, declared: ContrastPair[] = []): ContrastResult[] {
  const inputs = defaultInputs(doc);
  const themes = contexts(doc).filter((c) => c.modifier === 'theme');
  return (themes.length ? themes : [{ context: 'default' }]).flatMap(({ context }): ContrastResult[] => {
    const tokens = resolve(doc, themes.length ? { ...inputs, theme: context } : inputs);
    return requiredPairs(tokens, declared).flatMap((p) => {
      const fg = narrow(tokens.get(p.fg)?.resolved, isColor);
      const bg = narrow(tokens.get(p.bg)?.resolved, isColor);
      if (!fg || !bg) return [];
      const raw = contrastRatio(fg, bg);
      return [{ context, ...p, ratio: Math.round(raw * 100) / 100, pass: raw >= p.min }];
    });
  });
}
