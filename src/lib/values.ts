import { isNode } from './tree.js';
import type {
  Alias,
  Border,
  CubicBezier,
  Dimension,
  DtcgColor,
  FontFamily,
  FontStyle,
  FontWeight,
  OrAlias,
  Shadow,
  ShadowLayer,
  StrokeStyle,
  Transition,
  Typography,
} from './types.js';

type Guard<T> = (value: unknown) => value is T;

export const COLOR_SPACES = [
  'srgb',
  'srgb-linear',
  'hsl',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'display-p3',
  'a98-rgb',
  'prophoto-rgb',
  'rec2020',
  'xyz-d65',
  'xyz-d50',
] as const;

export const WEIGHT_KEYWORDS = [
  'thin',
  'hairline',
  'extra-light',
  'ultra-light',
  'light',
  'normal',
  'regular',
  'book',
  'medium',
  'semi-bold',
  'demi-bold',
  'bold',
  'extra-bold',
  'ultra-bold',
  'black',
  'heavy',
  'extra-black',
  'ultra-black',
] as const;

export const FONT_STYLES = ['normal', 'italic', 'oblique'] as const;

export const STROKE_STYLES = [
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'outset',
  'inset',
] as const;

const colorSpaces = new Set<string>(COLOR_SPACES);
const weightKeywords = new Set<string>(WEIGHT_KEYWORDS);
const strokeStyles = new Set<string>(STROKE_STYLES);
const fontStyles = new Set<string>(FONT_STYLES);

export const narrow = <T>(value: unknown, guard: Guard<T>): T | null => (guard(value) ? value : null);

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isComponent = (value: unknown) => value === 'none' || isNumber(value);

export const isAlias = (value: unknown): value is Alias =>
  (typeof value === 'string' && /^\{[^{}]+\}$/.test(value)) ||
  (isNode(value) && typeof value.$ref === 'string');

const orAlias =
  <T>(guard: Guard<T>): Guard<OrAlias<T>> =>
  (value): value is OrAlias<T> =>
    isAlias(value) || guard(value);

export function isColor(value: unknown): value is DtcgColor {
  if (!isNode(value)) return false;
  const { colorSpace, components, alpha, hex } = value;
  return (
    typeof colorSpace === 'string' &&
    colorSpaces.has(colorSpace) &&
    Array.isArray(components) &&
    components.length === 3 &&
    components.every(isComponent) &&
    (alpha === undefined || (isNumber(alpha) && alpha >= 0 && alpha <= 1)) &&
    (hex === undefined || (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)))
  );
}

const lengthIn =
  (units: readonly string[]): Guard<Dimension> =>
  (value): value is Dimension =>
    isNode(value) && isNumber(value.value) && typeof value.unit === 'string' && units.includes(value.unit);

export const isSize = lengthIn(['px', 'rem']);
export const isDuration = lengthIn(['ms', 's']);

export const isCubicBezier = (value: unknown): value is CubicBezier =>
  Array.isArray(value) && value.length === 4 && value.every(isNumber);

export const isFontFamily = (value: unknown): value is FontFamily =>
  typeof value === 'string' ||
  (Array.isArray(value) && value.length > 0 && value.every((family) => typeof family === 'string'));

export const isFontWeight = (value: unknown): value is FontWeight =>
  (isNumber(value) && value >= 1 && value <= 1000) ||
  (typeof value === 'string' && weightKeywords.has(value));

export const isFontStyle = (value: unknown): value is FontStyle =>
  typeof value === 'string' && fontStyles.has(value);

export const isStrokeStyle = (value: unknown): value is StrokeStyle =>
  (typeof value === 'string' && strokeStyles.has(value)) || isNode(value);

export function isShadowLayer(value: unknown): value is ShadowLayer {
  if (!isNode(value)) return false;
  const size = orAlias(isSize);
  return (
    orAlias(isColor)(value.color) &&
    size(value.offsetX) &&
    size(value.offsetY) &&
    size(value.blur) &&
    size(value.spread) &&
    (value.inset === undefined || typeof value.inset === 'boolean')
  );
}

export const isShadow = (value: unknown): value is Shadow =>
  isShadowLayer(value) || (Array.isArray(value) && value.every(orAlias(isShadowLayer)));

export const isBorder = (value: unknown): value is Border =>
  isNode(value) &&
  orAlias(isColor)(value.color) &&
  orAlias(isSize)(value.width) &&
  orAlias(isStrokeStyle)(value.style);

export const isTransition = (value: unknown): value is Transition =>
  isNode(value) &&
  orAlias(isDuration)(value.duration) &&
  orAlias(isDuration)(value.delay) &&
  orAlias(isCubicBezier)(value.timingFunction);

export const isTypography = (value: unknown): value is Typography =>
  isNode(value) &&
  orAlias(isFontFamily)(value.fontFamily) &&
  orAlias(isSize)(value.fontSize) &&
  orAlias(isFontWeight)(value.fontWeight) &&
  orAlias(isSize)(value.letterSpacing) &&
  orAlias(isNumber)(value.lineHeight);
