import { parseCssColor } from '../../lib/color.js';

export const UNITS: Record<string, string[]> = { duration: ['ms', 's'], dimension: ['px', 'rem'] };

export const NEW_TOKEN_TYPES = [
  { value: 'duration', label: 'Duration (ms or s)' },
  { value: 'dimension', label: 'Dimension (px or rem)' },
  { value: 'number', label: 'Number' },
  { value: 'color', label: 'Color' },
];

export function tokenValue(type: string, text: string): unknown {
  const entered = text.trim();
  if (type === 'color') return parseCssColor(entered);
  if (type === 'number') return entered && Number.isFinite(Number(entered)) ? Number(entered) : null;
  const unit = UNITS[type]?.find((candidate) => entered.endsWith(candidate));
  const amount = unit ? entered.slice(0, -unit.length).trim() : '';
  return amount && Number.isFinite(Number(amount)) ? { value: Number(amount), unit } : null;
}

export const valueExample = (type: string) =>
  ({ duration: '200ms', dimension: '12px', number: '0.8', color: '#2e59aa' })[type] ?? '';
