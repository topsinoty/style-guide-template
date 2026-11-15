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
  const inline = ({ $ref }: { $ref: string }) => {
    const [, kind, name] = REF.exec($ref) ?? [];
    const set = valueAt(sets, name);
    const modifier = valueAt(modifiers, name);

    if (kind === 'sets' && set) {
      return { type: 'set', name, ...set };
    }

    if (kind === 'modifiers' && modifier) {
      return { type: 'modifier', name, ...modifier };
    }

    return { $ref };
  };

  const order = resolutionOrder.map(inline);

  return { ...rest, resolutionOrder: order };
}

type InlineEntry = {
  kind: 'sets' | 'modifiers';
  name: string;
  body: TokenNode;
};

const INLINE_KINDS: Record<string, InlineEntry['kind']> = {
  set: 'sets',
  modifier: 'modifiers',
};

function inlineEntry(item: unknown): InlineEntry | null {
  if (!isNode(item) || typeof item.name !== 'string') {
    return null;
  }

  const { type, name, ...body } = item;
  const kind =
    typeof type === 'string' ? valueAt(INLINE_KINDS, type) : undefined;

  return kind ? { kind, name, body } : null;
}

export function hoistResolver(json: TokenNode): TokenNode {
  if (!Array.isArray(json.resolutionOrder)) {
    return json;
  }

  const items = json.resolutionOrder.map((item: unknown) => ({
    item,
    inline: inlineEntry(item),
  }));
  const inlined = items.flatMap(({ inline }) => (inline ? [inline] : []));

  if (inlined.length === 0) {
    return json;
  }

  const existing = (kind: InlineEntry['kind']) => {
    const group = json[kind];

    return isNode(group) ? entriesOf(group) : [];
  };

  const collect = (kind: InlineEntry['kind']) =>
    recordOf([
      ...existing(kind),
      ...inlined
        .filter((entry) => entry.kind === kind)
        .map((entry): [string, unknown] => [entry.name, entry.body]),
    ]);
  const resolutionOrder = items.map(({ item, inline }) =>
    inline ? { $ref: `#/${inline.kind}/${inline.name}` } : item,
  );
  const hoisted: TokenNode = {
    ...json,
    sets: collect('sets'),
    resolutionOrder,
  };

  if (
    isNode(json.modifiers) ||
    inlined.some((entry) => entry.kind === 'modifiers')
  ) {
    hoisted.modifiers = collect('modifiers');
  }

  return hoisted;
}

export function toResolver(
  input: TokenNode | ResolverDoc,
  name: string,
): ResolverDoc {
  const json = isNode(input) ? hoistResolver(input) : input;

  if (isResolver(json)) {
    return json;
  }

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
