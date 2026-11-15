import {
  cssName,
  isNode,
  isShadow,
  isShadowLayer,
  isSize,
  narrow,
} from '~/lib';

export function dim(value: unknown): string {
  if (
    isNode(value) &&
    typeof value.value === 'number' &&
    typeof value.unit === 'string'
  ) {
    return `${value.value}${value.unit}`;
  }

  return typeof value === 'number' || typeof value === 'string'
    ? String(value)
    : '';
}

const images = new Set([
  'svg',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'ico',
]);

export const isImage = (ext: string) => images.has(ext);

const KB = 1024;
const MB = 1024 * KB;

export function formatSize(bytes: number) {
  if (bytes < KB) {
    return `${bytes} B`;
  }

  if (bytes < MB) {
    return `${(bytes / KB).toFixed(1)} KB`;
  }

  return `${(bytes / MB).toFixed(1)} MB`;
}

export const cap = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export function cssBackground(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const ref = /^\{(.+)\}$/.exec(value);

  return ref ? `var(${cssName(ref[1])})` : value;
}

export function shadowText(value: unknown): string {
  const shadow = narrow(value, isShadow);
  const layers = Array.isArray(shadow) ? shadow : [shadow];
  const [first] = layers;

  if (!isShadowLayer(first)) {
    return '';
  }

  const text = [first.offsetX, first.offsetY, first.blur].map(dim).join(' ');

  return layers.length > 1 ? `${text} +${String(layers.length - 1)}` : text;
}

export function radiusText(value: unknown): string {
  const radius = narrow(value, isSize);

  if (!radius) {
    return dim(value);
  }

  const px = radius.unit === 'rem' ? radius.value * 16 : radius.value;

  return px >= 9999 ? 'full' : dim(radius);
}
