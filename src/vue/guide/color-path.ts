import { ROLES } from '../../lib/contrast.js';

export type ColorKind = 'palette' | 'role' | 'other';

export function colorKind(path: string): ColorKind {
  const group = path.split('.')[1];
  if (ROLES.includes(group)) return 'role';
  return palettePath(path) ? 'palette' : 'other';
}

export function palettePath(path: string): { group: string; step: string } | null {
  const parts = path.split('.');
  if (parts[0] !== 'color' || parts.length < 2 || parts.length > 3 || ROLES.includes(parts[1])) return null;
  return { group: parts[1], step: parts[2] ?? '' };
}
