import { entriesOf, recordOf, valueAt } from './records';
import { isNode } from './tree';
import type { ResolverDoc, TokenNode } from './types';

export const RESOLVER_SCHEMA =
  'https://www.designtokens.org/schemas/2025.10/resolver.json';

export const isResolver = (json: unknown): json is ResolverDoc =>
  isNode(json) && Array.isArray(json.resolutionOrder);

const REF = /^#\/(sets|modifiers)\/(.+)$/;

export function inlineResolver({
  sets,
  modifiers,
  resolutionOrder,
  ...rest
}: ResolverDoc): TokenNode {
  return {
    ...rest,
    resolutionOrder: resolutionOrder.map(({ $ref }) => {
      const [, kind, name] = REF.exec($ref) ?? [];
      const set = valueAt(sets, name);
      const modifier = valueAt(modifiers, name);
      if (kind === 'sets' && set) return { type: 'set', name, ...set };
      if (kind === 'modifiers' && modifier)
        return { type: 'modifier', name, ...modifier };
      return { $ref };
    }),
  };
}

export function hoistResolver(json: TokenNode): TokenNode {
  if (!Array.isArray(json.resolutionOrder)) return json;
  const sets: [string, unknown][] = [];
  const modifiers: [string, unknown][] = [];
  const order = json.resolutionOrder.map((item: unknown) => {
    if (!isNode(item) || typeof item.name !== 'string') return item;
    const { type, name, ...body } = item;
    if (type === 'set') sets.push([name, body]);
    else if (type === 'modifier') modifiers.push([name, body]);
    else return item;
    return { $ref: `#/${type === 'set' ? 'sets' : 'modifiers'}/${name}` };
  });
  if (!sets.length && !modifiers.length) return json;
  const own = (key: string) => (isNode(json[key]) ? entriesOf(json[key]) : []);
  return {
    ...json,
    sets: recordOf([...own('sets'), ...sets]),
    ...(modifiers.length || isNode(json.modifiers)
      ? { modifiers: recordOf([...own('modifiers'), ...modifiers]) }
      : {}),
    resolutionOrder: order,
  };
}

export function toResolver(
  input: TokenNode | ResolverDoc,
  name: string,
): ResolverDoc {
  const json = isNode(input) ? hoistResolver(input) : input;
  if (isResolver(json)) return json;
  return {
    $schema: RESOLVER_SCHEMA,
    version: '2025.10',
    name,
    sets: { foundation: { sources: [json] } },
    modifiers: {
      theme: { contexts: { light: [], dark: [] }, default: 'light' },
    },
    resolutionOrder: [
      { $ref: '#/sets/foundation' },
      { $ref: '#/modifiers/theme' },
    ],
  };
}
