import * as z from 'zod/mini';
import type { Parsed, Validator } from '../ports.js';
import type {
  AssetGroup,
  AssetItem,
  BrandMeta,
  DtcgColor,
  FontFile,
  FontStyle,
  Manifest,
  Problem,
  ResolverDoc,
  TokenNode,
} from '../lib/types.js';
import { entriesOf, keysOf, valuesOf } from '../lib/records.js';
import { isSafeSrc } from '../lib/path.js';
import { child, deepMerge, isNode } from '../lib/tree.js';
import { COLOR_SPACES, FONT_STYLES, STROKE_STYLES, WEIGHT_KEYWORDS, isAlias } from '../lib/values.js';

const TOKEN_KEYS = new Set(['$type', '$value', '$description', '$extensions', '$deprecated']);
const GROUP_KEYS = new Set(['$type', '$description', '$extensions', '$deprecated', '$extends', '$root']);

const join = (path: string, key: string | number) => (path ? `${path}.${key}` : String(key));

export const problems = (error: z.core.$ZodError, base = ''): Problem[] =>
  error.issues.map((i) => ({
    path: i.path.reduce<string>((p, k) => join(p, String(k)), base),
    message: i.message,
  }));

const alias = z.custom<string>(isAlias, 'must be an alias');
const orAlias = <T extends z.core.SomeType>(schema: T) => z.union([alias, schema]);
const dimension = (units: readonly [string, ...string[]]) =>
  z.object({
    value: z.number({ error: 'must be { value: number, unit }' }),
    unit: z.enum(units, { error: `unit must be ${units.join('|')}` }),
  });
