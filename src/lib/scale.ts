import { child, isHandSet, isNode, vendorData, withVendorData } from './tree.js';
import { narrow } from './values.js';
import { entriesOf, mapValues, valuesOf } from './records.js';
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
