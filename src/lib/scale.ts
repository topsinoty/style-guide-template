import { child, isHandSet, isNode, vendorData, withVendorData } from './tree.js';
import { narrow } from './values.js';
import { entriesOf, mapValues, valuesOf, without } from './records.js';
import type { Dimension, TokenNode } from './types.js';

export interface ScaleSpec {
  base: Dimension;
  steps: Record<string, number>;
  ratio?: number;
}

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function isScaleSpec(value: unknown): value is ScaleSpec {
  if (!isNode(value) || !isNode(value.base) || !isNode(value.steps)) return false;
  const { base, steps, ratio } = value;
  return (
    isNumber(base.value) &&
    typeof base.unit === 'string' &&
    valuesOf(steps).every(isNumber) &&
    (ratio === undefined || isNumber(ratio))
  );
}

export const scaleOf = (group: TokenNode | undefined, vendor: string): ScaleSpec | null =>
  narrow(vendorData(group, vendor).scale, isScaleSpec);

const round = (n: number) => Math.round(n * 1e4) / 1e4;

export function generateScale({ base, steps, ratio }: ScaleSpec): Record<string, Dimension> {
  return mapValues(steps, (step) => ({
    value: round(ratio ? base.value * ratio ** step : base.value * step),
    unit: base.unit,
  }));
}

export function applyScale(group: TokenNode, vendor: string): TokenNode {
  const out = structuredClone(group);
  const scale = scaleOf(out, vendor);
  if (!scale) return out;
  for (const [name, value] of entriesOf(generateScale(scale))) {
    const token = child(out, name);
    if (isHandSet(token, vendor)) continue;
    out[name] = { ...token, $value: value };
  }
  return out;
}

export function setStep(group: TokenNode, step: string, dimension: Dimension, vendor: string): TokenNode {
  const out = structuredClone(group);
  const token = child(out, step);
  out[step] = withVendorData({ ...token, $value: dimension }, vendor, { overridden: true });
  return out;
}

export function addScaleStep(group: TokenNode, step: string, multiplier: number, vendor: string): TokenNode {
  const scale = scaleOf(group, vendor);
  if (!scale || !Number.isFinite(multiplier) || step in scale.steps || child(group, step)) return group;
  const next = withVendorData(group, vendor, {
    scale: { ...scale, steps: { ...scale.steps, [step]: multiplier } },
  });
  return applyScale(next, vendor);
}

export function removeStep(group: TokenNode, step: string, vendor: string): TokenNode {
  const out = structuredClone(group);
  Reflect.deleteProperty(out, step);
  const scale = scaleOf(out, vendor);
  if (!scale || !(step in scale.steps)) return out;
  return withVendorData(out, vendor, { scale: { ...scale, steps: without(scale.steps, step) } });
}

const convert = ({ value, unit }: Dimension, to: string, rem: number): Dimension =>
  unit === to ? { value, unit } : { value: round(to === 'rem' ? value / rem : value * rem), unit: to };

export function setScaleUnit(group: TokenNode, unit: 'px' | 'rem', vendor: string, rem = 16): TokenNode {
  const out = structuredClone(group);
  for (const [name, token] of entriesOf(out)) {
    if (name.startsWith('$') || !isNode(token)) continue;
    const length = token.$value;
    if (isNode(length) && isNumber(length.value) && (length.unit === 'px' || length.unit === 'rem'))
      out[name] = { ...token, $value: convert({ value: length.value, unit: length.unit }, unit, rem) };
  }
  const scale = scaleOf(out, vendor);
  return scale
    ? applyScale(
        withVendorData(out, vendor, { scale: { ...scale, base: convert(scale.base, unit, rem) } }),
        vendor,
      )
    : out;
}
