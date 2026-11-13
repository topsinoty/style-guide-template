import { ROLES } from '../../lib/contrast.js';

export function palettePath(path: string): { group: string; step: string } | null {
  const parts = path.split('.');
  if (parts[0] !== 'color' || parts.length < 2 || parts.length > 3 || ROLES.includes(parts[1])) return null;
  return { group: parts[1], step: parts[2] ?? '' };
}