const size = dimension(['px', 'rem']);
const duration = dimension(['ms', 's']);
const component = z.union([z.number(), z.literal('none')]);
export const color: z.ZodMiniType<DtcgColor> = z.object({
  colorSpace: z.enum(COLOR_SPACES, {
    error: (iss) => `colorSpace "${String(iss.input)}" is not a DTCG color space`,
  }),
  components: z.tuple([component, component, component], {
    error: 'components must be an array of 3 numbers or "none"',
  }),
  alpha: z.optional(z.number().check(z.gte(0), z.lte(1))),
  hex: z.optional(z.string().check(z.regex(/^#[0-9a-fA-F]{6}$/, 'hex must be 6-digit #rrggbb'))),
});
const cubicBezier = z.tuple([z.number(), z.number(), z.number(), z.number()], {
  error: 'must be [x1, y1, x2, y2]',
});
const fontFamily = z.union([z.string(), z.array(z.string()).check(z.minLength(1))], {
  error: 'must be a string or an array of strings',
});
const fontWeight = z.union([z.number().check(z.gte(1), z.lte(1000)), z.enum(WEIGHT_KEYWORDS)], {
  error: 'must be 1..1000 or a weight keyword',
});
const strokeStyle = z.union([z.enum(STROKE_STYLES), z.looseObject({})], {
  error: `stroke style must be one of ${STROKE_STYLES.join(', ')}`,
});
const shadowLayer = z.object({
  color: orAlias(color),
  offsetX: orAlias(size),
  offsetY: orAlias(size),
  blur: orAlias(size),
  spread: orAlias(size),
  inset: z.optional(z.boolean()),
});

export const VALUES = {
  color,
  dimension: size,
  duration,
  number: z.number({ error: 'must be a number' }),
  fontFamily,
  fontWeight,
  cubicBezier,
  strokeStyle,
  shadow: z.union([shadowLayer, z.array(orAlias(shadowLayer))]),
  border: z.object({ color: orAlias(color), width: orAlias(size), style: orAlias(strokeStyle) }),
  transition: z.object({
    duration: orAlias(duration),
    delay: orAlias(duration),
    timingFunction: orAlias(cubicBezier),
  }),
  typography: z.object({
    fontFamily: orAlias(fontFamily),
    fontSize: orAlias(size),
    fontWeight: orAlias(fontWeight),
    letterSpacing: orAlias(size),
    lineHeight: orAlias(z.number()),
  }),
  gradient: z.array(z.looseObject({})),
} satisfies Record<string, z.core.$ZodType>;

const valueTypes = new Set(keysOf(VALUES));

const isValueType = (type: string): type is keyof typeof VALUES => valueTypes.has(type);

function checkValue(type: keyof typeof VALUES, value: unknown, path: string): Problem[] {
  if (isAlias(value)) return [];
  const result = z.safeParse(VALUES[type], value);
  if (result.success) return [];
  return result.error.issues.map((i) => ({
    path,
    message: i.path.length ? `${i.path.join(' ')}: ${i.message}` : i.message,
  }));
}

function validateToken(token: TokenNode, path: string, groupType?: string): Problem[] {
  const errors: Problem[] = keysOf(token)
    .filter((key) => key.startsWith('$') && !TOKEN_KEYS.has(key))
    .map((key) => ({ path, message: `unknown reserved key ${key}` }));
  const type = token.$type ?? groupType;
  if (!type) errors.push({ path, message: 'token has no $type (own or inherited from a group)' });
  else if (!isValueType(type)) errors.push({ path, message: `unknown $type "${type}"` });
  else errors.push(...checkValue(type, token.$value, path));
  return errors;
}

function validateEntry(
  key: string,
  node: unknown,
  path: string,
  groupType?: string,
  only?: TokenNode,
): Problem[] {
  if (key.startsWith('$') && key !== '$root')
    return GROUP_KEYS.has(key) ? [] : [{ path, message: `unknown reserved key ${key}` }];
  if (/[{}.]/.test(key)) return [{ path, message: `name "${key}" must not contain {, } or .` }];
  if (!isNode(node)) return [{ path, message: 'must be a token or a group' }];
  if (only && only[key] === undefined) return [];
  if (!('$value' in node)) return validateTokens(node, path, groupType, child(only, key));
  return validateToken(node, path, groupType);
}

export function validateTokens(tree: TokenNode, path = '', inherited?: string, only?: TokenNode): Problem[] {
  const groupType = tree.$type ?? inherited;
  const errors: Problem[] = [];
  if (tree.$type !== undefined && !isValueType(tree.$type))
    errors.push({ path, message: `unknown $type "${tree.$type}"` });
  for (const [key, node] of entriesOf(tree))
    errors.push(...validateEntry(key, node, join(path, key), groupType, only));
  return errors;
}

const tokenTree = z
  .record(z.string(), z.custom<unknown>())
  .check(
    z.refine((s) => typeof s.$ref !== 'string', 'file references are not supported here; inline the tokens'),
  );
const sources = z.array(tokenTree, { error: 'must be an array of token objects' });

export const resolverDoc: z.ZodMiniType<ResolverDoc> = z.object({
  $schema: z.optional(z.string()),
  version: z.literal('2025.10', { error: 'version must be "2025.10"' }),
  name: z.optional(z.string()),
  description: z.optional(z.string()),
  sets: z.record(
    z.string(),
    z.looseObject({ sources, $extensions: z.optional(z.record(z.string(), z.custom<unknown>())) }),
  ),
  modifiers: z.optional(
    z.record(
      z.string(),
      z.object({ contexts: z.record(z.string(), sources), default: z.optional(z.string()) }),
    ),
  ),
  resolutionOrder: z.array(z.object({ $ref: z.string() }), { error: 'resolutionOrder must be an array' }),
});

const mergeSources = (list: TokenNode[]) => list.reduce((acc, s) => deepMerge(acc, s), {});

function parseBrand(input: unknown): Parsed<ResolverDoc> {
  const parsed = z.safeParse(resolverDoc, input);
  if (!parsed.success) return { ok: false, problems: problems(parsed.error) };
  const doc = parsed.data;
  const modifiers = doc.modifiers ?? {};
  const errors: Problem[] = [];
  doc.resolutionOrder.forEach(({ $ref }, i) => {
    const [, kind, name] = /^#\/(sets|modifiers)\/(.+)$/.exec($ref) ?? [];
    if (!(kind === 'sets' ? name in doc.sets : kind === 'modifiers' && name in modifiers)) {
      errors.push({ path: `resolutionOrder.${i}`, message: `${$ref} does not point to a set or modifier` });
    }
  });
  const base = mergeSources(valuesOf(doc.sets).flatMap((s) => s.sources));
  errors.push(...validateTokens(base));
  for (const [name, mod] of entriesOf(modifiers)) {
    if (mod.default !== undefined && !(mod.default in mod.contexts)) {
      errors.push({
        path: `modifiers.${name}.default`,
        message: `default "${mod.default}" is not a context`,
      });
    }
    for (const [context, list] of entriesOf(mod.contexts)) {
      const own = mergeSources(list);
      errors.push(
        ...validateTokens(deepMerge(base, own), `modifiers.${name}.contexts.${context}`, undefined, own),
      );
    }
  }
  return errors.length ? { ok: false, problems: errors } : { ok: true, value: doc };
}

export function validateResolver(input: unknown): { ok: boolean; errors: Problem[] } {
  const checked = parseBrand(input);
  return checked.ok ? { ok: true, errors: [] } : { ok: false, errors: checked.problems };
}

export const fontStyle: z.ZodMiniType<FontStyle> = z.enum(FONT_STYLES, {
  error: 'style must be normal, italic or oblique',
});

const src = z.custom<string>(isSafeSrc, {
  error: (iss) => `src "${String(iss.input)}" must be a relative path`,
});
const assetItemShape = {
  src,
  label: z.optional(z.string()),
  description: z.optional(z.string()),
  provider: z.optional(z.string()),
};
const assetItem: z.ZodMiniType<AssetItem> = z.looseObject(assetItemShape);
const assetGroup: z.ZodMiniType<AssetGroup> = z.looseObject({
  id: z.string().check(
    z.regex(/^[a-z0-9][a-z0-9-]*$/, {
      error: (iss) => `group id "${String(iss.input)}" must use a-z, 0-9 and -`,
    }),
  ),
  label: z.optional(z.string()),
  items: z.array(assetItem, { error: 'group needs an items array' }),
});
const fontFile: z.ZodMiniType<FontFile> = z
  .looseObject({
    ...assetItemShape,
    family: z.string({ error: 'font file needs a family' }).check(z.minLength(1, 'font file needs a family')),
    weight: z._default(
      z.number().check(z.gte(1, 'weight must be 1..1000'), z.lte(1000, 'weight must be 1..1000')),
      400,
    ),
    style: z._default(fontStyle, 'normal'),
    subset: z.optional(z.string()),
    unicodeRange: z.optional(z.string()),
    fontsourceId: z.optional(
      z.string().check(z.regex(/^[a-z0-9-]+$/, 'fontsourceId must use a-z, 0-9 and -')),
    ),
    version: z.optional(z.string().check(z.regex(/^\d[\da-z.-]*$/, 'version must look like 5.3.0'))),
  })
  .check(
    z.refine(
      (f) => f.provider !== 'fontsource' || (f.fontsourceId !== undefined && f.version !== undefined),
      'a Fontsource font needs fontsourceId and version',
    ),
  );

export const brandMeta: z.ZodMiniType<BrandMeta> = z.looseObject({
  assetGroups: z._default(z.array(assetGroup), []),
  fontFiles: z._default(z.array(fontFile), []),
});

export function validateBrandMeta(meta: unknown, path = 'brand'): Problem[] {
  const result = z.safeParse(brandMeta, meta);
  return result.success ? [] : problems(result.error, path);
}

export const manifest: z.ZodMiniType<Manifest> = z.object({
  files: z.array(z.string()),
  brands: z
    .array(z.object({ name: z.string(), path: z.string() }))
    .check(z.minLength(1, 'the manifest lists no brands')),
});

function parseManifest(input: unknown): Parsed<Manifest> {
  const parsed = z.safeParse(manifest, input);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, problems: problems(parsed.error) };
}

export const zodValidator: Validator = {
  parseBrand,
  parseManifest,
  checkBrandMeta: validateBrandMeta,
};
