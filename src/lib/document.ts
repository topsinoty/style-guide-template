import { isNode } from './tree.js';
import type { ResolverDoc, TokenNode } from './types.js';

export const RESOLVER_SCHEMA = 'https://www.designtokens.org/schemas/2025.10/resolver.json';

export const isResolver = (json: unknown): json is ResolverDoc =>
  isNode(json) && Array.isArray(json.resolutionOrder);

export function toResolver(json: TokenNode | ResolverDoc, name: string): ResolverDoc {
  if (isResolver(json)) return json;
  return {
    $schema: RESOLVER_SCHEMA,
    version: '2025.10',
    name,
    sets: { foundation: { sources: [json] } },
    modifiers: { theme: { contexts: { light: [], dark: [] }, default: 'light' } },
    resolutionOrder: [{ $ref: '#/sets/foundation' }, { $ref: '#/modifiers/theme' }],
  };
}
